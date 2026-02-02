"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ReferralData {
  referralCode: string;
  bonusGenerations: number;
  maxBonus: number;
  referralCount: number;
  bonusPerReferral: number;
}

export default function ReferralPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetch("/api/referral")
        .then((r) => r.json())
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [session]);

  const referralLink = data
    ? `${window.location.origin}/?ref=${data.referralCode}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "LookLikeMe - AI Fashion",
        text: "Создавай модные образы с AI! Регистрируйся по моей ссылке:",
        url: referralLink,
      });
    } else {
      handleCopy();
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground/60">Загрузка...</div>
      </div>
    );
  }

  if (!data) return null;

  const progressPercent = Math.min((data.bonusGenerations / data.maxBonus) * 100, 100);

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎁</div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Пригласи друга
          </h1>
          <p className="text-foreground/60">
            Получи <span className="text-gold font-bold">+{data.bonusPerReferral} генераций</span> за каждого приглашённого друга
          </p>
        </div>

        {/* Referral Link Card */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <p className="text-foreground/50 text-sm mb-2">Твоя реферальная ссылка</p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2.5 text-foreground text-sm font-mono truncate"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-gold text-black rounded-lg font-medium text-sm hover:bg-gold/90 transition-colors whitespace-nowrap"
            >
              {copied ? "Скопировано!" : "Копировать"}
            </button>
          </div>

          <button
            onClick={handleShare}
            className="w-full mt-3 px-4 py-3 bg-foreground/10 hover:bg-foreground/15 text-foreground rounded-lg font-medium text-sm transition-colors"
          >
            Поделиться ссылкой
          </button>
        </div>

        {/* Stats Card */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="text-foreground font-bold text-lg mb-4">Твоя статистика</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-foreground/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gold">{data.referralCount}</div>
              <div className="text-foreground/50 text-xs mt-1">Друзей приглашено</div>
            </div>
            <div className="bg-foreground/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gold">+{data.bonusGenerations}</div>
              <div className="text-foreground/50 text-xs mt-1">Бонусных генераций</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-foreground/50 mb-1">
              <span>Прогресс бонусов</span>
              <span>{data.bonusGenerations} / {data.maxBonus}</span>
            </div>
            <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <p className="text-foreground/40 text-xs">
            Максимум {data.maxBonus} бонусных генераций ({data.maxBonus / data.bonusPerReferral} друзей)
          </p>
        </div>

        {/* How it works */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-foreground font-bold text-lg mb-4">Как это работает</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
              <div>
                <p className="text-foreground text-sm font-medium">Поделись ссылкой</p>
                <p className="text-foreground/50 text-xs">Отправь реферальную ссылку друзьям</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
              <div>
                <p className="text-foreground text-sm font-medium">Друг регистрируется</p>
                <p className="text-foreground/50 text-xs">Переходит по ссылке и создаёт аккаунт</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
              <div>
                <p className="text-foreground text-sm font-medium">Получи +{data.bonusPerReferral} генераций</p>
                <p className="text-foreground/50 text-xs">Бонус начисляется автоматически, без срока годности</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
