# ИНТЕГРАЦИЯ СИСТЕМЫ ЛОКАЦИЙ

**Дата:** 26 января 2026
**Статус:** Готово к разработке

---

## 📋 КРАТКОЕ ОПИСАНИЕ

Добавлена система выбора локаций (фонов) при создании образов:

- **Студия** (🎨) - Бесплатная, по умолчанию
- **Город (день)** (🌆) - Premium
- **Город (ночь)** (🌃) - Premium
- **Подиум** (✨) - Premium

---

## ✅ ВЫПОЛНЕННЫЕ ИЗМЕНЕНИЯ

### 1. База данных

**Файл:** [АРХИТЕКТУРА.md](АРХИТЕКТУРА.md#L181-L201)

Добавлена новая модель `Location`:

```prisma
model Location {
  id              String   @id @default(cuid())
  name            String   @unique
  slug            String   @unique
  description     String   @db.Text
  promptTemplate  String   @db.Text
  isPremium       Boolean  @default(false)
  iconEmoji       String?
  exampleImageUrl String?
  sortOrder       Int      @default(0)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  generations     Generation[]

  @@index([isPremium])
  @@index([isActive])
  @@map("locations")
}
```

**В модель `Generation` добавлено:**
```prisma
locationId  String?
location    Location? @relation(fields: [locationId], references: [id])
```

### 2. API Endpoints

**Файл:** [АРХИТЕКТУРА.md](АРХИТЕКТУРА.md#L678-L750)

#### Новый эндпоинт: `GET /api/locations`

Возвращает список доступных локаций.

**Пример ответа:**
```json
{
  "locations": [
    {
      "id": "loc_1",
      "name": "Студия",
      "slug": "studio",
      "isPremium": false,
      "iconEmoji": "🎨"
    },
    {
      "id": "loc_2",
      "name": "Город (день)",
      "slug": "city-day",
      "isPremium": true,
      "iconEmoji": "🌆"
    }
  ]
}
```

#### Обновленный эндпоинт: `POST /api/generate`

Добавлен параметр `locationId`:

```typescript
{
  originalPhotoBase64: string,
  styleId: string,
  paletteId?: string,
  locationId?: string  // ← НОВОЕ
}
```

**Логика проверки:**
- FREE пользователи: только `studio`
- PREMIUM: все локации
- По умолчанию: `studio` если не указано

### 3. UI Прототип

**Файл:** [prototype/generate.html](prototype/generate.html#L215-L285)

Добавлена секция выбора локаций между выбором стиля и цветовой палитрой.

**Особенности UI:**
- Сетка 2x2 или 4 колонки на desktop
- Бесплатная локация (Студия) выбрана по умолчанию
- Premium локации с оверлеем "Premium" и иконкой замка
- Hover эффекты и визуальная обратная связь

### 4. Промпты

**Файл:** [PROMPTS_LOCATIONS.md](PROMPTS_LOCATIONS.md)

Создан полный набор промптов для каждой локации с:
- Описанием
- AI промптом на английском
- Рекомендациями по использованию
- Примерами комбинирования со стилями

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ ДЛЯ РАЗРАБОТКИ

### Шаг 1: Миграция БД

```bash
# 1. Добавить модель Location в prisma/schema.prisma
# (используйте код из АРХИТЕКТУРА.md)

# 2. Создать миграцию
npx prisma migrate dev --name add_locations

# 3. Обновить Prisma Client
npx prisma generate
```

### Шаг 2: Seed данных

Добавить в `prisma/seed.ts`:

```typescript
const locations = [
  {
    name: 'Студия',
    slug: 'studio',
    description: 'Однотонный профессиональный фон',
    promptTemplate: 'plain studio background, solid color backdrop, professional photo studio setting, neutral background',
    isPremium: false,
    iconEmoji: '🎨',
    sortOrder: 0,
    isActive: true,
  },
  // ... остальные локации из PROMPTS_LOCATIONS.md
];

for (const location of locations) {
  await prisma.location.upsert({
    where: { slug: location.slug },
    update: location,
    create: location,
  });
}
```

Запустить:
```bash
npx prisma db seed
```

### Шаг 3: API Route - GET /api/locations

Создать файл `app/api/locations/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isPremium: true,
        iconEmoji: true,
      },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
```

### Шаг 4: Обновить POST /api/generate

В файле `app/api/generate/route.ts`:

```typescript
// 1. Добавить в Request Body type
interface GenerateRequest {
  originalPhotoBase64: string;
  styleId: string;
  paletteId?: string;
  locationId?: string; // ← добавить
}

// 2. Проверка доступа к локации
const location = await prisma.location.findUnique({
  where: { id: locationId || 'studio-default-id' }
});

if (location?.isPremium && user.subscriptionType === 'FREE') {
  return NextResponse.json(
    { error: 'Premium subscription required for this location' },
    { status: 402 }
  );
}

// 3. Добавить промпт локации
const fullPrompt = [
  style.promptTemplate,
  palette?.promptTemplate,
  location?.promptTemplate
].filter(Boolean).join('. ');

// 4. Сохранить в БД
const generation = await prisma.generation.create({
  data: {
    userId: user.id,
    styleId,
    paletteId,
    locationId: location?.id, // ← добавить
    // ... остальные поля
  }
});
```

### Шаг 5: Frontend компоненты

#### Создать `components/LocationSelector.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Location {
  id: string;
  name: string;
  slug: string;
  isPremium: boolean;
  iconEmoji: string;
  description: string;
}

export function LocationSelector({
  onSelect,
  selectedId
}: {
  onSelect: (id: string) => void;
  selectedId?: string;
}) {
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    fetch('/api/locations')
      .then(res => res.json())
      .then(data => setLocations(data.locations));
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {locations.map(location => (
        <LocationCard
          key={location.id}
          location={location}
          isSelected={location.id === selectedId}
          onSelect={() => onSelect(location.id)}
        />
      ))}
    </div>
  );
}
```

### Шаг 6: Обновить страницу генерации

В `app/(dashboard)/generate/page.tsx`:

```typescript
const [selectedLocationId, setSelectedLocationId] = useState<string>();

// При отправке формы:
const handleGenerate = async () => {
  const response = await fetch('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      originalPhotoBase64,
      styleId: selectedStyleId,
      paletteId: selectedPaletteId,
      locationId: selectedLocationId, // ← добавить
    }),
  });
};
```

---

## 🎯 ТЕСТИРОВАНИЕ

### Проверить:

1. **БД:**
   - ✅ Миграция прошла успешно
   - ✅ 4 локации созданы в БД
   - ✅ Студия помечена как `isPremium: false`

2. **API:**
   - ✅ `GET /api/locations` возвращает список
   - ✅ `POST /api/generate` принимает `locationId`
   - ✅ Проверка premium доступа работает
   - ✅ Промпт правильно формируется

3. **Frontend:**
   - ✅ Локации отображаются в UI
   - ✅ FREE пользователи видят замок на premium
   - ✅ Выбор локации сохраняется
   - ✅ По умолчанию выбрана "Студия"

4. **Генерация:**
   - ✅ Создается образ с нужным фоном
   - ✅ Промпт включает локацию
   - ✅ В БД сохраняется `locationId`

---

## 📊 МОНЕТИЗАЦИЯ

### FREE пользователи:
- Доступна только "Студия"
- При попытке выбрать premium локацию → показывать модалку upgrade

### PREMIUM пользователи:
- Доступны все 4 локации
- Это один из selling points подписки

### Будущее расширение:
- Добавлять новые premium локации
- Seasonal локации (праздничные)
- Custom локации для lifetime подписки

---

## 📝 ДОКУМЕНТАЦИЯ

Обновленные файлы:
- ✅ [АРХИТЕКТУРА.md](АРХИТЕКТУРА.md) - БД и API
- ✅ [PROMPTS_LOCATIONS.md](PROMPTS_LOCATIONS.md) - AI промпты
- ✅ [prototype/generate.html](prototype/generate.html) - UI прототип
- ✅ [LOCATIONS_INTEGRATION.md](LOCATIONS_INTEGRATION.md) - Этот файл

---

## 💡 РЕКОМЕНДАЦИИ

1. **UX:**
   - Показывать превью каждой локации
   - Добавить подсказки "Рекомендуется для [стиль]"
   - Анимация при выборе

2. **Аналитика:**
   - Трекать популярность локаций
   - A/B тест влияния на конверсию в Premium

3. **Оптимизация:**
   - Кэшировать список локаций
   - Предзагружать preview изображения

4. **Будущее:**
   - Пользовательские локации (загрузить свой фон)
   - AI генерация custom локаций
   - Интеграция с реальными локациями (Google Maps)

---

**Готово к разработке!** 🚀

Все изменения задокументированы и готовы к имплементации.
