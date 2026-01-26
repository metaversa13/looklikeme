# LookLikeme - AI Fashion Style Generator

AI-платформа для создания модных образов с использованием Flux AI.

## Технологии

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (Google OAuth)
- **AI:** Replicate (Flux Schnell)
- **Storage:** Yandex Object Storage
- **Payments:** ЮKassa
- **UI:** Radix UI + shadcn/ui

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения

Скопируйте `.env.example` в `.env.local`:

```bash
cp .env.example .env.local
```

Заполните переменные окружения в `.env.local`.

### 3. Настройка базы данных

```bash
# Применить схему к БД
npx prisma db push

# Открыть Prisma Studio для просмотра данных
npx prisma studio
```

### 4. Запуск проекта

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Структура проекта

```
app/
├── app/
│   ├── (auth)/          # Страницы авторизации
│   ├── (dashboard)/     # Защищенные страницы
│   ├── api/             # API routes
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Главная страница
│   └── globals.css      # Глобальные стили
├── components/          # React компоненты
│   ├── ui/              # shadcn/ui компоненты
│   └── ...
├── lib/
│   ├── db/              # Prisma client
│   └── utils.ts         # Утилиты
├── prisma/
│   ├── schema.prisma    # БД схема
│   └── seed.ts          # Seed данные
└── public/              # Статические файлы
```

## Доступные команды

```bash
npm run dev          # Запуск dev сервера
npm run build        # Production build
npm run start        # Запуск production сервера
npm run lint         # ESLint проверка
npm run db:push      # Применить Prisma схему к БД
npm run db:studio    # Открыть Prisma Studio
npm run db:seed      # Заполнить БД seed данными
```

## Дизайн система

### Цвета (Vogue Style)

- **Черный:** `#000000` - Основной фон
- **Кремовый:** `#F5F5DC` - Текст и акценты
- **Золотой:** `#D4AF37` - Premium элементы

### Кастомные классы

- `vogue-gradient` - Градиент фона
- `gold-gradient` - Золотой градиент
- `glass-card` - Glassmorphism карточка
- `premium-badge` - Premium бейдж
- `btn-gold-hover` - Hover эффект для кнопок

## Монетизация

- **FREE:** 3 генерации/день, только студия фон
- **PREMIUM:** Безлимит генераций, все локации и палитры
- **LIFETIME:** Как PREMIUM, без подписки

## Документация

- [АРХИТЕКТУРА.md](../АРХИТЕКТУРА.md) - Полная техническая документация
- [PROMPTS_LOCATIONS.md](../PROMPTS_LOCATIONS.md) - AI промпты для локаций
- [LOCATIONS_INTEGRATION.md](../LOCATIONS_INTEGRATION.md) - Инструкция по интеграции локаций

## Лицензия

Proprietary - All rights reserved
