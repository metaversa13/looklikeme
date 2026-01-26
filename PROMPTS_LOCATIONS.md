# ПРОМПТЫ ДЛЯ ЛОКАЦИЙ (ФОНОВ)

**Дата:** 26 января 2026
**Назначение:** AI промпты для генерации различных фонов при создании образов

---

## 🎨 СТУДИЯ (БЕСПЛАТНАЯ)

### Название
**Студия** / Studio

### Slug
`studio`

### Описание
Однотонный профессиональный фон, нейтральные цвета. Подходит для всех стилей одежды. Акцент на образе, а не на окружении.

### Prompt Template
```
plain studio background, solid color backdrop, professional photo studio setting, neutral background, seamless backdrop, studio lighting, clean minimal background, portrait photography studio, no distractions
```

### Дополнительные параметры
- **isPremium:** `false`
- **iconEmoji:** `🎨`
- **sortOrder:** `0`

### Примечания
- Это локация по умолчанию для всех пользователей
- Подходит для демонстрации одежды без отвлекающих элементов
- Можно использовать различные цвета фона (серый, белый, бежевый)

---

## 🌆 ГОРОД (ДЕНЬ) - PREMIUM

### Название
**Город (день)** / City Day

### Slug
`city-day`

### Описание
Современная городская улица в дневное время. Солнечный свет, архитектура, городская жизнь. Создает динамичный и современный образ.

### Prompt Template
```
urban city street background, daytime cityscape, modern city architecture, sunny day, natural daylight, street photography, metropolitan setting, urban environment, contemporary city, outdoor urban location, city buildings, street scene
```

### Дополнительные параметры
- **isPremium:** `true`
- **iconEmoji:** `🌆`
- **sortOrder:** `1`

### Примечания
- Отлично подходит для casual и business стилей
- Создает ощущение динамики и движения
- Светлая атмосфера, естественное освещение
- Подчеркивает современность образа

---

## 🌃 ГОРОД (НОЧЬ) - PREMIUM

### Название
**Город (ночь)** / City Night

### Slug
`city-night`

### Описание
Городская улица в ночное время с яркими огнями, неоновыми вывесками и романтичной атмосферой.

### Prompt Template
```
urban city street at night, evening cityscape, night city lights, neon signs glowing, city nightlife, illuminated buildings, street lights, dark evening sky, nighttime urban photography, vibrant night scene, city after dark, metropolitan night atmosphere
```

### Дополнительные параметры
- **isPremium:** `true`
- **iconEmoji:** `🌃`
- **sortOrder:** `2`

### Примечания
- Идеально для вечерних и гламурных образов
- Создает драматичную и стильную атмосферу
- Яркие огни и контрастное освещение
- Подходит для evening, glamour, party стилей
- Добавляет образу загадочность и элегантность

---

## ✨ ПОДИУМ - PREMIUM

### Название
**Подиум** / Runway

### Slug
`runway`

### Описание
Профессиональный модный показ с подиумом, прожекторами и атмосферой высокой моды.

### Prompt Template
```
fashion runway background, catwalk setting, fashion show stage, professional runway lights, spotlights on model, fashion week atmosphere, high fashion photography, designer show backdrop, elegant runway setting, fashionable stage, professional fashion presentation, luxury fashion event
```

### Дополнительные параметры
- **isPremium:** `true`
- **iconEmoji:** `✨`
- **sortOrder:** `3`

### Примечания
- Создает атмосферу высокой моды и престижа
- Идеально для демонстрации вечерних и гламурных образов
- Профессиональное освещение подчеркивает детали наряда
- Подходит для всех премиум стилей
- Позволяет почувствовать себя на настоящем модном показе

---

## 📋 ИНСТРУКЦИИ ПО ИСПОЛЬЗОВАНИЮ

### Как промпты интегрируются в генерацию

При создании образа финальный промпт формируется следующим образом:

