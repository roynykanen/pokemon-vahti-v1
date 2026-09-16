import type { KeywordConfig, KeywordFilter } from "./types.js";

/** Normalisoi tekstin vertailua varten: pienet kirjaimet ja diakriitit pois. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Muuntaa config.json:in keywords-listan (string tai {keyword, maxPrice}) yhtenäiseen muotoon. */
export function normalizeKeywords(keywords: KeywordConfig[]): KeywordFilter[] {
  return keywords.map((k) => (typeof k === "string" ? { keyword: k } : k));
}

/** Palauttaa ensimmäisen hakusanan (ja mahdollisen hintarajan) joka löytyy tekstistä, tai undefined. */
export function matchKeyword(text: string, keywords: KeywordFilter[]): KeywordFilter | undefined {
  const normalizedText = normalize(text);
  return keywords.find((k) => normalizedText.includes(normalize(k.keyword)));
}

/**
 * Jäsentää hintatekstin numeroksi, esim. "49,90 €", "€49.90", "49.90" -> 49.9.
 * Palauttaa undefined jos tekstistä ei löydy tulkittavaa lukua.
 */
export function parsePrice(priceText: string | undefined): number | undefined {
  if (!priceText) return undefined;
  const match = priceText.replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return undefined;
  const normalized = match[1].replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Tarkistaa täyttääkö tuote hakusanan hintarajan (jos asetettu). Jos
 * maxPrice on asetettu mutta hintaa ei tunneta, sallitaan osuma silti läpi
 * (ei voida päätellä paremmin ilman hintaselektoria).
 */
export function withinPriceLimit(filter: KeywordFilter, price: number | undefined): boolean {
  if (filter.maxPrice === undefined) return true;
  if (price === undefined) return true;
  return price <= filter.maxPrice;
}

const IN_STOCK_PATTERNS = [
  "lisää ostoskoriin",
  "lisaa ostoskoriin",
  "osta nyt",
  "varastossa",
  "saatavilla",
  "toimitusajassa",
  "add to cart",
  "add to basket",
  "in stock",
  "buy now",
];

const OUT_OF_STOCK_PATTERNS = [
  "loppuunmyyty",
  "loppuunmyydty",
  "ei varastossa",
  "tilapäisesti loppu",
  "tilapaisesti loppu",
  "ei saatavilla",
  "myyty loppuun",
  "sold out",
  "out of stock",
  "unavailable",
  "notify me",
  "ilmoita kun saatavilla",
];

/**
 * Yksinkertainen heuristiikka varastotilanteen päättelyyn tekstikatkelmasta
 * (esim. tuotekortin tai -sivun teksti). Palauttaa true/false/undefined jos
 * tilaa ei voida päätellä tekstistä.
 */
export function guessAvailability(text: string): boolean | undefined {
  const normalizedText = normalize(text);
  const isOut = OUT_OF_STOCK_PATTERNS.some((p) => normalizedText.includes(normalize(p)));
  if (isOut) return false;
  const isIn = IN_STOCK_PATTERNS.some((p) => normalizedText.includes(normalize(p)));
  if (isIn) return true;
  return undefined;
}
