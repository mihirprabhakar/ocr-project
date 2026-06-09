import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import './Reports.css';

const StatBox = ({ label, value, color, icon }) => (
  <div className="report-stat" style={{ '--c': color }}>
    <div className="report-stat-icon">{icon}</div>
    <div>
      <p className="report-stat-value">{value}</p>
      <p className="report-stat-label">{label}</p>
    </div>
  </div>
);

export default function Reports() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/scan/reports/stats')
      .then(({ data }) => setStats(data.data))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    const { data } = await api.get('/scan/reports/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ocr_report.json'; a.click();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const successRate = stats?.total > 0 ? ((stats.pushed / stats.total) * 100).toFixed(0) : 0;

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p>Overview of all OCR scanning activity</p>
        </div>
        <button className="btn btn-ghost" onClick={handleExport}>⬇ Export All Data</button>
      </div>

      {/* Stats */}
      <div className="report-stats-grid">
        <StatBox label="Total Scans" value={stats?.total || 0} color="#4f8ef7" icon="▦" />
        <StatBox label="Pushed to SAP" value={stats?.pushed || 0} color="#10d68e" icon="⬆" />
        <StatBox label="Failed" value={stats?.failed || 0} color="#ef4444" icon="✕" />
        <StatBox label="In Progress" value={stats?.processing || 0} color="#f59e0b" icon="◷" />
        <StatBox label="Success Rate" value={`${successRate}%`} color="#8b5cf6" icon="◎" />
      </div>

      <div className="reports-layout">
        {/* Template breakdown */}
        <div className="card">
          <h3 className="section-title">Scans by Template</h3>
          {stats?.byTemplate?.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}><p>No data yet.</p></div>
          ) : (
            <div className="template-breakdown">
              {stats?.byTemplate?.map((t, i) => {
                const pct = stats.total > 0 ? (t.count / stats.total) * 100 : 0;
                return (
                  <div key={i} className="breakdown-row">
                    <div className="breakdown-label">
                      <span className="breakdown-name">{t.name}</span>
                      <span className="breakdown-count">{t.count} scans</span>
                    </div>
                    <div className="breakdown-bar-track">
                      <div className="breakdown-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="breakdown-pct">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent jobs */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 className="section-title" style={{ margin: 0 }}>Recent Scans</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/ocr/history')}>View All →</button>
          </div>
          <div className="recent-jobs">
            {stats?.recentJobs?.map(job => (
              <div key={job._id} className="recent-job" onClick={() => navigate(`/ocr/process/${job._id}`)}>
                <div className="recent-job-left">
                  <code className="job-id-sm">{job.jobId?.slice(-8)}</code>
                  <div>
                    <p className="recent-job-template">{job.template?.name || '—'}</p>
                    <p className="recent-job-user">{job.user?.name}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {job.ocrConfidence > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{job.ocrConfidence.toFixed(0)}%</span>}
                  <span className="status-dot" style={{ background: job.status === 'pushed' || job.status === 'verified' ? 'var(--success)' : job.status === 'failed' ? 'var(--danger)' : 'var(--warning)' }} />
                </div>
              </div>
            ))}
            {!stats?.recentJobs?.length && (
              <div className="empty-state" style={{ padding: '30px 0' }}><p>No scans yet.</p></div>
            )}
          </div>
        </div>
      </div>

      {/* SAP Push Summary */}
      <div className="card sap-summary">
        <h3 className="section-title">SAP Integration Summary</h3>
        <div className="sap-stats">
          <div className="sap-stat">
            <div className="sap-stat-value" style={{ color: 'var(--success)' }}>{stats?.pushed || 0}</div>
            <div className="sap-stat-label">Successfully Pushed</div>
          </div>
          <div className="sap-divider" />
          <div className="sap-stat">
            <div className="sap-stat-value" style={{ color: 'var(--danger)' }}>{stats?.failed || 0}</div>
            <div className="sap-stat-label">Push Failed</div>
          </div>
          <div className="sap-divider" />
          <div className="sap-stat">
            <div className="sap-stat-value" style={{ color: 'var(--warning)' }}>{(stats?.total || 0) - (stats?.pushed || 0) - (stats?.failed || 0)}</div>
            <div className="sap-stat-label">Pending Push</div>
          </div>
          <div className="sap-divider" />
          <div className="sap-stat">
            <div className="sap-stat-value" style={{ color: 'var(--accent)' }}>{successRate}%</div>
            <div className="sap-stat-label">Overall Success Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
