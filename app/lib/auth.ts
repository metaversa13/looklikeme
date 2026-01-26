import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import YandexProvider from "next-auth/providers/yandex";
import VkProvider from "next-auth/providers/vk";
import { prisma } from "@/lib/db/prisma";

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
  callbacks: {
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
          },
        });

        if (dbUser) {
          session.user.subscriptionType = dbUser.subscriptionType;
          session.user.lifetimeAccess = dbUser.lifetimeAccess;
          session.user.subscriptionEndDate = dbUser.subscriptionEndDate;
          session.user.totalGenerations = dbUser.totalGenerations;
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
