"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Header() {
  const router   = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("amasathi_token");
    if (!token) { router.push("/sign-in"); return; }

    fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(me => {
      if (me.detail) { router.push("/sign-in"); return; }
      const cached = localStorage.getItem("amasathi_user");
      const old = cached ? JSON.parse(cached) : {};
      localStorage.setItem("amasathi_user", JSON.stringify({ ...old, ...me }));
      setProfile(me);
    })
    .catch(() => {
      const cached = localStorage.getItem("amasathi_user");
      if (cached) setProfile(JSON.parse(cached));
      else router.push("/sign-in");
    });
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const logout = () => {
    localStorage.removeItem("amasathi_token");
    localStorage.removeItem("amasathi_user");
    router.push("/sign-in");
  };

  const planConfig: Record<string, { label: string; color: string; bg: string }> = {
    free:     { label: "Free",     color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
    basic:    { label: "Basic",    color: "#4ade80", bg: "rgba(74,222,128,0.1)"  },
    standard: { label: "Standard", color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
    pro:      { label: "Pro",      color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  };

  const navLinks = [
    { href: "/dashboard",           label: "Home",      icon: "🏠" },
    { href: "/dashboard/translate", label: "Translate", icon: "🌐" },
    { href: "/dashboard/questions", label: "Questions", icon: "📝" },
    { href: "/dashboard/video",     label: "Video",     icon: "🎬" },
    { href: "/dashboard/chat",      label: "Chat",      icon: "💬" },
    { href: "/dashboard/history",   label: "History",   icon: "🕘" },
  ];

  const pc = planConfig[profile?.plan] || planConfig.free;

  return (
    <>
      <header className="hdr">
        <div className="hdr-inner">

          {/* Logo */}
          <Link href="/dashboard" className="logo">
            <span className="logo-icon">🎓</span>
            <span className="logo-text">amasathi</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="nav-desktop">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href}
                className={`nav-link ${pathname === l.href || pathname?.startsWith(l.href + "/") ? "active" : ""}`}>
                <span className="nav-icon">{l.icon}</span>
                <span className="nav-label">{l.label}</span>
              </Link>
            ))}
            {profile?.is_admin && (
              <Link href="/admin" className={`nav-link admin-link ${pathname === "/admin" ? "active" : ""}`}>
                <span className="nav-icon">🛡</span>
                <span className="nav-label">Admin</span>
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="hdr-right">

            {/* Plan badge - desktop only */}
            {profile && (
              <div className="plan-pill" style={{ color: pc.color, background: pc.bg, borderColor: pc.color }}>
                {profile.plan === "pro" ? "⭐" : profile.plan === "standard" ? "✦" : profile.plan === "basic" ? "●" : "○"}
                &nbsp;{pc.label}
              </div>
            )}

            {/* Avatar + Dropdown */}
            {profile && (
              <div className="avatar-wrap" ref={dropRef}>
                <button className="avatar-btn" onClick={() => setMenuOpen(!menuOpen)}
                  title={profile.name}>
                  <div className="avatar">
                    {profile.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="avatar-chevron">{menuOpen ? "▲" : "▼"}</span>
                </button>

                {menuOpen && (
                  <div className="dropdown">
                    {/* User info */}
                    <div className="drop-header">
                      <div className="drop-avatar">{profile.name?.[0]?.toUpperCase()}</div>
                      <div className="drop-info">
                        <div className="drop-name">{profile.name}</div>
                        <div className="drop-email">{profile.email}</div>
                      </div>
                    </div>

                    <div className="drop-details">
                      <div className="drop-row">
                        <span className="drop-key">Course</span>
                        <span className="drop-val">{profile.course_category} {profile.course_level}</span>
                      </div>
                      {profile.college && (
                        <div className="drop-row">
                          <span className="drop-key">College</span>
                          <span className="drop-val">{profile.college}</span>
                        </div>
                      )}
                      <div className="drop-row">
                        <span className="drop-key">Plan</span>
                        <span className="drop-val" style={{ color: pc.color, fontWeight: 700 }}>
                          {pc.label}
                        </span>
                      </div>
                      {profile.plan_expires_at && profile.plan !== "free" && (
                        <div className="drop-row">
                          <span className="drop-key">Expires</span>
                          <span className="drop-val">
                            {new Date(profile.plan_expires_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="drop-divider" />

                    <Link href="/profile" className="drop-item" onClick={() => setMenuOpen(false)}>
                      <span>👤</span> My Profile
                    </Link>
                    <Link href="/profile?tab=plan" className="drop-item" onClick={() => setMenuOpen(false)}>
                      <span>💎</span> Change Plan
                    </Link>
                    <Link href="/dashboard/history" className="drop-item" onClick={() => setMenuOpen(false)}>
                      <span>🕘</span> Chat History
                    </Link>
                    {profile.is_admin && (
                      <Link href="/admin" className="drop-item" onClick={() => setMenuOpen(false)}>
                        <span>🛡</span> Admin Panel
                      </Link>
                    )}

                    <div className="drop-divider" />

                    <button className="drop-item drop-logout" onClick={logout}>
                      <span>🚪</span> Logout
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile hamburger */}
            <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="nav-mobile">
            <div className="mob-user">
              <div className="mob-avatar">{profile?.name?.[0]?.toUpperCase()}</div>
              <div>
                <div className="mob-name">{profile?.name}</div>
                <div className="mob-email">{profile?.email}</div>
                <div className="mob-plan" style={{ color: pc.color }}>{pc.label} Plan</div>
              </div>
            </div>
            <div className="mob-divider" />
            {navLinks.map(l => (
              <Link key={l.href} href={l.href}
                className={`mob-link ${pathname === l.href ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}>
                {l.icon} {l.label}
              </Link>
            ))}
            {profile?.is_admin && (
              <Link href="/admin" className="mob-link" onClick={() => setMobileOpen(false)}>🛡 Admin</Link>
            )}
            <div className="mob-divider" />
            <Link href="/profile" className="mob-link" onClick={() => setMobileOpen(false)}>👤 My Profile</Link>
            <Link href="/profile?tab=plan" className="mob-link" onClick={() => setMobileOpen(false)}>💎 Change Plan</Link>
            <div className="mob-divider" />
            <button className="mob-link mob-logout" onClick={logout}>🚪 Logout</button>
          </div>
        )}
      </header>

      <style jsx>{`
        /* ── Base ── */
        .hdr {
          background: rgba(10,20,28,0.97);
          backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          position: sticky; top: 0; z-index: 200;
        }
        .hdr-inner {
          max-width: 1280px; margin: 0 auto;
          padding: 0 24px; height: 60px;
          display: flex; align-items: center; gap: 16px;
        }

        /* ── Logo ── */
        .logo {
          text-decoration: none; display: flex; align-items: center; gap: 8px;
          flex-shrink: 0;
        }
        .logo-icon { font-size: 22px; }
        .logo-text {
          font-size: 18px; font-weight: 800;
          background: linear-gradient(135deg,#4ade80,#22c55e);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        /* ── Desktop Nav ── */
        .nav-desktop {
          display: flex; align-items: center; gap: 2px; flex: 1;
        }
        .nav-link {
          display: flex; align-items: center; gap: 6px;
          color: rgba(255,255,255,0.45); text-decoration: none;
          font-size: 13px; font-weight: 500;
          padding: 7px 12px; border-radius: 10px;
          transition: all 0.18s;
          white-space: nowrap;
        }
        .nav-link:hover { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.06); }
        .nav-link.active { color: #4ade80; background: rgba(74,222,128,0.1); }
        .nav-icon { font-size: 15px; }
        .admin-link.active { color: #f59e0b; background: rgba(245,158,11,0.1); }

        /* ── Right ── */
        .hdr-right {
          display: flex; align-items: center; gap: 10px; margin-left: auto; flex-shrink: 0;
        }

        /* ── Plan Pill ── */
        .plan-pill {
          font-size: 11px; font-weight: 700;
          padding: 4px 10px; border-radius: 20px;
          border: 1px solid currentColor;
          letter-spacing: 0.3px;
          display: flex; align-items: center;
        }

        /* ── Avatar ── */
        .avatar-wrap { position: relative; }
        .avatar-btn {
          display: flex; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer; padding: 0;
        }
        .avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg,#4ade80,#22c55e);
          color: #0f2027; font-weight: 800; font-size: 15px;
          display: flex; align-items: center; justify-content: center;
        }
        .avatar-chevron { color: rgba(255,255,255,0.3); font-size: 9px; }

        /* ── Dropdown ── */
        .dropdown {
          position: absolute; top: calc(100% + 12px); right: 0;
          background: #0f1e28;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 18px; min-width: 260px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.6);
          overflow: hidden; z-index: 300;
          animation: dropIn 0.15s ease;
        }
        @keyframes dropIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }

        .drop-header {
          display: flex; align-items: center; gap: 12px;
          padding: 16px; background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .drop-avatar {
          width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg,#4ade80,#22c55e);
          color: #0f2027; font-weight: 800; font-size: 18px;
          display: flex; align-items: center; justify-content: center;
        }
        .drop-name { color: #fff; font-weight: 700; font-size: 15px; }
        .drop-email { color: rgba(255,255,255,0.35); font-size: 12px; margin-top: 2px; }

        .drop-details { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
        .drop-row { display: flex; justify-content: space-between; align-items: center; }
        .drop-key { color: rgba(255,255,255,0.3); font-size: 12px; }
        .drop-val { color: rgba(255,255,255,0.7); font-size: 12px; text-align: right; max-width: 60%; }

        .drop-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 2px 0; }

        .drop-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 11px 16px;
          color: rgba(255,255,255,0.65); text-decoration: none;
          font-size: 14px; background: none; border: none;
          text-align: left; cursor: pointer;
          transition: background 0.15s, color 0.15s;
          box-sizing: border-box;
        }
        .drop-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
        .drop-logout { color: #f87171; }
        .drop-logout:hover { background: rgba(248,113,113,0.08); color: #fca5a5; }

        /* ── Hamburger ── */
        .hamburger {
          display: none; background: none; border: none;
          color: rgba(255,255,255,0.7); font-size: 20px; cursor: pointer;
          padding: 4px 8px; border-radius: 8px;
        }
        .hamburger:hover { background: rgba(255,255,255,0.06); color: #fff; }

        /* ── Mobile Nav ── */
        .nav-mobile {
          display: none; flex-direction: column;
          padding: 8px 12px 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
          background: rgba(10,20,28,0.99);
        }
        .mob-user {
          display: flex; align-items: center; gap: 12px; padding: 12px 8px;
        }
        .mob-avatar {
          width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg,#4ade80,#22c55e);
          color: #0f2027; font-weight: 800; font-size: 18px;
          display: flex; align-items: center; justify-content: center;
        }
        .mob-name { color: #fff; font-weight: 700; font-size: 15px; }
        .mob-email { color: rgba(255,255,255,0.35); font-size: 12px; }
        .mob-plan { font-size: 12px; font-weight: 700; margin-top: 2px; }
        .mob-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 4px 0; }
        .mob-link {
          display: flex; align-items: center; gap: 10px;
          color: rgba(255,255,255,0.65); text-decoration: none;
          padding: 11px 12px; border-radius: 10px; font-size: 14px;
          background: none; border: none; text-align: left;
          cursor: pointer; width: 100%; box-sizing: border-box;
          transition: background 0.15s, color 0.15s;
        }
        .mob-link:hover, .mob-link.active { background: rgba(255,255,255,0.06); color: #fff; }
        .mob-link.active { color: #4ade80; }
        .mob-logout { color: #f87171; }
        .mob-logout:hover { background: rgba(248,113,113,0.08); }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .nav-label { display: none; }
          .nav-link { padding: 8px 10px; }
          .plan-pill { display: none; }
        }
        @media (max-width: 640px) {
          .nav-desktop { display: none; }
          .avatar-wrap { display: none; }
          .hamburger { display: block; }
          .nav-mobile { display: flex; }
        }
      `}</style>
    </>
  );
}