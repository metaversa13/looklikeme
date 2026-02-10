import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем seed базы данных...');

  // ============================================
  // СТИЛИ
  // ============================================
  console.log('📦 Создаем стили...');

  const styles = [
    // FREE СТИЛИ (3 шт) - универсальные для всех гендеров
    {
      name: 'Casual',
      slug: 'casual',
      description: 'Повседневный стиль',
      promptTemplate: 'Change only the clothes to casual everyday style appropriate for this person\'s gender: comfortable jeans, simple t-shirt or casual top, sneakers or casual shoes, relaxed and effortless look',
      isPremium: false,
      category: 'casual',
      gender: 'UNIVERSAL',
      sortOrder: 0,
    },
    {
      name: 'Business',
      slug: 'business',
      description: 'Деловой образ',
      promptTemplate: 'Change only the clothes to professional business attire appropriate for this person\'s gender: elegant tailored suit with blazer and dress pants for men OR tailored blazer with pants/pencil skirt for women, classic button-up shirt, polished corporate look with sophisticated accessories',
      isPremium: false,
      category: 'formal',
      gender: 'UNIVERSAL',
      sortOrder: 1,
    },
    {
      name: 'Streetwear',
      slug: 'streetwear',
      description: 'Уличная мода',
      promptTemplate: 'Change only the clothes to urban streetwear fashion: oversized hoodie or graphic tee, baggy cargo pants or joggers, chunky sneakers, modern street style with urban edge',
      isPremium: false,
      category: 'casual',
      gender: 'UNIVERSAL',
      sortOrder: 2,
    },

    // PREMIUM СТИЛИ (17 шт)
    {
      name: 'Romantic',
      slug: 'romantic',
      description: 'Романтичный стиль',
      promptTemplate: 'Change only the clothes to romantic style appropriate for this person\'s gender: soft flowing fabrics, delicate prints and patterns, pastel colors, elegant and dreamy aesthetic with gentle details',
      isPremium: true,
      category: 'romantic',
      gender: 'UNIVERSAL',
      sortOrder: 3,
    },
    {
      name: 'Athleisure',
      slug: 'athleisure',
      description: 'Спортивный шик',
      promptTemplate: 'Change only the clothes to sporty chic athletic wear: fitted athletic pants or leggings, stylish sports top or tank, lightweight athletic jacket, premium athleisure fashion that blends comfort and style',
      isPremium: true,
      category: 'sport',
      gender: 'UNIVERSAL',
      sortOrder: 4,
    },
    {
      name: 'Elegant Evening',
      slug: 'elegant-evening',
      description: 'Вечерний элегантный',
      promptTemplate: 'Change only the clothes to elegant evening formal attire appropriate for this person\'s gender: for men - tuxedo or elegant suit with bow tie, for women - stunning evening gown or cocktail dress, luxurious fabrics like silk or satin, sophisticated formal look',
      isPremium: true,
      category: 'formal',
      gender: 'UNIVERSAL',
      sortOrder: 5,
    },
    {
      name: 'Boho',
      slug: 'boho',
      description: 'Богемный стиль',
      promptTemplate: 'Change only the clothes to bohemian style: flowing loose layers, ethnic patterns and prints, fringe or embroidery details, natural fabrics, artistic free-spirited boho look with layered accessories',
      isPremium: true,
      category: 'casual',
      gender: 'UNIVERSAL',
      sortOrder: 6,
    },
    {
      name: 'Minimalist',
      slug: 'minimalist',
      description: 'Минималистичный',
      promptTemplate: 'Change only the clothes to minimalist fashion: clean simple lines, monochromatic neutral colors (black, white, gray, beige), high-quality basic pieces, understated elegance with no unnecessary details',
      isPremium: true,
      category: 'casual',
      gender: 'UNIVERSAL',
      sortOrder: 7,
    },
    {
      name: 'Vintage Retro',
      slug: 'vintage-retro',
      description: 'Винтажный 50-х',
      promptTemplate: 'Change only the clothes to vintage 1950s style appropriate for this person\'s gender: for men - retro suit with high-waisted trousers and vintage shirt OR for women - classic A-line dress or high-waisted skirt, retro prints like polka dots or stripes, nostalgic vintage silhouette',
      isPremium: true,
      category: 'vintage',
      gender: 'UNIVERSAL',
      sortOrder: 8,
    },
    {
      name: 'Smart Casual',
      slug: 'smart-casual',
      description: 'Деловой-повседневный',
      promptTemplate: 'Change only the clothes to smart casual style: blazer paired with dark jeans or chinos, nice shirt or blouse, loafers or ankle boots, polished yet relaxed business-casual look',
      isPremium: true,
      category: 'casual',
      gender: 'UNIVERSAL',
      sortOrder: 9,
    },
    {
      name: 'Glamorous',
      slug: 'glamorous',
      description: 'Гламурный стиль',
      promptTemplate: 'Change only the clothes to glamorous high fashion appropriate for this person\'s gender: luxurious designer clothing with sparkles and shine, metallic or sequined fabrics, statement pieces, red carpet worthy haute couture style',
      isPremium: true,
      category: 'formal',
      gender: 'UNIVERSAL',
      sortOrder: 10,
    },
    {
      name: 'Preppy',
      slug: 'preppy',
      description: 'Преппи стиль',
      promptTemplate: 'Change only the clothes to preppy collegiate style: chinos or pleated pants/skirt, cardigan or sweater vest over collared shirt, classic American prep school aesthetic with refined details',
      isPremium: true,
      category: 'casual',
      gender: 'UNIVERSAL',
      sortOrder: 11,
    },
    {
      name: 'Edgy Rock',
      slug: 'edgy-rock',
      description: 'Рок стиль',
      promptTemplate: 'Change only the clothes to edgy rock style: black leather jacket, ripped or distressed jeans, band t-shirt or graphic tee, studded belts or accessories, bold rebellious rocker aesthetic',
      isPremium: true,
      category: 'rock',
      gender: 'UNIVERSAL',
      sortOrder: 12,
    },
    {
      name: 'Feminine',
      slug: 'feminine',
      description: 'Ультра-женственный',
      promptTemplate: 'Change only the clothes to ultra-feminine style appropriate for women: silk blouse or delicate top, flowing midi skirt or elegant dress, soft luxurious fabrics, romantic details like bows or ruffles, graceful elegant femininity',
      isPremium: true,
      category: 'feminine',
      gender: 'FEMALE',
      sortOrder: 13,
    },
    {
      name: 'Avant-garde',
      slug: 'avant-garde',
      description: 'Авангардный',
      promptTemplate: 'Change only the clothes to avant-garde fashion: experimental design with unconventional shapes, architectural silhouettes, bold artistic pieces, cutting-edge high-fashion with unique geometric forms',
      isPremium: true,
      category: 'avant-garde',
      gender: 'UNIVERSAL',
      sortOrder: 14,
    },
    {
      name: 'Resort',
      slug: 'resort-vacation',
      description: 'Курортный стиль',
      promptTemplate: 'Change only the clothes to resort vacation style: light linen clothing or flowy beach outfit, sun hat, comfortable sandals, breezy tropical aesthetic perfect for summer getaway',
      isPremium: true,
      category: 'resort',
      gender: 'UNIVERSAL',
      sortOrder: 15,
    },
    {
      name: 'Monochrome',
      slug: 'monochrome',
      description: 'Монохромный',
      promptTemplate: 'Change only the clothes to monochrome fashion: entire outfit in one single color (black, white, gray, beige, or navy), different textures and shades of the same color, sophisticated tonal look',
      isPremium: true,
      category: 'monochrome',
      gender: 'UNIVERSAL',
      sortOrder: 16,
    },
    {
      name: 'Layered',
      slug: 'layered',
      description: 'Многослойный',
      promptTemplate: 'Change only the clothes to layered style: multiple clothing layers like turtleneck under sweater or shirt, long coat or jacket over outfit, scarf and accessories, complex stylish layering with depth and dimension',
      isPremium: true,
      category: 'layered',
      gender: 'UNIVERSAL',
      sortOrder: 17,
    },
    {
      name: 'Classic',
      slug: 'classic-timeless',
      description: 'Классический',
      promptTemplate: 'Change only the clothes to classic timeless fashion appropriate for this person\'s gender: for men - tailored trench coat with suit OR for women - little black dress or elegant coat, simple pieces that never go out of style, refined sophisticated look',
      isPremium: true,
      category: 'classic',
      gender: 'UNIVERSAL',
      sortOrder: 18,
    },
    {
      name: 'Trendy 2026',
      slug: 'trendy-2026',
      description: 'Актуальные тренды',
      promptTemplate: 'Change only the clothes to 2026 fashion trends appropriate for this person\'s gender: latest cutting-edge styles, modern trendy colors and cuts, contemporary fashion-forward pieces, current runway-inspired look',
      isPremium: true,
      category: 'trendy',
      gender: 'UNIVERSAL',
      sortOrder: 19,
    },
  ];

  for (const style of styles) {
    await prisma.style.upsert({
      where: { slug: style.slug },
      update: style,
      create: style,
    });
  }

  console.log(`✅ Создано ${styles.length} стилей`);

  // ============================================
  // ЛОКАЦИИ
  // ============================================
  console.log('🏞️ Создаем локации...');

  const locations = [
    {
      name: 'Студия',
      slug: 'studio',
      description: 'Однотонный профессиональный фон',
      promptTemplate: 'BACKGROUND MUST BE: Professional photo studio with clean neutral solid color backdrop, seamless white or gray background, studio lighting setup, minimalist clean setting',
      isPremium: false,
      iconEmoji: '🎨',
      sortOrder: 0,
    },
    {
      name: 'Город (день)',
      slug: 'city-day',
      description: 'Современная городская улица в дневное время',
      promptTemplate: 'BACKGROUND MUST BE: Urban city street in bright daytime, modern architecture buildings, sunny weather with natural daylight, metropolitan street scene, contemporary cityscape',
      isPremium: true,
      iconEmoji: '🌆',
      sortOrder: 1,
    },
    {
      name: 'Город (ночь)',
      slug: 'city-night',
      description: 'Городская улица в ночное время с яркими огнями',
      promptTemplate: 'BACKGROUND MUST BE: City street at nighttime, glowing neon signs and street lights, evening urban atmosphere, illuminated buildings, cinematic night cityscape with bokeh lights',
      isPremium: true,
      iconEmoji: '🌃',
      sortOrder: 2,
    },
    {
      name: 'Бутик',
      slug: 'boutique',
      description: 'Элегантный модный бутик',
      promptTemplate: 'BACKGROUND MUST BE: Elegant fashion boutique interior, soft warm lighting, luxury shopping atmosphere',
      isPremium: true,
      iconEmoji: '🛍️',
      sortOrder: 3,
    },
    {
      name: 'Пляж',
      slug: 'beach',
      description: 'Солнечный пляж с морем и песком',
      promptTemplate: 'BACKGROUND MUST BE: Sunny beach with ocean waves, golden sand, clear blue sky, tropical seaside setting, natural beach environment with water in background',
      isPremium: true,
      iconEmoji: '🏖️',
      sortOrder: 4,
    },
    {
      name: 'Кафе',
      slug: 'cafe',
      description: 'Уютное кафе с современным интерьером',
      promptTemplate: 'BACKGROUND MUST BE: Stylish modern cafe interior, cozy coffee shop setting, elegant restaurant ambiance, chic bistro environment with soft ambient lighting',
      isPremium: true,
      iconEmoji: '☕',
      sortOrder: 5,
    },
    {
      name: 'Природа',
      slug: 'nature',
      description: 'Живописная природа - парк или лес',
      promptTemplate: 'BACKGROUND MUST BE: Beautiful natural outdoor setting, green park or forest scenery, natural landscape with trees and foliage, outdoor nature environment',
      isPremium: true,
      iconEmoji: '🌳',
      sortOrder: 6,
    },
    {
      name: 'Лофт',
      slug: 'loft',
      description: 'Индустриальный лофт или стройка',
      promptTemplate: 'BACKGROUND MUST BE: Industrial loft space with exposed brick walls, urban industrial setting, raw concrete textures, modern warehouse aesthetic with industrial elements',
      isPremium: true,
      iconEmoji: '🏗️',
      sortOrder: 7,
    },
  ];

  for (const location of locations) {
    await prisma.location.upsert({
      where: { slug: location.slug },
      update: location,
      create: location,
    });
  }

  console.log(`✅ Создано ${locations.length} локаций`);

  // ============================================
  // ЦВЕТОВЫЕ ПАЛИТРЫ
  // ============================================
  console.log('🎨 Создаем цветовые палитры...');

  const palettes = [
    // Сезонные палитры (4 шт)
    {
      name: 'Весна',
      slug: 'spring',
      description: 'Теплые пастельные тона',
      colors: ['#FFB6C1', '#FFE4E1', '#DDA0DD', '#F0E68C'],
      isPremium: true,
      season: 'spring',
    },
    {
      name: 'Лето',
      slug: 'summer',
      description: 'Холодные мягкие оттенки',
      colors: ['#87CEEB', '#FFB6D9', '#D3D3D3', '#E6E6FA'],
      isPremium: true,
      season: 'summer',
    },
    {
      name: 'Осень',
      slug: 'autumn',
      description: 'Теплые глубокие цвета',
      colors: ['#CD853F', '#D2691E', '#DAA520', '#8B4513'],
      isPremium: true,
      season: 'autumn',
    },
    {
      name: 'Зима',
      slug: 'winter',
      description: 'Холодные яркие тона',
      colors: ['#000000', '#FFFFFF', '#000080', '#DC143C'],
      isPremium: true,
      season: 'winter',
    },
    // Дополнительные стилистические палитры (4 шт)
    {
      name: 'Классика',
      slug: 'classic-neutrals',
      description: 'Элегантные нейтральные тона',
      colors: ['#F5E6D3', '#D4C5B9', '#8B7355', '#2C2C2C'],
      isPremium: true,
      season: null,
    },
    {
      name: 'Природные',
      slug: 'nature-earth',
      description: 'Природные естественные оттенки',
      colors: ['#8B7355', '#6B8E23', '#D2691E', '#556B2F'],
      isPremium: true,
      season: null,
    },
    {
      name: 'Пастель',
      slug: 'soft-pastels',
      description: 'Нежные романтичные цвета',
      colors: ['#FFB6C1', '#E6E6FA', '#B0E0E6', '#FFDAB9'],
      isPremium: true,
      season: null,
    },
    {
      name: 'Насыщенные',
      slug: 'rich-bold',
      description: 'Глубокие выразительные тона',
      colors: ['#8B0000', '#000080', '#2F4F4F', '#1C1C1C'],
      isPremium: true,
      season: null,
    },
  ];

  for (const palette of palettes) {
    await prisma.colorPalette.upsert({
      where: { slug: palette.slug },
      update: palette,
      create: palette,
    });
  }

  console.log(`✅ Создано ${palettes.length} цветовых палитр`);

  console.log('✨ Seed завершен успешно!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
