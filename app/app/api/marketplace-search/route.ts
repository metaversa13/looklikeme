import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const YANDEX_SEARCH_FOLDER_ID = process.env.YANDEX_SEARCH_FOLDER_ID || "";
const YANDEX_SEARCH_API_KEY = process.env.YANDEX_SEARCH_API_KEY || "";
const YANDEX_SEARCH_URL = "https://searchapi.api.cloud.yandex.net/v2/image/search_by_image";
const YANDEX_OPERATIONS_URL = "https://operation.api.cloud.yandex.net/operations";

// Маркетплейсы для фильтрации
const MARKETPLACES = [
  { domain: "wildberries.ru", name: "Wildberries", icon: "🟣" },
  { domain: "ozon.ru", name: "Ozon", icon: "🔵" },
  { domain: "market.yandex.ru", name: "Яндекс Маркет", icon: "🟡" },
  { domain: "lamoda.ru", name: "Lamoda", icon: "🖤" },
];

const FALLBACK_MARKETPLACES = [
  { domain: "aliexpress.ru", name: "AliExpress", icon: "🟠" },
  { domain: "aliexpress.com", name: "AliExpress", icon: "🟠" },
  { domain: "quelle.ru", name: "Quelle", icon: "🔴" },
  { domain: "otto.de", name: "Otto", icon: "🟤" },
  { domain: "otto.ru", name: "Otto", icon: "🟤" },
];

interface MarketplaceProduct {
  title: string;
  url: string;
  image: string;
  marketplace: string;
  icon: string;
  price?: number | null;
}

