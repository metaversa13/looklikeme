"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import Image from "next/image";

interface Generation {
  id: string;
  resultImageUrl: string;
  styleSlug: string | null;
  locationSlug: string | null;
  createdAt: string;
  favorite: { id: string } | null;
}

const styleNames: Record<string, string> = {
  "casual-chic": "Casual Chic",
  "business": "Business",
  "evening": "Evening",
  "bohemian": "Bohemian",
  "glamour": "Glamour",
  "sporty-chic": "Sporty Chic",
};

export default function GalleryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Generation | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchGenerations();
    }
  }, [status]);

  const fetchGenerations = async () => {
    try {
      const response = await fetch("/api/generations");
      const data = await response.json();
      if (data.generations) {
        setGenerations(data.generations);
      }
    } catch (error) {
      console.error("Error fetching generations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (imageUrl: string, id: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `looklikeme-${id}.webp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const toggleFavorite = async (generationId: string) => {
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId }),
      });

      if (response.ok) {
        // Обновляем список
        fetchGenerations();
        // Обновляем selectedImage если открыто модальное окно
        if (selectedImage?.id === generationId) {
          const updated = generations.find(g => g.id === generationId);
          if (updated) {
            setSelectedImage({
              ...updated,
              favorite: updated.favorite ? null : { id: "temp" }
            });
          }
        }
      }
    } catch (error) {
      console.error("Favorite error:", error);
    }
  };

  const deleteGeneration = async (generationId: string) => {
    if (!confirm("Удалить этот образ навсегда?")) return;

    // Сразу убираем из UI для мгновенной обратной связи
    setGenerations((prev) => prev.filter((g) => g.id !== generationId));

    // Закрываем модальное окно если удаляем открытый образ
    if (selectedImage?.id === generationId) {
      setSelectedImage(null);
    }

    try {
      const response = await fetch(`/api/generations?id=${generationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Если ошибка - возвращаем обратно (перезагружаем список)
        fetchGenerations();
      }
    } catch (error) {
      console.error("Delete error:", error);
      // При ошибке перезагружаем список
      fetchGenerations();
    }
  };

  // Поиск на Wildberries
  const handleSearchOnWB = async (imageUrl: string) => {
    try {
      // Скачиваем изображение
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `looklikeme-wb-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Открываем WB поиск по фото в новой вкладке
      window.open("https://global.wildberries.ru/search-by-photo", "_blank");
    } catch (err) {
      console.error("WB search error:", err);
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
    router.push("/login?callbackUrl=/gallery");
    return null;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pt-20 pb-10">
        <div className="max-w-6xl mx-auto px-4">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-cream mb-2">
              Мои образы
            </h1>
            <p className="text-cream/60">
              {generations.length > 0
                ? `${generations.length} ${generations.length === 1 ? "образ" : "образов"}`
                : "Здесь появятся ваши сгенерированные образы"}
            </p>
          </div>

          {generations.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4 opacity-50">👗</div>
              <p className="text-cream/60 mb-6">У вас пока нет сохранённых образов</p>
              <button
                onClick={() => router.push("/generate")}
                className="bg-gold hover:bg-gold-600 text-black font-semibold py-3 px-6 rounded-lg transition-all"
              >
                Создать первый образ
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {generations.map((gen) => (
                <div
                  key={gen.id}
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-cream/5 cursor-pointer"
                  onClick={() => setSelectedImage(gen)}
                >
                  <Image
                    src={gen.resultImageUrl}
                    alt="Generated look"
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
                  />

                  {/* Overlay при наведении */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-cream text-sm font-medium">
                        {gen.styleSlug ? styleNames[gen.styleSlug] || gen.styleSlug : "Образ"}
                      </p>
                      <p className="text-cream/60 text-xs">
                        {new Date(gen.createdAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>

                  {/* Иконка избранного */}
                  {gen.favorite && (
                    <div className="absolute top-2 right-2">
                      <span className="text-red-500 text-xl">❤️</span>
                    </div>
                  )}

                  {/* Кнопка удаления образа */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGeneration(gen.id);
                    }}
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-lg"
                    title="Удалить образ"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Модальное окно просмотра */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="relative max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Кнопка закрытия */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-10 right-0 text-cream/60 hover:text-cream text-2xl"
              >
                ✕
              </button>

              {/* Изображение */}
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
                <Image
                  src={selectedImage.resultImageUrl}
                  alt="Generated look"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              {/* Кнопки действий */}
              <div className="space-y-3 mt-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDownload(selectedImage.resultImageUrl, selectedImage.id)}
                    className="flex-1 py-3 bg-gold hover:bg-gold-600 text-black font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    📥 Скачать
                  </button>
                  <button
                    onClick={() => toggleFavorite(selectedImage.id)}
                    className={`flex-1 py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-semibold ${
                      selectedImage.favorite
                        ? "bg-red-500/20 text-red-400 border border-red-500/50"
                        : "bg-cream/10 text-cream hover:bg-cream/20"
                    }`}
                  >
                    {selectedImage.favorite ? "💔 Убрать" : "❤️ В избранное"}
                  </button>
                  <button
                    onClick={() => deleteGeneration(selectedImage.id)}
                    className="py-3 px-4 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-all flex items-center justify-center"
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>

                {/* Кнопка поиска на Wildberries */}
                <button
                  onClick={() => handleSearchOnWB(selectedImage.resultImageUrl)}
                  className="w-full py-3 glass-card hover:bg-cream/5 text-cream font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  🔍 Найти похожее на Wildberries
                </button>
              </div>

              {/* Информация */}
              <div className="mt-4 p-4 bg-cream/5 rounded-lg">
                <p className="text-cream font-medium">
                  {selectedImage.styleSlug ? styleNames[selectedImage.styleSlug] || selectedImage.styleSlug : "Образ"}
                </p>
                <p className="text-cream/60 text-sm">
                  Создано: {new Date(selectedImage.createdAt).toLocaleString("ru-RU")}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
