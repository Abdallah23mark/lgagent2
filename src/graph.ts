import { z } from "zod";
import { StateGraph, MessagesZodState, START, END } from "@langchain/langgraph";
import { OpenAI } from "@langchain/openai";
import { cryptoNewsTool, cryptoPriceTool } from "./tools";

const State = z.object({
  messages: z.array(z.any()),
});
export type GraphState = z.infer<typeof State>;
const model = new OpenAI({ temperature: 0 });

async function modelNode(state: GraphState) {
  const res = await (model as any).invoke?.(state.messages as any);
  // wrap model string to message like object
  if (typeof res === "string") return { messages: [{ role: "assistant", content: res }] };
  // else return as is
  return { messages: [res] };
}

//decide which tool to call
async function toolNode(state: GraphState) {
  const msgs = state.messages || [];
  const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;

  let lastContent = "";
  if (last && typeof last === "object" && "content" in last) {
    lastContent = String((last as any).content ?? "");
  } else {
    lastContent = String(last ?? "");
  }
  const lower = lastContent.toLowerCase();

  // price triggers 
  if (/\b(price|current price|how much|worth)\b/.test(lower)) {
    const match = lower.match(/\b(bitcoin|ethereum|dogecoin)\b/);
    const token = match ? match[1] : "bitcoin";
    console.log(`[toolNode] calling cryptoPriceTool with token=${token}`);
    const out = await cryptoPriceTool.invoke(token);
    return { messages: [{ role: "tool", content: out }] };
  }

  // news trigger (tavily)
  if (/\b(news|latest|update|bitcoin|ethereum|crypto)\b/.test(lower)) {
    console.log(`[toolNode] calling cryptoNewsTool with query="${lastContent}"`);
    const news = await cryptoNewsTool.invoke(lastContent);
    return { messages: [{ role: "tool", content: news }] };
  }

  console.log("[toolNode] no tool matched; returning no-op");
  return {};
}


//build graph using statgraph api
export const cryptoGraph = new StateGraph(State)
  .addNode("model", modelNode)
  .addNode("tools", toolNode)
  .addEdge(START, "model")
  .addEdge(
    "model",
    "tools",
    (s: GraphState) =>
      /\b(news|latest|update|price|bitcoin|ethereum|dogecoin|crypto)\b/i.test(
        // explicit safe extraction of last message content
        String((s.messages && s.messages.length ? (s.messages[s.messages.length - 1] as any)?.content : "") || "")
      )
  )
  .addEdge("model", END)
  .addEdge("tools", END)
  .compile();
