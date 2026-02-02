import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import Replicate from "replicate";

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

// Промпты для стилей (для Kontext - инструкции по редактированию)
// ВАЖНО: Каждый промпт описывает ПОЛНЫЙ образ от головы до обуви
// КРИТИЧНО: Никогда не одевать мужчин в женскую одежду и наоборот

// Префикс для определения гендера
const genderDetectionPrefix = "FIRST: Carefully identify if this person is male or female based on their face and body. THEN follow the instructions below EXACTLY: ";

const stylePrompts: Record<string, string> = {
  // FREE стили (3 шт)
  "casual": "COMPLETELY REPLACE all clothing on this person with casual everyday outfit. Show FULL BODY from head to feet. If MALE: fitted medium-blue denim jeans, plain white cotton crew-neck t-shirt, gray zip-up hoodie worn open, white leather low-top sneakers with white laces, silver wristwatch. If FEMALE: high-waisted light-wash straight-leg jeans, fitted beige ribbed tank top, oversized cream knit cardigan draped open, white canvas sneakers, small gold hoop earrings. Relaxed effortless everyday look.",

  "business": "COMPLETELY REPLACE all clothing on this person with professional business attire. Show FULL BODY from head to feet. If MALE: charcoal gray two-piece wool suit with notch-lapel blazer buttoned, white crisp cotton dress shirt, navy silk tie with subtle pattern, black polished Oxford leather shoes, silver cufflinks, leather belt. If FEMALE: tailored navy blazer with single button, white silk blouse tucked in, charcoal pencil skirt to the knee OR tailored dress pants, nude pointed-toe pumps with 3-inch heel, pearl stud earrings, leather structured handbag. Sophisticated corporate look.",

  "streetwear": "COMPLETELY REPLACE all clothing on this person with urban streetwear fashion. Show FULL BODY from head to feet. If MALE: oversized black graphic hoodie with bold print, wide-leg khaki cargo pants with side pockets, chunky white-and-gray Nike Air Max sneakers, black baseball cap worn backwards, silver chain necklace. If FEMALE: oversized cropped gray hoodie, high-waisted black cargo joggers with drawstring, chunky white platform sneakers, small crossbody bag, layered silver chain necklaces. Modern street style with urban edge.",

  // PREMIUM стили (17 шт)
  "romantic": "COMPLETELY REPLACE all clothing on this person with romantic style outfit. Show FULL BODY from head to feet. If MALE: soft dusty-rose linen button-up shirt with sleeves rolled to elbows, cream chinos with slim fit, tan suede loafers, brown leather braided bracelet. If FEMALE: flowing midi dress in soft blush pink with delicate floral print, sweetheart neckline, puff sleeves, nude strappy low-heel sandals, dainty gold pendant necklace, small pearl earrings. Dreamy romantic aesthetic.",

  "athleisure": "COMPLETELY REPLACE all clothing on this person with premium athletic wear. Show FULL BODY from head to feet. If MALE: fitted black jogger pants with tapered ankles, dark gray performance compression t-shirt, lightweight black zip-up track jacket, black-and-white running sneakers with visible cushioning, sport smartwatch. If FEMALE: high-waisted charcoal compression leggings, fitted white sports crop top with mesh panels, lightweight lavender zip-up athletic jacket, white-and-pink running sneakers, hair tied in sleek ponytail, fitness tracker on wrist. Premium athleisure blending comfort and style.",

  "elegant-evening": "COMPLETELY REPLACE all clothing on this person with elegant evening formal attire. Show FULL BODY from head to feet. If MALE: black wool tuxedo with satin peak lapels, crisp white tuxedo dress shirt with French cuffs, black silk bow tie, black patent leather Oxford shoes, silver cufflinks, white pocket square. If FEMALE: floor-length black silk evening gown with thin spaghetti straps, subtle side slit, delicate diamond pendant necklace, crystal drop earrings, black strappy high-heel sandals with rhinestone detail, small satin clutch purse. Red carpet sophistication.",

  "boho": "COMPLETELY REPLACE all clothing on this person with bohemian style. Show FULL BODY from head to feet. If MALE: loose cream linen shirt with wooden buttons half-open, olive-green relaxed-fit cotton pants, brown leather sandals, woven leather bracelet, wooden bead necklace. If FEMALE: flowing tiered maxi skirt in earthy terracotta with ethnic print, cream crochet crop top, long fringed kimono cardigan in mustard, brown leather gladiator sandals lacing up the ankle, layered gold boho necklaces, oversized round sunglasses. Free-spirited artistic boho.",

  "minimalist": "COMPLETELY REPLACE all clothing on this person with minimalist fashion. Show FULL BODY from head to feet. If MALE: black slim-fit cotton trousers, plain white heavyweight cotton t-shirt with perfect fit, light gray unstructured linen blazer, white clean leather minimal sneakers, simple black leather watch. If FEMALE: wide-leg cream tailored trousers, black fitted ribbed turtleneck top, camel wool oversized coat draped over shoulders, white pointed-toe leather mules, single thin gold bangle bracelet. Clean lines, no logos, understated luxury.",

  "vintage-retro": "COMPLETELY REPLACE all clothing on this person with 1950s vintage style. Show FULL BODY from head to feet. If MALE: high-waisted charcoal pleated trousers with cuffs, white fitted dress shirt, burgundy knit vest, dark suspenders, polished brown wingtip Oxford shoes, vintage gold wristwatch. If FEMALE: fitted red polka-dot A-line dress with full skirt to below the knee, white Peter Pan collar, cinched waist with matching belt, red closed-toe kitten heels, pearl necklace, red lipstick. Nostalgic retro silhouette.",

  "smart-casual": "COMPLETELY REPLACE all clothing on this person with smart-casual outfit. Show FULL BODY from head to feet. If MALE: navy textured blazer unstructured, light blue Oxford button-down shirt untucked, dark indigo slim jeans, tan suede desert boots, brown leather belt, no tie. If FEMALE: camel structured blazer, white silk camisole underneath, dark wash straight-leg jeans, pointed-toe black leather ankle boots with low heel, gold chain necklace, structured leather tote bag. Polished yet relaxed.",

  "glamorous": "COMPLETELY REPLACE all clothing on this person with glamorous high fashion. Show FULL BODY from head to feet. If MALE: midnight-blue velvet dinner jacket with black satin lapels, black fitted dress pants, white dress shirt with jeweled cufflinks, black velvet loafers with gold embroidery, gold wristwatch with black dial. If FEMALE: form-fitting gold sequined cocktail dress above the knee, dramatic statement crystal chandelier earrings, gold metallic strappy stiletto heels, small crystal-embellished clutch, bold smoky eye makeup. Red carpet glamour.",

  "preppy": "COMPLETELY REPLACE all clothing on this person with preppy collegiate style. Show FULL BODY from head to feet. If MALE: khaki chino pants with belt, navy-and-green striped rugby polo shirt, cream cable-knit V-neck sweater layered over collared shirt, brown leather penny loafers worn without socks, brown leather belt with brass buckle. If FEMALE: navy pleated mini skirt, white fitted button-down Oxford shirt, forest-green cable-knit cardigan with gold buttons, white knee-high socks, brown leather Mary Jane shoes, plaid headband. Classic American prep school.",

  "edgy-rock": "COMPLETELY REPLACE all clothing on this person with edgy rock style. Show FULL BODY from head to feet. If MALE: black fitted leather biker jacket with silver zippers, faded vintage band graphic t-shirt, black ripped skinny jeans with distressing at knees, black leather combat boots with silver buckles, studded black leather belt, silver ring on finger. If FEMALE: cropped black leather moto jacket, torn black graphic band tee, black ripped skinny jeans, black platform Dr. Martens lace-up boots, choker necklace, multiple ear piercings with silver studs. Rebellious rocker aesthetic.",

  "feminine": "ONLY FOR WOMEN. COMPLETELY REPLACE all clothing with ultra-feminine style. Show FULL BODY from head to feet. Flowing blush-pink silk midi wrap dress with V-neckline and flutter sleeves, cinched waist with fabric tie belt, nude pointed-toe slingback kitten heels, delicate rose-gold pendant necklace, small pearl stud earrings, soft structured cream leather handbag. Graceful romantic femininity with luxurious soft fabrics.",

  "avant-garde": "COMPLETELY REPLACE all clothing on this person with avant-garde fashion. Show FULL BODY from head to feet. If MALE: oversized black architectural deconstructed coat with asymmetric hem, all-black monochrome layered outfit with geometric cut-outs, black chunky platform boots with exaggerated sole, single bold abstract metal brooch. If FEMALE: sculptural white origami-inspired top with dramatic angular shoulders, flowing black asymmetric wide-leg pants, black-and-white geometric platform shoes, single bold oversized metal cuff bracelet. Experimental cutting-edge high fashion.",

  "resort-vacation": "COMPLETELY REPLACE all clothing on this person with resort vacation style. Show FULL BODY from head to feet. If MALE: light blue linen short-sleeve button-up shirt with relaxed fit, beige linen drawstring shorts above the knee, brown leather woven sandals, aviator sunglasses pushed up on head, woven rope bracelet. If FEMALE: flowing tropical-print wrap midi dress in turquoise and coral, wide-brim natural straw sun hat, gold metallic flat thong sandals, oversized tortoiseshell sunglasses, woven straw beach tote bag, shell anklet. Breezy tropical resort aesthetic.",

  "monochrome": "COMPLETELY REPLACE all clothing on this person with monochrome fashion. Show FULL BODY from head to feet. If MALE: black wool overcoat, black cashmere turtleneck sweater, black tailored slim trousers, black leather Chelsea boots, black leather belt — entirely black outfit with varied textures. If FEMALE: all-cream outfit — cream cashmere turtleneck, cream wide-leg tailored trousers, cream wool long coat, cream pointed-toe leather ankle boots, gold stud earrings as only contrast. Sophisticated single-color tonal look with texture variety.",

  "layered": "COMPLETELY REPLACE all clothing on this person with layered outfit. Show FULL BODY from head to feet. If MALE: white fitted turtleneck base layer, gray wool crew-neck sweater over it, navy long wool overcoat on top, dark indigo jeans, brown suede Chelsea boots, burgundy wool scarf, brown leather gloves. If FEMALE: thin black turtleneck, oversized beige chunky knit sweater, long camel wool wrap coat, black skinny jeans or leather leggings, black suede over-the-knee boots, large plaid blanket scarf, small crossbody bag. Stylish multi-layer depth.",

  "classic-timeless": "COMPLETELY REPLACE all clothing on this person with classic timeless fashion. Show FULL BODY from head to feet. If MALE: beige double-breasted trench coat with belt tied, navy wool suit underneath, white dress shirt, burgundy silk tie, black polished cap-toe Oxford shoes, matching black leather belt. If FEMALE: elegant beige trench coat, black fitted turtleneck, high-waisted charcoal tailored wide-leg trousers, black pointed-toe stiletto pumps, structured black leather handbag, simple gold watch, pearl stud earrings. Timeless refined sophistication.",

  "trendy-2026": "COMPLETELY REPLACE all clothing on this person with cutting-edge 2026 fashion trends. Show FULL BODY from head to feet. If MALE: oversized structured bomber jacket in metallic olive, relaxed wide-leg pleated trousers in slate gray, chunky futuristic sneakers in white-and-silver, minimal tech-wear crossbody micro bag, tinted small rectangular sunglasses. If FEMALE: oversized power-shoulder cropped blazer in electric cobalt blue, high-waisted wide-leg satin pants in silver, chunky platform loafers in white patent leather, micro structured bag in chrome finish, statement geometric earrings. Bold contemporary runway-inspired look.",
};

