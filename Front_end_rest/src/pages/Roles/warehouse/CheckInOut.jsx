import React, { useState } from 'react';
import { useAuth } from '../../../AuthContext';
import { API_BASE } from '../../../apiConfig';
import ScannerModal from '../../../components/Shared/ScannerModal';

export default function CheckInOut() {
  const { fullName, email, userId, getAuthHeaders } = useAuth();
  const [activeTab, setActiveTab] = useState('checkin'); // 'checkin' or 'checkout'
  const [formData, setFormData] = useState({ batch_id: '', facility_name: '', temperature: '', humidity: '' });
  const [outData, setOutData] = useState({ batch_id: '' });
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = (data) => {
    if (activeTab === 'checkin') {
      setFormData({ ...formData, batch_id: data });
    } else {
      setOutData({ ...outData, batch_id: data });
    }
    setShowScanner(false);
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/storage/check-in`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          ...formData, 
          manager_id: userId,
          temperature: parseFloat(formData.temperature),
          humidity: parseFloat(formData.humidity)
        })
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to check in");
      alert("Batch checked into warehouse successfully.");
      setFormData({ batch_id: '', facility_name: '', temperature: '', humidity: '' });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const facilityName = fullName || email || userId;
      const res = await fetch(`${API_BASE}/api/storage/check_out/${outData.batch_id}`, {
        method: 'PATCH',
        headers
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to check out");
      alert("Batch checked out successfully.");
      setOutData({ batch_id: '' });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="card-hd">
        <div className="card-hd-title">Warehouse Operations</div>
      </div>
      <div className="card-body">
        <div className="tabs" style={{ maxWidth: '100%' }}>
          <button className={`tab-btn ${activeTab === 'checkin' ? 'active' : ''}`} onClick={() => setActiveTab('checkin')}>Check-In</button>
          <button className={`tab-btn ${activeTab === 'checkout' ? 'active' : ''}`} onClick={() => setActiveTab('checkout')}>Check-Out</button>
        </div>
        {activeTab === 'checkin' ? (
          <form onSubmit={handleCheckIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="field">
              <label className="field-label">Batch ID <span className="field-req">*</span></label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="field-input" type="text" placeholder="UUID of batch" value={formData.batch_id} onChange={e => setFormData({...formData, batch_id: e.target.value})} required />
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
            <div className="field">
              <label className="field-label">Facility Name <span className="field-req">*</span></label>
              <input className="field-input" type="text" placeholder="e.g. North Hub Cold Storage" value={formData.facility_name} onChange={e => setFormData({...formData, facility_name: e.target.value})} required />
            </div>
            <div className="two-col">
              <div className="field">
                <label className="field-label">Ambient Temp (°C) <span className="field-req">*</span></label>
                <input className="field-input" type="number" step="0.1" placeholder="20.0" value={formData.temperature} onChange={e => setFormData({...formData, temperature: e.target.value})} required />
              </div>
              <div className="field">
                <label className="field-label">Relative Humidity (%) <span className="field-req">*</span></label>
                <input className="field-input" type="number" step="0.1" placeholder="45.0" value={formData.humidity} onChange={e => setFormData({...formData, humidity: e.target.value})} required />
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Processing...' : 'Register Storage Check-in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCheckOut} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="field">
              <label className="field-label">Batch ID to Check-Out <span className="field-req">*</span></label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="field-input" type="text" placeholder="UUID of batch" value={outData.batch_id} onChange={e => setOutData({ batch_id: e.target.value })} required />
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
            <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Processing...' : 'Log Departure / Check-out'}
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
