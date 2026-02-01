"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import Link from "next/link";

export default function StylistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Перенаправление на логин, если не авторизован
  if (status === "unauthenticated") {
    router.push("/login?callbackUrl=/stylist");
    return null;
  }

  if (status === "loading") {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-black text-cream flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-cream/60">Загрузка...</p>
          </div>
        </main>
      </>
    );
  }

  const handleAskStylist = async () => {
    if (!question.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: question };
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
      <main className="min-h-screen bg-black text-cream pt-20 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gold">AI Стилист</span>
            </h1>
            <p className="text-cream/70">
              Получите персональные советы от AI стилиста совершенно бесплатно
            </p>
          </div>

          {/* Chat Container */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            {/* Messages */}
            <div className="space-y-4 mb-6 min-h-[400px] max-h-[600px] overflow-y-auto">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💬</div>
                  <p className="text-cream/60 mb-6">
                    Задайте вопрос AI стилисту о моде, стиле, цветовых сочетаниях
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    <button
                      onClick={() =>
                        setQuestion("Какой стиль одежды мне подойдет для офиса?")
                      }
                      className="glass-card p-3 text-left text-sm hover:border-gold/50 transition-all rounded-lg"
                    >
                      💼 Какой стиль для офиса?
                    </button>
                    <button
                      onClick={() =>
                        setQuestion("Как подобрать цвета для моего образа?")
                      }
                      className="glass-card p-3 text-left text-sm hover:border-gold/50 transition-all rounded-lg"
                    >
                      🎨 Как подобрать цвета?
                    </button>
                    <button
                      onClick={() =>
                        setQuestion("С чем носить кожаную куртку?")
                      }
                      className="glass-card p-3 text-left text-sm hover:border-gold/50 transition-all rounded-lg"
                    >
                      🧥 С чем носить куртку?
                    </button>
                    <button
                      onClick={() =>
                        setQuestion("Какие аксессуары сейчас в тренде?")
                      }
                      className="glass-card p-3 text-left text-sm hover:border-gold/50 transition-all rounded-lg"
                    >
                      ✨ Что сейчас в тренде?
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
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      message.role === "user"
                        ? "bg-gold text-black"
                        : "glass-card"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAskStylist()}
                placeholder="Спросите AI стилиста о моде и стиле..."
                className="flex-1 bg-cream/5 border border-cream/20 rounded-xl px-4 py-3 text-cream placeholder:text-cream/40 focus:outline-none focus:border-gold"
                disabled={isLoading}
              />
              <button
                onClick={handleAskStylist}
                disabled={!question.trim() || isLoading}
                className="bg-gold hover:bg-gold-600 text-black font-semibold px-6 py-3 rounded-xl btn-gold-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отправить
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="text-center text-cream/60 text-sm">
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
