"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { getUser, fetchMe } from "@/lib/auth";

const COURSE_OPTIONS = [
  { label: "School – Class 8", category: "School", level: "Class 8" },
  { label: "School – Class 9", category: "School", level: "Class 9" },
  { label: "School – Class 10", category: "School", level: "Class 10" },
  {
    label: "Intermediate – Class 11 (Science)",
    category: "Intermediate",
    level: "Class 11 Science",
  },
  {
    label: "Intermediate – Class 11 (Arts)",
    category: "Intermediate",
    level: "Class 11 Arts",
  },
  {
    label: "Intermediate – Class 12 (Science)",
    category: "Intermediate",
    level: "Class 12 Science",
  },
  {
    label: "Intermediate – Class 12 (Arts)",
    category: "Intermediate",
    level: "Class 12 Arts",
  },
  {
    label: "GNM Nursing – 1st Year",
    category: "GNM Nursing",
    level: "1st Year",
  },
  {
    label: "GNM Nursing – 2nd Year",
    category: "GNM Nursing",
    level: "2nd Year",
  },
  {
    label: "GNM Nursing – 3rd Year",
    category: "GNM Nursing",
    level: "3rd Year",
  },
  {
    label: "B.Sc Nursing – 1st Year",
    category: "B.Sc Nursing",
    level: "1st Year",
  },
  {
    label: "B.Sc Nursing – 2nd Year",
    category: "B.Sc Nursing",
    level: "2nd Year",
  },
  {
    label: "B.Sc Nursing – 3rd Year",
    category: "B.Sc Nursing",
    level: "3rd Year",
  },
  {
    label: "B.Sc Nursing – 4th Year",
    category: "B.Sc Nursing",
    level: "4th Year",
  },
  { label: "College – BA 1st Year", category: "College", level: "BA 1st Year" },
  { label: "College – BA 2nd Year", category: "College", level: "BA 2nd Year" },
  { label: "College – BA 3rd Year", category: "College", level: "BA 3rd Year" },
  {
    label: "College – BSc 1st Year",
    category: "College",
    level: "BSc 1st Year",
  },
  {
    label: "College – BSc 2nd Year",
    category: "College",
    level: "BSc 2nd Year",
  },
  {
    label: "College – BSc 3rd Year",
    category: "College",
    level: "BSc 3rd Year",
  },
  {
    label: "College – BCom 1st Year",
    category: "College",
    level: "BCom 1st Year",
  },
  {
    label: "College – BCom 2nd Year",
    category: "College",
    level: "BCom 2nd Year",
  },
  {
    label: "College – BCom 3rd Year",
    category: "College",
    level: "BCom 3rd Year",
  },
];

function ProfileContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState(
    params.get("tab") === "plan" ? "plan" : "profile",
  );
  const [saved, setSaved] = useState(false);

  // profile fields
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [college, setCollege] = useState("");
  const [subject, setSubject] = useState("");
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState(COURSE_OPTIONS);
  const [selected, setSelected] = useState<(typeof COURSE_OPTIONS)[0] | null>(
    null,
  );
  const [showDrop, setShowDrop] = useState(false);
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push("/sign-in");
      return;
    }
    const token = localStorage.getItem("amasathi_token") || "";

    // Fetch fresh from DB
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/me`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
      .then((r) => r.json())
      .then((me) => {
        if (me.detail) {
          router.push("/sign-in");
          return;
        }
        const merged = { ...u, ...me };
        setUser(merged);
        setName(merged.name || "");
        setMobile(merged.mobile || "");
        setCollege(merged.college || "");
        setSubject(merged.subject || "");
        setPlan(merged.plan || "free");
        const match = COURSE_OPTIONS.find(
          (o) =>
            o.category === merged.course_category &&
            o.level === merged.course_level,
        );
        if (match) {
          setSelected(match);
          setQuery(match.label);
        }
      });
  }, []);

  useEffect(() => {
    setFiltered(
      query.trim() === ""
        ? COURSE_OPTIONS
        : COURSE_OPTIONS.filter((o) =>
            o.label.toLowerCase().includes(query.toLowerCase()),
          ),
    );
  }, [query]);

  const saveProfile = async () => {
    const token = localStorage.getItem("amasathi_token") || "";
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/profile`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          mobile,
          college,
          subject,
          course_category: selected?.category || user.course_category,
          course_level: selected?.level || user.course_level,
          onboarded: true,
        }),
      },
    );
    const updated = {
      ...user,
      name,
      mobile,
      college,
      subject,
      course_category: selected?.category || user.course_category,
      course_level: selected?.level || user.course_level,
    };
    localStorage.setItem("amasathi_current", JSON.stringify(updated));
    setUser(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const savePlan = () => {
    if (plan === user.plan) return; // no change
    if (plan === "free") return; // can't downgrade here
    router.push(`/payment?plan=${plan}`);
  };

  if (!user) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)",
      }}
    >
      {/* Back button */}
      <button className="back-btn" onClick={() => router.push("/dashboard")}>
        ← Dashboard
      </button>
      <div className="profile-wrap">
        <h1 className="profile-title">⚙️ Account Settings</h1>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
          >
            👤 Profile
          </button>
          <button
            className={`tab ${tab === "plan" ? "active" : ""}`}
            onClick={() => setTab("plan")}
          >
            💎 Plan
          </button>
        </div>

        {saved && <div className="saved-toast">✅ Changes saved!</div>}

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div className="card">
            <div className="field">
              <label>Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={user.email} disabled style={{ opacity: 0.4 }} />
            </div>
            <div className="field">
              <label>Mobile Number</label>
              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Mobile number"
              />
            </div>
            <div className="field">
              <label>College / School</label>
              <input
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="Institution name"
              />
            </div>
            <div className="field">
              <label>Main Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="E.g. Anatomy, Physics..."
              />
            </div>
            <div className="field">
              <label>Course / Class</label>
              <div style={{ position: "relative" }}>
                <input
                  className="course-input"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowDrop(true);
                    setSelected(null);
                  }}
                  onFocus={() => setShowDrop(true)}
                  placeholder="Search and select your course..."
                />
                {showDrop && (
                  <div className="dropdown">
                    {filtered.map((opt) => (
                      <div
                        key={opt.label}
                        className={`drop-item ${selected?.label === opt.label ? "sel" : ""}`}
                        onMouseDown={() => {
                          setSelected(opt);
                          setQuery(opt.label);
                          setShowDrop(false);
                        }}
                      >
                        <span className="badge">{opt.category}</span>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button className="save-btn" onClick={saveProfile}>
              Save Changes
            </button>
          </div>
        )}

        {/* PLAN TAB */}
        {tab === "plan" && (
          <div className="card">
            <p className="plan-note">
              Current plan:{" "}
              <strong style={{ color: "#4ade80" }}>{user.plan}</strong>
            </p>
            <div className="plans">
              {[
                {
                  id: "free",
                  label: "Free",
                  price: "₹0/mo",
                  features: ["Translate to Odia", "20 requests/month"],
                },
                {
                  id: "basic",
                  label: "Basic",
                  price: "₹99/mo",
                  features: [
                    "Translate + Questions + Chat",
                    "200 requests/month",
                  ],
                  tag: "Popular",
                },
                {
                  id: "pro",
                  label: "Pro",
                  price: "₹499/mo",
                  features: ["All features + Video", "Unlimited"],
                  tag: "Best Value",
                },
              ].map((p) => (
                <div
                  key={p.id}
                  className={`plan-card ${plan === p.id ? "chosen" : ""}`}
                  onClick={() => setPlan(p.id)}
                >
                  {p.tag && <div className="plan-tag">{p.tag}</div>}
                  <div className="plan-name">{p.label}</div>
                  <div className="plan-price">{p.price}</div>
                  <ul>
                    {p.features.map((f) => (
                      <li key={f}>✓ {f}</li>
                    ))}
                  </ul>
                  <div className={`radio ${plan === p.id ? "on" : ""}`} />
                </div>
              ))}
            </div>
            <button className="save-btn" onClick={savePlan}>
              {plan === "free" ? "Save" : `Upgrade to ${plan} →`}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .profile-wrap {
          max-width: 600px;
          margin: 0 auto;
          padding: 32px 20px;
        }
        .profile-title {
          color: #fff;
          font-size: 24px;
          font-weight: 800;
          margin: 0 0 24px;
        }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }
        .tab {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.5);
          padding: 10px 24px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .tab.active {
          background: rgba(74, 222, 128, 0.1);
          border-color: #4ade80;
          color: #4ade80;
        }
        .saved-toast {
          background: rgba(74, 222, 128, 0.15);
          border: 1px solid rgba(74, 222, 128, 0.3);
          color: #4ade80;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 14px;
        }
        .card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field label {
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
          font-weight: 500;
        }
        .field input,
        .course-input {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 13px 16px;
          color: #fff;
          font-size: 15px;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          transition: border 0.2s;
        }
        .field input:focus,
        .course-input:focus {
          border-color: #4ade80;
        }
        .field input::placeholder,
        .course-input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }
        .dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #1a2f3a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .drop-item {
          padding: 11px 16px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s;
        }
        .drop-item:hover,
        .drop-item.sel {
          background: rgba(74, 222, 128, 0.1);
          color: #4ade80;
        }
        .badge {
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 6px;
          white-space: nowrap;
        }
        .plan-note {
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          margin: 0;
        }
        .plans {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .plan-card {
          background: rgba(255, 255, 255, 0.04);
          border: 2px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 18px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        .plan-card.chosen {
          border-color: #4ade80;
          background: rgba(74, 222, 128, 0.06);
        }
        .plan-tag {
          position: absolute;
          top: -9px;
          right: 14px;
          background: linear-gradient(135deg, #4ade80, #22c55e);
          color: #0f2027;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
        }
        .plan-name {
          color: #fff;
          font-weight: 700;
          font-size: 15px;
        }
        .plan-price {
          color: #4ade80;
          font-size: 20px;
          font-weight: 800;
          margin: 3px 0 8px;
        }
        .plan-card ul {
          margin: 0;
          padding-left: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .plan-card li {
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
        }
        .radio {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.3);
          position: absolute;
          top: 18px;
          right: 18px;
          transition: all 0.2s;
        }
        .radio.on {
          background: #4ade80;
          border-color: #4ade80;
        }
        .save-btn {
          background: linear-gradient(135deg, #4ade80, #22c55e);
          color: #0f2027;
          font-weight: 700;
          font-size: 15px;
          padding: 14px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .save-btn:hover {
          opacity: 0.9;
        }
        .back-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-left: 10px;
          margin-top: 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
      `}</style>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
