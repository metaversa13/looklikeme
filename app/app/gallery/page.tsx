"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import Image from "next/image";
import { MarketplacePanel } from "@/components/marketplace-panel";

interface Generation {
  id: string;
  resultImageUrl: string;
  styleSlug: string | null;
  locationSlug: string | null;
  createdAt: string;
  favorite: { id: string } | null;
}

const styleNames: Record<string, string> = {
  // FREE стили
  "casual": "Casual",
  "business": "Business",
  "sport": "Sport",

  // PREMIUM стили
  "street": "Street",
  "romantic": "Romantic",
  "minimalism": "Minimalism",
  "boho": "Boho",
  "grunge": "Grunge",
  "preppy": "Preppy",
  "disco": "Disco",
  "ladylike": "Ladylike",
  "scandinavian": "Scandinavian",
  "gaucho": "Gaucho",
  "urban-chic": "Urban Chic",
  "evening-elegant": "Evening Elegant",
  "glamour": "Glamour",
  "rock": "Rock",
  "resort": "Resort",
  "vintage-50s": "Vintage 50s",
  "trends-2026": "Trends 2026",
};

export default function GalleryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Generation | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [marketplaceProducts, setMarketplaceProducts] = useState<Array<{ title: string; url: string; image: string; marketplace: string; icon: string }>>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);

  const isPremium = session?.user?.subscriptionType !== "FREE";

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

  // Поделиться в соцсетях
  const handleShare = async (imageUrl: string) => {
    try {
      // Если FREE пользователь - добавляем watermark
      if (!isPremium) {
        const response = await fetch("/api/share/watermark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
        });

        if (response.ok) {
          // Получаем blob изображения с watermark
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          setShareImageUrl(url);
        } else {
          throw new Error("Failed to add watermark");
        }
      } else {
        // Premium пользователи получают оригинал
        setShareImageUrl(imageUrl);
      }

      setShowShareModal(true);
    } catch (err) {
      console.error("Share preparation error:", err);
      alert("Произошла ошибка при подготовке изображения для шаринга.");
    }
  };

  // Конвертация изображения в base64
  const imageToBase64 = async (url: string): Promise<string> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Поиск на маркетплейсах через Yandex Search API
  const handleMarketplaceSearch = async (imageUrl: string) => {
    setShowMarketplace(true);
    setMarketplaceLoading(true);
    setMarketplaceError(null);
    setMarketplaceProducts([]);

    try {
      const base64 = await imageToBase64(imageUrl);

      const response = await fetch("/api/marketplace-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка поиска");
      }

      setMarketplaceProducts(data.products || []);
    } catch (err) {
      console.error("Marketplace search error:", err);
      setMarketplaceError("Не удалось выполнить поиск. Попробуйте позже.");
    } finally {
      setMarketplaceLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background pt-20 flex items-center justify-center">
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
      <main className="min-h-screen bg-background pt-20 pb-10">
        <div className="max-w-6xl mx-auto px-4">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Мои образы
            </h1>
            <p className="text-foreground/60">
              {generations.length > 0
                ? `${generations.length} ${generations.length === 1 ? "образ" : "образов"}`
                : "Здесь появятся ваши сгенерированные образы"}
            </p>
          </div>

          {generations.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4 opacity-50">👗</div>
              <p className="text-foreground/60 mb-6">У вас пока нет сохранённых образов</p>
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
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-foreground/5 cursor-pointer"
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
                      <p className="text-foreground text-sm font-medium">
                        {gen.styleSlug ? styleNames[gen.styleSlug] || gen.styleSlug : "Образ"}
                      </p>
                      <p className="text-foreground/60 text-xs">
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
            className="fixed inset-0 bg-black/90 z-50 overflow-y-auto p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="relative max-w-2xl w-full mx-auto my-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Кнопка закрытия */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-10 right-0 text-foreground/60 hover:text-foreground text-2xl z-10"
              >
                ✕
              </button>

              {/* Изображение */}
              <div className="relative rounded-xl overflow-hidden" style={{ maxHeight: "65vh" }}>
                <Image
                  src={selectedImage.resultImageUrl}
                  alt="Generated look"
                  width={768}
                  height={1024}
                  className="object-contain w-full h-auto max-h-[65vh]"
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
                        : "bg-foreground/10 text-foreground hover:bg-foreground/20"
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

                {/* Кнопка поиска на маркетплейсах */}
                <button
                  onClick={() => handleMarketplaceSearch(selectedImage.resultImageUrl)}
                  className="w-full py-3 glass-card hover:bg-muted text-foreground font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  🛍️ Найти на маркетплейсах
                </button>

                {/* Кнопка поделиться */}
                <button
                  onClick={() => handleShare(selectedImage.resultImageUrl)}
                  className="w-full py-3 glass-card hover:bg-muted text-foreground font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  📤 Поделиться
                </button>
              </div>

              {/* Информация */}
              <div className="mt-4 p-4 bg-foreground/5 rounded-lg">
                <p className="text-foreground font-medium">
                  {selectedImage.styleSlug ? styleNames[selectedImage.styleSlug] || selectedImage.styleSlug : "Образ"}
                </p>
                <p className="text-foreground/60 text-sm">
                  Создано: {new Date(selectedImage.createdAt).toLocaleString("ru-RU")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно "Поделиться" */}
        {showShareModal && shareImageUrl && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowShareModal(false);
              if (shareImageUrl && !isPremium) {
                window.URL.revokeObjectURL(shareImageUrl);
              }
            }}
          >
            <div
              className="glass-card rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Заголовок */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Поделиться образом</h2>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    if (shareImageUrl && !isPremium) {
                      window.URL.revokeObjectURL(shareImageUrl);
                    }
                  }}
                  className="text-foreground/60 hover:text-foreground text-2xl transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Превью изображения */}
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-6">
                <Image
                  src={shareImageUrl}
                  alt="Share preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              {!isPremium && (
                <div className="mb-4 p-3 bg-gold/10 border border-gold/20 rounded-lg">
                  <p className="text-gold text-xs text-center">
                    ✨ Premium пользователи делятся образами без watermark
                  </p>
                </div>
              )}

              {/* Кнопки соцсетей */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const text = encodeURIComponent("Создал(а) свой образ на Looklikeme.ru ✨");
                    window.open(
                      `https://vk.com/share.php?url=${encodeURIComponent(window.location.origin)}&title=${text}`,
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
                    const text = encodeURIComponent("Создал(а) свой образ на Looklikeme.ru ✨\n\nПопробуй сам: " + window.location.origin);
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${text}`, "_blank");
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
                    const text = encodeURIComponent("Создал(а) свой образ на Looklikeme.ru ✨\n\nПопробуй сам: " + window.location.origin);
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
                  onClick={async () => {
                    try {
                      const response = await fetch(shareImageUrl);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `looklikeme-share-${Date.now()}.jpg`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error("Download error:", err);
                    }
                  }}
                  className="w-full py-3 glass-card hover:bg-muted text-foreground font-semibold rounded-lg transition-all flex items-center justify-center gap-3"
                >
                  📥 Скачать для шаринга
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Панель маркетплейсов */}
      <MarketplacePanel
        isOpen={showMarketplace}
        onClose={() => setShowMarketplace(false)}
        products={marketplaceProducts}
        isLoading={marketplaceLoading}
        error={marketplaceError}
      />
    </>
  );
}
