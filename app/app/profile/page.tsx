"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import Image from "next/image";
import { Sparkles, ImageIcon } from "lucide-react";

interface UserStats {
  totalGenerations: number;
  savedImages: number;
  favorites: number;
}

type Gender = "MALE" | "FEMALE" | "NOT_SPECIFIED";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [gender, setGender] = useState<Gender>("NOT_SPECIFIED");
  const [savingGender, setSavingGender] = useState(false);

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
      if (data.gender) {
        setGender(data.gender);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveGender = async (newGender: Gender) => {
    setSavingGender(true);
    try {
      const response = await fetch("/api/user/update-gender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender: newGender }),
      });

      if (response.ok) {
        setGender(newGender);
      } else {
        alert("Ошибка при сохранении");
      }
    } catch (error) {
      console.error("Error saving gender:", error);
      alert("Ошибка при сохранении");
    } finally {
      setSavingGender(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background pt-20 flex items-center justify-center relative z-0">
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
    FREE: { name: "Freemium", color: "text-foreground/60" },
    BASE: { name: "Base", color: "text-gold" },
    PREMIUM: { name: "Premium", color: "text-gold" },
    LIFETIME: { name: "Lifetime", color: "text-purple-400" },
  };

  const subscription = subscriptionLabels[session.user.subscriptionType as string] || subscriptionLabels.FREE;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 pb-10 relative z-0">
        <div className="max-w-2xl mx-auto px-4">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
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
                <h2 className="text-xl font-semibold text-foreground">
                  {session.user.name || "Пользователь"}
                </h2>
                <p className="text-foreground/60 text-sm">{session.user.email}</p>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    session.user.subscriptionType === "FREE"
                      ? "bg-foreground/10 text-foreground/60"
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
            <div className="border-t border-foreground/10 my-6" />

            {/* Статистика */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="text-center p-3 md:p-4 bg-foreground/5 rounded-lg">
                <div className="text-xl md:text-2xl font-bold text-gold">
                  {stats?.totalGenerations || 0}
                </div>
                <div className="text-foreground/60 text-xs md:text-sm">Генераций</div>
              </div>
              <div className="text-center p-3 md:p-4 bg-foreground/5 rounded-lg">
                <div className="text-xl md:text-2xl font-bold text-foreground">
                  {stats?.savedImages || 0}
                </div>
                <div className="text-foreground/60 text-xs md:text-sm">Сохранено</div>
              </div>
              <div className="text-center p-3 md:p-4 bg-foreground/5 rounded-lg">
                <div className="text-xl md:text-2xl font-bold text-red-400">
                  {stats?.favorites || 0}
                </div>
                <div className="text-foreground/60 text-xs md:text-sm">Избранное</div>
              </div>
            </div>
          </div>

          {/* Подписка */}
          <div className="glass-card rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Подписка</h3>

            {session.user.subscriptionType === "FREE" ? (
              <div>
                <p className="text-foreground/60 mb-4">
                  У вас план Freemium. Оформите подписку для доступа ко всем стилям и локациям.
                </p>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-foreground/60">
                    <span className="text-red-400">✗</span> Premium стили заблокированы
                  </div>
                  <div className="flex items-center gap-2 text-foreground/60">
                    <span className="text-red-400">✗</span> Premium локации заблокированы
                  </div>
                  <div className="flex items-center gap-2 text-foreground/60">
                    <span className="text-red-400">✗</span> Образы удаляются через 14 дней
                  </div>
                </div>
                <button
                  onClick={() => router.push("/pricing")}
                  className="w-full py-3 bg-gold hover:bg-gold-600 text-black font-semibold rounded-lg transition-all"
                >
                  Выбрать план
                </button>
              </div>
            ) : (
              <div>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-foreground">
                    <span className="text-green-400">✓</span> Все стили доступны
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <span className="text-green-400">✓</span> Все локации доступны
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <span className="text-green-400">✓</span> Образы хранятся бессрочно
                  </div>
                  {session.user.subscriptionType === "LIFETIME" && (
                    <div className="flex items-center gap-2 text-purple-400">
                      <span>✓</span> Пожизненный доступ
                    </div>
                  )}
                </div>
                {(session.user.subscriptionType === "BASE" || session.user.subscriptionType === "PREMIUM") && session.user.subscriptionEndDate && (
                  <p className="text-foreground/60 text-sm">
                    Активна до: {new Date(session.user.subscriptionEndDate).toLocaleDateString("ru-RU")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Пол пользователя */}
          <div className="glass-card rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Пол</h3>
            <p className="text-foreground/60 text-sm mb-4">
              Укажите ваш пол для более точной генерации образов
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => saveGender("MALE")}
                disabled={savingGender}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  gender === "MALE"
                    ? "bg-gold text-black border-2 border-gold"
                    : "glass-card text-foreground hover:bg-muted border-2 border-transparent"
                } ${savingGender ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className={gender === "MALE" ? "text-black" : "text-gold"}>♂</span> Мужской
              </button>
              <button
                onClick={() => saveGender("FEMALE")}
                disabled={savingGender}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  gender === "FEMALE"
                    ? "bg-gold text-black border-2 border-gold"
                    : "glass-card text-foreground hover:bg-muted border-2 border-transparent"
                } ${savingGender ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className={gender === "FEMALE" ? "text-black" : "text-gold"}>♀</span> Женский
              </button>
            </div>
            {gender === "NOT_SPECIFIED" && (
              <p className="text-gold/80 text-xs mt-3 text-center">
                ⚠️ Пожалуйста, укажите ваш пол для корректной работы генератора
              </p>
            )}
          </div>

          {/* Быстрые действия */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => router.push("/generate")}
              className="p-4 glass-card rounded-xl text-center hover:bg-muted transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]"
            >
              <Sparkles className="w-7 h-7 text-gold mx-auto mb-2" strokeWidth={1.5} />
              <div className="text-foreground font-medium">Создать образ</div>
            </button>
            <button
              onClick={() => router.push("/gallery")}
              className="p-4 glass-card rounded-xl text-center hover:bg-muted transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]"
            >
              <ImageIcon className="w-7 h-7 text-gold mx-auto mb-2" strokeWidth={1.5} />
              <div className="text-foreground font-medium">Мои образы</div>
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
