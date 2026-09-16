import { describe, it, expect } from "vitest";
import {
  matchKeyword,
  guessAvailability,
  normalize,
  normalizeKeywords,
  parsePrice,
  withinPriceLimit,
} from "../src/match.js";

describe("normalize", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalize("Pokémon 30th Ännïversary")).toBe("pokemon 30th anniversary");
  });
});

describe("normalizeKeywords", () => {
  it("wraps plain strings into {keyword} objects", () => {
    expect(normalizeKeywords(["151"])).toEqual([{ keyword: "151" }]);
  });

  it("passes {keyword, maxPrice} objects through unchanged", () => {
    const filter = { keyword: "30th anniversary", maxPrice: 100 };
    expect(normalizeKeywords([filter])).toEqual([filter]);
  });
});

describe("matchKeyword", () => {
  const kw = normalizeKeywords(["30th anniversary"]);

  it("finds a keyword case-insensitively", () => {
    expect(matchKeyword("Pokemon TCG 30th Anniversary Collection", kw)).toEqual({
      keyword: "30th anniversary",
    });
  });

  it("returns undefined when nothing matches", () => {
    expect(matchKeyword("Pokemon Scarlet & Violet", kw)).toBeUndefined();
  });

  it("matches despite diacritics", () => {
    expect(
      matchKeyword("Pokémon 30-vuotisjuhla erikoiserä", normalizeKeywords(["30-vuotisjuhla"])),
    ).toEqual({ keyword: "30-vuotisjuhla" });
  });
});

describe("parsePrice", () => {
  it("parses Finnish-style comma decimals with currency symbol", () => {
    expect(parsePrice("49,90 €")).toBeCloseTo(49.9);
  });

  it("parses plain numeric strings", () => {
    expect(parsePrice("59.90")).toBeCloseTo(59.9);
  });

  it("returns undefined for unparseable text", () => {
    expect(parsePrice("Ei varastossa")).toBeUndefined();
    expect(parsePrice(undefined)).toBeUndefined();
  });
});

describe("withinPriceLimit", () => {
  it("allows anything when maxPrice is not set", () => {
    expect(withinPriceLimit({ keyword: "x" }, 999)).toBe(true);
  });

  it("allows through when price is unknown, even with a maxPrice set", () => {
    expect(withinPriceLimit({ keyword: "x", maxPrice: 50 }, undefined)).toBe(true);
  });

  it("rejects prices above the limit", () => {
    expect(withinPriceLimit({ keyword: "x", maxPrice: 50 }, 51)).toBe(false);
  });

  it("allows prices at or below the limit", () => {
    expect(withinPriceLimit({ keyword: "x", maxPrice: 50 }, 50)).toBe(true);
    expect(withinPriceLimit({ keyword: "x", maxPrice: 50 }, 49)).toBe(true);
  });
});

describe("guessAvailability", () => {
  it("detects Finnish in-stock phrases", () => {
    expect(guessAvailability("Tuote on varastossa. Lisää ostoskoriin")).toBe(true);
  });

  it("detects Finnish out-of-stock phrases", () => {
    expect(guessAvailability("Valitettavasti loppuunmyyty")).toBe(false);
  });

  it("prefers out-of-stock signal when both appear", () => {
    expect(guessAvailability("Osta nyt - tuote on tällä hetkellä loppuunmyyty")).toBe(false);
  });

  it("returns undefined when no signal is present", () => {
    expect(guessAvailability("Pokemon-kortit ovat suosittuja keräilykohteita")).toBeUndefined();
  });
});
