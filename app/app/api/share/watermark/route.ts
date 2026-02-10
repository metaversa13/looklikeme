import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Загружаем изображение
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Получаем размеры изображения
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 768;
    const height = metadata.height || 1024;

    // Размер watermark (пропорционально изображению)
    const fontSize = Math.floor(width / 20); // Примерно 38px для 768px ширины
    const padding = Math.floor(width / 40);

    // Создаем SVG с текстом watermark
    const watermarkSvg = `
      <svg width="${width}" height="${Math.floor(fontSize * 3)}">
        <style>
          .watermark {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: ${fontSize}px;
            font-weight: 600;
            fill: rgba(0, 0, 0, 0.75);
          }
        </style>
        <rect width="${width}" height="${Math.floor(fontSize * 3)}" fill="rgba(245, 245, 220, 0.95)"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="watermark">
          Создано в looklike-me.ru ✨
        </text>
      </svg>
    `;

    // Добавляем watermark внизу изображения
    const imageWithWatermark = await sharp(buffer)
      .composite([
        {
          input: Buffer.from(watermarkSvg),
          gravity: "south",
        },
      ])
      .toFormat("jpeg", { quality: 90 })
      .toBuffer();

    // Возвращаем изображение с watermark
    return new NextResponse(new Uint8Array(imageWithWatermark), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Watermark error:", error);
    return NextResponse.json(
      { error: "Failed to add watermark" },
      { status: 500 }
    );
  }
}
