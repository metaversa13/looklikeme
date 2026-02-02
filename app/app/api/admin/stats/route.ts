import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Параллельные запросы к БД
    const [
      totalUsers,
      usersToday,
      usersWeek,
      usersMonth,
      subGroupsRaw,
      _subPlaceholder1,
      _subPlaceholder2,
      _subPlaceholder3,
      totalGenerations,
      generationsToday,
      generationsWeek,
      totalReferrals,
      purchasesPaid,
      purchasesByType,
      recentUsers,
    ] = await Promise.all([
      // Пользователи
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),

      // Подписки (raw SQL чтобы избежать проблемы с enum BASE)
      prisma.$queryRaw<Array<{ type: string; count: bigint }>>`
        SELECT "subscriptionType"::text as type, COUNT(*)::bigint as count
        FROM "users"
        GROUP BY "subscriptionType"
      `,
      0, // placeholder для subBase
      0, // placeholder для subPremium
      0, // placeholder для subLifetime

      // Генерации
      prisma.generation.count({ where: { status: "COMPLETED" } }),
      prisma.generation.count({ where: { status: "COMPLETED", createdAt: { gte: todayStart } } }),
      prisma.generation.count({ where: { status: "COMPLETED", createdAt: { gte: weekAgo } } }),

      // Рефералы
      prisma.referral.count(),

      // Платежи (оплаченные)
      prisma.purchase.aggregate({
        where: { status: "PAID" },
        _count: true,
        _sum: { amount: true },
      }),

      // Платежи по типам
      prisma.purchase.groupBy({
        by: ["type"],
        where: { status: "PAID" },
        _count: true,
        _sum: { amount: true },
      }),

      // Последние 10 пользователей
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionType: true,
          totalGenerations: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      users: {
        total: totalUsers,
        today: usersToday,
        week: usersWeek,
        month: usersMonth,
      },
      subscriptions: (() => {
        const subs: Record<string, number> = { FREE: 0, BASE: 0, PREMIUM: 0, LIFETIME: 0 };
        const groups = subGroupsRaw as Array<{ type: string; count: bigint }>;
        for (const g of groups) {
          subs[g.type] = Number(g.count);
        }
        return subs;
      })(),
      generations: {
        total: totalGenerations,
        today: generationsToday,
        week: generationsWeek,
      },
      referrals: totalReferrals,
      payments: {
        count: purchasesPaid._count ?? 0,
        totalAmount: purchasesPaid._sum?.amount ?? 0,
        byType: purchasesByType.map((p) => ({
          type: p.type,
          count: p._count ?? 0,
          amount: p._sum?.amount ?? 0,
        })),
      },
      recentUsers,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Internal server error", details: msg }, { status: 500 });
  }
}
