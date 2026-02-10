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
  badge?: string;
}

const plans: PricingPlan[] = [
  {
    id: "FREE",
    name: "Freemium",
    price: 0,
    description: "Попробуйте сервис бесплатно",
    features: [
      "5 генераций в месяц",
      "4 стиля одежды (Casual, Business, Sport, Street)",
      "2 локации (Студия, Город)",
      "1 палитра (Классика)",
      "AI Стилист: 3 вопроса в день",
      "Образы хранятся 30 дней",
      "Водяной знак на изображениях",
    ],
    buttonText: "Текущий план",
  },
  {
    id: "BASE",
    name: "Base",
    price: 299,
    period: "месяц",
    description: "Для активного использования",
    features: [
      "До 50 генераций в месяц",
      "Все 20 стилей одежды",
      "Все 8 локаций",
      "Все 8 цветовых палитр",
      "AI Стилист: безлимитно",
      "Образы хранятся бессрочно",
      "Без водяных знаков",
    ],
    buttonText: "Оформить подписку",
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: 499,
    period: "месяц",
    description: "Максимум возможностей",
    features: [
      "До 100 генераций в месяц",
      "Все 20 стилей одежды",
      "Все 8 локаций",
      "Все 8 цветовых палитр",
      "AI Стилист: безлимитно",
      "Приоритетная генерация",
      "Образы хранятся бессрочно",
      "Без водяных знаков",
    ],
    highlighted: true,
    buttonText: "Оформить подписку",
    badge: "На 20% дешевле",
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
      <main className="min-h-screen bg-background pt-20 pb-10 relative z-0">
        <div className="max-w-5xl mx-auto px-4">
          {/* Заголовок */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Выберите свой план
            </h1>
            <p className="text-foreground/60 max-w-2xl mx-auto">
              Создавайте стильные образы с помощью искусственного интеллекта.
              Начните бесплатно или получите полный доступ с подпиской.
            </p>
          </div>

          {/* Карточки тарифов */}
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan === plan.id;
              const isDisabled =
                isCurrentPlan ||
                (plan.id === "FREE") ||
                (plan.id === "BASE" && (currentPlan === "PREMIUM" || currentPlan === "LIFETIME"));

              return (
                <div
                  key={plan.id}
                  className={`relative z-0 rounded-2xl p-6 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)] ${
                    plan.highlighted
                      ? "bg-gradient-to-b from-gold/20 to-gold/5 border-2 border-gold"
                      : "glass-card"
                  }`}
                >
                  {/* Бейдж */}
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-0">
                      <span className="bg-gold text-black text-xs font-bold px-3 py-1 rounded-full">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Текущий план */}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4 z-0">
                      <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Ваш план
                      </span>
                    </div>
                  )}

                  {/* Название и цена */}
                  <div className="mb-6">
                    <h3 className={`text-xl font-bold mb-2 ${
                      plan.highlighted ? "text-gold" : "text-foreground"
                    }`}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">
                        {plan.price === 0 ? "0" : plan.price.toLocaleString()}
                      </span>
                      <span className="text-foreground/60">
                        ₽{plan.period ? ` / ${plan.period}` : ""}
                      </span>
                    </div>
                    <p className="text-foreground/60 text-sm mt-2">
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
                        <span className="text-foreground/80 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Кнопка */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isDisabled || loading === plan.id}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      isCurrentPlan
                        ? "bg-foreground/10 text-foreground/40 cursor-not-allowed"
                        : plan.highlighted
                          ? "bg-gold hover:bg-gold-600 text-black"
                          : "bg-foreground/10 hover:bg-foreground/20 text-foreground"
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

                  {/* Кнопка "Поддержать проект" для Freemium */}
                  {plan.id === "FREE" && isCurrentPlan && (
                    <button
                      onClick={() => handleSelectPlan("BASE")}
                      className="w-full mt-3 py-2.5 rounded-lg font-medium text-sm bg-gold/20 text-gold hover:bg-gold/30 transition-all"
                    >
                      Поддержать проект
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* FAQ секция */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              Частые вопросы
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass-card rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <h3 className="text-foreground font-semibold mb-2">
                  Чем отличается Base от Premium?
                </h3>
                <p className="text-foreground/60 text-sm">
                  Base даёт 50 генераций в месяц, Premium — 100. При этом Premium на 20% выгоднее в пересчёте за одну генерацию (4.99₽ vs 5.98₽). Оба плана дают полный доступ ко всем стилям и локациям.
                </p>
              </div>
              <div className="glass-card rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <h3 className="text-foreground font-semibold mb-2">
                  Могу ли я сменить план?
                </h3>
                <p className="text-foreground/60 text-sm">
                  Да, вы можете в любой момент перейти с Base на Premium. Неиспользованные генерации переносятся до конца текущего периода.
                </p>
              </div>
              <div className="glass-card rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <h3 className="text-foreground font-semibold mb-2">
                  Могу ли я вернуть деньги?
                </h3>
                <p className="text-foreground/60 text-sm">
                  Да, мы предлагаем возврат в течение 7 дней после покупки, если вы не воспользовались сервисом более 3 раз.
                </p>
              </div>
              <div className="glass-card rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <h3 className="text-foreground font-semibold mb-2">
                  Как оплатить?
                </h3>
                <p className="text-foreground/60 text-sm">
                  Мы принимаем банковские карты (Visa, MasterCard, МИР), а также оплату через YooMoney и SberPay.
                </p>
              </div>
            </div>
          </div>

          {/* CTA для незарегистрированных */}
          {!session && (
            <div className="mt-16 text-center glass-card rounded-xl p-8 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Начните бесплатно уже сегодня
              </h2>
              <p className="text-foreground/60 mb-6">
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
