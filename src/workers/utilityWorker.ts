import { cryptoGraph } from "../graph";

export async function utilityWorker(state: cryptoGraph): Promise<cryptoGraph> {
  const lastMsg = state.messages[state.messages.length - 1]?.content ?? "";

  return {
    ...state,
    messages: [
      ...state.messages,
      { role: "system", content: `[UtilityWorker] Handling utility request: "${lastMsg}"` },
      { role: "system", content: "→ Passing to tools (e.g. emoji converter, crypto price)" },
    ],
  };
}
