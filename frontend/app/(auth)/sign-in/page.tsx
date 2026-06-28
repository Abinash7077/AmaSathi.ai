// FILE: frontend/app/(auth)/sign-in/page.tsx
"use client";
import { Suspense,useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, googleLoginUrl } from "@/lib/auth";

function SignInContent() {
  const router  = useRouter();
  const params  = useSearchParams();
  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  if (params.get("reset"))      setSuccess("Password reset successfully!");
  if (params.get("registered")) setSuccess("Account created! Please sign in.");
  
  const reason = localStorage.getItem("amasathi_kick_reason");
  if (reason === "session_expired") {
    setError("You were signed out because your account was used on another device.");
    localStorage.removeItem("amasathi_kick_reason");
  }
}, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    try {
      const user = await signIn(form.email, form.password);
      router.push(user.onboarded ? "/dashboard" : "/onboarding");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">🎓</div>
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-sub">Sign in to continue learning with amasathi</p>

        {success && <div className="auth-success">{success}</div>}
        {error   && <div className="auth-error">{error}</div>}

        {/* Google OAuth */}
        <a href={googleLoginUrl()} className="google-btn">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </a>

        <div className="divider"><span>or sign in with email</span></div>

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
            <Link href="/forgot-password" className="forgot-link">Forgot password?</Link>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <p className="auth-switch">Don't have an account? <Link href="/sign-up">Sign up free</Link></p>
      </div>

      <style jsx>{`
        .auth-bg { width:100vw; min-height:100vh; background:linear-gradient(135deg,#0f2027,#203a43,#2c5364); display:flex; align-items:center; justify-content:center; padding:20px; }
        .auth-card { background:rgba(255,255,255,0.05); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:48px 40px; width:100%; max-width:440px; }
        .auth-logo { font-size:48px; text-align:center; margin-bottom:12px; }
        .auth-title { color:#fff; font-size:28px; font-weight:700; text-align:center; margin:0 0 8px; }
        .auth-sub { color:rgba(255,255,255,0.5); text-align:center; margin:0 0 24px; font-size:14px; }
        .auth-error { background:rgba(255,80,80,0.15); border:1px solid rgba(255,80,80,0.3); color:#ff8080; padding:12px 16px; border-radius:12px; margin-bottom:16px; font-size:14px; }
        .auth-success { background:rgba(74,222,128,0.15); border:1px solid rgba(74,222,128,0.3); color:#4ade80; padding:12px 16px; border-radius:12px; margin-bottom:16px; font-size:14px; }
        .google-btn { display:flex; align-items:center; justify-content:center; gap:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:13px; color:#fff; font-size:15px; font-weight:600; text-decoration:none; transition:all 0.2s; }
        .google-btn:hover { background:rgba(255,255,255,0.14); border-color:rgba(255,255,255,0.3); }
        .divider { display:flex; align-items:center; gap:12px; margin:20px 0; }
        .divider::before,.divider::after { content:''; flex:1; height:1px; background:rgba(255,255,255,0.1); }
        .divider span { color:rgba(255,255,255,0.3); font-size:12px; white-space:nowrap; }
        .auth-form { display:flex; flex-direction:column; gap:16px; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .field label { color:rgba(255,255,255,0.7); font-size:13px; font-weight:500; }
        .field input { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:14px 16px; color:#fff; font-size:15px; outline:none; transition:border 0.2s; }
        .field input:focus { border-color:#4ade80; }
        .field input::placeholder { color:rgba(255,255,255,0.3); }
        .forgot-link { color:rgba(255,255,255,0.35); font-size:12px; text-decoration:none; text-align:right; margin-top:2px; }
        .forgot-link:hover { color:#4ade80; }
        .auth-btn { margin-top:4px; background:linear-gradient(135deg,#4ade80,#22c55e); color:#0f2027; font-weight:700; font-size:16px; padding:16px; border:none; border-radius:14px; cursor:pointer; transition:opacity 0.2s; width:100%; }
        .auth-btn:hover { opacity:0.9; }
        .auth-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .auth-switch { color:rgba(255,255,255,0.5); text-align:center; margin-top:24px; font-size:14px; }
        .auth-switch a { color:#4ade80; text-decoration:none; font-weight:600; }
      `}</style>
    </div>
  );
}

export default function SignInPage() {
   return (
      <Suspense fallback={<div>Loading...</div>}>
         <SignInContent />
      </Suspense>
   );
}