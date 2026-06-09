import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import './Upload.css';

export default function Upload() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    api.get('/templates').then(({ data }) => setTemplates(data.data.filter(t => t.isActive)));
  }, []);

  const handleFile = (f) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff', 'image/bmp', 'image/webp'];
    if (!allowed.includes(f.type)) return setError('Only PDF and image files are allowed.');
    if (f.size > 10 * 1024 * 1024) return setError('File must be under 10MB.');
    setFile(f); setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return setError('Please select a file.');
    if (!selectedTemplate) return setError('Please select a template.');
    setUploading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('templateId', selectedTemplate);
      const { data } = await api.post('/scan/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/ocr/process/${data.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const formatSize = (bytes) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="upload-page">
      <div className="page-header">
        <div>
          <h1>New Scan</h1>
          <p>Upload a document and select a template to begin OCR processing</p>
        </div>
      </div>

      <div className="upload-layout">
        {/* Left — File Upload */}
        <div className="card upload-card">
          <h2 className="section-label">Step 1 — Upload Document</h2>

          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileRef.current.click()}
          >
            {file ? (
              <div className="file-preview">
                <div className="file-icon">{file.type === 'application/pdf' ? '📄' : '🖼️'}</div>
                <div className="file-info">
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">{formatSize(file.size)}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕ Remove</button>
              </div>
            ) : (
              <div className="drop-prompt">
                <div className="drop-icon">⬆</div>
                <p className="drop-title">Drop your file here</p>
                <p className="drop-sub">or click to browse</p>
                <p className="drop-formats">PDF, PNG, JPG, TIFF — max 10MB</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.webp" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
        </div>

        {/* Right — Template Select */}
        <div className="card upload-card">
          <h2 className="section-label">Step 2 — Select Template</h2>

          <div className="template-list">
            {templates.map(t => (
              <div key={t._id}
                className={`template-option ${selectedTemplate === t._id ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate(t._id)}>
                <div className="template-option-icon">▤</div>
                <div className="template-option-body">
                  <p className="template-option-name">{t.name}</p>
                  <p className="template-option-meta">{t.documentType.replace('_', ' ')} · {t.fields?.length || 0} fields · {t.outputFormat.toUpperCase()}</p>
                </div>
                {selectedTemplate === t._id && <div className="template-check">✓</div>}
              </div>
            ))}
            {templates.length === 0 && (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <p>No active templates. Create templates first.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="upload-error">{error}</div>}

      <div className="upload-actions">
        <button className="btn btn-ghost" onClick={() => navigate('/ocr/history')}>Cancel</button>
        <button className="btn btn-primary upload-btn" onClick={handleSubmit} disabled={uploading || !file || !selectedTemplate}>
          {uploading ? <><span className="spinner" /> Uploading…</> : '⬆ Upload & Start OCR →'}
        </button>
      </div>
    </div>
  );
}
