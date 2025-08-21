import { cryptoGraph } from "../graph";

export async function searchWorker(state: cryptoGraph): Promise<cryptoGraph> {
  const lastMsg = state.messages[state.messages.length - 1]?.content ?? "";

  return {
    ...state,
    messages: [
      ...state.messages,
      { role: "system", content: `[SearchWorker] Preparing search for: "${lastMsg}"` },
      { role: "system", content: "→ Passing to tools (Tavily likely)" },
    ],
  };
}
