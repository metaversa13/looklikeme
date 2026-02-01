import Link from "next/link";
import { Header } from "@/components/header";

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-black text-cream">
        {/* Hero Section */}
        <div className="relative min-h-screen flex items-center justify-center px-4 pt-16">
          {/* Gradient Background */}
          <div className="absolute inset-0 vogue-gradient opacity-50" />

          {/* Content */}
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            {/* Logo */}
            <div className="mb-8">
              <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
                <span className="text-cream">Look</span>
                <span className="text-gold">Like</span>
                <span className="text-cream">me</span>
              </h1>
            </div>

            {/* Tagline */}
            <p className="text-xl md:text-2xl text-cream/80 mb-12 font-light">
              Создайте свой идеальный модный образ с помощью AI
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
                href="#features"
                className="border-2 border-cream/20 hover:border-gold text-cream font-semibold px-8 py-4 rounded-lg transition-all inline-block"
              >
                Узнать больше
              </Link>
            </div>

            {/* Features */}
            <div id="features" className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass-card p-6 rounded-xl">
                <div className="text-4xl mb-4">✨</div>
                <h3 className="text-gold font-semibold mb-2">AI Генерация</h3>
                <p className="text-cream/70 text-sm">
                  Личный AI стилист создает реалистичные модные образы за секунды
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl">
                <div className="text-4xl mb-4">👗</div>
                <h3 className="text-gold font-semibold mb-2">20 Стилей</h3>
                <p className="text-cream/70 text-sm">
                  От casual до glamour — найдите свой идеальный стиль
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl">
                <div className="text-4xl mb-4">🎨</div>
                <h3 className="text-gold font-semibold mb-2">8 Цветовых палитр</h3>
                <p className="text-cream/70 text-sm">
                  Сезонные и стилистические палитры для идеального образа
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl">
                <div className="text-4xl mb-4">🛍️</div>
                <h3 className="text-gold font-semibold mb-2">Поиск на маркетплейсах</h3>
                <p className="text-cream/70 text-sm">
                  Находите похожую одежду на популярных маркетплейсах (скоро)
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-gold font-semibold mb-2">AI Стилист</h3>
                <p className="text-cream/70 text-sm">
                  Персональные советы от AI стилиста — бесплатно
                </p>
              </div>

              <div className="glass-card p-6 rounded-xl">
                <div className="text-4xl mb-4">🎁</div>
                <h3 className="text-gold font-semibold mb-2">5 бесплатных образов</h3>
                <p className="text-cream/70 text-sm">
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
