import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../AuthContext';
import { API_BASE } from '../../../apiConfig';

export default function PurchaseHistory() {
  const { userId, getAuthHeaders } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchPurchases() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/purchases/buyer/${userId}`, { headers });
        if (!res.ok) throw new Error("Failed to load purchase history");
        const data = await res.json();
        
        if (!cancelled) {
          // The API returns { buyer_purchase_history: [...] }
          setPurchases(data.buyer_purchase_history || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPurchases();
    return () => { cancelled = true; };
  }, [userId, getAuthHeaders]);

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="purchase-history">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h2 className="page-title">📜 Past Purchases</h2>
        <p className="page-subtitle">Track your procurement history and costs</p>
      </div>

      {loading ? (
        <div className="empty" style={{ padding: 40 }}>Loading history...</div>
      ) : purchases.length === 0 ? (
        <div className="empty" style={{ padding: 60, textAlign: 'center', background: 'var(--bg2)', borderRadius: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <h3 style={{ color: 'var(--text)' }}>No purchases yet</h3>
          <p style={{ color: 'var(--text3)' }}>Once you buy batches from the marketplace, they will appear here.</p>
        </div>
      ) : (
        <div className="purchase-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {purchases.map((p, idx) => (
            <div className="card" key={p.id || idx} style={{ border: '1px solid var(--border)' }}>
              <div className="card-body" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', background: 'var(--green-dim)', padding: '2px 8px', borderRadius: 4 }}>COMPLETED</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDate(p.purchased_at)}</span>
                </div>
                
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                  Order #{p.batch_id?.slice(0, 8)}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Weight</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{p.total_weight} kg</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Unit Price</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>₹{p.final_price_per_kg}/kg</div>
                  </div>
                </div>

                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>Total Paid</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>₹{p.total_amount?.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
