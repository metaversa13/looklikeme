"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/header";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, update } = useSession();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Обновляем сессию для получения новых данных о подписке
    update();

    // Обратный отсчет для редиректа
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/profile");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [update, router]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          {/* Иконка успеха */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Заголовок */}
          <h1 className="text-3xl font-bold text-cream mb-4">
            Оплата прошла успешно!
          </h1>

          {/* Описание */}
          <p className="text-cream/60 mb-8">
            Спасибо за покупку! Ваша подписка активирована.
            <br />
            Теперь вам доступны все премиум-функции.
          </p>

          {/* Список возможностей */}
          <div className="glass-card rounded-xl p-6 mb-8 text-left">
            <h3 className="text-cream font-semibold mb-4">Теперь вам доступно:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-gold">✓</span>
                <span className="text-cream/80 text-sm">Все стили одежды</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">✓</span>
                <span className="text-cream/80 text-sm">Все локации и фоны</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">✓</span>
                <span className="text-cream/80 text-sm">Все цветовые палитры</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">✓</span>
                <span className="text-cream/80 text-sm">Бессрочное хранение образов</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">✓</span>
                <span className="text-cream/80 text-sm">Без водяных знаков</span>
              </li>
            </ul>
          </div>

          {/* Кнопки */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/generate")}
              className="w-full py-3 bg-gold hover:bg-gold-600 text-black font-semibold rounded-lg transition-all"
            >
              Создать образ
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="w-full py-3 glass-card hover:bg-cream/5 text-cream font-semibold rounded-lg transition-all"
            >
              Перейти в профиль
            </button>
          </div>

          {/* Автоматический редирект */}
          <p className="text-cream/40 text-sm mt-6">
            Автоматический переход в профиль через {countdown} сек...
          </p>
        </div>
      </main>
    </>
  );
}
