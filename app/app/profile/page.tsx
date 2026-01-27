"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import Image from "next/image";

interface UserStats {
  totalGenerations: number;
  savedImages: number;
  favorites: number;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetchStats();
    }
  }, [status]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/user/stats");
      const data = await response.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-black pt-20 flex items-center justify-center">
          <div className="animate-pulse text-gold">Загрузка...</div>
        </main>
      </>
    );
  }

  if (!session) {
    router.push("/login?callbackUrl=/profile");
    return null;
  }

  const subscriptionLabels: Record<string, { name: string; color: string }> = {
    FREE: { name: "Бесплатный", color: "text-cream/60" },
    PREMIUM: { name: "Premium", color: "text-gold" },
    LIFETIME: { name: "Lifetime", color: "text-purple-400" },
  };

  const subscription = subscriptionLabels[session.user.subscriptionType] || subscriptionLabels.FREE;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pt-20 pb-10">
        <div className="max-w-2xl mx-auto px-4">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-cream mb-2">
              Мой профиль
            </h1>
          </div>

          {/* Карточка профиля */}
          <div className="glass-card rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              {/* Аватар */}
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "Avatar"}
                  width={80}
                  height={80}
                  className="rounded-full border-2 border-gold/30"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gold flex items-center justify-center text-black text-2xl font-bold">
                  {session.user.name?.charAt(0) || "U"}
                </div>
              )}

              {/* Имя и email */}
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-cream">
                  {session.user.name || "Пользователь"}
                </h2>
                <p className="text-cream/60 text-sm">{session.user.email}</p>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    session.user.subscriptionType === "FREE"
                      ? "bg-cream/10 text-cream/60"
                      : session.user.subscriptionType === "LIFETIME"
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "bg-gold/20 text-gold border border-gold/30"
                  }`}>
                    {session.user.subscriptionType !== "FREE" && "✨ "}
                    {subscription.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Разделитель */}
            <div className="border-t border-cream/10 my-6" />

            {/* Статистика */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-cream/5 rounded-lg">
                <div className="text-2xl font-bold text-gold">
                  {stats?.totalGenerations || 0}
                </div>
                <div className="text-cream/60 text-sm">Генераций</div>
              </div>
              <div className="text-center p-4 bg-cream/5 rounded-lg">
                <div className="text-2xl font-bold text-cream">
                  {stats?.savedImages || 0}
                </div>
                <div className="text-cream/60 text-sm">Сохранено</div>
              </div>
              <div className="text-center p-4 bg-cream/5 rounded-lg">
                <div className="text-2xl font-bold text-red-400">
                  {stats?.favorites || 0}
                </div>
                <div className="text-cream/60 text-sm">Избранное</div>
              </div>
            </div>
          </div>

          {/* Подписка */}
          <div className="glass-card rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-cream mb-4">Подписка</h3>

            {session.user.subscriptionType === "FREE" ? (
              <div>
                <p className="text-cream/60 mb-4">
                  У вас бесплатный план. Обновите до Premium для доступа ко всем стилям и локациям.
                </p>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-cream/60">
                    <span className="text-red-400">✗</span> Premium стили заблокированы
                  </div>
                  <div className="flex items-center gap-2 text-cream/60">
                    <span className="text-red-400">✗</span> Premium локации заблокированы
                  </div>
                  <div className="flex items-center gap-2 text-cream/60">
                    <span className="text-red-400">✗</span> Образы удаляются через 30 дней
                  </div>
                </div>
                <button
                  onClick={() => router.push("/pricing")}
                  className="w-full py-3 bg-gold hover:bg-gold-600 text-black font-semibold rounded-lg transition-all"
                >
                  Обновить до Premium
                </button>
              </div>
            ) : (
              <div>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-cream">
                    <span className="text-green-400">✓</span> Все стили доступны
                  </div>
                  <div className="flex items-center gap-2 text-cream">
                    <span className="text-green-400">✓</span> Все локации доступны
                  </div>
                  <div className="flex items-center gap-2 text-cream">
                    <span className="text-green-400">✓</span> Образы хранятся бессрочно
                  </div>
                  {session.user.subscriptionType === "LIFETIME" && (
                    <div className="flex items-center gap-2 text-purple-400">
                      <span>✓</span> Пожизненный доступ
                    </div>
                  )}
                </div>
                {session.user.subscriptionType === "PREMIUM" && session.user.subscriptionEndDate && (
                  <p className="text-cream/60 text-sm">
                    Активна до: {new Date(session.user.subscriptionEndDate).toLocaleDateString("ru-RU")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Быстрые действия */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => router.push("/generate")}
              className="p-4 glass-card rounded-xl text-center hover:bg-cream/5 transition-colors"
            >
              <div className="text-2xl mb-2">🎨</div>
              <div className="text-cream font-medium">Создать образ</div>
            </button>
            <button
              onClick={() => router.push("/gallery")}
              className="p-4 glass-card rounded-xl text-center hover:bg-cream/5 transition-colors"
            >
              <div className="text-2xl mb-2">🖼️</div>
              <div className="text-cream font-medium">Мои образы</div>
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
