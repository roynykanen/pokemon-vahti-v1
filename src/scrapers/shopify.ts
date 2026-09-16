import type { ShopConfig, FoundProduct, KeywordFilter } from "../types.js";
import { matchKeyword, withinPriceLimit } from "../match.js";

interface ShopifyVariant {
  available: boolean;
  price: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  variants: ShopifyVariant[];
  images: { src: string }[];
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

const USER_AGENT = "pokemon-vahti/1.0 (+https://github.com/) - stock watcher bot";

/**
 * Yrittää lukea kaupan julkista Shopify-rajapintaa (/products.json).
 * Palauttaa null jos kauppa ei vaikuta olevan Shopify-alustalla.
 */
export async function fetchShopifyProducts(shop: ShopConfig): Promise<ShopifyProduct[] | null> {
  const url = new URL("/products.json", shop.baseUrl);
  url.searchParams.set("limit", "250");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return null;

  try {
    const data = (await res.json()) as ShopifyProductsResponse;
    if (!Array.isArray(data.products)) return null;
    return data.products;
  } catch {
    return null;
  }
}

export async function scanShopify(
  shop: ShopConfig,
  keywords: KeywordFilter[],
): Promise<FoundProduct[] | null> {
  const products = await fetchShopifyProducts(shop);
  if (products === null) return null;

  const found: FoundProduct[] = [];
  for (const product of products) {
    const matched = matchKeyword(product.title, keywords);
    if (!matched) continue;

    const cheapestVariant = [...product.variants].sort(
      (a, b) => parseFloat(a.price) - parseFloat(b.price),
    )[0];
    const price = cheapestVariant ? parseFloat(cheapestVariant.price) : undefined;
    if (!withinPriceLimit(matched, price)) continue;

    const available = product.variants.some((v) => v.available);

    found.push({
      key: `${shop.id}:${product.handle}`,
      shopId: shop.id,
      shopName: shop.name,
      name: product.title,
      url: new URL(`/products/${product.handle}`, shop.baseUrl).toString(),
      price: cheapestVariant ? `${cheapestVariant.price} €` : undefined,
      imageUrl: product.images[0]?.src,
      available,
      matchedKeyword: matched.keyword,
    });
  }
  return found;
}
