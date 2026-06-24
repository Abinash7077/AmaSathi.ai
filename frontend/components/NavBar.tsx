"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home" },
  { href: "/translate", label: "Translate" },
  { href: "/questions", label: "Questions" },
  { href: "/video", label: "Video" },
  { href: "/chat", label: "Chat" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 flex items-center gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
              pathname === t.href
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
