import React, { useState } from 'react';
import { useAuth } from '../../../AuthContext';
import { API_BASE } from '../../../apiConfig';
import ScannerModal from '../../../components/Shared/ScannerModal';

export default function LogEvent() {
  const { userId, getAuthHeaders } = useAuth();
  const [view, setView] = useState('start'); // 'start' or 'arrive'
  const [startData, setStartData] = useState({ batch_id: '', location_name: '', transport_mode: 'Heavy Truck' });
  const [arriveData, setArriveData] = useState({ batch_id: '', destination_name: '', distance_km: '' });
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = (data) => {
    if (view === 'start') {
      setStartData({ ...startData, batch_id: data });
    } else {
      setArriveData({ ...arriveData, batch_id: data });
    }
    setShowScanner(false);
  };

  const handleStartTrip = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/transport/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...startData, operator_id: userId })
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to start transport");
      alert("Transit Departure logged successfully!");
      setStartData({ batch_id: '', location_name: '', transport_mode: 'Heavy Truck' });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleArrival = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/transport/arrive/${arriveData.batch_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ 
          destination_name: arriveData.destination_name,
          distance_km: parseFloat(arriveData.distance_km)
        })
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to log arrival");
      alert("Transit Arrival logged! Carbon footprint calculated.");
      setArriveData({ batch_id: '', destination_name: '', distance_km: '' });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="card-hd">
        <div className="card-hd-title">Log Transport Event</div>
      </div>
      <div className="card-body">
        <div className="tabs" style={{ marginBottom: '20px' }}>
          <button className={`tab-btn ${view === 'start' ? 'active' : ''}`} onClick={() => setView('start')}>Log Departure</button>
          <button className={`tab-btn ${view === 'arrive' ? 'active' : ''}`} onClick={() => setView('arrive')}>Log Arrival</button>
        </div>

        {view === 'start' ? (
          <form onSubmit={handleStartTrip} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="field">
              <label className="field-label">Batch ID <span className="field-req">*</span></label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="field-input" type="text" placeholder="UUID of batch" value={startData.batch_id} onChange={e => setStartData({...startData, batch_id: e.target.value})} required />
                <button 
                  type="button" 
                  onClick={() => setShowScanner(true)}
                  className="field-btn"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', color: 'var(--text)' }}
                  title="Scan QR Code"
                >
                  📸 Scan
                </button>
              </div>
            </div>
            <div className="two-col">
              <div className="field">
                <label className="field-label">Transport Mode</label>
                <select className="field-select" value={startData.transport_mode} onChange={e => setStartData({...startData, transport_mode: e.target.value})}>
                  <option value="Heavy Truck">Heavy Truck (Diesel)</option>
                  <option value="Electric">Electric Vehicle</option>
                  <option value="Train">Freight Train</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">Pickup Location <span className="field-req">*</span></label>
                <input className="field-input" type="text" placeholder="Origin city" value={startData.location_name} onChange={e => setStartData({...startData, location_name: e.target.value})} required />
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Starting...' : 'Register Batch Departure'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleArrival} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="field">
              <label className="field-label">Batch ID <span className="field-req">*</span></label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="field-input" type="text" placeholder="UUID of batch" value={arriveData.batch_id} onChange={e => setArriveData({...arriveData, batch_id: e.target.value})} required />
                <button 
                  type="button" 
                  onClick={() => setShowScanner(true)}
                  className="field-btn"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', color: 'var(--text)' }}
                  title="Scan QR Code"
                >
                  📸 Scan
                </button>
              </div>
            </div>
            <div className="two-col">
              <div className="field">
                <label className="field-label">Destination Name <span className="field-req">*</span></label>
                <input className="field-input" type="text" placeholder="Arrival warehouse/buyer" value={arriveData.destination_name} onChange={e => setArriveData({...arriveData, destination_name: e.target.value})} required />
              </div>
              <div className="field">
                <label className="field-label">Distance Travelled (km) <span className="field-req">*</span></label>
                <input className="field-input" type="number" step="0.1" placeholder="0.0" value={arriveData.distance_km} onChange={e => setArriveData({...arriveData, distance_km: e.target.value})} required />
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Processing...' : 'Confirm Delivery & Calculate Carbon'}
            </button>
          </form>
        )}
      </div>

      {showScanner && (
        <ScannerModal 
          onClose={() => setShowScanner(false)} 
          onScan={handleScan} 
        />
      )}
    </div>
  );
}
