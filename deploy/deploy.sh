#!/bin/bash
# ===========================================
# LookLikeme — скрипт деплоя на сервер
# Запускать на сервере: bash deploy.sh
# ===========================================

set -e

APP_DIR="/home/deploy/looklikeme"
REPO_URL="https://github.com/metaversa13/looklikeme.git"

echo "=== LookLikeme Deploy ==="

# Переходим в директорию проекта
cd "$APP_DIR"

# Обновляем код из Git
echo ">> Pulling latest code..."
git pull origin master

# Устанавливаем зависимости
echo ">> Installing dependencies..."
cd app
npm ci --production=false

# Генерируем Prisma клиент и билдим
echo ">> Building..."
npx prisma generate
npm run build

# Перезапускаем PM2
echo ">> Restarting PM2..."
pm2 restart ecosystem.config.js --update-env || pm2 start ecosystem.config.js

echo "=== Deploy complete! ==="
