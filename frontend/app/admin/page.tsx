// FILE: frontend/app/admin/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import React, { useState, useEffect } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Tab = "overview" | "users" | "payments" | "usage";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

 useEffect(() => {
  const token = localStorage.getItem("amasathi_token");
  if (!token) { router.push("/sign-in"); return; }

  fetch(`${API}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(me => {
    if (!me || me.detail) { router.push("/sign-in"); return; }
    if (!me.is_admin) { router.push("/dashboard"); return; }
    loadAll();  // ← only loads if is_admin true
  })
  .catch(() => router.push("/dashboard"));
}, []);

  const token = () => localStorage.getItem("amasathi_token") || "";

  const loadAll = async () => {
    setLoading(true);
    const [s, u, p] = await Promise.all([
      fetch(`${API}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token()}` },
      }).then((r) => r.json()),
      fetch(`${API}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token()}` },
      }).then((r) => r.json()),
      fetch(`${API}/api/admin/payments`, {
        headers: { Authorization: `Bearer ${token()}` },
      }).then((r) => r.json()),
    ]);
    setStats(s);
    setUsers(Array.isArray(u) ? u : []);
    setPayments(Array.isArray(p) ? p : []);
    setLoading(false);
  };

  const updatePlan = async (userId: string, plan: string) => {
    setUpdatingId(userId);
    await fetch(`${API}/api/admin/users/${userId}/plan`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan }),
    });
    setUsers((prev) =>
      prev.map((u) => (u._id === userId ? { ...u, plan } : u)),
    );
    setUpdatingId("");
  };

  const clearSessions = async (userId: string) => {
    await fetch(`${API}/api/admin/users/${userId}/sessions`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    alert("All devices cleared for this user.");
  };

  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      u.name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.mobile?.includes(s) ||
      u.college?.toLowerCase().includes(s);
    const matchPlan = planFilter === "all" || u.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const planColor: Record<string, string> = {
    free: "#94a3b8",
    basic: "#4ade80",
    standard: "#60a5fa",
    pro: "#f59e0b",
  };
  const fmt = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";
  const fmtFull = (d: string) =>
    d ? new Date(d).toLocaleString("en-IN") : "—";

  return (
    <div className="admin-bg">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">🎓 amasathi</div>
        <div className="sidebar-label">Admin Panel</div>
        {(["overview", "users", "payments", "usage"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`sidebar-link ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "overview"
              ? "📊"
              : t === "users"
                ? "👥"
                : t === "payments"
                  ? "💳"
                  : "📈"}{" "}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          className="sidebar-link"
          onClick={() => router.push("/dashboard")}
        >
          🏠 Back to App
        </button>
      </div>

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <h1 className="page-title">
            {tab === "overview"
              ? "📊 Overview"
              : tab === "users"
                ? "👥 Users"
                : tab === "payments"
                  ? "💳 Payments"
                  : "📈 Usage"}
          </h1>
          <button className="refresh-btn" onClick={loadAll}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === "overview" && stats && (
              <div>
                <div className="stat-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-value">{stats.total_users}</div>
                    <div className="stat-label">Total Users</div>
                  </div>
                  <div className="stat-card green">
                    <div className="stat-icon">💰</div>
                    <div className="stat-value">
                      ₹{stats.total_revenue?.toLocaleString("en-IN")}
                    </div>
                    <div className="stat-label">Total Revenue</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-value">{stats.active_today || 0}</div>
                    <div className="stat-label">Active Today</div>
                  </div>
                  <div className="stat-card blue">
                    <div className="stat-icon">🔤</div>
                    <div className="stat-value">
                      {(stats.tokens_used_today || 0).toLocaleString()}
                    </div>
                    <div className="stat-label">Tokens Today</div>
                  </div>
                  {Object.entries(stats.plan_counts || {}).map(
                    ([plan, count]: any) => (
                      <div key={plan} className="stat-card">
                        <div className="stat-icon">
                          {plan === "pro"
                            ? "⭐"
                            : plan === "standard"
                              ? "✦"
                              : plan === "basic"
                                ? "🟢"
                                : "🆓"}
                        </div>
                        <div className="stat-value">{count}</div>
                        <div className="stat-label">
                          {plan.charAt(0).toUpperCase() + plan.slice(1)} Users
                        </div>
                      </div>
                    ),
                  )}
                  <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div className="stat-value">
                      {stats.total_users > 0
                        ? Math.round(
                            (((stats.plan_counts?.basic || 0) +
                              (stats.plan_counts?.standard || 0) +
                              (stats.plan_counts?.pro || 0)) /
                              stats.total_users) *
                              100,
                          )
                        : 0}
                      %
                    </div>
                    <div className="stat-label">Conversion Rate</div>
                  </div>
                </div>

                <div className="two-col">
                  <div className="panel">
                    <h3 className="panel-title">🆕 Recent Sign-ups</h3>
                    {stats.recent_users?.map((u: any) => (
                      <div key={u._id} className="list-row">
                        <div className="list-avatar">{u.name?.[0] || "?"}</div>
                        <div className="list-info">
                          <div className="list-name">{u.name}</div>
                          <div className="list-sub">{u.email}</div>
                          <div className="list-sub">
                            {u.course_category} {u.course_level}
                          </div>
                        </div>
                        <span
                          className="plan-chip"
                          style={{
                            color: planColor[u.plan],
                            borderColor: planColor[u.plan],
                          }}
                        >
                          {u.plan}
                        </span>
                        <div className="list-date">{fmt(u.created_at)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="panel">
                    <h3 className="panel-title">💳 Recent Payments</h3>
                    {stats.recent_payments?.length === 0 && (
                      <div className="empty">No payments yet</div>
                    )}
                    {stats.recent_payments?.map((p: any) => (
                      <div key={p._id} className="list-row">
                        <div className="list-info">
                          <div className="list-name">
                            {p.name} —{" "}
                            <span style={{ color: planColor[p.plan] }}>
                              ₹{p.amount}
                            </span>
                          </div>
                          <div className="list-sub">{p.email}</div>
                          <div className="list-sub">
                            {p.razorpay_payment_id?.slice(0, 18)}...
                          </div>
                        </div>
                        <span className="status-chip">✓ captured</span>
                        <div className="list-date">{fmt(p.created_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* USERS */}
            {tab === "users" && (
              <div>
                <div className="filters">
                  <input
                    className="search-input"
                    placeholder="🔍 Search name, email, mobile, college..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select
                    className="filter-select"
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                  >
                    <option value="all">All Plans</option>
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="pro">Pro</option>
                  </select>
                  <span className="count-badge">
                    {filteredUsers.length} users
                  </span>
                </div>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Course</th>
                        <th>Mobile</th>
                        <th>College</th>
                        <th>Plan</th>
                        <th>Devices</th>
                        <th>Tokens Today</th>
                        <th>Joined</th>
                        <th>Plan Expires</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <React.Fragment key={u._id}>
                          <tr
                            key={u._id}
                            onClick={() =>
                              setExpandedUser(
                                expandedUser === u._id ? null : u._id,
                              )
                            }
                            style={{ cursor: "pointer" }}
                          >
                            <td>
                              <div className="user-cell">
                                <div className="t-avatar">
                                  {u.name?.[0] || "?"}
                                </div>
                                <div>
                                  <div className="t-name">{u.name || "—"}</div>
                                  <div className="t-email">{u.email}</div>
                                  <div className="t-email">
                                    {u.auth_type === "google"
                                      ? "🔵 Google"
                                      : "📧 Email"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="t-sub">
                                {u.course_category}
                                <br />
                                {u.course_level}
                              </span>
                            </td>
                            <td className="t-sub">{u.mobile || "—"}</td>
                            <td className="t-sub">{u.college || "—"}</td>
                            <td>
                              <span
                                className="plan-chip"
                                style={{
                                  color: planColor[u.plan],
                                  borderColor: planColor[u.plan],
                                }}
                              >
                                {u.plan}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`device-badge ${u.device_count >= 2 ? "warn" : ""}`}
                              >
                                📱 {u.device_count} / 2
                              </span>
                            </td>
                            <td className="t-sub">
                              {(u.tokens_used_today || 0).toLocaleString()}
                            </td>
                            <td className="t-sub">{fmt(u.created_at)}</td>
                            <td
                              className="t-sub"
                              style={{
                                color:
                                  u.plan_expires_at &&
                                  new Date(u.plan_expires_at) < new Date()
                                    ? "#ff8080"
                                    : "inherit",
                              }}
                            >
                              {u.plan_expires_at ? fmt(u.plan_expires_at) : "—"}
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  alignItems: "center",
                                }}
                              >
                                <select
                                  className="plan-select"
                                  value={u.plan}
                                  disabled={updatingId === u._id}
                                  onChange={(e) =>
                                    updatePlan(u._id, e.target.value)
                                  }
                                >
                                  <option value="free">Free</option>
                                  <option value="basic">Basic</option>
                                  <option value="standard">Standard</option>
                                  <option value="pro">Pro</option>
                                </select>
                                <button
                                  className="kick-btn"
                                  onClick={() => clearSessions(u._id)}
                                  title="Clear all devices"
                                >
                                  🚫
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedUser === u._id && (
                            <tr className="expanded-row">
                              <td colSpan={10}>
                                <div className="expanded-content">
                                  <strong>Devices:</strong>
                                  {u.devices?.length === 0 && (
                                    <span className="t-sub">
                                      {" "}
                                      No active sessions
                                    </span>
                                  )}
                                  {u.devices?.map((d: any) => (
                                    <span
                                      key={d.device_id}
                                      className="device-tag"
                                    >
                                      {d.device_type === "mobile" ? "📱" : "💻"}{" "}
                                      {d.device_type} · Last seen{" "}
                                      {fmt(d.last_seen)}
                                    </span>
                                  ))}
                                  <span
                                    className="t-sub"
                                    style={{ marginLeft: 12 }}
                                  >
                                    Plan started: {fmtFull(u.plan_started_at)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="empty">No users found</div>
                  )}
                </div>
              </div>
            )}

            {/* PAYMENTS */}
            {tab === "payments" && (
              <div>
                <div className="total-revenue">
                  💰 Total Revenue:{" "}
                  <strong>
                    ₹
                    {payments
                      .reduce((s, p) => s + (p.amount || 0), 0)
                      .toLocaleString("en-IN")}
                  </strong>
                  <span className="pay-count">
                    {payments.length} transactions
                  </span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Payment ID</th>
                        <th>User</th>
                        <th>Plan</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p._id}>
                          <td>
                            <span className="mono">
                              {p.razorpay_payment_id || "—"}
                            </span>
                          </td>
                          <td>
                            <div className="t-name">{p.name}</div>
                            <div className="t-email">{p.email}</div>
                          </td>
                          <td>
                            <span
                              className="plan-chip"
                              style={{
                                color: planColor[p.plan],
                                borderColor: planColor[p.plan],
                              }}
                            >
                              {p.plan}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: "#4ade80" }}>
                              ₹{p.amount}
                            </strong>
                          </td>
                          <td>
                            <span className="status-chip">{p.status}</span>
                          </td>
                          <td className="t-sub">{fmtFull(p.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {payments.length === 0 && (
                    <div className="empty">No payments yet</div>
                  )}
                </div>
              </div>
            )}

            {/* USAGE */}
            {/* USAGE */}
            {tab === "usage" && (
              <div>
                <p
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: 20,
                    fontSize: 14,
                  }}
                >
                  Token usage per user per day. Resets at midnight IST.
                </p>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Plan</th>
                        <th>Tokens Used Today</th>
                        <th>Daily Limit</th>
                        <th>Usage %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const limits: Record<string, number> = {
                          free: 5000,
                          basic: 50000,
                          standard: 150000,
                          pro: 500000,
                        };
                        const limit = limits[u.plan] || 5000;
                        const used = u.tokens_used_today || 0;
                        const pct = Math.min(
                          100,
                          Math.round((used / limit) * 100),
                        );
                        return (
                          <tr key={u._id}>
                            <td>
                              <div className="t-name">{u.name}</div>
                            </td>
                            <td>
                              <div className="t-email">{u.email}</div>
                            </td>
                            <td>
                              <span
                                className="plan-chip"
                                style={{
                                  color: planColor[u.plan],
                                  borderColor: planColor[u.plan],
                                }}
                              >
                                {u.plan}
                              </span>
                            </td>
                            <td className="t-sub">{used.toLocaleString()}</td>
                            <td className="t-sub">{limit.toLocaleString()}</td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <div
                                  style={{
                                    flex: 1,
                                    background: "rgba(255,255,255,0.08)",
                                    borderRadius: 4,
                                    height: 6,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${pct}%`,
                                      background:
                                        pct > 80 ? "#ff8080" : "#4ade80",
                                      borderRadius: 4,
                                      height: 6,
                                    }}
                                  />
                                </div>
                                <span className="t-sub">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {users.length === 0 && (
                    <div className="empty">No usage data</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .admin-bg {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          background: #0d1b22;
          color: #fff;
          font-family: -apple-system, sans-serif;
        }
        .sidebar {
          width: 200px;
          background: rgba(255, 255, 255, 0.04);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          padding: 24px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex-shrink: 0;
        }
        .sidebar-logo {
          color: #4ade80;
          font-size: 16px;
          font-weight: 800;
          padding: 8px;
          margin-bottom: 4px;
        }
        .sidebar-label {
          color: rgba(255, 255, 255, 0.3);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 8px;
          margin-bottom: 4px;
        }
        .sidebar-link {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          width: 100%;
        }
        .sidebar-link:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }
        .sidebar-link.active {
          background: rgba(74, 222, 128, 0.1);
          color: #4ade80;
        }
        .main {
          flex: 1;
          padding: 24px;
          overflow-x: auto;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .page-title {
          color: #fff;
          font-size: 20px;
          font-weight: 800;
          margin: 0;
        }
        .refresh-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
        }
        .loading {
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
          padding: 60px;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 16px;
        }
        .stat-card.green {
          border-color: rgba(74, 222, 128, 0.2);
          background: rgba(74, 222, 128, 0.05);
        }
        .stat-card.blue {
          border-color: rgba(96, 165, 250, 0.2);
          background: rgba(96, 165, 250, 0.05);
        }
        .stat-icon {
          font-size: 22px;
          margin-bottom: 8px;
        }
        .stat-value {
          color: #fff;
          font-size: 24px;
          font-weight: 800;
        }
        .stat-label {
          color: rgba(255, 255, 255, 0.4);
          font-size: 12px;
          margin-top: 4px;
        }
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .panel {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 16px;
        }
        .panel-title {
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 14px;
        }
        .list-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .list-row:last-child {
          border-bottom: none;
        }
        .list-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4ade80, #22c55e);
          color: #0f2027;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          flex-shrink: 0;
        }
        .list-info {
          flex: 1;
          min-width: 0;
        }
        .list-name {
          color: #fff;
          font-size: 12px;
          font-weight: 600;
        }
        .list-sub {
          color: rgba(255, 255, 255, 0.35);
          font-size: 11px;
        }
        .list-date {
          color: rgba(255, 255, 255, 0.3);
          font-size: 11px;
          white-space: nowrap;
        }
        .plan-chip {
          font-size: 11px;
          font-weight: 700;
          border: 1px solid currentColor;
          padding: 3px 8px;
          border-radius: 20px;
          white-space: nowrap;
        }
        .status-chip {
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 20px;
        }
        .device-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.5);
        }
        .device-badge.warn {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }
        .empty {
          color: rgba(255, 255, 255, 0.3);
          text-align: center;
          padding: 24px;
          font-size: 14px;
        }
        .filters {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .search-input {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 9px 14px;
          color: #fff;
          font-size: 14px;
          outline: none;
          flex: 1;
          min-width: 200px;
        }
        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
        .filter-select {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 9px 12px;
          color: #fff;
          font-size: 14px;
          outline: none;
          cursor: pointer;
        }
        .count-badge {
          color: rgba(255, 255, 255, 0.4);
          font-size: 13px;
        }
        .table-wrap {
          overflow-x: auto;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }
        .data-table th {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.4);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 10px 14px;
          text-align: left;
          white-space: nowrap;
        }
        .data-table td {
          padding: 12px 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          vertical-align: middle;
        }
        .data-table tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }
        .expanded-row td {
          background: rgba(255, 255, 255, 0.02);
        }
        .expanded-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 12px;
        }
        .device-tag {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 4px 10px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
        }
        .user-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .t-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4ade80, #22c55e);
          color: #0f2027;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          flex-shrink: 0;
        }
        .t-name {
          color: #fff;
          font-size: 13px;
          font-weight: 600;
        }
        .t-email {
          color: rgba(255, 255, 255, 0.35);
          font-size: 11px;
        }
        .t-sub {
          color: rgba(255, 255, 255, 0.45);
          font-size: 12px;
        }
        .mono {
          font-family: monospace;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }
        .plan-select {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 5px 8px;
          color: #fff;
          font-size: 12px;
          cursor: pointer;
          outline: none;
        }
        .kick-btn {
          background: rgba(255, 80, 80, 0.1);
          border: 1px solid rgba(255, 80, 80, 0.2);
          color: #ff8080;
          border-radius: 8px;
          padding: 5px 8px;
          cursor: pointer;
          font-size: 13px;
        }
        .kick-btn:hover {
          background: rgba(255, 80, 80, 0.2);
        }
        .total-revenue {
          background: rgba(74, 222, 128, 0.08);
          border: 1px solid rgba(74, 222, 128, 0.2);
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 16px;
          font-size: 15px;
          color: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .total-revenue strong {
          color: #4ade80;
          font-size: 20px;
        }
        .pay-count {
          color: rgba(255, 255, 255, 0.3);
          font-size: 13px;
          margin-left: auto;
        }
        @media (max-width: 768px) {
          .two-col {
            grid-template-columns: 1fr;
          }
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
