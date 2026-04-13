export const ROLES = {
  farmer: {
    label: 'Farmer',
    icon: '🌱',
    color: '#84cc16',
    nav: [
      { id: 'dashboard', path: '/dashboard', label: 'Overview', icon: '⬡' },
      { id: 'create-batch', path: '/farmer/create-batch', label: 'Create Batch', icon: '＋' },
      { id: 'history', path: '/history', label: 'My Batches', icon: '◫' },
    ]
  },
  warehouse_manager: {
    label: 'Warehouse Manager',
    icon: '🏭',
    color: '#38bdf8',
    nav: [
      { id: 'dashboard', path: '/dashboard', label: 'Overview', icon: '⬡' },
      { id: 'checkin', path: '/warehouse/check-in', label: 'Check In', icon: '⤵' },
      { id: 'checkout', path: '/warehouse/check-out', label: 'Check Out', icon: '⤴' },
      { id: 'history', path: '/history', label: 'Storage Log', icon: '◫' },
    ]
  },
  transporter: {
    label: 'Transporter',
    icon: '🚚',
    color: '#fb923c',
    nav: [
      { id: 'dashboard', path: '/dashboard', label: 'Overview', icon: '⬡' },
      { id: 'log-event', path: '/transport/log-event', label: 'Log Event', icon: '◈' },
      { id: 'history', path: '/history', label: 'All Events', icon: '◫' },
    ]
  },
  inspector: {
    label: 'Quality Inspector',
    icon: '🔬',
    color: '#a78bfa',
    nav: [
      { id: 'dashboard', path: '/dashboard', label: 'Overview', icon: '⬡' },
      { id: 'quality', path: '/inspector/quality-check', label: 'Quality Check', icon: '✦' },
      { id: 'history', path: '/history', label: 'Inspections', icon: '◫' },
    ]
  },
  buyer: {
    label: 'Buyer',
    icon: '🛒',
    color: '#fbbf24',
    nav: [
      { id: 'dashboard', path: '/dashboard', label: 'Overview', icon: '⬡' },
      { id: 'marketplace', path: '/buyer/marketplace', label: 'Marketplace', icon: '⬡' },
      { id: 'purchases', path: '/buyer/purchases', label: 'Past Purchases', icon: '📜' },
    ]
  },
  admin: {
    label: 'Platform Admin',
    icon: '👑',
    color: '#f43f5e',
    nav: [
      { id: 'admin', path: '/admin', label: 'Admin Dashboard', icon: '📊' },
      { id: 'traceability', path: '/traceability', label: 'Traceability', icon: '🔍' },
    ]
  }
};
