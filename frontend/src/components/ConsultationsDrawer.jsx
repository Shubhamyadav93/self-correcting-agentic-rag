import React, { useState, useEffect } from 'react';
import {
  X,
  Video,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  Building,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Stethoscope,
  RefreshCw,
  AlertTriangle,
  Award,
  Phone,
  CreditCard,
  Bell,
  UserPlus,
  CheckCircle2,
  Lock,
  Loader2,
  Sparkles,
  ArrowLeft,
  Download,
  Settings,
  Plus,
  Trash2,
} from 'lucide-react';
import { getAppointments, registerDoctor, updateDoctorProfile } from '../services/api';

function getGoogleCalendarUrl(appointment) {
  if (!appointment) return '#';
  const docName = appointment.doctor?.name || 'Specialist Doctor';
  const title = encodeURIComponent(`Clinical Teleconsultation: ${docName}`);
  const details = encodeURIComponent(
    `Consultation Mode: ${appointment.consultation_mode}\nBooking Code: ${appointment.booking_code}\nTransaction ID: ${appointment.transaction_id || 'PAID'}\n\nJoin Live WebRTC Room:\n${appointment.meeting_url}\n\nClinical Summary:\n${appointment.soap_clinical_summary || ''}`
  );
  const location = encodeURIComponent(appointment.meeting_url);
  const dateClean = (appointment.appointment_date || '').replace(/-/g, '');
  const dates = `${dateClean}T090000Z/${dateClean}T094500Z`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
}

