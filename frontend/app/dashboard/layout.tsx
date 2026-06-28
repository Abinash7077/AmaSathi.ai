'use client';
import React from "react";
import Sidebar from "@/components/Sidebar";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)", maxWidth: "100vw" }}>
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
        <style jsx global>{`
        .main-content {
          flex: 1;
          padding: 32px 24px;
          min-height: 100vh;
          overflow-x: hidden;
          overflow-y: auto;
          min-width: 0;
          padding-bottom: 48px;
          padding-right: 90px;  /* sidebar width on desktop */
        }

        @media (max-width: 768px) {
          .main-content {
            padding: 16px;
            padding-bottom: 80px;  /* space for bottom nav if any */
            padding-right: 16px;   /* no sidebar on mobile */
          }
        }
      `}</style>
    </div>
    
  );
}