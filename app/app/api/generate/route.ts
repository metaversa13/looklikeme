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
// ВАЖНО: Промпты гендерно-нейтральные - AI определяет пол и выбирает соответствующую одежду
const stylePrompts: Record<string, string> = {
  // FREE стили (3 шт)
  "casual": "Change only the clothes to casual everyday style appropriate for this person's gender: comfortable jeans, simple t-shirt or casual top, sneakers or casual shoes, relaxed and effortless look",
  "business": "Change only the clothes to professional business attire appropriate for this person's gender: elegant tailored suit with blazer and dress pants for men OR tailored blazer with pants/pencil skirt for women, classic button-up shirt, polished corporate look with sophisticated accessories",
  "streetwear": "Change only the clothes to urban streetwear fashion: oversized hoodie or graphic tee, baggy cargo pants or joggers, chunky sneakers, modern street style with urban edge",

  // PREMIUM стили (17 шт)
  "romantic": "Change only the clothes to romantic style appropriate for this person's gender: soft flowing fabrics, delicate prints and patterns, pastel colors, elegant and dreamy aesthetic with gentle details",
  "athleisure": "Change only the clothes to sporty chic athletic wear: fitted athletic pants or leggings, stylish sports top or tank, lightweight athletic jacket, premium athleisure fashion that blends comfort and style",
  "elegant-evening": "Change only the clothes to elegant evening formal attire appropriate for this person's gender: for men - tuxedo or elegant suit with bow tie, for women - stunning evening gown or cocktail dress, luxurious fabrics like silk or satin, sophisticated formal look",
  "boho": "Change only the clothes to bohemian style: flowing loose layers, ethnic patterns and prints, fringe or embroidery details, natural fabrics, artistic free-spirited boho look with layered accessories",
  "minimalist": "Change only the clothes to minimalist fashion: clean simple lines, monochromatic neutral colors (black, white, gray, beige), high-quality basic pieces, understated elegance with no unnecessary details",
  "vintage-retro": "Change only the clothes to vintage 1950s style appropriate for this person's gender: for men - retro suit with high-waisted trousers and vintage shirt OR for women - classic A-line dress or high-waisted skirt, retro prints like polka dots or stripes, nostalgic vintage silhouette",
  "smart-casual": "Change only the clothes to smart casual style: blazer paired with dark jeans or chinos, nice shirt or blouse, loafers or ankle boots, polished yet relaxed business-casual look",
  "glamorous": "Change only the clothes to glamorous high fashion appropriate for this person's gender: luxurious designer clothing with sparkles and shine, metallic or sequined fabrics, statement pieces, red carpet worthy haute couture style",
  "preppy": "Change only the clothes to preppy collegiate style: chinos or pleated pants/skirt, cardigan or sweater vest over collared shirt, classic American prep school aesthetic with refined details",
  "edgy-rock": "Change only the clothes to edgy rock style: black leather jacket, ripped or distressed jeans, band t-shirt or graphic tee, studded belts or accessories, bold rebellious rocker aesthetic",
  "feminine": "Change only the clothes to ultra-feminine style appropriate for women: silk blouse or delicate top, flowing midi skirt or elegant dress, soft luxurious fabrics, romantic details like bows or ruffles, graceful elegant femininity",
  "avant-garde": "Change only the clothes to avant-garde fashion: experimental design with unconventional shapes, architectural silhouettes, bold artistic pieces, cutting-edge high-fashion with unique geometric forms",
  "resort-vacation": "Change only the clothes to resort vacation style: light linen clothing or flowy beach outfit, sun hat, comfortable sandals, breezy tropical aesthetic perfect for summer getaway",
  "monochrome": "Change only the clothes to monochrome fashion: entire outfit in one single color (black, white, gray, beige, or navy), different textures and shades of the same color, sophisticated tonal look",
  "layered": "Change only the clothes to layered style: multiple clothing layers like turtleneck under sweater or shirt, long coat or jacket over outfit, scarf and accessories, complex stylish layering with depth and dimension",
  "classic-timeless": "Change only the clothes to classic timeless fashion appropriate for this person's gender: for men - tailored trench coat with suit OR for women - little black dress or elegant coat, simple pieces that never go out of style, refined sophisticated look",
  "trendy-2026": "Change only the clothes to 2026 fashion trends appropriate for this person's gender: latest cutting-edge styles, modern trendy colors and cuts, contemporary fashion-forward pieces, current runway-inspired look",
};

// Промпты для локаций (для Kontext - инструкции по фону)
const locationPrompts: Record<string, string> = {
  "studio": "Set the background to a professional photo studio with clean neutral backdrop and perfect studio lighting.",
  "city-day": "Set the background to an urban city street during daytime with modern architecture and natural daylight.",
  "city-night": "Set the background to a city street at night with neon lights, evening atmosphere, cinematic mood.",
  "runway": "Set the background to a fashion runway catwalk with fashion show spotlights, editorial style setting.",
};

// Промпты для цветовых палитр
const palettePrompts: Record<string, string> = {
  "spring": "Use soft warm pastel colors: gentle pink, peach, light lavender, and pale yellow tones in the clothing.",
  "summer": "Use cool gentle colors: sky blue, soft coral, light gray, and lavender tones in the clothing.",
  "autumn": "Use warm deep colors: terracotta, olive, mustard, and chestnut brown tones in the clothing.",
  "winter": "Use cool bright colors: deep black, crisp white, navy blue, and burgundy red tones in the clothing.",
};

// Premium функции (требуют подписку)
const premiumStyles = [
  "romantic", "athleisure", "elegant-evening", "boho", "minimalist",
  "vintage-retro", "smart-casual", "glamorous", "preppy", "edgy-rock",
  "feminine", "avant-garde", "resort-vacation", "monochrome", "layered",
  "classic-timeless", "trendy-2026"
];
const premiumLocations = ["city-day", "city-night", "runway"];
const premiumPalettes = ["spring", "summer", "autumn", "winter"];

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
    // Структура: Действие + Цвет (если выбран) + Контекст + Сохранение идентичности
    const fullPrompt = `${stylePrompt} ${palettePrompt} ${locationPrompt} ${preservationPrompt} High quality fashion photography, professional lighting, sharp focus, photorealistic.`;

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
