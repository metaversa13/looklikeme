# Исправление проблемы с гендерно-специфичной одеждой

## Дата: 1 февраля 2026

## Проблема
Мужчины переодевались в женскую одежду при генерации образов. AI не всегда корректно определял гендер и выбирал соответствующую одежду.

## Решение

### 1. ✅ Обновлена схема базы данных (schema.prisma)

Добавлено поле `gender` в модель `Style`:

```prisma
model Style {
  // ... другие поля
  gender StyleGender @default(UNIVERSAL)
  // ...
}

enum StyleGender {
  UNIVERSAL  // Подходит для всех гендеров
  MALE       // Только для мужчин
  FEMALE     // Только для женщин
}
```

### 2. ✅ Обновлен seed.ts

Все 20 стилей теперь содержат:
- Актуальные промпты из API route
- Гендерные метаданные:
  - **19 UNIVERSAL стилей** - работают для всех гендеров
  - **1 FEMALE стиль** - "feminine" (только для женщин)
  - **0 MALE стилей** - пока нет

### 3. ✅ Улучшены промпты в API route (api/generate/route.ts)

#### Изменения:
1. **Добавлен префикс определения гендера:**
   ```typescript
   const genderDetectionPrefix = "FIRST: Look at this person carefully and determine if they are male or female. THEN: ";
   ```

2. **Все промпты переписаны с явным указанием гендерных вариантов:**
   - Вместо: `"appropriate for this person's gender"`
   - Теперь: `"If this person is MALE: [мужская одежда]. If this person is FEMALE: [женская одежда]"`

3. **Примеры улучшенных промптов:**

   **Casual:**
   ```
   If this person is MALE: comfortable jeans, simple t-shirt or polo shirt, casual sneakers.
   If this person is FEMALE: comfortable jeans or casual pants, simple t-shirt or casual top, sneakers or flats.
   ```

   **Business:**
   ```
   If this person is MALE: tailored business suit with blazer, dress pants, dress shirt with tie, polished leather shoes.
   If this person is FEMALE: tailored blazer with dress pants OR pencil skirt, professional blouse, closed-toe heels or flats.
   ```

   **Elegant Evening:**
   ```
   If this person is MALE: black tuxedo or elegant dark suit with bow tie.
   If this person is FEMALE: stunning evening gown or elegant cocktail dress.
   ```

4. **Стиль "Feminine" - только для женщин:**
   ```
   ONLY FOR WOMEN - Change only the clothes to ultra-feminine style: silk blouse or delicate top, flowing midi skirt or elegant dress...
   If the person is male, DO NOT apply this style - show an error instead.
   ```

### 4. ✅ Обновлен фронтенд (generate/page.tsx)

#### Добавлены гендерные иконки на кнопки стилей:
- **⚥** - Универсальный стиль (для всех)
- **♂** - Только для мужчин
- **♀** - Только для женщин

Иконки отображаются в правом верхнем углу каждой кнопки стиля с подсказкой при наведении.

## Категоризация стилей по гендеру

### FREE стили (3 шт) - все UNIVERSAL:
1. **Casual** ⚥ - Повседневный
2. **Business** ⚥ - Деловой
3. **Streetwear** ⚥ - Уличная мода

### PREMIUM стили (17 шт):

#### UNIVERSAL (16 шт) ⚥:
4. Romantic - Романтичный
5. Athleisure - Спортивный шик
6. Elegant Evening - Вечерний элегантный
7. Boho - Богемный
8. Minimalist - Минималистичный
9. Vintage Retro - Винтажный 50-х
10. Smart Casual - Деловой-повседневный
11. Glamorous - Гламурный
12. Preppy - Преппи
13. Edgy Rock - Рок
14. Avant-garde - Авангардный
15. Resort - Курортный
16. Monochrome - Монохромный
17. Layered - Многослойный
18. Classic - Классический
19. Trendy 2026 - Актуальные тренды

#### FEMALE ONLY (1 шт) ♀:
20. **Feminine** - Ультра-женственный

## Следующие шаги (когда будет доступна БД)

### 1. Применить миграцию базы данных:
```bash
cd app
npx prisma db push
```

### 2. Заполнить БД обновленными данными:
```bash
cd app
npx prisma db seed
```

### 3. Перегенерировать Prisma client:
```bash
cd app
npx prisma generate
```

### 4. Тестирование:
1. Загрузить фото мужчины → выбрать любой стиль → проверить, что одежда мужская
2. Загрузить фото женщины → выбрать стиль "Business" → проверить, что одежда женская (не мужской костюм)
3. Попробовать выбрать "Feminine" для мужчины → должна быть корректная генерация или ошибка
4. Проверить, что гендерные иконки отображаются на кнопках стилей

## Технические детали

### Файлы, которые были изменены:
1. ✅ `prisma/schema.prisma` - добавлено поле gender и enum StyleGender
2. ✅ `prisma/seed.ts` - обновлены все 20 стилей с гендерными метаданными
3. ✅ `app/api/generate/route.ts` - улучшены промпты с явным указанием гендера
4. ✅ `app/generate/page.tsx` - добавлены гендерные иконки на UI

### Ключевые улучшения:
- **Явное определение гендера** в начале каждого промпта
- **Разделение инструкций** для мужчин и женщин в каждом стиле
- **Визуальные индикаторы** гендерной принадлежности стилей
- **Четкая категоризация** стилей в базе данных

## Примечания

- Dev сервер работает на http://localhost:3000
- Код успешно компилируется
- База данных сейчас недоступна, но все изменения готовы к применению
- После применения миграции нужно будет перезапустить dev сервер

## Итог

Проблема с переодеванием мужчин в женскую одежду должна быть полностью решена за счет:
1. Явного определения гендера в промптах
2. Четких инструкций для AI по каждому гендеру
3. Визуальных индикаторов на UI
4. Метаданных в базе данных

Все стили теперь имеют четкие инструкции по гендеру, и AI будет точно знать, какую одежду выбирать для мужчин, а какую для женщин.
