import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import YandexProvider from "next-auth/providers/yandex";
import VkProvider from "next-auth/providers/vk";
import { prisma } from "@/lib/db/prisma";

// Функция для автоматического определения пола по имени
function guessGenderFromName(name: string | null): "MALE" | "FEMALE" | "NOT_SPECIFIED" {
  if (!name) return "NOT_SPECIFIED";

  const lowerName = name.toLowerCase().trim();
  const firstName = lowerName.split(" ")[0];

  // Русские женские имена обычно заканчиваются на -а, -я, -ия
  if (firstName.endsWith("а") || firstName.endsWith("я") || firstName.endsWith("ия")) {
    return "FEMALE";
  }

  // Некоторые исключения для мужских имен, которые заканчиваются на -а/-я
  const maleExceptions = ["илья", "никита", "савва", "фома", "кузьма", "лёва", "лева"];
  if (maleExceptions.includes(firstName)) {
    return "MALE";
  }

  // Если имя не заканчивается на -а/-я, скорее всего мужское (для русских имен)
  // Для английских/других имен оставляем NOT_SPECIFIED
  const russianConsonants = ["б", "в", "г", "д", "ж", "з", "к", "л", "м", "н", "п", "р", "с", "т", "ф", "х", "ц", "ч", "ш", "щ", "й"];
  const lastChar = firstName.charAt(firstName.length - 1);

  if (russianConsonants.includes(lastChar) || firstName.endsWith("ий") || firstName.endsWith("ей")) {
    return "MALE";
  }

  return "NOT_SPECIFIED";
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    YandexProvider({
      clientId: process.env.YANDEX_CLIENT_ID!,
      clientSecret: process.env.YANDEX_CLIENT_SECRET!,
    }),
    VkProvider({
      clientId: process.env.VK_CLIENT_ID!,
      clientSecret: process.env.VK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  events: {
    async createUser({ user }) {
      // Автоматически определяем пол при создании пользователя
      if (user.name) {
        const guessedGender = guessGenderFromName(user.name);
        if (guessedGender !== "NOT_SPECIFIED") {
          await prisma.user.update({
            where: { id: user.id },
            data: { gender: guessedGender },
          }).catch(err => console.error("Error setting gender on user creation:", err));
        }
      }
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;

        // Получаем данные пользователя из БД
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            subscriptionType: true,
            lifetimeAccess: true,
            subscriptionEndDate: true,
            totalGenerations: true,
            bonusGenerations: true,
            referralCode: true,
          },
        });

        if (dbUser) {
          // Проверяем истечение подписки и даунгрейдим до FREE
          const isExpired =
            dbUser.subscriptionEndDate &&
            !dbUser.lifetimeAccess &&
            new Date(dbUser.subscriptionEndDate) < new Date();

          if (isExpired) {
            await prisma.user.update({
              where: { id: token.sub },
              data: {
                subscriptionType: "FREE",
                subscriptionEndDate: null,
              },
            });
            dbUser.subscriptionType = "FREE";
            dbUser.subscriptionEndDate = null;
          }

          session.user.subscriptionType = dbUser.subscriptionType;
          session.user.lifetimeAccess = dbUser.lifetimeAccess;
          session.user.subscriptionEndDate = dbUser.subscriptionEndDate;
          session.user.totalGenerations = dbUser.totalGenerations;
          session.user.bonusGenerations = dbUser.bonusGenerations;
          session.user.referralCode = dbUser.referralCode;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
