import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { ReferralCapture } from "@/components/referral-capture";
import { Sparkles, Shirt, MapPin, ShoppingBag, MessageCircle, Gift } from "lucide-react";

export default function Home() {
  return (
    <>
      <Header />
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      <main className="min-h-screen bg-background text-foreground relative z-0">
        {/* Hero Section */}
        <div className="relative min-h-screen flex items-center justify-center px-4 pt-16">
          {/* Gradient Background */}
          <div className="absolute inset-0 vogue-gradient opacity-50" />

          {/* Content */}
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            {/* Logo */}
            <div className="mb-8">
              <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold tracking-tight">
                <span className="text-foreground">Look</span>
                <span className="text-gold">Like</span>
                <span className="text-foreground">me</span>
              </h1>
            </div>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-foreground/80 mb-12 font-light">
              Создайте свой идеальный модный образ с помощью AI и найдите его на маркетплейсах
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/generate"
                className="bg-gold hover:bg-gold-600 text-black font-semibold px-8 py-4 rounded-lg btn-gold-hover inline-block"
              >
                Начать бесплатно
              </Link>
              <Link
                href="/referral"
                className="border-2 border-foreground/20 hover:border-gold text-foreground font-semibold px-8 py-4 rounded-lg transition-all duration-300 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)] inline-block"
              >
                Получи +3 образа
              </Link>
            </div>

            {/* Features */}
            <div id="features" className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass-card p-6 rounded-xl transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <div className="w-14 h-14 rounded-lg bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-gold" strokeWidth={1.5} />
                </div>
                <h3 className="text-gold font-semibold mb-2">AI Генерация</h3>
                <p className="text-foreground/70 text-sm">
                  Личный AI стилист создает реалистичные модные образы за секунды
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <div className="w-14 h-14 rounded-lg bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <Shirt className="w-7 h-7 text-gold" strokeWidth={1.5} />
                </div>
                <h3 className="text-gold font-semibold mb-2">20 Стилей</h3>
                <p className="text-foreground/70 text-sm">
                  От casual до glamour — найдите свой идеальный стиль
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <div className="w-14 h-14 rounded-lg bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-7 h-7 text-gold" strokeWidth={1.5} />
                </div>
                <h3 className="text-gold font-semibold mb-2">8 Локаций</h3>
                <p className="text-foreground/70 text-sm">
                  Студия, город, пляж, кафе и другие фоны для ваших образов
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <div className="w-14 h-14 rounded-lg bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-7 h-7 text-gold" strokeWidth={1.5} />
                </div>
                <h3 className="text-gold font-semibold mb-2">Поиск на маркетплейсах</h3>
                <p className="text-foreground/70 text-sm">
                  Находите похожую одежду на популярных маркетплейсах
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <div className="w-14 h-14 rounded-lg bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-7 h-7 text-gold" strokeWidth={1.5} />
                </div>
                <h3 className="text-gold font-semibold mb-2">AI Стилист</h3>
                <p className="text-foreground/70 text-sm">
                  Персональные советы от AI стилиста — бесплатно
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <div className="w-14 h-14 rounded-lg bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-7 h-7 text-gold" strokeWidth={1.5} />
                </div>
                <h3 className="text-gold font-semibold mb-2">5 бесплатных образов</h3>
                <p className="text-foreground/70 text-sm">
                  Начните прямо сейчас — первые 5 генераций бесплатно
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
