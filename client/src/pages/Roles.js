import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const PERMISSIONS = [
  { key: 'canScan', label: 'Can Scan Documents' },
  { key: 'canUpload', label: 'Can Upload Files' },
  { key: 'canViewReports', label: 'Can View Reports' },
  { key: 'canManageUsers', label: 'Can Manage Users' },
  { key: 'canManageTemplates', label: 'Can Manage Templates' },
  { key: 'canPushToSAP', label: 'Can Push to SAP' },
  { key: 'canViewAllData', label: 'Can View All Data' },
];

const COLORS = ['#4f8ef7', '#10d68e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const DEFAULT_FORM = {
  name: '', description: '', color: '#4f8ef7',
  permissions: { canScan: false, canUpload: false, canViewReports: false, canManageUsers: false, canManageTemplates: false, canPushToSAP: false, canViewAllData: false },
};

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/roles').then(({ data }) => setRoles(data.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(DEFAULT_FORM); setEditing(null); setError(''); setModal(true); };
  const openEdit = (r) => {
    setForm({ name: r.name, description: r.description || '', color: r.color, permissions: { ...DEFAULT_FORM.permissions, ...r.permissions } });
    setEditing(r._id);
    setError('');
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Role name is required');
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/roles/${editing}`, form);
      else await api.post('/roles', form);
      setModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this role?')) return;
    await api.delete(`/roles/${id}`);
    load();
  };

  const togglePerm = (key) => setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="page-header">
        <div>
          <h1>Role Management</h1>
          <p>Define roles and their permissions for OCR system access</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Role</button>
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        roles.length === 0 ? (
          <div className="empty-state">
            <div className="icon">⬡</div>
            <p>No roles yet. Create your first role to get started.</p>
            <button className="btn btn-primary" onClick={openCreate}>+ Create Role</button>
          </div>
        ) : (
          <div className="roles-grid">
            {roles.map((role) => (
              <div className="role-card card" key={role._id}>
                <div className="role-card-header">
                  <div className="role-color-dot" style={{ background: role.color }} />
                  <h3 className="role-name">{role.name}</h3>
                  <span className={`badge ${role.isActive ? 'badge-active' : 'badge-inactive'}`}>
                    {role.isActive ? 'Active' : 'Off'}
                  </span>
                </div>
                {role.description && <p className="role-desc">{role.description}</p>}
                <div className="role-perms">
                  {PERMISSIONS.filter(p => role.permissions?.[p.key]).map(p => (
                    <span key={p.key} className="perm-tag">{p.label}</span>
                  ))}
                  {!PERMISSIONS.some(p => role.permissions?.[p.key]) && <span className="no-perms">No permissions assigned</span>}
                </div>
                <div className="role-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(role)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(role._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {modal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editing ? 'Edit Role' : 'Create Role'}</h2>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>

            {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Role Name *</label>
                <input placeholder="e.g. FINANCE" value={form.name} onChange={e => setForm({ ...form, name: e.target.value.toUpperCase() })} />
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div className="color-picker">
                  {COLORS.map(c => (
                    <div key={c} className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                      style={{ background: c }} onClick={() => setForm({ ...form, color: c })} />
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input placeholder="Brief description of this role" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Permissions</label>
              <div className="checkbox-group">
                {PERMISSIONS.map(p => (
                  <div key={p.key} className="checkbox-item">
                    <input type="checkbox" id={p.key} checked={form.permissions[p.key]} onChange={() => togglePerm(p.key)} />
                    <label htmlFor={p.key}>{p.label}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving…</> : (editing ? 'Update Role' : 'Create Role')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        .role-card { display: flex; flex-direction: column; gap: 12px; }
        .role-card-header { display: flex; align-items: center; gap: 10px; }
        .role-color-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
        .role-name { font-size: 15px; flex: 1; }
        .role-desc { color: var(--text-muted); font-size: 12px; }
        .role-perms { display: flex; flex-wrap: wrap; gap: 6px; min-height: 28px; }
        .perm-tag { background: var(--bg-hover); color: var(--text-secondary); font-size: 11px; padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border); }
        .no-perms { color: var(--text-muted); font-size: 12px; font-style: italic; }
        .role-actions { display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid var(--border); margin-top: auto; }
        .color-picker { display: flex; gap: 8px; padding: 8px 0; }
        .color-swatch { width: 24px; height: 24px; border-radius: 50%; cursor: pointer; transition: transform 0.15s; border: 2px solid transparent; }
        .color-swatch:hover { transform: scale(1.2); }
        .color-swatch.selected { border-color: white; transform: scale(1.15); box-shadow: 0 0 0 2px var(--bg-card); }
      `}</style>
    </div>
  );
}
