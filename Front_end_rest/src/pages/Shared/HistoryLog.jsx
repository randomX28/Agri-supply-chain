import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { API_BASE } from '../../apiConfig';
import { QRCodeCanvas } from 'qrcode.react';

const ROLE_API_CONFIG = {
  farmer: { urlPath: '/api/batches/farmer/', title: 'My Batches',
    renderCard: (item, onAction) => (
      <div className="card" key={item.batch_id}>
        <div className="card-hd">
          <div className="act-badge">BATCH</div>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>{parseDate(item)}</div>
        </div>
        <div className="card-body" style={{ gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{item.crop_type} ({item.initial_weight} kg)</div>
            <div style={{ color: 'var(--green)', fontWeight: 'bold' }}>₹{item.base_price_per_kg}/kg</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: 13, color: 'var(--text2)' }}>
            <div><span style={{ color: 'var(--text3)' }}>ID:</span> {item.batch_id.slice(0, 8)}...</div>
            <div><span style={{ color: 'var(--text3)' }}>Status:</span> {item.status}</div>
            <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text3)' }}>Location:</span> {item.farm_location}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {item.status === 'created' && (
              <button 
                className="submit-btn" 
                style={{ flex: 1, padding: '6px 12px', fontSize: '12px', background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border2)' }}
                onClick={() => onAction('updatePrice', item)}
              >
                Update Price
              </button>
            )}
            <button 
              className="submit-btn" 
              style={{ flex: 1, padding: '6px 12px', fontSize: '12px', background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid var(--green)' }}
              onClick={() => onAction('viewQR', item)}
            >
              📄 Get QR Code
            </button>
          </div>
        </div>
      </div>
    )
  },
  transporter: { urlPath: '/api/events/operator/', title: 'Transport Events',
    renderCard: (item) => (
      <div className="card" key={item.event_id}>
        <div className="card-hd">
          <div className="act-badge" style={{ color: 'var(--orange)', borderColor: 'var(--orange)' }}>EVENT</div>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>{parseDate(item)}</div>
        </div>
        <div className="card-body" style={{ gap: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{item.event_type}</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            <div><span style={{ color: 'var(--text3)' }}>Batch:</span> {item.batch_id}</div>
            <div><span style={{ color: 'var(--text3)' }}>Location:</span> {item.location_name}</div>
            <div><span style={{ color: 'var(--text3)' }}>Mode:</span> {item.transport_mode}</div>
            {item.distance_km && <div><span style={{ color: 'var(--text3)' }}>Distance:</span> {item.distance_km} km</div>}
          </div>
        </div>
      </div>
    )
  },
  inspector: { urlPath: '/api/quality/inspector/', title: 'Inspections',
    renderCard: (item) => (
      <div className="card" key={item.id || item.batch_id}>
        <div className="card-hd">
          <div className="act-badge" style={{ color: 'var(--blue)', borderColor: 'var(--blue)' }}>QUALITY</div>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>{parseDate(item)}</div>
        </div>
        <div className="card-body" style={{ gap: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Grade: {item.grade}</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            <div><span style={{ color: 'var(--text3)' }}>Batch:</span> {item.batch_id}</div>
            <div><span style={{ color: 'var(--text3)' }}>Moisture:</span> {item.moisture_percentage}%</div>
            <div><span style={{ color: 'var(--text3)' }}>Notes:</span> {item.notes || 'None'}</div>
            {item.certificate_url && item.certificate_url !== 'none' && (
              <div style={{ marginTop: '8px' }}>
                <a 
                  href={item.certificate_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600, fontSize: 12 }}
                >
                  📄 View Certificate
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  },
  warehouse_manager: { urlPath: '/api/storage/manager/', title: 'Storage Log',
    renderCard: (item) => (
      <div className="card" key={item.id || item.batch_id}>
        <div className="card-hd">
          <div className="act-badge" style={{ color: 'var(--purple)', borderColor: 'var(--purple)' }}>{item.exit_timestamp ? 'CHECK-OUT' : 'CHECK-IN'}</div>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>{parseDate(item)}</div>
        </div>
        <div className="card-body" style={{ gap: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Facility: {item.facility_name}</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            <div><span style={{ color: 'var(--text3)' }}>Batch:</span> {item.batch_id}</div>
            <div><span style={{ color: 'var(--text3)' }}>Temp:</span> {item.temperature}°C</div>
            <div><span style={{ color: 'var(--text3)' }}>Humidity:</span> {item.humidity}%</div>
            {item.exit_timestamp && <div><span style={{ color: 'var(--text3)' }}>Exit:</span> {new Date(item.exit_timestamp).toLocaleString()}</div>}
          </div>
        </div>
      </div>
    )
  },
};

const normalizeRole = (role) => {
  if (role === 'transport' || role === 'transporter') return 'transporter';
  if (role === 'warehouse' || role === 'warehouse_manager') return 'warehouse_manager';
  return role;
};

const parseDate = (item) => {
  const ts = item.event_time || item.arrival_time || item.created_at || item.entry_timestamp || item.updated_at;
  if (!ts) return 'N/A';
  const d = new Date(ts);
  return isNaN(d.getTime()) ? 'Invalid' : d.toLocaleString();
};

export default function HistoryLog() {
  const { role, userId, fullName, email, getAuthHeaders } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatchForQR, setSelectedBatchForQR] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      const normalizedRole = normalizeRole(role);
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

  const handleAction = async (actionType, item) => {
    if (actionType === 'updatePrice') {
      const newPrice = window.prompt(`Enter new asking price for Batch ${item.batch_id.slice(0, 8)}:`, item.base_price_per_kg);
      if (newPrice === null || newPrice === "" || isNaN(newPrice)) return;

      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/batches/${item.batch_id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ base_price_per_kg: parseFloat(newPrice) })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Failed to update price");
        }
        alert("Price updated successfully!");
        window.location.reload(); // Simple refresh to show new data
      } catch (err) {
        alert("Error: " + err.message);
      }
    } else if (actionType === 'viewQR') {
      setSelectedBatchForQR(item);
    }
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById("history-batch-qrcode");
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    let downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `QR_${selectedBatchForQR.batch_id.slice(0,8)}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const normalizedRole = normalizeRole(role);
  const cfg = ROLE_API_CONFIG[normalizedRole];
  if (!cfg) return <div style={{ padding: 20 }}>History not available for this role.</div>;

  return (
    <div className="history-page">
      <div className="page-title">◫ {cfg.title}</div>
      <div className="page-subtitle">View all your past activity records in one place</div>
      
      {loading ? <div className="empty">Loading your history...</div> : 
       items.length === 0 ? <div className="empty">No records found.</div> :
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginTop: '20px' }}>
         {items.map(item => cfg.renderCard(item, handleAction))}
       </div>
      }

      {/* QR Code Modal Overlay */}
      {selectedBatchForQR && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ maxWidth: 400, width: '90%', textAlign: 'center', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: 'var(--text)' }}>Batch QR Code</h3>
              <button onClick={() => setSelectedBatchForQR(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, display: 'inline-block', marginBottom: 20, border: '1px solid var(--border)' }}>
              <QRCodeCanvas 
                id="history-batch-qrcode" 
                value={selectedBatchForQR.batch_id} 
                size={220} 
                level="H" 
              />
            </div>

            <div style={{ textAlign: 'left', background: 'var(--bg)', padding: 15, borderRadius: 8, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600 }}>Batch ID</div>
              <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: 4 }}>{selectedBatchForQR.batch_id}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                {selectedBatchForQR.crop_type} · {selectedBatchForQR.initial_weight}kg
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="submit-btn" style={{ background: 'var(--bg3)', color: 'var(--text)' }} onClick={() => setSelectedBatchForQR(null)}>Close</button>
              <button className="submit-btn" onClick={handleDownloadQR}>Download PNG</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
