#!/bin/bash
# ===========================================
# LookLikeme — первоначальная настройка сервера
# Запускать от root на Ubuntu 22.04/24.04
# ===========================================

set -e

echo "=== LookLikeme Server Setup ==="

# 1. Обновляем систему
echo ">> Updating system..."
apt update && apt upgrade -y

# 2. Устанавливаем Node.js 20
echo ">> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Устанавливаем PM2
echo ">> Installing PM2..."
npm install -g pm2

# 4. Устанавливаем nginx
echo ">> Installing nginx..."
apt install -y nginx

# 5. Устанавливаем certbot (SSL)
echo ">> Installing certbot..."
apt install -y certbot python3-certbot-nginx

# 6. Устанавливаем git
apt install -y git

# 7. Создаём пользователя deploy
echo ">> Creating deploy user..."
useradd -m -s /bin/bash deploy || echo "User deploy already exists"

# 8. Создаём директории
echo ">> Creating directories..."
mkdir -p /home/deploy/looklikeme/logs
chown -R deploy:deploy /home/deploy/looklikeme

# 9. Клонируем репозиторий
echo ">> Cloning repository..."
su - deploy -c "git clone https://github.com/metaversa13/looklikeme.git /home/deploy/looklikeme/repo || echo 'Already cloned'"
# Если клонирован - используем как есть, иначе линкуем
if [ ! -d "/home/deploy/looklikeme/app" ]; then
    ln -s /home/deploy/looklikeme/repo/app /home/deploy/looklikeme/app
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Следующие шаги:"
echo "1. Настройте DNS: A-запись looklike-me.ru -> IP вашего сервера"
echo "2. Скопируйте nginx конфиг:"
echo "   cp /home/deploy/looklikeme/repo/deploy/nginx.conf /etc/nginx/sites-available/looklikeme"
echo "   ln -s /etc/nginx/sites-available/looklikeme /etc/nginx/sites-enabled/"
echo "   rm /etc/nginx/sites-enabled/default"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "3. Получите SSL сертификат:"
echo "   certbot --nginx -d looklike-me.ru -d www.looklike-me.ru"
echo ""
echo "4. Создайте .env.local в /home/deploy/looklikeme/app/"
echo "   (скопируйте из .env.example и заполните значения)"
echo ""
echo "5. Запустите деплой:"
echo "   su - deploy"
echo "   cd /home/deploy/looklikeme"
echo "   cp repo/deploy/ecosystem.config.js ."
echo "   bash repo/deploy/deploy.sh"
echo ""
echo "6. Настройте PM2 автозапуск:"
echo "   pm2 startup"
echo "   pm2 save"
