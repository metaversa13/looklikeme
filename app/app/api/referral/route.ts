import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const BONUS_PER_REFERRAL = 5;
const MAX_BONUS = 100;

// GET — получить свой реферальный код и статистику
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        referralCode: true,
        bonusGenerations: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Считаем сколько друзей пригласил
    const referralCount = await prisma.referral.count({
      where: { referrerId: session.user.id },
    });

    return NextResponse.json({
      referralCode: user.referralCode,
      bonusGenerations: user.bonusGenerations,
      maxBonus: MAX_BONUS,
      referralCount,
      bonusPerReferral: BONUS_PER_REFERRAL,
    });
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — применить реферальный код
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 });
    }

    // Проверяем: не использовал ли уже реферальный код
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { referredBy: true, referralCode: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (currentUser.referredBy) {
      return NextResponse.json({ error: "Вы уже использовали реферальный код" }, { status: 400 });
    }

    // Нельзя использовать свой код
    if (currentUser.referralCode === code) {
      return NextResponse.json({ error: "Нельзя использовать свой собственный код" }, { status: 400 });
    }

    // Находим пригласившего по коду
    const referrer = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true, bonusGenerations: true },
    });

    if (!referrer) {
      return NextResponse.json({ error: "Реферальный код не найден" }, { status: 404 });
    }

    // Считаем новый бонус (не больше MAX_BONUS)
    const newBonus = Math.min(referrer.bonusGenerations + BONUS_PER_REFERRAL, MAX_BONUS);

    // Транзакция: обновляем обоих пользователей + создаём запись
    await prisma.$transaction([
      // Записываем кто пригласил
      prisma.user.update({
        where: { id: session.user.id },
        data: { referredBy: referrer.id },
      }),
      // Добавляем бонус пригласившему
      prisma.user.update({
        where: { id: referrer.id },
        data: { bonusGenerations: newBonus },
      }),
      // Создаём запись о реферале
      prisma.referral.create({
        data: {
          referrerId: referrer.id,
          referredUserId: session.user.id,
          bonusGranted: true,
          activatedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Реферальный код применён!",
    });
  } catch (error) {
    console.error("Referral POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
