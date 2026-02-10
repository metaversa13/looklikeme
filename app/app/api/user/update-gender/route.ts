import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gender } = await request.json();

    // Валидация
    if (!gender || !["MALE", "FEMALE", "NOT_SPECIFIED"].includes(gender)) {
      return NextResponse.json(
        { error: "Invalid gender value" },
        { status: 400 }
      );
    }

    // Обновляем пол пользователя
    await prisma.user.update({
      where: { id: session.user.id },
      data: { gender },
    });

    return NextResponse.json({ success: true, gender });
  } catch (error) {
    console.error("Error updating gender:", error);
    return NextResponse.json(
      { error: "Failed to update gender" },
      { status: 500 }
    );
  }
}
