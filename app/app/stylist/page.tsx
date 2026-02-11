"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import Link from "next/link";
import { Palette, Ruler, TrendingUp, ShoppingBag, Gem, HelpCircle, Shirt, Pipette, Send, RotateCcw } from "lucide-react";

export default function StylistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Перенаправление на логин, если не авторизован
  if (status === "unauthenticated") {
    router.push("/login?callbackUrl=/stylist");
    return null;
  }

  if (status === "loading") {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background text-foreground flex items-center justify-center relative z-0">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-foreground/60">Загрузка...</p>
          </div>
        </main>
      </>
    );
  }

  const handleAskStylist = async (directQuestion?: string) => {
    const text = directQuestion || question;
    if (!text.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: text };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/stylist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Извините, произошла ошибка. Попробуйте еще раз.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error asking stylist:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Произошла ошибка при обращении к AI стилисту.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background text-foreground pt-20 px-4 pb-8 relative z-0 overflow-x-hidden">
        <div className="max-w-4xl mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4">
              <span className="text-gold">AI Стилист</span>
            </h1>
            <p className="text-foreground/70 text-sm md:text-base">
              Получите персональные советы от AI стилиста совершенно бесплатно
            </p>
          </div>

          {/* Chat Container */}
          <div className="glass-card rounded-2xl p-4 md:p-6 mb-6 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
            {/* Messages */}
            <div className="space-y-4 mb-4 md:mb-6 min-h-[300px]">
              {messages.length === 0 && (
                <div className="text-center py-8 md:py-12">
                  <div className="text-5xl md:text-6xl mb-4">💬</div>
                  <p className="text-foreground/60 mb-6 text-sm md:text-base">
                    Задайте вопрос AI стилисту о моде, стиле, цветовых сочетаниях
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-w-2xl mx-auto">
                    <button
                      onClick={() =>
                        handleAskStylist("Какой цвет одежды мне подходит? Помоги определить мой цветотип.")
                      }
                      className="glass-card p-3 text-left text-sm hover:border-gold/50 transition-all rounded-lg flex items-center gap-2"
                    >
                      <Palette className="w-4 h-4 text-gold flex-shrink-0" strokeWidth={1.5} />
                      <span>Какой цвет мне подходит?</span>
                    </button>
                    <button
                      onClick={() =>
                        handleAskStylist("Что мне носить, чтобы визуально скрыть живот и бёдра?")
                      }
                      className="glass-card p-3 text-left text-sm hover:border-gold/50 transition-all rounded-lg flex items-center gap-2"
                    >
                      <Shirt className="w-4 h-4 text-gold flex-shrink-0" strokeWidth={1.5} />
                      <span>Как скрыть недостатки фигуры?</span>
                    </button>
                    <button
                      onClick={() =>
                        handleAskStylist("С какими цветами лучше сочетать базовый гардероб?")
                      }
                      className="glass-card p-3 text-left text-sm hover:border-gold/50 transition-all rounded-lg flex items-center gap-2"
                    >
                      <Pipette className="w-4 h-4 text-gold flex-shrink-0" strokeWidth={1.5} />
                      <span>Как сочетать цвета?</span>
                    </button>
                    <button
                      onClick={() =>
                        handleAskStylist("Какой фасон одежды подходит по типу фигуры?")
                      }
                      className="glass-card p-3 text-left text-sm hover:border-gold/50 transition-all rounded-lg flex items-center gap-2"
                    >
                      <Ruler className="w-4 h-4 text-gold flex-shrink-0" strokeWidth={1.5} />
                      <span>Фасон по типу фигуры</span>
                    </button>
                    <button
                      onClick={() =>
                        handleAskStylist("Что сейчас модно и как это правильно носить?")
                      }
                      className="glass-card p-3 text-left text-sm hover:border-gold/50 transition-all rounded-lg flex items-center gap-2"
                    >
                      <TrendingUp className="w-4 h-4 text-gold flex-shrink-0" strokeWidth={1.5} />
                      <span>Что сейчас в тренде?</span>
                    </button>
                    <button
                      onClick={() =>
                        handleAskStylist("Как собрать капсульный гардероб из 15 вещей на месяц?")
                      }
                      className="glass-card p-3 text-left text-sm hover:border-gold/50 transition-all rounded-lg flex items-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4 text-gold flex-shrink-0" strokeWidth={1.5} />
                      <span>Капсульный гардероб</span>
                    </button>
                    <button
                      onClick={() =>
                        handleAskStylist("Что купить, чтобы образ выглядел дороже?")
                      }
                      className="glass-card p-3 text-left text-sm hover:border-gold/50 transition-all rounded-lg flex items-center gap-2"
                    >
                      <Gem className="w-4 h-4 text-gold flex-shrink-0" strokeWidth={1.5} />
                      <span>Как выглядеть дороже?</span>
                    </button>
                    <button
                      onClick={() =>
                        handleAskStylist("Можно ли мне носить определённую вещь? Например, макси при маленьком росте или мини после 40?")
                      }
                      className="glass-card p-3 text-left text-sm hover:border-gold/50 transition-all rounded-lg flex items-center gap-2"
                    >
                      <HelpCircle className="w-4 h-4 text-gold flex-shrink-0" strokeWidth={1.5} />
                      <span>Можно ли мне носить...?</span>
                    </button>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[80%] p-3 md:p-4 rounded-2xl ${
                      message.role === "user"
                        ? "bg-gold text-black"
                        : "glass-card"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="glass-card p-4 rounded-2xl">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gold rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gold rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gold rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl bg-gold hover:bg-gold-600 text-black font-semibold btn-gold-hover transition-all flex items-center justify-center"
                  title="Новый чат"
                >
                  <RotateCcw className="w-5 h-5" strokeWidth={2} />
                </button>
              )}
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskStylist()}
                placeholder="Спросите о моде и стиле..."
                className="flex-1 min-w-0 bg-foreground/5 border border-foreground/20 rounded-xl px-3 md:px-4 py-3 text-sm md:text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold"
                disabled={isLoading}
              />
              <button
                onClick={() => handleAskStylist()}
                disabled={!question.trim() || isLoading}
                className="flex-shrink-0 bg-gold hover:bg-gold-600 text-black font-semibold px-4 md:px-6 py-3 rounded-xl btn-gold-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4 md:hidden" strokeWidth={2} />
                <span className="hidden md:inline">Отправить</span>
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="text-center text-foreground/60 text-xs md:text-sm">
            <p>
              AI стилист использует нейросеть для персональных рекомендаций.
            </p>
            <p className="mt-2">
              Хотите создать образ на своей фотографии?{" "}
              <Link href="/generate" className="text-gold hover:underline">
                Попробуйте генератор →
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
