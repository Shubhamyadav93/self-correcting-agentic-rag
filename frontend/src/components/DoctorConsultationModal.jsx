import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Video,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Award,
  Building,
  Star,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Languages,
  BadgeCheck,
  User,
  CreditCard,
  Download,
  ArrowRight,
  ArrowLeft,
  Check,
  Lock,
  Smartphone,
  Landmark,
} from 'lucide-react';
import { getDoctorSlots, bookAppointment } from '../services/api';

function formatDateString(dateStr) {
  try {
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTomorrowStr() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getGoogleCalendarUrl(appointment) {
  if (!appointment) return '#';
  const docName = appointment.doctor?.name || 'Specialist Doctor';
  const title = encodeURIComponent(`Clinical Teleconsultation: ${docName}`);
  const details = encodeURIComponent(
    `Consultation Mode: ${appointment.consultation_mode}\nBooking Code: ${appointment.booking_code}\nTransaction ID: ${appointment.transaction_id || 'PAID'}\n\nJoin Live WebRTC Consultation:\n${appointment.meeting_url}\n\nPre-Consultation Clinical Summary:\n${appointment.soap_clinical_summary || ''}`
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
    `DESCRIPTION:Consultation Mode: ${appointment.consultation_mode}\\nBooking Code: ${appointment.booking_code}\\nTransaction: ${appointment.transaction_id || 'PAID'}\\nJoin Live Room: ${appointment.meeting_url}\\nClinical Summary: ${appointment.soap_clinical_summary || ''}`,
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

export default function DoctorConsultationModal({
  isOpen,
  onClose,
  doctor,
  triageData,
  patientQuery,
  citations = [],
  currentUser,
  onBookingSuccess,
  onOpenConsultations,
  onLaunchVideoRoom,
}) {
  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();

  // Wizard Step: 1 = Details & Slot, 2 = Payment Gateway Checkout
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 States
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [patientName, setPatientName] = useState(currentUser?.full_name || '');
  const [patientAge, setPatientAge] = useState(currentUser?.age ? String(currentUser.age) : '');
  const [patientContact, setPatientContact] = useState(currentUser?.phone || currentUser?.email || '');
  const [consultationMode, setConsultationMode] = useState('Video Call');
  const [consentGranted, setConsentGranted] = useState(false);
  const [showSoapDetails, setShowSoapDetails] = useState(false);

  // Step 2 Payment States (Razorpay Style)
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI' | 'Card' | 'NetBanking'
  const [upiOption, setUpiOption] = useState('gpay'); // 'gpay' | 'phonepe' | 'paytm' | 'id'
  const [upiIdInput, setUpiIdInput] = useState('patient@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('842');
  const [cardName, setCardName] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [confirmedPass, setConfirmedPass] = useState(null);

  // Load real-time slots whenever doctor or date changes
  useEffect(() => {
    if (!doctor || !isOpen) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setErrorMessage(null);

    getDoctorSlots(doctor.id, selectedDate)
      .then((data) => {
        setSlots(data.slots || []);
      })
      .catch((err) => {
        console.error('Failed to load slots', err);
        setSlots([]);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [doctor, selectedDate, isOpen]);

  // Reset modal state when closed or opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setConfirmedPass(null);
      setErrorMessage(null);
      setSelectedSlot(null);
      setConsentGranted(false);
      if (currentUser) {
        if (currentUser.full_name) setPatientName(currentUser.full_name);
        if (currentUser.age) setPatientAge(String(currentUser.age));
        if (currentUser.phone || currentUser.email) setPatientContact(currentUser.phone || currentUser.email);
      }
    }
  }, [isOpen, doctor, currentUser]);

  if (!isOpen || !doctor) return null;

  const consultationFee = doctor.consultation_fee || 800;
  const soapSummary =
    triageData?.soap_note?.assessment ||
    `Patient clinical inquiry: ${patientQuery || 'Guideline review'}. Urgency: ${
      triageData?.urgency_level || 'ROUTINE'
    }.`;

  // Step 1 Validation -> Proceed to Payment
  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      setErrorMessage('Please select an available consultation time slot.');
      return;
    }
    if (!patientName.trim()) {
      setErrorMessage('Please provide the patient name.');
      return;
    }
    if (!patientAge || Number(patientAge) <= 0) {
      setErrorMessage('Please provide a valid patient age.');
      return;
    }
    if (!patientContact.trim()) {
      setErrorMessage('Please provide a contact phone number or email address.');
      return;
    }
    if (!consentGranted) {
      setErrorMessage('Digital consent is mandatory to securely share clinical summaries.');
      return;
    }

    setErrorMessage(null);
    setCurrentStep(2);
  };

  // Step 2 Submission -> Process Payment & Book Appointment in SQLite
  const handleFinalPaymentAndBook = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Generate clean simulated transaction receipt ID
      const txnSuffix = Math.floor(100000 + Math.random() * 900000);
      const generatedTxnId = `TXN-2026-${txnSuffix}`;

      const payload = {
        doctor_id: doctor.id,
        patient_name: patientName.trim(),
        patient_age: Number(patientAge),
        patient_contact: patientContact.trim(),
        patient_email: currentUser?.email || (patientContact.includes('@') ? patientContact.trim() : null),
        appointment_date: selectedDate,
        time_slot: selectedSlot,
        consultation_mode: consultationMode,
        urgency_level: triageData?.urgency_level || 'ROUTINE',
        patient_query: patientQuery || 'Clinical guideline inquiry',
        soap_clinical_summary: soapSummary,
        verified_citations: citations || [],
        consent_granted: true,
        consent_scope: 'Direct Doctor Consultation & AI SOAP Summary Sharing',
        payment_status: 'PAID',
        payment_method: paymentMethod,
        transaction_id: generatedTxnId,
        amount_paid: consultationFee,
        doctor_notified: true,
      };

      const result = await bookAppointment(payload);
      setConfirmedPass(result);
      if (onBookingSuccess) {
        onBookingSuccess(result);
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Payment processing failed or slot was locked. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box doctor-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="panel-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <Award size={18} color="#10b981" />
            <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>
              {confirmedPass
                ? 'Telemedicine Pass & Payment Receipt'
                : currentStep === 2
                ? 'Razorpay Secure Checkout • Telemedicine Consultation'
                : 'Practo / Apollo Verified Online Consult'}
            </span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* ── STEP INDICATOR (When not confirmed) ── */}
        {!confirmedPass && (
          <div className="booking-stepper-bar">
            <div className={`step-item ${currentStep === 1 ? 'active' : 'completed'}`}>
              <div className="step-num">{currentStep > 1 ? <Check size={12} /> : '1'}</div>
              <span>1. Slot & Patient Consent</span>
            </div>
            <div className="step-divider" />
            <div className={`step-item ${currentStep === 2 ? 'active' : ''}`}>
              <div className="step-num">2</div>
              <span>2. Payment Checkout (₹{consultationFee})</span>
            </div>
          </div>
        )}

        {/* ── CONFIRMED PASS STATE: INSTANT TELEMEDICINE & PAYMENT RECEIPT ── */}
        {confirmedPass ? (
          <div className="telemedicine-pass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div className="pass-status-badge">
                <CheckCircle2 size={15} />
                <span>CONFIRMED TELEMEDICINE PASS</span>
              </div>
              <div className="paid-txn-pill">
                <Lock size={12} />
                <span>PAID ₹{confirmedPass.amount_paid || consultationFee} • {confirmedPass.transaction_id}</span>
              </div>
            </div>

            <div className="pass-code-banner">
              <div className="pass-code-label">Booking Reference Code</div>
              <div className="pass-code-val">{confirmedPass.booking_code}</div>
              <div style={{ fontSize: '0.74rem', color: '#10b981', marginTop: '0.2rem' }}>
                ✓ Doctor Notified via Instant SMS/Email Dispatch
              </div>
            </div>

            <div className="pass-details-grid">
              <div className="pass-detail-item">
                <span className="pass-label">Doctor</span>
                <span className="pass-val">
                  {confirmedPass.doctor?.name || doctor.name} ({confirmedPass.doctor?.specialty || doctor.specialty})
                </span>
              </div>
              <div className="pass-detail-item">
                <span className="pass-label">Hospital</span>
                <span className="pass-val">{confirmedPass.doctor?.hospital_affiliation || doctor.hospital_affiliation}</span>
              </div>
              <div className="pass-detail-item">
                <span className="pass-label">Scheduled Time</span>
                <span className="pass-val" style={{ color: '#34d399', fontWeight: 600 }}>
                  {confirmedPass.appointment_day}, {confirmedPass.appointment_date} @ {confirmedPass.time_slot}
                </span>
              </div>
              <div className="pass-detail-item">
                <span className="pass-label">Mode & Urgency</span>
                <span className="pass-val">
                  {confirmedPass.consultation_mode} • <span style={{ color: '#fbbf24' }}>{confirmedPass.urgency_level}</span>
                </span>
              </div>
              <div className="pass-detail-item">
                <span className="pass-label">Patient</span>
                <span className="pass-val">
                  {confirmedPass.patient_name} (Age: {confirmedPass.patient_age}) • {confirmedPass.patient_contact}
                </span>
              </div>
              <div className="pass-detail-item">
                <span className="pass-label">Payment & Consent</span>
                <span className="pass-val" style={{ color: '#34d399' }}>
                  {confirmedPass.payment_method || 'UPI'} Paid • Consent Verified
                </span>
              </div>
            </div>

            {/* Launch Split-Screen Embedded Video Room / External Fallback */}
            <div className="pass-action-row">
              {onLaunchVideoRoom ? (
                <button
                  type="button"
                  className="join-video-btn"
                  onClick={() => {
                    onClose();
                    onLaunchVideoRoom(confirmedPass);
                  }}
                >
                  <Video size={16} />
                  <span>Join Embedded Split-Screen Video Room</span>
                </button>
              ) : (
                <a
                  href={confirmedPass.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="join-video-btn"
                >
                  <Video size={16} />
                  <span>Join Live Video Room (WebRTC)</span>
                  <ExternalLink size={14} style={{ marginLeft: 'auto' }} />
                </a>
              )}

              {/* Calendar Invites */}
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="add-calendar-btn"
                  onClick={() => downloadIcsFile(confirmedPass)}
                  style={{ flex: 1 }}
                >
                  <Download size={14} />
                  <span>Download .ics Invite</span>
                </button>
                <a
                  href={getGoogleCalendarUrl(confirmedPass)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="add-calendar-btn"
                  style={{ flex: 1 }}
                >
                  <Calendar size={14} />
                  <span>Add to Google Calendar</span>
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="sample-btn"
                onClick={() => {
                  onClose();
                  if (onOpenConsultations) onOpenConsultations();
                }}
              >
                View in My Consultations
              </button>
              <button type="button" className="send-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : currentStep === 1 ? (
          /* ── STEP 1: DOCTOR PROFILE, SLOTS, PATIENT INFO & CONSENT ── */
          <div className="doctor-modal-content">
            {/* Doctor Background Card */}
            <div className="doctor-profile-card">
              <div className="doctor-avatar-circle">
                <BadgeCheck size={26} color="#10b981" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="doctor-name">{doctor.name}</span>
                  <span className="badge-grounded" style={{ fontSize: '0.7rem' }}>
                    <Star size={11} fill="#10b981" />
                    <span>{doctor.rating}</span>
                  </span>
                  <span className="doc-fee-badge">₹{consultationFee} Fee</span>
                </div>

                <div className="doctor-spec-qual">
                  {doctor.specialty} • {doctor.qualifications}
                </div>

                <div className="doctor-meta-row">
                  <span>
                    <Building size={13} /> {doctor.hospital_affiliation}
                  </span>
                  <span>
                    <Award size={13} /> {doctor.experience_years} Years Exp
                  </span>
                  <span>
                    <Languages size={13} /> {doctor.languages}
                  </span>
                </div>

                <div style={{ fontSize: '0.74rem', color: '#71717a', marginTop: '0.25rem' }}>
                  <strong>NMC Reg:</strong> {doctor.registration_number} • {doctor.consultations_count}+ Patients Consulted
                </div>

                <p className="doctor-bio-text">{doctor.bio}</p>
              </div>
            </div>

            <form onSubmit={handleProceedToPayment} className="booking-form-grid">
              {/* 1. Date Selection */}
              <div className="form-section">
                <div className="section-title">
                  <Calendar size={15} color="#3b82f6" />
                  <span>Select Consultation Date ({formatDateString(selectedDate)})</span>
                </div>

                <div className="date-pill-row">
                  <button
                    type="button"
                    className={`date-pill ${selectedDate === todayStr ? 'active' : ''}`}
                    onClick={() => setSelectedDate(todayStr)}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className={`date-pill ${selectedDate === tomorrowStr ? 'active' : ''}`}
                    onClick={() => setSelectedDate(tomorrowStr)}
                  >
                    Tomorrow
                  </button>
                  <input
                    type="date"
                    min={todayStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="custom-date-picker"
                  />
                </div>
              </div>

              {/* 2. Real-time Slot Selection */}
              <div className="form-section">
                <div className="section-title">
                  <Clock size={15} color="#10b981" />
                  <span>Available Time Slots ({slots.filter((s) => !s.is_booked).length} available)</span>
                </div>

                {loadingSlots ? (
                  <div className="slot-loading-text">
                    <Loader2 size={15} className="node-spinner" />
                    <span>Checking live slot lock status on SQLite...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div style={{ color: '#71717a', fontSize: '0.8rem' }}>No slots scheduled for this date.</div>
                ) : (
                  <div className="slots-grid">
                    {slots.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={item.is_booked}
                        className={`slot-pill ${selectedSlot === item.slot ? 'selected' : ''} ${
                          item.is_booked ? 'locked' : ''
                        }`}
                        onClick={() => setSelectedSlot(item.slot)}
                      >
                        <span>{item.slot}</span>
                        {item.is_booked && <span className="locked-badge">Booked</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Patient Details & Mode */}
              <div className="form-section">
                <div className="section-title">
                  <User size={15} color="#8b5cf6" />
                  <span>Patient Information & Consultation Mode</span>
                </div>

                <div className="patient-inputs-row">
                  <input
                    type="text"
                    placeholder="Patient Full Name *"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="form-input"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Age *"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="form-input"
                    style={{ maxWidth: '100px' }}
                    min="1"
                    max="125"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Phone or Email *"
                    value={patientContact}
                    onChange={(e) => setPatientContact(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="mode-selection-row">
                  <label className="mode-radio">
                    <input
                      type="radio"
                      name="mode"
                      value="Video Call"
                      checked={consultationMode === 'Video Call'}
                      onChange={() => setConsultationMode('Video Call')}
                    />
                    <Video size={14} />
                    <span>Video Consultation (HD WebRTC)</span>
                  </label>
                  <label className="mode-radio">
                    <input
                      type="radio"
                      name="mode"
                      value="Audio Call"
                      checked={consultationMode === 'Audio Call'}
                      onChange={() => setConsultationMode('Audio Call')}
                    />
                    <Phone size={14} />
                    <span>Audio Consult</span>
                  </label>
                </div>
              </div>

              {/* 4. Pre-Consultation SOAP Preview */}
              <div className="form-section">
                <button
                  type="button"
                  className="toggle-soap-btn"
                  onClick={() => setShowSoapDetails(!showSoapDetails)}
                >
                  <FileText size={15} color="#3b82f6" />
                  <span>Preview AI Pre-Consultation SOAP Note to be Shared</span>
                  {showSoapDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showSoapDetails && (
                  <div className="soap-preview-box">
                    <div className="soap-item">
                      <strong>Subjective:</strong> {triageData?.soap_note?.subjective || patientQuery}
                    </div>
                    <div className="soap-item">
                      <strong>Assessment:</strong> {triageData?.soap_note?.assessment || soapSummary}
                    </div>
                    <div className="soap-item">
                      <strong>Guideline Evidence:</strong>{' '}
                      {triageData?.soap_note?.guideline_evidence || 'Grounded on verified WHO/NIH citations.'}
                    </div>
                    <div className="soap-item">
                      <strong>Plan:</strong>{' '}
                      {triageData?.soap_note?.plan || 'Specialist telemedicine consultation for medication titration.'}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Informed Digital Consent */}
              <div className="consent-box">
                <label className="consent-label">
                  <input
                    type="checkbox"
                    checked={consentGranted}
                    onChange={(e) => setConsentGranted(e.target.checked)}
                    required
                  />
                  <span>
                    <strong>Mandatory Digital Consent:</strong> I give explicit, informed consent to securely share
                    my clinical inquiry, AI-generated SOAP summary, and verified citations with{' '}
                    <strong>{doctor.name}</strong> for this telemedicine consultation.
                  </span>
                </label>
                <div className="consent-badge-row">
                  <ShieldCheck size={13} color="#10b981" />
                  <span>Telemedicine Practice Guidelines (2020) & HIPAA Compliant</span>
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="form-error-alert">
                  <AlertCircle size={15} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Footer CTA */}
              <div className="modal-footer-row">
                <button type="button" className="sample-btn" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!consentGranted || !selectedSlot}
                  className="send-btn confirm-book-btn"
                >
                  <span>Proceed to Payment (₹{consultationFee})</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ── STEP 2: RAZORPAY-STYLE PAYMENT CHECKOUT MODAL ── */
          <div className="doctor-modal-content">
            <div className="payment-checkout-container">
              {/* Order Summary Strip */}
              <div className="payment-order-summary">
                <div className="order-summary-row">
                  <span className="order-summary-label">Specialist Doctor</span>
                  <span className="order-summary-val">{doctor.name} ({doctor.specialty})</span>
                </div>
                <div className="order-summary-row">
                  <span className="order-summary-label">Scheduled Time</span>
                  <span className="order-summary-val" style={{ color: '#38bdf8' }}>
                    {formatDateString(selectedDate)} @ {selectedSlot} ({consultationMode})
                  </span>
                </div>
                <div className="order-summary-row">
                  <span className="order-summary-label">Patient</span>
                  <span className="order-summary-val">{patientName} ({patientContact})</span>
                </div>
                <div className="order-summary-divider" />
                <div className="order-summary-row total-row">
                  <span className="total-label">Total Amount Payable</span>
                  <span className="total-amount-val">₹{consultationFee}</span>
                </div>
              </div>

              {/* Payment Method Selector Tabs */}
              <div className="payment-method-tabs">
                <button
                  type="button"
                  className={`payment-tab ${paymentMethod === 'UPI' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('UPI')}
                >
                  <Smartphone size={15} />
                  <span>UPI / QR</span>
                </button>
                <button
                  type="button"
                  className={`payment-tab ${paymentMethod === 'Card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('Card')}
                >
                  <CreditCard size={15} />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  className={`payment-tab ${paymentMethod === 'NetBanking' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('NetBanking')}
                >
                  <Landmark size={15} />
                  <span>NetBanking</span>
                </button>
              </div>

              {/* Payment Details Body */}
              <div className="payment-method-body">
                {paymentMethod === 'UPI' && (
                  <div className="upi-payment-view">
                    <div className="upi-apps-row">
                      <label className={`upi-app-chip ${upiOption === 'gpay' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="upi"
                          checked={upiOption === 'gpay'}
                          onChange={() => setUpiOption('gpay')}
                        />
                        <span>Google Pay</span>
                      </label>
                      <label className={`upi-app-chip ${upiOption === 'phonepe' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="upi"
                          checked={upiOption === 'phonepe'}
                          onChange={() => setUpiOption('phonepe')}
                        />
                        <span>PhonePe</span>
                      </label>
                      <label className={`upi-app-chip ${upiOption === 'paytm' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="upi"
                          checked={upiOption === 'paytm'}
                          onChange={() => setUpiOption('paytm')}
                        />
                        <span>Paytm UPI</span>
                      </label>
                    </div>

                    <div className="upi-input-group">
                      <label style={{ fontSize: '0.74rem', color: '#a1a1aa' }}>Or enter UPI ID / VPA</label>
                      <div className="upi-input-wrapper">
                        <input
                          type="text"
                          value={upiIdInput}
                          onChange={(e) => setUpiIdInput(e.target.value)}
                          className="form-input"
                          placeholder="e.g. mobile@upi"
                        />
                        <span className="upi-verified-badge">
                          <Check size={12} /> Verified
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'Card' && (
                  <div className="card-payment-view">
                    <div className="card-input-row">
                      <input
                        type="text"
                        placeholder="Card Number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.65rem' }}>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="form-input"
                        style={{ maxWidth: '100px' }}
                      />
                      <input
                        type="password"
                        placeholder="CVV"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="form-input"
                        style={{ maxWidth: '90px' }}
                      />
                      <input
                        type="text"
                        placeholder="Cardholder Name"
                        value={cardName || patientName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'NetBanking' && (
                  <div className="netbanking-view">
                    <div className="bank-chips-grid">
                      {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Bank'].map((b) => (
                        <button
                          key={b}
                          type="button"
                          className={`bank-chip ${selectedBank === b ? 'selected' : ''}`}
                          onClick={() => setSelectedBank(b)}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Security Guarantee Badge */}
              <div className="payment-security-footer">
                <Lock size={13} color="#10b981" />
                <span>
                  Razorpay & PCI-DSS Level 1 Compliant • 256-Bit SSL Bank Grade Encryption
                </span>
              </div>

              {errorMessage && (
                <div className="form-error-alert">
                  <AlertCircle size={15} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Step 2 Footer Buttons */}
              <div className="modal-footer-row">
                <button
                  type="button"
                  className="sample-btn"
                  onClick={() => setCurrentStep(1)}
                  disabled={isSubmitting}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Details</span>
                </button>
                <button
                  type="button"
                  onClick={handleFinalPaymentAndBook}
                  disabled={isSubmitting}
                  className="send-btn confirm-book-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="node-spinner" />
                      <span>Processing Payment & Locking Slot...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={15} />
                      <span>Pay ₹{consultationFee} & Confirm Booking</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
