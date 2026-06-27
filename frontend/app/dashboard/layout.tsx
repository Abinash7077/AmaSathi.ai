import React from "react";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)" }}>
       <Sidebar />
      <main style={{
        marginRight: "64px", 
        flex: 1,
        padding: "32px 24px",
        minHeight: "100vh",
        overflow: "auto"
      }}>
        {children}
      </main>
    </div>
  );
}