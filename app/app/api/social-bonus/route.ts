import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const SOCIAL_SHARE_BONUS = 1; // +1 генерация за публикацию

// POST — начислить бонус за публикацию в соцсетях (только один раз)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Проверяем, не получал ли уже бонус
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        socialShareBonusGranted: true,
        bonusGenerations: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.socialShareBonusGranted) {
      return NextResponse.json(
        { error: "Вы уже получили бонус за публикацию", alreadyGranted: true },
        { status: 400 }
      );
    }

    // Начисляем бонус
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        bonusGenerations: user.bonusGenerations + SOCIAL_SHARE_BONUS,
        socialShareBonusGranted: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Вы получили +${SOCIAL_SHARE_BONUS} генерацию за публикацию!`,
      bonus: SOCIAL_SHARE_BONUS,
    });
  } catch (error) {
    console.error("Social bonus error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
