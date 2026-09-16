import { describe, it, expect, vi, afterEach } from "vitest";
import { scanShopify } from "../src/scrapers/shopify.js";
import { normalizeKeywords } from "../src/match.js";
import type { ShopConfig } from "../src/types.js";

const shop: ShopConfig = {
  id: "test-shop",
  name: "Test Shop",
  baseUrl: "https://example.fi",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockJsonResponse(body: unknown, ok = true) {
  return {
    ok,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body,
  } as Response;
}

describe("scanShopify", () => {
  it("returns null when the endpoint is not Shopify (non-json)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, headers: new Headers({ "content-type": "text/html" }) }) as Response),
    );
    const result = await scanShopify(shop, normalizeKeywords(["30th anniversary"]));
    expect(result).toBeNull();
  });

  it("returns null when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, headers: new Headers() }) as Response),
    );
    const result = await scanShopify(shop, normalizeKeywords(["30th anniversary"]));
    expect(result).toBeNull();
  });

  it("matches products by keyword and reports availability", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        mockJsonResponse({
          products: [
            {
              id: 1,
              title: "Pokemon TCG 30th Anniversary Collection",
              handle: "pokemon-30th-anniversary",
              variants: [{ available: true, price: "59.90" }],
              images: [{ src: "https://example.fi/img.jpg" }],
            },
            {
              id: 2,
              title: "Pokemon Scarlet & Violet Booster",
              handle: "sv-booster",
              variants: [{ available: false, price: "5.90" }],
              images: [],
            },
          ],
        }),
      ),
    );

    const result = await scanShopify(shop, normalizeKeywords(["30th anniversary"]));
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({
      shopId: "test-shop",
      name: "Pokemon TCG 30th Anniversary Collection",
      url: "https://example.fi/products/pokemon-30th-anniversary",
      available: true,
      matchedKeyword: "30th anniversary",
    });
  });

  it("skips a match priced above the keyword's maxPrice", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        mockJsonResponse({
          products: [
            {
              id: 1,
              title: "Pokemon TCG 30th Anniversary Collection",
              handle: "pokemon-30th-anniversary",
              variants: [{ available: true, price: "199.90" }],
              images: [],
            },
          ],
        }),
      ),
    );

    const result = await scanShopify(shop, [{ keyword: "30th anniversary", maxPrice: 100 }]);
    expect(result).toEqual([]);
  });

  it("includes a match priced at or below the keyword's maxPrice", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        mockJsonResponse({
          products: [
            {
              id: 1,
              title: "Pokemon TCG 30th Anniversary Collection",
              handle: "pokemon-30th-anniversary",
              variants: [{ available: true, price: "89.90" }],
              images: [],
            },
          ],
        }),
      ),
    );

    const result = await scanShopify(shop, [{ keyword: "30th anniversary", maxPrice: 100 }]);
    expect(result).toHaveLength(1);
  });
});
