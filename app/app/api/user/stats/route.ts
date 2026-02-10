import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем данные пользователя с totalGenerations и gender
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { totalGenerations: true, gender: true },
    });

    // Считаем сохранённые образы
    const savedImages = await prisma.generation.count({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
      },
    });

    // Считаем избранное
    const favorites = await prisma.favorite.count({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      stats: {
        totalGenerations: user?.totalGenerations || 0,
        savedImages,
        favorites,
      },
      gender: user?.gender || "NOT_SPECIFIED",
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
