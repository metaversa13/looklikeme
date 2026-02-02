import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const YANDEX_SEARCH_FOLDER_ID = process.env.YANDEX_SEARCH_FOLDER_ID || "";
const YANDEX_CLOUD_OAUTH_TOKEN = process.env.YANDEX_CLOUD_OAUTH_TOKEN || "";
const YANDEX_SEARCH_URL = "https://searchapi.api.cloud.yandex.net/v2/image/search_by_image";

// Кэш IAM-токена (живёт ~12 часов)
let cachedIamToken = "";
let iamTokenExpiry = 0;

async function getIamToken(): Promise<string> {
  if (cachedIamToken && Date.now() < iamTokenExpiry) {
    return cachedIamToken;
  }

  console.log("Getting new IAM token from OAuth...");
  const response = await fetch("https://iam.api.cloud.yandex.net/iam/v1/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ yandexPassportOauthToken: YANDEX_CLOUD_OAUTH_TOKEN }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("IAM token error:", response.status, err);
    throw new Error(`Failed to get IAM token: ${response.status}`);
  }

  const data = await response.json();
  cachedIamToken = data.iamToken;
  // Обновляем за час до истечения
  iamTokenExpiry = Date.now() + 11 * 60 * 60 * 1000;
  console.log("IAM token obtained successfully");
  return cachedIamToken;
}

// Маркетплейсы для фильтрации
const MARKETPLACES = [
  { domain: "wildberries.ru", name: "Wildberries", icon: "🟣" },
  { domain: "ozon.ru", name: "Ozon", icon: "🔵" },
  { domain: "market.yandex.ru", name: "Яндекс Маркет", icon: "🟡" },
];

const FALLBACK_MARKETPLACES = [
  { domain: "aliexpress.ru", name: "AliExpress", icon: "🟠" },
  { domain: "aliexpress.com", name: "AliExpress", icon: "🟠" },
];

interface MarketplaceProduct {
  title: string;
  url: string;
  image: string;
  marketplace: string;
  icon: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageBase64, imageUrl } = body;

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json({ error: "imageBase64 or imageUrl is required" }, { status: 400 });
    }

    if (!YANDEX_CLOUD_OAUTH_TOKEN || !YANDEX_SEARCH_FOLDER_ID) {
      return NextResponse.json(
        { error: "Yandex Search API not configured" },
        { status: 500 }
      );
    }

    let base64Image = imageBase64 || "";

    // Если передан URL, пробуем загрузить
    if (!base64Image && imageUrl) {
      console.log("Fetching image from:", imageUrl.substring(0, 100));
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        console.error("Failed to fetch image:", imageResponse.status);
        return NextResponse.json({ error: "Failed to fetch image" }, { status: 400 });
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      base64Image = Buffer.from(imageBuffer).toString("base64");
    }

    // Убираем data:image prefix если есть
    if (base64Image.includes(",")) {
      base64Image = base64Image.split(",")[1];
    }

    console.log("Sending to Yandex Search API, image size:", base64Image.length, "chars");

    // Получаем IAM-токен
    const iamToken = await getIamToken();

    // Запрос к Yandex Search API
    const searchResponse = await fetch(YANDEX_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${iamToken}`,
      },
      body: JSON.stringify({
        folderId: YANDEX_SEARCH_FOLDER_ID,
        data: base64Image,
        page: "0",
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Yandex Search API error:", searchResponse.status, errorText);
      return NextResponse.json(
        { error: "Search API error", details: errorText },
        { status: 502 }
      );
    }

    const searchData = await searchResponse.json();
    console.log("Yandex Search API response keys:", Object.keys(searchData));
    console.log("Yandex Search API response (first 500 chars):", JSON.stringify(searchData).substring(0, 500));

    // Парсим результаты и фильтруем по маркетплейсам
    const allResults = parseSearchResults(searchData);
    console.log("Parsed results:", allResults.length, "total");

    // Фильтруем: сначала основные маркетплейсы
    let products = filterByMarketplaces(allResults, MARKETPLACES);

    // Если ничего не нашли — пробуем AliExpress
    if (products.length === 0) {
      products = filterByMarketplaces(allResults, FALLBACK_MARKETPLACES);
    }

    return NextResponse.json({
      success: true,
      products,
      totalFound: allResults.length,
    });
  } catch (error: unknown) {
    console.error("Marketplace search error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

function parseSearchResults(data: Record<string, unknown>): Array<{ title: string; url: string; image: string }> {
  const results: Array<{ title: string; url: string; image: string }> = [];

  try {
    // Yandex Search API возвращает результаты в разных форматах
    // Пробуем извлечь из response.results или response.groups
    const response = data as Record<string, unknown>;

    // Формат 1: массив results
    if (Array.isArray(response.results)) {
      for (const item of response.results) {
        const r = item as Record<string, unknown>;
        if (r.url && r.title) {
          results.push({
            title: String(r.title || ""),
            url: String(r.url || ""),
            image: String(r.image || r.thumbnail || r.preview || ""),
          });
        }
      }
    }

    // Формат 2: groups с документами
    if (Array.isArray(response.groups)) {
      for (const group of response.groups) {
        const g = group as Record<string, unknown>;
        const docs = (g.documents || g.docs) as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(docs)) {
          for (const doc of docs) {
            results.push({
              title: String(doc.title || doc.snippet || ""),
              url: String(doc.url || ""),
              image: String(doc.image || doc.thumbnail || doc.preview || ""),
            });
          }
        }
      }
    }

    // Формат 3: image_results (SerpAPI-like)
    if (Array.isArray(response.image_results)) {
      for (const item of response.image_results) {
        const r = item as Record<string, unknown>;
        results.push({
          title: String(r.title || r.snippet || ""),
          url: String(r.source_url || r.url || r.link || ""),
          image: String(r.thumbnail || r.image || ""),
        });
      }
    }

    // Формат 4: shopping_results
    if (Array.isArray(response.shopping_results)) {
      for (const item of response.shopping_results) {
        const r = item as Record<string, unknown>;
        results.push({
          title: String(r.title || ""),
          url: String(r.link || r.url || ""),
          image: String(r.thumbnail || r.image || ""),
        });
      }
    }
  } catch (e) {
    console.error("Error parsing search results:", e);
  }

  return results;
}

function filterByMarketplaces(
  results: Array<{ title: string; url: string; image: string }>,
  marketplaces: Array<{ domain: string; name: string; icon: string }>
): MarketplaceProduct[] {
  const products: MarketplaceProduct[] = [];

  for (const result of results) {
    for (const mp of marketplaces) {
      if (result.url.includes(mp.domain)) {
        products.push({
          title: result.title || "Товар",
          url: result.url,
          image: result.image,
          marketplace: mp.name,
          icon: mp.icon,
        });
        break;
      }
    }
  }

  return products;
}
