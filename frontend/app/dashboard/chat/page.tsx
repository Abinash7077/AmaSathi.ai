// FILE: frontend/app/dashboard/chat/page.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import ReactMarkdown from "react-markdown";
// Add these imports at top
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Msg = { role: "user" | "assistant"; text: string };

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput]       = useState("");
  const [file, setFile]         = useState<File | null>(null);
  const [loading, setLoading]   = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tokensUsed, setTokensUsed] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/sign-in"); return; }
    if (!plan_allows(u.plan, "chat")) { router.push("/profile?tab=plan"); return; }
    setUser(u);
    setTokensUsed(u.tokens_used_today || 0);
    setMessages([{
      role: "assistant",
      text: `ନମସ୍କାର ${u.name?.split(" ")[0]}! 👋 ମୁଁ amasathi — ତୁମର AI ପଢ଼ା ବନ୍ଧୁ। ${u.course_category} ${u.course_level} ବିଷୟରେ ଯେକୌଣସି ପ୍ରଶ୍ନ ପଚାର!`
    }]);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const plan_allows = (plan: string, feature: string) => {
    const perms: Record<string, string[]> = {
      free: ["translate", "chat"],
      basic: ["translate", "chat", "questions"],
      standard: ["translate", "chat", "questions", "video"],
      pro: ["translate", "chat", "questions", "video"],
    };
    return (perms[plan] || []).includes(feature);
  };

  const send = async () => {
    if (!input.trim() && !file) return;
    const token = localStorage.getItem("amasathi_token");
    if (!token) { router.push("/sign-in"); return; }

    const userMsg: Msg = { role: "user", text: input + (file ? ` [📎 ${file.name}]` : "") };
    setMessages(prev => [...prev, userMsg]);
    const sentInput = input;
    setInput(""); setLoading(true);

    const fd = new FormData();
    fd.append("message", sentInput);
    // Send session_id instead of full history payload
    if (sessionId) fd.append("session_id", sessionId);
    if (file) { fd.append("file", file); setFile(null); }

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error");
      setMessages(prev => [...prev, { role: "assistant", text: data.result }]);
      if (data.session_id) setSessionId(data.session_id);
      if (data.tokens_used) setTokensUsed(prev => prev + data.tokens_used);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", text: `⚠️ ${e.message}` }]);
    } finally { setLoading(false); }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const tokenLimit = user ? (
    user.plan === "free" ? 5000 :
    user.plan === "basic" ? 50000 :
    user.plan === "standard" ? 150000 : 500000
  ) : 5000;

  const tokenPct = Math.min(100, (tokensUsed / tokenLimit) * 100);

  return (
    <div className="chat-wrap">
      <div className="page-header">
        <div>
          <h1>💬 Ask amasathi</h1>
          <p>Your AI friend for <strong>{user?.course_category} {user?.course_level}</strong> · Ask in Odia or English</p>
        </div>
        <div className="token-meter">
          <div className="token-label">
            Tokens today: {tokensUsed.toLocaleString()} / {tokenLimit.toLocaleString()}
          </div>
          <div className="token-bar">
            <div className="token-fill" style={{
              width: `${tokenPct}%`,
              background: tokenPct > 90 ? "#ff8080" : tokenPct > 70 ? "#f59e0b" : "#4ade80"
            }} />
          </div>
        </div>
      </div>

      <div className="chat-box">
        <div className="messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.role === "assistant" && <div className="avatar">🎓</div>}
              <div className={`bubble ${m.role}`}>
               {m.role === "assistant"
                ? <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >{m.text}</ReactMarkdown>
                : m.text}
              </div>
              {m.role === "user" && (
                <div className="avatar user-av">{user?.name?.[0]?.toUpperCase()}</div>
              )}
            </div>
          ))}
          {loading && (
            <div className="msg assistant">
              <div className="avatar">🎓</div>
              <div className="bubble assistant typing"><span /><span /><span /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {file && (
          <div className="file-chip">
            📎 {file.name}
            <button onClick={() => setFile(null)}>✕</button>
          </div>
        )}

        <div className="input-row">
          <label className="attach-btn" htmlFor="chat-file">📎</label>
          <input id="chat-file" type="file" hidden onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
          <textarea className="chat-input" rows={1}
            placeholder="Type your question here... (Odia or English)"
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey} />
          <button className="send-btn" onClick={send} disabled={loading || (!input.trim() && !file)}>➤</button>
        </div>
      </div>

      <style jsx>{`
        .chat-wrap { display:flex; flex-direction:column; height:100vh; }
        .page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px; flex-shrink:0; gap:20px; flex-wrap:wrap; }
        .page-header h1 { color:#fff; font-size:22px; font-weight:800; margin:0 0 4px; }
        .page-header p { color:rgba(255,255,255,0.4); font-size:14px; margin:0; }
        .page-header strong { color:#c084fc; }
        .token-meter { min-width:200px; }
        .token-label { color:rgba(255,255,255,0.4); font-size:12px; margin-bottom:6px; }
        .token-bar { height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; }
        .token-fill { height:100%; border-radius:2px; transition:width 0.3s; }
        .chat-box { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:20px; display:flex; flex-direction:column; flex:1; overflow:hidden; }
        .messages { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:12px; }
        .msg { display:flex; gap:10px; align-items:flex-start; }
        .msg.user { flex-direction:row-reverse; }
        .avatar { width:34px; height:34px; border-radius:50%; background:rgba(192,132,252,0.15); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; margin-top:4px; }
        .user-av { background:linear-gradient(135deg,#c084fc,#a855f7); color:#fff; font-weight:800; font-size:15px; }
        .bubble { border-radius:16px; padding:12px 16px; font-size:14px; line-height:1.6; max-width:75%; }
        .bubble.assistant { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.85); }
        .bubble.user { background:rgba(192,132,252,0.12); border:1px solid rgba(192,132,252,0.2); color:rgba(255,255,255,0.85); white-space:pre-wrap; }
        .bubble.assistant :global(p) { margin:3px 0; }
        .bubble.assistant :global(ul),  .bubble.assistant :global(ol) { padding-left:20px; margin:4px 0; }
        .bubble.assistant :global(li) { margin:2px 0; }
        .typing { display:flex; gap:5px; align-items:center; padding:16px; }
        .typing span { width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,0.3); animation:bounce 1.2s infinite; }
        .typing span:nth-child(2) { animation-delay:0.2s; }
        .typing span:nth-child(3) { animation-delay:0.4s; }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
        .file-chip { margin:0 16px 8px; background:rgba(192,132,252,0.1); border:1px solid rgba(192,132,252,0.2); border-radius:10px; padding:8px 14px; color:#c084fc; font-size:13px; display:flex; align-items:center; justify-content:space-between; }
        .file-chip button { background:none; border:none; color:#c084fc; cursor:pointer; }
        .input-row { display:flex; gap:10px; align-items:flex-end; padding:16px; border-top:1px solid rgba(255,255,255,0.08); }
        .attach-btn { width:40px; height:40px; background:rgba(255,255,255,0.06); border-radius:12px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; flex-shrink:0; }
        .chat-input { flex:1; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding:12px 16px; color:#fff; font-size:14px; outline:none; resize:none; font-family:inherit; line-height:1.5; }
        .chat-input:focus { border-color:rgba(192,132,252,0.4); }
        .chat-input::placeholder { color:rgba(255,255,255,0.25); }
        .send-btn { width:44px; height:44px; background:linear-gradient(135deg,#c084fc,#a855f7); color:#fff; border:none; border-radius:13px; cursor:pointer; font-size:18px; flex-shrink:0; }
        .send-btn:disabled { opacity:0.4; cursor:not-allowed; }
      `}</style>
    </div>
  );
}