```
[СТИЛЬ ПРОМПТ] + [ПАЛИТРА ПРОМПТ (если выбрана)] + [ЛОКАЦИЯ ПРОМПТ]
```

### Пример финального промпта

**Выбранные параметры:**
- Стиль: Business (деловой)
- Палитра: Зима (холодные яркие)
- Локация: Город (день)

**Финальный промпт:**
```
professional business attire, elegant office style, formal business clothing, tailored outfit, sophisticated look, business professional. Color palette: cool winter colors, black, white, navy blue, bright cool tones. urban city street background, daytime cityscape, modern city architecture, sunny day, natural daylight, street photography, metropolitan setting
```

---

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Добавление локации в базу данных (Prisma Seed)

```typescript
// prisma/seed.ts

const locations = [
  {
    name: 'Студия',
    slug: 'studio',
    description: 'Однотонный профессиональный фон',
    promptTemplate: 'plain studio background, solid color backdrop, professional photo studio setting, neutral background, seamless backdrop, studio lighting, clean minimal background',
    isPremium: false,
    iconEmoji: '🎨',
    sortOrder: 0,
    isActive: true,
  },
  {
    name: 'Город (день)',
    slug: 'city-day',
    description: 'Современная городская улица в дневное время',
    promptTemplate: 'urban city street background, daytime cityscape, modern city architecture, sunny day, natural daylight, street photography, metropolitan setting',
    isPremium: true,
    iconEmoji: '🌆',
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'Город (ночь)',
    slug: 'city-night',
    description: 'Городская улица в ночное время с яркими огнями',
    promptTemplate: 'urban city street at night, evening cityscape, night city lights, neon signs glowing, city nightlife, illuminated buildings, street lights',
    isPremium: true,
    iconEmoji: '🌃',
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'Подиум',
    slug: 'runway',
    description: 'Профессиональный модный показ с подиумом',
    promptTemplate: 'fashion runway background, catwalk setting, fashion show stage, professional runway lights, spotlights on model, fashion week atmosphere',
    isPremium: true,
    iconEmoji: '✨',
    sortOrder: 3,
    isActive: true,
  },
];

// Создание локаций
for (const location of locations) {
  await prisma.location.upsert({
    where: { slug: location.slug },
    update: location,
    create: location,
  });
}
```

---

## 🎯 РЕКОМЕНДАЦИИ ПО КОМБИНИРОВАНИЮ

### Студия
- **Лучше всего с:** Все стили
- **Цветовые палитры:** Любые
- **Когда использовать:** Когда нужен чистый, профессиональный вид

### Город (день)
- **Лучше всего с:** Casual, Business, Street Style
- **Цветовые палитры:** Весна, Лето
- **Когда использовать:** Для современных, динамичных образов

### Город (ночь)
- **Лучше всего с:** Evening, Glamour, Party
- **Цветовые палитры:** Зима, Осень
- **Когда использовать:** Для драматичных, элегантных образов

### Подиум
- **Лучше всего с:** Evening, Glamour, Haute Couture
- **Цветовые палитры:** Любые
- **Когда использовать:** Для создания ощущения высокой моды

---

## 🔮 БУДУЩИЕ ЛОКАЦИИ (ИДЕИ)

Возможные дополнительные локации для будущих обновлений:

1. **Пляж** 🏖️ - `beach`
   - Морской берег, песок, солнце
   - Для resort, summer, beach стилей

2. **Кафе/Ресторан** ☕ - `cafe`
   - Уютное кафе, ресторан
   - Для casual, romantic стилей

3. **Парк** 🌳 - `park`
   - Зеленый парк, природа
   - Для casual, romantic, spring стилей

4. **Лофт** 🏢 - `loft`
   - Индустриальный лофт-интерьер
   - Для creative, hipster, modern стилей

5. **Красная дорожка** 🎬 - `red-carpet`
   - Премьера, VIP событие
   - Для glamour, celebrity стилей

---

**Документ создан:** 26.01.2026
**Последнее обновление:** 26.01.2026
**Статус:** Готово к использованию
