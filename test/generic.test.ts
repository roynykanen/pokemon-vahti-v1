import { describe, it, expect, vi, afterEach } from "vitest";
import { scanHtmlSearch } from "../src/scrapers/generic.js";
import { normalizeKeywords } from "../src/match.js";
import type { ShopConfig } from "../src/types.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const html = `
<html><body>
  <div class="product-card">
    <a href="/tuotteet/1/pokemon-30th-anniversary">
      <h3>Pokemon 30th Anniversary Box</h3>
    </a>
    <span class="price">49,90 €</span>
  </div>
  <div class="product-card">
    <a href="/tuotteet/2/pokemon-scarlet-violet">
      <h3>Pokemon Scarlet &amp; Violet Booster</h3>
    </a>
  </div>
</body></html>
`;

describe("scanHtmlSearch", () => {
  it("fetches a fixed category URL only once even with multiple keywords", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => html }) as Response);
    vi.stubGlobal("fetch", fetchMock);

    const shop: ShopConfig = {
      id: "test-category-shop",
      name: "Test Category Shop",
      baseUrl: "https://example.fi",
      platform: "html",
      searchUrlTemplate: "https://example.fi/kategoriat/kerailykortit",
    };

    const results = await scanHtmlSearch(
      shop,
      normalizeKeywords(["30th anniversary", "celebrations"]),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      name: "Pokemon 30th Anniversary Box",
      url: "https://example.fi/tuotteet/1/pokemon-30th-anniversary",
      matchedKeyword: "30th anniversary",
    });
  });

  it("respects a per-keyword maxPrice when a priceSelector is configured", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => html }) as Response);
    vi.stubGlobal("fetch", fetchMock);

    const shop: ShopConfig = {
      id: "test-price-shop",
      name: "Test Price Shop",
      baseUrl: "https://example.fi",
      platform: "html",
      searchUrlTemplate: "https://example.fi/kategoriat/kerailykortit",
      html: { priceSelector: ".price" },
    };

    const results = await scanHtmlSearch(shop, [{ keyword: "30th anniversary", maxPrice: 40 }]);
    expect(results).toHaveLength(0);

    const resultsWithHigherLimit = await scanHtmlSearch(shop, [
      { keyword: "30th anniversary", maxPrice: 60 },
    ]);
    expect(resultsWithHigherLimit).toHaveLength(1);
  });

  it("fetches once per distinct search URL when {query} is used", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => html }) as Response);
    vi.stubGlobal("fetch", fetchMock);

    const shop: ShopConfig = {
      id: "test-search-shop",
      name: "Test Search Shop",
      baseUrl: "https://example.fi",
      platform: "html",
      searchUrlTemplate: "{baseUrl}/search?q={query}",
    };

    await scanHtmlSearch(shop, normalizeKeywords(["30th anniversary", "celebrations"]));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
