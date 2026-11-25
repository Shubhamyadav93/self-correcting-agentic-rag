import React, { useState } from 'react';
import { UploadCloud, X, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { uploadMedicalPdf } from '../services/api';

export default function PdfUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatusMsg(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);
    setStatusMsg(null);

    try {
      const res = await uploadMedicalPdf(selectedFile);
      const chunks = res.chunks_indexed ?? res.chunks_added ?? 0;
      const filename = res.filename || selectedFile.name;

      setStatusMsg({
        type: 'success',
        text: res.message || `Indexed "${filename}" into ChromaDB successfully! (${chunks} chunks)`,
      });

      if (onUploadSuccess) {
        onUploadSuccess({
          filename,
          chunks,
          chunks_added: chunks,
        });
      }

      // Automatically close the modal ~1 second after indexing completes
      setTimeout(() => {
        onClose();
        setSelectedFile(null);
        setStatusMsg(null);
      }, 1000);
    } catch (error) {
      setStatusMsg({
        type: 'error',
        text:
          error.response?.data?.detail ||
          'Upload failed. Ensure /api/ingest route is active on FastAPI.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="panel-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UploadCloud size={18} color="#3b82f6" />
            <span>Upload Medical Guideline PDF</span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} disabled={uploading}>
            <X size={18} />
          </button>
        </div>

        <label className="upload-dropzone">
          <FileText size={32} color="#3b82f6" />
          <div style={{ fontWeight: 600, marginTop: '0.5rem' }}>
            {selectedFile ? selectedFile.name : 'Click to select a clinical PDF file'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            PyPDF Parser → 500-char Chunking → ChromaDB Vector Index (batch_size=64)
          </div>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </label>

        {statusMsg && (
          <div className={`upload-status ${statusMsg.type}`}>
            {statusMsg.type === 'success' && <CheckCircle2 size={16} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <button type="button" className="sample-btn" onClick={onClose} disabled={uploading}>
            Close
          </button>
          {statusMsg?.type !== 'success' && (
            <button
              type="button"
              className="send-btn"
              style={{ padding: '0.55rem 1.1rem' }}
              disabled={!selectedFile || uploading}
              onClick={handleUpload}
            >
              {uploading ? <Loader2 size={16} className="node-spinner" /> : <UploadCloud size={16} />}
              <span>{uploading ? 'Indexing...' : 'Ingest to ChromaDB'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
