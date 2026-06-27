import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
export const metadata: Metadata = {
  title: "amaSathi - Personal AI Assistant",
  description: "AI study assistant for School & College students in Odisha. Ask questions, translate notes, generate questions, and summarize videos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>

        {children}
      </body>
    </html>
  );
}

