"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import Image from "next/image";
import Link from "next/link";
import { fashionFacts } from "@/lib/fashion-facts";
import { MarketplacePanel } from "@/components/marketplace-panel";
import {
  Shirt, Briefcase, Dumbbell, MapPin, Heart, Circle, Flower2, Link2,
  GraduationCap, Disc3, Crown, Snowflake, Lasso, Building2, Moon, Gem,
  Guitar, Palmtree, Clock, Sparkles, Camera, Upload, Palette, ImageIcon,
  ShoppingBag, Sun, SunMoon, Store, Waves, Coffee, TreePine, Factory,
  Download, Share2, Gift, Users, Copy, Check, X,
  type LucideIcon,
} from "lucide-react";

// Иконки для стилей
const styleIcons: Record<string, LucideIcon> = {
  casual: Shirt, business: Briefcase, sport: Dumbbell, street: MapPin,
  romantic: Heart, minimalism: Circle, boho: Flower2, grunge: Link2,
  preppy: GraduationCap, disco: Disc3, ladylike: Crown, scandinavian: Snowflake,
  gaucho: Lasso, "urban-chic": Building2, "evening-elegant": Moon, glamour: Gem,
  rock: Guitar, resort: Palmtree, "vintage-50s": Clock, "trends-2026": Sparkles,
};

// Все 20 стилей одежды
const styles = [
  // FREE стили (4 шт)
  { id: "casual", name: "Casual", description: "Повседневный стиль", isPremium: false, gender: "universal" },
  { id: "business", name: "Business", description: "Деловой образ", isPremium: false, gender: "universal" },
  { id: "sport", name: "Sport", description: "Спортивный стиль", isPremium: false, gender: "universal" },
  { id: "street", name: "Street", description: "Уличная мода", isPremium: false, gender: "universal" },

  // PREMIUM стили (16 шт)
  { id: "romantic", name: "Romantic", description: "Романтичный стиль", isPremium: true, gender: "universal" },
  { id: "minimalism", name: "Minimalism", description: "Минимализм", isPremium: true, gender: "universal" },
  { id: "boho", name: "Boho", description: "Богемный стиль", isPremium: true, gender: "universal" },
  { id: "grunge", name: "Grunge", description: "Гранж стиль", isPremium: true, gender: "universal" },
  { id: "preppy", name: "Preppy", description: "Преппи стиль", isPremium: true, gender: "universal" },
  { id: "disco", name: "Disco", description: "Диско стиль", isPremium: true, gender: "universal" },
  { id: "ladylike", name: "Ladylike", description: "Леди стиль", isPremium: true, gender: "female" },
  { id: "scandinavian", name: "Scandinavian", description: "Скандинавский стиль", isPremium: true, gender: "universal" },
  { id: "gaucho", name: "Gaucho", description: "Гаучо вестерн", isPremium: true, gender: "universal" },
  { id: "urban-chic", name: "Urban Chic", description: "Городской шик", isPremium: true, gender: "universal" },
  { id: "evening-elegant", name: "Evening Elegant", description: "Вечерний элегантный", isPremium: true, gender: "universal" },
  { id: "glamour", name: "Glamour", description: "Гламурный стиль", isPremium: true, gender: "universal" },
  { id: "rock", name: "Rock", description: "Рок стиль", isPremium: true, gender: "universal" },
  { id: "resort", name: "Resort", description: "Курортный стиль", isPremium: true, gender: "universal" },
  { id: "vintage-50s", name: "Vintage 50s", description: "Винтаж 50-х", isPremium: true, gender: "universal" },
  { id: "trends-2026", name: "Trends 2026", description: "Тренды 2026", isPremium: true, gender: "universal" },
];

// Иконки для локаций
const locationIcons: Record<string, LucideIcon> = {
  studio: Palette, "city-day": Sun, "city-night": Moon, boutique: Store,
  beach: Waves, cafe: Coffee, nature: TreePine, loft: Factory,
};

