import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Лимиты генераций в день
const DAILY_LIMITS = {
  FREE: 5,
  PREMIUM: -1, // безлимит
  LIFETIME: -1, // безлимит
};

// Промпты для стилей (для Kontext - инструкции по редактированию)
// ВАЖНО: Промпты учитывают гендер - AI должен определить пол человека и выбрать соответствующую одежду
// КРИТИЧНО: Никогда не одевать мужчин в женскую одежду (платья, юбки, блузки) и наоборот

// Префикс для определения гендера (добавляется ко всем промптам)
const genderDetectionPrefix = "FIRST: Look at this person carefully and determine if they are male or female. THEN: ";

const stylePrompts: Record<string, string> = {
  // FREE стили (3 шт) - универсальные
  "casual": "Change only the clothes to casual everyday style. If this person is MALE: comfortable jeans, simple t-shirt or polo shirt, casual sneakers. If this person is FEMALE: comfortable jeans or casual pants, simple t-shirt or casual top, sneakers or flats. Relaxed and effortless unisex look.",

  "business": "Change only the clothes to professional business attire. If this person is MALE: tailored business suit with blazer, dress pants, dress shirt with tie, polished leather shoes, sophisticated masculine corporate look. If this person is FEMALE: tailored blazer with dress pants OR pencil skirt, professional blouse or button-up shirt, closed-toe heels or flats, sophisticated feminine corporate look.",

  "streetwear": "Change only the clothes to urban streetwear fashion. If this person is MALE: oversized hoodie or graphic tee, baggy cargo pants or joggers, chunky sneakers. If this person is FEMALE: oversized hoodie or fitted streetwear top, cargo pants or joggers, chunky sneakers. Modern unisex street style with urban edge.",

  // PREMIUM стили (17 шт)
  "romantic": "Change only the clothes to romantic style. If this person is MALE: soft casual shirt with gentle patterns, comfortable chinos, subtle romantic colors. If this person is FEMALE: soft flowing fabrics, delicate blouse or dress with prints, pastel colors, elegant dreamy aesthetic with gentle details.",

  "athleisure": "Change only the clothes to sporty athletic wear. If this person is MALE: fitted athletic pants or joggers, sports t-shirt or tank, athletic jacket, masculine sporty look. If this person is FEMALE: fitted athletic leggings or pants, stylish sports tank or top, lightweight athletic jacket, feminine sporty chic look. Premium athleisure that blends comfort and style.",

  "elegant-evening": "Change only the clothes to elegant evening formal attire. If this person is MALE: black tuxedo or elegant dark suit with bow tie or formal tie, dress shirt, polished dress shoes, sophisticated masculine formal look. If this person is FEMALE: stunning evening gown or elegant cocktail dress, luxurious fabrics like silk or satin, sophisticated feminine formal look.",

  "boho": "Change only the clothes to bohemian style. If this person is MALE: loose linen shirt, comfortable pants with ethnic patterns, natural fabrics, masculine boho look. If this person is FEMALE: flowing layers, ethnic prints, maxi skirt or flowy dress, fringe details, feminine artistic free-spirited boho look with layered accessories.",

  "minimalist": "Change only the clothes to minimalist fashion: clean simple lines, monochromatic neutral colors (black, white, gray, beige), high-quality basic pieces, understated elegance. Simple unisex style with no unnecessary details.",

  "vintage-retro": "Change only the clothes to vintage 1950s style. If this person is MALE: retro suit with high-waisted trousers, vintage dress shirt, classic tie, retro prints, nostalgic masculine vintage look. If this person is FEMALE: classic A-line dress or high-waisted skirt with vintage blouse, retro prints like polka dots or stripes, nostalgic feminine vintage silhouette.",

  "smart-casual": "Change only the clothes to smart casual style. If this person is MALE: blazer or sport coat with dark jeans or chinos, nice button-up shirt, loafers. If this person is FEMALE: blazer with jeans or dress pants, nice blouse, ankle boots or loafers. Polished yet relaxed business-casual look.",

  "glamorous": "Change only the clothes to glamorous high fashion. If this person is MALE: luxurious designer suit with metallic accents, statement pieces, masculine haute couture style. If this person is FEMALE: luxurious designer dress or outfit with sparkles, sequined or metallic fabrics, statement pieces, feminine red carpet worthy haute couture style.",

  "preppy": "Change only the clothes to preppy collegiate style. If this person is MALE: chinos or khaki pants, cardigan or sweater vest over collared shirt, boat shoes or loafers, masculine prep school aesthetic. If this person is FEMALE: pleated skirt or chinos, cardigan over collared blouse, feminine classic American prep school aesthetic with refined details.",

  "edgy-rock": "Change only the clothes to edgy rock style: black leather jacket, ripped or distressed jeans, band t-shirt or graphic tee, studded belts or accessories. Bold rebellious unisex rocker aesthetic.",

  "feminine": "ONLY FOR WOMEN - Change only the clothes to ultra-feminine style: silk blouse or delicate top, flowing midi skirt or elegant dress, soft luxurious fabrics, romantic details like bows or ruffles, graceful elegant femininity. If the person is male, DO NOT apply this style - show an error instead.",

  "avant-garde": "Change only the clothes to avant-garde fashion: experimental design with unconventional shapes, architectural silhouettes, bold artistic pieces, cutting-edge high-fashion with unique geometric forms. Unisex avant-garde style.",

  "resort-vacation": "Change only the clothes to resort vacation style. If this person is MALE: light linen shirt, shorts or linen pants, comfortable sandals, masculine breezy tropical look. If this person is FEMALE: flowy beach dress or light resort outfit, sun hat, comfortable sandals, feminine breezy tropical aesthetic perfect for summer getaway.",

  "monochrome": "Change only the clothes to monochrome fashion: entire outfit in one single color (black, white, gray, beige, or navy), different textures and shades of the same color, sophisticated tonal look. Unisex monochrome style.",

  "layered": "Change only the clothes to layered style: multiple clothing layers like turtleneck under sweater or button-up shirt, long coat or jacket over outfit, scarf and accessories. Complex stylish layering with depth and dimension. Unisex layered style.",

  "classic-timeless": "Change only the clothes to classic timeless fashion. If this person is MALE: tailored trench coat with suit, dress shirt, classic tie, polished masculine look. If this person is FEMALE: little black dress OR elegant coat with dress pants, simple pieces that never go out of style, refined feminine sophisticated look.",

  "trendy-2026": "Change only the clothes to 2026 fashion trends. If this person is MALE: latest men's cutting-edge styles, modern trendy colors and cuts, contemporary masculine fashion-forward pieces. If this person is FEMALE: latest women's cutting-edge styles, modern trendy colors and cuts, contemporary feminine fashion-forward pieces. Current runway-inspired look.",
};

