// FILE: frontend/app/dashboard/questions/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function QuestionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/sign-in"); return; }
    if (u.plan === "free") { router.push("/profile?tab=plan"); return; }
    setUser(u);
  }, []);

  const submit = async () => {
    if (!file || !user) return;
    setLoading(true); setError(""); setResult("");

    const token = localStorage.getItem("amasathi_token");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("difficulty", difficulty);

    try {
      const res = await fetch(`${API}/api/questions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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
        <h1>📝 Generate Questions</h1>
        <p>
          Upload your study material — get exam-style questions for{" "}
          <strong>{user?.course_category} {user?.course_level}</strong>
        </p>
      </div>

      <div className="upload-card">
        <div className="dropzone" onClick={() => document.getElementById("q-file")?.click()}>
          <input id="q-file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" hidden
            onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
          {file ? (
            <div className="file-name">📄 {file.name}</div>
          ) : (
            <div>
              <div style={{ fontSize: 40 }}>📂</div>
              <div className="drop-text">Click to upload image or PDF</div>
            </div>
          )}
        </div>

        <div className="difficulty-row">
          {["easy", "medium", "hard"].map((d) => (
            <button key={d} className={`diff-btn ${difficulty === d ? "active" : ""}`}
              onClick={() => setDifficulty(d)}>
              {d === "easy" ? "🟢" : d === "medium" ? "🟡" : "🔴"}{" "}
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        <button className="submit-btn" onClick={submit} disabled={!file || loading}>
          {loading ? "Generating..." : "Generate Questions →"}
        </button>
      </div>

      {error && <div className="error-box">⚠️ {error}</div>}

      {result && (
        <div className="result-box">
          <div className="result-header">
            <span>✅ Questions Ready</span>
            <button onClick={() => navigator.clipboard.writeText(result)}>📋 Copy</button>
          </div>
          <div className="result-text">
<ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-header { margin-bottom: 28px; }
        .page-header h1 { color: #fff; font-size: 26px; font-weight: 800; margin: 0 0 8px; }
        .page-header p { color: rgba(255,255,255,0.45); font-size: 15px; margin: 0; }
        .page-header strong { color: #60a5fa; }

        .upload-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 20px; }

        .dropzone { border: 2px dashed rgba(255,255,255,0.15); border-radius: 16px; padding: 40px; text-align: center; cursor: pointer; transition: border 0.2s; }
        .dropzone:hover { border-color: rgba(96,165,250,0.4); }
        .drop-text { color: rgba(255,255,255,0.4); font-size: 15px; margin-top: 10px; }
        .file-name { color: #60a5fa; font-size: 16px; font-weight: 600; }

        .difficulty-row { display: flex; gap: 10px; }
        .diff-btn { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); padding: 12px; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; }
        .diff-btn.active { background: rgba(96,165,250,0.1); border-color: #60a5fa; color: #60a5fa; }

        .submit-btn { background: linear-gradient(135deg,#60a5fa,#3b82f6); color: #fff; font-weight: 700; font-size: 15px; padding: 14px; border: none; border-radius: 12px; cursor: pointer; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .error-box { background: rgba(255,80,80,0.1); border: 1px solid rgba(255,80,80,0.3); color: #ff8080; padding: 14px; border-radius: 14px; margin-top: 16px; }

        .result-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(96,165,250,0.2); border-radius: 20px; margin-top: 24px; overflow: hidden; }
        .result-header { display: flex; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); color: #60a5fa; font-weight: 600; font-size: 14px; }
        .result-header button { background: rgba(96,165,250,0.1); border: 1px solid rgba(96,165,250,0.2); color: #60a5fa; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; }

        .result-text { padding: 20px; color: rgba(255,255,255,0.9); font-size: 15px; max-height: 600px; overflow-y: auto; }

        .result-text :global(h1),
        .result-text :global(h2),
        .result-text :global(h3) { color: #fff; margin: 14px 0 6px; font-weight: 700; }

        .result-text :global(p) { margin: 4px 0; line-height: 1.6; }

        .result-text :global(ol),
        .result-text :global(ul) { padding-left: 20px; margin: 4px 0; }

        .result-text :global(ol) { list-style-type: decimal; }
        .result-text :global(ul) { list-style-type: disc; }

        .result-text :global(li) { margin: 2px 0; line-height: 1.5; }
        .result-text :global(li > p) { display: inline; margin: 0; }

        .result-text :global(strong) { color: #60a5fa; font-weight: 700; }

        .result-text :global(hr) { border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 16px 0; }

        .result-text :global(code) { background: rgba(255,255,255,0.08); padding: 2px 5px; border-radius: 4px; font-size: 13px; }

        .result-text :global(blockquote) { border-left: 3px solid #60a5fa; padding-left: 12px; margin: 8px 0; color: rgba(255,255,255,0.6); }
      `}</style>
    </div>
  );
}