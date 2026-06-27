"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.get("registered")) setSuccess("Account created! Please sign in.");
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const testUser = {
    name: "Test User",
    email: "test@test.com",
    plan: "pro",
    onboarded: true,
    category: "GNM Nursing",
    level: "1st Year",
    college: "SCB Medical",
    mobile: "9999999999",
  };
  localStorage.setItem("sahayak_current", JSON.stringify(testUser));
  router.push("/dashboard");
    /* setError(""); setSuccess("");
    setLoading(true);
    const users = JSON.parse(localStorage.getItem("sahayak_users") || "[]");
    const user = users.find((u: any) => u.email === form.email && u.password === form.password);
    if (!user) { setError("Invalid email or password"); setLoading(false); return; }
    localStorage.setItem("sahayak_current", JSON.stringify(user));
    setLoading(false);
    router.push(user.onboarded ? "/dashboard" : "/onboarding"); */
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">🩺</div>
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-sub">Sign in to continue learning with Sahayak</p>

        {success && <div className="auth-success">{success}</div>}
        {error   && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Email Address</label>
            <input type="email" placeholder="Enter your email" required
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="Enter your password" required
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <p className="auth-switch">Don't have an account? <Link href="/sign-up">Sign up free</Link></p>
      </div>

      <style jsx>{`
.auth-bg { 
  width: 100vw; 
  min-height: 100vh; 
  background: linear-gradient(135deg,#0f2027,#203a43,#2c5364); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  padding: 20px; 
}        .auth-card { background:rgba(255,255,255,0.05); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:48px 40px; width:100%; max-width:440px; }
        .auth-logo { font-size:48px; text-align:center; margin-bottom:12px; }
        .auth-title { color:#fff; font-size:28px; font-weight:700; text-align:center; margin:0 0 8px; }
        .auth-sub { color:rgba(255,255,255,0.5); text-align:center; margin:0 0 32px; font-size:14px; }
        .auth-error   { background:rgba(255,80,80,0.15); border:1px solid rgba(255,80,80,0.3); color:#ff8080; padding:12px 16px; border-radius:12px; margin-bottom:20px; font-size:14px; }
        .auth-success { background:rgba(74,222,128,0.15); border:1px solid rgba(74,222,128,0.3); color:#4ade80; padding:12px 16px; border-radius:12px; margin-bottom:20px; font-size:14px; }
        .auth-form { display:flex; flex-direction:column; gap:16px; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .field label { color:rgba(255,255,255,0.7); font-size:13px; font-weight:500; }
        .field input { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:14px 16px; color:#fff; font-size:15px; outline:none; transition:border 0.2s; }
        .field input:focus { border-color:#4ade80; }
        .field input::placeholder { color:rgba(255,255,255,0.3); }
        .auth-btn { margin-top:8px; background:linear-gradient(135deg,#4ade80,#22c55e); color:#0f2027; font-weight:700; font-size:16px; padding:16px; border:none; border-radius:14px; cursor:pointer; transition:opacity 0.2s; }
        .auth-btn:hover { opacity:0.9; }
        .auth-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .auth-switch { color:rgba(255,255,255,0.5); text-align:center; margin-top:24px; font-size:14px; }
        .auth-switch a { color:#4ade80; text-decoration:none; font-weight:600; }
      `}</style>
    </div>
  );
}
