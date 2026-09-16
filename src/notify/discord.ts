import type { FoundProduct } from "../types.js";

const DISCORD_EMBED_COLOR = 0xffcb05; // Pokemon-keltainen

export async function sendDiscordNotification(
  webhookUrl: string,
  product: FoundProduct,
): Promise<void> {
  const embed = {
    title: product.name,
    url: product.url,
    color: DISCORD_EMBED_COLOR,
    description: product.matchedKeyword
      ? `Löytyi hakusanalla **${product.matchedKeyword}**`
      : undefined,
    fields: [
      { name: "Kauppa", value: product.shopName, inline: true },
      ...(product.price ? [{ name: "Hinta", value: product.price, inline: true }] : []),
    ],
    image: product.imageUrl ? { url: product.imageUrl } : undefined,
    timestamp: new Date().toISOString(),
  };

  const body = {
    content: `🔔 **${product.name}** on nyt saatavilla kaupassa **${product.shopName}**!`,
    embeds: [embed],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Discord-webhook epäonnistui (${res.status}): ${text}`);
  }
}

/** Discordin webhook-rajapinta rajoittaa noin 30 viestiin/min per webhook. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
