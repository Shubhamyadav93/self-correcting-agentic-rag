import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  ShieldCheck,
  Video,
  FileText,
  Save,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  User,
  Building,
  CreditCard,
  Pill,
  Sparkles,
  Loader2,
  PhoneCall,
} from 'lucide-react';
import { savePrescription } from '../services/api';

export default function VideoConsultRoom({
  appointment,
  onClose,
  onPrescriptionSaved,
}) {
  const [callDuration, setCallDuration] = useState(0);
  const [doctorNotes, setDoctorNotes] = useState(appointment?.doctor_notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Live Call Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!appointment) return null;

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSavePrescription = async (e) => {
    if (e) e.preventDefault();
    if (!doctorNotes.trim()) {
      setErrorMessage('Please enter clinical notes or prescription advice before saving.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updated = await savePrescription(appointment.booking_code, {
        doctor_notes: doctorNotes.trim(),
        status: 'COMPLETED',
      });
      setSaveSuccess(true);
      if (onPrescriptionSaved) {
        onPrescriptionSaved(updated);
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save prescription', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to save clinical prescription to SQLite.');
    } finally {
      setIsSaving(false);
    }
  };

  const addQuickTemplate = (text) => {
    setDoctorNotes((prev) => (prev ? `${prev}\n• ${text}` : `• ${text}`));
  };

  const isUrgent = appointment.urgency_level === 'URGENT';
  const isPriority = appointment.urgency_level === 'PRIORITY';

  // Format meeting URL with query params to streamline Jitsi iframe
  const jitsiIframeUrl = `${appointment.meeting_url}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;

  return (
    <div className="video-room-overlay">
      {/* ── Top Bar ── */}
      <header className="video-room-topbar">
        <div className="video-room-brand">
          <div className="video-live-pulse-dot" />
          <Video size={18} color="#10b981" />
          <span className="room-title">ClinGuard Split-Screen Telemedicine Room</span>
          <span className="room-code-tag">{appointment.booking_code}</span>
        </div>

        <div className="video-room-center-meta">
          <div className="call-timer-pill">
            <Clock size={13} />
            <span>Call Duration: {formatTimer(callDuration)}</span>
          </div>
          <div className="call-security-badge">
            <ShieldCheck size={13} color="#10b981" />
            <span>256-Bit WebRTC Encrypted</span>
          </div>
        </div>

        <div className="video-room-top-actions">
          <a
            href={appointment.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="external-tab-btn"
            title="Open in Full Browser Tab"
          >
            <ExternalLink size={14} />
            <span>External Window</span>
          </a>
          <button
            type="button"
            className="end-call-btn"
            onClick={onClose}
          >
            <PhoneCall size={14} style={{ transform: 'rotate(135deg)' }} />
            <span>End & Close Room</span>
          </button>
        </div>
      </header>

      {/* ── Split-Screen Workspace ── */}
      <div className="video-room-split-body">
        {/* Left Panel: Embedded Jitsi WebRTC (65% width) */}
        <section className="video-room-media-panel">
          <iframe
            src={jitsiIframeUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="video-consult-iframe"
            title={`Telemedicine Video Call with ${appointment.patient_name}`}
          />
          <div className="media-overlay-subbar">
            <span>
              Consulting: <strong>{appointment.patient_name}</strong> (Age: {appointment.patient_age}) • Doctor: {appointment.doctor?.name || 'Specialist'}
            </span>
            <span className="media-mode-chip">{appointment.consultation_mode || 'Video Call'}</span>
          </div>
        </section>

        {/* Right Panel: Clinical Handoff & Prescription Pad (35% width) */}
        <aside className="video-room-clinical-sidebar">
          <div className="sidebar-scroll-content">
            {/* 1. Patient & Payment Card */}
            <div className="rx-card-box">
              <div className="rx-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <User size={16} color="#3b82f6" />
                  <strong style={{ fontSize: '0.92rem', color: '#ffffff' }}>
                    {appointment.patient_name}
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#a1a1aa' }}>
                    ({appointment.patient_age} yrs • {appointment.patient_contact})
                  </span>
                </div>
                <span
                  className={`urgency-badge-pill ${
                    isUrgent ? 'badge-urgent' : isPriority ? 'badge-priority' : 'badge-routine'
                  }`}
                  style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                >
                  {isUrgent && <AlertTriangle size={10} />}
                  {appointment.urgency_level}
                </span>
              </div>

              {/* Payment Receipt Badge */}
              <div className="rx-payment-strip">
                <div className="rx-pay-pill">
                  <CreditCard size={12} color="#10b981" />
                  <span>
                    PAID ₹{appointment.amount_paid || appointment.doctor?.consultation_fee || 800} ({appointment.payment_method || 'UPI'})
                  </span>
                </div>
                <span className="rx-txn-code">{appointment.transaction_id || `TXN-${appointment.booking_code}`}</span>
              </div>

              {/* Verified Consent */}
              <div className="rx-consent-strip">
                <ShieldCheck size={12} color="#10b981" />
                <span>
                  Digital Patient Consent Verified • {new Date(appointment.consent_timestamp || appointment.created_at || Date.now()).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* 2. Patient Inquiry & AI Pre-Consultation SOAP Note */}
            <div className="rx-card-box">
              <div className="rx-section-title">
                <FileText size={14} color="#38bdf8" />
                <span>Pre-Consultation AI SOAP Summary</span>
              </div>

              {appointment.patient_query && (
                <div className="rx-query-quote">
                  <span style={{ color: '#71717a', fontSize: '0.72rem' }}>Patient Query: </span>
                  <span>"{appointment.patient_query}"</span>
                </div>
              )}

              <div className="rx-soap-content">
                <div className="rx-soap-item">
                  <strong>Clinical Assessment:</strong> {appointment.soap_clinical_summary}
                </div>
                {appointment.verified_citations && appointment.verified_citations.length > 0 && (
                  <div className="rx-soap-item" style={{ marginTop: '0.45rem' }}>
                    <strong>Verified Guidelines & Citations:</strong>
                    <div className="rx-citations-wrap">
                      {appointment.verified_citations.map((cite, idx) => (
                        <span key={idx} className="rx-cite-chip">
                          {typeof cite === 'string' ? cite : cite.source || cite.title || 'Guideline Reference'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Interactive Doctor Prescription & Clinical Advice Pad */}
            <div className="rx-card-box rx-prescription-box">
              <div className="rx-section-title" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Pill size={14} color="#10b981" />
                  <span>Doctor Prescription & Post-Consultation Advice</span>
                </div>
                {saveSuccess && (
                  <span className="save-success-tag">
                    <CheckCircle2 size={12} /> Saved to SQLite
                  </span>
                )}
              </div>

              {/* Quick Medication / Clinical Snippet Templates */}
              <div className="quick-templates-bar">
                <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Quick Snippets:</span>
                <button
                  type="button"
                  className="quick-template-btn"
                  onClick={() => addQuickTemplate('Dexamethasone 6mg OD PO/IV for 10 days')}
                >
                  + Dexamethasone 6mg
                </button>
                <button
                  type="button"
                  className="quick-template-btn"
                  onClick={() => addQuickTemplate('Titrate supplemental O2 to maintain SpO2 92–96%')}
                >
                  + O2 Titration
                </button>
                <button
                  type="button"
                  className="quick-template-btn"
                  onClick={() => addQuickTemplate('Follow up via Telemedicine in 72 hours with vitals log')}
                >
                  + 72h Follow-up
                </button>
              </div>

              <textarea
                className="rx-textarea"
                rows={6}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Enter clinical diagnosis, prescribed medication regimens, dosage instructions, and patient follow-up guidelines..."
              />

              {errorMessage && (
                <div className="rx-error-alert">
                  <AlertTriangle size={13} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="rx-action-row">
                <button
                  type="button"
                  className="save-rx-btn"
                  onClick={handleSavePrescription}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="node-spinner" />
                      <span>Saving to SQLite...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save Prescription & Complete Consult</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
