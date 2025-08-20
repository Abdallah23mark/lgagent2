import "dotenv/config";
import { cryptoGraph } from "./graph";

const prompts = [
  { name: "Crypto news path", text: "Find the latest news about Bitcoin and summarize in one sentence." },
  { name: "Crypto price path", text: "What is the current price of Ethereum?" },
  { name: "General tip path", text: "Give me one short tip for crypto beginners." },
];

(async () => {
  for (const p of prompts) {
    console.log(`\n--- ${p.name} ---`);
    try {
      const final = await (cryptoGraph as any).invoke({
        messages: [{ role: "user", content: p.text }],
      });
      for (const m of final.messages || []) {
        if (m && typeof m === "object" && "role" in m) {
          console.log(`${(m as any).role}: ${(m as any).content}`);
        } else {
          console.log(String(m));
        }
      }
    } catch (err) {
      console.error("Run error:", err);
    }
  }
})();
