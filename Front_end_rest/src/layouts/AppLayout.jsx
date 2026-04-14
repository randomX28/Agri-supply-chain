import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { ROLES } from '../constants';

const normalizeRole = (role) => {
  if (role === 'transport' || role === 'transporter') return 'transporter';
  if (role === 'warehouse' || role === 'warehouse_manager') return 'warehouse_manager';
  return role;
};

export default function AppLayout() {
  const { isAuthenticated, role, fullName, email, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const normalizedRole = normalizeRole(role);
  const currentRole = ROLES[normalizedRole] || ROLES['farmer'];
  const displayName = fullName || email || 'User';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Extract the title for the header based on the active route
  const activeNavItem = currentRole.nav.find(n => location.pathname.includes(n.path)) || currentRole.nav[0];

  return (
    <div id="appShell" className="app-shell" data-role={normalizedRole}>
      <aside className="sidebar">
        <div className="sb-top">
          <div className="sb-logo">
            <svg viewBox="0 0 36 36" width="22" height="22">
              <polygon points="18,2 34,10 34,26 18,34 2,26 2,10" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="18" cy="18" r="3.5" fill="currentColor" />
            </svg>
            AgriChain
          </div>

          <div className="sb-user">
            <div className="sb-avatar">{displayName.charAt(0).toUpperCase()}</div>
            <div className="sb-userinfo">
              <div className="sb-uid">{displayName}</div>
              <div className="sb-role-tag">{currentRole.label}</div>
            </div>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-nav-group">
            <div className="sb-nav-group-label">Menu</div>
            {currentRole.nav.map(item => (
              <NavLink 
                key={item.id} 
                to={item.path} 
                className={({ isActive }) => `sb-nav-btn ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>{item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sb-bottom">
          <button className="sb-logout" onClick={handleLogout}>⎋ Sign Out</button>
          <div className="sb-api-status">
            <span className="sb-dot"></span>
            <span className="sb-api-text">API: Node Env</span>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-bar">
          <button className="menu-toggle">☰</button>
          <div className="ab-title">{activeNavItem.label}</div>
          <div className="ab-date">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </header>
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
