import { useState, useEffect } from "react";
import { API_BASE } from "../../../apiConfig";
import { supabase } from "../../../supabaseClient";

// ── Shared auth header helper ─────────────────────────────────────────────────
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

// ── Live-data hook ────────────────────────────────────────────────────────────
function useFetch(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAuthHeaders().then(headers => {
      fetch(`${API_BASE}${path}`, { headers })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
        .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
        .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    });
    return () => { cancelled = true; };
  }, [path]);
  return { data, loading, error };
}

const Spinner = () => (
  <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading…</div>
);
const ErrBox = ({ msg }) => (
  <div style={{ padding: 16, color: "#b91c1c", background: "#fef2f2", borderRadius: 10, fontSize: 13 }}>
    {msg || "Failed to load data."}
  </div>
);

// ── Palette & design tokens ───────────────────────────────────────────────────
const TOKEN = {
  green: { bg: "var(--green-dim)", text: "var(--green)", dot: "var(--green)" },
  amber: { bg: "rgba(251, 191, 36, 0.15)", text: "var(--yellow)", dot: "var(--yellow)" },
  red: { bg: "rgba(248, 113, 113, 0.15)", text: "var(--red)", dot: "var(--red)" },
  blue: { bg: "rgba(56, 189, 248, 0.15)", text: "var(--blue)", dot: "var(--blue)" },
  gray: { bg: "var(--bg3)", text: "var(--text2)", dot: "var(--text3)" },
  purple: { bg: "rgba(167, 139, 250, 0.15)", text: "var(--purple)", dot: "var(--purple)" },
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const severityColor = s => s === "Critical" ? "red" : s === "Warning" ? "amber" : s === "Suspicious" ? "red" : s === "Pass" ? "green" : s === "Fail" ? "red" : "gray";
const roleColor = r => ({ 
  farmer: "green", 
  inspector: "blue", 
  transporter: "amber", 
  warehouse_manager: "blue", 
  buyer: "purple", 
  admin: "red", 
  system: "gray" 
}[r] || "gray");

const Badge = ({ label, color = "gray", size = "sm" }) => {
  const t = TOKEN[color] || TOKEN.gray;
  return <span style={{ background: t.bg, color: t.text, padding: size === "sm" ? "2px 8px" : "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", whiteSpace: "nowrap", display: "inline-block" }}>{label}</span>;
};

const StatCard = ({ label, value, sub, valueColor }) => (
  <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
    <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
    <span style={{ fontSize: 26, fontWeight: 700, color: valueColor || "var(--text)", lineHeight: 1.2 }}>{value}</span>
    {sub && <span style={{ fontSize: 12, color: "var(--text2)" }}>{sub}</span>}
  </div>
);

const HorizBar = ({ label, value, max, color }) => {
  const pct = Math.round(Math.min((value || 0) / Math.max(max, 1), 1) * 100);
  const dotColor = TOKEN[color]?.dot || "var(--text3)";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--text2)" }}>{label}</span>
        <span style={{ fontWeight: 600, color: "var(--text)" }}>{value}</span>
      </div>
      <div style={{ height: 6, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: dotColor, borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
};

const Avatar = ({ initials, color }) => {
  const t = TOKEN[color] || TOKEN.gray;
  return <div style={{ width: 34, height: 34, borderRadius: "50%", background: t.bg, color: t.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials}</div>;
};

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>{children}</div>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", marginBottom: 14, ...style }}>{children}</div>
);

const Btn = ({ children, onClick, variant = "ghost", size = "sm", disabled, type = "button" }) => {
  const base = { border: "1px solid var(--border)", borderRadius: 8, cursor: disabled ? "default" : "pointer", fontSize: 12, fontWeight: 500, padding: size === "sm" ? "5px 12px" : "8px 18px", transition: "all 0.15s", outline: "none", opacity: disabled ? 0.5 : 1 };
  const variants = { ghost: { background: "transparent", color: "var(--text)" }, primary: { background: "var(--green)", color: "var(--bg)", border: "1px solid var(--green)" }, danger: { background: "rgba(248, 113, 113, 0.15)", color: "var(--red)", border: "1px solid var(--red)" } };
  return <button type={type} style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>{children}</button>;
};

// ── Unified Navigation ────────────────────────────────────────────────────────
const UNIFIED_NAV = [
  { section: "Admin" },
  { id: "admin-dash", label: "Dashboard", dot: "green" },
  { id: "admin-analytics", label: "Analytics", dot: "gray" },
  { id: "admin-users", label: "User Management", dot: "gray" },
  { section: "Audit" },
  { id: "aud-logs", label: "Audit Logs", dot: "green" },
  { id: "aud-integrity", label: "Integrity Checks", dot: "amber" },
  { id: "aud-reports", label: "Compliance Reports", dot: "gray" },
  { id: "aud-export", label: "Export Logs", dot: "gray" },
];

// ── Pages ─────────────────────────────────────────────────────────────────────

function AdminDash() {
  const { data: actData, loading: l1 } = useFetch("/api/admin/activity?limit=6");
  const { data: alrtData, loading: l2 } = useFetch("/api/admin/alerts");
  const { data: usersData } = useFetch("/api/admin/users");
  const { data: analyticsData } = useFetch("/api/admin/analytics");

  if (l1 || l2) return <Spinner />;

  const activity = actData?.activity || [];
  const alerts = (alrtData?.alerts || []).filter(a => !a.resolved);
  const totalUsers = usersData?.total || "--";
  const roleCount = {};
  (usersData?.users || []).forEach(u => { const r = u.role || "unknown"; roleCount[r] = (roleCount[r] || 0) + 1; });
  const batches = analyticsData?.batches_by_crop || [];
  const maxBatches = batches.length > 0 ? Math.max(...batches.map(b => b.count || 0)) : 1;
  const maxRole = Object.values(roleCount).length > 0 ? Math.max(...Object.values(roleCount)) : 1;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Total users" value={totalUsers} sub="registered" />
        <StatCard label="Crop types" value={batches.length} sub="tracked" />
        <StatCard label="Open alerts" value={alerts.length} sub={alerts.filter(a => a.severity === "Critical").length + " critical"} valueColor="#d94040" />
        <StatCard label="Audit logs" value="live" sub="from triggers" valueColor="#2d8a48" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <SectionTitle>System alerts</SectionTitle>
              <Badge label={`${alerts.length} open`} color="red" />
            </div>
            {alerts.length === 0 && <div style={{ fontSize: 13, color: "var(--text3)", padding: "8px 0" }}>No open alerts</div>}
            {alerts.slice(0, 4).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: TOKEN[severityColor(a.severity)]?.dot || "#9ca3af", marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{a.description}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{a.batch_id?.slice(0, 8)} · {a.time ? new Date(a.time).toLocaleDateString() : ""}</div>
                </div>
                <Badge label={a.severity} color={severityColor(a.severity)} />
              </div>
            ))}
          </Card>
          <Card>
            <SectionTitle>Users by role</SectionTitle>
            {Object.entries(roleCount).map(([r, n]) => <HorizBar key={r} label={r} value={n} max={Math.max(1, ...Object.values(roleCount))} color={roleColor(r)} />)}
          </Card>
        </div>
        <div>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <SectionTitle>Recent activity</SectionTitle>
              <Badge label="live" color="green" />
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr>{["Time", "Actor", "Action"].map(h => <th key={h} style={{ textAlign: "left", padding: "5px 8px", color: "var(--text3)", fontWeight: 500, borderBottom: "1px solid var(--border)", fontSize: 11 }}>{h}</th>)}</tr></thead>
              <tbody>
                {activity.map((l, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border2)" }}>
                    <td style={{ padding: "6px 8px", color: "var(--text3)", fontFamily: "monospace", fontSize: 10 }}>{l.time ? new Date(l.time).toLocaleTimeString() : "--"}</td>
                    <td style={{ padding: "6px 8px", fontWeight: 500 }}>{String(l.actor || "").slice(0, 8)}</td>
                    <td style={{ padding: "6px 8px", color: "var(--text2)" }}>{l.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <SectionTitle>Batches by crop</SectionTitle>
            {batches.map(b => <HorizBar key={b.crop} label={b.crop} value={b.count} max={Math.max(1, ...batches.map(x => x.count || 0))} color="blue" />)}
          </Card>
        </div>
      </div>
    </div>
  );
}

function AdminAnalytics() {
  const { data, loading, error } = useFetch("/api/admin/analytics");
  if (loading) return <Spinner />;
  if (error) return <ErrBox msg={error} />;
  const quality = data?.quality_by_crop || [];
  const carbon = data?.carbon_by_mode || [];
  const batches = data?.batches_by_crop || [];
  const maxScore = Math.max(1, ...quality.map(q => q.avg_quality_score || 0));
  const maxC = Math.max(1, ...carbon.map(c => c.total_carbon || 0));
  const maxB = Math.max(1, ...batches.map(b => b.count || 0));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Crop types tracked" value={quality.length} sub="with quality data" />
        <StatCard label="Transport modes" value={carbon.length} sub="carbon logged" />
        <StatCard label="Batch types" value={batches.length} sub="in system" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <SectionTitle>Avg quality score by crop</SectionTitle>
          {quality.map(q => <HorizBar key={q.crop} label={`${q.crop} (${q.count})`} value={Math.round(q.avg_quality_score || 0)} max={maxScore} color={q.avg_quality_score >= 80 ? "green" : q.avg_quality_score >= 60 ? "amber" : "red"} />)}
        </Card>
        <Card>
          <SectionTitle>Total carbon by transport mode (kg CO₂)</SectionTitle>
          {carbon.map(c => <HorizBar key={c.mode} label={`${c.mode} (avg ${Math.round(c.avg_carbon || 0)} kg)`} value={Math.round(c.total_carbon || 0)} max={maxC} color={c.avg_carbon > 60 ? "red" : c.avg_carbon > 30 ? "amber" : "green"} />)}
        </Card>
        <Card>
          <SectionTitle>Batches by crop type</SectionTitle>
          {batches.map(b => <HorizBar key={b.crop} label={b.crop} value={b.count} max={maxB} color="blue" />)}
        </Card>
        <Card>
          <SectionTitle>Avg moisture by crop (%)</SectionTitle>
          {quality.map(q => <HorizBar key={q.crop} label={q.crop} value={Math.round(q.avg_moisture || 0)} max={20} color={q.avg_moisture > 14 ? "red" : "green"} />)}
        </Card>
      </div>
    </div>
  );
}

function AdminUsers() {
  const [reloadKey, setReloadKey] = useState(0);
  const { data, loading, error } = useFetch("/api/admin/users?t=" + reloadKey);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("role"); // "newest", "name", "role"

  // Form State
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("farmer");
  const [addLdg, setAddLdg] = useState(false);

  // Status Action
  const handleStatus = async (user_id, currentStatus) => {
    const next = currentStatus === "inactive" ? "active" : "inactive";
    if (!confirm(`Mark user as ${next}?`)) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/admin/users/${user_id}/status`, {
        method: "PATCH", headers,
        body: JSON.stringify({ status: next })
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Update failed");
      setReloadKey(k => k + 1);
    } catch (err) { alert(err.message); }
  };

  // Delete Action
  const handleDelete = async (user_id) => {
    if (!confirm("Permanently delete this user? This cannot be undone.")) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/admin/users/${user_id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error((await res.json()).detail || "Delete failed");
      setReloadKey(k => k + 1);
    } catch (err) { alert("Delete restricted:\n\n" + err.message); }
  };

  // Add Action
  const handleAdd = async (e) => {
    e.preventDefault();
    setAddLdg(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST", headers,
        body: JSON.stringify({ email: newEmail, password: newPass, full_name: newName, role: newRole })
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to add user");
      setShowAdd(false);
      setNewEmail(""); setNewPass(""); setNewName(""); setNewRole("farmer");
      setReloadKey(k => k + 1);
    } catch (err) { alert(err.message); }
    setAddLdg(false);
  };

  if (loading) return <Spinner />;
  if (error) return <ErrBox msg={error} />;

  const users = data?.users || [];

  const filtered = users
    .filter(u =>
      !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.role?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "name") return (a.full_name || "").localeCompare(b.full_name || "");
      if (sortBy === "role") return (a.role || "").localeCompare(b.role || "");
      if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at);
      return 0;
    });

  return (
    <div>
      {showAdd ? (
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>Add New User</SectionTitle>
          <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }} />
            <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name" style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }} />
            <input required type="text" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Temporary Password (min 6 chars)" style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }} minLength={6} />
            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }}>
              {["farmer", "inspector", "transporter", "warehouse_manager", "buyer", "admin"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8, gridColumn: "1 / -1" }}>
              <Btn type="submit" variant="primary" disabled={addLdg}>{addLdg ? "Adding..." : "Confirm & Add User"}</Btn>
              <Btn type="button" onClick={() => setShowAdd(false)}>Cancel</Btn>
            </div>
          </form>
        </Card>
      ) : (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Btn variant="primary" onClick={() => setShowAdd(true)}>+ Add User</Btn>
        </div>
      )}

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <SectionTitle>All users ({filtered.length})</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, outline: "none", background: "var(--bg2)", color: "var(--text)", cursor: "pointer" }}>
              <option value="newest">Newest First</option>
              <option value="name">Alphabetical (Name)</option>
              <option value="role">Group by Role</option>
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or role..."
              style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, width: 220, outline: "none" }} />
          </div>
        </div>
        {filtered.map((u, i) => {
          const initials = (u.full_name || u.email || "?").split(" ").map(w => w[0] || "").join("").slice(0, 2).toUpperCase();
          return (
            <div key={u.user_id || u.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #f3f4f6" }}>
              <Avatar initials={initials} color={roleColor(u.role)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{u.full_name || "—"}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{u.email}</div>
              </div>
              <Badge label={u.role || "unknown"} color={roleColor(u.role)} />
              <Badge label={u.status || "active"} color={u.status === "inactive" ? "gray" : "green"} />
              <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                <Btn onClick={() => handleStatus(u.user_id || u.id, u.status || "active")}>
                  {u.status === "inactive" ? "Activate" : "Deactivate"}
                </Btn>
                <Btn variant="danger" onClick={() => handleDelete(u.user_id || u.id)}>Delete</Btn>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 16, textAlign: "center", color: "var(--text3)" }}>No users found.</div>}
      </Card>
    </div>
  );
}


function AuditorLogs() {
  const { data, loading, error } = useFetch("/api/auditor/logs");
  const [search, setSearch] = useState("");
  const [filterTable, setFilterTable] = useState("");
  if (loading) return <Spinner />;
  if (error) return <ErrBox msg={error} />;
  const all = data?.logs || [];
  const tables = [...new Set(all.map(l => l.table_name).filter(Boolean))];
  const filtered = all.filter(l =>
    (!filterTable || l.table_name === filterTable) &&
    (!search || l.action_type?.toLowerCase().includes(search.toLowerCase()) ||
      l.table_name?.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <StatCard label="Total log entries" value={data?.total ?? 0} sub="all time" />
        <StatCard label="Tables covered" value={tables.length} sub="tables audited" />
        <StatCard label="Updates tracked" value={all.filter(l => l.action_type === "UPDATE").length} sub="state transitions" valueColor="#d4860a" />
      </div>
      <Card>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <select value={filterTable} onChange={e => setFilterTable(e.target.value)}
            style={{ padding: "5px 9px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, height: 30, outline: "none" }}>
            <option value="">All tables</option>
            {tables.map(t => <option key={t}>{t}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            style={{ padding: "5px 9px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, width: 180, outline: "none" }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 580 }}>
            <thead>
              <tr>{["Changed at", "Table", "Action", "Changed by", "Old status", "New status"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--text3)", fontWeight: 500, borderBottom: "1px solid var(--border)", fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border2)" }}>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace", color: "var(--text3)", fontSize: 10 }}>{l.changed_at ? new Date(l.changed_at).toLocaleString() : "--"}</td>
                  <td style={{ padding: "6px 8px" }}><Badge label={l.table_name} color="blue" /></td>
                  <td style={{ padding: "6px 8px" }}><Badge label={l.action_type} color={l.action_type === "UPDATE" ? "amber" : l.action_type === "INSERT" ? "green" : "red"} /></td>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: 10 }}>{String(l.changed_by || "system").slice(0, 8)}</td>
                  <td style={{ padding: "6px 8px", color: "var(--text3)" }}>{l.old_data?.status || "--"}</td>
                  <td style={{ padding: "6px 8px", fontWeight: 600 }}>{l.new_data?.status || "--"}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: "16px 8px", color: "var(--text3)", textAlign: "center" }}>No matching logs</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>Showing {filtered.length} of {data?.total || 0} entries</div>
      </Card>
    </div>
  );
}

function AuditorIntegrity() {
  const { data, loading, error } = useFetch("/api/auditor/integrity");
  const { data: alertData, loading: alrtLoading } = useFetch("/api/admin/alerts");
  const [lastRun, setLastRun] = useState(new Date().toLocaleTimeString());
  const [manualLoading, setManualLoading] = useState(false);
  const [manualData, setManualData] = useState(null);
  const display = manualData || data;
  const checks = display?.checks || [];
  const alerts = (alertData?.alerts || []).filter(a => !a.resolved);
  const passed = display?.passed ?? 0;

  const run = async () => {
    setManualLoading(true);
    const headers = await getAuthHeaders();
    fetch(`${API_BASE}/api/auditor/integrity`, { headers })
      .then(r => r.json())
      .then(d => { setManualData(d); setLastRun(new Date().toLocaleTimeString()); setManualLoading(false); });
  };

  if (loading || alrtLoading) return <Spinner />;
  if (error) return <ErrBox msg={error} />;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <StatCard label="Checks passed" value={`${passed}/${checks.length}`} sub="this run" valueColor="#2d8a48" />
        <StatCard label="System Alerts" value={alerts.length} sub={alerts.filter(a => a.severity === 'Critical').length + " critical"} valueColor={alerts.length > 0 ? "#d94040" : "#2d8a48"} />
        <StatCard label="Last run" value={lastRun} sub="automatic on load" />
      </div>

      {alerts.length > 0 && (
        <Card style={{ borderLeft: '4px solid var(--red)' }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <SectionTitle>⚠️ Active System Alerts</SectionTitle>
            <Badge label="Needs Attention" color="red" />
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>{["Severity", "Description", "Batch", "Time"].map(h => <th key={h} style={{ textAlign: "left", padding: "5px 8px", color: "var(--text3)", fontWeight: 500, borderBottom: "1px solid var(--border)", fontSize: 11 }}>{h}</th>)}</tr></thead>
            <tbody>
              {alerts.map((a, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border2)" }}>
                  <td style={{ padding: "7px 8px" }}><Badge label={a.severity} color={severityColor(a.severity)} /></td>
                  <td style={{ padding: "7px 8px" }}>{a.description}</td>
                  <td style={{ padding: "7px 8px", fontWeight: 600 }}>{a.batch_id?.slice(0, 8)}</td>
                  <td style={{ padding: "7px 8px", color: "var(--text3)" }}>{a.time ? new Date(a.time).toLocaleDateString() : "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <SectionTitle>Integrity checks</SectionTitle>
          <Btn variant="primary" onClick={run} disabled={manualLoading}>{manualLoading ? "Running..." : "Run checks"}</Btn>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr>{["Check", "Status", "Details"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "5px 8px", color: "var(--text3)", fontWeight: 500, borderBottom: "1px solid var(--border)", fontSize: 11 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {checks.map(c => (
              <tr key={c.name} style={{ borderBottom: "1px solid var(--border2)" }}>
                <td style={{ padding: "7px 8px" }}>{c.name}</td>
                <td style={{ padding: "7px 8px" }}><Badge label={c.status} color={c.status === "Pass" ? "green" : c.status === "Warning" ? "amber" : "red"} /></td>
                <td style={{ padding: "7px 8px", color: c.status === "Fail" ? "#d94040" : "#6b7280" }}>{c.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AuditorReports() {
  const { data: intData } = useFetch("/api/auditor/integrity");
  const { data: logData } = useFetch("/api/auditor/logs");
  const checks = intData?.checks || [];
  const passed = intData?.passed ?? 0;
  const total = intData?.total ?? 0;
  const logs = logData?.total ?? 0;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Integrity checks" value={`${passed}/${total}`} sub="checks passing" valueColor={passed === total ? "#2d8a48" : "#d94040"} />
        <StatCard label="Audit coverage" value="100%" sub="all actions logged" valueColor="#2d8a48" />
        <StatCard label="Audit log count" value={logs} sub="total entries" />
        <StatCard label="Failures" value={checks.filter(c => c.status === "Fail").length} sub="need resolution" valueColor="#d94040" />
      </div>
      <Card>
        <SectionTitle>Live findings</SectionTitle>
        {checks.map(c => (
          <div key={c.name} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.status === "Pass" ? TOKEN.green.dot : c.status === "Warning" ? TOKEN.amber.dot : TOKEN.red.dot, marginTop: 5, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>{c.detail}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function AuditorExport() {
  const { data } = useFetch("/api/auditor/logs");
  const exportCSV = () => {
    const logs = data?.logs || [];
    const rows = [["log_id", "table_name", "action_type", "changed_by", "changed_at", "old_status", "new_status"],
    ...logs.map(l => [l.log_id, l.table_name, l.action_type, l.changed_by || "system", l.changed_at, l.old_data?.status || "", l.new_data?.status || ""])
    ];
    const csv = rows.map(r => r.map(v => `"${v || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit_logs.csv"; a.click();
  };
  return (
    <Card>
      <SectionTitle>Export audit logs</SectionTitle>
      <div style={{ padding: "10px 12px", background: "var(--bg)", borderRadius: 8, fontSize: 12, color: "var(--text2)", marginBottom: 14, lineHeight: 1.6 }}>
        Exports all {data?.total || 0} audit log entries as CSV. Includes: table_name, action_type, changed_by, changed_at, old_status, new_status.
      </div>
      <Btn variant="primary" size="md" onClick={exportCSV}>Export &amp; download CSV</Btn>
    </Card>
  );
}

// �// ── App shell — receives real auth props from AppLayout context ──────────
// ── Pages Map ─────────────────────────────────────────────────────────────
const PAGES = {
  "admin-dash": { component: AdminDash },
  "admin-analytics": { component: AdminAnalytics },
  "admin-users": { component: AdminUsers },
  "aud-logs": { component: AuditorLogs },
  "aud-integrity": { component: AuditorIntegrity },
  "aud-reports": { component: AuditorReports },
  "aud-export": { component: AuditorExport },
};

export default function AdminDashboardView() {
  const [activePage, setActivePage] = useState("admin-dash");

  const page = PAGES[activePage];
  const PageComp = page?.component;

  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: '20px' }}>

      {/* Unified Tab Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: '8px', overflowX: 'auto', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
        {UNIFIED_NAV.filter(n => n.id).map((item) => (
          <button key={item.id} onClick={() => setActivePage(item.id)}
            style={{
              padding: "8px 16px", borderRadius: "10px", border: 'none',
              background: activePage === item.id ? "var(--green-dim)" : "transparent",
              color: activePage === item.id ? "var(--green)" : "var(--text2)",
              fontSize: 13, fontWeight: activePage === item.id ? 700 : 500, cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: 'nowrap'
            }}>
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: "2px" }}>
        {PageComp && <PageComp />}
      </div>
    </div>
  );
}
