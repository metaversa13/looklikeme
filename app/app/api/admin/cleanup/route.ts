import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

export async function POST(request: NextRequest) {
  try {
    // Авторизация: админ или CRON_SECRET
    const cronSecret = request.headers.get("authorization")?.replace("Bearer ", "");
    const isCron = cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

    if (!isCron) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Удаляем просроченные генерации
    const deleted = await prisma.generation.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleted.count,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Internal server error", details: msg }, { status: 500 });
  }
}
