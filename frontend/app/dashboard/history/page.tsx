// FILE: frontend/app/dashboard/history/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser]       = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
  const u = getUser();
  if (!u) { router.push("/sign-in"); return; }
  const token = localStorage.getItem("amasathi_token") || "";

  // Check fresh plan from DB
  fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(me => {
    if (me.plan === "free") { router.push("/profile?tab=plan"); return; }
    setUser(me);
    loadHistory();
  });
}, []);

  const loadHistory = async () => {
    const token = localStorage.getItem("amasathi_token");
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/history`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setSessions(data);
    } catch {}
    setLoading(false);
  };

  const loadSession = async (id: string) => {
    const token = localStorage.getItem("amasathi_token");
    const res   = await fetch(`${API}/api/history/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data  = await res.json();
    if (res.ok) setSelected(data);
  };

  const deleteSession = async (id: string) => {
    const token = localStorage.getItem("amasathi_token");
    await fetch(`${API}/api/history/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setSessions(prev => prev.filter(s => s._id !== id));
    if (selected?._id === id) setSelected(null);
  };

  const fmt = (d: string) => d ? new Date(d).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "";

  return (
    <div className="history-wrap">
      <h1 className="page-title">🕘 Chat History</h1>

      <div className="history-layout">
        {/* Sessions list */}
        <div className="sessions-panel">
          {loading ? (
            <div className="empty">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="empty">No chat history yet.<br/>Start a conversation in Ask amasathi!</div>
          ) : (
            sessions.map(s => (
              <div key={s._id}
                className={`session-item ${selected?._id === s._id ? "active" : ""}`}
                onClick={() => loadSession(s._id)}>
                <div className="s-title">{s.title || "Untitled chat"}</div>
                <div className="s-meta">{fmt(s.updated_at)}</div>
                <button className="s-delete" onClick={e => { e.stopPropagation(); deleteSession(s._id); }}>🗑</button>
              </div>
            ))
          )}
        </div>

        {/* Messages */}
        <div className="messages-panel">
          {!selected ? (
            <div className="no-select">← Select a conversation to view</div>
          ) : (
            <>
              <div className="msg-header">
                <h3>{selected.title}</h3>
                <span>{fmt(selected.created_at)}</span>
              </div>
              <div className="messages">
                {selected.messages?.map((m: any, i: number) => (
                  <div key={i} className={`msg ${m.role}`}>
                    <div className={`bubble ${m.role}`}>{m.text}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .history-wrap { height:calc(100vh - 100px); display:flex; flex-direction:column; }
        .page-title { color:#fff; font-size:22px; font-weight:800; margin:0 0 20px; }
        .history-layout { display:flex; gap:16px; flex:1; overflow:hidden; }
        .sessions-panel { width:280px; flex-shrink:0; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow-y:auto; }
        .session-item { padding:14px 16px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer; position:relative; transition:background 0.15s; }
        .session-item:hover { background:rgba(255,255,255,0.04); }
        .session-item.active { background:rgba(192,132,252,0.1); border-left:3px solid #c084fc; }
        .s-title { color:#fff; font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:24px; }
        .s-meta { color:rgba(255,255,255,0.3); font-size:11px; margin-top:4px; }
        .s-delete { position:absolute; top:12px; right:12px; background:none; border:none; color:rgba(255,255,255,0.2); cursor:pointer; font-size:13px; }
        .s-delete:hover { color:#ff8080; }
        .empty { color:rgba(255,255,255,0.3); text-align:center; padding:32px 16px; font-size:14px; line-height:1.6; }
        .messages-panel { flex:1; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:16px; display:flex; flex-direction:column; overflow:hidden; }
        .no-select { color:rgba(255,255,255,0.2); text-align:center; margin:auto; font-size:15px; }
        .msg-header { padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; }
        .msg-header h3 { color:#fff; font-size:15px; font-weight:700; margin:0; }
        .msg-header span { color:rgba(255,255,255,0.3); font-size:12px; }
        .messages { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:12px; }
        .msg { display:flex; }
        .msg.user { justify-content:flex-end; }
        .bubble { border-radius:14px; padding:10px 14px; font-size:14px; line-height:1.6; max-width:75%; white-space:pre-wrap; }
        .bubble.assistant { background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.8); }
        .bubble.user { background:rgba(192,132,252,0.12); color:rgba(255,255,255,0.85); }
      `}</style>
    </div>
  );
}