"use client";
import {Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/api";
import { getUser, fetchMe } from "@/lib/auth";

declare global { interface Window { Razorpay: any; } }

const PLANS: Record<string, { name: string; price: number; features: string[] }> = {
  basic: { name: "Basic",  price: 99,  features: ["Translate to Odia", "Generate Questions", "Ask amasathi Chat", "200 requests/month"] },
  pro:   { name: "Pro",    price: 499, features: ["All Basic features", "Video Summary", "Unlimited requests", "Priority support"] },
};

function PaymentContent() {
  const router   = useRouter();
  const params   = useSearchParams();
  const planId   = params.get("plan") || "basic";
  const plan     = PLANS[planId];
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

 useEffect(() => {
  // Use localStorage like the rest of your app
const u = getUser();
  if (!u) { router.push("/sign-in"); return; }
  if (u.plan === planId || u.plan === "pro") { 
    router.push("/dashboard"); return; 
  }
  setProfile(u);

  // Load Razorpay script
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  document.body.appendChild(script);
}, []);

  const handlePayment = async () => {
    setLoading(true); setError("");
    try {
      // Create order on backend
      const order = await apiPost("/api/payment/create-order", { plan: planId });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "amasathi",
        description: `${plan.name} Plan – Monthly`,
        image: "/logo.png",
        order_id: order.order_id,
        prefill: {
  name: profile?.name || "",
  email: profile?.email || "",
  contact: profile?.mobile || "",
},
        theme: { color: "#4ade80" },
        handler: async (response: any) => {
  try {
    await apiPost("/api/payment/verify", {
      razorpay_order_id:   response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature:  response.razorpay_signature,
      plan:   planId,
      amount: order.amount,
    });

    // Update user in localStorage with new plan and onboarded status
    const updatedUser = { ...profile, plan: planId, onboarded: true };
    localStorage.setItem("amasathi_user", JSON.stringify(updatedUser));

    router.push("/dashboard?upgraded=1");
  } catch {
    setError("Payment verification failed. Contact support.");
  }
},
        modal: { ondismiss: () => setLoading(false) },
      };

      const rz = new window.Razorpay(options);
      rz.open();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  if (!plan) return null;

  return (
    <div className="pay-bg">
      <div className="pay-card">
        <div className="pay-logo">🎓 amasathi</div>
        <h1 className="pay-title">Upgrade to {plan.name}</h1>
        <div className="price-box">
          <span className="price">₹{plan.price}</span>
          <span className="per">/month</span>
        </div>

        <ul className="features">
          {plan.features.map(f => (
            <li key={f}><span className="check">✓</span>{f}</li>
          ))}
        </ul>

        {error && <div className="error-box">⚠️ {error}</div>}

        <button className="pay-btn" onClick={handlePayment} disabled={loading}>
          {loading ? "Processing..." : `Pay ₹${plan.price} with Razorpay →`}
        </button>

        <p className="secure">🔒 Secured by Razorpay · UPI · Cards · Net Banking</p>
        <button className="skip-btn" onClick={() => router.push("/dashboard")}>
          Continue with Free plan
        </button>
      </div>

      <style jsx>{`
        .pay-bg { width:100vw; min-height:100vh; background:linear-gradient(135deg,#0f2027,#203a43,#2c5364); display:flex; align-items:center; justify-content:center; padding:20px; }
        .pay-card { background:rgba(255,255,255,0.05); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:48px 40px; width:100%; max-width:440px; display:flex; flex-direction:column; gap:20px; }
        .pay-logo { color:#4ade80; font-size:20px; font-weight:800; text-align:center; }
        .pay-title { color:#fff; font-size:26px; font-weight:700; text-align:center; margin:0; }
        .price-box { text-align:center; }
        .price { color:#4ade80; font-size:56px; font-weight:900; }
        .per { color:rgba(255,255,255,0.4); font-size:18px; }
        .features { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:12px; background:rgba(255,255,255,0.04); border-radius:16px; padding:20px; }
        .features li { color:rgba(255,255,255,0.8); font-size:15px; display:flex; align-items:center; gap:10px; }
        .check { color:#4ade80; font-weight:700; font-size:16px; }
        .error-box { background:rgba(255,80,80,0.15); border:1px solid rgba(255,80,80,0.3); color:#ff8080; padding:12px 16px; border-radius:12px; font-size:14px; }
        .pay-btn { background:linear-gradient(135deg,#4ade80,#22c55e); color:#0f2027; font-weight:700; font-size:16px; padding:18px; border:none; border-radius:14px; cursor:pointer; transition:opacity 0.2s; }
        .pay-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .pay-btn:hover:not(:disabled) { opacity:0.9; }
        .secure { color:rgba(255,255,255,0.3); text-align:center; font-size:13px; margin:0; }
        .skip-btn { background:transparent; border:none; color:rgba(255,255,255,0.3); font-size:13px; cursor:pointer; text-decoration:underline; }
      `}</style>
    </div>
  );
}
export default function PaymentPage() {
   return (
      <Suspense fallback={<div>Loading...</div>}>
         <PaymentContent />
      </Suspense>
   );
}