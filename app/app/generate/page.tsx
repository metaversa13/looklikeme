"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import Image from "next/image";
import Link from "next/link";

// Данные стилей (позже загрузим из БД)
const styles = [
  { id: "casual-chic", name: "Casual Chic", emoji: "👕", isPremium: false },
  { id: "business", name: "Business", emoji: "💼", isPremium: false },
  { id: "evening", name: "Evening", emoji: "🌙", isPremium: false },
  { id: "bohemian", name: "Bohemian", emoji: "🌸", isPremium: true },
  { id: "glamour", name: "Glamour", emoji: "💎", isPremium: true },
  { id: "sporty-chic", name: "Sporty Chic", emoji: "🏃", isPremium: true },
];

const locations = [
  { id: "studio", name: "Студия", emoji: "🎨", isPremium: false },
  { id: "city-day", name: "Город (день)", emoji: "🌆", isPremium: true },
  { id: "city-night", name: "Город (ночь)", emoji: "🌃", isPremium: true },
  { id: "runway", name: "Подиум", emoji: "✨", isPremium: true },
];

const palettes = [
  { id: "spring", name: "Весна", colors: ["#FFB6C1", "#FFE4E1", "#DDA0DD", "#F0E68C"], isPremium: true },
  { id: "summer", name: "Лето", colors: ["#87CEEB", "#FFB6D9", "#D3D3D3", "#E6E6FA"], isPremium: true },
  { id: "autumn", name: "Осень", colors: ["#CD853F", "#D2691E", "#DAA520", "#8B4513"], isPremium: true },
  { id: "winter", name: "Зима", colors: ["#000000", "#FFFFFF", "#000080", "#DC143C"], isPremium: true },
];

