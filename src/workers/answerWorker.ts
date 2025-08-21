import { cryptoGraph } from "../graph";

export async function answerWorker(state: cryptoGraph): Promise<cryptoGraph> {
  const lastMsg = state.messages[state.messages.length - 1]?.content ?? "";

  return {
    ...state,
    messages: [
      ...state.messages,
      { role: "system", content: `[AnswerWorker] Direct answer (no tools) for: "${lastMsg}"` },
      { role: "assistant", content: "Focus tip: minimize distractions, work in 25-min blocks." },
    ],
  };
}
