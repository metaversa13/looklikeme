import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем seed базы данных...');

  // ============================================
  // СТИЛИ
  // ============================================
  console.log('📦 Создаем стили...');

  const styles = [
    {
      name: 'Casual Chic',
      slug: 'casual-chic',
      description: 'Повседневный шик - комфортный и стильный образ',
      promptTemplate: 'casual chic fashion style, jeans and elegant blouse, comfortable yet stylish outfit, relaxed sophisticated look, modern urban fashion',
      isPremium: false,
      category: 'casual',
      sortOrder: 0,
    },
    {
      name: 'Business',
      slug: 'business',
      description: 'Деловой стиль - элегантность и профессионализм',
      promptTemplate: 'professional business attire, elegant office style, formal business clothing, tailored suit, sophisticated corporate look',
      isPremium: false,
      category: 'formal',
      sortOrder: 1,
    },
    {
      name: 'Evening',
      slug: 'evening',
      description: 'Вечерний образ - изысканность и роскошь',
      promptTemplate: 'elegant evening dress, formal gown, glamorous evening outfit, sophisticated evening wear, luxury fashion',
      isPremium: false,
      category: 'formal',
      sortOrder: 2,
    },
    {
      name: 'Bohemian',
      slug: 'bohemian',
      description: 'Богемный шик - свобода и креативность',
      promptTemplate: 'bohemian chic style, flowing fabrics, artistic boho outfit, free-spirited fashion, eclectic bohemian look',
      isPremium: true,
      category: 'casual',
      sortOrder: 3,
    },
    {
      name: 'Glamour',
      slug: 'glamour',
      description: 'Гламурный образ - роскошь и блеск',
      promptTemplate: 'glamorous high fashion outfit, luxury designer clothing, elegant and sophisticated style, red carpet fashion',
      isPremium: true,
      category: 'formal',
      sortOrder: 4,
    },
    {
      name: 'Sporty Chic',
      slug: 'sporty-chic',
      description: 'Спортивный шик - активность и стиль',
      promptTemplate: 'sporty chic athletic wear, elegant sportswear, fashionable athletic outfit, sporty sophisticated look',
      isPremium: true,
      category: 'sport',
      sortOrder: 5,
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
      promptTemplate: 'plain studio background, solid color backdrop, professional photo studio setting, neutral background, seamless backdrop, studio lighting, clean minimal background',
      isPremium: false,
      iconEmoji: '🎨',
      sortOrder: 0,
    },
    {
      name: 'Город (день)',
      slug: 'city-day',
      description: 'Современная городская улица в дневное время',
      promptTemplate: 'urban city street background, daytime cityscape, modern city architecture, sunny day, natural daylight, street photography, metropolitan setting',
      isPremium: true,
      iconEmoji: '🌆',
      sortOrder: 1,
    },
    {
      name: 'Город (ночь)',
      slug: 'city-night',
      description: 'Городская улица в ночное время с яркими огнями',
      promptTemplate: 'urban city street at night, evening cityscape, night city lights, neon signs glowing, city nightlife, illuminated buildings, street lights',
      isPremium: true,
      iconEmoji: '🌃',
      sortOrder: 2,
    },
    {
      name: 'Подиум',
      slug: 'runway',
      description: 'Профессиональный модный показ с подиумом',
      promptTemplate: 'fashion runway background, catwalk setting, fashion show stage, professional runway lights, spotlights on model, fashion week atmosphere',
      isPremium: true,
      iconEmoji: '✨',
      sortOrder: 3,
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
