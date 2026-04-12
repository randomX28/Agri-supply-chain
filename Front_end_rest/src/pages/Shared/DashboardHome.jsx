import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { ROLES } from '../../constants';
import { API_BASE } from '../../apiConfig';

// Role-specific config mapped from API
const ROLE_API_CONFIG = {
  farmer: { urlPath: '/api/batches/farmer/', badge: 'BATCH', itemText: b => `${b.crop_type || '?'} — ${b.initial_weight || '?'} kg  (${b.batch_id || ''})`, tsField: 'created_at' },
  transporter: { urlPath: '/api/events/operator/', badge: 'EVENT', itemText: e => `${e.event_type || 'event'} @ ${e.location_name || '?'} — ${e.batch_id || ''}`, tsField: 'event_time' },
  inspector: { urlPath: '/api/quality/inspector/', badge: 'QUALITY', itemText: q => `Grade ${q.grade || '?'} for ${q.batch_id ? q.batch_id.substring(0,8) : '?'}... ${q.certificate_url && q.certificate_url !== 'none' ? '(📄 Certificate Attached)' : ''}`, tsField: 'created_at' },
  warehouse_manager: { urlPath: '/api/storage/manager/', badge: 'STORAGE', itemText: s => `${s.exit_timestamp ? 'Check-out' : 'Check-in'}: ${s.batch_id || '?'} @ ${s.facility_name || '?'}`, tsField: 'entry_timestamp' },
  buyer: { urlPath: '/api/purchases/buyer/', badge: 'PURCHASE', itemText: p => `Bought ${p.total_weight || '?'} kg of ${p.batch_id || '?'} at ₹${p.final_price_per_kg || '?'}`, tsField: 'created_at' },
};

const WELCOME_MAP = {
  farmer: { headline: 'Welcome, Farmer', statLabel: 'Batches Created', hint: 'Register new crop batches and get QR codes for traceability.' },
  warehouse_manager: { headline: 'Welcome, Manager', statLabel: 'Storage Records', hint: 'Manage batch check-ins and check-outs at your facility.' },
  transporter: { headline: 'Welcome, Transporter', statLabel: 'Events Logged', hint: 'Log and track all transport and handling events.' },
  inspector: { headline: 'Welcome, Inspector', statLabel: 'Quality Checks', hint: 'Submit quality inspection reports for batches.' },
  buyer: { headline: 'Welcome', statLabel: '', hint: 'Browse the marketplace and trace your orders by batch ID.' }
};

const normalizeRole = (role) => {
  if (role === 'transport' || role === 'transporter') return 'transporter';
  if (role === 'warehouse' || role === 'operator' || role === 'warehouse_manager') return 'warehouse_manager';
  return role;
};

export default function DashboardHome() {
  const { role, fullName, email, userId, getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // If role isn't recognized or is admin, redirect immediately
  useEffect(() => {
    if (role === 'admin') navigate('/admin', { replace: true });
  }, [role, navigate]);

  useEffect(() => {
    let cancelled = false;
    
    async function fetchData() {
      const normalizedRole = normalizeRole(role);
      if (!normalizedRole || normalizedRole === 'admin') return;
      const cfg = ROLE_API_CONFIG[normalizedRole];
      if (!cfg) return;

      try {
        const idPath = userId;
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}${cfg.urlPath}${encodeURIComponent(idPath)}`, { headers });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : (data.quality_checks || data.batches || data.events || data.storage_history || data.buyer_purchase_history || data.results || []));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    fetchData();
    return () => { cancelled = true; };
  }, [role, userId, fullName, email, getAuthHeaders]);

  if (role === 'admin') return null;

  const normalizedRole = normalizeRole(role);
  const currentRoleConfig = ROLES[normalizedRole] || ROLES['farmer'];
  const w = WELCOME_MAP[normalizedRole] || WELCOME_MAP['farmer'];
  const cfg = ROLE_API_CONFIG[normalizedRole];

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

  return (
    <div>
      <div className="page-title">{currentRoleConfig.icon} {w.headline}</div>
      <div className="page-subtitle">{fullName || email} · {currentRoleConfig.label} · {w.hint}</div>
      
      {role === 'buyer' ? (
        <div className="buyer-quick-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <button className="buyer-quick-card" onClick={() => navigate('/buyer/marketplace')}>
            <div className="bqc-icon">⬡</div><div className="bqc-label">Marketplace</div>
            <div className="bqc-desc">Browse verified crop listings</div><div className="bqc-arrow">→</div>
          </button>
          <button className="buyer-quick-card" onClick={() => navigate('/buyer/traceability')}>
            <div className="bqc-icon">◎</div><div className="bqc-label">Trace Order</div>
            <div className="bqc-desc">Lookup batch lifecycle via QR</div><div className="bqc-arrow">→</div>
          </button>
        </div>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat-card">
              <div className="sc-label">{w.statLabel}</div>
              <div className="sc-val">{loading ? '…' : items.length}</div>
              <div className="sc-hint">all time · this account</div>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/history')}>
              <div className="sc-label">Total Records</div>
              <div className="sc-val">{loading ? '…' : items.length}</div>
              <div className="sc-hint" style={{ color: 'var(--green)' }}>View History →</div>
            </div>
          </div>
          <div className="sec-label">Recent Activity</div>
          <div className="card">
            <div className="card-body" style={{ padding: '0 22px' }}>
              <div className="activity-feed">
                {loading ? <div className="empty">Loading…</div> : 
                 items.length === 0 ? <div className="empty">No activity yet — start using the tools!</div> :
                 items.slice(0, 8).map((item, idx) => (
                    <div className="act-item" key={idx}>
                      <span className="act-badge">{cfg.badge}</span>
                      <span className="act-text">{cfg.itemText(item)}</span>
                      <span className="evt-time">{fmtDate(item[cfg.tsField])}</span>
                    </div>
                 ))
                }
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
