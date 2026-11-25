import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Stethoscope,
  User,
  HeartPulse,
  Lock,
  Mail,
  Phone,
  Building,
  Award,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { loginUser, registerUser } from '../services/api';

export default function AuthPage({
  onAuthSuccess,
  initialMode = 'signin',
  initialRole = 'PATIENT',
  onBackToHome,
}) {
  const [role, setRole] = useState(initialRole || 'PATIENT'); // 'PATIENT' or 'DOCTOR'
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialMode) {
      setIsSignUp(initialMode === 'signup');
    }
  }, [initialMode]);

  useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
    }
  }, [initialRole]);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');

  // Doctor-specific fields
  const [specialty, setSpecialty] = useState('General Physician');
  const [qualifications, setQualifications] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('');
  const [experienceYears, setExperienceYears] = useState(8);
  const [consultationFee, setConsultationFee] = useState(800);
  const [languages, setLanguages] = useState('English, Hindi');
  const [bio, setBio] = useState('');

  const handleQuickDemoPatient = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginUser({
        email: 'patient@clinguard.health',
        password: 'patient123',
        role: 'PATIENT',
      });
      onAuthSuccess(res.user, res.token);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Demo login failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoDoctor = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginUser({
        email: 'arvind@clinguard.health',
        password: 'doctor123',
        role: 'DOCTOR',
      });
      onAuthSuccess(res.user, res.token);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Demo login failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!fullName.trim() || !email.trim() || !password.trim()) {
          throw new Error('Please fill in all required fields.');
        }

        const payload = {
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          phone: phone.trim(),
          age: age ? parseInt(age, 10) : null,
        };

        if (role === 'DOCTOR') {
          payload.specialty = specialty;
          payload.qualifications = qualifications.trim() || 'MBBS, MD';
          payload.registration_number = registrationNumber.trim() || 'NMC-REG';
          payload.hospital_affiliation = hospitalAffiliation.trim() || 'Clinical Telehealth Center';
          payload.experience_years = parseInt(experienceYears, 10) || 5;
          payload.consultation_fee = parseInt(consultationFee, 10) || 800;
          payload.languages = languages.trim();
          payload.bio = bio.trim() || `Specialist Consultant in ${specialty}.`;
        }

        const res = await registerUser(payload);
        onAuthSuccess(res.user, res.token);
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter your email and password.');
        }
        const res = await loginUser({
          email: email.trim().toLowerCase(),
          password,
          role,
        });
        onAuthSuccess(res.user, res.token);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Authentication failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper auth-viewport">
      {/* Top Navigation Bar: Brand Icon & Wordmark + Back to Home */}
      <header className="auth-top-nav">
        <div
          className="auth-brand-lockup"
          onClick={onBackToHome}
          role={onBackToHome ? 'button' : undefined}
          tabIndex={onBackToHome ? 0 : undefined}
          title={onBackToHome ? 'Return to Home' : undefined}
        >
          <div className="auth-brand-icon-wrapper">
            <HeartPulse className="auth-brand-icon" size={20} />
          </div>
          <div className="auth-brand-text">
            <span className="auth-brand-title">ClinGuard Telehealth</span>
            <span className="auth-brand-tagline">clinguard.health</span>
          </div>
        </div>

        {onBackToHome && (
          <button
            type="button"
            className="auth-back-home-link"
            onClick={onBackToHome}
            aria-label="Back to Home"
          >
            <ArrowLeft size={15} />
            <span>← Back to Home</span>
          </button>
        )}
      </header>

      {/* Centered Crisp White Elevated Card Container */}
      <div className="auth-card-container">
        <div className="auth-card-proton">
          {/* Role Switcher Pill Tabs at top of Card */}
          <div className="proton-role-tabs" role="tablist" aria-label="Account Role">
            <button
              type="button"
              role="tab"
              aria-selected={role === 'PATIENT'}
              className={`proton-role-tab ${role === 'PATIENT' ? 'active-patient' : ''}`}
              onClick={() => {
                setRole('PATIENT');
                setError(null);
              }}
            >
              <User size={16} />
              <span>Patient Portal</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={role === 'DOCTOR'}
              className={`proton-role-tab ${role === 'DOCTOR' ? 'active-doctor' : ''}`}
              onClick={() => {
                setRole('DOCTOR');
                setError(null);
              }}
            >
              <Stethoscope size={16} />
              <span>Doctor & Specialist</span>
            </button>
          </div>

          {/* Dynamic Card Header: Title & Subtitle */}
          <div className="proton-card-header">
            <h1 className="proton-card-title">
              {isSignUp ? (
                <>Create your <span className="cursive-serif-accent">ClinGuard account</span></>
              ) : (
                <>Sign in to <span className="cursive-serif-accent">ClinGuard</span></>
              )}
            </h1>
            <p className="proton-card-subtitle">
              {isSignUp
                ? role === 'PATIENT'
                  ? 'Create your verified patient profile for clinical AI & consultations.'
                  : "Join ClinGuard's verified specialist network & telehealth practice."
                : role === 'PATIENT'
                ? 'Access evidence-grounded clinical decisions and specialist triage.'
                : 'Access incoming triage appointments and split-screen video room.'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} className="auth-error-icon" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="proton-auth-form" noValidate>
            {isSignUp && (
              <div className="proton-form-group">
                <label htmlFor="auth-fullName">
                  {role === 'DOCTOR' ? 'Doctor Full Name & Title *' : 'Full Name *'}
                </label>
                <div className="proton-input-wrapper">
                  <User size={16} className="proton-input-icon" />
                  <input
                    id="auth-fullName"
                    type="text"
                    required
                    placeholder={role === 'DOCTOR' ? 'e.g. Dr. Maya Ramanathan' : 'e.g. Rahul Sharma'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {isSignUp && role === 'PATIENT' && (
              <div className="proton-form-row">
                <div className="proton-form-group flex-1">
                  <label htmlFor="auth-age">Age</label>
                  <input
                    id="auth-age"
                    type="number"
                    min="1"
                    max="120"
                    placeholder="e.g. 34"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="proton-input-simple"
                  />
                </div>
                <div className="proton-form-group flex-2">
                  <label htmlFor="auth-phone">Mobile Number</label>
                  <div className="proton-input-wrapper">
                    <Phone size={16} className="proton-input-icon" />
                    <input
                      id="auth-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {isSignUp && role === 'DOCTOR' && (
              <>
                <div className="proton-form-row">
                  <div className="proton-form-group flex-1">
                    <label htmlFor="auth-specialty">Medical Specialty *</label>
                    <select
                      id="auth-specialty"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="proton-select"
                    >
                      <option value="Pulmonologist">Pulmonologist</option>
                      <option value="Cardiologist">Cardiologist</option>
                      <option value="Neurologist">Neurologist</option>
                      <option value="Endocrinologist">Endocrinologist</option>
                      <option value="Gynecologist">Gynecologist</option>
                      <option value="General Physician">General Physician</option>
                    </select>
                  </div>
                  <div className="proton-form-group flex-1">
                    <label htmlFor="auth-regno">NMC Registration # *</label>
                    <input
                      id="auth-regno"
                      type="text"
                      required
                      placeholder="e.g. NMC-84291"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      className="proton-input-simple"
                    />
                  </div>
                </div>

                <div className="proton-form-row">
                  <div className="proton-form-group flex-1">
                    <label htmlFor="auth-quals">Qualifications *</label>
                    <div className="proton-input-wrapper">
                      <Award size={16} className="proton-input-icon" />
                      <input
                        id="auth-quals"
                        type="text"
                        required
                        placeholder="e.g. MBBS, MD, DM"
                        value={qualifications}
                        onChange={(e) => setQualifications(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="proton-form-group flex-1">
                    <label htmlFor="auth-fee">Consultation Fee (₹)</label>
                    <input
                      id="auth-fee"
                      type="number"
                      min="100"
                      step="50"
                      placeholder="e.g. 850"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      className="proton-input-simple"
                    />
                  </div>
                </div>

                <div className="proton-form-group">
                  <label htmlFor="auth-hospital">Hospital Affiliation *</label>
                  <div className="proton-input-wrapper">
                    <Building size={16} className="proton-input-icon" />
                    <input
                      id="auth-hospital"
                      type="text"
                      required
                      placeholder="e.g. Apollo Specialty Hospital, Bengaluru"
                      value={hospitalAffiliation}
                      onChange={(e) => setHospitalAffiliation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="proton-form-group">
                  <label htmlFor="auth-bio">Clinical Bio / Specialization Focus</label>
                  <textarea
                    id="auth-bio"
                    rows={2}
                    placeholder="Brief overview of clinical expertise and patient care focus..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="proton-textarea"
                  />
                </div>
              </>
            )}

            <div className="proton-form-group">
              <label htmlFor="auth-email">Email Address *</label>
              <div className="proton-input-wrapper">
                <Mail size={16} className="proton-input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  placeholder={role === 'DOCTOR' ? 'doctor@hospital.org' : 'patient@example.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="proton-form-group">
              <label htmlFor="auth-password">Password *</label>
              <div className="proton-input-wrapper">
                <Lock size={16} className="proton-input-icon" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              className={`proton-submit-btn ${role === 'DOCTOR' ? 'doctor-theme' : 'patient-theme'}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin-icon" />
                  <span>Processing...</span>
                </>
              ) : isSignUp ? (
                <>
                  <span>{role === 'DOCTOR' ? 'Complete Specialist Registration' : 'Create Patient Account'}</span>
                  <ArrowRight size={16} />
                </>
              ) : (
                <>
                  <span>{role === 'DOCTOR' ? 'Sign In to Specialist Workspace' : 'Sign In to Patient Portal'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Subtle 1-Click Evaluator Demo Pill */}
          <div className="proton-demo-pill">
            <div className="proton-demo-label">
              <Sparkles size={14} className="proton-demo-sparkle" />
              <span>Instant Evaluator Demo Access</span>
            </div>
            {role === 'PATIENT' ? (
              <button
                type="button"
                className="proton-demo-action patient"
                onClick={handleQuickDemoPatient}
                disabled={loading}
              >
                <span>1-Click Demo Patient (Rahul Sharma)</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                className="proton-demo-action doctor"
                onClick={handleQuickDemoDoctor}
                disabled={loading}
              >
                <span>1-Click Demo Specialist (Dr. Arvind Swaminathan)</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* Bottom Mode Switch Link */}
          <div className="proton-mode-toggle">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className="proton-link-btn"
                  onClick={() => {
                    setIsSignUp(false);
                    setError(null);
                  }}
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                New to ClinGuard?{' '}
                <button
                  type="button"
                  className="proton-link-btn"
                  onClick={() => {
                    setIsSignUp(true);
                    setError(null);
                  }}
                >
                  Create account
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Security Footnote */}
        <div className="proton-security-footer">
          <ShieldCheck size={15} className="proton-security-shield" />
          <span>256-Bit Encrypted Healthcare Session & Consent Governance</span>
        </div>
      </div>
    </div>
  );
}
