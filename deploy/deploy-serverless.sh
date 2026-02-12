#!/bin/bash
# ===========================================
# LookLikeme — деплой в Yandex Serverless Containers
# Запускать с локальной машины (нужен yc CLI + Docker)
# ===========================================

set -e

# ---- НАСТРОЙКИ (заполнить свои) ----
REGISTRY_ID="<your-registry-id>"        # ID Container Registry
CONTAINER_ID="<your-container-id>"      # ID Serverless Container
IMAGE_NAME="looklikeme"
TAG="latest"
# ------------------------------------

FULL_IMAGE="cr.yandex/${REGISTRY_ID}/${IMAGE_NAME}:${TAG}"

echo "=== LookLikeme Serverless Deploy ==="

# 1. Собираем Docker образ
echo ">> Building Docker image..."
cd "$(dirname "$0")/../app"
docker build -t "${FULL_IMAGE}" .

# 2. Логинимся в Yandex Container Registry
echo ">> Logging in to Yandex Container Registry..."
yc container registry configure-docker

# 3. Пушим образ
echo ">> Pushing image..."
docker push "${FULL_IMAGE}"

# 4. Обновляем Serverless Container
echo ">> Updating Serverless Container..."
yc serverless container revision deploy \
  --container-id "${CONTAINER_ID}" \
  --image "${FULL_IMAGE}" \
  --cores 1 \
  --memory 512m \
  --concurrency 4 \
  --execution-timeout 120s \
  --service-account-id "$(yc iam service-account get --name looklikeme-sa --format json | jq -r .id)" \
  --environment "NODE_ENV=production"

echo ""
echo "=== Deploy complete! ==="
echo "URL: https://$(yc serverless container get --id ${CONTAINER_ID} --format json | jq -r .url)"
