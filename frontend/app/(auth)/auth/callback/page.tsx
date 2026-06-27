// FILE: frontend/app/auth/callback/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveToken, fetchMe } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
  const token     = params.get("token");
  const onboarded = params.get("onboarded") === "true";

  console.log("Callback received:", { token: token?.slice(0,20), onboarded });

  if (!token) { 
    console.log("No token found, redirecting to sign-in");
    router.push("/sign-in"); 
    return; 
  }

  saveToken(token);
  console.log("Token saved, fetching user...");
  
  setTimeout(() => {
    fetchMe().then((user) => {
      console.log("User fetched:", user);
      router.push(user.onboarded ? "/dashboard" : "/onboarding");
    }).catch((err) => {
      console.log("fetchMe failed:", err);
      router.push("/sign-in");
    });
  }, 200);
}, []);

  return (
    <div style={{
      width: "100vw", minHeight: "100vh",
      background: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16,
    }}>
      <div style={{ fontSize: 48 }}>🎓</div>
      <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Signing you in...</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Please wait a moment</div>
    </div>
  );
}
