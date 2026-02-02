import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import Replicate from "replicate";
import sharp from "sharp";
import { uploadImage } from "@/lib/storage";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Лимиты генераций в месяц
const MONTHLY_LIMITS: Record<string, number> = {
  FREE: 5,
  BASE: 50,
  PREMIUM: 100,
  LIFETIME: 200,
};

// Промпты для стилей (Kontext — editing instructions, NOT descriptions)
// Kontext видит фото и нужны только инструкции ЧТО МЕНЯТЬ
// Макс ~512 токенов, поэтому промпты должны быть компактными
// Гендер определяется автоматически — "If male/female" коротко

const stylePrompts: Record<string, string> = {
  // FREE стили (3 шт)
  "casual": "Change the clothes to casual everyday outfit. If male: light blue slim-fit jeans, white crewneck cotton t-shirt, white sneakers. If female: light blue slim-fit jeans, white crewneck cotton t-shirt, white sneakers.",

  "business": "Change the clothes to professional business attire. If male: charcoal slim-fit suit, white dress shirt, black leather loafers. If female: charcoal slim-fit suit, white dress shirt, black leather loafers.",

  "sport": "Change the clothes to athletic sporty outfit. If male: black athletic leggings, fitted white tank top, white running shoes. If female: black athletic leggings, fitted white tank top, white running shoes.",

  // PREMIUM стили (17 шт)
  "street": "Change the clothes to urban streetwear. If male: oversize black hoodie, baggy cargo pants, chunky white sneakers. If female: oversize black hoodie, baggy cargo pants, chunky white sneakers.",

  "romantic": "Change the clothes to romantic style. If male: dusty-rose linen shirt, cream chinos, tan suede loafers. If female: flowy midi floral dress, nude high heels, thin gold necklace.",

  "minimalism": "Change the clothes to minimalist fashion. If male: cream cashmere sweater, wide-leg white trousers, nude loafers. If female: cream cashmere sweater, wide-leg white trousers, nude loafers.",

  "boho": "Change the clothes to bohemian style. If male: embroidered linen shirt, loose pants, leather sandals, layered necklaces. If female: embroidered maxi dress, leather sandals, layered necklaces.",

  "grunge": "Change the clothes to grunge style. If male: ripped black skinny jeans, plaid flannel shirt, combat boots. If female: ripped black skinny jeans, plaid flannel shirt, combat boots.",

  "preppy": "Change the clothes to preppy collegiate style. If male: navy blazer, white button-up shirt, khaki chinos, boat shoes. If female: navy blazer, white button-up shirt, khaki chinos, boat shoes.",

  "disco": "Change the clothes to disco party style. If male: shiny silver shirt, high-waisted black disco pants, platform shoes. If female: shiny silver halter top, high-waisted black disco pants, platform heels.",

  "ladylike": "Change the clothes to elegant ladylike style. Tailored red sheath dress, pearl earrings, nude pumps.",

  "scandinavian": "Change the clothes to Scandinavian style. If male: light blue linen shirt, beige wide-leg pants, leather sandals. If female: light blue linen shirt, beige wide-leg pants, leather sandals.",

  "gaucho": "Change the clothes to gaucho western style. If male: white linen shirt, wide leather belt, gaucho pants, cowboy boots. If female: sheer white blouse, wide leather belt, gaucho pants, cowboy boots.",

  "urban-chic": "Change the clothes to urban chic style. If male: leather blazer, black silk shirt, skinny jeans, ankle boots. If female: leather blazer, black silk camisole, skinny jeans, ankle boots.",

  "evening-elegant": "Change the clothes to elegant evening formal wear. If male: black tuxedo, white shirt, black bow tie, patent Oxford shoes. If female: black silk floor-length gown, diamond drop earrings, strappy heels.",

  "glamour": "Change the clothes to glamorous high fashion. If male: midnight-blue velvet dinner jacket, black pants, white shirt. If female: sequined emerald green cocktail dress, chandelier earrings, clutch.",

  "rock": "Change the clothes to rock style. If male: black leather jacket, band tee, ripped jeans, studded boots. If female: black leather jacket, band tee, ripped jeans, studded boots.",

  "resort": "Change the clothes to resort vacation style. If male: white linen shirt, beige shorts, raffia sandals, straw hat. If female: white linen shirt dress, straw hat, raffia sandals.",

  "vintage-50s": "Change the clothes to 1950s vintage style. If male: charcoal pleated trousers, white shirt, burgundy knit vest, suspenders, brown wingtips. If female: red polka dot swing dress, petticoat, kitten heels.",

  "trends-2026": "Change the clothes to cutting-edge 2026 fashion. If male: sheer metallic shirt, sculpted trousers, sculptural shoes. If female: sheer metallic blouse, sculpted trousers, sculptural heels.",
};