// Извлечь цену из текста (ищем паттерны: "1 234 руб", "1234₽", "от 999", "1,234.00")
function extractPrice(text: string): number | null {
  if (!text) return null;
  // "1 234 руб" / "1234₽" / "1 234 ₽" / "от 1234"
  const match = text.match(/(\d[\d\s.,]*\d)\s*(?:руб|₽|р\.|rub)/i)
    || text.match(/(?:от|price|цена)\s*(\d[\d\s.,]*\d)/i);
  if (match) {
    const cleaned = match[1].replace(/\s/g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    if (num > 0 && num < 10_000_000) return Math.round(num);
  }
  return null;
}

// Ожидание завершения асинхронной операции
async function waitForOperation(operationId: string, maxAttempts = 30): Promise<Record<string, unknown>> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${YANDEX_OPERATIONS_URL}/${operationId}`, {
      headers: { Authorization: `Api-Key ${YANDEX_SEARCH_API_KEY}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Operation check failed: ${res.status} ${err}`);
    }

    const op = await res.json() as Record<string, unknown>;
    console.log(`Operation ${operationId} attempt ${i + 1}: done=${op.done}`);

    if (op.done) {
      if (op.error) {
        const opErr = op.error as Record<string, unknown>;
        throw new Error(`Operation error: ${opErr.message || JSON.stringify(opErr)}`);
      }
      return op.response as Record<string, unknown>;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Operation timeout");
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

    if (!YANDEX_SEARCH_API_KEY || !YANDEX_SEARCH_FOLDER_ID) {
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

    console.log("Sending to Yandex Search API v2, image size:", base64Image.length, "chars");

    // Один запрос к API (экономим — 0.95 руб за запрос)
    const searchResponse = await fetch(YANDEX_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Api-Key ${YANDEX_SEARCH_API_KEY}`,
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

    const operationData = await searchResponse.json() as Record<string, unknown>;
    console.log("Search API response:", JSON.stringify(operationData).substring(0, 500));

    let rawResponse: Record<string, unknown>;
    if (operationData.id && operationData.done === false) {
      console.log("Async operation started:", operationData.id);
      rawResponse = await waitForOperation(String(operationData.id));
    } else if (operationData.id && operationData.done === true) {
      if (operationData.error) {
        const opErr = operationData.error as Record<string, unknown>;
        return NextResponse.json(
          { error: "Search error", details: String(opErr.message || JSON.stringify(opErr)) },
          { status: 502 }
        );
      }
      rawResponse = operationData.response as Record<string, unknown>;
    } else {
      rawResponse = operationData;
    }

    let allResults: Array<{ title: string; url: string; image: string }>;
    if (rawResponse?.rawData) {
      const xml = Buffer.from(String(rawResponse.rawData), "base64").toString("utf-8");
      allResults = parseXmlResults(xml);
    } else {
      allResults = parseJsonResults(rawResponse || operationData);
    }

    console.log("Parsed results:", allResults.length, "total");

    // Сначала ищем товары на маркетплейсах
    let products = filterByMarketplaces(allResults, MARKETPLACES);

    if (products.length === 0) {
      products = filterByMarketplaces(allResults, FALLBACK_MARKETPLACES);
    }

    // Если товаров на маркетплейсах не нашлось — показываем все результаты как "Похожие"
    if (products.length === 0 && allResults.length > 0) {
      products = allResults.slice(0, 10).map((r) => {
        let hostname = "";
        try { hostname = new URL(r.url).hostname.replace("www.", ""); } catch { /* ignore */ }
        return {
          title: r.title || "Похожий товар",
          url: r.url,
          image: r.image,
          marketplace: hostname,
          icon: "🔗",
          price: extractPrice(r.title),
        };
      });
    }

    // Сортировка: товары с ценой первые (от дешёвых к дорогим), без цены — в конце
    products.sort((a, b) => {
      if (a.price && b.price) return a.price - b.price;
      if (a.price) return -1;
      if (b.price) return 1;
      return 0;
    });

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

// Парсинг XML-ответа Yandex Search API v2
function parseXmlResults(xml: string): Array<{ title: string; url: string; image: string }> {
  const results: Array<{ title: string; url: string; image: string }> = [];

  try {
    // Извлекаем документы из XML через регулярки
    const docRegex = /<doc>([\s\S]*?)<\/doc>/g;
    let docMatch;

    while ((docMatch = docRegex.exec(xml)) !== null) {
      const docXml = docMatch[1];

      const url = extractTag(docXml, "url") || extractTag(docXml, "page_url") || "";
      const title = extractTag(docXml, "title") || extractTag(docXml, "snippet") || "";
      const image = extractTag(docXml, "img_url") || extractTag(docXml, "thumbnail") || "";

      if (url) {
        results.push({ title: stripHtml(title), url, image });
      }
    }

    // Если <doc> не найдены, пробуем <image-properties> (формат image search)
    if (results.length === 0) {
      const imgRegex = /<img_url>([\s\S]*?)<\/img_url>/g;
      const pageRegex = /<page_url>([\s\S]*?)<\/page_url>/g;
      const snippetRegex = /<snippet>([\s\S]*?)<\/snippet>/g;

      let imgMatch;
      while ((imgMatch = imgRegex.exec(xml)) !== null) {
        const pageMatch = pageRegex.exec(xml);
        const snippetMatch = snippetRegex.exec(xml);

        results.push({
          image: imgMatch[1] || "",
          url: pageMatch ? pageMatch[1] : "",
          title: snippetMatch ? stripHtml(snippetMatch[1]) : "",
        });
      }
    }
  } catch (e) {
    console.error("XML parsing error:", e);
  }

  return results;
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : null;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "").trim();
}

// JSON-парсинг (fallback, если ответ не XML)
function parseJsonResults(data: Record<string, unknown>): Array<{ title: string; url: string; image: string }> {
  const results: Array<{ title: string; url: string; image: string }> = [];

  try {
    if (Array.isArray(data.results)) {
      for (const item of data.results) {
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

    if (Array.isArray(data.groups)) {
      for (const group of data.groups) {
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

    if (Array.isArray(data.image_results)) {
      for (const item of data.image_results) {
        const r = item as Record<string, unknown>;
        results.push({
          title: String(r.title || r.snippet || ""),
          url: String(r.source_url || r.url || r.link || ""),
          image: String(r.thumbnail || r.image || ""),
        });
      }
    }

    // Yandex Search API v2 image search format: { images: [...] }
    if (Array.isArray(data.images)) {
      for (const item of data.images) {
        const r = item as Record<string, unknown>;
        results.push({
          title: String(r.pageTitle || r.passage || ""),
          url: String(r.pageUrl || ""),
          image: String(r.url || ""),
        });
      }
    }
  } catch (e) {
    console.error("JSON parsing error:", e);
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
          price: extractPrice(result.title),
        });
        break;
      }
    }
  }

  return products;
}
