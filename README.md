MCP-Based Agentic AI Chatbot

Enterprise-Grade Agentic AI System using Model Context Protocol (MCP)

A production-ready agentic conversational AI platform built using the Model Context Protocol (MCP).
This system demonstrates how Large Language Models (LLMs) can safely and reliably interact with external APIs, real-time web data, and long-term memory through a standardized client–server architecture.

🚀 What This Project Does

Chat with an AI that can reason, call tools, and self-correct

Perform live web search, news aggregation, video discovery, and webpage scraping

Persist conversation history and long-term memory

Prevent tool hallucinations using two-phase LLM execution

Scale cleanly using MCP-based tool registration

This is not a toy chatbot. It mirrors how real enterprise AI assistants are designed.

🧠 Core Architecture
User (Browser)
   ↓
React Frontend (Vite + Tailwind)
   ↓  HTTP /chat/message
FastAPI Backend
   ├─ Agentic Reasoning Loop
   ├─ MCP Server (Tool Registry + Validation)
   └─ Async Tool Execution
       ↓
External APIs (Serper, GNews, YouTube)
Supabase (Chat History + Memory)

🏗️ System Components
1️⃣ Frontend (React + Vite)

ChatGPT-style UI

Token streaming for low latency

Structured rendering (news cards, videos, images)

Dark / light mode with TailwindCSS

2️⃣ Backend (FastAPI + Async Python)

Recursive agentic reasoning loop

Context-aware conversation management

Async, non-blocking API calls using httpx and asyncio

Reflexive error handling (tool failures fed back to LLM)

3️⃣ MCP Server (Model Context Protocol)

Centralized tool registry

Strict JSON schema validation

Execution logging and safety checks

Decouples tools from agent logic

4️⃣ Database (Supabase)

Persistent chat history

Semantic long-term memory

Reliable state recovery after restarts

🔐 Key Design Decisions (Why This Matters)
Two-Phase LLM Execution

Phase 1: LLM decides which tool to call

Phase 2: Tool executes → real data → fed back to LLM

Result:
No hallucinated tool outputs. The model can’t fake data it hasn’t seen.

MCP Over Hardcoded Function Calling

Tools are modular and portable

Same tool schema works across LLM providers

Adding tools doesn’t touch the agent loop

No Simulated Data

Every tool hits live production APIs

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

![System Architecture](docs/images/system-architecture.png)


What this proves:

You understand client–server separation

MCP is not buzzword usage — it’s structurally embedded

Clear cognitive vs execution boundaries

2️⃣ Agentic Reasoning Flow (Tool Loop)

Visual breakdown of the two-phase LLM execution and MCP validation pipeline.

![Agentic Loop](docs/images/agentic-loop.png)


What interviewers see here:

Deterministic tool execution

Hallucination prevention

Enterprise-safe agent design

3️⃣ MCP Tool Registry & Validation

Centralized MCP server managing tool schemas, validation, and execution logging.

![MCP Server](docs/images/mcp-server.png)


Why this matters:

Shows why MCP > hardcoded function calling

Demonstrates extensibility and governance

Signals real-world system thinking

4️⃣ Frontend – Chat Interface

ChatGPT-style UI with streaming responses and structured tool outputs.

![Chat UI](docs/images/chat-ui.png)


Highlight in caption or PR:

Streaming tokens

Tool “thinking” indicators

Structured cards (news, videos, images)

5️⃣ Tool Output Rendering (Structured Responses)

Example of non-textual responses rendered as UI components.

![Structured Output](docs/images/structured-output.png)


This separates you from juniors
Most people dump JSON → text. You didn’t.

6️⃣ Long-Term Memory (Supabase)

Persistent memory and chat history stored in Supabase.

![Supabase Memory](docs/images/supabase-memory.png)


Signals:

Stateful AI

Session continuity

Production-grade persistence