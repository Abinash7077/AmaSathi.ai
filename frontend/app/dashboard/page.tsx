"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, fetchMe } from "@/lib/auth";
const FEATURES = [
  { href: "/dashboard/translate", icon: "🌐", title: "Translate to Odia", desc: "Upload notes or textbook page — get line-by-line Odia translation instantly.", color: "#4ade80", plan: "basic" },
  { href: "/dashboard/questions", icon: "📝", title: "Generate Questions", desc: "Turn any topic image or PDF into exam-style practice questions.", color: "#60a5fa", plan: "basic" },
  { href: "/dashboard/video",     icon: "🎬", title: "Video Summary",     desc: "Upload a lecture video and get a timestamped bilingual summary.", color: "#f59e0b", plan: "pro" },
  { href: "/dashboard/chat",      icon: "💬", title: "Ask amasathi",       desc: "Chat with your AI study friend — text or file-based doubts, anytime.", color: "#c084fc", plan: "free" },
];

const PLAN_ORDER: Record<string, number> = { free: 0, basic: 1, science: 2, standard: 2, pro: 3 };
export default function DashboardHome() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);


const [loading, setLoading] = useState(true);

useEffect(() => {
  const token = localStorage.getItem("amasathi_token");
  if (!token) { router.push("/sign-in"); return; }

  fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(me => {
    if (me.detail) { router.push("/sign-in"); return; }
    if (!me.onboarded) { router.push("/onboarding"); return; }
    localStorage.setItem("amasathi_current", JSON.stringify(me));
    setUser(me);
    setLoading(false);
  })
  .catch(() => {
    const cached = localStorage.getItem("amasathi_current");
    if (!cached) { router.push("/sign-in"); return; }
    const u = JSON.parse(cached);
    if (!u.onboarded) { router.push("/onboarding"); return; }
    setUser(u);
    setLoading(false);
  });
}, []);

if (loading || !user) return (
  <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center"}}>
    <div style={{color:"rgba(255,255,255,0.4)", fontSize:"16px"}}>Loading...</div>
  </div>
);

  if (!user) return null;

  const userPlanLevel = PLAN_ORDER[user.plan] ?? 0;

  return (
    <div>
      {/* Welcome */}
      <div className="welcome">
        <h1>ନମସ୍କାର, {user.name?.split(" ")[0]}! 👋</h1>
        <p>{user.course_category} {user.course_level} {user.college ? `· ${user.college}` : ""}</p>
      </div>

      {/* Feature cards */}
      <div className="grid">
        {FEATURES.map(f => {
          const locked = PLAN_ORDER[f.plan] > userPlanLevel;
          return (
            <div key={f.href} className={`card ${locked ? "locked" : ""}`}
              onClick={() => !locked && router.push(f.href)}>
              <div className="card-icon" style={{ background: `${f.color}18`, color: f.color }}>
                {f.icon}
              </div>
              <div className="card-body">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
              {locked && (
                <div className="lock-badge">
                  🔒 {f.plan === "pro" ? "Pro" : "Basic"} plan
                </div>
              )}
              {!locked && <div className="card-arrow" style={{ color: f.color }}>→</div>}
            </div>
          );
        })}
      </div>

      {/* Plan upgrade banner */}
      {user.plan !== "pro" && (
        <div className="upgrade-banner">
          <div>
            <strong>Unlock more features!</strong>
            <span> Upgrade your plan to access Questions, Chat & Video Summary.</span>
          </div>
<Link href="/profile?tab=plan" style={{color:'white',textDecoration:'none'}} className="upgrade-btn">Upgrade →</Link>
        </div>
      )}

      <style jsx>{`
        .welcome { margin-bottom:32px; }
        .welcome h1 { color:#fff; font-size:28px; font-weight:800; margin:0 0 6px; }
        .welcome p { color:rgba(255,255,255,0.4); font-size:15px; margin:0; }
        .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px; margin-bottom:24px; }      .card { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:20px; padding:24px; display:flex; flex-direction:column; gap:16px; cursor:pointer; transition:all 0.2s; position:relative; }
        .card:hover:not(.locked) { border-color:rgba(255,255,255,0.2); transform:translateY(-2px); background:rgba(255,255,255,0.08); }
        .card.locked { opacity:0.5; cursor:not-allowed; }
        .card-icon { width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:26px; }
        .card-body h3 { color:#fff; font-size:17px; font-weight:700; margin:0 0 6px; }
        .card-body p { color:rgba(255,255,255,0.45); font-size:14px; margin:0; line-height:1.5; }
        .lock-badge { position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.4); font-size:11px; font-weight:600; padding:4px 10px; border-radius:20px; }
        .card-arrow { position:absolute; top:20px; right:20px; font-size:20px; font-weight:700; }
        .upgrade-banner { background:linear-gradient(...); border:1px solid ...; border-radius:16px; padding:20px 24px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-top:16px; }        .upgrade-banner strong { color:#4ade80; }
        .upgrade-banner span { color:rgba(255,255,255,0.5); font-size:14px; }
        .upgrade-btn { 
  background:linear-gradient(135deg,#4ade80,#22c55e); 
  color:#0f2027; 
  font-weight:700; 
  padding:10px 20px; 
  border-radius:12px; 
  text-decoration:none; 
  font-size:14px; 
  white-space:nowrap; 
}
      `}</style>
    </div>
  );
}
