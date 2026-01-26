import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Промпты для стилей (для Kontext - инструкции по редактированию)
// Важно: избегаем слова "transform", явно указываем что менять
const stylePrompts: Record<string, string> = {
  "casual-chic": "Change only the clothes of this person to casual chic fashion: stylish jeans and an elegant blouse, comfortable yet stylish look",
  "business": "Change only the clothes of this person to professional business attire: an elegant tailored suit, sophisticated corporate look",
  "evening": "Change only the clothes of this person to an elegant evening dress: glamorous formal gown, red carpet worthy",
  "bohemian": "Change only the clothes of this person to bohemian chic style: flowing fabrics, artistic boho outfit with layered accessories",
  "glamour": "Change only the clothes of this person to glamorous high fashion: luxury designer clothing, haute couture style",
  "sporty-chic": "Change only the clothes of this person to sporty chic athletic wear: elegant sportswear, premium athleisure fashion",
};

// Промпты для локаций (для Kontext - инструкции по фону)
const locationPrompts: Record<string, string> = {
  "studio": "Set the background to a professional photo studio with clean neutral backdrop and perfect studio lighting.",
  "city-day": "Set the background to an urban city street during daytime with modern architecture and natural daylight.",
  "city-night": "Set the background to a city street at night with neon lights, evening atmosphere, cinematic mood.",
  "runway": "Set the background to a fashion runway catwalk with fashion show spotlights, editorial style setting.",
};

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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { image, style, location } = body;

    if (!image || !style) {
      return NextResponse.json(
        { error: "Image and style are required" },
        { status: 400 }
      );
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
    const stylePrompt = stylePrompts[style] || stylePrompts["casual-chic"];
    const locationPrompt = locationPrompts[location] || locationPrompts["studio"];

    // Kontext работает с инструкциями по редактированию
    // Структура: Действие + Контекст + Сохранение идентичности
    const fullPrompt = `${stylePrompt} ${locationPrompt} ${preservationPrompt} High quality fashion photography, professional lighting, sharp focus, photorealistic.`;

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
