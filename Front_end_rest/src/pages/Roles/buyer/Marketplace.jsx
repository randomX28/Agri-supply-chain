import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../AuthContext';
import { API_BASE } from '../../../apiConfig';

export default function Marketplace() {
  const { userId, getAuthHeaders } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [selectedBatchToTrace, setSelectedBatchToTrace] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchBatches() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/marketplace/`, { headers });
        if (!res.ok) throw new Error("Failed to load inventory");
        const data = await res.json();
        if (!cancelled) {
          const batchList = Array.isArray(data) ? data : (data.results || data.batches || []);
          setBatches(batchList);
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

  // Handle Search & Sort
  const filteredAndSortedBatches = useMemo(() => {
    let list = [...batches];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(b => 
        (b.crop_type || '').toLowerCase().includes(term) ||
        (b.farmer_name || '').toLowerCase().includes(term) ||
        (b.batch_id || '').toLowerCase().includes(term)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'price-asc') return (a.base_price_per_kg || 0) - (b.base_price_per_kg || 0);
      if (sortBy === 'price-desc') return (b.base_price_per_kg || 0) - (a.base_price_per_kg || 0);
      if (sortBy === 'quality-desc') return (b.quality_score || 0) - (a.quality_score || 0);
      if (sortBy === 'carbon-asc') return (a.total_carbon_footprint || 0) - (b.total_carbon_footprint || 0);
      return 0;
    });
    return list;
  }, [batches, searchTerm, sortBy]);

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

      <div style={{ display: 'flex', gap: 15, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg2)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search crops or farmers..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>Sort by:</label>
          <select 
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            <option value="newest">Latest arrivals</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="quality-desc">Highest Quality Score</option>
            <option value="carbon-asc">Lowest Carbon Footprint</option>
          </select>
        </div>
      </div>

      <div className="mp-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {loading ? <p>Loading Marketplace...</p> : filteredAndSortedBatches.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', background: 'var(--bg2)', borderRadius: 14, border: '1px dotted var(--border)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔦</div>
            <h3 style={{ color: 'var(--text)' }}>No batches match your search</h3>
            <p style={{ color: 'var(--text3)' }}>Try adjusting your filters or searching for a different crop type.</p>
            <button className="submit-btn" style={{ width: 'auto', marginTop: 16, background: 'var(--bg3)', color: 'var(--text)' }} onClick={() => { setSearchTerm(''); setSortBy('newest'); }}>Clear all filters</button>
          </div>
        ) :
          filteredAndSortedBatches.map(b => (
            <div className="card" key={b.batch_id} style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
              <div className="card-body" style={{ flex: 1, padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className="sc-label" style={{ background: 'var(--green-dim)', color: 'var(--green)', padding: '2px 10px', borderRadius: 6, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{b.crop_type}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>₹{b.base_price_per_kg}/kg</span>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text)', fontWeight: 700 }}>{b.farmer_name || 'Verified Producer'}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>📍 {b.farm_location || 'Registered Farm'}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 0', padding: '12px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Internal Grade</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--purple)' }}>{b.grade || 'A'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quality Score</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>{b.quality_score || 0}/100</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2', borderTop: '1px solid var(--border2)', paddingTop: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Carbon Footprint</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--orange)' }}>🌱 {b.total_carbon_footprint ? b.total_carbon_footprint.toFixed(2) : '0.00'} kg CO₂</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)' }}>
                  <span>Weight: <strong>{b.initial_weight} kg</strong></span>
                  <span style={{ fontFamily: 'monospace', opacity: 0.6 }}>ID: {b.batch_id.slice(0, 8)}</span>
                </div>
              </div>

              <div className="card-footer" style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button className="submit-btn" style={{ gridColumn: 'span 2' }} onClick={() => addToCart(b)}>🛒 Add to Order</button>
                <button 
                  onClick={() => setSelectedBatchToTrace(b)} 
                  className="submit-btn" 
                  style={{ background: 'var(--bg3)', color: 'var(--text)', fontSize: 12 }}
                >
                  🔍 Trace Journey
                </button>
                {b.certificate_url && b.certificate_url !== 'none' ? (
                  <a href={b.certificate_url} target="_blank" rel="noopener noreferrer" className="submit_btn" style={{ background: 'var(--bg3)', color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '1px solid var(--border2)', borderRadius: 8, fontWeight: 600 }}>
                    📄 Certificate
                  </a>
                ) : (
                  <button className="submit-btn" disabled style={{ background: 'var(--bg)', color: 'var(--text3)', fontSize: 11, opacity: 0.6 }}>No Certificate</button>
                )}
              </div>
            </div>
          ))
        }
      </div>

      {/* Trace Modal Overlay */}
      {selectedBatchToTrace && (
        <TraceModal 
          batch={selectedBatchToTrace} 
          onClose={() => setSelectedBatchToTrace(null)} 
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {cartOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
          <div className="cart-sidebar" style={{ width: 400, background: 'var(--bg2)', borderLeft: '1px solid var(--border)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 30px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <div className="cart-header" style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text)' }}>Your Order</h3>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            <div className="cart-body" style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
              {cart.length === 0 ? <p style={{ color: 'var(--text3)' }}>Your cart is empty.</p> :
                cart.map(item => (
                  <div key={item.batch_id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--border2)', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{item.crop_type}</div>
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

const CATEGORY_STYLE = {
  'Creation': { icon: '🚜', color: 'var(--green)' },
  'Transit Start': { icon: '🚛', color: 'var(--orange)' },
  'Transit End': { icon: '🏁', color: 'var(--orange)' },
  'Storage Check-In': { icon: '🌡️', color: 'var(--purple)' },
  'Storage Check-Out': { icon: '📦', color: 'var(--purple)' },
  'Inspection': { icon: '🧪', color: 'var(--blue)' },
  'Sale': { icon: '💰', color: 'var(--green)' }
};

function TraceModal({ batch, onClose, getAuthHeaders }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/traceability/${batch.batch_id}`, { headers });
        if (!res.ok) throw new Error("Batch journey not found.");
        const data = await res.json();
        setTimeline(data.timeline || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, [batch.batch_id, getAuthHeaders]);

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)' }}>
      <div className="card" style={{ maxWidth: 800, width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div className="card-hd" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Tracing Journey</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Batch #{batch.batch_id.slice(0, 8)} • {batch.crop_type}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
        </div>
        
        <div className="card-body" style={{ padding: '24px', overflowY: 'auto', flex: 1, background: 'var(--bg)' }}>
          {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading journey logs...</div> : 
           error ? <div style={{ color: 'var(--red)', textAlign: 'center', padding: 40 }}>{error}</div> :
           timeline.length === 0 ? <div style={{ textAlign: 'center', padding: 40 }}>No events recorded.</div> : (
            <div className="timeline-container">
              {timeline.map((event, idx) => {
                const style = CATEGORY_STYLE[event.event_category] || { icon: '•', color: 'var(--text3)' };
                return (
                  <div key={idx} style={{ display: 'flex', gap: 20, position: 'relative' }}>
                    {idx !== timeline.length - 1 && (
                      <div style={{ position: 'absolute', left: 17, top: 34, bottom: -24, width: 2, background: 'var(--border2)' }}></div>
                    )}
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: style.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, zIndex: 2, flexShrink: 0 }}>
                      {style.icon}
                    </div>
                    <div style={{ flex: 1, background: 'var(--bg2)', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{event.event_category}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{event.details}</div>
                    </div>
                  </div>
                );
              })}
            </div>
           )
          }
        </div>
        <div className="card-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 11, color: 'var(--text3)' }}>
          🔒 Blockchain Secured & Verified Journey
        </div>
      </div>
    </div>
  );
}
