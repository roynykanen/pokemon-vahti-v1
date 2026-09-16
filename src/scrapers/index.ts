import type { ShopConfig, FoundProduct, KeywordFilter } from "../types.js";
import { scanShopify } from "./shopify.js";
import { scanHtmlSearch } from "./generic.js";

export async function scanShop(
  shop: ShopConfig,
  keywords: KeywordFilter[],
): Promise<FoundProduct[]> {
  const platform = shop.platform ?? "auto";

  if (platform === "shopify" || platform === "auto") {
    const shopifyResults = await scanShopify(shop, keywords);
    if (shopifyResults !== null) return shopifyResults;
    if (platform === "shopify") return [];
  }

  return scanHtmlSearch(shop, keywords);
}
