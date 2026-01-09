import { useEffect, useRef, useState } from "react";
import {
  Send, Plus, Trash2, LogOut, Moon, Sun,
  Search, Video, Loader2, Sparkles, 
  MessageSquare, Newspaper, PlayCircle, 
  Image as ImageIcon, Link2
} from "lucide-react";

const API_URL = "https://mcp-based-agentic-gpt.onrender.com";

export default function MCPAgenticChat() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [darkMode, setDarkMode] = useState(true);

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Load data from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("mcp_username");
    const savedSessions = localStorage.getItem("mcp_sessions");
    const savedDarkMode = localStorage.getItem("mcp_darkMode");
    
    if (savedUser) {
      setUsername(savedUser);
      setIsLoggedIn(true);
    }
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }
    // Default to true (Dark) if not set, or load preference
    setDarkMode(savedDarkMode === "false" ? false : true);
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("mcp_sessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem("mcp_darkMode", darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username || !password) return;
    localStorage.setItem("mcp_username", username);
    setIsLoggedIn(true);
    createNewChat();
  };

  const handleLogout = () => {
    localStorage.removeItem("mcp_username");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    setSessions([]);
    setMessages([]);
  };

  const createNewChat = () => {
    const id = `session_${Date.now()}`;
    const newSession = { id, title: "New Chat", messages: [] };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(id);
    setMessages([]);
  };

  const deleteChat = async (id) => {
    try {
      await fetch(`${API_URL}/chat/history/${id}`, { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (id === currentSessionId) {
        if (sessions.length > 1) {
          const nextSession = sessions.find(s => s.id !== id);
          selectChat(nextSession.id);
        } else {
          createNewChat();
        }
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const selectChat = (id) => {
    setCurrentSessionId(id);
    const session = sessions.find(s => s.id === id);
    setMessages(session?.messages || []);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMsg = { role: "user", text: userText };
    
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Update session title if first message
    if (messages.length === 0) {
      const title = userText.slice(0, 40) + (userText.length > 40 ? "..." : "");
      setSessions(prev => prev.map(s =>
        s.id === currentSessionId ? { ...s, title } : s
      ));
    }

    try {
      const res = await fetch(`${API_URL}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, session_id: currentSessionId })
      });
      const data = await res.json();

      let responseText = data.response || "I couldn't process that request.";
      
      if (responseText.includes('[TOOL:') || responseText.includes('_search:')) {
        responseText = "I'm having trouble processing the tool results. Please try switching to google/gemini-flash-1.5-8b model in your .env file.";
      }

      const reply = {
        role: "assistant",
        text: cleanText(responseText),
        videos: extractVideos(data.tool_result?.videos),
        images: data.tool_result?.images || null,
        articles: data.tool_result?.articles || null
      };

      setMessages(prev => {
        const updated = [...prev, reply];
        // Save to session
        setSessions(prevSessions => prevSessions.map(s =>
          s.id === currentSessionId ? { ...s, messages: updated } : s
        ));
        return updated;
      });
    } catch (err) {
      console.error('Error:', err);
      const errorMsg = { 
        role: "assistant", 
        text: "⚠️ Error: Backend not responding. Make sure it's running on port 8000." 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  function cleanText(t = "") {
    if (!t) return "No response received.";
    return t.replace(/\*\*/g, "").replace(/\n{3,}/g, "\n\n").trim();
  }

  function extractVideos(arr) {
    if (!arr || !Array.isArray(arr)) return null;
    return arr.map(v => ({
      title: v.title || "Video",
      channel: v.channel || "",
      link: v.link || "",
      thumb: inferThumb(v.link)
    }));
  }

  function inferThumb(url = "") {
    const yt = url.match(/v=([^&]+)/);
    return yt ? `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` : null;
  }

  // ---- THEME SYSTEM (Zinc/Dark Palette) ----
  const isDark = darkMode;

  // Backgrounds
  const appBg = isDark ? "bg-[#09090b]" : "bg-[#f4f4f5]";
  const sidebarBg = isDark ? "bg-[#000000]" : "bg-[#ffffff]";
  const cardBg = isDark ? "bg-[#18181b]" : "bg-white"; 
  const inputBg = isDark ? "bg-[#27272a]" : "bg-white";
  
  // Borders
  const borderCol = isDark ? "border-white/10" : "border-black/10";
  
  // Text
  const txtPrimary = isDark ? "text-zinc-100" : "text-zinc-900";
  const txtSec = isDark ? "text-zinc-400" : "text-zinc-500";
  const txtAccent = isDark ? "text-zinc-300" : "text-zinc-700";

  // Interactions
  const hoverBtn = isDark ? "hover:bg-white/10" : "hover:bg-black/5";

  // Styles for background animation
  const animStyles = `
    @keyframes subtle-drift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .animate-gradient {
      background-size: 200% 200%;
      animation: subtle-drift 15s ease infinite;
    }
  `;

  // LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#09090b]' : 'bg-gray-50'} transition-colors duration-500 relative overflow-hidden`}>
        <style>{animStyles}</style>
        
        {/* Subtle animated background blob */}
        {isDark && (
           <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-blue-900/20 animate-gradient pointer-events-none" />
        )}

        <div className={`relative max-w-md w-full ${cardBg} rounded-2xl shadow-2xl p-8 border ${borderCol} backdrop-blur-sm z-10`}>
          <div className="text-center mb-8">
            {/* Brain Logo Removed */}
            <h2 className={`text-2xl font-semibold ${txtPrimary} mb-2 tracking-tight`}>Welcome Back</h2>
            <p className={txtSec}>Sign in to continue to your workspace</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={`block text-xs font-medium uppercase tracking-wider ${txtSec} mb-2`}>Username</label>
              <input
                placeholder="Enter username"
                className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-[#27272a] text-white placeholder-zinc-500' : 'bg-zinc-100 text-black'} border-none focus:ring-1 focus:ring-zinc-500 outline-none transition-all`}
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium uppercase tracking-wider ${txtSec} mb-2`}>Password</label>
              <input
                placeholder="Enter password"
                type="password"
                className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-[#27272a] text-white placeholder-zinc-500' : 'bg-zinc-100 text-black'} border-none focus:ring-1 focus:ring-zinc-500 outline-none transition-all`}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={!username || !password}
              className={`w-full py-3 rounded-xl ${isDark ? 'bg-zinc-100 text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'} font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg mt-2`}
            >
              Sign In
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${hoverBtn} transition text-xs flex items-center gap-2 ${txtSec}`}
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
              <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
            </button>
            <span className={`text-xs ${txtSec}`}>Demo v1.0</span>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className={`flex h-screen ${appBg} ${txtPrimary} font-sans overflow-hidden`}>
      <style>{animStyles}</style>

      {/* SIDEBAR */}
      <div className={`w-[280px] h-full ${sidebarBg} border-r ${borderCol} flex flex-col flex-shrink-0 transition-colors duration-300`}>
        {/* Header - LOGO REMOVED */}
        <div className={`p-3 pb-2 pt-4`}>
          <button
            onClick={createNewChat}
            className={`group w-full flex items-center gap-3 px-3 py-3 rounded-xl border ${borderCol} ${hoverBtn} transition-all duration-200`}
          >
            <div className={`p-1 rounded-md bg-zinc-800 group-hover:bg-zinc-700 transition`}>
               <Plus size={16} className="text-zinc-300" />
            </div>
            <span className="font-medium text-sm">New chat</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-hide">
          <div className={`text-xs font-semibold ${txtSec} px-3 py-2 mb-1`}>History</div>
          {sessions.length === 0 ? (
            <p className={`text-xs ${txtSec} px-3 text-center py-4 italic`}>No past conversations</p>
          ) : (
            sessions.map(s => (
              <button
                key={s.id}
                onClick={() => selectChat(s.id)}
                className={`group relative w-full flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  s.id === currentSessionId 
                    ? 'bg-zinc-800/50 text-zinc-100' 
                    : `${txtAccent} hover:bg-zinc-800/30 hover:text-zinc-200`
                }`}
              >
                <span className="truncate flex-1 text-left">{s.title}</span>
                {/* Delete appears on hover or active */}
                <div className={`absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity ${s.id === currentSessionId ? 'opacity-100' : ''}`}>
                    <Trash2
                        size={14}
                        className="text-zinc-500 hover:text-red-400"
                        onClick={e => {
                            e.stopPropagation();
                            deleteChat(s.id);
                        }}
                    />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer Settings */}
        <div className={`border-t ${borderCol} p-4 space-y-1`}>
          <div className={`flex items-center gap-3 px-2 py-2 rounded-lg`}>
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 font-medium text-xs">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate`}>{username}</p>
              <p className={`text-xs ${txtSec} truncate`}>Pro Plan</p>
            </div>
          </div>
          
          <div className="flex gap-1 mt-2">
            <button
                onClick={() => setDarkMode(!darkMode)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg ${hoverBtn} transition text-xs ${txtSec} hover:text-zinc-200`}
            >
                {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                {darkMode ? 'Light' : 'Dark'}
            </button>
             <button
                onClick={handleLogout}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg ${hoverBtn} transition text-xs ${txtSec} hover:text-red-400`}
            >
                <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* WELCOME STATE */}
        {messages.length === 0 && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            <div className="max-w-2xl w-full text-center space-y-10">
              <div>
                {/* Brain Logo Removed Here */}
                {/* Personalized Greeting */}
                <h1 className={`text-3xl font-semibold ${txtPrimary} mb-2`}>
                  Hello, <span className="capitalize">{username}</span>.<br/>What can I do for you?
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Search, label: "Web Search", sub: "Browse the internet" },
                  { icon: ImageIcon, label: "Generate Images", sub: "Create visuals" },
                  { icon: Video, label: "Find Videos", sub: "Search YouTube" },
                  { icon: Newspaper, label: "Read News", sub: "Latest updates" }
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(`Help me with ${item.label.toLowerCase()}`)}
                    className={`p-4 rounded-xl border ${borderCol} ${cardBg} ${hoverBtn} transition-all text-left flex items-start gap-3 group`}
                  >
                    <item.icon size={20} className={`${txtSec} group-hover:text-zinc-100 transition-colors`} />
                    <div>
                        <div className={`text-sm font-medium ${txtPrimary}`}>{item.label}</div>
                        <div className={`text-xs ${txtSec}`}>{item.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MESSAGES SCROLL AREA */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-20 py-6 space-y-8 scroll-smooth">
          {messages.map((m, i) => (
            <div key={i} className={`group flex gap-4 md:gap-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              
              {/* Avatar */}
              <div className="flex-shrink-0 pt-1">
                {m.role === "user" ? (
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-white">
                    {username.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-green-500/10 text-green-500 ring-1 ring-green-500/20`}>
                      <Sparkles size={16} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-4">
                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'text-zinc-300' : txtPrimary}`}>
                   {m.text}
                </div>

                {/* --- STRUCTURED OUTPUTS --- */}
                
                {/* 1. ARTICLES GRID */}
                {m.articles && m.articles.length > 0 && (
                  <div className="mt-4">
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${txtSec} mb-3 flex items-center gap-2`}>
                         <Newspaper size={14} /> Sources
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {m.articles.slice(0, 4).map((art, j) => (
                           <a 
                             key={j} href={art.url} target="_blank" rel="noreferrer"
                             className={`block p-3 rounded-lg border ${borderCol} ${cardBg} hover:bg-zinc-800/80 transition group/card`}
                           >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                 <span className="text-xs text-blue-400 font-medium truncate">{art.source}</span>
                                 <Link2 size={12} className="text-zinc-600 group-hover/card:text-zinc-400" />
                              </div>
                              <div className={`text-sm font-medium ${txtPrimary} line-clamp-2 leading-snug mb-1`}>
                                 {art.title}
                              </div>
                              <div className={`text-xs ${txtSec} line-clamp-1`}>{art.description}</div>
                           </a>
                        ))}
                      </div>
                  </div>
                )}

                {/* 2. VIDEOS GRID */}
                {m.videos && m.videos.length > 0 && (
                  <div className="mt-4">
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${txtSec} mb-3 flex items-center gap-2`}>
                         <PlayCircle size={14} /> Related Videos
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {m.videos.map((v, j) => (
                           <a 
                             key={j} href={v.link} target="_blank" rel="noreferrer"
                             className={`group/vid overflow-hidden rounded-lg border ${borderCol} ${cardBg} hover:ring-1 hover:ring-zinc-600 transition`}
                           >
                              <div className="relative aspect-video bg-zinc-900">
                                 {v.thumb ? (
                                    <img src={v.thumb} alt="" className="w-full h-full object-cover opacity-80 group-hover/vid:opacity-100 transition" />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-700"><Video /></div>
                                 )}
                                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition bg-black/40">
                                    <PlayCircle size={32} className="text-white drop-shadow-lg" />
                                 </div>
                              </div>
                              <div className="p-2.5">
                                 <div className={`text-xs font-medium ${txtPrimary} line-clamp-2 mb-1`}>{v.title}</div>
                                 <div className={`text-[10px] ${txtSec} uppercase`}>{v.channel}</div>
                              </div>
                           </a>
                        ))}
                      </div>
                  </div>
                )}

                 {/* 3. IMAGES GRID */}
                 {m.images && m.images.length > 0 && (
                  <div className="mt-4">
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${txtSec} mb-3 flex items-center gap-2`}>
                         <ImageIcon size={14} /> Generated Images
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {m.images.slice(0, 4).map((img, j) => (
                           <div key={j} className="relative aspect-square rounded-lg overflow-hidden border border-white/5 group/img">
                              <img src={img.imageUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-500" />
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover/img:opacity-100 transition">
                                 <p className="text-[10px] text-white truncate">{img.title}</p>
                              </div>
                           </div>
                        ))}
                      </div>
                  </div>
                )}

              </div>
            </div>
          ))}

          {loading && (
            <div className="max-w-4xl mx-auto flex gap-6 px-4 md:px-0">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 ring-1 ring-white/10 animate-pulse`}>
                  <Sparkles size={16} className="text-zinc-500" />
               </div>
               <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
               </div>
            </div>
          )}
          <div ref={bottomRef} className="h-4" />
        </div>

        {/* INPUT AREA */}
        <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2">
           <div className={`relative flex items-end gap-2 p-3 rounded-2xl border ${borderCol} ${inputBg} shadow-xl transition-colors focus-within:ring-1 focus-within:ring-zinc-600`}>
              
              <button className={`p-2 rounded-lg ${hoverBtn} text-zinc-500 transition`}>
                 <Plus size={20} />
              </button>

              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                   if(e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                   }
                }}
                placeholder="Message Agentic AI..."
                disabled={loading}
                className={`flex-1 max-h-32 min-h-[24px] py-2 bg-transparent outline-none ${txtPrimary} placeholder-zinc-500 resize-none overflow-y-auto custom-scrollbar`}
                rows={1}
                style={{ height: 'auto', minHeight: '44px' }}
              />

              <button
                disabled={!input.trim() || loading}
                onClick={sendMessage}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  input.trim() 
                  ? 'bg-zinc-100 text-black hover:bg-zinc-300' 
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
           </div>
           
           <div className={`text-center mt-3 text-[11px] ${txtSec}`}>
              AI can make mistakes. Please verify important information.
           </div>
        </div>
      </div>
    </div>
  );
}