// Промпты для локаций — короткие, императивные
// Ключ: "Change the background to X while keeping the person in the exact same position, scale, and pose"
const locationPrompts: Record<string, string> = {
  "studio": "Change the background to a plain light gray seamless studio backdrop with soft professional lighting.",
  "city-day": "Change the background to a modern city street in bright daylight with skyscrapers and golden sunlight, blurred cityscape.",
  "city-night": "Change the background to a city street at night with neon signs, street lights, wet asphalt reflections, cinematic bokeh.",
  "runway": "Change the background to a fashion show runway with white catwalk floor, dramatic spotlights, blurred audience in darkness.",
  "beach": "Change the background to a tropical beach at golden hour with turquoise ocean, golden sand, palm trees.",
  "cafe": "Change the background to an elegant Parisian cafe interior with warm Edison lighting, marble table, large window.",
  "nature": "Change the background to a lush green park with tall trees, dappled sunlight through leaves, golden-hour lighting.",
  "loft": "Change the background to an industrial loft with exposed brick walls, large steel-frame windows, polished concrete floor.",
};

// Промпты для цветовых палитр — встраиваются в одежду
const palettePrompts: Record<string, string> = {
  "spring": "Use ONLY these clothing colors: soft blush pink, warm peach, light lavender, pale yellow.",
  "summer": "Use ONLY these clothing colors: sky blue, soft rose pink, light gray, cool lavender.",
  "autumn": "Use ONLY these clothing colors: burnt terracotta, chocolate brown, mustard yellow, chestnut.",
  "winter": "Use ONLY these clothing colors: jet black, crisp white, navy blue, crimson red.",
  "classic-neutrals": "Use ONLY these clothing colors: warm beige, soft cream, taupe, charcoal gray.",
  "nature-earth": "Use ONLY these clothing colors: brown, olive green, terracotta, khaki.",
  "soft-pastels": "Use ONLY these clothing colors: baby pink, lavender, powder blue, peach.",
  "rich-bold": "Use ONLY these clothing colors: burgundy, navy blue, dark slate, black.",
};

// Premium функции (требуют подписку)
const premiumStyles = [
  "romantic", "minimalism", "boho", "grunge",
  "preppy", "disco", "ladylike", "scandinavian", "gaucho",
  "urban-chic", "evening-elegant", "glamour", "rock", "resort",
  "vintage-50s", "trends-2026"
];
const premiumLocations = ["city-night", "runway", "beach", "cafe", "nature", "loft"];
const premiumPalettes = ["spring", "summer", "autumn", "winter", "nature-earth", "soft-pastels", "rich-bold"];

