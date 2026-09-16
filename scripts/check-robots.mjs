import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../config/config.json", import.meta.url)));

const PATHS_WE_HIT = ["/products.json", "/search"];

function parseDisallows(robotsTxt) {
  // Ottaa huomioon vain User-agent: * -lohkon (yksinkertaistus, riittää karkeaan tarkistukseen).
  const lines = robotsTxt.split(/\r?\n/);
  const disallows = [];
  let inWildcardBlock = false;
  let sawAnyUserAgent = false;
  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (/^user-agent$/i.test(key)) {
      sawAnyUserAgent = true;
      inWildcardBlock = value === "*";
    } else if (/^disallow$/i.test(key) && (inWildcardBlock || !sawAnyUserAgent)) {
      // Tyhjä Disallow-arvo tarkoittaa robots.txt-standardin mukaan "ei rajoituksia",
      // ei "kaikki kielletty" - jätetään siis tallentamatta.
      if (value) disallows.push(value);
    }
  }
  return disallows;
}

async function checkShop(shop) {
  const robotsUrl = new URL("/robots.txt", shop.baseUrl).toString();
  let status;
  let disallows = [];
  let error;
  try {
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": "pokemon-vahti/1.0 (+https://github.com/) - stock watcher bot" },
    });
    status = res.status;
    if (res.ok) {
      const text = await res.text();
      disallows = parseDisallows(text);
    }
  } catch (err) {
    error = err.cause?.code ? `${err.message} (${err.cause.code})` : err.message;
  }

  const blanketDisallow = disallows.includes("/");
  const hitsBlocked = PATHS_WE_HIT.filter((p) =>
    disallows.some((d) => d && p.startsWith(d)),
  );

  return { shop: shop.name, baseUrl: shop.baseUrl, robotsUrl, status, error, disallows, blanketDisallow, hitsBlocked };
}

const results = await Promise.all(config.shops.map(checkShop));

console.log("\n=== robots.txt-tarkistus ===\n");
for (const r of results) {
  console.log(`--- ${r.shop} (${r.baseUrl}) ---`);
  if (r.error) {
    console.log(`  Ei saatu haettua: ${r.error}`);
  } else if (r.status === 404) {
    console.log(`  Ei robots.txt-tiedostoa (404) - ei rajoituksia määritelty.`);
  } else if (r.status !== 200) {
    console.log(`  HTTP ${r.status} robots.txt:lle.`);
  } else {
    console.log(`  Disallow-säännöt (User-agent: * tai globaali): ${r.disallows.length ? r.disallows.join(", ") : "(ei yhtään)"}`);
    if (r.blanketDisallow) console.log(`  ⚠️  KOKO SIVUSTO KIELLETTY (Disallow: /)`);
    if (r.hitsBlocked.length) console.log(`  ⚠️  Käyttämämme polut kielletty: ${r.hitsBlocked.join(", ")}`);
    if (!r.blanketDisallow && r.hitsBlocked.length === 0) console.log(`  OK - ei estä /products.json tai /search -polkuja.`);
  }
  console.log("");
}

const problems = results.filter((r) => r.blanketDisallow || r.hitsBlocked.length > 0);
console.log("=== Yhteenveto ===");
console.log(`${results.length} kauppaa tarkistettu, ${problems.length} vaatii huomiota.`);
if (problems.length) {
  console.log("Huomiota vaativat:", problems.map((p) => p.shop).join(", "));
}
