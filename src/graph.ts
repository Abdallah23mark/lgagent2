import { z } from "zod";
import { StateGraph, START, END } from "@langchain/langgraph";
import { OpenAI } from "@langchain/openai";
import { cryptoNewsTool, cryptoPriceTool } from "./tools";


const State = z.object({
  messages: z.array(z.any()).optional(), 
  searchInput: z.string().optional(),
  utilityInput: z.string().optional(),
  next: z.string().optional(),
});
export type GraphState = z.infer<typeof State>;

const model = new OpenAI({ temperature: 0 });

//safely extract msg
function lastContent(state: GraphState): string {
  const msgs = state.messages;
  if (!Array.isArray(msgs) || msgs.length === 0) return "";
  const last = msgs[msgs.length - 1];
  if (last == null) return "";
  if (typeof last === "string") return last;
  if (typeof last === "object") {
    if ("content" in last) return String((last as any).content ?? "");
    if ("text" in last) return String((last as any).text ?? "");
    if ("query" in last) return String((last as any).query ?? "");
    try {
      return JSON.stringify(last);
    } catch {
      return String(last);
    }
  }
  return String(last);
}

//orchestrator determanistic rout
async function orchestrator(state: GraphState) {
  const last = lastContent(state);
  const lower = last.toLowerCase();

  if (/\b(news|latest|update|ethereum|eth|gas|bitcoin|crypto)\b/.test(lower)) {
    console.log("[orchestrator] → search");
    return { next: "search" };
  }

  if (/\b(convert|emoji|transform|translate|price|how much)\b/.test(lower)) {
    console.log("[orchestrator] → utility");
    return { next: "utility" };
  }

  console.log("[orchestrator] → answer");
  return { next: "answer" };
}

//workers only set input
async function searchWorker(state: GraphState) {
  const last = lastContent(state);
  console.log("[searchWorker] set searchInput =", last);
  return { searchInput: last, utilityInput: undefined, next: undefined };
}

async function utilityWorker(state: GraphState) {
  const last = lastContent(state);
  console.log("[utilityWorker] set utilityInput =", last);
  return { utilityInput: last, searchInput: undefined, next: undefined };
}

async function toolsNode(state: GraphState) {
  const search = (state.searchInput ?? "").trim();
  const util = (state.utilityInput ?? "").trim();

  if (!search && !util) {
    console.log("[tools] no tool input; skipping");
    return { ...state };
  }

  // searchpath cryptoNews
  if (search) {
    console.log(`[tools] invoking cryptoNewsTool with query="${search}"`);
    try {
      const out = await cryptoNewsTool.invoke({ query: search });
      return {
        messages: [...(state.messages ?? []), { role: "tool", content: String(out) }],
        searchInput: undefined,
        utilityInput: undefined,
      };
    } catch (err: any) {
      console.warn("[tools] cryptoNewsTool failed:", err?.message ?? err);
      return {
        messages: [...(state.messages ?? []), { role: "tool", content: "" }],
        searchInput: undefined,
        utilityInput: undefined,
      };
    }
  }

  // utility path 
  if (util) {
    const lower = util.toLowerCase();
    if (/\b(price|current price|how much|worth)\b/.test(lower)) {
      const match = lower.match(/\b(bitcoin|ethereum|dogecoin|btc|eth|doge)\b/);
      const token = match ? match[1] : util;
      console.log(`[tools] invoking cryptoPriceTool with token="${token}"`);
      try {
        const out = await cryptoPriceTool.invoke({ token: String(token) });
        return {
          messages: [...(state.messages ?? []), { role: "tool", content: String(out) }],
          searchInput: undefined,
          utilityInput: undefined,
        };
      } catch (err: any) {
        console.warn("[tools] cryptoPriceTool failed:", err?.message ?? err);
        
      }
    }

    
    console.log("[tools] utility fallback: echoing utility input as tool output");
    return {
      messages: [...(state.messages ?? []), { role: "tool", content: util }],
      searchInput: undefined,
      utilityInput: undefined,
    };
  }

  return { ...state, searchInput: undefined, utilityInput: undefined };
}

//answer worker
async function answerWorker(state: GraphState) {
  const msgs = state.messages ?? [];
  const lastTool = msgs.slice().reverse().find((m: any) => (m as any).role === "tool");
  if (lastTool) {
    const content = (lastTool as any).content ?? String(lastTool);
    console.log("[answerWorker] using tool output");
    return { messages: [...msgs, { role: "assistant", content }] };
  }

  const lastUser = lastContent(state);
  console.log("[answerWorker] calling model for direct answer");
  try {
    const res = await model.invoke?.([{ role: "user", content: lastUser }]);
    const content = typeof res === "string" ? res : JSON.stringify(res ?? "");
    return { messages: [...msgs, { role: "assistant", content }] };
  } catch (err: any) {
    console.warn("[answerWorker] model failed:", err?.message ?? err);
    return { messages: [...msgs, { role: "assistant", content: "Sorry, I couldn't generate an answer." }] };
  }
}


export const orchestratorGraph = new StateGraph(State)
  .addNode("orchestrator", orchestrator)
  .addNode("searchWorker", searchWorker)
  .addNode("utilityWorker", utilityWorker)
  .addNode("tools", toolsNode)
  .addNode("answerWorker", answerWorker)
  .addEdge(START, "orchestrator")
  .addConditionalEdges("orchestrator", (s: GraphState) => (s as any).next ?? "", {
    search: "searchWorker",
    utility: "utilityWorker",
    answer: "answerWorker",
  })
  .addEdge("searchWorker", "tools")
  .addEdge("utilityWorker", "tools")
  .addEdge("tools", "answerWorker")
  .addEdge("answerWorker", END)
  .compile();

export const graph = orchestratorGraph;
export default orchestratorGraph;
