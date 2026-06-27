"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function VideoPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const u = localStorage.getItem("sahayak_current");
    if (!u) { router.push("/sign-in"); return; }
    const parsed = JSON.parse(u);
    if (parsed.plan !== "pro") { router.push("/profile?tab=plan"); return; }
    setUser(parsed);
  }, []);

  const submit = async () => {
    if (!file || !user) return;
    setLoading(true); setError(""); setResult("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("user_context", JSON.stringify({ name: user.name, category: user.category, level: user.level }));
    try {
      const res = await fetch(`${API}/api/video-summary`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Server error");
      setResult(data.result);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>🎬 Video Summary</h1>
        <p>Upload a lecture video — get a timestamped bilingual summary for <strong>{user?.category} {user?.level}</strong></p>
      </div>

      <div className="upload-card">
        <div className="dropzone" onClick={() => document.getElementById("v-file")?.click()}>
          <input id="v-file" type="file" accept=".mp4,.mov,.mkv,.webm" hidden
            onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
          {file ? <div className="file-name">🎥 {file.name}</div> : (
            <div><div style={{fontSize:48}}>🎬</div>
              <div className="drop-text">Click to upload lecture video</div>
              <div className="drop-sub">MP4, MOV, MKV, WEBM supported</div>
            </div>
          )}
        </div>
        {file && (
          <div className="info-box">⏳ Large videos may take up to 2 minutes to process. Please wait after clicking.</div>
        )}
        <button className="submit-btn" onClick={submit} disabled={!file || loading}>
          {loading ? <><span className="spinner" /> Processing video...</> : "Generate Summary →"}
        </button>
      </div>

      {error && <div className="error-box">⚠️ {error}</div>}
      {result && (
        <div className="result-box">
          <div className="result-header"><span>✅ Summary Ready</span>
            <button onClick={() => navigator.clipboard.writeText(result)}>📋 Copy</button>
          </div>
          <div className="result-text">{result}</div>
        </div>
      )}

      <style jsx>{`
        .page-header { margin-bottom:28px; }
        .page-header h1 { color:#fff; font-size:26px; font-weight:800; margin:0 0 8px; }
        .page-header p { color:rgba(255,255,255,0.45); font-size:15px; margin:0; }
        .page-header strong { color:#f59e0b; }
        .upload-card { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:20px; padding:28px; display:flex; flex-direction:column; gap:20px; }
        .dropzone { border:2px dashed rgba(255,255,255,0.15); border-radius:16px; padding:60px 40px; text-align:center; cursor:pointer; transition:border 0.2s; }
        .dropzone:hover { border-color:rgba(245,158,11,0.4); }
        .drop-text { color:rgba(255,255,255,0.6); font-size:16px; font-weight:600; margin-top:12px; }
        .drop-sub { color:rgba(255,255,255,0.3); font-size:13px; margin-top:6px; }
        .file-name { color:#f59e0b; font-size:16px; font-weight:600; }
        .info-box { background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); color:rgba(245,158,11,0.8); padding:12px 16px; border-radius:12px; font-size:13px; }
        .submit-btn { background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; font-weight:700; font-size:15px; padding:14px; border:none; border-radius:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; }
        .submit-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .spinner { width:18px; height:18px; border:3px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
        .error-box { background:rgba(255,80,80,0.1); border:1px solid rgba(255,80,80,0.3); color:#ff8080; padding:14px; border-radius:14px; margin-top:16px; }
        .result-box { background:rgba(255,255,255,0.04); border:1px solid rgba(245,158,11,0.2); border-radius:20px; margin-top:24px; overflow:hidden; }
        .result-header { display:flex; justify-content:space-between; padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.08); color:#f59e0b; font-weight:600; font-size:14px; }
        .result-header button { background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.2); color:#f59e0b; padding:6px 14px; border-radius:8px; cursor:pointer; font-size:13px; }
        .result-text { padding:20px; color:rgba(255,255,255,0.8); font-size:15px; line-height:1.8; white-space:pre-wrap; max-height:500px; overflow-y:auto; }
      `}</style>
    </div>
  );
}