// Промпты для локаций (для Kontext - инструкции по фону)
// КРИТИЧНО: Промпты должны быть императивными и явными
const locationPrompts: Record<string, string> = {
  "studio": "BACKGROUND MUST BE: Professional photo studio with clean neutral solid color backdrop, seamless white or gray background, studio lighting setup, minimalist clean setting.",
  "city-day": "BACKGROUND MUST BE: Urban city street in bright daytime, modern architecture buildings, sunny weather with natural daylight, metropolitan street scene, contemporary cityscape.",
  "city-night": "BACKGROUND MUST BE: City street at nighttime, glowing neon signs and street lights, evening urban atmosphere, illuminated buildings, cinematic night cityscape with bokeh lights.",
  "runway": "BACKGROUND MUST BE: Fashion runway catwalk stage, professional spotlights, fashion show setting, dramatic runway lighting, haute couture presentation atmosphere.",
  "beach": "BACKGROUND MUST BE: Sunny beach with ocean waves, golden sand, clear blue sky, tropical seaside setting, natural beach environment with water in background.",
  "cafe": "BACKGROUND MUST BE: Stylish modern cafe interior, cozy coffee shop setting, elegant restaurant ambiance, chic bistro environment with soft ambient lighting.",
  "nature": "BACKGROUND MUST BE: Beautiful natural outdoor setting, green park or forest scenery, natural landscape with trees and foliage, outdoor nature environment.",
  "loft": "BACKGROUND MUST BE: Industrial loft space with exposed brick walls, urban industrial setting, raw concrete textures, modern warehouse aesthetic with industrial elements.",
};

