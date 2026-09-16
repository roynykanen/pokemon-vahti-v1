import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "./types.js";

const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), "config/config.json");

export async function loadConfig(configPath = DEFAULT_CONFIG_PATH): Promise<AppConfig> {
  const raw = await readFile(configPath, "utf-8");
  const config = JSON.parse(raw) as AppConfig;

  if (!Array.isArray(config.keywords) || config.keywords.length === 0) {
    throw new Error("config.json: 'keywords' on pakollinen eikä saa olla tyhjä.");
  }
  for (const k of config.keywords) {
    const keyword = typeof k === "string" ? k : k.keyword;
    if (!keyword) {
      throw new Error(`config.json: hakusanalta puuttuu 'keyword': ${JSON.stringify(k)}`);
    }
  }
  if (!Array.isArray(config.shops)) {
    throw new Error("config.json: 'shops' puuttuu.");
  }
  const ids = new Set<string>();
  for (const shop of config.shops) {
    if (!shop.id || !shop.baseUrl || !shop.name) {
      throw new Error(`config.json: kaupalta puuttuu id/name/baseUrl: ${JSON.stringify(shop)}`);
    }
    if (ids.has(shop.id)) {
      throw new Error(`config.json: kaupan id "${shop.id}" on määritelty useaan kertaan.`);
    }
    ids.add(shop.id);
  }

  return config;
}
