import "dotenv/config";
import { orchestratorGraph } from "./graph";
import type { GraphState } from "./graph"; 

async function runPrompt(prompt: string) {
  console.log("\n=== Prompt ===");
  console.log(prompt);

  const initialState: any = {
    messages: [{ role: "user", content: prompt }],
    searchInput: undefined,
    utilityInput: undefined,
    next: undefined,
  };

  try {
    // invoke returns final state
    const final = await orchestratorGraph.invoke(initialState);
    console.log("\n--- Final messages (all) ---");
    console.log(JSON.stringify(final.messages ?? [], null, 2));
    console.log("\n--- Final assistant output (last) ---");
    console.log(final.messages?.at(-1)?.content ?? "<no output>");
  } catch (err) {
    console.error("Error running prompt:", err);
  }
}

async function main() {
  const one = process.env.PROMPT;
  if (one) {
    await runPrompt(one);
    return;
  }

  // default prompts
  await runPrompt("Search the latest on ETH gas and summarize");
  await runPrompt("Convert 'hello cat love' to emojis");
  await runPrompt("Give me one short focus tip");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
