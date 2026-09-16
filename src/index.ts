import "dotenv/config";
import { loadConfig } from "./config.js";
import { loadState, saveState, type State } from "./state.js";
import { scanShop } from "./scrapers/index.js";
import { checkProductPage } from "./scrapers/generic.js";
import { sendDiscordNotification, sleep } from "./notify/discord.js";
import { normalizeKeywords } from "./match.js";
import type { FoundProduct } from "./types.js";

const args = process.argv.slice(2);
const runOnce = args.includes("--once");
const configPathArg = argValue("--config");
const statePathArg = argValue("--state");

function argValue(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

async function runCheck(webhookUrl: string, configPath?: string, statePath?: string) {
  const config = await loadConfig(configPath);
  const state: State = await loadState(statePath);
  const keywords = normalizeKeywords(config.keywords);

  const found: FoundProduct[] = [];

  for (const shop of config.shops) {
    if (shop.disabled) continue;
    try {
      const results = await scanShop(shop, keywords);
      found.push(...results);
      console.log(`[${shop.name}] ${results.length} osumaa hakusanoilla.`);
    } catch (err) {
      console.error(`[${shop.name}] virhe tarkistuksessa:`, (err as Error).message);
    }
  }

  for (const product of config.watchedProducts ?? []) {
    try {
      const available = await checkProductPage(product.url);
      if (available === undefined) {
        console.warn(`[${product.name}] varastotilannetta ei voitu päätellä sivulta.`);
        continue;
      }
      found.push({
        key: `watched:${product.url}`,
        shopId: "watched",
        shopName: product.shopName ?? "Seurattu tuote",
        name: product.name,
        url: product.url,
        available,
      });
    } catch (err) {
      console.error(`[${product.name}] virhe tarkistuksessa:`, (err as Error).message);
    }
  }

  let notified = 0;
  for (const product of found) {
    const prev = state[product.key];
    const becameAvailable = product.available && !prev?.available;

    state[product.key] = {
      available: product.available,
      lastSeen: new Date().toISOString(),
      lastNotifiedAt: becameAvailable ? new Date().toISOString() : prev?.lastNotifiedAt,
    };

    if (!becameAvailable) continue;

    try {
      await sendDiscordNotification(webhookUrl, product);
      console.log(`Ilmoitus lähetetty: ${product.name} (${product.shopName})`);
      notified++;
      await sleep(1000); // vältä Discordin rate limit useassa peräkkäisessä ilmoituksessa
    } catch (err) {
      console.error(`Discord-ilmoitus epäonnistui tuotteelle ${product.name}:`, (err as Error).message);
    }
  }

  await saveState(state, statePath);
  console.log(
    `Tarkistus valmis: ${found.length} osumaa, ${notified} uutta ilmoitusta, ${new Date().toISOString()}`,
  );
}

async function main() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("DISCORD_WEBHOOK_URL puuttuu ympäristömuuttujista (katso .env.example).");
    process.exit(1);
  }

  if (runOnce) {
    await runCheck(webhookUrl, configPathArg, statePathArg);
    return;
  }

  const config = await loadConfig(configPathArg);
  const intervalMs = (config.intervalMinutes ?? 10) * 60_000;
  console.log(`Käynnistetään jatkuva vahti, tarkistusväli ${config.intervalMinutes ?? 10} min.`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await runCheck(webhookUrl, configPathArg, statePathArg);
    } catch (err) {
      console.error("Tarkistuskierros epäonnistui:", err);
    }
    await sleep(intervalMs);
  }
}

main().catch((err) => {
  console.error("Odottamaton virhe:", err);
  process.exit(1);
});
