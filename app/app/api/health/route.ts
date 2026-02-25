import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    // Test database connection
    const userCount = await prisma.user.count();
    return NextResponse.json({
      status: "ok",
      database: "connected",
      users: userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Health check DB error:", error);
    return NextResponse.json({
      status: "error",
      database: "failed",
      error: message,
      stack: stack?.substring(0, 500),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
