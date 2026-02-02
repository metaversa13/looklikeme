"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";

interface Stats {
  users: { total: number; today: number; week: number; month: number };
  subscriptions: { FREE: number; BASE: number; PREMIUM: number; LIFETIME: number };
  generations: { total: number; today: number; week: number };
  referrals: number;
  payments: {
    count: number;
    totalAmount: number;
    byType: Array<{ type: string; count: number; amount: number }>;
  };
  recentUsers: Array<{
    id: string;
    name: string | null;
    email: string | null;
    subscriptionType: string;
    totalGenerations: number;
    createdAt: string;
  }>;
}

const typeLabels: Record<string, string> = {
  PACKAGE: "Пакеты генераций",
  SUBSCRIPTION: "Подписки",
  LIFETIME: "Пожизненный доступ",
};

const subLabels: Record<string, string> = {
  FREE: "Freemium",
  BASE: "Base",
  PREMIUM: "Premium",
  LIFETIME: "Lifetime",
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/admin/stats")
        .then(async (res) => {
          if (!res.ok) {
            if (res.status === 403) {
              setError("Доступ запрещён");
            } else {
              const errData = await res.json().catch(() => ({}));
              setError(errData.details || "Ошибка загрузки");
            }
            return;
          }
          const data = await res.json();
          setStats(data);
        })
        .catch(() => setError("Ошибка сети"))
        .finally(() => setLoading(false));
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background pt-20 flex items-center justify-center">
          <div className="text-foreground/60">Загрузка...</div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background pt-20 flex items-center justify-center">
          <div className="text-red-400 text-lg">{error}</div>
        </main>
      </>
    );
  }

  if (!stats) return null;

  const formatMoney = (kopecks: number) => {
    return (kopecks / 100).toLocaleString("ru-RU") + " ₽";
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background text-foreground pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">
            <span className="text-gold">Админ-панель</span>
          </h1>

          {/* Пользователи */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Пользователи</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Всего" value={stats.users.total} />
              <StatCard label="Сегодня" value={stats.users.today} accent />
              <StatCard label="За неделю" value={stats.users.week} />
              <StatCard label="За месяц" value={stats.users.month} />
            </div>
          </section>

          {/* Подписки */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Подписки</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(Object.entries(stats.subscriptions) as [string, number][]).map(([type, count]) => (
                <StatCard key={type} label={subLabels[type] || type} value={count} />
              ))}
            </div>
          </section>

          {/* Генерации */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Генерации</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Всего" value={stats.generations.total} />
              <StatCard label="Сегодня" value={stats.generations.today} accent />
              <StatCard label="За неделю" value={stats.generations.week} />
            </div>
          </section>

          {/* Рефералы */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Рефералы</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Всего приглашённых" value={stats.referrals} />
            </div>
          </section>

          {/* Платежи */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Платежи</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Всего оплат" value={stats.payments.count} />
              <StatCard label="Общая сумма" value={formatMoney(stats.payments.totalAmount)} accent />
            </div>
            {stats.payments.byType.length > 0 && (
              <div className="mt-4 glass-card rounded-2xl p-6">
                <h3 className="text-foreground/70 text-sm mb-3">По типам</h3>
                <div className="space-y-2">
                  {stats.payments.byType.map((p) => (
                    <div key={p.type} className="flex justify-between items-center">
                      <span className="text-foreground/80">{typeLabels[p.type] || p.type}</span>
                      <span className="text-foreground">
                        {p.count} шт. — {formatMoney(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Последние пользователи */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Последние регистрации</h2>
            <div className="glass-card rounded-2xl p-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-foreground/50 text-left">
                    <th className="pb-3 pr-4">Имя</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Подписка</th>
                    <th className="pb-3 pr-4">Генерации</th>
                    <th className="pb-3">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers.map((user) => (
                    <tr key={user.id} className="border-t border-foreground/10">
                      <td className="py-2 pr-4 text-foreground">{user.name || "—"}</td>
                      <td className="py-2 pr-4 text-foreground/70">{user.email || "—"}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          user.subscriptionType === "FREE" ? "bg-foreground/10 text-foreground/60" :
                          user.subscriptionType === "BASE" ? "bg-blue-500/20 text-blue-400" :
                          user.subscriptionType === "PREMIUM" ? "bg-gold/20 text-gold" :
                          "bg-purple-500/20 text-purple-400"
                        }`}>
                          {subLabels[user.subscriptionType] || user.subscriptionType}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-foreground">{user.totalGenerations}</td>
                      <td className="py-2 text-foreground/50">
                        {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-foreground/50 text-xs mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent ? "text-gold" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}
