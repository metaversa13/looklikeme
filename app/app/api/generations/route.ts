import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// GET - получить все генерации пользователя
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const generations = await prisma.generation.findMany({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        favorite: true,
      },
    });

    return NextResponse.json({ generations });
  } catch (error) {
    console.error("Error fetching generations:", error);
    return NextResponse.json(
      { error: "Failed to fetch generations" },
      { status: 500 }
    );
  }
}

// POST - сохранить новую генерацию
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { resultImageUrl, prompt, styleSlug, locationSlug, generationTime } = body;

    if (!resultImageUrl) {
      return NextResponse.json(
        { error: "Result image URL is required" },
        { status: 400 }
      );
    }

    // Создаём запись генерации
    const generation = await prisma.generation.create({
      data: {
        userId: session.user.id,
        resultImageUrl,
        prompt: prompt || "",
        styleSlug,
        locationSlug,
        generationTime,
        status: "COMPLETED",
        // Для FREE пользователей - истекает через 30 дней
        expiresAt: session.user.subscriptionType === "FREE"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    // Обновляем счётчик генераций пользователя
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        totalGenerations: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      generation,
    });
  } catch (error) {
    console.error("Error saving generation:", error);
    return NextResponse.json(
      { error: "Failed to save generation" },
      { status: 500 }
    );
  }
}

// DELETE - удалить генерацию
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const generationId = searchParams.get("id");

    if (!generationId) {
      return NextResponse.json(
        { error: "Generation ID is required" },
        { status: 400 }
      );
    }

    // Проверяем, что генерация принадлежит пользователю
    const generation = await prisma.generation.findFirst({
      where: {
        id: generationId,
        userId: session.user.id,
      },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Удаляем генерацию (каскадно удалит и favorite)
    await prisma.generation.delete({
      where: { id: generationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting generation:", error);
    return NextResponse.json(
      { error: "Failed to delete generation" },
      { status: 500 }
    );
  }
}
