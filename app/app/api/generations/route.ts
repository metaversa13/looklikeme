import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// Отключаем кеширование — данные всегда должны быть актуальными
export const dynamic = "force-dynamic";

// GET - получить все генерации пользователя
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("[generations GET] no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[generations GET] userId:", session.user.id);

    const allGenerations = await prisma.generation.findMany({
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
      select: {
        id: true,
        resultImageUrl: true,
        styleSlug: true,
        locationSlug: true,
        paletteSlug: true,
        createdAt: true,
        expiresAt: true,
        status: true,
        generationTime: true,
        favorite: {
          select: { id: true },
        },
      },
    });

    // Фильтруем base64 записи — они слишком большие для ответа
    const generations = allGenerations.filter(
      (g) => !g.resultImageUrl.startsWith("data:")
    );

    console.log("[generations GET] found:", allGenerations.length, "filtered:", generations.length);

    return NextResponse.json({ generations }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[generations GET] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch generations", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST - сохранить новую генерацию и добавить в избранное
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

    // Отклоняем base64 — слишком большой для хранения
    if (resultImageUrl.startsWith("data:")) {
      return NextResponse.json(
        { error: "Cannot save: image upload to storage failed. Please try generating again." },
        { status: 400 }
      );
    }

    // Проверяем, не сохранено ли уже это изображение
    const existing = await prisma.generation.findFirst({
      where: {
        userId: session.user.id,
        resultImageUrl,
      },
      include: { favorite: true },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        generation: existing,
        alreadySaved: true,
      });
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
        // Для FREE пользователей - истекает через 14 дней
        expiresAt: session.user.subscriptionType === "FREE"
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    // Добавляем в избранное (не блокируем сохранение если не получилось)
    try {
      await prisma.favorite.create({
        data: { userId: session.user.id, generationId: generation.id },
      });
    } catch (favErr) {
      console.error("Could not create favorite (generation saved ok):", favErr);
    }

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
      { error: "Failed to save generation", details: error instanceof Error ? error.message : String(error) },
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
