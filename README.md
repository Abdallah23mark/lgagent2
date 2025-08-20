## Quick run (1–2 steps)
1. Ensure Node 20 is active (use `nvm install 20 && nvm use 20`), create `.env` from `.env.example`, fill keys.
2. Install deps and start local Studio dev server:
   ```bash
   npm install --legacy-peer-deps
   npx @langchain/langgraph-cli dev
https://smith.langchain.com/studio/thread?baseUrl=http%3A%2F%2Flocalhost%3A2024&mode=graph&render=interact&assistantId=fe096781-5601-53d2-b2f6-0d3403f7e9ca

## Studio observation

I ran three Studio sessions for the 2-node crypto agent.  
- **Tavily path:** the graph routed to the ToolNode and a `tool` message with Tavily output appeared in `messages[]`.  
- **Custom-tool path:** the ToolNode executed with argument `ethereum` and returned the price.  
- **No-tool path:** the model replied directly with an `assistant` message and no tool executed.

Screenshots: `tavilypath.png`, `cpricepath.png`, `notoolpath.png`.
