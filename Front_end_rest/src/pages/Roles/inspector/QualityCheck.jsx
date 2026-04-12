import React, { useState } from 'react';
import { useAuth } from '../../../AuthContext';
import { API_BASE } from '../../../apiConfig';
import ScannerModal from '../../../components/Shared/ScannerModal';

export default function QualityCheck() {
  const { userId, getAuthHeaders } = useAuth();
  const [formData, setFormData] = useState({ batch_id: '', grade: 'A', moisture_percentage: '', contamination_flag: false, notes: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = (data) => {
    setFormData({ ...formData, batch_id: data });
    setShowScanner(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      let finalCertUrl = ""; // Default to empty if no file

      // 1. Upload file if it exists
      if (file) {
        console.log("Starting certificate upload for batch:", formData.batch_id);
        const formDataUpload = new FormData();
        formDataUpload.append('batch_id', formData.batch_id);
        formDataUpload.append('file', file);

        const uploadRes = await fetch(`${API_BASE}/api/upload-certificate`, {
          method: 'POST',
          headers: {
            'Authorization': authHeaders['Authorization']
          },
          body: formDataUpload
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error("File upload failed: " + (errorData.detail || "Unknown error"));
        }

        const uploadData = await uploadRes.json();
        finalCertUrl = uploadData.certificate_url;
        console.log("Upload successful! URL:", finalCertUrl);
      }

      // 2. Submit quality report with the REAL URL
      const payload = { 
        ...formData, 
        inspector_id: userId,
        moisture_percentage: formData.moisture_percentage ? parseFloat(formData.moisture_percentage) : 0,
        contamination_flag: formData.contamination_flag,
        certificate_url: finalCertUrl || "none"
      };
      
      const res = await fetch(`${API_BASE}/api/quality/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to submit report");
      alert("Quality Inspection Report submitted and logged to blockchain successfully!");
      setFormData({ batch_id: '', grade: 'A', moisture_percentage: '', contamination_flag: false, notes: '' });
      setFile(null);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
      <div className="card-hd">
        <div className="card-hd-title">Publish Quality Report</div>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          <div className="two-col">
            <div className="field">
              <label className="field-label">Quality Grade</label>
              <select className="field-select" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})}>
                <option value="A">Grade A (Premium)</option>
                <option value="B">Grade B (Good)</option>
                <option value="C">Grade C (Average)</option>
                <option value="D">Grade D (Substandard)</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Moisture Content (%) <span className="field-req">*</span></label>
              <input className="field-input" type="number" step="0.1" placeholder="e.g. 12.5" value={formData.moisture_percentage} onChange={e => setFormData({...formData, moisture_percentage: e.target.value})} required />
            </div>
          </div>
          <div className="field">
            <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={formData.contamination_flag} 
                onChange={e => setFormData({...formData, contamination_flag: e.target.checked})} 
                style={{ width: '18px', height: '18px' }}
              />
              <span>High Contamination Risk Detected</span>
            </label>
          </div>
          <div className="field">
            <label className="field-label">Inspector Notes & Laboratory Findings</label>
            <textarea className="field-input" rows="4" placeholder="Detailed report..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
          </div>
          <div className="field">
            <label className="field-label">Upload Certificate (PDF / Image)</label>
            <input className="field-input" type="file" style={{ padding: '8px' }} onChange={e => setFile(e.target.files[0])} />
          </div>
          <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Submitting to Ledgers...' : 'Sign & Submit Inspection'}
          </button>
        </form>
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
