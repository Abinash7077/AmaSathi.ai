"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("amasathi_token");
    if (!token) { router.push("/sign-in"); return; }
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(me => {
        if (me.detail) { router.push("/sign-in"); return; }
        localStorage.setItem("amasathi_user", JSON.stringify(me));
        setProfile(me);
      })
      .catch(() => {
        const c = localStorage.getItem("amasathi_user");
        if (c) setProfile(JSON.parse(c)); else router.push("/sign-in");
      });
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const logout = () => {
    const deviceId = localStorage.getItem("amasathi_device_id");
    localStorage.clear();
    if (deviceId) localStorage.setItem("amasathi_device_id", deviceId);
    router.push("/sign-in");
  };

  const planConfig: Record<string, { label: string; color: string; glow: string }> = {
    free:     { label: "Free",     color: "#94a3b8", glow: "rgba(148,163,184,0.3)" },
    basic:    { label: "Basic",    color: "#4ade80", glow: "rgba(74,222,128,0.3)"  },
    standard: { label: "Standard", color: "#60a5fa", glow: "rgba(96,165,250,0.3)"  },
    pro:      { label: "Pro ⭐",   color: "#f59e0b", glow: "rgba(245,158,11,0.3)"  },
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
  const exp = hovered;

  return (
    <>
      {/* ── MOBILE HAMBURGER BUTTON ── */}
      <button
        className="mob-ham"
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? "✕" : "☰"}
      </button>

      {/* ── MOBILE BACKDROP ── */}
      {mobileOpen && (
        <div className="mob-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── DESKTOP SIDEBAR (unchanged) ── */}
      <div
        className={`sb ${exp ? "exp" : ""}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="top-glow" />
        <Link href="/dashboard" className="logo">
          <span className="logo-ic">🎓</span>
          <span className="logo-tx">amasathi</span>
        </Link>
        <div className="sep" />
        <nav className="nav">
          {navLinks.map(l => {
            const active = pathname === l.href || (l.href !== "/dashboard" && pathname?.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href} className={`ni ${active ? "act" : ""}`}>
                <span className="nic">{l.icon}</span>
                <span className="nlb">{l.label}</span>
                {active && <span className="adot" />}
              </Link>
            );
          })}
          {profile?.is_admin && (
            <Link href="/admin" className={`ni adm ${pathname === "/admin" ? "act" : ""}`}>
              <span className="nic">🛡</span>
              <span className="nlb">Admin</span>
            </Link>
          )}
        </nav>
        <div className="grow" />
        {profile && (
          <div className="plan-wrap">
            <div className="plan-ic" style={{ background: pc.glow }}>
              <span style={{ color: pc.color, fontSize: 14 }}>◆</span>
            </div>
            <div className="plan-info">
              <span className="plan-name" style={{ color: pc.color }}>{pc.label}</span>
              {profile.plan !== "free" && profile.plan_expires_at && (
                <span className="plan-exp">
                  Exp {new Date(profile.plan_expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              )}
              {profile.plan === "free" && (
                <Link href="/profile?tab=plan" className="upg-btn">Upgrade ↑</Link>
              )}
            </div>
          </div>
        )}
        <div className="sep" />
        {profile && (
          <div className="user-wrap">
            <div className="uav">{profile.name?.[0]?.toUpperCase()}</div>
            <div className="uinfo">
              <div className="uname">{profile.name}</div>
              <div className="uemail">{profile.email}</div>
              <div className="ucourse" style={{ color: pc.color }}>
                {profile.course_category} · {profile.course_level}
              </div>
              {profile.college && <div className="ucollege">{profile.college}</div>}
            </div>
          </div>
        )}
        <div className="sep" />
        <div className="acts">
          <Link href="/profile" className="abt">
            <span className="aic">👤</span>
            <span className="alb">My Profile</span>
          </Link>
          <Link href="/profile?tab=plan" className="abt">
            <span className="aic">💎</span>
            <span className="alb">Change Plan</span>
          </Link>
          <button className="abt lgt" onClick={logout}>
            <span className="aic">🚪</span>
            <span className="alb">Logout</span>
          </button>
        </div>
      </div>

      {/* ── MOBILE DRAWER ── */}
      <div className={`mob-drawer ${mobileOpen ? "open" : ""}`}>
        <div className="top-glow" style={{ opacity: 1 }} />

        {/* Logo */}
        <Link href="/dashboard" className="logo" style={{ marginBottom: 8 }}>
          <span className="logo-ic">🎓</span>
          <span className="logo-tx" style={{ opacity: 1 }}>amasathi</span>
        </Link>
        <div className="sep" />

        {/* Nav */}
        <nav className="nav">
          {navLinks.map(l => {
            const active = pathname === l.href || (l.href !== "/dashboard" && pathname?.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href} className={`ni ${active ? "act" : ""}`}>
                <span className="nic">{l.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{l.label}</span>
                {active && <span className="adot" style={{ opacity: 1 }} />}
              </Link>
            );
          })}
          {profile?.is_admin && (
            <Link href="/admin" className={`ni adm ${pathname === "/admin" ? "act" : ""}`}>
              <span className="nic">🛡</span>
              <span style={{ fontSize: 14 }}>Admin</span>
            </Link>
          )}
        </nav>

        <div className="grow" />

        {/* Plan */}
        {profile && (
          <div className="plan-wrap">
            <div className="plan-ic" style={{ background: pc.glow }}>
              <span style={{ color: pc.color, fontSize: 14 }}>◆</span>
            </div>
            <div className="plan-info" style={{ opacity: 1 }}>
              <span className="plan-name" style={{ color: pc.color }}>{pc.label}</span>
              {profile.plan === "free" && (
                <Link href="/profile?tab=plan" className="upg-btn">Upgrade ↑</Link>
              )}
            </div>
          </div>
        )}
        <div className="sep" />

        {/* User */}
        {profile && (
          <div className="user-wrap">
            <div className="uav">{profile.name?.[0]?.toUpperCase()}</div>
            <div className="uinfo" style={{ opacity: 1 }}>
              <div className="uname">{profile.name}</div>
              <div className="uemail">{profile.email}</div>
              <div className="ucourse" style={{ color: pc.color }}>
                {profile.course_category} · {profile.course_level}
              </div>
            </div>
          </div>
        )}
        <div className="sep" />

        {/* Actions */}
        <div className="acts">
          <Link href="/profile" className="abt">
            <span className="aic">👤</span>
            <span style={{ fontSize: 13 }}>My Profile</span>
          </Link>
          <Link href="/profile?tab=plan" className="abt">
            <span className="aic">💎</span>
            <span style={{ fontSize: 13 }}>Change Plan</span>
          </Link>
          <button className="abt lgt" onClick={logout}>
            <span className="aic">🚪</span>
            <span style={{ fontSize: 13 }}>Logout</span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        /* ── Sidebar Shell ── */
        .sb {
          position: fixed; right: 0; top: 0; bottom: 0;
          width: 66px;
          background: linear-gradient(180deg, #0a1420 0%, #0d1f2d 50%, #0a1420 100%);
          border-left: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column;
          padding: 14px 10px 14px;
          z-index: 100;
          transition: width 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s ease;
          overflow: hidden;
        }
        .sb.exp {
          width: 248px;
          box-shadow: -6px 0 40px rgba(0,0,0,0.6), -1px 0 0 rgba(74,222,128,0.08);
          border-left-color: rgba(74,222,128,0.12);
        }
        .top-glow {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #4ade80, transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .sb.exp .top-glow { opacity: 1; }
        .logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; padding: 6px 4px;
          flex-shrink: 0; white-space: nowrap; margin-bottom: 2px;
        }
        .logo-ic { font-size: 22px; flex-shrink: 0; min-width: 36px; text-align: center; }
        .logo-tx {
          font-size: 16px; font-weight: 900; letter-spacing: -0.3px;
          background: linear-gradient(135deg, #4ade80, #22c55e);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          opacity: 0; transition: opacity 0.2s 0.05s; white-space: nowrap;
        }
        .sb.exp .logo-tx { opacity: 1; }
        .sep {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          margin: 10px 0; flex-shrink: 0;
        }
        .nav { display: flex; flex-direction: column; gap: 3px; }
        .ni {
          display: flex; align-items: center; gap: 12px;
          color: rgba(255,255,255,0.38); text-decoration: none;
          padding: 10px 6px; border-radius: 12px;
          font-size: 13px; font-weight: 500;
          transition: all 0.18s; position: relative;
          white-space: nowrap; overflow: hidden; flex-shrink: 0;
        }
        .ni:hover { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.07); }
        .act {
          color: #4ade80;
          background: linear-gradient(135deg, rgba(74,222,128,0.12), rgba(34,197,94,0.06));
          border: 1px solid rgba(74,222,128,0.15);
        }
        .ni.adm.act { color: #f59e0b; background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.15); }
        .nic { font-size: 17px; flex-shrink: 0; min-width: 34px; text-align: center; }
        .nlb { opacity: 0; transition: opacity 0.18s; }
        .sb.exp .nlb { opacity: 1; }
        .adot {
          width: 5px; height: 5px; border-radius: 50%; background: #4ade80;
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          opacity: 0; transition: opacity 0.2s; box-shadow: 0 0 6px #4ade80;
        }
        .sb.exp .adot { opacity: 1; }
        .grow { flex: 1; }
        .plan-wrap { display: flex; align-items: center; gap: 10px; padding: 8px 6px; flex-shrink: 0; overflow: hidden; }
        .plan-ic { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; min-width: 34px; }
        .plan-info { display: flex; flex-direction: column; gap: 3px; opacity: 0; transition: opacity 0.2s; overflow: hidden; }
        .sb.exp .plan-info { opacity: 1; }
        .plan-name { font-size: 13px; font-weight: 700; white-space: nowrap; }
        .plan-exp { font-size: 11px; color: rgba(255,255,255,0.3); }
        .upg-btn {
          font-size: 11px; font-weight: 700; color: #0f2027;
          background: linear-gradient(135deg,#4ade80,#22c55e);
          padding: 3px 10px; border-radius: 6px; text-decoration: none;
          white-space: nowrap; display: inline-block;
        }
        .user-wrap { display: flex; align-items: center; gap: 10px; padding: 8px 6px; flex-shrink: 0; overflow: hidden; }
        .uav {
          width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg,#4ade80,#22c55e);
          color: #0f2027; font-weight: 900; font-size: 14px;
          display: flex; align-items: center; justify-content: center;
          min-width: 34px; box-shadow: 0 0 12px rgba(74,222,128,0.3);
        }
        .uinfo { opacity: 0; transition: opacity 0.2s; overflow: hidden; }
        .sb.exp .uinfo { opacity: 1; }
        .uname { color: #fff; font-weight: 700; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
        .uemail { color: rgba(255,255,255,0.28); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
        .ucourse { font-size: 11px; margin-top: 2px; white-space: nowrap; font-weight: 600; }
        .ucollege { color: rgba(255,255,255,0.22); font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
        .acts { display: flex; flex-direction: column; gap: 2px; padding: 8px 0; }
        .abt {
          display: flex; align-items: center; gap: 12px;
          color: rgba(255,255,255,0.38); text-decoration: none;
          padding: 9px 6px; border-radius: 10px;
          font-size: 13px; background: none; border: none;
          cursor: pointer; white-space: nowrap; overflow: hidden;
          transition: all 0.18s; text-align: left; width: 100%;
          box-sizing: border-box;
        }
        .abt:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.06); }
        .aic { font-size: 15px; min-width: 34px; text-align: center; flex-shrink: 0; }
        .alb { opacity: 0; transition: opacity 0.18s; }
        .sb.exp .alb { opacity: 1; }
        .lgt { color: #f87171; }
        .lgt:hover { background: rgba(248,113,113,0.08); color: #fca5a5; }

        /* ── Mobile: hide desktop sidebar ── */
        @media (max-width: 640px) {
          .sb { display: none; }
        }

        /* ── Mobile hamburger button ── */
        .mob-ham {
          display: none;
        }
        @media (max-width: 640px) {
          .mob-ham {
            display: flex;
            align-items: center;
            justify-content: center;
            position: fixed;
            top: 14px;
            right: 16px;
            z-index: 200;
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 12px;
            color: #fff;
            font-size: 18px;
            cursor: pointer;
            backdrop-filter: blur(8px);
          }
        }

        /* ── Mobile backdrop ── */
        .mob-backdrop {
          display: none;
        }
        @media (max-width: 640px) {
          .mob-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 149;
            backdrop-filter: blur(2px);
          }
        }

        /* ── Mobile drawer ── */
        .mob-drawer {
          display: none;
        }
        @media (max-width: 640px) {
          .mob-drawer {
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 260px;
            background: linear-gradient(180deg, #0a1420 0%, #0d1f2d 50%, #0a1420 100%);
            border-left: 1px solid rgba(74,222,128,0.12);
            padding: 14px 12px;
            z-index: 150;
            overflow-y: auto;
            transform: translateX(100%);
            transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
            box-shadow: -6px 0 40px rgba(0,0,0,0.6);
            max-height: fit-content;
            overflow-y: auto;
            min-height: 75vh;
          }
          .mob-drawer.open {
            transform: translateX(0);
          }
          /* Override opacity-hidden classes inside drawer */
          .mob-drawer .nlb,
          .mob-drawer .alb,
          .mob-drawer .uinfo,
          .mob-drawer .plan-info {
            opacity: 1 !important;
          }
          .mob-drawer .logo-tx {
            opacity: 1 !important;
          }
          .mob-drawer .adot {
            opacity: 1 !important;
          }
        }
      `}</style>
    </>
  );
}