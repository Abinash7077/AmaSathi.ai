// FILE: frontend/app/(auth)/reset-password/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/auth";

export default function ResetPasswordPage() {
  const router  = useRouter();
  const params  = useSearchParams();
  const token   = params.get("token") || "";
  const [form, setForm]     = useState({ password: "", confirm: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) router.push("/forgot-password");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await apiPost("/api/auth/reset-password", { token, password: form.password });
      router.push("/sign-in?reset=1");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">🔒</div>
        <h1 className="auth-title">Set New Password</h1>
        <p className="auth-sub">Choose a strong password for your account</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>New Password</label>
            <input type="password" placeholder="Min 6 characters" required
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="field">
            <label>Confirm New Password</label>
            <input type="password" placeholder="Repeat new password" required
              value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
          </div>

          {/* Password strength indicator */}
          {form.password && (
            <div className="strength">
              <div className="strength-bar">
                <div className="strength-fill" style={{
                  width: form.password.length >= 10 ? "100%" : form.password.length >= 6 ? "60%" : "30%",
                  background: form.password.length >= 10 ? "#4ade80" : form.password.length >= 6 ? "#f59e0b" : "#ff8080",
                }} />
              </div>
              <span style={{ color: form.password.length >= 10 ? "#4ade80" : form.password.length >= 6 ? "#f59e0b" : "#ff8080" }}>
                {form.password.length >= 10 ? "Strong" : form.password.length >= 6 ? "Medium" : "Weak"}
              </span>
            </div>
          )}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password →"}
          </button>
        </form>

        <p className="auth-switch"><Link href="/sign-in">← Back to Sign In</Link></p>
      </div>

      <style jsx>{`
        .auth-bg { width:100vw; min-height:100vh; background:linear-gradient(135deg,#0f2027,#203a43,#2c5364); display:flex; align-items:center; justify-content:center; padding:20px; }
        .auth-card { background:rgba(255,255,255,0.05); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:48px 40px; width:100%; max-width:440px; }
        .auth-logo { font-size:48px; text-align:center; margin-bottom:12px; }
        .auth-title { color:#fff; font-size:26px; font-weight:700; text-align:center; margin:0 0 8px; }
        .auth-sub { color:rgba(255,255,255,0.5); text-align:center; margin:0 0 28px; font-size:14px; }
        .auth-error { background:rgba(255,80,80,0.15); border:1px solid rgba(255,80,80,0.3); color:#ff8080; padding:12px 16px; border-radius:12px; margin-bottom:16px; font-size:14px; }
        .auth-form { display:flex; flex-direction:column; gap:16px; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .field label { color:rgba(255,255,255,0.7); font-size:13px; font-weight:500; }
        .field input { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:14px 16px; color:#fff; font-size:15px; outline:none; transition:border 0.2s; }
        .field input:focus { border-color:#4ade80; }
        .field input::placeholder { color:rgba(255,255,255,0.3); }
        .strength { display:flex; align-items:center; gap:10px; }
        .strength-bar { flex:1; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; }
        .strength-fill { height:100%; border-radius:2px; transition:all 0.3s; }
        .strength span { font-size:12px; font-weight:600; white-space:nowrap; }
        .auth-btn { background:linear-gradient(135deg,#4ade80,#22c55e); color:#0f2027; font-weight:700; font-size:16px; padding:16px; border:none; border-radius:14px; cursor:pointer; width:100%; }
        .auth-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .auth-switch { color:rgba(255,255,255,0.4); text-align:center; margin-top:24px; font-size:14px; }
        .auth-switch a { color:#4ade80; text-decoration:none; font-weight:600; }
      `}</style>
    </div>
  );
}