// Промпты для цветовых палитр
// КРИТИЧНО: Палитры должны явно указывать точные цвета для одежды
const palettePrompts: Record<string, string> = {
  // Сезонные палитры (4 шт)
  "spring": "CLOTHING COLORS MUST BE: Soft warm pastel spring colors - gentle pink, peach, light lavender, pale yellow. Use ONLY these soft spring pastel colors for all clothing items.",
  "summer": "CLOTHING COLORS MUST BE: Cool soft summer shades - sky blue, soft pink, light gray, lavender. Use ONLY these cool soft summer colors for all clothing items.",
  "autumn": "CLOTHING COLORS MUST BE: Warm deep autumn colors - terracotta orange, chocolate brown, mustard yellow, chestnut brown. Use ONLY these warm autumn earth tones for all clothing items.",
  "winter": "CLOTHING COLORS MUST BE: Cool bright winter tones - black, white, navy blue, crimson red. Use ONLY these cool bright winter colors for all clothing items.",

  // Стилистические палитры (4 шт)
  "classic-neutrals": "CLOTHING COLORS MUST BE: Elegant neutral tones - beige, cream, taupe brown, and charcoal black. Use ONLY these sophisticated neutral colors for all clothing items.",
  "nature-earth": "CLOTHING COLORS MUST BE: Natural earthy tones - brown, olive green, terracotta, and khaki. Use ONLY these natural earth colors for all clothing items.",
  "soft-pastels": "CLOTHING COLORS MUST BE: Soft romantic pastel shades - baby pink, lavender purple, light blue, and peach. Use ONLY these gentle pastel colors for all clothing items.",
  "rich-bold": "CLOTHING COLORS MUST BE: Deep rich bold tones - burgundy wine red, navy blue, dark slate gray, and black. Use ONLY these saturated bold colors for all clothing items.",
};

// Premium функции (требуют подписку)
const premiumStyles = [
  "romantic", "athleisure", "elegant-evening", "boho", "minimalist",
  "vintage-retro", "smart-casual", "glamorous", "preppy", "edgy-rock",
  "feminine", "avant-garde", "resort-vacation", "monochrome", "layered",
  "classic-timeless", "trendy-2026"
];
const premiumLocations = ["city-day", "city-night", "runway", "beach", "cafe", "nature", "loft"];
const premiumPalettes = ["spring", "summer", "autumn", "winter", "classic-neutrals", "nature-earth", "soft-pastels", "rich-bold"];

// Инструкции по сохранению идентичности
const preservationPrompt = `
IMPORTANT: Preserve the exact same face of this person - keep identical facial features, face shape, eye color, eye shape, nose, lips, skin tone, and facial expression.
Maintain the same hairstyle and hair color. Keep the person in the same pose and position.
Only change the clothing and background as instructed above.
`.trim();