// Preservation — короткий, Kontext хорошо сохраняет лицо сам
const preservationPrompt = "Keep the person's face, expression, hairstyle, and skin tone exactly the same.";

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
      select: { subscriptionType: true, bonusGenerations: true },
    });

    const subscriptionType = user?.subscriptionType || "FREE";
    const bonusGenerations = user?.bonusGenerations || 0;
    const monthlyLimit = MONTHLY_LIMITS[subscriptionType] + bonusGenerations;

    // Проверяем месячный лимит генераций
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyUsage = await prisma.dailyLimit.aggregate({
      where: {
        userId: session.user.id,
        date: { gte: monthStart },
      },
      _sum: { generationsCount: true },
    });

    const used = monthlyUsage._sum.generationsCount || 0;

    if (used >= monthlyLimit) {
      return NextResponse.json(
        {
          error: "Monthly limit reached",
          message: `Вы исчерпали месячный лимит (${monthlyLimit} генераций). ${subscriptionType === "FREE" ? "Оформите подписку Base или Premium для увеличения лимита." : subscriptionType === "BASE" ? "Перейдите на Premium для 100 генераций в месяц." : "Лимит обновится в следующем месяце."}`,
          limit: monthlyLimit,
          used,
        },
        { status: 429 }
      );
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

    // Собираем промпт по трёхслойной структуре BFL:
    // 1. ACTION: что менять (одежда + палитра + фон)
    // 2. CONTEXT: позиция/поза/ракурс
    // 3. PRESERVATION: что сохранить
    const stylePrompt = stylePrompts[style] || stylePrompts["casual"];
    const locationPrompt = locationPrompts[location] || locationPrompts["studio"];
    const palettePrompt = palette && palettePrompts[palette] ? palettePrompts[palette] : "";

    // Layer 1: ACTION — одежда
    let fullPrompt = stylePrompt;

    // Палитра — уточнение цветов одежды
    if (palettePrompt) {
      fullPrompt += " " + palettePrompt;
    }

    // Фон — отдельная явная инструкция
    fullPrompt += " " + locationPrompt;

    // Layer 2: CONTEXT — сохранить позицию
    fullPrompt += " Keep the person in the exact same position, scale, and pose.";

    // Layer 3: PRESERVATION — лицо
    fullPrompt += " " + preservationPrompt;

    // Финал — стиль фото
    fullPrompt += " Full body shot, fashion editorial photography, photorealistic.";

    console.log("Prompt:", fullPrompt);

    // Flux Kontext Pro - редактирование с сохранением лица ($0.04/image)
    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      {
        input: {
          prompt: fullPrompt,
          input_image: image,
          aspect_ratio: "3:4",
          output_format: "jpg",
          safety_tolerance: 2,
          prompt_upsampling: false, // ОТКЛЮЧЕНО — наши промпты детальные, перефразирование ломает мульти-step инструкции
        },
      }
    );

    console.log("Generation complete!");
    console.log("Output:", output);

    // Kontext возвращает URL напрямую или в массиве
    const replicateUrl = Array.isArray(output) ? output[0] : output;

    // Скачиваем изображение с Replicate (временный URL, истекает через ~1 час)
    const imgResponse = await fetch(String(replicateUrl));
    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());

    // Загружаем в Yandex Object Storage для постоянного хранения
    const imageKey = `generations/${session.user.id}/${Date.now()}.jpg`;
    let resultUrl: string;
    try {
      resultUrl = await uploadImage(imgBuffer, imageKey);
      console.log("Image uploaded to S3:", resultUrl);
    } catch (s3Error) {
      console.error("S3 upload error, falling back to base64:", s3Error);
      // Fallback: сохраняем как base64 если S3 недоступен
      resultUrl = `data:image/jpeg;base64,${imgBuffer.toString("base64")}`;
    }

    // Водяной знак для FREE пользователей
    if (subscriptionType === "FREE") {
      try {
        const metadata = await sharp(imgBuffer).metadata();
        const width = metadata.width || 768;
        const height = metadata.height || 1024;
        const fontSize = Math.round(width * 0.04);

        const svgWatermark = `
          <svg width="${width}" height="${height}">
            <text
              x="${width / 2}" y="${height - fontSize * 1.5}"
              text-anchor="middle"
              font-family="Arial, sans-serif"
              font-size="${fontSize}"
              font-weight="bold"
              fill="white"
              opacity="0.5"
            >Looklike-me.ru</text>
          </svg>`;

        const watermarked = await sharp(imgBuffer)
          .composite([{ input: Buffer.from(svgWatermark), top: 0, left: 0 }])
          .jpeg({ quality: 90 })
          .toBuffer();

        // Водяной знак загружаем отдельным файлом
        const wmKey = `generations/${session.user.id}/${Date.now()}_wm.jpg`;
        try {
          resultUrl = await uploadImage(watermarked, wmKey);
        } catch {
          resultUrl = `data:image/jpeg;base64,${watermarked.toString("base64")}`;
        }
        console.log("Watermark applied for FREE user");
      } catch (wmError) {
        console.error("Watermark error:", wmError);
      }
    }

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
