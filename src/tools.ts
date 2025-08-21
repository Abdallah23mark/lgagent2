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
          if ("token" in m) return String(m.token ?? "");
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
    if ("token" in obj) return String(obj.token ?? "");
    try {
      return JSON.stringify(obj);
    } catch {
      return String(obj);
    }
  }
  return String(x ?? "");
}

// normalize whitespace/newlines
function normalizeQuery(q: string) {
  return q.replace(/\s+/g, " ").trim();
}

// tavily news tool
async function rawCryptoNews(input: unknown): Promise<string> {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY not set in environment");
  }

  let query = normalizeQuery(extractString(input));
  if (!query) {
    console.warn("[cryptoNewsTool] empty query → defaulting to 'latest crypto news'");
    query = "latest crypto news";
  }

  // tavily safe default topic
  const tavily = new TavilySearch({
    apiKey: process.env.TAVILY_API_KEY,
    maxResults: 3,
    topic: "news", 
  });

  // topic call helper
  async function tryTavilyCall(topicToUse: string) {
    try {
      if (typeof (tavily as any).invoke === "function") {
        return await (tavily as any).invoke?.({ query, topic: topicToUse });
      }
      if (typeof (tavily as any).search === "function") {
        return await (tavily as any).search?.({ query, topic: topicToUse });
      }
      if (typeof (tavily as any).invoke === "function") {
        return await (tavily as any).invoke?.(query);
      }
      return null;
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (/Invalid topic/i.test(msg) || /Invalid topic/i.test(JSON.stringify(err))) {
        const e: any = new Error("InvalidTopic");
        e.original = err;
        throw e;
      }
      throw err;
    }
  }

  // try news then fallback to general
  try {
    const out = await tryTavilyCall("news");
    if (out) {
      console.log("[cryptoNewsTool] success (news)");
      return typeof out === "string" ? out : JSON.stringify(out, null, 2);
    }
  } catch (err: any) {
    if (err?.message === "InvalidTopic") {
      console.warn("[cryptoNewsTool] 'news' topic invalid, retrying with 'general'");
      try {
        const out2 = await tryTavilyCall("general");
        if (out2) {
          console.log("[cryptoNewsTool] success (general)");
          return typeof out2 === "string" ? out2 : JSON.stringify(out2, null, 2);
        }
      } catch (err2: any) {
        console.warn("[cryptoNewsTool] retry with general failed:", err2?.message ?? err2);
      }
    } else {
      console.warn("[cryptoNewsTool] tavily 'news' attempt failed:", err?.message ?? err);
    }
  }

  // final option try finance
  try {
    const out3 = await tryTavilyCall("finance");
    if (out3) {
      console.log("[cryptoNewsTool] success (finance)");
      return typeof out3 === "string" ? out3 : JSON.stringify(out3, null, 2);
    }
  } catch (err3: any) {
    console.warn("[cryptoNewsTool] finance attempt failed:", err3?.message ?? err3);
  }

  return `Tavily search failed for "${query}". Please try a different phrasing or ensure the Tavily API key is valid.`;
}

export const cryptoNewsTool = tool(rawCryptoNews, {
  name: "cryptoNewsTool",
  description: "Fetch latest crypto-related news using Tavily (safe topic fallback).",
  schema: z.string().describe("A search query about crypto news"),
});

// price tool
const cryptoPriceInputSchema = z.union([z.string(), z.object({ token: z.string() })]);

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
    if (!res.ok) {
      console.warn(`[cryptoPriceTool] CoinGecko HTTP ${res.status} for id=${id}`);
      return null;
    }
    const json = await res.json();
    const price = json?.[id]?.usd;
    return typeof price === "number" ? `$${price.toLocaleString("en-US")}` : null;
  } catch (err: any) {
    console.warn(`[cryptoPriceTool] CoinGecko fetch failed: ${err?.message ?? err}`);
    return null;
  }
}

async function rawCryptoPrice(input: unknown): Promise<string> {
  let parsed: any;
  try {
    parsed = cryptoPriceInputSchema.parse(input);
  } catch {
    parsed = extractString(input);
  }

  const symbol = typeof parsed === "string" ? parsed : parsed.token ?? String(parsed);
  const key = String(symbol).toLowerCase().trim();
  const id = COINGECKO_MAP[key] ?? key;

  const coingeckoDisabled =
    process.env.COINGECKO_DISABLED === "1" || process.env.COINGECKO_DISABLED === "true";

  if (!coingeckoDisabled) {
    const live = await fetchCoinGeckoPrice(id);
    if (live) {
      console.log(`[cryptoPriceTool] CoinGecko price for ${id}: ${live}`);
      return live;
    }
    console.warn(`[cryptoPriceTool] CoinGecko returned no price for ${id}, falling back to mock`);
  } else {
    console.log("[cryptoPriceTool] CoinGecko disabled by environment");
  }

  const mock = MOCK_PRICES[id] ?? MOCK_PRICES[key] ?? "Price not available (mock)";
  console.log(`[cryptoPriceTool] returning mock price for ${key}: ${mock}`);
  return mock;
}

export const cryptoPriceTool = tool(rawCryptoPrice, {
  name: "cryptoPriceTool",
  description: "Get live or mock crypto prices by symbol or coin name. Accepts string or { token } input.",
  schema: cryptoPriceInputSchema,
});
