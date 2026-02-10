import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// Лимиты для разных типов подписок
const LIMITS: Record<string, number> = {
  FREE: 5, // 5 генераций в день
  BASE: 25, // 25 генераций в день
  PREMIUM: -1, // безлимит
  LIFETIME: -1, // безлимит
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionType: true },
    });

    const subscriptionType = user?.subscriptionType || "FREE";
    const dailyLimit = LIMITS[subscriptionType];

    // Premium и Lifetime имеют безлимит
    if (dailyLimit === -1) {
      return NextResponse.json({
        canGenerate: true,
        remaining: -1,
        limit: -1,
        subscriptionType,
      });
    }

    // Проверяем использование за сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyUsage = await prisma.dailyLimit.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today,
        },
      },
    });

    const used = dailyUsage?.generationsCount || 0;
    const remaining = Math.max(0, dailyLimit - used);

    // Время сброса лимита (завтра в 00:00)
    const resetAt = new Date(today);
    resetAt.setDate(resetAt.getDate() + 1);

    return NextResponse.json({
      canGenerate: remaining > 0,
      remaining,
      limit: dailyLimit,
      used,
      resetAt: resetAt.toISOString(),
      subscriptionType,
    });
  } catch (error) {
    console.error("Limits check error:", error);
    return NextResponse.json(
      { error: "Failed to check limits" },
      { status: 500 }
    );
  }
}
