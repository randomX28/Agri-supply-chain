import React, { useState } from 'react';
import { useAuth } from '../../../AuthContext';
import { API_BASE } from '../../../apiConfig';
import ScannerModal from '../../../components/Shared/ScannerModal';

export default function Traceability() {
  const { getAuthHeaders } = useAuth();
  const [batchId, setBatchId] = useState('');
  const [traceData, setTraceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Allow trigger trace externally (like from the scanner)
  const triggerTrace = async (targetBatchId = batchId) => {
    if (!targetBatchId.trim()) return;
    setLoading(true);
    setError('');
    setTraceData(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/traceability/${encodeURIComponent(targetBatchId.trim())}`, { headers });
      if (!res.ok) throw new Error("Batch not found or trace failed");
      const data = await res.json();
      const history = data["Full history"];
      if (history) {
        setTraceData({
          record_id: history.batch_id,
          creation: {
            created_at: history.created_at,
            crop_type: history.crop_type,
            seed_variety: history.seed_variety || "Standard",
            initial_weight: history.initial_weight,
            farmer_id: history.farmer_id
          },
          quality: history.quality_checks || [],
          transport: history.supply_chain_events || [],
          storage: history.storage_logs || []
        });
      } else {
        setTraceData(data); // Fallback
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTrace = (e) => {
    e.preventDefault();
    triggerTrace();
  };

  const handleScanSuccess = (decodedText) => {
    setIsScannerOpen(false);
    
    // Safely extract the batch_id in case it's a legacy URL-based QR code
    let extractedId = decodedText.trim();
    if (extractedId.includes('http') || extractedId.includes('/trace/')) {
       const parts = extractedId.split('/');
       extractedId = parts[parts.length - 1];
    }
    
    setBatchId(extractedId);
    triggerTrace(extractedId);
  };

  const renderTimelineNode = (type, title, time, lines, statusColor = 'green') => (
    <div className="tl-node" style={{ display: 'flex', gap: 20, marginBottom: 24, position: 'relative' }}>
      <div className="tl-line" style={{ position: 'absolute', left: 16, top: 24, bottom: -24, width: 2, background: 'var(--border2)', zIndex: 1 }}></div>
      <div className="tl-icon" style={{
        width: 34, height: 34, borderRadius: '50%', background: `var(--${statusColor})`, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', zIndex: 2, flexShrink: 0,
        boxShadow: `0 0 10px var(--${statusColor}-glow, var(--${statusColor}))`
      }}>
        {type.charAt(0)}
      </div>
      <div className="tl-content" style={{ flex: 1, background: 'var(--bg2)', padding: 16, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{title}</span>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(time).toLocaleString()}</span>
        </div>
        {lines.map((l, i) => <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>{l}</div>)}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-hd">
          <div className="card-hd-title">Trace Order Lifecycle</div>
        </div>
        <div className="card-body">
          <form onSubmit={handleTrace} style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <input
                className="field-input"
                type="text"
                placeholder="Paste Batch ID or Scan QR..."
                value={batchId}
                onChange={e => setBatchId(e.target.value)}
              />
            </div>
            <button type="submit" className="submit-btn" style={{ width: 'auto', padding: '0 24px' }} disabled={loading}>
              {loading ? 'Finding...' : 'Track Batch'}
            </button>
            <button type="button" className="submit-btn" style={{ width: 'auto', background: 'var(--bg3)', color: 'var(--text)' }} onClick={() => setIsScannerOpen(true)}>
              Scan QR
            </button>
          </form>
          {error && <div style={{ color: '#e3342f', background: '#fef2f2', padding: 12, borderRadius: 6, marginTop: 16 }}>{error}</div>}
        </div>
      </div>

      {traceData && (
        <div className="card">
          <div className="card-header">Lifecycle Provenance: {traceData.record_id}</div>
          <div className="card-body">

            {/* 1. Origin / Creation */}
            {traceData.creation && renderTimelineNode('Origin', 'Farm Creation', traceData.creation.created_at, [
              `Crop: ${traceData.creation.crop_type} (${traceData.creation.seed_variety})`,
              `Location: ${traceData.creation.farm_location}`,
              `Farmer ID: ${traceData.creation.farmer_id}`,
              `Initial Weight: ${traceData.creation.initial_weight} kg`
            ], 'green')}

            {/* 2. Quality Assurance */}
            {traceData.quality && traceData.quality.length > 0 && traceData.quality.map((q, i) =>
              renderTimelineNode('Quality', `Quality Inspection (${q.grade})`, q.checked_at, [
                `Moisture: ${q.moisture_percentage}%`,
                `Notes: ${q.notes || 'None'}`,
                `Inspector: ${q.inspector_id}`
              ], 'blue')
            )}

            {/* 3. Transport Events */}
            {traceData.transport && traceData.transport.length > 0 && traceData.transport.map((t, i) =>
              renderTimelineNode('Transport', t.event_type, t.event_time, [
                `Location: ${t.location_name}`,
                `Temperature Log: ${t.temperature ? t.temperature + '°C' : 'N/A'}`,
                `Notes: ${t.notes || 'N/A'}`
              ], 'amber')
            )}

            {/* 4. Storage Records */}
            {traceData.storage && traceData.storage.length > 0 && traceData.storage.map((s, i) =>
              renderTimelineNode('Storage', `Warehouse Check-in`, s.entry_timestamp, [
                `Facility: ${s.facility_name}`,
                `Condition: ${s.storage_condition}`,
                `Status: ${s.exit_timestamp ? 'Checked Out at ' + new Date(s.exit_timestamp).toLocaleString() : 'Currently Stored'}`
              ], 'purple')
            )}

            <div style={{ height: 24 }}></div> {/* Cap timeline line gracefully */}
            <div style={{ background: 'var(--bg2)', padding: 20, textAlign: 'center', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginTop: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 8, color: 'var(--text3)' }}>🔗</div>
              <div style={{ fontWeight: 600, color: 'var(--green)', fontSize: 16 }}>Unified Ledger Terminus</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>All nodes cryptographically verified</div>
            </div>

          </div>
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