// Промпты для локаций (для Kontext - инструкции по фону)
// КРИТИЧНО: Промпты должны быть императивными и явными
const locationPrompts: Record<string, string> = {
  "studio": "Replace the background with a plain solid light gray seamless backdrop, clean Vogue-style studio photoshoot, soft professional lighting.",
  "city-day": "Replace the background with a modern city street in bright daylight, skyscrapers, golden sunlight, blurred cityscape behind.",
  "city-night": "Replace the background with a city street at night, neon signs, street lights, wet asphalt reflections, cinematic bokeh.",
  "runway": "Replace the background with a fashion show runway, white catwalk floor, dramatic spotlights, blurred audience in darkness.",
  "beach": "Replace the background with a tropical beach at golden hour, turquoise ocean, golden sand, palm trees blurred behind.",
  "cafe": "Replace the background with an elegant Parisian cafe interior, warm Edison lighting, marble table, large window with natural light.",
  "nature": "Replace the background with a lush green park, tall trees, dappled sunlight through leaves, golden-hour natural lighting.",
  "loft": "Replace the background with an industrial loft, exposed brick walls, large steel-frame windows, polished concrete floor.",
};

// Промпты для цветовых палитр
// КРИТИЧНО: Палитры должны явно указывать точные цвета для одежды
const palettePrompts: Record<string, string> = {
  "spring": "Make ALL clothing colors soft blush pink, warm peach, light lavender, and pale yellow only.",
  "summer": "Make ALL clothing colors sky blue, soft rose pink, light gray, and cool lavender only.",
  "autumn": "Make ALL clothing colors burnt terracotta, chocolate brown, mustard yellow, and chestnut only.",
  "winter": "Make ALL clothing colors jet black, crisp white, navy blue, and crimson red only.",
  "classic-neutrals": "Make ALL clothing colors warm beige, soft cream, taupe, and charcoal gray only.",
  "nature-earth": "Make ALL clothing colors brown, olive green, terracotta, and khaki only.",
  "soft-pastels": "Make ALL clothing colors baby pink, lavender, powder blue, and peach only.",
  "rich-bold": "Make ALL clothing colors burgundy, navy blue, dark slate, and black only.",
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

// Инструкции по сохранению идентичности — короткие и точные
// Kontext Pro хорошо сохраняет лицо сам, длинные инструкции только мешают
const preservationPrompt = "CRITICAL: Keep this person's EXACT same face, facial features, eye color, skin tone, hairstyle, hair color, and expression completely unchanged. Only change clothing and background.";

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

    // Собираем промпт-инструкцию для Kontext
    const stylePrompt = stylePrompts[style] || stylePrompts["casual"];
    const locationPrompt = locationPrompts[location] || locationPrompts["studio"];
    const palettePrompt = palette && palettePrompts[palette] ? palettePrompts[palette] : "";

    // Единый промпт — одним абзацем, одежда на первом месте
    // Kontext лучше работает с коротким плотным промптом без разбивки на step'ы
    let fullPrompt = genderDetectionPrefix + stylePrompt;

    // Палитра — сразу после одежды, как уточнение цветов
    if (palettePrompt) {
      fullPrompt += " " + palettePrompt;
    }

    // Фон — после одежды
    fullPrompt += " " + locationPrompt;

    // Сохранение лица — коротко и жёстко
    fullPrompt += " " + preservationPrompt;

    // Финальный якорь
    fullPrompt += " Full body shot from head to shoes. High-end fashion editorial photography, photorealistic, 8K.";

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
