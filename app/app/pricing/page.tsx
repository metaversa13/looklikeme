"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  buttonText: string;
}

const plans: PricingPlan[] = [
  {
    id: "FREE",
    name: "Бесплатный",
    price: 0,
    description: "Попробуйте сервис бесплатно",
    features: [
      "Базовые стили одежды",
      "Фон: фотостудия",
      "Образы хранятся 30 дней",
      "Водяной знак на изображениях",
    ],
    buttonText: "Текущий план",
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: 199,
    period: "месяц",
    description: "Полный доступ ко всем функциям",
    features: [
      "Все стили одежды",
      "Все локации (фоны)",
      "Все цветовые палитры",
      "Образы хранятся бессрочно",
      "Без водяных знаков",
      "Приоритетная генерация",
    ],
    highlighted: true,
    buttonText: "Оформить подписку",
  },
  {
    id: "LIFETIME",
    name: "Lifetime",
    price: 4990,
    description: "Один платёж — навсегда",
    features: [
      "Всё из Premium",
      "Пожизненный доступ",
      "Ранний доступ к новинкам",
      "Приоритетная поддержка",
      "Эксклюзивные стили",
    ],
    buttonText: "Купить навсегда",
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (planId === "FREE") return;

    if (!session) {
      router.push(`/login?callbackUrl=/pricing`);
      return;
    }

    setLoading(planId);

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment");
      }

      const { paymentUrl } = await response.json();

      // Редирект на страницу оплаты YooKassa
      window.location.href = paymentUrl;
    } catch (error) {
      console.error("Payment error:", error);
      alert("Произошла ошибка при создании платежа. Попробуйте позже.");
      setLoading(null);
    }
  };

  const currentPlan = session?.user?.subscriptionType || "FREE";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pt-20 pb-10">
        <div className="max-w-5xl mx-auto px-4">
          {/* Заголовок */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-cream mb-4">
              Выберите свой план
            </h1>
            <p className="text-cream/60 max-w-2xl mx-auto">
              Создавайте стильные образы с помощью искусственного интеллекта.
              Начните бесплатно или получите полный доступ с Premium.
            </p>
          </div>

          {/* Карточки тарифов */}
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan === plan.id;
              const isDisabled =
                isCurrentPlan ||
                (plan.id === "FREE") ||
                (plan.id === "PREMIUM" && currentPlan === "LIFETIME");

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-6 ${
                    plan.highlighted
                      ? "bg-gradient-to-b from-gold/20 to-gold/5 border-2 border-gold"
                      : "glass-card"
                  }`}
                >
                  {/* Бейдж "Популярный" */}
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gold text-black text-xs font-bold px-3 py-1 rounded-full">
                        Популярный
                      </span>
                    </div>
                  )}

                  {/* Текущий план */}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Ваш план
                      </span>
                    </div>
                  )}

                  {/* Название и цена */}
                  <div className="mb-6">
                    <h3 className={`text-xl font-bold mb-2 ${
                      plan.highlighted ? "text-gold" : "text-cream"
                    }`}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-cream">
                        {plan.price === 0 ? "0" : plan.price.toLocaleString()}
                      </span>
                      <span className="text-cream/60">
                        ₽{plan.period ? ` / ${plan.period}` : ""}
                      </span>
                    </div>
                    <p className="text-cream/60 text-sm mt-2">
                      {plan.description}
                    </p>
                  </div>

                  {/* Список возможностей */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className={plan.highlighted ? "text-gold" : "text-green-400"}>
                          ✓
                        </span>
                        <span className="text-cream/80 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Кнопка */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isDisabled || loading === plan.id}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      isCurrentPlan
                        ? "bg-cream/10 text-cream/40 cursor-not-allowed"
                        : plan.highlighted
                          ? "bg-gold hover:bg-gold-600 text-black"
                          : plan.id === "LIFETIME"
                            ? "bg-purple-500 hover:bg-purple-600 text-white"
                            : "bg-cream/10 hover:bg-cream/20 text-cream"
                    } ${loading === plan.id ? "opacity-70 cursor-wait" : ""}`}
                  >
                    {loading === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Переход к оплате...
                      </span>
                    ) : isCurrentPlan ? (
                      "Текущий план"
                    ) : (
                      plan.buttonText
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* FAQ секция */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-cream text-center mb-8">
              Частые вопросы
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-cream font-semibold mb-2">
                  Как работает подписка Premium?
                </h3>
                <p className="text-cream/60 text-sm">
                  Premium подписка даёт полный доступ ко всем функциям сервиса. Оплата списывается ежемесячно. Вы можете отменить подписку в любой момент.
                </p>
              </div>
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-cream font-semibold mb-2">
                  Что значит Lifetime?
                </h3>
                <p className="text-cream/60 text-sm">
                  Lifetime — это единоразовый платёж, который даёт вам бессрочный доступ ко всем функциям Premium. Никаких ежемесячных платежей.
                </p>
              </div>
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-cream font-semibold mb-2">
                  Могу ли я вернуть деньги?
                </h3>
                <p className="text-cream/60 text-sm">
                  Да, мы предлагаем возврат в течение 7 дней после покупки, если вы не воспользовались сервисом более 3 раз.
                </p>
              </div>
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-cream font-semibold mb-2">
                  Как оплатить?
                </h3>
                <p className="text-cream/60 text-sm">
                  Мы принимаем банковские карты (Visa, MasterCard, МИР), а также оплату через YooMoney и SberPay.
                </p>
              </div>
            </div>
          </div>

          {/* CTA для незарегистрированных */}
          {!session && (
            <div className="mt-16 text-center glass-card rounded-xl p-8">
              <h2 className="text-2xl font-bold text-cream mb-4">
                Начните бесплатно уже сегодня
              </h2>
              <p className="text-cream/60 mb-6">
                Зарегистрируйтесь и создайте свой первый стильный образ за несколько секунд
              </p>
              <button
                onClick={() => router.push("/login")}
                className="bg-gold hover:bg-gold-600 text-black font-semibold py-3 px-8 rounded-lg transition-all"
              >
                Создать аккаунт
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