const locations = [
  { id: "studio", name: "Студия", isPremium: false },
  { id: "city-day", name: "Город (день)", isPremium: false },
  { id: "city-night", name: "Город (ночь)", isPremium: true },
  { id: "boutique", name: "Бутик", isPremium: true },
  { id: "beach", name: "Пляж", isPremium: true },
  { id: "cafe", name: "Кафе", isPremium: true },
  { id: "nature", name: "Природа", isPremium: true },
  { id: "loft", name: "Лофт", isPremium: true },
];

export default function GeneratePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<"MALE" | "FEMALE" | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("studio");
  const [useCustomText, setUseCustomText] = useState(false);
  const [customOutfitText, setCustomOutfitText] = useState("");
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
    generationTime: number;
  } | null>(null);
  const [limits, setLimits] = useState<{
    canGenerate: boolean;
    remaining: number;
    limit: number;
    subscriptionType: string;
  } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentFact, setCurrentFact] = useState("");
  const [progress, setProgress] = useState(0);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showAllStyles, setShowAllStyles] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [marketplaceProducts, setMarketplaceProducts] = useState<Array<{ title: string; url: string; image: string; marketplace: string; icon: string }>>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  const isPremium = session?.user?.subscriptionType !== "FREE";

  // Восстанавливаем последнюю генерацию из sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("lastGeneration");
      if (saved) {
        const parsed = JSON.parse(saved);
        setGeneratedImage(parsed.generatedImage);
        setLastGenerationData(parsed.lastGenerationData);
        if (parsed.selectedStyle) setSelectedStyle(parsed.selectedStyle);
        if (parsed.selectedLocation) setSelectedLocation(parsed.selectedLocation);
      }
    } catch {}
  }, []);

  // Автоприменение реферального кода после авторизации
  useEffect(() => {
    if (!session?.user) return;
    const code = localStorage.getItem("referral_code");
    if (!code) return;
    localStorage.removeItem("referral_code");
    fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => {});
  }, [session]);

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

  // Загружаем реферальный код при открытии модалки лимита
  useEffect(() => {
    if (showLimitModal && !referralCode) {
      fetch("/api/referral")
        .then(res => res.json())
        .then(data => setReferralCode(data.referralCode))
        .catch(() => {});
    }
  }, [showLimitModal, referralCode]);

  // Сброс выбранного стиля если он не подходит по полу
  useEffect(() => {
    if (selectedGender && selectedStyle) {
      const currentStyle = styles.find(s => s.id === selectedStyle);
      if (currentStyle && currentStyle.gender !== "universal" && currentStyle.gender !== selectedGender.toLowerCase()) {
        setSelectedStyle(null);
      }
    }
  }, [selectedGender, selectedStyle]);

  // Ротация фактов и прогресс-бар во время генерации
  useEffect(() => {
    if (isGenerating) {
      setProgress(0);
      const randomFact = () => fashionFacts[Math.floor(Math.random() * fashionFacts.length)];
      setCurrentFact(randomFact());
      const factInterval = setInterval(() => setCurrentFact(randomFact()), 4000);
      // Прогресс-бар: плавно до 90% за ~30 сек, последние 10% ждут завершения
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + 3;
        });
      }, 1000);
      return () => {
        clearInterval(factInterval);
        clearInterval(progressInterval);
      };
    } else {
      // При завершении — заполняем до 100%
      if (progress > 0) {
        setProgress(100);
        setTimeout(() => setProgress(0), 500);
      }
    }
  }, [isGenerating]);

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
  const handleMarketplaceSearch = async () => {
    if (!generatedImage) return;

    setShowMarketplace(true);
    setMarketplaceLoading(true);
    setMarketplaceError(null);
    setMarketplaceProducts([]);

    try {
      const base64 = await imageToBase64(generatedImage);

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

  // Редирект на логин если не авторизован
  if (status === "loading") {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background pt-20 flex items-center justify-center relative z-0">
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
      sessionStorage.removeItem("lastGeneration");
    }
  };

  const handleGenerate = async () => {
    // Валидация зависит от режима (готовый стиль или пользовательский текст)
    if (!uploadedImage || !selectedGender) return;
    if (useCustomText && !customOutfitText.trim()) return;
    if (!useCustomText && !selectedStyle) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    sessionStorage.removeItem("lastGeneration");
    setLastGenerationData(null);
    setIsSaved(false);
    const startTime = Date.now();

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: uploadedImage,
          style: useCustomText ? null : selectedStyle,
          location: selectedLocation,
          gender: selectedGender,
          customOutfit: useCustomText ? customOutfitText : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Специальная обработка для лимита
        if (response.status === 429) {
          setShowLimitModal(true);
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
      const genData = {
        resultImageUrl: data.imageUrl,
        prompt: data.prompt,
        styleSlug: selectedStyle,
        locationSlug: selectedLocation,
        generationTime: Date.now() - startTime,
      };
      setLastGenerationData(genData);
      setIsSaved(false);

      // Сохраняем в sessionStorage чтобы не потерять при навигации
      try {
        sessionStorage.setItem("lastGeneration", JSON.stringify({
          generatedImage: data.imageUrl,
          lastGenerationData: genData,
          selectedStyle,
          selectedLocation,
        }));
      } catch {}


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

  const canGenerate = uploadedImage && selectedGender && !isGenerating &&
    (useCustomText ? customOutfitText.trim().length > 0 : selectedStyle !== null);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 pb-10 relative z-0">
        <div className="max-w-6xl mx-auto px-4">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Создайте свой образ
            </h1>
            <p className="text-foreground/60">
              Загрузите фото и выберите стиль для генерации
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Левая колонка - Настройки */}
            <div className="space-y-6">
              {/* Загрузка фото */}
              <div className="glass-card rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-gold" strokeWidth={1.5} /> Ваше фото
                </h2>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                    ${uploadedImage
                      ? "border-gold/50 bg-gold/5"
                      : "border-foreground/20 hover:border-gold/50 hover:bg-muted hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]"
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
                          sessionStorage.removeItem("lastGeneration");
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      <Shirt className="w-10 h-10 text-gold/60 mx-auto mb-2" strokeWidth={1.5} />
                      <p className="text-foreground/70">Нажмите для загрузки фото</p>
                      <p className="text-foreground/40 text-sm mt-1">JPG, PNG до 10MB</p>
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

              {/* Выбор пола */}
              <div className="glass-card rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gold" strokeWidth={1.5} /> Пол
                </h2>
                <p className="text-foreground/60 text-sm mb-4">
                  Выберите пол для генерации образа
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedGender("MALE")}
                    className={`
                      p-4 rounded-xl border-2 transition-all text-center
                      ${selectedGender === "MALE"
                        ? "border-gold bg-gold/10"
                        : "border-foreground/20 hover:border-gold/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                      }
                    `}
                  >
                    <div className="text-2xl mb-2 text-gold">♂</div>
                    <div className="text-foreground text-sm font-medium">Мужской</div>
                  </button>
                  <button
                    onClick={() => setSelectedGender("FEMALE")}
                    className={`
                      p-4 rounded-xl border-2 transition-all text-center
                      ${selectedGender === "FEMALE"
                        ? "border-gold bg-gold/10"
                        : "border-foreground/20 hover:border-gold/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                      }
                    `}
                  >
                    <div className="text-2xl mb-2 text-gold">♀</div>
                    <div className="text-foreground text-sm font-medium">Женский</div>
                  </button>
                </div>
              </div>

              {/* Выбор стиля */}
              <div className={`glass-card rounded-xl p-6 transition-all duration-300 ${
                useCustomText
                  ? "opacity-50 pointer-events-none"
                  : "hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Gem className="w-5 h-5 text-gold" strokeWidth={1.5} /> Стиль
                  </h2>
                  <span className="text-foreground/40 text-xs">
                    {useCustomText ? "Используется своё описание" : `${styles.length} стилей доступно`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(showAllStyles ? styles : styles.slice(0, 6)).map((style) => {
                    const isPremiumLocked = style.isPremium && !isPremium;

                    // Проверка на соответствие пола
                    const isGenderMismatch = selectedGender && style.gender !== "universal" && style.gender !== selectedGender.toLowerCase();
                    const isLocked = isPremiumLocked || isGenderMismatch;

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
                              ? "border-foreground/10 bg-foreground/5 opacity-60 cursor-not-allowed"
                              : "border-foreground/20 hover:border-gold/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                          }
                        `}
                      >
                        <div className="mb-1">
                          {(() => { const Icon = styleIcons[style.id] || Shirt; return <Icon className="w-7 h-7 text-gold" strokeWidth={1.5} />; })()}
                        </div>
                        <div className="text-foreground text-sm font-medium">{style.name}</div>
                        <div className="text-foreground/40 text-xs mt-0.5">{style.description}</div>
                        {isPremiumLocked && (
                          <div className="absolute top-2 right-2 text-xs bg-gold/20 text-gold px-2 py-0.5 rounded">
                            Premium
                          </div>
                        )}
                        {isGenderMismatch && (
                          <div className="absolute top-2 right-2 text-xs bg-foreground/20 text-foreground/60 px-2 py-0.5 rounded">
                            {style.gender === "female" ? "♀" : "♂"}
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
                    className="w-full mt-4 py-2 text-foreground/60 hover:text-gold text-sm transition-colors flex items-center justify-center gap-2"
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

              {/* Пользовательское описание одежды */}
              <div className="glass-card rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-gold" strokeWidth={1.5} /> Описание одежды
                  </h2>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">Сам напишу</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={useCustomText}
                        onChange={(e) => {
                          setUseCustomText(e.target.checked);
                          if (e.target.checked) {
                            setSelectedStyle(null);
                          } else {
                            setCustomOutfitText("");
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-foreground/20 rounded-full peer-checked:bg-gold transition-all duration-300 peer-focus:ring-2 peer-focus:ring-gold/50"></div>
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-5 shadow-md"></div>
                    </div>
                  </label>
                </div>
                {useCustomText ? (
                  <div>
                    <textarea
                      value={customOutfitText}
                      onChange={(e) => setCustomOutfitText(e.target.value)}
                      placeholder="Опишите желаемую одежду, например: черная кожаная куртка, синие джинсы, белые кроссовки"
                      className="w-full p-4 bg-background border-2 border-foreground/20 rounded-xl text-foreground placeholder:text-foreground/40 focus:border-gold focus:outline-none transition-all resize-none"
                      rows={4}
                    />
                    <p className="text-foreground/60 text-xs mt-2">
                      💡 Опишите одежду на английском или русском языке. Будьте конкретны: укажите цвета, типы одежды и обуви.
                    </p>
                  </div>
                ) : (
                  <p className="text-foreground/60 text-sm">
                    Используйте готовые стили или включите "Сам напишу" для создания своего описания
                  </p>
                )}
              </div>

              {/* Выбор локации */}
              <div className="glass-card rounded-xl p-6 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-gold" strokeWidth={1.5} /> Локация
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
                              ? "border-foreground/10 bg-foreground/5 opacity-60 cursor-not-allowed"
                              : "border-foreground/20 hover:border-gold/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                          }
                        `}
                      >
                        <div className="mb-1">{(() => { const Icon = locationIcons[location.id] || Palette; return <Icon className="w-7 h-7 text-gold" strokeWidth={1.5} />; })()}</div>
                        <div className="text-foreground text-xs">{location.name}</div>
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

              {/* Информация о лимитах */}
              {limits && (
                <div className="mb-4">
                  {limits.limit === -1 ? (
                    <div className="flex items-center justify-center gap-2 text-gold text-sm">
                      <span>✨</span>
                      <span>Безлимитная генерация</span>
                    </div>
                  ) : limits.canGenerate ? (
                    <div className="flex items-center justify-center gap-2 text-foreground/60 text-sm">
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
                onClick={() => {
                  if (limits && !limits.canGenerate) {
                    setShowLimitModal(true);
                    return;
                  }
                  handleGenerate();
                }}
                disabled={!canGenerate && !(limits && !limits.canGenerate)}
                className={`
                  w-full py-4 rounded-xl font-semibold text-lg transition-all
                  ${limits && !limits.canGenerate
                    ? "bg-gold/80 hover:bg-gold text-black cursor-pointer"
                    : canGenerate
                      ? "bg-gold hover:bg-gold-600 text-black"
                      : "bg-foreground/10 text-foreground/40 cursor-not-allowed"
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
            <div className="glass-card rounded-xl p-6 h-fit lg:sticky lg:top-24 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold" strokeWidth={1.5} /> Результат
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="aspect-[3/4] bg-foreground/5 rounded-xl flex items-center justify-center overflow-hidden">
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
                  <div className="text-center px-4 w-full">
                    <Sparkles className="w-10 h-10 text-gold mx-auto mb-3 animate-pulse" strokeWidth={1.5} />
                    <p className="text-foreground/60 mb-4">Создаем ваш образ...</p>

                    {/* Прогресс-бар */}
                    <div className="w-full max-w-xs mx-auto mb-4">
                      <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-foreground/30 text-xs mt-1">{Math.round(progress)}%</p>
                    </div>

                    {/* Факт о моде */}
                    <div className="min-h-[60px] flex items-center justify-center">
                      <p className="text-gold/80 text-sm italic transition-opacity duration-500">
                        {currentFact}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center px-4">
                    <Gem className="w-10 h-10 text-gold/50 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-foreground/40">
                      {!uploadedImage
                        ? "Загрузите фото"
                        : !selectedStyle
                          ? "Выберите стиль"
                          : "Нажмите «Создать образ»"
                      }
                    </p>
                    {!uploadedImage && (
                      <p className="text-foreground/25 text-sm mt-2">
                        Используйте качественное фото с хорошим освещением — от этого зависит результат
                      </p>
                    )}
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
                      className="flex-1 py-3 glass-card hover:bg-muted text-foreground font-semibold rounded-lg transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5 text-gold" strokeWidth={1.5} /> Скачать
                    </button>
                    <button
                      onClick={handleSaveToGallery}
                      disabled={isSaved || isSaving}
                      className={`flex-1 py-3 rounded-lg transition-all duration-300 font-semibold flex items-center justify-center gap-2 ${
                        isSaved
                          ? "bg-green-500/20 text-green-400 border border-green-500/50 hover:shadow-[0_0_25px_rgba(34,197,94,0.25)]"
                          : "glass-card text-foreground hover:bg-muted hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)]"
                      }`}
                    >
                      {isSaving ? "Сохранение..." : isSaved ? <><Heart className="w-5 h-5 fill-green-400" strokeWidth={1.5} /> В избранном</> : <><Heart className="w-5 h-5 text-gold" strokeWidth={1.5} /> В избранное</>}
                    </button>
                  </div>

                  {/* Кнопка поиска на маркетплейсах */}
                  <button
                    onClick={handleMarketplaceSearch}
                    className="w-full py-3 glass-card hover:bg-muted text-foreground font-semibold rounded-lg transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-5 h-5 text-gold" strokeWidth={1.5} /> Найти на маркетплейсах
                  </button>

                  {/* Кнопка поделиться */}
                  <button
                    onClick={handleShare}
                    className="w-full py-3 glass-card hover:bg-muted text-foreground font-semibold rounded-lg transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_25px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-5 h-5 text-gold" strokeWidth={1.5} /> Поделиться
                  </button>

                  {isSaved && (
                    <button
                      onClick={() => router.push("/gallery")}
                      className="w-full py-2 text-foreground/60 hover:text-gold text-sm transition-colors"
                    >
                      Перейти в галерею →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Модальное окно "Лимит исчерпан" */}
        {showLimitModal && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowLimitModal(false)}
          >
            <div
              className="glass-card rounded-2xl p-6 max-w-md w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Кнопка закрыть */}
              <button
                onClick={() => setShowLimitModal(false)}
                className="absolute top-4 right-4 text-foreground/40 hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>

              {/* Заголовок */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-gold" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Хочется ещё?
                </h2>
                <p className="text-foreground/60 text-sm">
                  Бесплатные генерации закончились, но есть два способа продолжить
                </p>
              </div>

              {/* Блок реферала */}
              <div className="border border-gold/30 rounded-xl p-4 mb-4 bg-gold/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-5 h-5 text-gold" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold text-sm">Пригласи подругу — получи +2</h3>
                    <p className="text-foreground/50 text-xs">Вы обе получите по 2 генерации</p>
                  </div>
                </div>
                <p className="text-foreground/60 text-xs mb-3">
                  Отправь ссылку подруге или другу. Когда они зарегистрируются, вы оба получите бонусные генерации.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!referralCode) return;
                      const link = `${window.location.origin}/?ref=${referralCode}`;
                      await navigator.clipboard.writeText(link);
                      setReferralCopied(true);
                      setTimeout(() => setReferralCopied(false), 2000);
                    }}
                    className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                      referralCopied
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20"
                    }`}
                  >
                    {referralCopied ? (
                      <><Check className="w-4 h-4" strokeWidth={1.5} /> Скопировано</>
                    ) : (
                      <><Copy className="w-4 h-4" strokeWidth={1.5} /> Скопировать ссылку</>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (!referralCode) return;
                      const link = `${window.location.origin}/?ref=${referralCode}`;
                      if (navigator.share) {
                        navigator.share({
                          title: "LookLikeMe — AI Fashion",
                          text: "Создавай модные образы с AI! Регистрируйся по моей ссылке и получи +2 генерации:",
                          url: link,
                        }).catch(() => {});
                      } else {
                        const text = encodeURIComponent("Создавай модные образы с AI! Регистрируйся по моей ссылке: " + link);
                        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`, "_blank");
                      }
                    }}
                    className="py-2.5 px-4 rounded-lg bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-all"
                  >
                    <Share2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Разделитель */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-foreground/10" />
                <span className="text-foreground/30 text-xs">или</span>
                <div className="flex-1 h-px bg-foreground/10" />
              </div>

              {/* Блок тарифов */}
              <div className="border border-foreground/10 rounded-xl p-4 bg-foreground/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-gold" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold text-sm">Безлимитные генерации</h3>
                    <p className="text-foreground/50 text-xs">Все стили и локации</p>
                  </div>
                </div>
                <Link
                  href="/pricing"
                  className="block w-full py-2.5 bg-gold hover:bg-gold/90 text-black font-semibold rounded-lg transition-all text-center text-sm"
                >
                  Выбрать тариф
                </Link>
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
                    <span className="inline-flex items-center gap-1"><Sparkles className="w-4 h-4 inline" strokeWidth={1.5} /> Premium пользователи делятся образами без watermark</span>
                  </p>
                </div>
              )}

              {/* Кнопки соцсетей */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const text = encodeURIComponent("Создал(а) свой образ на looklike-me.ru ✨");
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
                    const text = encodeURIComponent("Создал(а) свой образ на looklike-me.ru ✨\n\nПопробуй сам: " + window.location.origin);
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
                    const text = encodeURIComponent("Создал(а) свой образ на looklike-me.ru ✨\n\nПопробуй сам: " + window.location.origin);
                    window.open(`https://wa.me/?text=${text}`, "_blank");
                  }}
                  className="w-full py-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.97.58 3.83 1.58 5.39L2 22l4.91-1.63c1.48.83 3.16 1.26 4.92 1.26 5.46 0 9.91-4.45 9.91-9.91C21.74 6.45 17.5 2 12.04 2zm5.8 13.96c-.24.67-1.4 1.24-1.92 1.29-.53.05-1.03.24-3.47-.73-2.96-1.18-4.86-4.18-5.01-4.37-.15-.19-1.19-1.59-1.19-3.04 0-1.44.76-2.16 1.03-2.45.27-.29.59-.36.79-.36.2 0 .4.01.57.01.18.01.43-.07.67.51.24.59.83 2.03.9 2.18.07.15.12.33.02.53-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.61.17.29.76 1.25 1.64 2.03 1.13.99 2.09 1.31 2.39 1.45.29.15.46.12.63-.07.17-.19.73-.85.92-1.15.19-.29.39-.24.65-.15.27.1 1.7.8 1.99.95.29.15.48.22.55.34.07.12.07.67-.17 1.34z"/>
                  </svg>
                  Поделиться в WhatsApp
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
