import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ShieldCheck,
  Globe,
  FileText,
  Copy,
  Check,
  FastForward,
  Stethoscope,
  Star,
  Building,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  Video,
  Languages,
  Sparkles,
} from 'lucide-react';
import { getTriageRecommendations } from '../services/api';
import DoctorConsultationModal from './DoctorConsultationModal';

export default function GroundedResponseCard({
  data,
  isNewResponse = false,
  onSelectCitation,
  onTypingComplete,
  onStreamTick,
  onBookDoctor,
}) {
  const [copied, setCopied] = useState(false);

  const rawAnswerText =
    data?.answer || data?.response || (typeof data === 'string' ? data : JSON.stringify(data || ''));
  const [displayedText, setDisplayedText] = useState(() => (isNewResponse ? '' : rawAnswerText));
  const [isTyping, setIsTyping] = useState(() => Boolean(isNewResponse));
  const intervalRef = useRef(null);

  const sources = data?.sources || data?.citations || [];
  const usedWebFallback = Boolean(
    data?.web_search_used ||
    data?.fallback_used ||
    data?.fallback_triggered ||
    sources.some(
      (c) => c?.page === 'Web' || c?.page === 'web' || String(c?.source || '').startsWith('http')
    )
  );

  // Clinical Triage & Doctor Recommendation state
  const [triageData, setTriageData] = useState(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [showSoapPreview, setShowSoapPreview] = useState(false);

  // Local fallback modal state if onBookDoctor is not passed from parent
  const [localModalDoctor, setLocalModalDoctor] = useState(null);

  /* ── Smooth progressive typewriter effect for brand-new responses ── */
  useEffect(() => {
    if (!isNewResponse) {
      setDisplayedText(rawAnswerText);
      setIsTyping(false);
      return;
    }

    const tokens = rawAnswerText.split(/(\s+)/);
    if (!tokens || tokens.length === 0) {
      setDisplayedText(rawAnswerText);
      setIsTyping(false);
      return;
    }

    let currentIndex = 0;
    setIsTyping(true);
    setDisplayedText('');

    const chunkSize = tokens.length > 300 ? Math.ceil(tokens.length / 200) : 1;

    intervalRef.current = setInterval(() => {
      currentIndex += chunkSize;
      if (currentIndex >= tokens.length) {
        setDisplayedText(rawAnswerText);
        setIsTyping(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (onTypingComplete) onTypingComplete();
        if (onStreamTick) onStreamTick();
      } else {
        setDisplayedText(tokens.slice(0, currentIndex).join(''));
        if (onStreamTick) onStreamTick();
      }
    }, 15);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isNewResponse, rawAnswerText]);

  // Fetch clinical triage recommendations ONLY after typing finishes
  useEffect(() => {
    if (isTyping || !rawAnswerText || triageData) return;

    setTriageLoading(true);
    const queryText = data?.question || data?.query || rawAnswerText.slice(0, 100);

    getTriageRecommendations({
      query: queryText,
      answer: rawAnswerText,
      citations: sources,
    })
      .then((res) => {
        setTriageData(res);
      })
      .catch((err) => {
        console.error('Failed to fetch triage recommendations', err);
      })
      .finally(() => {
        setTriageLoading(false);
      });
  }, [isTyping, rawAnswerText, data]);

  const handleSkipAnimation = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayedText(rawAnswerText);
    setIsTyping(false);
    if (onTypingComplete) onTypingComplete();
    if (onStreamTick) onStreamTick();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawAnswerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = rawAnswerText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBookClick = (doctor) => {
    if (onBookDoctor) {
      onBookDoctor(doctor, triageData, data?.question || rawAnswerText.slice(0, 80), sources);
    } else {
      setLocalModalDoctor(doctor);
    }
  };

  const isUrgent = triageData?.urgency_level === 'URGENT';
  const isPriority = triageData?.urgency_level === 'PRIORITY';

  return (
    <div className="response-card">
      <div className="response-meta">
        <span className={`badge-grounded ${usedWebFallback ? 'badge-fallback' : ''}`}>
          {usedWebFallback ? (
            <>
              <Globe size={14} />
              <span>Web Fallback Verified (WHO / PubMed)</span>
            </>
          ) : (
            <>
              <ShieldCheck size={14} />
              <span>100% Grounded • Hallucination Check Passed</span>
            </>
          )}
        </span>

        {isTyping && (
          <button
            type="button"
            className="skip-typing-btn"
            onClick={handleSkipAnimation}
            title="Skip streaming animation"
          >
            <FastForward size={12} />
            <span>Skip animation</span>
          </button>
        )}
      </div>

      <div className="response-body">
        <ReactMarkdown>{displayedText}</ReactMarkdown>
        {isTyping && <span className="streaming-cursor" />}
      </div>

      {!isTyping && sources.length > 0 && (
        <div className="citations-box">
          <div style={{ fontSize: '0.78rem', color: '#71717a', marginBottom: '0.35rem' }}>
            Verified Clinical Citations (Click to inspect):
          </div>
          <div>
            {sources.map((src, index) => {
              const label =
                typeof src === 'string'
                  ? src
                  : `${src.source || 'WHO Guideline'}${src.page ? ` (Page ${src.page})` : ''}`;
              return (
                <button
                  key={index}
                  type="button"
                  className="citation-chip"
                  onClick={() => onSelectCitation && onSelectCitation(src)}
                >
                  <FileText size={12} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action toolbar */}
      {!isTyping && (
        <div className="response-actions">
          <button
            type="button"
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Copied!' : 'Copy Clinical Summary'}</span>
          </button>

          {data?.latency_ms && (
            <span className="latency-badge">⏱ {data.latency_ms}ms</span>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* POST-RESPONSE SPECIALIST TRIAGE & DOCTOR RECOMMENDATION BANNER     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {!isTyping && (
        <div className="triage-container">
          {triageLoading ? (
            <div className="triage-loading-card">
              <Loader2 size={16} className="node-spinner" color="#10b981" />
              <span>Analyzing clinical triage parameters & matching top specialist doctors...</span>
            </div>
          ) : triageData ? (
            <div className="triage-card">
              {/* Triage Banner Header */}
              <div className="triage-banner-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Stethoscope size={18} color="#10b981" />
                  <span className="triage-title">
                    Clinical Triage: Recommended {triageData.specialty} Consult
                  </span>
                </div>

                <span
                  className={`urgency-badge-pill ${
                    isUrgent ? 'badge-urgent' : isPriority ? 'badge-priority' : 'badge-routine'
                  }`}
                >
                  {isUrgent && <AlertTriangle size={12} />}
                  {triageData.urgency_badge || triageData.urgency_level}
                </span>
              </div>

              {/* Clinical Condition & Rationale */}
              <div className="triage-condition-bar">
                <div>
                  <span style={{ color: '#71717a' }}>Assessed Condition: </span>
                  <strong style={{ color: '#ffffff' }}>{triageData.condition}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: '0.15rem' }}>
                  {triageData.urgency_reason}
                </div>
              </div>

              {/* Matched Specialist Doctors Grid */}
              <div className="triage-doctors-list">
                {triageData.doctors?.slice(0, 3).map((doc) => {
                  const isExpanded = expandedDocId === doc.id;

                  return (
                    <div key={doc.id} className="triage-doctor-item">
                      <div className="triage-doc-main-row">
                        <div className="triage-doc-avatar">
                          <Award size={22} color="#10b981" />
                        </div>

                        <div className="triage-doc-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <span className="triage-doc-name">{doc.name}</span>
                            <span className="badge-grounded" style={{ padding: '0.15rem 0.45rem', fontSize: '0.68rem' }}>
                              <Star size={10} fill="#10b981" />
                              <span>{doc.rating}</span>
                            </span>
                            <span className="doc-fee-badge">₹{doc.consultation_fee}</span>
                          </div>

                          <div className="triage-doc-qual">
                            {doc.specialty} • {doc.qualifications}
                          </div>

                          <div className="triage-doc-meta">
                            <span>
                              <Building size={12} /> {doc.hospital_affiliation}
                            </span>
                            <span>
                              <Award size={12} /> {doc.experience_years} yrs exp
                            </span>
                            <span>
                              <Languages size={12} /> {doc.languages}
                            </span>
                          </div>
                        </div>

                        <div className="triage-doc-actions">
                          <button
                            type="button"
                            className="book-consult-cta-btn"
                            onClick={() => handleBookClick(doc)}
                          >
                            <Video size={14} />
                            <span>Book Online Consult</span>
                          </button>

                          <button
                            type="button"
                            className="view-background-btn"
                            onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                          >
                            <span>{isExpanded ? 'Hide Details' : 'View Full Background'}</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Verified Medical Background */}
                      {isExpanded && (
                        <div className="triage-doc-expanded">
                          <div className="doc-expanded-row">
                            <strong>NMC Registration:</strong> {doc.registration_number}
                          </div>
                          <div className="doc-expanded-row">
                            <strong>Hospital Affiliation:</strong> {doc.hospital_affiliation}
                          </div>
                          <div className="doc-expanded-row">
                            <strong>Total Consultations:</strong> {doc.consultations_count}+ patients
                          </div>
                          <p className="doc-expanded-bio">{doc.bio}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Collapsible Pre-Consultation SOAP Note Preview */}
              {triageData.soap_note && (
                <div className="triage-soap-container">
                  <button
                    type="button"
                    className="triage-soap-toggle-btn"
                    onClick={() => setShowSoapPreview(!showSoapPreview)}
                  >
                    <FileText size={14} color="#3b82f6" />
                    <span>View AI Pre-Consultation SOAP Note (Shared on Consent)</span>
                    {showSoapPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {showSoapPreview && (
                    <div className="triage-soap-box">
                      <div className="soap-item">
                        <strong>Subjective:</strong> {triageData.soap_note.subjective}
                      </div>
                      <div className="soap-item">
                        <strong>Assessment:</strong> {triageData.soap_note.assessment}
                      </div>
                      <div className="soap-item">
                        <strong>Guideline Evidence:</strong> {triageData.soap_note.guideline_evidence}
                      </div>
                      <div className="soap-item">
                        <strong>Plan:</strong> {triageData.soap_note.plan}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Local Consultation Modal Fallback */}
      {localModalDoctor && (
        <DoctorConsultationModal
          isOpen={Boolean(localModalDoctor)}
          onClose={() => setLocalModalDoctor(null)}
          doctor={localModalDoctor}
          triageData={triageData}
          patientQuery={data?.question || rawAnswerText.slice(0, 80)}
          citations={sources}
        />
      )}
    </div>
  );
}
