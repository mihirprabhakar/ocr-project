import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import './History.css';

const STATUS_COLORS = {
  uploaded: { bg: 'rgba(79,142,247,0.12)', color: '#4f8ef7' },
  processing: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  extracted: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  mapped: { bg: 'rgba(79,142,247,0.12)', color: '#4f8ef7' },
  verified: { bg: 'rgba(16,214,142,0.12)', color: '#10d68e' },
  pushed: { bg: 'rgba(16,214,142,0.12)', color: '#10d68e' },
  failed: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

export default function History() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [filters, setFilters] = useState({ status: '', templateId: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: p, limit: 15, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
    api.get(`/scan?${params}`)
      .then(({ data }) => { setJobs(data.data); setTotalPages(data.pages); setTotal(data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/templates').then(({ data }) => setTemplates(data.data));
  }, []);

  useEffect(() => { load(page); }, [page]);

  const handleFilter = () => { setPage(1); load(1); };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this scan job?')) return;
    await api.delete(`/scan/${id}`);
    load(page);
  };

  const handleExport = async () => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
    const { data } = await api.get(`/scan/reports/export?${params}`);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'scan_export.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="history-page">
      <div className="page-header">
        <div>
          <h1>Scan History</h1>
          <p>{total} total scan jobs</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleExport}>⬇ Export JSON</button>
          <button className="btn btn-primary" onClick={() => navigate('/ocr/upload')}>+ New Scan</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card filter-bar">
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} style={{ flex: 1, minWidth: 140 }}>
          <option value="">All Statuses</option>
          {['uploaded', 'processing', 'extracted', 'mapped', 'verified', 'pushed', 'failed'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select value={filters.templateId} onChange={e => setFilters({ ...filters, templateId: e.target.value })} style={{ flex: 1, minWidth: 160 }}>
          <option value="">All Templates</option>
          {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} style={{ flex: 1 }} title="From date" />
        <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} style={{ flex: 1 }} title="To date" />
        <button className="btn btn-primary" onClick={handleFilter}>Filter</button>
        <button className="btn btn-ghost" onClick={() => { setFilters({ status: '', templateId: '', from: '', to: '' }); setPage(1); setTimeout(() => load(1), 100); }}>Reset</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <div className="icon">▦</div>
          <p>No scan jobs found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/ocr/upload')}>+ Start First Scan</button>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>File</th>
                    <th>Template</th>
                    <th>User</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job._id} className="job-row" onClick={() => navigate(`/ocr/process/${job._id}`)}>
                      <td><code className="job-id">{job.jobId}</code></td>
                      <td>
                        <div className="file-cell">
                          <span>{job.fileType === 'pdf' ? '📄' : '🖼️'}</span>
                          <span className="file-cell-name">{job.originalFileName}</span>
                        </div>
                      </td>
                      <td>{job.template?.name || '—'}</td>
                      <td>{job.user?.name || '—'}</td>
                      <td>
                        {job.ocrConfidence > 0 ? (
                          <div className="mini-confidence">
                            <div className="mini-bar">
                              <div style={{ width: `${job.ocrConfidence}%`, height: '100%', background: job.ocrConfidence > 70 ? 'var(--success)' : job.ocrConfidence > 40 ? 'var(--warning)' : 'var(--danger)', borderRadius: 3 }} />
                            </div>
                            <span>{job.ocrConfidence.toFixed(0)}%</span>
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        <span className="status-pill" style={STATUS_COLORS[job.status] || {}}>
                          {job.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(job.createdAt)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/ocr/process/${job._id}`)}>Open</button>
                          <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(job._id, e)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
