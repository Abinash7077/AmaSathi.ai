// FILE: frontend/app/dashboard/translate/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import ReactMarkdown from "react-markdown";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function TranslatePage() {
  const router = useRouter();
  const [user, setUser]       = useState<any>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [drag, setDrag]       = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/sign-in"); return; }
    setUser(u);
  }, []);

  const handleFile = (f: File) => {
    setFile(f); setResult(""); setError("");
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const submit = async () => {
    if (!file || !user) return;
    setLoading(true); setError(""); setResult("");
    const token = localStorage.getItem("amasathi_token");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/api/translate`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Server error");
      setResult(data.result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>🌐 Translate to Odia</h1>
        <p>Upload your notes or textbook page — amasathi will translate line by line into Odia for{" "}
          <strong>{user?.course_category} {user?.course_level}</strong>
        </p>
      </div>

      {/* Drop zone */}
      <div className={`dropzone ${drag ? "drag" : ""} ${file ? "has-file" : ""}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => document.getElementById("file-input")?.click()}>
        <input id="file-input" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" hidden
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        {preview ? (
          <img src={preview} alt="preview" className="preview-img" />
        ) : file ? (
          <div className="file-info">📄 {file.name}</div>
        ) : (
          <div className="drop-prompt">
            <div className="drop-icon">📂</div>
            <div className="drop-text">Drop your image or PDF here</div>
            <div className="drop-sub">or click to browse · JPG, PNG, PDF supported</div>
          </div>
        )}
      </div>

      {file && (
        <div className="actions">
          <button className="clear-btn" onClick={() => { setFile(null); setPreview(null); setResult(""); }}>✕ Clear</button>
          <button className="submit-btn" onClick={submit} disabled={loading}>
            {loading ? <span className="spinner" /> : "Translate →"}
          </button>
        </div>
      )}

      {error && <div className="error-box">⚠️ {error}</div>}

      {result && (
        <div className="result-box">
          <div className="result-header">
            <span>✅ Translation Ready</span>
            <button onClick={() => navigator.clipboard.writeText(result)}>📋 Copy</button>
          </div>
          <div className="result-text">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-header { margin-bottom:28px; }
        .page-header h1 { color:#fff; font-size:26px; font-weight:800; margin:0 0 8px; }
        .page-header p { color:rgba(255,255,255,0.45); font-size:15px; margin:0; }
        .page-header strong { color:#4ade80; }

        .dropzone { border:2px dashed rgba(255,255,255,0.15); border-radius:20px; padding:40px; text-align:center; cursor:pointer; transition:all 0.2s; min-height:180px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.03); }
        .dropzone.drag { border-color:#4ade80; background:rgba(74,222,128,0.05); }
        .dropzone.has-file { border-style:solid; border-color:rgba(74,222,128,0.3); }
        .drop-icon { font-size:48px; margin-bottom:12px; }
        .drop-text { color:#fff; font-size:17px; font-weight:600; }
        .drop-sub { color:rgba(255,255,255,0.3); font-size:13px; margin-top:6px; }
        .file-info { color:#4ade80; font-size:16px; font-weight:600; }
        .preview-img { max-width:100%; max-height:300px; border-radius:12px; object-fit:contain; }

        .actions { display:flex; gap:12px; justify-content:flex-end; margin-top:16px; }
        .clear-btn { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.5); padding:12px 20px; border-radius:12px; cursor:pointer; font-size:14px; }
        .submit-btn { background:linear-gradient(135deg,#4ade80,#22c55e); color:#0f2027; font-weight:700; font-size:15px; padding:12px 28px; border:none; border-radius:12px; cursor:pointer; display:flex; align-items:center; gap:8px; }
        .submit-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .spinner { width:18px; height:18px; border:3px solid #0f202740; border-top-color:#0f2027; border-radius:50%; animation:spin 0.7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        .error-box { background:rgba(255,80,80,0.1); border:1px solid rgba(255,80,80,0.3); color:#ff8080; padding:14px 18px; border-radius:14px; margin-top:16px; font-size:14px; }

        .result-box { background:rgba(255,255,255,0.04); border:1px solid rgba(74,222,128,0.2); border-radius:20px; margin-top:24px; overflow:hidden; }
        .result-header { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.08); color:#4ade80; font-weight:600; font-size:14px; }
        .result-header button { background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.2); color:#4ade80; padding:6px 14px; border-radius:8px; cursor:pointer; font-size:13px; }

        .result-text { padding:20px; color:rgba(255,255,255,0.85); font-size:15px; max-height:600px; overflow-y:auto; }

        .result-text :global(p) { margin:4px 0; line-height:1.7; }
        .result-text :global(strong) { color:#4ade80; font-weight:700; }
        .result-text :global(hr) { border:none; border-top:1px solid rgba(255,255,255,0.1); margin:12px 0; }
        .result-text :global(ul), .result-text :global(ol) { padding-left:20px; margin:4px 0; }
        .result-text :global(li) { margin:2px 0; line-height:1.6; }
        .result-text :global(li > p) { display:inline; margin:0; }
        .result-text :global(h1), .result-text :global(h2), .result-text :global(h3) { color:#fff; margin:12px 0 6px; font-weight:700; }
        .result-text :global(blockquote) { border-left:3px solid #4ade80; padding-left:12px; margin:8px 0; color:rgba(255,255,255,0.6); }
      `}</style>
    </div>
  );
}