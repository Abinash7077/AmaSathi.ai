import "./globals.css";
import type { Metadata } from "next";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Sahayak - GNM Nursing Assistant",
  description: "AI study assistant for GNM Nursing & Intermediate Physics students",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <NavBar />
        <div className="max-w-3xl mx-auto px-4 py-8">{children}</div>
      </body>
    </html>
  );
}
