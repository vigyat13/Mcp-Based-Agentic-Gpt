import os
import json
import httpx
import uvicorn
import uuid
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime
import asyncio

# --- Configuration ---
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "mistralai/mixtral-8x7b-instruct")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GNEWS_API_KEY = os.getenv("GNEWS_API_KEY")
SERPER_API_KEY = os.getenv("SERPER_API_KEY")

# Initialize Supabase
if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None
    print("⚠️  WARNING: Supabase not configured. Memory features disabled.")

# --- MCP Server ---
class Tool(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any]
    category: str
    enabled: bool = True

class MCPServer:
    def __init__(self):
        self.tools: Dict[str, Tool] = {}
    
    def register_tool(self, tool: Tool):
        self.tools[tool.name] = tool
    
    def get_tools_for_llm(self) -> List[Dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters
                }
            }
            for t in self.tools.values() if t.enabled
        ]

mcp = MCPServer()

# --- Memory & Context Management ---
class ContextManager:
    """Manages conversation context and memory"""
    
    def __init__(self):
        self.sessions = {}  
    def get_context(self, session_id: str) -> List[Dict]:
        """Get full conversation context with smart summarization"""
        
        if session_id in self.sessions:
            return self.sessions[session_id]
        
        
        if supabase:
            try:
                response = supabase.table("chat_history")\
                    .select("role, content, created_at")\
                    .eq("session_id", session_id)\
                    .order("created_at", desc=False)\
                    .limit(50)\
                    .execute()
                
                history = [{"role": msg["role"], "content": msg["content"]} 
                          for msg in response.data]
                
                
                self.sessions[session_id] = history
                return history
            except Exception as e:
                print(f"❌ DB Read Error: {e}")
        
        return []
    
    def add_message(self, session_id: str, role: str, content: str):
        """Add message to context and DB"""
        
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        
        self.sessions[session_id].append({"role": role, "content": content})
        
        if len(self.sessions[session_id]) > 50:
            self.sessions[session_id] = self.sessions[session_id][-50:]
        
        
        if supabase:
            try:
                supabase.table("chat_history").insert({
                    "session_id": session_id,
                    "role": role,
                    "content": content,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            except Exception as e:
                print(f"❌ DB Write Error: {e}")

context_manager = ContextManager()

# --- Advanced Tool Implementations ---

async def web_search(query: str) -> Dict[str, Any]:
    """Real-time web search via Serper"""
    if not SERPER_API_KEY:
        return {"error": "Serper API key not configured"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://google.serper.dev/search",
                headers={
                    "X-API-KEY": SERPER_API_KEY,
                    "Content-Type": "application/json"
                },
                json={"q": query, "num": 5},
                timeout=10.0
            )
            data = response.json()
            
            results = []
            for item in data.get("organic", [])[:5]:
                results.append({
                    "title": item.get("title"),
                    "snippet": item.get("snippet"),
                    "link": item.get("link")
                })
            
            return {
                "success": True,
                "query": query,
                "results": results,
                "total": len(results)
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def news_search(query: str, country: str = "us") -> Dict[str, Any]:
    """Get latest news articles"""
    if not GNEWS_API_KEY:
        return {"error": "GNews API key not configured"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://gnews.io/api/v4/search",
                params={
                    "q": query,
                    "token": GNEWS_API_KEY,
                    "lang": "en",
                    "country": country,
                    "max": 5
                },
                timeout=10.0
            )
            data = response.json()
            
            articles = []
            for article in data.get("articles", []):
                articles.append({
                    "title": article.get("title"),
                    "description": article.get("description"),
                    "url": article.get("url"),
                    "publishedAt": article.get("publishedAt"),
                    "source": article.get("source", {}).get("name")
                })
            
            return {
                "success": True,
                "query": query,
                "articles": articles,
                "total": len(articles)
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def image_search(query: str) -> Dict[str, Any]:
    """Search for images using Serper"""
    if not SERPER_API_KEY:
        return {"error": "Serper API key not configured"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://google.serper.dev/images",
                headers={
                    "X-API-KEY": SERPER_API_KEY,
                    "Content-Type": "application/json"
                },
                json={"q": query, "num": 10},
                timeout=10.0
            )
            data = response.json()
            
            images = []
            for img in data.get("images", [])[:10]:
                images.append({
                    "title": img.get("title"),
                    "imageUrl": img.get("imageUrl"),
                    "link": img.get("link")
                })
            
            return {
                "success": True,
                "query": query,
                "images": images,
                "total": len(images)
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def youtube_search(query: str) -> Dict[str, Any]:
    """Search YouTube videos via Serper"""
    if not SERPER_API_KEY:
        return {"error": "Serper API key not configured"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://google.serper.dev/videos",
                headers={
                    "X-API-KEY": SERPER_API_KEY,
                    "Content-Type": "application/json"
                },
                json={"q": query, "num": 5},
                timeout=10.0
            )
            data = response.json()
            
            videos = []
            for video in data.get("videos", [])[:5]:
                videos.append({
                    "title": video.get("title"),
                    "link": video.get("link"),
                    "channel": video.get("channel"),
                    "duration": video.get("duration")
                })
            
            return {
                "success": True,
                "query": query,
                "videos": videos,
                "total": len(videos)
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def code_execution(code: str, language: str = "python") -> Dict[str, Any]:
    """Execute code safely (simulated for demo - use a sandbox in production)"""
    
    return {
        "success": True,
        "language": language,
        "message": "⚠️ Code execution is simulated. In production, this would run in a sandboxed environment.",
        "code": code,
        "note": "Use Piston API or Judge0 for real code execution"
    }


async def fetch_webpage(url: str) -> Dict[str, Any]:
    """Fetch and extract content from a webpage"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0, follow_redirects=True)
            
            
            content = response.text[:3000]  
            
            return {
                "success": True,
                "url": url,
                "content": content,
                "status": response.status_code
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def save_memory(session_id: str, memory_type: str, content: str) -> Dict[str, Any]:
    """Save important information to long-term memory"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        supabase.table("memories").insert({
            "session_id": session_id,
            "memory_type": memory_type,
            "content": content,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        return {
            "success": True,
            "message": f"Memory saved: {memory_type}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def recall_memory(session_id: str, memory_type: Optional[str] = None) -> Dict[str, Any]:
    """Recall information from long-term memory"""
    if not supabase:
        return {"error": "Database not configured"}
    
    try:
        query = supabase.table("memories").select("*").eq("session_id", session_id)
        
        if memory_type:
            query = query.eq("memory_type", memory_type)
        
        response = query.order("created_at", desc=True).limit(10).execute()
        
        return {
            "success": True,
            "memories": response.data,
            "total": len(response.data)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}



mcp.register_tool(Tool(
    name="web_search",
    description="Search the web for current information, tutorials, comparisons, or any general knowledge",
    category="information",
    parameters={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Search query"}
        },
        "required": ["query"]
    }
))

mcp.register_tool(Tool(
    name="news_search",
    description="Get latest news articles about a specific topic or event",
    category="information",
    parameters={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "News search query"},
            "country": {"type": "string", "description": "Country code (us, in, uk, etc.)", "default": "us"}
        },
        "required": ["query"]
    }
))

mcp.register_tool(Tool(
    name="image_search",
    description="Search for images on a specific topic",
    category="information",
    parameters={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Image search query"}
        },
        "required": ["query"]
    }
))

mcp.register_tool(Tool(
    name="youtube_search",
    description="Search for YouTube videos on a specific topic",
    category="information",
    parameters={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Video search query"}
        },
        "required": ["query"]
    }
))

mcp.register_tool(Tool(
    name="fetch_webpage",
    description="Fetch and extract content from a specific URL",
    category="information",
    parameters={
        "type": "object",
        "properties": {
            "url": {"type": "string", "description": "URL to fetch"}
        },
        "required": ["url"]
    }
))

mcp.register_tool(Tool(
    name="save_memory",
    description="Save important information to long-term memory for future recall",
    category="memory",
    parameters={
        "type": "object",
        "properties": {
            "memory_type": {"type": "string", "description": "Type of memory (preference, fact, context)"},
            "content": {"type": "string", "description": "Information to remember"}
        },
        "required": ["memory_type", "content"]
    }
))

mcp.register_tool(Tool(
    name="recall_memory",
    description="Recall previously saved information from long-term memory",
    category="memory",
    parameters={
        "type": "object",
        "properties": {
            "memory_type": {"type": "string", "description": "Type of memory to recall (optional)"}
        }
    }
))

# Tool execution mapping
TOOL_IMPLEMENTATIONS = {
    "web_search": web_search,
    "news_search": news_search,
    "image_search": image_search,
    "youtube_search": youtube_search,
    "fetch_webpage": fetch_webpage,
    "save_memory": save_memory,
    "recall_memory": recall_memory
}

# --- FastAPI App ---
app = FastAPI(title="Agentic AI Assistant with Full Context")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    tool_used: Optional[str] = None
    tool_result: Optional[Dict] = None

async def call_llm(messages: List[Dict], tools: Optional[List] = None) -> Dict:
    """Call OpenRouter LLM"""
    async with httpx.AsyncClient() as client:
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": messages,
            "temperature": 0.7
        }
        
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=60.0
        )
        
        return response.json()


