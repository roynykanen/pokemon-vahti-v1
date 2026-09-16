import * as cheerio from "cheerio";
import type { ShopConfig, FoundProduct, KeywordFilter } from "../types.js";
import { matchKeyword, guessAvailability, parsePrice, withinPriceLimit } from "../match.js";

const USER_AGENT = "pokemon-vahti/1.0 (+https://github.com/) - stock watcher bot";

const DEFAULT_ITEM_SELECTORS = [
  "[class*='product-card']",
  "[class*='product-item']",
  "[class*='product-list'] li",
  "li.product",
  "article.product",
  ".product",
];

function buildSearchUrl(shop: ShopConfig, keyword: string): string {
  const template = shop.searchUrlTemplate ?? "{baseUrl}/search?q={query}";
  return template
    .replace("{baseUrl}", shop.baseUrl.replace(/\/$/, ""))
    .replace("{query}", encodeURIComponent(keyword));
}

/**
 * Yleinen, heuristiikkaan perustuva HTML-hakusivun jäsennin. Toimii "parhaan
 * yrityksen" periaatteella kaupoille, joiden alustaa ei tunneta etukäteen.
 * Jos shop.html.itemSelector on annettu, käytetään sitä muiden heuristiikkojen
 * sijaan.
 */
export async function scanHtmlSearch(
  shop: ShopConfig,
  keywords: KeywordFilter[],
): Promise<FoundProduct[]> {
  const found: FoundProduct[] = [];

  // Jos searchUrlTemplate ei sisällä {query}-paikkamerkkiä (esim. kiinteä
  // kategoriasivu), sama URL toistuisi jokaiselle hakusanalle - haetaan se
  // silloin vain kerran ja verrataan sivun sisältöä kaikkiin hakusanoihin.
  const urls = new Set(keywords.map((k) => buildSearchUrl(shop, k.keyword)));

  for (const url of urls) {
    let res: Response;
    try {
      res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    } catch {
      continue;
    }
    if (!res.ok) continue;

    const html = await res.text();
    const $ = cheerio.load(html);

    const itemSelectors = shop.html?.itemSelector
      ? [shop.html.itemSelector]
      : DEFAULT_ITEM_SELECTORS;

    const items = itemSelectors.flatMap((sel) => $(sel).toArray());
    if (items.length === 0) continue;

    for (const el of items) {
      const $el = $(el);
      const text = $el.text();
      const matched = matchKeyword(text, keywords);
      if (!matched) continue;

      const name = (
        shop.html?.nameSelector ? $el.find(shop.html.nameSelector).first().text() : undefined
      )?.trim() || guessProductName($el, $);
      if (!name) continue;

      const link = shop.html?.linkSelector
        ? $el.find(shop.html.linkSelector).first().attr("href")
        : $el.is("a")
          ? $el.attr("href")
          : $el.find("a").first().attr("href");
      if (!link) continue;

      const absoluteUrl = new URL(link, shop.baseUrl).toString();
      const price = shop.html?.priceSelector
        ? $el.find(shop.html.priceSelector).first().text().trim() || undefined
        : undefined;
      if (!withinPriceLimit(matched, parsePrice(price))) continue;

      found.push({
        key: `${shop.id}:${absoluteUrl}`,
        shopId: shop.id,
        shopName: shop.name,
        name,
        url: absoluteUrl,
        price,
        available: guessAvailability(text) ?? true,
        matchedKeyword: matched.keyword,
      });
    }
  }

  return dedupe(found);
}

function guessProductName($el: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string | undefined {
  const candidates = ["h1", "h2", "h3", "[class*='title']", "[class*='name']", "a"];
  for (const sel of candidates) {
    const text = $el.find(sel).first().text().trim();
    if (text) return text;
  }
  return $el.text().trim().slice(0, 120) || undefined;
}

function dedupe(products: FoundProduct[]): FoundProduct[] {
  const seen = new Map<string, FoundProduct>();
  for (const p of products) seen.set(p.key, p);
  return [...seen.values()];
}

/** Tarkistaa yksittäisen tuotesivun varastotilanteen tekstiheuristiikalla. */
export async function checkProductPage(url: string): Promise<boolean | undefined> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  } catch {
    return undefined;
  }
  if (!res.ok) return undefined;
  const html = await res.text();
  const $ = cheerio.load(html);
  return guessAvailability($("body").text());
}