function downloadIcsFile(appointment) {
  if (!appointment) return;
  const docName = appointment.doctor?.name || 'Specialist Doctor';
  const dateClean = (appointment.appointment_date || '').replace(/-/g, '');
  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClinGuard Telehealth//EN',
    'BEGIN:VEVENT',
    `UID:${appointment.booking_code}@clinguard.health`,
    `DTSTAMP:${dateClean}T090000Z`,
    `DTSTART:${dateClean}T090000Z`,
    `DTEND:${dateClean}T094500Z`,
    `SUMMARY:Clinical Teleconsultation: ${docName}`,
    `DESCRIPTION:Consultation Mode: ${appointment.consultation_mode}\\nBooking Code: ${appointment.booking_code}\\nTransaction ID: ${appointment.transaction_id || 'PAID'}\\nJoin Live Room: ${appointment.meeting_url}\\nClinical Summary: ${appointment.soap_clinical_summary || ''}`,
    `LOCATION:${appointment.meeting_url}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `consultation_${appointment.booking_code}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function ConsultationsDrawer({
  isOpen = true,
  onClose,
  initialMode = 'patient',
  onLaunchVideoRoom,
  isFullPage = false,
  onBackToChat,
  currentUser,
  onUpdateUser,
}) {
  const [mode, setMode] = useState(initialMode); // 'patient' | 'doctor' | 'availability' | 'onboard'
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterSpecialty, setFilterSpecialty] = useState('ALL');
  const [expandedAptId, setExpandedAptId] = useState(null);

  // Doctor Availability & Profile Management State
  const docProfile = currentUser?.doctor_profile;
  const [docFee, setDocFee] = useState(docProfile?.consultation_fee || 850);
  const [docSlots, setDocSlots] = useState(
    docProfile?.available_slots && docProfile.available_slots.length > 0
      ? docProfile.available_slots
      : ['09:30 AM', '11:00 AM', '02:30 PM', '05:00 PM', '07:30 PM']
  );
  const [newSlotInput, setNewSlotInput] = useState('');
  const [docHospital, setDocHospital] = useState(docProfile?.hospital_affiliation || '');
  const [docBio, setDocBio] = useState(docProfile?.bio || '');
  const [docQualifications, setDocQualifications] = useState(docProfile?.qualifications || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState(null);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser?.doctor_profile) {
      const p = currentUser.doctor_profile;
      setDocFee(p.consultation_fee || 850);
      if (p.available_slots) setDocSlots(p.available_slots);
      setDocHospital(p.hospital_affiliation || '');
      setDocBio(p.bio || '');
      setDocQualifications(p.qualifications || '');
    }
  }, [currentUser]);

  // Doctor Onboarding Form State
  const [onboardName, setOnboardName] = useState('');
  const [onboardSpecialty, setOnboardSpecialty] = useState('Pulmonologist');
  const [onboardQualifications, setOnboardQualifications] = useState('');
  const [onboardRegNum, setOnboardRegNum] = useState('');
  const [onboardHospital, setOnboardHospital] = useState('');
  const [onboardExp, setOnboardExp] = useState('10');
  const [onboardFee, setOnboardFee] = useState('800');
  const [onboardLanguages, setOnboardLanguages] = useState('English, Hindi');
  const [onboardBio, setOnboardBio] = useState('');
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);
  const [onboardSuccess, setOnboardSuccess] = useState(false);
  const [onboardError, setOnboardError] = useState(null);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode, isOpen]);

  const fetchAppointments = () => {
    setLoading(true);
    let filter = {};
    if (currentUser?.role === 'PATIENT') {
      filter.patient_email = currentUser.email;
    } else if (currentUser?.role === 'DOCTOR' && currentUser?.doctor_id) {
      filter.doctor_id = currentUser.doctor_id;
    }

    getAppointments(filter)
      .then((data) => {
        setAppointments(data || []);
      })
      .catch((err) => {
        console.error('Failed to load appointments', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen || isFullPage) {
      fetchAppointments();
    }
  }, [isOpen, isFullPage, currentUser]);

  if (!isOpen && !isFullPage) return null;

  const specialties = [
    'ALL',
    'Pulmonologist',
    'Cardiologist',
    'Neurologist',
    'Endocrinologist',
    'Gynecologist',
    'General Physician',
  ];

  const filteredAppointments = appointments.filter((apt) => {
    if (filterSpecialty === 'ALL') return true;
    return apt.doctor?.specialty === filterSpecialty;
  });

  // Triage Queue Metrics
  const totalPayout = appointments.reduce(
    (sum, a) => sum + (a.amount_paid || a.doctor?.consultation_fee || 800),
    0
  );
  const urgentCount = appointments.filter((a) => a.urgency_level === 'URGENT').length;
  const pendingCount = appointments.filter((a) => a.status !== 'COMPLETED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;

  const handleAddSlot = () => {
    if (!newSlotInput.trim()) return;
    if (!docSlots.includes(newSlotInput.trim())) {
      setDocSlots([...docSlots, newSlotInput.trim()]);
    }
    setNewSlotInput('');
  };

  const handleRemoveSlot = (slotToRemove) => {
    setDocSlots(docSlots.filter((s) => s !== slotToRemove));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser?.doctor_id) {
      setSaveErrorMsg('No linked specialist doctor ID found.');
      return;
    }
    setSavingProfile(true);
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);
    try {
      const res = await updateDoctorProfile(currentUser.doctor_id, {
        consultation_fee: Number(docFee) || 850,
        available_slots: docSlots,
        hospital_affiliation: docHospital.trim(),
        bio: docBio.trim(),
        qualifications: docQualifications.trim(),
      });
      setSaveSuccessMsg('Doctor profile & consultation availability updated successfully!');
      if (onUpdateUser && res.doctor) {
        onUpdateUser({
          ...currentUser,
          doctor_profile: res.doctor,
        });
      }
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err) {
      setSaveErrorMsg(err?.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!onboardName.trim() || !onboardQualifications.trim() || !onboardRegNum.trim() || !onboardHospital.trim()) {
      setOnboardError('Please fill in all required doctor credential fields.');
      return;
    }

    setOnboardSubmitting(true);
    setOnboardError(null);

    try {
      await registerDoctor({
        name: onboardName.trim(),
        specialty: onboardSpecialty,
        qualifications: onboardQualifications.trim(),
        registration_number: onboardRegNum.trim(),
        hospital_affiliation: onboardHospital.trim(),
        experience_years: Number(onboardExp) || 5,
        consultation_fee: Number(onboardFee) || 800,
        languages: onboardLanguages.trim() || 'English, Hindi',
        bio: onboardBio.trim() || `Specialist in ${onboardSpecialty} affiliated with ${onboardHospital}.`,
      });

      setOnboardSuccess(true);
      setTimeout(() => {
        setOnboardSuccess(false);
        setMode('doctor');
        fetchAppointments();
      }, 1500);
    } catch (err) {
      setOnboardError(err.response?.data?.detail || 'Failed to onboard doctor to SQLite.');
    } finally {
      setOnboardSubmitting(false);
    }
  };

  // Reusable Appointment Card
  const renderAppointmentCard = (apt, isGrid = false) => {
    const isUrgent = apt.urgency_level === 'URGENT';
    const isPriority = apt.urgency_level === 'PRIORITY';
    const isExpanded = expandedAptId === apt.id;
    const isCompleted = apt.status === 'COMPLETED';

    return (
      <div
        key={apt.id}
        className={`appointment-card ${isUrgent ? 'urgent-border' : isPriority ? 'priority-border' : ''} ${
          isGrid ? 'appointment-grid-card' : ''
        }`}
      >
        {/* Top Status Bar with Spacing */}
        <div className="apt-card-top">
          <span className="booking-code-tag">{apt.booking_code}</span>

          <span
            className={`urgency-badge-pill ${
              isUrgent ? 'badge-urgent' : isPriority ? 'badge-priority' : 'badge-routine'
            }`}
          >
            {isUrgent && <AlertTriangle size={11} />}
            {apt.urgency_level}
          </span>

          <span className={`status-pill-badge ${isCompleted ? 'status-completed' : 'status-confirmed'}`}>
            {isCompleted ? 'COMPLETED' : 'CONFIRMED'}
          </span>
        </div>

        {/* Doctor & Patient Info */}
        {mode === 'patient' ? (
          /* Patient's View */
          <div className="apt-body">
            <div className="apt-doc-name">
              {apt.doctor?.name} ({apt.doctor?.specialty})
            </div>
            <div className="apt-meta-line">
              <Building size={13} />
              <span>{apt.doctor?.hospital_affiliation}</span>
            </div>
            {/* Clear Spacing for Badges */}
            <div className="apt-time-mode-row">
              <span className="apt-time-badge">
                <Clock size={12} />
                <span>{apt.appointment_day}, {apt.appointment_date} @ {apt.time_slot}</span>
              </span>
              <span className="apt-mode-badge">{apt.consultation_mode}</span>
            </div>
          </div>
        ) : (
          /* Doctor's View */
          <div className="apt-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div className="apt-patient-name">
                Patient: {apt.patient_name} (Age: {apt.patient_age})
              </div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                <Phone size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                {apt.patient_contact}
              </span>
            </div>

            <div className="apt-time-mode-row">
              <span className="apt-time-badge">
                <Clock size={12} />
                <span>{apt.appointment_day}, {apt.appointment_date} @ {apt.time_slot}</span>
              </span>
              <span className="apt-mode-badge">
                {apt.doctor?.name} ({apt.doctor?.specialty})
              </span>
            </div>

            {/* Payment & Notification Status Badges */}
            <div className="apt-status-badges-row">
              <span className="paid-txn-pill" style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                <Lock size={10} />
                <span>PAID ₹{apt.amount_paid || apt.doctor?.consultation_fee || 800} • {apt.transaction_id || 'TXN-VERIFIED'}</span>
              </span>
              <span className="doc-notified-indicator">
                <Bell size={10} />
                <span>Doctor Notified</span>
              </span>
            </div>

            {/* Verified Consent Badge */}
            <div className="consent-verified-badge" style={{ marginTop: '0.4rem' }}>
              <ShieldCheck size={13} color="#10b981" />
              <span>
                Digital Patient Consent Verified (
                {new Date(apt.consent_timestamp || apt.created_at || Date.now()).toLocaleTimeString()}
                )
              </span>
            </div>
          </div>
        )}

        {/* Patient Query Preview */}
        {apt.patient_query && (
          <div className="apt-query-box">
            <span style={{ color: '#71717a' }}>Query: </span>
            <span>"{apt.patient_query}"</span>
          </div>
        )}

        {/* Expandable SOAP Note */}
        <div className="apt-soap-section">
          <button
            type="button"
            className="apt-soap-toggle"
            onClick={() => setExpandedAptId(isExpanded ? null : apt.id)}
          >
            <FileText size={13} color="#3b82f6" />
            <span>{mode === 'doctor' ? 'Clinical SOAP Note & Evidence' : 'Pre-Consultation Summary'}</span>
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {isExpanded && (
            <div className="apt-soap-body">
              <div className="soap-line">
                <strong>Clinical Assessment:</strong> {apt.soap_clinical_summary}
              </div>
              {apt.verified_citations && apt.verified_citations.length > 0 && (
                <div className="soap-line" style={{ marginTop: '0.35rem' }}>
                  <strong>Verified Citations:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.25rem' }}>
                    {apt.verified_citations.map((c, i) => (
                      <span key={i} className="citation-chip" style={{ fontSize: '0.72rem' }}>
                        {typeof c === 'string' ? c : c.source || 'Clinical Guideline'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {apt.doctor_notes && (
                <div className="apt-prescription-box" style={{ marginTop: '0.5rem' }}>
                  <strong>Post-Consultation Prescription Issued:</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#f1f5f9' }}>{apt.doctor_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action CTAs */}
        <div className="apt-card-actions">
          {onLaunchVideoRoom ? (
            <button
              type="button"
              className="join-video-btn"
              onClick={() => onLaunchVideoRoom(apt)}
            >
              <Video size={14} />
              <span>
                {mode === 'doctor'
                  ? 'Launch Split-Screen Video Room'
                  : 'Join Split-Screen Video Room'}
              </span>
            </button>
          ) : (
            <a
              href={apt.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="join-video-btn"
            >
              <Video size={14} />
              <span>
                {mode === 'doctor' ? 'Start Video Consult' : 'Join Live Video Call'}
              </span>
              <ExternalLink size={13} style={{ marginLeft: 'auto' }} />
            </a>
          )}

          {mode === 'patient' && (
            <div style={{ display: 'flex', gap: '0.45rem' }}>
              <button
                type="button"
                className="calendar-icon-btn"
                onClick={() => downloadIcsFile(apt)}
                title="Download .ics Calendar Invite"
              >
                <Download size={15} />
              </button>
              <a
                href={getGoogleCalendarUrl(apt)}
                target="_blank"
                rel="noopener noreferrer"
                className="calendar-icon-btn"
                title="Add to Google Calendar"
              >
                <Calendar size={15} />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────
     FULL-PAGE VIEW RENDERING (Dedicated Main Workspace Mode)
     ───────────────────────────────────────────────────────────────────────── */
  if (isFullPage) {
    return (
      <div className="fullpage-view-container">
        {/* Fullpage Header Bar */}
        <div className="fullpage-header-bar">
          <div className="fullpage-header-left">
            {onBackToChat && (
              <button
                type="button"
                className="back-to-chat-btn"
                onClick={onBackToChat}
              >
                <ArrowLeft size={16} />
                <span>Back to Clinical AI</span>
              </button>
            )}
            <div className="fullpage-title-group">
              <div className="fullpage-main-title">
                {mode === 'doctor' || mode === 'onboard' ? (
                  <>
                    <Stethoscope size={24} color="#10b981" />
                    <span>Doctor Clinical Telemedicine Portal</span>
                  </>
                ) : (
                  <>
                    <Calendar size={24} color="#3b82f6" />
                    <span>My Telemedicine Consultations & Passes</span>
                  </>
                )}
              </div>
              <div className="fullpage-subtitle">
                {mode === 'doctor' || mode === 'onboard'
                  ? 'Real-time patient triage queue, WebRTC consultation launcher & specialist onboarding'
                  : 'Verified appointment passes, live HD video consultations & downloadable calendar invites'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              className="sample-btn"
              onClick={fetchAppointments}
              title="Refresh Consultations"
            >
              <RefreshCw size={14} className={loading ? 'node-spinner' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── DOCTOR PORTAL MODE ── */}
        {mode !== 'patient' ? (
          <>
            {/* Live Alert Banner */}
            <div className="portal-live-alert-banner">
              <div className="portal-alert-icon">
                <Bell size={16} color="#10b981" />
              </div>
              <div className="portal-alert-text">
                <strong>{pendingCount} Active Telemedicine Bookings</strong> •{' '}
                <span style={{ color: '#ef4444' }}>{urgentCount} Urgent Cases Flagged</span> • Total Collected:{' '}
                <span style={{ color: '#34d399', fontWeight: 700 }}>₹{totalPayout}</span>
              </div>
            </div>

            {/* Sub-tabs for Doctor Portal */}
            <div className="fullpage-subtabs-row">
              <button
                type="button"
                className={`fullpage-subtab-btn ${mode === 'doctor' ? 'active' : ''}`}
                onClick={() => setMode('doctor')}
              >
                <Stethoscope size={15} />
                <span>Incoming Patient Queue ({appointments.length})</span>
              </button>
              {currentUser?.role === 'DOCTOR' && (
                <button
                  type="button"
                  className={`fullpage-subtab-btn ${mode === 'availability' ? 'active' : ''}`}
                  onClick={() => setMode('availability')}
                >
                  <Settings size={15} />
                  <span>Edit Availability & Fee</span>
                </button>
              )}
              <button
                type="button"
                className={`fullpage-subtab-btn ${mode === 'onboard' ? 'active' : ''}`}
                onClick={() => setMode('onboard')}
              >
                <UserPlus size={15} />
                <span>+ Onboard New Specialist</span>
              </button>
            </div>

            {mode === 'availability' ? (
              <div className="onboard-fullpage-card">
                <div className="onboard-header-note">
                  <Settings size={18} color="#34d399" />
                  <span>
                    Manage your consultation fee, daily schedule slots, hospital affiliations, and professional summary. Changes take effect immediately in the patient booking system.
                  </span>
                </div>

                {saveSuccessMsg && (
                  <div className="onboard-success-box" style={{ padding: '0.85rem 1rem' }}>
                    <CheckCircle2 size={24} color="#10b981" />
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{saveSuccessMsg}</div>
                  </div>
                )}

                {saveErrorMsg && (
                  <div className="form-error-alert">
                    <AlertTriangle size={14} />
                    <span>{saveErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="onboard-form" style={{ marginTop: '1rem' }}>
                  <div className="onboard-input-row">
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                        Consultation Fee (₹ INR)
                      </label>
                      <input
                        type="number"
                        min="100"
                        step="50"
                        value={docFee}
                        onChange={(e) => setDocFee(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                        Hospital / Clinic Affiliation
                      </label>
                      <input
                        type="text"
                        value={docHospital}
                        onChange={(e) => setDocHospital(e.target.value)}
                        className="form-input"
                        placeholder="e.g. Apollo Specialty Hospital, Bengaluru"
                      />
                    </div>
                  </div>

                  <div className="onboard-input-row">
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                        Medical Degrees & Qualifications
                      </label>
                      <input
                        type="text"
                        value={docQualifications}
                        onChange={(e) => setDocQualifications(e.target.value)}
                        className="form-input"
                        placeholder="e.g. MBBS, MD, DM (Cardiology)"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                      Available Daily Consultation Time Slots
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.65rem' }}>
                      {docSlots.map((slot) => (
                        <span
                          key={slot}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '20px',
                            background: 'rgba(52, 211, 153, 0.12)',
                            border: '1px solid rgba(52, 211, 153, 0.3)',
                            color: '#34d399',
                            fontSize: '0.8rem',
                          }}
                        >
                          <Clock size={12} />
                          <span>{slot}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(slot)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: 0,
                              lineHeight: 1,
                            }}
                            title="Remove slot"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '320px' }}>
                      <input
                        type="text"
                        placeholder="Add slot (e.g. 04:00 PM)"
                        value={newSlotInput}
                        onChange={(e) => setNewSlotInput(e.target.value)}
                        className="form-input"
                        style={{ fontSize: '0.82rem' }}
                      />
                      <button
                        type="button"
                        onClick={handleAddSlot}
                        className="sample-btn"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                      Professional Clinical Bio
                    </label>
                    <textarea
                      placeholder="Doctor summary, specializations, and patient care philosophy..."
                      value={docBio}
                      onChange={(e) => setDocBio(e.target.value)}
                      className="form-input"
                      rows={3}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="send-btn"
                    style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '0.75rem' }}
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 size={16} className="node-spinner" />
                        <span>Saving Profile Changes...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Save Profile & Slot Availability</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : mode === 'onboard' ? (
              <div className="onboard-fullpage-card">
                <div className="onboard-header-note">
                  <Sparkles size={18} color="#8b5cf6" />
                  <span>
                    Onboard a new board-certified specialist doctor into the SQLite repository. New doctors will immediately be recommended by the AI Triage agent and available for live bookings.
                  </span>
                </div>

                {onboardSuccess ? (
                  <div className="onboard-success-box">
                    <CheckCircle2 size={36} color="#10b981" />
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.5rem' }}>Doctor Successfully Registered!</div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      Redirecting back to Doctor Clinical Portal queue...
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleOnboardSubmit} className="onboard-form" style={{ marginTop: '1rem' }}>
                    <div className="onboard-input-row">
                      <input
                        type="text"
                        placeholder="Doctor Full Name (e.g. Dr. Ananya Sen) *"
                        value={onboardName}
                        onChange={(e) => setOnboardName(e.target.value)}
                        className="form-input"
                        required
                      />
                      <select
                        value={onboardSpecialty}
                        onChange={(e) => setOnboardSpecialty(e.target.value)}
                        className="form-input"
                        style={{ maxWidth: '190px' }}
                      >
                        <option value="Pulmonologist">Pulmonologist</option>
                        <option value="Cardiologist">Cardiologist</option>
                        <option value="Neurologist">Neurologist</option>
                        <option value="Endocrinologist">Endocrinologist</option>
                        <option value="Gynecologist">Gynecologist</option>
                        <option value="General Physician">General Physician</option>
                      </select>
                    </div>

                    <div className="onboard-input-row">
                      <input
                        type="text"
                        placeholder="Qualifications (e.g. MBBS, MD, DM, AIIMS) *"
                        value={onboardQualifications}
                        onChange={(e) => setOnboardQualifications(e.target.value)}
                        className="form-input"
                        required
                      />
                      <input
                        type="text"
                        placeholder="NMC Reg # (e.g. NMC-59281) *"
                        value={onboardRegNum}
                        onChange={(e) => setOnboardRegNum(e.target.value)}
                        className="form-input"
                        style={{ maxWidth: '170px' }}
                        required
                      />
                    </div>

                    <div className="onboard-input-row">
                      <input
                        type="text"
                        placeholder="Hospital Affiliation (e.g. Apollo Hospital, Delhi) *"
                        value={onboardHospital}
                        onChange={(e) => setOnboardHospital(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="onboard-input-row">
                      <input
                        type="number"
                        placeholder="Years Exp"
                        value={onboardExp}
                        onChange={(e) => setOnboardExp(e.target.value)}
                        className="form-input"
                        style={{ maxWidth: '120px' }}
                      />
                      <input
                        type="number"
                        placeholder="Consultation Fee (₹)"
                        value={onboardFee}
                        onChange={(e) => setOnboardFee(e.target.value)}
                        className="form-input"
                        style={{ maxWidth: '170px' }}
                      />
                      <input
                        type="text"
                        placeholder="Languages Spoken"
                        value={onboardLanguages}
                        onChange={(e) => setOnboardLanguages(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <textarea
                      placeholder="Doctor Bio & Clinical Focus Areas..."
                      value={onboardBio}
                      onChange={(e) => setOnboardBio(e.target.value)}
                      className="form-input"
                      rows={3}
                    />

                    {onboardError && (
                      <div className="form-error-alert">
                        <AlertTriangle size={14} />
                        <span>{onboardError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={onboardSubmitting}
                      className="send-btn"
                      style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem', padding: '0.75rem' }}
                    >
                      {onboardSubmitting ? (
                        <>
                          <Loader2 size={16} className="node-spinner" />
                          <span>Registering Specialist to SQLite...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          <span>Register & Add Specialist to SQLite</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <>
                {/* Specialty Filter Bar */}
                <div className="specialty-filter-bar" style={{ margin: '0 0 1rem', borderRadius: '8px' }}>
                  {specialties.map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      className={`spec-filter-btn ${filterSpecialty === spec ? 'active' : ''}`}
                      onClick={() => setFilterSpecialty(spec)}
                    >
                      {spec}
                    </button>
                  ))}
                </div>

                {filteredAppointments.length === 0 ? (
                  <div className="fullpage-empty-box">
                    <Calendar size={36} color="#71717a" />
                    <div style={{ fontWeight: 600, marginTop: '0.75rem' }}>No Appointments Found</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      No incoming patient consultations match the selected specialty filter.
                    </div>
                  </div>
                ) : (
                  <div className="fullpage-two-col-grid">
                    {filteredAppointments.map((apt) => renderAppointmentCard(apt, true))}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* ── PATIENT FULLPAGE VIEW ── */
          <>
            {/* Summary Counters */}
            <div className="metrics-summary-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="metric-tile-card">
                <div className="metric-tile-top">
                  <span className="metric-tile-label">Total Passes</span>
                  <Calendar size={18} color="#3b82f6" />
                </div>
                <div className="metric-tile-number">{appointments.length}</div>
                <div className="metric-tile-subtext">Booked telemedicine sessions</div>
              </div>

              <div className="metric-tile-card">
                <div className="metric-tile-top">
                  <span className="metric-tile-label">Upcoming & Confirmed</span>
                  <Clock size={18} color="#10b981" />
                </div>
                <div className="metric-tile-number" style={{ color: '#10b981' }}>
                  {pendingCount}
                </div>
                <div className="metric-tile-subtext">Ready for live WebRTC call</div>
              </div>

              <div className="metric-tile-card">
                <div className="metric-tile-top">
                  <span className="metric-tile-label">Completed Consults</span>
                  <CheckCircle2 size={18} color="#8b5cf6" />
                </div>
                <div className="metric-tile-number" style={{ color: '#a78bfa' }}>
                  {completedCount}
                </div>
                <div className="metric-tile-subtext">With prescription issued</div>
              </div>

              <div className="metric-tile-card">
                <div className="metric-tile-top">
                  <span className="metric-tile-label">Total Paid Fees</span>
                  <CreditCard size={18} color="#f59e0b" />
                </div>
                <div className="metric-tile-number" style={{ color: '#34d399' }}>
                  ₹{totalPayout}
                </div>
                <div className="metric-tile-subtext">Verified UPI / Card receipts</div>
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="fullpage-empty-box">
                <Calendar size={36} color="#71717a" />
                <div style={{ fontWeight: 600, marginTop: '0.75rem' }}>No Consultations Booked Yet</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  Ask a clinical question in Clinical AI to receive grounded recommendations and book a verified telemedicine appointment.
                </div>
                {onBackToChat && (
                  <button
                    type="button"
                    className="send-btn"
                    onClick={onBackToChat}
                    style={{ marginTop: '1rem' }}
                  >
                    Go to Clinical AI Chat
                  </button>
                )}
              </div>
            ) : (
              <div className="fullpage-two-col-grid">
                {filteredAppointments.map((apt) => renderAppointmentCard(apt, true))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────────
     DRAWER VIEW RENDERING (Fallback Modal Mode)
     ───────────────────────────────────────────────────────────────────────── */
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="drawer-box consultations-drawer-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="panel-header" style={{ justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {mode === 'doctor' ? (
              <Stethoscope size={20} color="#10b981" />
            ) : mode === 'onboard' ? (
              <UserPlus size={20} color="#8b5cf6" />
            ) : (
              <Calendar size={20} color="#3b82f6" />
            )}
            <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>
              {mode === 'doctor'
                ? 'Doctor Clinical Telemedicine Portal'
                : mode === 'onboard'
                ? 'Onboard New Specialist Doctor'
                : 'My Telemedicine Consultations'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="icon-btn"
              onClick={fetchAppointments}
              title="Refresh Consultations"
            >
              <RefreshCw size={16} className={loading ? 'node-spinner' : ''} />
            </button>
            <button type="button" className="icon-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 3 Tab Navigation */}
        <div className="drawer-mode-tabs">
          <button
            type="button"
            className={`drawer-tab-btn ${mode === 'patient' ? 'active' : ''}`}
            onClick={() => setMode('patient')}
          >
            <Calendar size={13} />
            <span>Patient Passes ({appointments.length})</span>
          </button>
          <button
            type="button"
            className={`drawer-tab-btn ${mode === 'doctor' ? 'active' : ''}`}
            onClick={() => setMode('doctor')}
          >
            <Stethoscope size={13} />
            <span>Doctor Portal</span>
          </button>
          <button
            type="button"
            className={`drawer-tab-btn ${mode === 'onboard' ? 'active' : ''}`}
            onClick={() => setMode('onboard')}
          >
            <UserPlus size={13} />
            <span>+ Onboard Doctor</span>
          </button>
        </div>

        <div className="drawer-appointments-list">
          {filteredAppointments.map((apt) => renderAppointmentCard(apt, false))}
        </div>
      </div>
    </div>
  );
}