export default function GeneratePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("studio");
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastGenerationData, setLastGenerationData] = useState<{
    resultImageUrl: string;
    prompt: string;
    styleSlug: string;
    locationSlug: string;
    paletteSlug: string | null;
    generationTime: number;
  } | null>(null);
  const [limits, setLimits] = useState<{
    canGenerate: boolean;
    remaining: number;
    limit: number;
    subscriptionType: string;
  } | null>(null);
  const [showWBModal, setShowWBModal] = useState(false);
  const [wbImageReady, setWbImageReady] = useState(false);

  const isPremium = session?.user?.subscriptionType !== "FREE";

  // Загружаем информацию о лимитах
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await fetch("/api/limits");
        if (response.ok) {
          const data = await response.json();
          setLimits(data);
        }
      } catch (error) {
        console.error("Failed to fetch limits:", error);
      }
    };

    if (session) {
      fetchLimits();
    }
  }, [session]);

  // Сохранить в галерею
  const handleSaveToGallery = async () => {
    if (!lastGenerationData || isSaved) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lastGenerationData),
      });

      if (response.ok) {
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Поиск на Wildberries
  const handleSearchOnWB = async () => {
    if (!generatedImage) return;

    try {
      // Получаем изображение как blob
      const response = await fetch(generatedImage);
      const blob = await response.blob();

      // Пытаемся скопировать в буфер обмена
      let copiedToClipboard = false;
      try {
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
        copiedToClipboard = true;
        setWbImageReady(true);
      } catch (clipboardErr) {
        console.log("Clipboard not supported, will download instead");
      }

      // Показываем модальное окно с инструкциями
      setShowWBModal(true);

      // Через секунду автоматически открываем WB
      setTimeout(() => {
        window.open("https://global.wildberries.ru/search-by-photo", "_blank");
      }, 1500);

      // Если не удалось скопировать - скачиваем файл
      if (!copiedToClipboard) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `looklikeme-wb-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("WB search error:", err);
      alert("Произошла ошибка. Попробуйте скачать изображение вручную.");
    }
  };

  // Редирект на логин если не авторизован
  if (status === "loading") {
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
    router.push("/login?callbackUrl=/generate");
    return null;
  }

  // Сжимаем изображение до разумного размера
  const compressImage = (file: File, maxWidth: number = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new window.Image();

      img.onload = () => {
        // Рассчитываем новые размеры с сохранением пропорций
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Рисуем и сжимаем
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.85);

        console.log("Original size:", Math.round(file.size / 1024), "KB");
        console.log("Compressed size:", Math.round(compressed.length / 1024), "KB");

        resolve(compressed);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Сжимаем большие изображения
      const compressed = await compressImage(file);
      setUploadedImage(compressed);
      setGeneratedImage(null);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !selectedStyle) return;

    setIsGenerating(true);
    setError(null);
    const startTime = Date.now();

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: uploadedImage,
          style: selectedStyle,
          location: selectedLocation,
          palette: selectedPalette,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Специальная обработка для лимита
        if (response.status === 429) {
          setError(data.message || "Достигнут дневной лимит");
          // Обновляем информацию о лимитах
          const limitsResponse = await fetch("/api/limits");
          if (limitsResponse.ok) {
            const limitsData = await limitsResponse.json();
            setLimits(limitsData);
          }
          return;
        }
        // Специальная обработка для Premium функций
        if (response.status === 403) {
          setError(data.message || "Эта функция доступна только для Premium подписки");
          return;
        }
        throw new Error(data.error || "Generation failed");
      }

      setGeneratedImage(data.imageUrl);
      // Сохраняем данные для возможного сохранения в галерею
      setLastGenerationData({
        resultImageUrl: data.imageUrl,
        prompt: data.prompt,
        styleSlug: selectedStyle,
        locationSlug: selectedLocation,
        paletteSlug: selectedPalette,
        generationTime: Date.now() - startTime,
      });
      setIsSaved(false);

      // Обновляем лимиты после успешной генерации
      const limitsResponse = await fetch("/api/limits");
      if (limitsResponse.ok) {
        const limitsData = await limitsResponse.json();
        setLimits(limitsData);
      }
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "Ошибка генерации");
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = uploadedImage && selectedStyle && !isGenerating;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pt-20 pb-10">
        <div className="max-w-6xl mx-auto px-4">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-cream mb-2">
              Создайте свой образ
            </h1>
            <p className="text-cream/60">
              Загрузите фото и выберите стиль для генерации
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Левая колонка - Настройки */}
            <div className="space-y-6">
              {/* Загрузка фото */}
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
                  <span className="text-2xl">📷</span> Ваше фото
                </h2>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                    ${uploadedImage
                      ? "border-gold/50 bg-gold/5"
                      : "border-cream/20 hover:border-gold/50 hover:bg-cream/5"
                    }
                  `}
                >
                  {uploadedImage ? (
                    <div className="relative aspect-[3/4] max-w-[200px] mx-auto">
                      <Image
                        src={uploadedImage}
                        alt="Uploaded"
                        fill
                        className="object-cover rounded-lg"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedImage(null);
                          setGeneratedImage(null);
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-4xl mb-2">📤</div>
                      <p className="text-cream/70">Нажмите для загрузки фото</p>
                      <p className="text-cream/40 text-sm mt-1">JPG, PNG до 10MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Выбор стиля */}
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
                  <span className="text-2xl">👗</span> Стиль
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {styles.map((style) => {
                    const isLocked = style.isPremium && !isPremium;
                    const isSelected = selectedStyle === style.id;

                    return (
                      <button
                        key={style.id}
                        onClick={() => !isLocked && setSelectedStyle(style.id)}
                        disabled={isLocked}
                        className={`
                          relative p-4 rounded-xl border-2 transition-all text-left
                          ${isSelected
                            ? "border-gold bg-gold/10"
                            : isLocked
                              ? "border-cream/10 bg-cream/5 opacity-60 cursor-not-allowed"
                              : "border-cream/20 hover:border-gold/50"
                          }
                        `}
                      >
                        <div className="text-2xl mb-1">{style.emoji}</div>
                        <div className="text-cream text-sm font-medium">{style.name}</div>
                        {isLocked && (
                          <div className="absolute top-2 right-2 text-xs bg-gold/20 text-gold px-2 py-0.5 rounded">
                            Premium
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Выбор локации */}
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
                  <span className="text-2xl">🏞️</span> Локация
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {locations.map((location) => {
                    const isLocked = location.isPremium && !isPremium;
                    const isSelected = selectedLocation === location.id;

                    return (
                      <button
                        key={location.id}
                        onClick={() => !isLocked && setSelectedLocation(location.id)}
                        disabled={isLocked}
                        className={`
                          relative p-3 rounded-xl border-2 transition-all text-center
                          ${isSelected
                            ? "border-gold bg-gold/10"
                            : isLocked
                              ? "border-cream/10 bg-cream/5 opacity-60 cursor-not-allowed"
                              : "border-cream/20 hover:border-gold/50"
                          }
                        `}
                      >
                        <div className="text-2xl mb-1">{location.emoji}</div>
                        <div className="text-cream text-xs">{location.name}</div>
                        {isLocked && (
                          <div className="absolute top-1 right-1 text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded">
                            Premium
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Цветовая палитра */}
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎨</span> Цветовая палитра
                  <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded ml-2">Premium</span>
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {palettes.map((palette) => {
                    const isLocked = palette.isPremium && !isPremium;
                    const isSelected = selectedPalette === palette.id;

                    return (
                      <button
                        key={palette.id}
                        onClick={() => !isLocked && setSelectedPalette(
                          selectedPalette === palette.id ? null : palette.id
                        )}
                        disabled={isLocked}
                        className={`
                          relative p-3 rounded-xl border-2 transition-all
                          ${isSelected
                            ? "border-gold bg-gold/10"
                            : isLocked
                              ? "border-cream/10 bg-cream/5 opacity-60 cursor-not-allowed"
                              : "border-cream/20 hover:border-gold/50"
                          }
                        `}
                      >
                        <div className="flex gap-1 mb-2 justify-center">
                          {palette.colors.map((color, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full border border-cream/20"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="text-cream text-xs text-center">{palette.name}</div>
                      </button>
                    );
                  })}
                </div>

                {!isPremium && (
                  <p className="text-cream/40 text-xs mt-3 text-center">
                    Цветовые палитры доступны для Premium подписки
                  </p>
                )}
              </div>

              {/* Информация о лимитах */}
              {limits && (
                <div className="mb-4">
                  {limits.limit === -1 ? (
                    <div className="flex items-center justify-center gap-2 text-gold text-sm">
                      <span>✨</span>
                      <span>Безлимитная генерация</span>
                    </div>
                  ) : limits.canGenerate ? (
                    <div className="flex items-center justify-center gap-2 text-cream/60 text-sm">
                      <span>Осталось {limits.remaining} из {limits.limit} генераций сегодня</span>
                    </div>
                  ) : (
                    <div className="glass-card rounded-lg p-4 mb-4 border border-red-500/20">
                      <p className="text-red-400 text-sm mb-3 text-center">
                        Вы исчерпали дневной лимит ({limits.limit} генераций)
                      </p>
                      <Link
                        href="/pricing"
                        className="block w-full py-2 bg-gold hover:bg-gold-600 text-black text-center font-semibold rounded-lg transition-all"
                      >
                        Обновить до Premium
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Кнопка генерации */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || !!(limits && !limits.canGenerate)}
                className={`
                  w-full py-4 rounded-xl font-semibold text-lg transition-all
                  ${canGenerate && (!limits || limits.canGenerate)
                    ? "bg-gold hover:bg-gold-600 text-black"
                    : "bg-cream/10 text-cream/40 cursor-not-allowed"
                  }
                `}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Генерация...
                  </span>
                ) : (
                  "Создать образ"
                )}
              </button>
            </div>

            {/* Правая колонка - Результат */}
            <div className="glass-card rounded-xl p-6 h-fit lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
                <span className="text-2xl">✨</span> Результат
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="aspect-[3/4] bg-cream/5 rounded-xl flex items-center justify-center overflow-hidden">
                {generatedImage ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={generatedImage}
                      alt="Generated"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : isGenerating ? (
                  <div className="text-center">
                    <div className="text-4xl mb-3 animate-pulse">🎨</div>
                    <p className="text-cream/60">Создаем ваш образ...</p>
                    <p className="text-cream/40 text-sm mt-1">Это займет 20-30 секунд</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-4xl mb-3 opacity-50">👗</div>
                    <p className="text-cream/40">
                      {!uploadedImage
                        ? "Загрузите фото"
                        : !selectedStyle
                          ? "Выберите стиль"
                          : "Нажмите «Создать образ»"
                      }
                    </p>
                  </div>
                )}
              </div>

              {generatedImage && (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(generatedImage);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `looklikeme-${Date.now()}.jpg`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          console.error("Download error:", err);
                        }
                      }}
                      className="flex-1 py-3 bg-gold hover:bg-gold-600 text-black font-semibold rounded-lg transition-all"
                    >
                      📥 Скачать
                    </button>
                    <button
                      onClick={handleSaveToGallery}
                      disabled={isSaved || isSaving}
                      className={`flex-1 py-3 rounded-lg transition-all font-semibold ${
                        isSaved
                          ? "bg-green-500/20 text-green-400 border border-green-500/50"
                          : "bg-cream/10 hover:bg-cream/20 text-cream"
                      }`}
                    >
                      {isSaving ? "Сохранение..." : isSaved ? "✓ Сохранено" : "💾 Сохранить"}
                    </button>
                  </div>

                  {/* Кнопка поиска на Wildberries */}
                  <button
                    onClick={handleSearchOnWB}
                    className="w-full py-3 glass-card hover:bg-cream/5 text-cream font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    🔍 Найти похожее на Wildberries
                  </button>

                  {isSaved && (
                    <button
                      onClick={() => router.push("/gallery")}
                      className="w-full py-2 text-cream/60 hover:text-gold text-sm transition-colors"
                    >
                      Перейти в галерею →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Модальное окно с инструкциями для WB */}
        {showWBModal && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowWBModal(false)}
          >
            <div
              className="glass-card rounded-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Иконка */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gold/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🔍</span>
                </div>
                <h2 className="text-2xl font-bold text-cream mb-2">
                  Поиск на Wildberries
                </h2>
                <p className="text-cream/60 text-sm">
                  Открываем страницу поиска по фото
                </p>
              </div>

              {/* Инструкции */}
              <div className="space-y-4 mb-6">
                {wbImageReady ? (
                  <>
                    <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <span className="text-green-400 text-xl flex-shrink-0">✓</span>
                      <div>
                        <p className="text-green-400 font-medium text-sm">
                          Изображение скопировано!
                        </p>
                        <p className="text-cream/60 text-xs mt-1">
                          На странице WB нажмите Ctrl+V (или Cmd+V на Mac), чтобы вставить фото
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-gold text-lg flex-shrink-0">1.</span>
                      <p className="text-cream/80 text-sm">
                        Откроется новая вкладка с поиском по фото
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-gold text-lg flex-shrink-0">2.</span>
                      <p className="text-cream/80 text-sm">
                        Нажмите <span className="font-mono bg-cream/10 px-2 py-0.5 rounded">Ctrl+V</span> для вставки изображения
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-gold text-lg flex-shrink-0">3.</span>
                      <p className="text-cream/80 text-sm">
                        Выберите понравившиеся товары
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3 p-3 bg-cream/5 border border-cream/10 rounded-lg">
                      <span className="text-gold text-xl flex-shrink-0">📥</span>
                      <div>
                        <p className="text-cream font-medium text-sm">
                          Изображение загружено
                        </p>
                        <p className="text-cream/60 text-xs mt-1">
                          Файл сохранён в папку "Загрузки"
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-gold text-lg flex-shrink-0">1.</span>
                      <p className="text-cream/80 text-sm">
                        Откроется новая вкладка с поиском по фото
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-gold text-lg flex-shrink-0">2.</span>
                      <p className="text-cream/80 text-sm">
                        Загрузите файл из папки "Загрузки"
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-gold text-lg flex-shrink-0">3.</span>
                      <p className="text-cream/80 text-sm">
                        Выберите понравившиеся товары
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Кнопка */}
              <button
                onClick={() => setShowWBModal(false)}
                className="w-full py-3 bg-gold hover:bg-gold-600 text-black font-semibold rounded-lg transition-all"
              >
                Понятно
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
