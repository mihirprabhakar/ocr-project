import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './Process.css';

const STATUS_STEPS = ['uploaded', 'processing', 'extracted', 'mapped', 'verified', 'pushed'];
const STATUS_LABELS = { uploaded: 'Uploaded', processing: 'Scanning…', extracted: 'Text Extracted', mapped: 'Fields Mapped', verified: 'Verified', pushed: 'Pushed to SAP', failed: 'Failed' };

export default function Process() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canPushToSAP = user?.isAdmin || user?.role?.permissions?.canPushToSAP;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = () =>
    api.get(`/scan/${id}`)
      .then(({ data }) => { setJob(data.data); setFields(data.data.extractedFields || []); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const handleProcess = async () => {
    setProcessing(true); setError(''); setSuccessMsg('');
    try {
      const { data } = await api.post(`/scan/${id}/process`);
      setJob(data.data);
      setFields(data.data.extractedFields || []);
      setSuccessMsg('OCR processing complete! Review and correct the extracted fields below.');
    } catch (err) {
      setError(err.response?.data?.message || 'Processing failed');
    } finally { setProcessing(false); }
  };

  const handleSaveFields = async () => {
    setSaving(true); setError(''); setSuccessMsg('');
    try {
      const { data } = await api.put(`/scan/${id}/fields`, { fields });
      setJob(data.data);
      setSuccessMsg('Fields saved and verified.');
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handlePush = async () => {
    setPushing(true); setError(''); setSuccessMsg('');
    try {
      await api.post(`/scan/${id}/push`);
      setSuccessMsg('Data successfully pushed to SAP/external system!');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Push failed');
    } finally { setPushing(false); }
  };

  const updateField = (idx, key, val) =>
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, [key]: val } : f));

  const stepIndex = STATUS_STEPS.indexOf(job?.status);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!job) return <div className="empty-state"><p>Job not found.</p></div>;

  return (
    <div className="process-page">
      <div className="page-header">
        <div>
          <h1>OCR Processing</h1>
          <p>{job.jobId} · {job.originalFileName}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/ocr/history')}>← Back to History</button>
      </div>

      {/* Progress Steps */}
      <div className="card progress-card">
        <div className="progress-steps">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className={`progress-step ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''} ${job.status === 'failed' && i === stepIndex ? 'failed' : ''}`}>
              <div className="step-dot">
                {i < stepIndex ? '✓' : i === stepIndex && job.status === 'failed' ? '✕' : i + 1}
              </div>
              <span className="step-label">{STATUS_LABELS[s]}</span>
              {i < STATUS_STEPS.length - 1 && <div className={`step-line ${i < stepIndex ? 'done' : ''}`} />}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="process-alert alert-error">{error}</div>}
      {successMsg && <div className="process-alert alert-success">{successMsg}</div>}

      <div className="process-layout">
        {/* Left — Job Info + Actions */}
        <div className="process-sidebar">
          <div className="card">
            <h3 className="card-section-title">Document Info</h3>
            <div className="info-list">
              <div className="info-item"><span>File</span><strong>{job.originalFileName}</strong></div>
              <div className="info-item"><span>Type</span><strong>{job.fileType.toUpperCase()}</strong></div>
              <div className="info-item"><span>Size</span><strong>{job.fileSize ? `${(job.fileSize / 1024).toFixed(1)} KB` : '—'}</strong></div>
              <div className="info-item"><span>Template</span><strong>{job.template?.name}</strong></div>
              <div className="info-item"><span>Status</span>
                <span className={`badge ${job.status === 'failed' ? 'badge-inactive' : job.status === 'pushed' ? 'badge-active' : 'badge-role'}`}>
                  {STATUS_LABELS[job.status]}
                </span>
              </div>
              {job.ocrConfidence > 0 && (
                <div className="info-item"><span>OCR Confidence</span>
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ width: `${job.ocrConfidence}%`, background: job.ocrConfidence > 70 ? 'var(--success)' : job.ocrConfidence > 40 ? 'var(--warning)' : 'var(--danger)' }} />
                    <span>{job.ocrConfidence.toFixed(0)}%</span>
                  </div>
                </div>
              )}
              {job.processingDuration && <div className="info-item"><span>Duration</span><strong>{(job.processingDuration / 1000).toFixed(2)}s</strong></div>}
            </div>

            <div className="action-stack">
              {job.status === 'uploaded' && (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleProcess} disabled={processing}>
                  {processing ? <><span className="spinner" /> Running OCR…</> : '▶ Start OCR Scan'}
                </button>
              )}
              {['extracted', 'mapped', 'verified'].includes(job.status) && (
                <>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSaveFields} disabled={saving}>
                    {saving ? <><span className="spinner" /> Saving…</> : '✓ Save & Verify Fields'}
                  </button>
                  <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={handleProcess} disabled={processing}>
                    {processing ? <><span className="spinner" /> Re-scanning…</> : '↺ Re-run OCR'}
                  </button>
                </>
              )}
              {['mapped', 'verified'].includes(job.status) && canPushToSAP && (
                <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 8, background: '#7c3aed', color: '#fff' }} onClick={handlePush} disabled={pushing}>
                  {pushing ? <><span className="spinner" /> Pushing…</> : '⬆ Push to SAP'}
                </button>
              )}
              {['mapped', 'verified'].includes(job.status) && !canPushToSAP && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8, padding: '8px', background: 'var(--bg-hover)', borderRadius: 6 }}>
                  Your role does not have permission to push data to SAP.
                </div>
              )}
              {job.status === 'failed' && (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleProcess} disabled={processing}>
                  {processing ? <><span className="spinner" /> Retrying…</> : '↺ Retry OCR'}
                </button>
              )}
              {job.status === 'pushed' && (
                <div className="pushed-badge">✓ Pushed to SAP<br /><small>{job.pushedAt ? new Date(job.pushedAt).toLocaleString() : ''}</small></div>
              )}
            </div>
          </div>

          {/* Raw OCR text */}
          {job.rawText && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 className="card-section-title">Raw OCR Text</h3>
              <pre className="raw-text">{job.rawText}</pre>
            </div>
          )}
        </div>

        {/* Right — Extracted Fields */}
        <div className="process-main">
          <div className="card">
            <h3 className="card-section-title">
              Extracted Fields
              {fields.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>({fields.filter(f => f.correctedValue || f.extractedValue).length}/{fields.length} filled)</span>}
            </h3>

            {fields.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <div className="icon">▦</div>
                <p>{job.status === 'uploaded' ? 'Click "Start OCR Scan" to extract fields.' : 'No fields extracted.'}</p>
              </div>
            ) : (
              <div className="fields-grid">
                {fields.map((field, idx) => (
                  <div key={idx} className="field-card">
                    <div className="field-header">
                      <span className="field-name">{field.fieldName}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="tag">{field.fieldType}</span>
                        {field.confidence > 0 && (
                          <span className="confidence-pill" style={{ background: field.confidence > 70 ? 'rgba(16,214,142,0.12)' : field.confidence > 40 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', color: field.confidence > 70 ? 'var(--success)' : field.confidence > 40 ? 'var(--warning)' : 'var(--danger)' }}>
                            {field.confidence}%
                          </span>
                        )}
                        {field.isVerified && <span style={{ color: 'var(--success)', fontSize: 13 }}>✓</span>}
                      </div>
                    </div>

                    {field.extractedValue && field.extractedValue !== field.correctedValue && (
                      <p className="field-extracted">Extracted: {field.extractedValue}</p>
                    )}

                    <input
                      className="field-input"
                      value={field.correctedValue || field.extractedValue || ''}
                      onChange={e => updateField(idx, 'correctedValue', e.target.value)}
                      placeholder={`Enter ${field.fieldName}…`}
                      disabled={job.status === 'pushed'}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SAP Response */}
          {job.sapResponse && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 className="card-section-title">SAP Push Response</h3>
              <pre className="raw-text" style={{ color: 'var(--success)' }}>{JSON.stringify(job.sapResponse, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}