"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import Image from "next/image";
import Link from "next/link";

// Все 20 стилей одежды
const styles = [
  // FREE стили (3 шт)
  { id: "casual", name: "Casual", emoji: "👕", description: "Повседневный стиль", isPremium: false },
  { id: "business", name: "Business", emoji: "💼", description: "Деловой образ", isPremium: false },
  { id: "streetwear", name: "Streetwear", emoji: "🧢", description: "Уличная мода", isPremium: false },

  // PREMIUM стили (17 шт)
  { id: "romantic", name: "Romantic", emoji: "💐", description: "Романтичный стиль", isPremium: true },
  { id: "athleisure", name: "Athleisure", emoji: "🏃", description: "Спортивный шик", isPremium: true },
  { id: "elegant-evening", name: "Elegant Evening", emoji: "🌙", description: "Вечерний элегантный", isPremium: true },
  { id: "boho", name: "Boho", emoji: "🌸", description: "Богемный стиль", isPremium: true },
  { id: "minimalist", name: "Minimalist", emoji: "⚪", description: "Минималистичный", isPremium: true },
  { id: "vintage-retro", name: "Vintage Retro", emoji: "🕰️", description: "Винтажный 50-х", isPremium: true },
  { id: "smart-casual", name: "Smart Casual", emoji: "👔", description: "Деловой-повседневный", isPremium: true },
  { id: "glamorous", name: "Glamorous", emoji: "💎", description: "Гламурный стиль", isPremium: true },
  { id: "preppy", name: "Preppy", emoji: "🎓", description: "Преппи стиль", isPremium: true },
  { id: "edgy-rock", name: "Edgy Rock", emoji: "🎸", description: "Рок стиль", isPremium: true },
  { id: "feminine", name: "Feminine", emoji: "🎀", description: "Ультра-женственный", isPremium: true },
  { id: "avant-garde", name: "Avant-garde", emoji: "🎨", description: "Авангардный", isPremium: true },
  { id: "resort-vacation", name: "Resort", emoji: "🏖️", description: "Курортный стиль", isPremium: true },
  { id: "monochrome", name: "Monochrome", emoji: "⚫", description: "Монохромный", isPremium: true },
  { id: "layered", name: "Layered", emoji: "🧥", description: "Многослойный", isPremium: true },
  { id: "classic-timeless", name: "Classic", emoji: "👗", description: "Классический", isPremium: true },
  { id: "trendy-2026", name: "Trendy 2026", emoji: "✨", description: "Актуальные тренды", isPremium: true },
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [showAllStyles, setShowAllStyles] = useState(false);

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

  // Поделиться в соцсетях
  const handleShare = async () => {
    if (!generatedImage) return;

    try {
      // Если FREE пользователь - добавляем watermark
      if (!isPremium) {
        const response = await fetch("/api/share/watermark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: generatedImage }),
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
        setShareImageUrl(generatedImage);
      }

      setShowShareModal(true);
    } catch (err) {
      console.error("Share preparation error:", err);
      alert("Произошла ошибка при подготовке изображения для шаринга.");
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
      try {
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
        console.log("Image copied to clipboard");
      } catch (clipboardErr) {
        // Если не удалось скопировать - скачиваем файл
        console.log("Clipboard not supported, downloading file");
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `looklikeme-wb-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      // Открываем главную страницу WB
      window.open("https://www.wildberries.ru/", "_blank");
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-cream flex items-center gap-2">
                    <span className="text-2xl">👗</span> Стиль
                  </h2>
                  <span className="text-cream/40 text-xs">
                    {styles.length} стилей доступно
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(showAllStyles ? styles : styles.slice(0, 6)).map((style) => {
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
                        <div className="text-cream/40 text-xs mt-0.5">{style.description}</div>
                        {isLocked && (
                          <div className="absolute top-2 right-2 text-xs bg-gold/20 text-gold px-2 py-0.5 rounded">
                            Premium
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Кнопка показать все/свернуть */}
                {styles.length > 6 && (
                  <button
                    onClick={() => setShowAllStyles(!showAllStyles)}
                    className="w-full mt-4 py-2 text-cream/60 hover:text-gold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {showAllStyles ? (
                      <>
                        <span>Свернуть</span>
                        <span className="text-xs">↑</span>
                      </>
                    ) : (
                      <>
                        <span>Показать все стили ({styles.length - 6} ещё)</span>
                        <span className="text-xs">↓</span>
                      </>
                    )}
                  </button>
                )}
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

                  {/* Кнопка поделиться */}
                  <button
                    onClick={handleShare}
                    className="w-full py-3 glass-card hover:bg-cream/5 text-cream font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    📤 Поделиться
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
                <h2 className="text-xl font-bold text-cream">Поделиться образом</h2>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    if (shareImageUrl && !isPremium) {
                      window.URL.revokeObjectURL(shareImageUrl);
                    }
                  }}
                  className="text-cream/60 hover:text-cream text-2xl transition-colors"
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
                    // VK не поддерживает прямую загрузку изображений через URL параметры
                    // Поэтому просто открываем страницу для постинга
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
                  className="w-full py-3 glass-card hover:bg-cream/5 text-cream font-semibold rounded-lg transition-all flex items-center justify-center gap-3"
                >
                  📥 Скачать для шаринга
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </>
  );
}
