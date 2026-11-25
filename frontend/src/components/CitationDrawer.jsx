import React from 'react';
import { X, FileText, ExternalLink, ShieldCheck } from 'lucide-react';

export default function CitationDrawer({ citation, onClose }) {
  if (!citation) return null;

  const isObj = typeof citation === 'object';
  const title = isObj ? citation.source || 'WHO Clinical Guidelines' : citation;
  const page = isObj && citation.page ? citation.page : 'Verified Source';
  const snippet = isObj && citation.text_snippet ? citation.text_snippet : null;
  const isUrl = typeof title === 'string' && title.startsWith('http');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="drawer-box" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="#3b82f6" />
            <span>Source Evidence Inspector</span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="badge-grounded" style={{ marginBottom: '1rem' }}>
          <ShieldCheck size={14} />
          <span>Verified Grounded Reference</span>
        </div>

        <div style={{ fontSize: '0.82rem', color: '#71717a' }}>Document / Source:</div>
        <div style={{ fontWeight: 600, wordBreak: 'break-all', marginBottom: '0.85rem' }}>
          {title}
        </div>

        <div style={{ fontSize: '0.82rem', color: '#71717a' }}>Reference Location:</div>
        <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Page / Origin: {page}</div>

        {snippet && (
          <div
            style={{
              fontSize: '0.86rem',
              marginBottom: '1rem',
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ color: '#71717a', marginBottom: '0.35rem', fontSize: '0.78rem' }}>
              Matched Chunk:
            </div>
            <div style={{ color: '#d4d4d8', lineHeight: 1.6 }}>"{snippet}"</div>
          </div>
        )}

        {isUrl && (
          <a
            href={title}
            target="_blank"
            rel="noopener noreferrer"
            className="send-btn"
            style={{
              display: 'inline-flex',
              padding: '0.6rem 1rem',
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={15} />
            <span>Open Clinical Reference</span>
          </a>
        )}
      </div>
    </div>
  );
}
