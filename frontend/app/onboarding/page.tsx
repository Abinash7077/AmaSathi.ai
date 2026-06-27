"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, fetchMe } from "@/lib/auth";

const COURSE_OPTIONS = [
  { label: "School – Class 8", category: "School", level: "Class 8" },
  { label: "School – Class 9", category: "School", level: "Class 9" },
  { label: "School – Class 10", category: "School", level: "Class 10" },
  { label: "Intermediate – Class 11 (Science)", category: "Intermediate", level: "Class 11 Science" },
  { label: "Intermediate – Class 11 (Arts)", category: "Intermediate", level: "Class 11 Arts" },
  { label: "Intermediate – Class 12 (Science)", category: "Intermediate", level: "Class 12 Science" },
  { label: "Intermediate – Class 12 (Arts)", category: "Intermediate", level: "Class 12 Arts" },
  { label: "GNM Nursing – 1st Year", category: "GNM Nursing", level: "1st Year" },
  { label: "GNM Nursing – 2nd Year", category: "GNM Nursing", level: "2nd Year" },
  { label: "GNM Nursing – 3rd Year", category: "GNM Nursing", level: "3rd Year" },
  { label: "B.Sc Nursing – 1st Year", category: "B.Sc Nursing", level: "1st Year" },
  { label: "B.Sc Nursing – 2nd Year", category: "B.Sc Nursing", level: "2nd Year" },
  { label: "B.Sc Nursing – 3rd Year", category: "B.Sc Nursing", level: "3rd Year" },
  { label: "B.Sc Nursing – 4th Year", category: "B.Sc Nursing", level: "4th Year" },
  { label: "College – BA 1st Year", category: "College", level: "BA 1st Year" },
  { label: "College – BA 2nd Year", category: "College", level: "BA 2nd Year" },
  { label: "College – BA 3rd Year", category: "College", level: "BA 3rd Year" },
  { label: "College – BSc 1st Year", category: "College", level: "BSc 1st Year" },
  { label: "College – BSc 2nd Year", category: "College", level: "BSc 2nd Year" },
  { label: "College – BSc 3rd Year", category: "College", level: "BSc 3rd Year" },
  { label: "College – BCom 1st Year", category: "College", level: "BCom 1st Year" },
  { label: "College – BCom 2nd Year", category: "College", level: "BCom 2nd Year" },
  { label: "College – BCom 3rd Year", category: "College", level: "BCom 3rd Year" },
];

