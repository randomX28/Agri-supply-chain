import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../AuthContext';
import { API_BASE } from '../../../apiConfig';

export default function Marketplace() {
  const { userId, getAuthHeaders } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchBatches() {
      try {
        const headers = await getAuthHeaders();
        // Since the backend doesn't have a marketplace route yet, 
        // we'll fetch all batches and mock filter them if needed.
        const res = await fetch(`${API_BASE}/api/marketplace/`, { headers });
        if (!res.ok) throw new Error("Failed to load inventory");
        const data = await res.json();
        if (!cancelled) {
          // Assume marketplace shows only those that exist
          setBatches(Array.isArray(data) ? data : (data.batches || []));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchBatches();
    return () => { cancelled = true; };
  }, [getAuthHeaders]);

  const addToCart = (batch) => {
    const existing = cart.find(i => i.batch_id === batch.batch_id);
    if (existing) {
      alert("Batch is already in your cart.");
      return;
    }
    setCart([...cart, { ...batch, orderQty: batch.initial_weight }]);
    setCartOpen(true);
  };

  const removeFromCart = (id) => setCart(cart.filter(i => i.batch_id !== id));

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty');
    if (!confirm('Proceed to checkout?')) return;

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      let successCount = 0;
      for (const item of cart) {
        const payload = {
          batch_id: item.batch_id,
          buyer_id: userId,
          total_weight: item.orderQty,
          final_price_per_kg: item.base_price_per_kg || 200
        };
        const res = await fetch(`${API_BASE}/api/purchases/`, { method: 'POST', headers, body: JSON.stringify(payload) });
        if (res.ok) successCount++;
      }
      alert(`Successfully purchased ${successCount} out of ${cart.length} batches.`);
      setCart([]);
      setCartOpen(false);
    } catch (e) {
      alert("Checkout failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="marketplace">
      <div className="mp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 className="page-title">Wholesale Marketplace</h2>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Browse verified supply chain inventory</p>
        </div>
        <button className="submit-btn" style={{ width: 'auto', padding: '0 20px' }} onClick={() => setCartOpen(true)}>
          Order Cart ({cart.length})
        </button>
      </div>

      <div className="mp-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {loading ? <p>Loading Marketplace...</p> : batches.length === 0 ? <p>No batches currently listed for sale.</p> :
          batches.map(b => (
            <div className="card" key={b.batch_id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="card-body" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="sc-label" style={{ background: 'var(--green-dim)', color: 'var(--green)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{b.crop_type}</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{b.initial_weight} kg</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '12px 0 16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>{b.seed_variety || 'Standard Variety'}</h3>
                    <p style={{ color: 'var(--text2)', fontSize: 13, margin: 0 }}>From {b.farm_location}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: 18 }}>₹{b.base_price_per_kg}/kg</div>
                  </div>
                </div>
                <div style={{ background: 'var(--bg)', padding: '8px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--text)' }}>
                  ID: {b.batch_id}
                </div>
              </div>
              <div className="card-footer" style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 10 }}>
                <button className="submit-btn" style={{ flex: 1 }} onClick={() => addToCart(b)}>Add to Order</button>
                <Link to={`/traceability/${b.batch_id}`} className="submit-btn" style={{ width: 'auto', background: 'var(--bg3)', color: 'var(--text)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  🔍 Trace
                </Link>
              </div>
            </div>
          ))
        }
      </div>

      {cartOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
          <div className="cart-sidebar" style={{ width: 400, background: 'var(--bg2)', borderLeft: '1px solid var(--border)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 30px rgba(0,0,0,0.5)' }}>
            <div className="cart-header" style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text)' }}>Your Order</h3>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            <div className="cart-body" style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
              {cart.length === 0 ? <p style={{ color: 'var(--text3)' }}>Your cart is empty.</p> :
                cart.map(item => (
                  <div key={item.batch_id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--border2)', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{item.crop_type} ({item.seed_variety})</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>ID: {item.batch_id.slice(0, 8)}...</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{item.orderQty} kg</div>
                      <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>₹{item.base_price_per_kg}/kg</div>
                      <button onClick={() => removeFromCart(item.batch_id)} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 12, padding: 0, cursor: 'pointer', marginTop: 4 }}>Remove</button>
                    </div>
                  </div>
                ))
              }
            </div>
            {cart.length > 0 && (
              <div className="cart-footer" style={{ padding: 20, borderTop: '1px solid var(--border)' }}>
                <button className="submit-btn" onClick={handleCheckout} disabled={loading}>
                  {loading ? 'Processing...' : 'Confirm Checkout'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
