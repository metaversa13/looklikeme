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
    const fontSize = Math.floor(width / 14);
    const bandHeight = Math.floor(fontSize * 2.5);

    // Создаем SVG с текстом watermark
    const watermarkSvg = `
      <svg width="${width}" height="${bandHeight}">
        <rect width="${width}" height="${bandHeight}" fill="rgba(0, 0, 0, 0.7)"/>
        <text
          x="50%" y="50%"
          text-anchor="middle"
          dominant-baseline="middle"
          font-family="Arial, Helvetica, sans-serif"
          font-size="${fontSize}"
          font-weight="bold"
          fill="white"
          opacity="0.95"
        >looklike-me.ru</text>
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
