import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const FIELD_TYPES = ['text', 'number', 'date', 'email', 'phone', 'amount', 'checkbox'];
const DOC_TYPES = ['invoice', 'purchase_order', 'delivery_note', 'contract', 'form', 'other'];

const DEFAULT_FORM = { name: '', description: '', documentType: 'other', outputFormat: 'json', fields: [], assignedRoles: [], isActive: true };
const DEFAULT_FIELD = { fieldName: '', fieldType: 'text', isRequired: false };

export default function Templates() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  const [templates, setTemplates] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    Promise.all([api.get('/templates'), isAdmin ? api.get('/roles') : Promise.resolve({ data: { data: [] } })])
      .then(([t, r]) => { setTemplates(t.data.data); setRoles(r.data.data); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(DEFAULT_FORM); setEditing(null); setError(''); setModal(true); };
  const openEdit = (t) => {
    setForm({ name: t.name, description: t.description || '', documentType: t.documentType, outputFormat: t.outputFormat, fields: t.fields || [], assignedRoles: t.assignedRoles?.map(r => r._id) || [], isActive: t.isActive });
    setEditing(t._id);
    setError('');
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Template name is required');
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/templates/${editing}`, form);
      else await api.post('/templates', form);
      setModal(false); load();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    await api.delete(`/templates/${id}`); load();
  };

  const addField = () => setForm(f => ({ ...f, fields: [...f.fields, { ...DEFAULT_FIELD, order: f.fields.length }] }));
  const updateField = (i, key, val) => setForm(f => ({ ...f, fields: f.fields.map((field, idx) => idx === i ? { ...field, [key]: val } : field) }));
  const removeField = (i) => setForm(f => ({ ...f, fields: f.fields.filter((_, idx) => idx !== i) }));

  const toggleRole = (id) => setForm(f => ({
    ...f, assignedRoles: f.assignedRoles.includes(id) ? f.assignedRoles.filter(r => r !== id) : [...f.assignedRoles, id]
  }));

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <div>
          <h1>Template Management</h1>
          <p>Create OCR templates with field definitions and output structure</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={openCreate}>+ New Template</button>}
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        templates.length === 0 ? (
          <div className="empty-state">
            <div className="icon">▤</div>
            <p>No templates yet.</p>
            {isAdmin && <button className="btn btn-primary" onClick={openCreate}>+ Create Template</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {templates.map((t) => (
              <div className="card" key={t._id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 15, marginBottom: 4 }}>{t.name}</h3>
                    <span className="tag" style={{ textTransform: 'capitalize' }}>{t.documentType.replace('_', ' ')}</span>
                  </div>
                  <span className={`badge ${t.isActive ? 'badge-active' : 'badge-inactive'}`}>{t.isActive ? 'Active' : 'Off'}</span>
                </div>

                {t.description && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.description}</p>}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>▦ {t.fields?.length || 0} fields</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>⟨⟩ {t.outputFormat.toUpperCase()}</span>
                  {t.assignedRoles?.length > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>⬡ {t.assignedRoles.length} roles</span>}
                </div>

                <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setViewModal(t)}>View Fields</button>
                  {isAdmin && <>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t._id)}>Del</button>
                  </>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setViewModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{viewModal.name} — Fields</h2>
              <button className="btn-icon" onClick={() => setViewModal(null)}>✕</button>
            </div>
            {viewModal.fields?.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No fields defined.</p> : (
              <table>
                <thead><tr><th>Field Name</th><th>Type</th><th>Required</th></tr></thead>
                <tbody>
                  {viewModal.fields.map((f, i) => (
                    <tr key={i}>
                      <td>{f.fieldName}</td>
                      <td><span className="tag">{f.fieldType}</span></td>
                      <td>{f.isRequired ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setViewModal(null)}>Close</button></div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Template' : 'Create Template'}</h2>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>

            {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Template Name *</label>
                <input placeholder="e.g. Invoice Template" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Document Type</label>
                <select value={form.documentType} onChange={e => setForm({ ...form, documentType: e.target.value })}>
                  {DOC_TYPES.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Output Format</label>
                <select value={form.outputFormat} onChange={e => setForm({ ...form, outputFormat: e.target.value })}>
                  {['json', 'csv', 'xml'].map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input placeholder="Short description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            {roles.length > 0 && (
              <div className="form-group">
                <label className="form-label">Assign to Roles</label>
                <div className="checkbox-group" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {roles.map(r => (
                    <div key={r._id} className="checkbox-item">
                      <input type="checkbox" id={`r-${r._id}`} checked={form.assignedRoles.includes(r._id)} onChange={() => toggleRole(r._id)} />
                      <label htmlFor={`r-${r._id}`} style={{ color: r.color }}>{r.name}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label className="form-label" style={{ margin: 0 }}>Fields ({form.fields.length})</label>
                <button className="btn btn-ghost btn-sm" onClick={addField}>+ Add Field</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {form.fields.map((field, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 32px', gap: 8, alignItems: 'center' }}>
                    <input placeholder="Field name" value={field.fieldName} onChange={e => updateField(i, 'fieldName', e.target.value)} />
                    <select value={field.fieldType} onChange={e => updateField(i, 'fieldType', e.target.value)}>
                      {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="checkbox-item" style={{ justifyContent: 'center' }}>
                      <input type="checkbox" checked={field.isRequired} onChange={e => updateField(i, 'isRequired', e.target.checked)} />
                      <label style={{ fontSize: 11 }}>Req</label>
                    </div>
                    <button className="btn-icon" style={{ padding: '4px 6px', fontSize: 11 }} onClick={() => removeField(i)}>✕</button>
                  </div>
                ))}
                {form.fields.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>No fields added yet. Click "+ Add Field" to start.</p>}
              </div>
            </div>

            <div className="checkbox-item">
              <input type="checkbox" id="tplActive" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              <label htmlFor="tplActive">Active Template</label>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" /> Saving…</> : (editing ? 'Update Template' : 'Create Template')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
