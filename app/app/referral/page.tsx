"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Gift, Copy, Share2, Link2, UserPlus, Sparkles } from "lucide-react";

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
  const [showShareModal, setShowShareModal] = useState(false);

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
      setShowShareModal(true);
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
          <div className="text-foreground/60">Загрузка...</div>
        </div>
      </>
    );
  }

  if (!data) return null;

  const progressPercent = Math.min((data.bonusGenerations / data.maxBonus) * 100, 100);

  return (
    <>
    <Header />
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-12 h-12 text-gold" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Пригласи друга
          </h1>
          <p className="text-foreground/60">
            Получи <span className="text-gold font-bold">+{data.bonusPerReferral} генераций</span> за каждого приглашённого друга
          </p>
        </div>

        {/* Referral Link Card */}
        <div className="glass-card rounded-2xl p-6 mb-6 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
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
            className="w-full mt-3 px-4 py-3 bg-foreground/10 hover:bg-foreground/15 text-foreground rounded-lg font-medium text-sm transition-all duration-300 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2"
          >
            <Share2 className="w-5 h-5 text-gold" strokeWidth={1.5} /> Поделиться ссылкой
          </button>
        </div>

        {/* Stats Card */}
        <div className="glass-card rounded-2xl p-6 mb-6 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
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
        <div className="glass-card rounded-2xl p-6 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
          <h2 className="text-foreground font-bold text-lg mb-4">Как это работает</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                <Link2 className="w-5 h-5 text-gold" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-foreground text-sm font-medium">Поделись ссылкой</p>
                <p className="text-foreground/50 text-xs">Отправь реферальную ссылку друзьям</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-5 h-5 text-gold" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-foreground text-sm font-medium">Друг регистрируется</p>
                <p className="text-foreground/50 text-xs">Переходит по ссылке и создаёт аккаунт</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-gold" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-foreground text-sm font-medium">Получи +{data.bonusPerReferral} генераций</p>
                <p className="text-foreground/50 text-xs">Бонус начисляется автоматически, без срока годности</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Модальное окно "Поделиться" */}
    {showShareModal && (
      <div
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        onClick={() => setShowShareModal(false)}
      >
        <div
          className="glass-card rounded-2xl p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Поделиться ссылкой</h2>
            <button
              onClick={() => setShowShareModal(false)}
              className="text-foreground/60 hover:text-foreground text-2xl transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                const text = encodeURIComponent("Создавай модные образы с AI! Регистрируйся по моей ссылке:");
                window.open(
                  `https://vk.com/share.php?url=${encodeURIComponent(referralLink)}&title=${text}`,
                  "_blank"
                );
              }}
              className="w-full py-3 bg-[#0077FF] hover:bg-[#0066DD] text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.22 14.45h-1.75c-.63 0-.82-.5-1.95-1.66-1-.93-1.43-1.06-1.69-1.06-.35 0-.44.09-.44.54v1.52c0 .4-.13.64-1.18.64-1.75 0-3.7-1.06-5.07-3.04-2.04-2.88-2.6-5.05-2.6-5.49 0-.26.09-.5.54-.5h1.75c.4 0 .55.19.71.61.76 2.16 2.04 4.05 2.56 4.05.2 0 .29-.09.29-.58v-2.25c-.06-.96-.56-1.04-.56-1.38 0-.21.18-.42.46-.42h2.75c.34 0 .46.18.46.57v3.04c0 .34.15.46.25.46.2 0 .36-.12.73-.49 1.13-1.27 1.94-3.23 1.94-3.23.11-.23.29-.45.74-.45h1.75c.53 0 .64.27.53.63-.19.95-1.89 3.4-1.89 3.4-.16.26-.22.38 0 .68.16.23.69.67 1.04 1.08.64.73 1.14 1.33 1.27 1.75.13.43-.07.64-.5.64z"/>
              </svg>
              Поделиться ВКонтакте
            </button>

            <button
              onClick={() => {
                const text = encodeURIComponent("Создавай модные образы с AI! Регистрируйся по моей ссылке: " + referralLink);
                window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, "_blank");
              }}
              className="w-full py-3 bg-[#0088cc] hover:bg-[#0077bb] text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.67-.52.36-.99.53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.48 1.02-.73 3.99-1.74 6.66-2.89 8-3.45 3.81-1.58 4.6-1.85 5.12-1.86.11 0 .37.03.54.17.14.12.18.27.2.38-.01.06.01.24 0 .38z"/>
              </svg>
              Поделиться в Telegram
            </button>

            <button
              onClick={() => {
                const text = encodeURIComponent("Создавай модные образы с AI! Регистрируйся по моей ссылке: " + referralLink);
                window.open(`https://wa.me/?text=${text}`, "_blank");
              }}
              className="w-full py-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.97.58 3.83 1.58 5.39L2 22l4.91-1.63c1.48.83 3.16 1.26 4.92 1.26 5.46 0 9.91-4.45 9.91-9.91C21.74 6.45 17.5 2 12.04 2zm5.8 13.96c-.24.67-1.4 1.24-1.92 1.29-.53.05-1.03.24-3.47-.73-2.96-1.18-4.86-4.18-5.01-4.37-.15-.19-1.19-1.59-1.19-3.04 0-1.44.76-2.16 1.03-2.45.27-.29.59-.36.79-.36.2 0 .4.01.57.01.18.01.43-.07.67.51.24.59.83 2.03.9 2.18.07.15.12.33.02.53-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.61.17.29.76 1.25 1.64 2.03 1.13.99 2.09 1.31 2.39 1.45.29.15.46.12.63-.07.17-.19.73-.85.92-1.15.19-.29.39-.24.65-.15.27.1 1.7.8 1.99.95.29.15.48.22.55.34.07.12.07.67-.17 1.34z"/>
              </svg>
              Поделиться в WhatsApp
            </button>

            <button
              onClick={() => {
                handleCopy();
                setShowShareModal(false);
              }}
              className="w-full py-3 glass-card hover:bg-muted text-foreground font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Copy className="w-5 h-5 text-gold" strokeWidth={1.5} /> Скопировать ссылку
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
