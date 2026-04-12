import React, { useState } from 'react';
import { useAuth } from '../../../AuthContext';
import { API_BASE } from '../../../apiConfig';
import { QRCodeCanvas } from 'qrcode.react';

export default function CreateBatch() {
  const { userId, getAuthHeaders } = useAuth();
  const [formData, setFormData] = useState({ crop_type: 'Wheat', initial_weight: '', base_price_per_kg: '' });
  const [loading, setLoading] = useState(false);
  const [createdBatch, setCreatedBatch] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/batches/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          ...formData, 
          initial_weight: parseFloat(formData.initial_weight), 
          base_price_per_kg: parseFloat(formData.base_price_per_kg),
          farmer_id: userId 
        })
      });
      if (!res.ok) throw new Error("Failed to create batch");
      const result = await res.json();
      setCreatedBatch({ ...result, qrData: result.batch_id });
      setFormData({ crop_type: 'Wheat', initial_weight: '', base_price_per_kg: '' });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById("batch-qrcode");
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    let downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `batch_${createdBatch.batch_id}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="card-hd">
        <div className="card-hd-title">Create New Batch</div>
      </div>
      <div className="card-body">
        {createdBatch ? (
          <div className="qr-result" style={{ textAlign: 'center', padding: '20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <h3 style={{ color: 'var(--green)', marginBottom: '10px' }}>✓ Batch Registered!</h3>
            <div style={{ padding: '16px', background: 'white', display: 'inline-block', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <QRCodeCanvas id="batch-qrcode" value={createdBatch.qrData} size={200} level="H" />
            </div>
            <p style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px', color: 'var(--text2)' }}>Batch ID</p>
            <p style={{ fontFamily: 'monospace', fontSize: '12px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border2)', padding: '6px', borderRadius: '6px', userSelect: 'all' }}>
              {createdBatch.batch_id}
            </p>
            <div className="btn-group" style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
              <button type="button" className="submit-btn" style={{ background: 'var(--bg3)', color: 'var(--text)' }} onClick={() => setCreatedBatch(null)}>Create Another</button>
              <button type="button" className="submit-btn" onClick={handleDownloadQR}>Download QR Code</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="field">
              <label className="field-label">Crop Type <span className="field-req">*</span></label>
              <select className="field-select" value={formData.crop_type} onChange={e => setFormData({...formData, crop_type: e.target.value})} required>
                <option value="Wheat">Wheat</option>
                <option value="Rice">Rice</option>
                <option value="Corn">Corn</option>
                <option value="Soybean">Soybean</option>
                <option value="Cotton">Cotton</option>
              </select>
            </div>
            <div className="two-col">
              <div className="field">
                <label className="field-label">Initial Weight (kg) <span className="field-req">*</span></label>
                <input className="field-input" type="number" min="1" placeholder="0" value={formData.initial_weight} onChange={e => setFormData({...formData, initial_weight: e.target.value})} required />
              </div>
              <div className="field">
                <label className="field-label">Asking Price (₹/kg) <span className="field-req">*</span></label>
                <input className="field-input" type="number" step="0.01" placeholder="0.00" value={formData.base_price_per_kg} onChange={e => setFormData({...formData, base_price_per_kg: e.target.value})} required />
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Processing...' : 'Register Batch & Generate QR'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
