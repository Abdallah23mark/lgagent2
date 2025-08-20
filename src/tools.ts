import { z } from "zod";
import { TavilySearch } from "@langchain/tavily";
import { tool } from "@langchain/core/tools";

// utility
function extractString(x: unknown): string {
  if (typeof x === "string") return x;
  if (Array.isArray(x)) {
    return x
      .map((m: any) => {
        if (typeof m === "string") return m;
        if (m == null) return "";
        if (typeof m === "object") {
          if ("content" in m) return String(m.content ?? "");
          if ("text" in m) return String(m.text ?? "");
          if ("query" in m) return String(m.query ?? "");
        }
        try {
          return JSON.stringify(m);
        } catch {
          return String(m);
        }
      })
      .filter(Boolean)
      .join(" ");
  }
  if (typeof x === "object" && x !== null) {
    const obj = x as any;
    if ("content" in obj) return String(obj.content ?? "");
    if ("text" in obj) return String(obj.text ?? "");
    if ("query" in obj) return String(obj.query ?? "");
    try {
      return JSON.stringify(obj);
    } catch {
      return String(obj);
    }
  }
  return String(x ?? "");
}

// tavily
async function rawCryptoNews(input: unknown): Promise<string> {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY not set in environment");
  }

  const query = extractString(input).trim();
  if (!query) throw new Error("cryptoNewsTool: empty query");

  const tavily = new TavilySearch({
    apiKey: process.env.TAVILY_API_KEY,
    maxResults: 3,
    topic: "crypto",
  });

  const attempts: Array<{ name: string; fn: () => Promise<any> }> = [
    { name: "invoke(query:string)", fn: () => (tavily as any).invoke?.(query) },
    { name: "invoke({ query })", fn: () => (tavily as any).invoke?.({ query }) },
    { name: "invoke({ input })", fn: () => (tavily as any).invoke?.({ input: query }) },
    { name: "search(query:string)", fn: () => (tavily as any).search?.(query) },
    { name: "search({ query })", fn: () => (tavily as any).search?.({ query }) },
    { name: "search({ input })", fn: () => (tavily as any).search?.({ input: query }) },
  ];

  for (const attempt of attempts) {
    if (typeof attempt.fn !== "function") continue;
    try {
      const out = await attempt.fn();
      if (!out) continue;
      console.log(`[cryptoNewsTool] success with ${attempt.name}`);
      return typeof out === "string" ? out : JSON.stringify(out, null, 2);
    } catch (err: any) {
      console.warn(`[cryptoNewsTool] ${attempt.name} failed: ${String(err?.message ?? err)}`);
    }
  }

  throw new Error(`cryptoNewsTool: all invocation shapes failed for query="${query}"`);
}

export const cryptoNewsTool = tool(rawCryptoNews, {
  name: "cryptoNewsTool",
  description: "Fetch latest crypto-related news using Tavily",
  schema: z.string().describe("A search query about crypto news"),
});

// price tool
const cryptoPriceInputSchema = z.string().nonempty();

const COINGECKO_MAP: Record<string, string> = {
  bitcoin: "bitcoin",
  btc: "bitcoin",
  ethereum: "ethereum",
  eth: "ethereum",
  dogecoin: "dogecoin",
  doge: "dogecoin",
};

const MOCK_PRICES: Record<string, string> = {
  bitcoin: "$30,000",
  ethereum: "$1,800",
  dogecoin: "$0.06",
};

async function fetchCoinGeckoPrice(id: string): Promise<string | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      id
    )}&vs_currencies=usd`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const price = json?.[id]?.usd;
    return typeof price === "number" ? `$${price.toLocaleString("en-US")}` : null;
  } catch {
    return null;
  }
}

async function rawCryptoPrice(input: unknown): Promise<string> {
  const symbol = cryptoPriceInputSchema.parse(input);
  const key = symbol.toLowerCase().trim();
  const id = COINGECKO_MAP[key] ?? key;

  if (!process.env.COINGECKO_DISABLED) {
    const live = await fetchCoinGeckoPrice(id);
    if (live) return live;
  }
  return MOCK_PRICES[id] ?? MOCK_PRICES[key] ?? "Price not available (mock)";
}

export const cryptoPriceTool = tool(rawCryptoPrice, {
  name: "cryptoPriceTool",
  description: "Get live or mock crypto prices by symbol or coin name",
  schema: cryptoPriceInputSchema,
});
