import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body.event;
    const payment = body.object;

    // Обрабатываем только успешные платежи
    if (event !== "payment.succeeded") {
      return NextResponse.json({ received: true });
    }

    const purchaseId = payment.metadata?.purchaseId;
    const userId = payment.metadata?.userId;
    const planId = payment.metadata?.planId;

    if (!purchaseId || !userId || !planId) {
      console.error("Missing metadata in payment:", payment);
      return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
    }

    // Обновляем статус покупки
    const purchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    // Обновляем подписку пользователя
    const subscriptionData: {
      subscriptionType: "PREMIUM" | "LIFETIME";
      subscriptionEndDate?: Date;
      lifetimeAccess?: boolean;
    } = {
      subscriptionType: planId as "PREMIUM" | "LIFETIME",
    };

    if (planId === "PREMIUM") {
      // Подписка на месяц
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      subscriptionData.subscriptionEndDate = endDate;
    } else if (planId === "LIFETIME") {
      // Пожизненный доступ
      subscriptionData.lifetimeAccess = true;
      subscriptionData.subscriptionEndDate = null;
    }

    await prisma.user.update({
      where: { id: userId },
      data: subscriptionData,
    });

    console.log(`✅ Payment successful: User ${userId} upgraded to ${planId}`);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