export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем данные пользователя
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionType: true },
    });

    const subscriptionType = user?.subscriptionType || "FREE";
    const dailyLimit = DAILY_LIMITS[subscriptionType];

    // Проверяем лимит для FREE пользователей
    if (dailyLimit !== -1) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyUsage = await prisma.dailyLimit.findUnique({
        where: {
          userId_date: {
            userId: session.user.id,
            date: today,
          },
        },
      });

      const used = dailyUsage?.generationsCount || 0;

      if (used >= dailyLimit) {
        return NextResponse.json(
          {
            error: "Daily limit reached",
            message: `Вы исчерпали дневной лимит (${dailyLimit} генераций). Обновитесь до Premium для безлимитного доступа.`,
            limit: dailyLimit,
            used,
          },
          { status: 429 }
        );
      }
    }

    const body = await request.json();
    const { image, style, location, palette } = body;

    if (!image || !style) {
      return NextResponse.json(
        { error: "Image and style are required" },
        { status: 400 }
      );
    }

    // Проверяем доступ к premium функциям
    const isPremium = subscriptionType !== "FREE";

    if (!isPremium) {
      // Проверяем стиль
      if (premiumStyles.includes(style)) {
        return NextResponse.json(
          {
            error: "Premium feature",
            message: `Стиль "${style}" доступен только для Premium подписки`,
          },
          { status: 403 }
        );
      }

      // Проверяем локацию
      if (location && premiumLocations.includes(location)) {
        return NextResponse.json(
          {
            error: "Premium feature",
            message: `Локация "${location}" доступна только для Premium подписки`,
          },
          { status: 403 }
        );
      }

      // Проверяем палитру
      if (palette && premiumPalettes.includes(palette)) {
        return NextResponse.json(
          {
            error: "Premium feature",
            message: `Цветовая палитра "${palette}" доступна только для Premium подписки`,
          },
          { status: 403 }
        );
      }
    }

    // Проверяем API токен
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("REPLICATE_API_TOKEN is not set!");
      return NextResponse.json(
        { error: "API configuration error" },
        { status: 500 }
      );
    }

    console.log("Starting generation with Flux Kontext Pro...");
    console.log("Image size:", Math.round(image.length / 1024), "KB");

    // Собираем промпт-инструкцию для Kontext
    const stylePrompt = stylePrompts[style] || stylePrompts["casual"];
    const locationPrompt = locationPrompts[location] || locationPrompts["studio"];
    const palettePrompt = palette && palettePrompts[palette] ? palettePrompts[palette] : "";

    // Kontext работает с инструкциями по редактированию
    // Структура: Определение гендера + Действие + Цвет (если выбран) + Контекст + Сохранение идентичности
    const fullPrompt = `${genderDetectionPrefix}${stylePrompt} ${palettePrompt} ${locationPrompt} ${preservationPrompt} High quality fashion photography, professional lighting, sharp focus, photorealistic.`;

    console.log("Prompt:", fullPrompt);

    // Flux Kontext Pro - редактирование с сохранением лица ($0.04/image)
    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      {
        input: {
          prompt: fullPrompt,
          input_image: image, // Передаём base64 изображение пользователя
          aspect_ratio: "3:4",
          output_format: "jpg",
          safety_tolerance: 2,
          prompt_upsampling: true, // Автоулучшение промпта
        },
      }
    );

    console.log("Generation complete!");
    console.log("Output:", output);

    // Kontext возвращает URL напрямую или в массиве
    const resultUrl = Array.isArray(output) ? output[0] : output;

    // Обновляем счетчики пользователя
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.$transaction([
      // Увеличиваем общий счетчик генераций
      prisma.user.update({
        where: { id: session.user.id },
        data: { totalGenerations: { increment: 1 } },
      }),
      // Увеличиваем дневной лимит
      prisma.dailyLimit.upsert({
        where: {
          userId_date: {
            userId: session.user.id,
            date: today,
          },
        },
        create: {
          userId: session.user.id,
          date: today,
          generationsCount: 1,
        },
        update: {
          generationsCount: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      imageUrl: resultUrl,
      prompt: fullPrompt,
    });
  } catch (error: unknown) {
    console.error("=== GENERATION ERROR ===");
    console.error("Error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: "Generation failed",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