@app.post("/chat/message", response_model=ChatResponse)
async def chat_message(request: ChatRequest):
    """Main chat endpoint with full context awareness"""
    try:
       
        session_id = request.session_id or str(uuid.uuid4())
        
        #
        context = context_manager.get_context(session_id)
        
        
        messages = [
            {
                "role": "system",
                "content": """You are an advanced AI assistant with access to real-time tools and long-term memory.

**CONTEXT AWARENESS:**
- Remember and reference previous conversations
- Use conversation history to maintain context
- Reference recent messages when user says "it", "that", "the previous"
- Build upon previous topics naturally

**TOOL USAGE - CRITICAL:**
- After using ANY tool, you MUST provide a helpful, natural response
- web_search: Summarize the search results in 2-3 sentences
- news_search: Highlight the main news stories found
- image_search: Tell user about the images found
- youtube_search: Describe the videos found with titles
- fetch_webpage: Summarize the webpage content
- save_memory: Confirm what was saved
- recall_memory: Share what was remembered

**RESPONSE FORMAT:**
- Always respond in natural, conversational language
- Never return raw tool names or JSON
- Summarize tool results for the user
- Be concise but informative

**CRITICAL RULES:**
- NEVER show raw tool calls like [tool_name: "query"]
- NEVER return empty responses
- ALWAYS generate a helpful response after tool use
- Be honest about limitations
- Reference previous context when relevant

Remember: After using a tool, you MUST explain the results to the user in plain language."""
            }
        ]
        
       
        messages.extend(context[-20:])
        
        
        user_message = {"role": "user", "content": request.message}
        messages.append(user_message)
        
        
        context_manager.add_message(session_id, "user", request.message)
        
       
        tools = mcp.get_tools_for_llm()
        
       
        llm_response = await call_llm(messages, tools)
        assistant_message = llm_response["choices"][0]["message"]
        
        tool_used = None
        tool_result_data = None
        final_content = assistant_message.get("content", "")
        
        
        if assistant_message.get("tool_calls"):
            tool_call = assistant_message["tool_calls"][0]
            tool_name = tool_call["function"]["name"]
            tool_args = json.loads(tool_call["function"]["arguments"])
            
            tool_used = tool_name
            
            
            if tool_name in ["save_memory", "recall_memory"]:
                tool_args["session_id"] = session_id
            
            
            if tool_name in TOOL_IMPLEMENTATIONS:
                func = TOOL_IMPLEMENTATIONS[tool_name]
                tool_result = await func(**tool_args)
                tool_result_data = tool_result
                
                
                messages.append(assistant_message)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": json.dumps(tool_result)
                })
                
                
                final_response = await call_llm(messages, tools=None)
                final_content = final_response["choices"][0]["message"].get("content", "")
                
                
                if not final_content or '[' in final_content and 'TOOL:' in final_content or '_search' in final_content:
                    
                    if tool_result.get("success"):
                        if tool_name == "youtube_search":
                            videos = tool_result.get("videos", [])
                            if videos:
                                final_content = "Here are some YouTube videos I found:\n\n"
                                for video in videos[:3]:
                                    final_content += f"• {video.get('title', 'Untitled')} by {video.get('channel', 'Unknown')}\n"
                            else:
                                final_content = "I couldn't find any YouTube videos matching your search."
                        
                        elif tool_name == "news_search":
                            articles = tool_result.get("articles", [])
                            if articles:
                                final_content = f"I found {len(articles)} recent news articles:\n\n"
                                for article in articles[:3]:
                                    final_content += f"• {article.get('title', 'No title')}\n  Published: {article.get('publishedAt', 'Unknown')}\n  Source: {article.get('source', 'Unknown')}\n\n"
                            else:
                                final_content = "No recent news articles found for your query."
                        
                        elif tool_name == "image_search":
                            images = tool_result.get("images", [])
                            final_content = f"I found {len(images)} images matching your search. They should appear below."
                        
                        elif tool_name == "web_search":
                            results = tool_result.get("results", [])
                            if results:
                                final_content = "Here's what I found:\n\n"
                                for result in results[:3]:
                                    final_content += f"• {result.get('title', 'No title')}\n  {result.get('snippet', 'No description')}\n\n"
                            else:
                                final_content = "No search results found."
                        
                        else:
                            final_content = "I've completed your request successfully."
                    else:
                        final_content = f"I encountered an error: {tool_result.get('error', 'Unknown error')}"
        
       
        final_content = re.sub(r'<think>.*?</think>', '', final_content or "", flags=re.DOTALL).strip()
        
        
        if not final_content or '[' in final_content and '_search:' in final_content:
            if tool_result_data and tool_result_data.get("success"):
                
                if tool_used == "youtube_search":
                    videos = tool_result_data.get("videos", [])
                    if videos:
                        final_content = f"I found {len(videos)} YouTube videos:\n\n"
                        for video in videos[:3]:
                            final_content += f"• {video.get('title', 'Untitled')}\n"
                    else:
                        final_content = "I couldn't find any videos matching your search."
                elif tool_used == "image_search":
                    images = tool_result_data.get("images", [])
                    final_content = f"I found {len(images)} images for your search."
                elif tool_used == "news_search":
                    articles = tool_result_data.get("articles", [])
                    final_content = f"I found {len(articles)} recent news articles."
                elif tool_used == "web_search":
                    results = tool_result_data.get("results", [])
                    final_content = f"I found {len(results)} search results."
                else:
                    final_content = "I completed the search successfully."
            else:
                final_content = "I encountered an issue processing your request."
        
       
        context_manager.add_message(session_id, "assistant", final_content)
        
        return ChatResponse(
            response=final_content,
            session_id=session_id,
            tool_used=tool_used,
            tool_result=tool_result_data
        )
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "mcp_enabled": True,
        "tools_count": len(mcp.tools),
        "context_sessions": len(context_manager.sessions)
    }


@app.get("/mcp/tools")
async def list_tools():
    """List all available tools"""
    return {
        "tools": [
            {
                "name": tool.name,
                "description": tool.description,
                "category": tool.category
            }
            for tool in mcp.tools.values()
        ],
        "total": len(mcp.tools)
    }


@app.delete("/chat/history/{session_id}")
async def clear_history(session_id: str):
    """Clear conversation history"""
    if session_id in context_manager.sessions:
        del context_manager.sessions[session_id]
    
    if supabase:
        supabase.table("chat_history").delete().eq("session_id", session_id).execute()
    
    return {"status": "success", "message": "History cleared"}


if __name__ == "__main__":
    print("🚀 Starting Agentic AI Assistant")
    print(f"📊 Loaded {len(mcp.tools)} tools")
    print(f"🧠 Context management: ENABLED")
    uvicorn.run(app, host="0.0.0.0", port=8000)