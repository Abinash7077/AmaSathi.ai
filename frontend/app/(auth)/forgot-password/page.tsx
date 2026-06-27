// FILE: frontend/app/(auth)/forgot-password/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await apiPost("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">🔑</div>
        <h1 className="auth-title">Forgot Password?</h1>
        <p className="auth-sub">Enter your email and we'll send you a reset link</p>

        {error && <div className="auth-error">{error}</div>}

        {sent ? (
          <div className="success-box">
            <div className="success-icon">📧</div>
            <h3>Check your email!</h3>
            <p>We've sent a password reset link to <strong>{email}</strong>.</p>
            <p>The link expires in <strong>1 hour</strong>.</p>
            <p style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              Didn't receive it? Check your spam folder or
            </p>
            <button className="resend-btn" onClick={() => setSent(false)}>try again</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label>Email Address</label>
              <input type="email" placeholder="Enter your registered email" required
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link →"}
            </button>
          </form>
        )}

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
        .auth-btn { background:linear-gradient(135deg,#4ade80,#22c55e); color:#0f2027; font-weight:700; font-size:16px; padding:16px; border:none; border-radius:14px; cursor:pointer; width:100%; }
        .auth-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .success-box { background:rgba(74,222,128,0.08); border:1px solid rgba(74,222,128,0.2); border-radius:16px; padding:28px; text-align:center; }
        .success-icon { font-size:48px; margin-bottom:12px; }
        .success-box h3 { color:#4ade80; font-size:18px; margin:0 0 12px; }
        .success-box p { color:rgba(255,255,255,0.6); font-size:14px; margin:4px 0; }
        .success-box strong { color:#fff; }
        .resend-btn { background:none; border:none; color:#4ade80; cursor:pointer; text-decoration:underline; font-size:13px; }
        .auth-switch { color:rgba(255,255,255,0.4); text-align:center; margin-top:24px; font-size:14px; }
        .auth-switch a { color:#4ade80; text-decoration:none; font-weight:600; }
      `}</style>
    </div>
  );
}
