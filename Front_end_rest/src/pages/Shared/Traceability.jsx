import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { API_BASE } from '../../apiConfig';
import ScannerModal from '../../components/Shared/ScannerModal';

const CATEGORY_STYLE = {
  'Creation': { icon: '🚜', color: 'var(--green)' },
  'Transit Start': { icon: '🚛', color: 'var(--orange)' },
  'Transit End': { icon: '🏁', color: 'var(--orange)' },
  'Storage Check-In': { icon: '🌡️', color: 'var(--purple)' },
  'Storage Check-Out': { icon: '📦', color: 'var(--purple)' },
  'Inspection': { icon: '🧪', color: 'var(--blue)' },
  'Sale': { icon: '💰', color: 'var(--green)' }
};

export default function Traceability() {
  const { batchId: urlBatchId } = useParams();
  const { getAuthHeaders } = useAuth();
  const [batchId, setBatchId] = useState(urlBatchId || '');
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (urlBatchId) {
      setBatchId(urlBatchId);
      fetchTimeline(urlBatchId);
    }
  }, [urlBatchId]);

  const fetchTimeline = async (id = batchId) => {
    if (!id.trim()) return;
    setLoading(true);
    setError('');
    setTimeline(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/traceability/${encodeURIComponent(id.trim())}`, { headers });
      if (!res.ok) throw new Error("Batch journey not found. Verify the ID.");
      const data = await res.json();
      setTimeline(data.timeline || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = (decodedText) => {
    setIsScannerOpen(false);
    let extractedId = decodedText.trim();
    if (extractedId.includes('/trace/')) {
       const parts = extractedId.split('/');
       extractedId = parts[parts.length - 1];
    }
    setBatchId(extractedId);
    fetchTimeline(extractedId);
  };

  return (
    <div className="trace-page" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-hd">
          <div className="card-hd-title">Trace Batch Journey</div>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
            Enter a Batch UUID to view its complete farm-to-table lifecycle logs.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); fetchTimeline(); }} style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <input
                className="field-input"
                type="text"
                placeholder="Paste Batch ID or Scan..."
                value={batchId}
                onChange={e => setBatchId(e.target.value)}
              />
            </div>
            <button type="submit" className="submit-btn" style={{ width: 'auto', padding: '0 24px' }} disabled={loading}>
              {loading ? 'Tracing...' : 'Track'}
            </button>
            <button type="button" className="submit-btn" style={{ width: 'auto', background: 'var(--bg3)', color: 'var(--text)' }} onClick={() => setIsScannerOpen(true)}>
              📸 Scan
            </button>
          </form>
          {error && <div style={{ color: '#e3342f', background: '#fef2f2', padding: 12, borderRadius: 8, marginTop: 16, fontSize: 14 }}>{error}</div>}
        </div>
      </div>

      {timeline && (
        <div className="timeline-container" style={{ padding: '0 10px' }}>
          {timeline.length === 0 ? (
            <div className="empty">No events recorded for this batch yet.</div>
          ) : (
            timeline.map((event, idx) => {
              const style = CATEGORY_STYLE[event.event_category] || { icon: '•', color: 'var(--text3)' };
              return (
                <div key={idx} className="tl-item" style={{ display: 'flex', gap: 20, marginBottom: 0, position: 'relative' }}>
                  {/* Vertical Line */}
                  {idx !== timeline.length - 1 && (
                    <div style={{ position: 'absolute', left: 17, top: 34, bottom: 0, width: 2, background: 'var(--border2)' }}></div>
                  )}
                  
                  {/* Icon Node */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: style.color, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, zIndex: 2, flexShrink: 0
                  }}>
                    {style.icon}
                  </div>

                  {/* Content Card */}
                  <div style={{
                    flex: 1, background: 'var(--bg2)', padding: '14px 18px', borderRadius: 12, 
                    border: '1px solid var(--border)', marginBottom: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{event.event_category}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
                        {new Date(event.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                      {event.details}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {timeline.length > 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 12 }}>
              <div style={{ marginBottom: 8 }}>🔒 Blockchain Secured & Verified</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>ID: {batchId}</div>
            </div>
          )}
        </div>
      )}

      {isScannerOpen && (
        <ScannerModal
          onClose={() => setIsScannerOpen(false)}
          onScan={handleScanSuccess}
        />
      )}
    </div>
  );
}
