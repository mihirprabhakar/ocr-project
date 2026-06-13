import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const NAV = [
  { to: '/dashboard', icon: '▦', label: 'Dashboard' },
  { to: '/roles', icon: '⬡', label: 'Roles', adminOnly: true },
  { to: '/users', icon: '◈', label: 'Users', adminOnly: true },
  { to: '/templates', icon: '▤', label: 'Templates' },
  { divider: true, label: 'OCR' },
  { to: '/ocr/upload', icon: '⬆', label: 'New Scan', permission: 'canScan' },
  { to: '/ocr/history', icon: '◷', label: 'Scan History', permission: 'canScan' },
  { to: '/ocr/reports', icon: '◎', label: 'Reports', permission: 'canViewReports' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="logo">
            <span className="logo-icon">◉</span>
            {!collapsed && <span className="logo-text">OCR<strong>Admin</strong></span>}
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV.filter(n => {
            if (n.adminOnly && !user?.isAdmin) return false;
            if (n.permission && !user?.isAdmin && !user?.role?.permissions?.[n.permission]) return false;
            return true;
          }).map((n, i) =>
            n.divider ? (
              !collapsed && <div key={i} className="nav-divider"><span>{n.label}</span></div>
            ) : (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">{n.icon}</span>
                {!collapsed && <span className="nav-label">{n.label}</span>}
              </NavLink>
            )
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-info">
            <div className="avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            {!collapsed && (
              <div className="user-details">
                <p className="user-name">{user?.name}</p>
                <p className="user-role">{user?.isAdmin ? 'Administrator' : user?.role?.name || 'User'}</p>
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">⏏</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}