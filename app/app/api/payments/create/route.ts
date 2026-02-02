import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { YooCheckout } from "@a2seven/yoo-checkout";

const checkout = new YooCheckout({
  shopId: process.env.YOOKASSA_SHOP_ID!,
  secretKey: process.env.YOOKASSA_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await request.json();

    // Определяем параметры плана
    const planConfig: Record<
      string,
      { amount: number; description: string; type: string; period?: string }
    > = {
      BASE: {
        amount: 299,
        description: "Подписка Base на 1 месяц",
        type: "SUBSCRIPTION",
        period: "month",
      },
      PREMIUM: {
        amount: 499,
        description: "Подписка Premium на 1 месяц",
        type: "SUBSCRIPTION",
        period: "month",
      },
      LIFETIME: {
        amount: 4990,
        description: "Пожизненный доступ Lifetime",
        type: "LIFETIME",
      },
    };

    const plan = planConfig[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Создаем запись о покупке
    const purchase = await prisma.purchase.create({
      data: {
        userId: session.user.id,
        type: plan.type as "SUBSCRIPTION" | "LIFETIME",
        amount: plan.amount * 100, // в копейках
        currency: "RUB",
        status: "PENDING",
        subscriptionPeriod: plan.period,
        paymentProvider: "yukassa",
      },
    });

    // Создаем платеж в YooKassa
    const payment = await checkout.createPayment({
      amount: {
        value: plan.amount.toString(),
        currency: "RUB",
      },
      confirmation: {
        type: "redirect",
        return_url: `${process.env.NEXTAUTH_URL}/payments/success?purchaseId=${purchase.id}`,
      },
      capture: true,
      description: plan.description,
      metadata: {
        purchaseId: purchase.id,
        userId: session.user.id,
        planId,
      },
    });

    // Сохраняем ID платежа
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { paymentId: payment.id },
    });

    return NextResponse.json({
      paymentUrl: payment.confirmation?.confirmation_url,
      purchaseId: purchase.id,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
