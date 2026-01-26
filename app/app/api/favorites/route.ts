import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// POST - добавить/удалить из избранного (toggle)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { generationId } = body;

    if (!generationId) {
      return NextResponse.json(
        { error: "Generation ID is required" },
        { status: 400 }
      );
    }

    // Проверяем, есть ли уже в избранном
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_generationId: {
          userId: session.user.id,
          generationId,
        },
      },
    });

    if (existing) {
      // Удаляем из избранного
      await prisma.favorite.delete({
        where: { id: existing.id },
      });

      return NextResponse.json({
        success: true,
        action: "removed",
      });
    } else {
      // Добавляем в избранное
      await prisma.favorite.create({
        data: {
          userId: session.user.id,
          generationId,
        },
      });

      return NextResponse.json({
        success: true,
        action: "added",
      });
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return NextResponse.json(
      { error: "Failed to toggle favorite" },
      { status: 500 }
    );
  }
}

// GET - получить все избранные
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await prisma.favorite.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        generation: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      favorites: favorites.map((f) => f.generation),
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}
