import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const DEFAULT_FORM = { name: '', email: '', password: '', department: '', phone: '', role: '', templates: [], isActive: true, isAdmin: false };

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // full user object
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = () =>
    Promise.all([api.get('/users'), api.get('/roles'), api.get('/templates')])
      .then(([u, r, t]) => { setUsers(u.data.data); setRoles(r.data.data); setTemplates(t.data.data); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(DEFAULT_FORM); setEditingUser(null); setError(''); setModal(true); };

  const openEdit = (u) => {
    // Block editing Super Admin if you are not the Super Admin yourself
    if (u.isSuperAdmin && currentUser._id !== u._id) {
      alert('The Super Admin account can only be edited by themselves.');
      return;
    }
    setForm({
      name: u.name, email: u.email, password: '',
      department: u.department || '', phone: u.phone || '',
      role: u.role?._id || '',
      templates: u.templates?.map(t => t._id) || [],
      isActive: u.isActive,
      isAdmin: u.isAdmin,
    });
    setEditingUser(u);
    setError('');
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) return setError('Name and email are required');
    if (!editingUser && !form.password) return setError('Password is required for new users');
    setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editingUser) await api.put(`/users/${editingUser._id}`, payload);
      else await api.post('/users', payload);
      setModal(false); load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (u) => {
    if (u.isSuperAdmin) { alert('The Super Admin account cannot be deleted.'); return; }
    if (u._id === currentUser._id) { alert('You cannot delete your own account.'); return; }
    if (!window.confirm(`Delete user "${u.name}"?`)) return;
    try {
      await api.delete(`/users/${u._id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const toggleTemplate = (id) => setForm(f => ({
    ...f, templates: f.templates.includes(id) ? f.templates.filter(t => t !== id) : [...f.templates, id]
  }));

  // Determine if admin/active checkboxes should be disabled in the modal
  const isSuperAdminTarget = editingUser?.isSuperAdmin;
  const isEditingSelf = editingUser?._id === currentUser?._id;

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Create users, assign roles and map templates</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New User</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <input placeholder="Search users by name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        users.length === 0 ? (
          <div className="empty-state">
            <div className="icon">◈</div>
            <p>No users yet.</p>
            <button className="btn btn-primary" onClick={openCreate}>+ Create User</button>
          </div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Templates</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${u.role?.color || '#4f8ef7'}, #7c3aed)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0 }}>
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.name}</span>
                              {u.isSuperAdmin && (
                                <span title="Super Admin — protected" style={{ fontSize: 11, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '1px 7px', borderRadius: 10, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.04em' }}>
                                  ★ SUPER
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {u.role ? <span className="tag" style={{ background: `${u.role.color}18`, color: u.role.color }}>{u.role.name}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        {u.isAdmin && <span className="tag" style={{ marginLeft: 4 }}>ADMIN</span>}
                      </td>
                      <td>{u.templates?.length > 0 ? u.templates.map(t => <span key={t._id} className="tag" style={{ marginRight: 4 }}>{t.name}</span>) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.department || '—'}</td>
                      <td><span className={`badge ${u.isActive ? 'badge-active' : 'badge-inactive'}`}>{u.isActive ? '● Active' : '● Off'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {/* Hide Edit button for Super Admin if you're not them */}
                          {(!u.isSuperAdmin || u._id === currentUser?._id) && (
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>Edit</button>
                          )}
                          {/* Hide Delete for Super Admin and for self */}
                          {!u.isSuperAdmin && u._id !== currentUser?._id && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)}>Del</button>
                          )}
                          {/* Lock icon for protected Super Admin row */}
                          {u.isSuperAdmin && u._id !== currentUser?._id && (
                            <span title="Protected account" style={{ color: 'var(--text-muted)', fontSize: 16, padding: '4px 8px' }}>🔒</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {modal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Create User'}</h2>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>

            {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

            {isSuperAdminTarget && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                ★ This is the Super Admin account. Admin status and account activation cannot be changed.
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" placeholder="john@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{editingUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input placeholder="Finance, Sales…" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input placeholder="+91 99999 99999" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Assign Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="">— No role —</option>
                  {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Assign Templates</label>
              <div className="checkbox-group" style={{ maxHeight: 140, overflowY: 'auto', padding: '8px 0' }}>
                {templates.map(t => (
                  <div key={t._id} className="checkbox-item">
                    <input type="checkbox" id={`t-${t._id}`} checked={form.templates.includes(t._id)} onChange={() => toggleTemplate(t._id)} />
                    <label htmlFor={`t-${t._id}`}>{t.name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({t.documentType})</span></label>
                  </div>
                ))}
                {templates.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No templates available.</p>}
              </div>
            </div>

            <div className="form-row">
              {/* Active checkbox — disabled for Super Admin */}
              <div className="checkbox-item" title={isSuperAdminTarget ? 'Cannot deactivate Super Admin' : ''}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  disabled={isSuperAdminTarget}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                />
                <label htmlFor="isActive" style={{ opacity: isSuperAdminTarget ? 0.4 : 1 }}>Active User</label>
              </div>

              {/* Admin checkbox — disabled for Super Admin target AND when editing self */}
              <div className="checkbox-item" title={isSuperAdminTarget ? 'Cannot change Super Admin privileges' : isEditingSelf ? 'Cannot remove your own admin access' : ''}>
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={form.isAdmin}
                  disabled={isSuperAdminTarget || isEditingSelf}
                  onChange={e => setForm({ ...form, isAdmin: e.target.checked })}
                />
                <label htmlFor="isAdmin" style={{ opacity: (isSuperAdminTarget || isEditingSelf) ? 0.4 : 1 }}>
                  Admin Privileges
                  {isEditingSelf && !isSuperAdminTarget && <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>(cannot change own)</span>}
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving…</> : (editingUser ? 'Update User' : 'Create User')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}