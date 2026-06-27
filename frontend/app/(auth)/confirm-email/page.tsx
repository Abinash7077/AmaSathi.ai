"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ConfirmEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email") || "";
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  const resendEmail = async () => {
    setLoading(true);
    await supabase.auth.resend({ type: "signup", email });
    setResent(true);
    setLoading(false);
  };

  return (
    <div className="bg">
      <div className="card">
        <div className="icon">📧</div>
        <h1>Check your email</h1>
        <p className="sub">We sent a confirmation link to</p>
        <div className="email-box">{email}</div>
        <p className="instruction">
          Click the link in the email to verify your account, then come back and sign in.
        </p>

        <button className="sign-in-btn" onClick={() => router.push("/sign-in")}>
          I've confirmed — Sign In →
        </button>

        <div className="divider">Didn't receive it?</div>

        {resent ? (
          <div className="success">✅ Email resent! Check your inbox.</div>
        ) : (
          <button className="resend-btn" onClick={resendEmail} disabled={loading}>
            {loading ? "Sending..." : "Resend confirmation email"}
          </button>
        )}

        <p className="spam">Also check your spam/junk folder</p>
      </div>

      <style jsx>{`
        .bg { width:100vw; min-height:100vh; background:linear-gradient(135deg,#0f2027,#203a43,#2c5364); display:flex; align-items:center; justify-content:center; padding:20px; }
        .card { background:rgba(255,255,255,0.05); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:48px 40px; width:100%; max-width:440px; display:flex; flex-direction:column; align-items:center; gap:16px; text-align:center; }
        .icon { font-size:64px; }
        h1 { color:#fff; font-size:26px; font-weight:700; margin:0; }
        .sub { color:rgba(255,255,255,0.5); margin:0; font-size:15px; }
        .email-box { background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.3); color:#4ade80; padding:10px 20px; border-radius:10px; font-weight:600; font-size:15px; }
        .instruction { color:rgba(255,255,255,0.4); font-size:14px; line-height:1.6; margin:0; }
        .sign-in-btn { width:100%; background:linear-gradient(135deg,#4ade80,#22c55e); color:#0f2027; font-weight:700; font-size:16px; padding:16px; border:none; border-radius:14px; cursor:pointer; transition:opacity 0.2s; }
        .sign-in-btn:hover { opacity:0.9; }
        .divider { color:rgba(255,255,255,0.3); font-size:13px; }
        .resend-btn { background:transparent; border:1px solid rgba(255,255,255,0.2); color:rgba(255,255,255,0.6); padding:12px 24px; border-radius:12px; cursor:pointer; font-size:14px; transition:all 0.2s; }
        .resend-btn:hover { border-color:#4ade80; color:#4ade80; }
        .resend-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .success { color:#4ade80; font-size:14px; }
        .spam { color:rgba(255,255,255,0.2); font-size:12px; margin:0; }
      `}</style>
    </div>
  );
}