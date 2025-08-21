## Quick run (1–2 steps)
1. Ensure Node 20 is active (use `nvm install 20 && nvm use 20`), create `.env` from `.env.example`, fill keys.
2. Install deps and start local Studio dev server:
   ```bash
   npm install --legacy-peer-deps
   npx @langchain/langgraph-cli dev

## Studio observation

I ran three Studio sessions for the 2-node crypto agent.  
- **Tavily path:** the graph routed to the ToolNode and a `tool` message with Tavily output appeared in `messages[]`.  
- **Custom-tool path:** the ToolNode executed with argument `ethereum` and returned the price.  
- **No-tool path:** the model replied directly with an `assistant` message and no tool executed.
