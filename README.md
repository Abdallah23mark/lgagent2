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


notool path
<img width="460" height="542" alt="notoolpath" src="https://github.com/user-attachments/assets/7b3bd7d3-a0f8-4d3c-a5c4-a93b62b71728" />

pricetoll path
<img width="466" height="605" alt="cpricepath" src="https://github.com/user-attachments/assets/e96caa92-5abf-49a5-ae2e-ac335159385c" />

tavily path
<img width="484" height="642" alt="tavilypath" src="https://github.com/user-attachments/assets/8d279689-a31c-47d1-941f-658ae855315d" />
