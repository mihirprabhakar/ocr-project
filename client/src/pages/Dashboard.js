import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './Dashboard.css';

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="stat-card" style={{ '--accent-color': color }}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-body">
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.isAdmin) {
      api.get('/dashboard/stats')
        .then(({ data }) => setStats(data.data))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  return (
    <div className="dashboard">
      <div className="welcome-header">
        <div>
          <h1>Good day, {user?.name?.split(' ')[0]} 👋</h1>
          <p>Here's what's happening in your OCR system today.</p>
        </div>
        <div className="welcome-badge">
          {user?.isAdmin ? '⬡ Administrator' : `◈ ${user?.role?.name || 'User'}`}
        </div>
      </div>

      {user?.isAdmin && (
        <>
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <>
              <div className="stats-grid">
                <StatCard icon="◈" label="Total Users" value={stats?.totalUsers} sub={`${stats?.activeUsers} active`} color="#4f8ef7" />
                <StatCard icon="⬡" label="Active Roles" value={stats?.totalRoles} color="#10d68e" />
                <StatCard icon="▤" label="Templates" value={stats?.totalTemplates} color="#f59e0b" />
                <StatCard icon="✕" label="Inactive Users" value={stats?.inactiveUsers} color="#ef4444" />
              </div>

              <div className="dashboard-section">
                <h2 className="section-title">Recent Users</h2>
                <div className="card">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats?.recentUsers?.map((u) => (
                          <tr key={u._id}>
                            <td>
                              <div className="user-cell">
                                <div className="mini-avatar">{u.name.charAt(0)}</div>
                                {u.name}
                              </div>
                            </td>
                            <td>{u.email}</td>
                            <td>
                              {u.role ? (
                                <span className="tag" style={{ background: `${u.role.color}18`, color: u.role.color }}>
                                  {u.role.name}
                                </span>
                              ) : <span className="text-muted">—</span>}
                            </td>
                            <td>
                              <span className={`badge ${u.isActive ? 'badge-active' : 'badge-inactive'}`}>
                                {u.isActive ? '● Active' : '● Inactive'}
                              </span>
                            </td>
                            <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {!user?.isAdmin && (
        <div className="user-dashboard">
          <div className="card info-card">
            <h2>Your Account</h2>
            <div className="info-row"><span>Email</span><strong>{user?.email}</strong></div>
            <div className="info-row"><span>Role</span><strong>{user?.role?.name || 'Not assigned'}</strong></div>
            <div className="info-row"><span>Templates</span><strong>{user?.templates?.length || 0} assigned</strong></div>
            <div className="info-row"><span>Status</span>
              <span className={`badge ${user?.isActive ? 'badge-active' : 'badge-inactive'}`}>
                {user?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          {user?.templates?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Your Templates</h3>
              {user.templates.map(t => (
                <div key={t._id} className="template-row">
                  <span className="nav-icon">▤</span>
                  <span>{t.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
