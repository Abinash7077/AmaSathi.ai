"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("sahayak_current");
    if (u) setUser(JSON.parse(u));
  }, [pathname]);

  const logout = () => {
    localStorage.removeItem("sahayak_current");
    router.push("/sign-in");
  };

  const planColor: Record<string, string> = {
    free: "#94a3b8",
    basic: "#4ade80",
    pro: "#f59e0b",
  };

  const navLinks = [
    { href: "/dashboard", label: "Home", icon: "🏠" },
    { href: "/dashboard/translate", label: "Translate", icon: "🌐" },
    { href: "/dashboard/questions", label: "Questions", icon: "📝" },
    { href: "/dashboard/video", label: "Video", icon: "🎬" },
    { href: "/dashboard/chat", label: "Chat", icon: "💬" },
  ];

  if (!user) return null;

  return (
    <header className="hdr">
      <div className="hdr-inner">
        {/* Logo */}
        <Link href="/dashboard" className="logo">
          🩺 <span>Sahayak</span>
        </Link>

        {/* Nav – desktop */}
        <nav className="nav-desktop">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href}
              className={`nav-link ${pathname === l.href ? "active" : ""}`}>
              {l.icon} {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="hdr-right">
          <span className="plan-badge" style={{ color: planColor[user.plan] || "#94a3b8" }}>
            {user.plan === "pro" ? "⭐ Pro" : user.plan === "basic" ? "✦ Basic" : "Free"}
          </span>

          <div className="avatar-wrap" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="avatar">{user.name?.[0]?.toUpperCase() || "U"}</div>
            {menuOpen && (
              <div className="dropdown">
                <div className="drop-user">
                  <div className="drop-name">{user.name}</div>
                  <div className="drop-email">{user.email}</div>
                  <div className="drop-course">{user.category} {user.level}</div>
                </div>
                <Link href="/profile" className="drop-item" onClick={() => setMenuOpen(false)}>
                  👤 My Profile
                </Link>
                <Link href="/profile?tab=plan" className="drop-item" onClick={() => setMenuOpen(false)}>
                  💎 Change Plan
                </Link>
                <div className="drop-divider" />
                <button className="drop-item logout" onClick={logout}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="nav-mobile">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} className={`mob-link ${pathname === l.href ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}>
              {l.icon} {l.label}
            </Link>
          ))}
          <Link href="/profile" className="mob-link" onClick={() => setMenuOpen(false)}>👤 Profile</Link>
          <button className="mob-link logout" onClick={logout}>🚪 Logout</button>
        </div>
      )}

      <style jsx>{`
        .hdr { background:rgba(15,32,39,0.95); backdrop-filter:blur(20px); border-bottom:1px solid rgba(255,255,255,0.08); position:sticky; top:0; z-index:200; }
        .hdr-inner { max-width:1200px; margin:0 auto; padding:0 20px; height:64px; display:flex; align-items:center; gap:24px; }
        .logo { color:#fff; font-size:20px; font-weight:800; text-decoration:none; display:flex; align-items:center; gap:8px; }
        .logo span { background:linear-gradient(135deg,#4ade80,#22c55e); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .nav-desktop { display:flex; gap:4px; flex:1; }
        .nav-link { color:rgba(255,255,255,0.5); text-decoration:none; font-size:14px; padding:8px 14px; border-radius:10px; transition:all 0.2s; display:flex; align-items:center; gap:6px; }
        .nav-link:hover { color:#fff; background:rgba(255,255,255,0.06); }
        .nav-link.active { color:#4ade80; background:rgba(74,222,128,0.1); }
        .hdr-right { display:flex; align-items:center; gap:12px; margin-left:auto; }
        .plan-badge { font-size:12px; font-weight:700; border:1px solid currentColor; padding:4px 10px; border-radius:20px; opacity:0.8; }
        .avatar-wrap { position:relative; }
        .avatar { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#4ade80,#22c55e); color:#0f2027; font-weight:800; font-size:16px; display:flex; align-items:center; justify-content:center; cursor:pointer; }
        .dropdown { position:absolute; top:calc(100% + 10px); right:0; background:#1a2f3a; border:1px solid rgba(255,255,255,0.1); border-radius:16px; min-width:220px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.5); }
        .drop-user { padding:16px; border-bottom:1px solid rgba(255,255,255,0.08); }
        .drop-name { color:#fff; font-weight:700; font-size:15px; }
        .drop-email { color:rgba(255,255,255,0.4); font-size:12px; margin-top:2px; }
        .drop-course { color:#4ade80; font-size:12px; margin-top:4px; }
        .drop-item { display:block; width:100%; padding:12px 16px; color:rgba(255,255,255,0.7); text-decoration:none; font-size:14px; background:none; border:none; text-align:left; cursor:pointer; transition:background 0.15s; box-sizing:border-box; }
        .drop-item:hover { background:rgba(255,255,255,0.06); color:#fff; }
        .drop-item.logout { color:#ff8080; }
        .drop-item.logout:hover { background:rgba(255,80,80,0.1); }
        .drop-divider { height:1px; background:rgba(255,255,255,0.08); margin:4px 0; }
        .hamburger { display:none; background:none; border:none; color:#fff; font-size:22px; cursor:pointer; }
        .nav-mobile { display:none; flex-direction:column; padding:12px; border-top:1px solid rgba(255,255,255,0.08); }
        .mob-link { color:rgba(255,255,255,0.7); text-decoration:none; padding:12px 16px; border-radius:10px; font-size:15px; display:block; transition:background 0.15s; background:none; border:none; text-align:left; cursor:pointer; width:100%; box-sizing:border-box; }
        .mob-link:hover, .mob-link.active { background:rgba(255,255,255,0.06); color:#fff; }
        .mob-link.logout { color:#ff8080; }
        @media(max-width:768px) {
          .nav-desktop { display:none; }
          .avatar-wrap .dropdown { display:none; }
          .hamburger { display:block; }
          .nav-mobile { display:flex; }
        }
      `}</style>
    </header>
  );
}
