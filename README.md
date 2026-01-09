MCP-Based Agentic AI Chatbot

Enterprise-Grade Agentic AI System using Model Context Protocol (MCP)

A production-ready agentic conversational AI platform built using the Model Context Protocol (MCP).
This system demonstrates how Large Language Models (LLMs) can safely and reliably interact with external APIs, real-time web data, and long-term memory through a standardized client–server architecture.

🔐 Key Design Decisions (Why This Matters)
Two-Phase LLM Execution

Phase 1: LLM decides which tool to call

Phase 2: Tool executes → real data → fed back to LLM

Result:
No hallucinated tool outputs. The model can’t fake data it hasn’t seen.
If a tool fails, the agent adapts instead of lying

🧰 Implemented Tools
Tool Name	Description	Example Use Case
web_search	Google Serper real-time search	Latest RTX specs
news_search	GNews aggregation	Market analysis
image_search	Image retrieval	Architecture diagrams
youtube_search	Video discovery	Async Python tutorials
fetch_webpage	URL scraping + text extraction	Read docs
save_memory	Persist facts/preferences	Save deadlines
recall_memory	Retrieve long-term memory	Recall past info

🖼️ System Visuals & Screenshots
1️⃣ High-Level System Architecture

End-to-end view of the MCP-based agentic system, showing the separation between UI, agent loop, MCP server, tools, and external APIs.

![System Architecture](https://github.com/vigyat13/Mcp-Based-Agentic-Gpt/blob/main/Dashboard.png)






![Agentic Loop](https://github.com/vigyat13/Mcp-Based-Agentic-Gpt/blob/main/Videos.png)



![MCP Server](https://github.com/vigyat13/Mcp-Based-Agentic-Gpt/blob/main/images.png)




![Chat UI](https://github.com/vigyat13/Mcp-Based-Agentic-Gpt/blob/main/News.png)




![Structured Output](https://github.com/vigyat13/Mcp-Based-Agentic-Gpt/blob/main/Login.png)




6️⃣ Long-Term Memory (Supabase)

Persistent memory and chat history stored in Supabase.

![Supabase Memory](docs/images/supabase-memory.png)