const STEPS = ["Course", "Details", "Plan"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 0 – course
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState(COURSE_OPTIONS);
  const [selected, setSelected] = useState<typeof COURSE_OPTIONS[0] | null>(null);
  const [showDrop, setShowDrop] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Step 1 – details
  const [mobile, setMobile] = useState("");
  const [college, setCollege] = useState("");
  const [subject, setSubject] = useState("");

  // Step 2 – plan
  const [plan, setPlan] = useState("free");

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
  const u = getUser();
  if (!u) { router.push("/sign-in"); return; }
  try {
    setUser(typeof u === "string" ? JSON.parse(u) : u);
  } catch {
    router.push("/sign-in");
  }
}, []);

  useEffect(() => {
    setFiltered(
      query.trim() === ""
        ? COURSE_OPTIONS
        : COURSE_OPTIONS.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    );
  }, [query]);

  const selectCourse = (opt: typeof COURSE_OPTIONS[0]) => {
    setSelected(opt);
    setQuery(opt.label);
    setShowDrop(false);
  };

  const finish = async () => {
  if (!user) return;
  const token = localStorage.getItem("amasathi_token") || "";

  // ✅ Update localStorage FIRST before anything else
  const updated = {
    ...user,
    mobile,
    college,
    subject,
    course_category: selected?.category || "",
    course_level:    selected?.level || "",
    plan,
    onboarded: true,
  };
  localStorage.setItem("amasathi_current", JSON.stringify(updated));

  // Then call API in background (don't block navigation on it)
  fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/profile`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name:            user.name,
      mobile,
      college,
      subject,
      course_category: selected?.category || "",
      course_level:    selected?.level || "",
      onboarded:       true,
    }),
  }).catch(e => console.error("Profile save failed", e));

  // Navigate immediately — localStorage already has onboarded: true
  if (plan === "free") {
    router.push("/dashboard");
  } else {
    router.push(`/payment?plan=${plan}`);
  }
};

  return (
    <div className="ob-bg">
      {/* Progress bar */}
      <div className="progress-bar">
        {STEPS.map((s, i) => (
          <div key={s} className={`step-dot ${i <= step ? "active" : ""}`}>
            <div className="dot">{i < step ? "✓" : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
        <div className="progress-line">
          <div className="progress-fill" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
        </div>
      </div>

      <div className="ob-card">
        {/* STEP 0 – Select Course */}
        {step === 0 && (
          <div className="step-content">
            <h2>📚 What are you studying?</h2>
            <p className="step-desc">amasathi will personalise everything based on your course</p>

            <div className="autocomplete-wrap" ref={dropRef}>
              <input
                type="text"
                className="course-input"
                placeholder="Type to search your course..."
                value={query}
                onChange={e => { setQuery(e.target.value); setShowDrop(true); setSelected(null); }}
                onFocus={() => setShowDrop(true)}
              />
              {showDrop && (
                <div className="dropdown">
                  {filtered.length === 0 && <div className="drop-empty">No course found</div>}
                  {filtered.map(opt => (
                    <div key={opt.label} className={`drop-item ${selected?.label === opt.label ? "selected" : ""}`}
                      onMouseDown={() => selectCourse(opt)}>
                      <span className="drop-badge">{opt.category}</span>
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selected && (
              <div className="selected-chip">
                ✅ <strong>{selected.category}</strong> – {selected.level}
              </div>
            )}

            <button className="ob-btn" disabled={!selected} onClick={() => setStep(1)}>
              Continue →
            </button>
          </div>
        )}

        {/* STEP 1 – Personal Details */}
        {step === 1 && (
          <div className="step-content">
            <h2>👤 Tell us about yourself</h2>
            <p className="step-desc">This helps amasathi address you properly</p>

            <div className="field">
              <label>Mobile Number</label>
              <input type="tel" placeholder="Enter your mobile number"
                value={mobile} onChange={e => setMobile(e.target.value)} />
            </div>
            <div className="field">
              <label>College / School Name</label>
              <input type="text" placeholder="E.g. SCB Medical, Utkal University..."
                value={college} onChange={e => setCollege(e.target.value)} />
            </div>
            <div className="field">
              <label>Main Subject / Specialisation <span className="optional">(optional)</span></label>
              <input type="text" placeholder="E.g. Anatomy, Physics, Mathematics..."
                value={subject} onChange={e => setSubject(e.target.value)} />
            </div>

            <div className="btn-row">
              <button className="ob-btn-ghost" onClick={() => setStep(0)}>← Back</button>
              <button className="ob-btn" onClick={() => setStep(2)}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 2 – Choose Plan */}
        {step === 2 && (
          <div className="step-content">
            <h2>💎 Choose your plan</h2>
            <p className="step-desc">Start free, upgrade anytime</p>

            <div className="plans">
              {[
                { id:"free",  label:"Free",  price:"₹0/mo",   tag:"",          features:["Translate to Odia","20 requests/month","Basic support"] },
                { id:"basic", label:"Basic", price:"₹99/mo",  tag:"Popular",   features:["Translate + Questions + Chat","200 requests/month","Priority support"] },
                { id:"pro",   label:"Pro",   price:"₹499/mo", tag:"Best Value",features:["All features incl. Video","Unlimited requests","Premium support"] },
              ].map(p => (
                <div key={p.id} className={`plan-card ${plan === p.id ? "chosen" : ""}`}
                  onClick={() => setPlan(p.id)}>
                  {p.tag && <div className="plan-tag">{p.tag}</div>}
                  <div className="plan-label">{p.label}</div>
                  <div className="plan-price">{p.price}</div>
                  <ul className="plan-features">
                    {p.features.map(f => <li key={f}>✓ {f}</li>)}
                  </ul>
                  <div className={`plan-radio ${plan === p.id ? "on" : ""}`} />
                </div>
              ))}
            </div>

            <div className="btn-row">
              <button className="ob-btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="ob-btn" onClick={finish}>
                {plan === "free" ? "Start Free →" : `Pay & Start →`}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .ob-bg { min-height:100vh; background:linear-gradient(135deg,#0f2027,#203a43,#2c5364); padding:40px 20px; display:flex; flex-direction:column; align-items:center; }
        .progress-bar { display:flex; align-items:center; gap:0; margin-bottom:40px; position:relative; width:100%; max-width:480px; }
        .step-dot { display:flex; flex-direction:column; align-items:center; gap:6px; z-index:1; flex:1; }
        .dot { width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.1); border:2px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.4); font-weight:700; font-size:14px; transition:all 0.3s; }
        .step-dot.active .dot { background:linear-gradient(135deg,#4ade80,#22c55e); border-color:#4ade80; color:#0f2027; }
        .step-dot span { color:rgba(255,255,255,0.4); font-size:12px; }
        .step-dot.active span { color:#4ade80; }
        .progress-line { position:absolute; top:18px; left:18px; right:18px; height:2px; background:rgba(255,255,255,0.1); z-index:0; }
        .progress-fill { height:100%; background:linear-gradient(90deg,#4ade80,#22c55e); transition:width 0.4s ease; }
        .ob-card { background:rgba(255,255,255,0.05); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:40px; width:100%; max-width:520px; }
        .step-content { display:flex; flex-direction:column; gap:20px; }
        .step-content h2 { color:#fff; font-size:24px; font-weight:700; margin:0; }
        .step-desc { color:rgba(255,255,255,0.5); margin:0; font-size:14px; }
        .autocomplete-wrap { position:relative; }
        .course-input { width:100%; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:14px 16px; color:#fff; font-size:15px; outline:none; box-sizing:border-box; transition:border 0.2s; }
        .course-input:focus { border-color:#4ade80; }
        .course-input::placeholder { color:rgba(255,255,255,0.3); }
        .dropdown { position:absolute; top:calc(100% + 6px); left:0; right:0; background:#1a2f3a; border:1px solid rgba(255,255,255,0.15); border-radius:14px; max-height:240px; overflow-y:auto; z-index:100; box-shadow:0 8px 32px rgba(0,0,0,0.4); }
        .drop-item { padding:12px 16px; color:rgba(255,255,255,0.8); cursor:pointer; font-size:14px; display:flex; align-items:center; gap:10px; transition:background 0.15s; }
        .drop-item:hover, .drop-item.selected { background:rgba(74,222,128,0.1); color:#4ade80; }
        .drop-badge { background:rgba(74,222,128,0.15); color:#4ade80; border-radius:6px; padding:2px 8px; font-size:11px; font-weight:600; white-space:nowrap; }
        .drop-empty { padding:16px; color:rgba(255,255,255,0.3); text-align:center; font-size:14px; }
        .selected-chip { background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.3); border-radius:12px; padding:12px 16px; color:#4ade80; font-size:14px; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .field label { color:rgba(255,255,255,0.7); font-size:13px; font-weight:500; }
        .optional { color:rgba(255,255,255,0.3); font-weight:400; }
        .field input { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:14px 16px; color:#fff; font-size:15px; outline:none; transition:border 0.2s; }
        .field input:focus { border-color:#4ade80; }
        .field input::placeholder { color:rgba(255,255,255,0.3); }
        .plans { display:flex; flex-direction:column; gap:12px; }
        .plan-card { background:rgba(255,255,255,0.04); border:2px solid rgba(255,255,255,0.1); border-radius:16px; padding:20px; cursor:pointer; transition:all 0.2s; position:relative; }
        .plan-card:hover { border-color:rgba(74,222,128,0.4); }
        .plan-card.chosen { border-color:#4ade80; background:rgba(74,222,128,0.06); }
        .plan-tag { position:absolute; top:-10px; right:16px; background:linear-gradient(135deg,#4ade80,#22c55e); color:#0f2027; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; }
        .plan-label { color:#fff; font-weight:700; font-size:16px; }
        .plan-price { color:#4ade80; font-size:22px; font-weight:800; margin:4px 0 10px; }
        .plan-features { margin:0; padding-left:0; list-style:none; display:flex; flex-direction:column; gap:4px; }
        .plan-features li { color:rgba(255,255,255,0.6); font-size:13px; }
        .plan-radio { width:18px; height:18px; border-radius:50%; border:2px solid rgba(255,255,255,0.3); position:absolute; top:20px; right:20px; transition:all 0.2s; }
        .plan-radio.on { background:#4ade80; border-color:#4ade80; }
        .ob-btn { background:linear-gradient(135deg,#4ade80,#22c55e); color:#0f2027; font-weight:700; font-size:16px; padding:16px 32px; border:none; border-radius:14px; cursor:pointer; transition:opacity 0.2s; }
        .ob-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .ob-btn:hover:not(:disabled) { opacity:0.9; }
        .ob-btn-ghost { background:transparent; color:rgba(255,255,255,0.5); font-size:15px; padding:16px 24px; border:1px solid rgba(255,255,255,0.2); border-radius:14px; cursor:pointer; transition:all 0.2s; }
        .ob-btn-ghost:hover { border-color:rgba(255,255,255,0.4); color:#fff; }
        .btn-row { display:flex; gap:12px; justify-content:flex-end; }
      `}</style>
    </div>
  );
}
