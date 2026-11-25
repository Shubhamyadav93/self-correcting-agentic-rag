import React, { useState } from 'react';
import {
  HeartPulse,
  ShieldCheck,
  Check,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Stethoscope,
  Video,
  Calendar,
  Clock,
  Lock,
  FileText,
  ChevronRight,
  Layers,
  Award,
  Activity,
  Cpu,
  Phone,
  Zap,
  Building,
  CreditCard,
  User,
  Star,
  ExternalLink,
  Search,
  Database,
  Monitor,
} from 'lucide-react';

export default function LandingPage({ onNavigateAuth, onQuickDemo }) {
  // Interactive Live Product Preview Tab State
  // 1: Verified AI Triage | 2: Specialist Slot Lock | 3: Split-Screen Video + Rx
  const [activePreviewTab, setActivePreviewTab] = useState(1);

  // Platform Explorer Accordion State (0 to 4)
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  // Quick Demo Dropdown State
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const features = [
    {
      id: 'ai-assistant',
      title: 'Evidence-Grounded Clinical AI Assistant',
      tagline: 'Dual-grade WHO & PubMed verification',
      description:
        'Patients receive immediate, clear clinical guidance synthesized from official medical guidelines with exact page-level and PubMed citations, eliminating medical guesswork.',
      highlights: [
        'Strict extraction from vetted clinical guidelines',
        'Transparent citation source pills & page numbers',
        'Automatic SOAP format clinical structure',
      ],
      previewBadge: '100% Grounded',
      previewIcon: Sparkles,
      previewColor: '#10b981',
      stats: '0% Uncited Output',
    },
    {
      id: 'guardrails',
      title: 'Multi-Stage Hallucination Guardrails',
      tagline: 'Binary LLM relevance and groundedness judges',
      description:
        'Every medical claim is evaluated by independent grading agents before reaching the user. Any unverified statement triggers automated query reformulations and fallback searches.',
      highlights: [
        'Context Quality Grader evaluates document relevance',
        'Secondary Hallucination Checker validates every claim',
        'Automatic live medical search fallback if context is insufficient',
      ],
      previewBadge: 'Hallucination Free',
      previewIcon: ShieldCheck,
      previewColor: '#38bdf8',
      stats: '< 1.4s Verification Latency',
    },
    {
      id: 'triage',
      title: 'Smart Medical Specialist Triage',
      tagline: 'Immediate routing to board-certified doctors',
      description:
        'The platform automatically classifies clinical urgency (Routine, Priority, Urgent) and recommends the exact medical specialist (Pulmonologist, Cardiologist, Neurologist) needed.',
      highlights: [
        'Urgency classification with actionable clinical reasons',
        'Matches symptoms to certified specialist profiles',
        'Eliminates patient delay in critical care situations',
      ],
      previewBadge: 'Smart Triage',
      previewIcon: Stethoscope,
      previewColor: '#a855f7',
      stats: '6 Specialties Supported',
    },
    {
      id: 'booking',
      title: 'Real-Time Slot Lock & UPI Checkout',
      tagline: 'Conflict-free scheduling & verified receipts',
      description:
        'Book verified consultation passes with instant real-time slot conflict detection, integrated UPI/Card checkout, and encrypted digital patient consent capture.',
      highlights: [
        'Real-time SQLite database slot lock prevents double booking',
        'Instant simulated Razorpay/UPI receipt generation',
        'One-click Google Calendar & .ics export for patient reminders',
      ],
      previewBadge: 'Instant Confirmation',
      previewIcon: CreditCard,
      previewColor: '#f59e0b',
      stats: '100% Conflict-Free Slots',
    },
    {
      id: 'video-rx',
      title: 'Split-Screen WebRTC Room + Live Rx Pad',
      tagline: 'Doctor video and electronic prescription in one view',
      description:
        'Specialists conduct HD encrypted video consultations side-by-side with patient AI SOAP notes, verified citations, and an integrated post-call clinical prescription pad.',
      highlights: [
        'Embedded WebRTC room with 256-bit media encryption',
        'Real-time access to patient inquiry and pre-consult SOAP summary',
        'Instant post-call digital prescription notes saved to record',
      ],
      previewBadge: 'Integrated Care',
      previewIcon: Video,
      previewColor: '#ec4899',
      stats: 'HD WebRTC Encrypted',
    },
  ];

  const specialists = [
    {
      name: 'Dr. Arvind Swaminathan',
      specialty: 'Pulmonologist & Critical Care',
      qualifications: 'MBBS, MD (Pulmonary Medicine), DM (AIIMS New Delhi)',
      experience: '16+ Years Experience',
      regNo: 'NMC-48291',
      hospital: 'Apollo Specialty Hospital, Bengaluru',
      rating: 4.95,
      fee: '₹950',
    },
    {
      name: 'Dr. Siddharth Mukherjee',
      specialty: 'Interventional Cardiologist',
      qualifications: 'MBBS, MD, DM (Cardiology, CMC Vellore), FACC',
      experience: '18+ Years Experience',
      regNo: 'NMC-51209',
      hospital: 'Fortis Escorts Heart Institute, New Delhi',
      rating: 4.96,
      fee: '₹1,200',
    },
    {
      name: 'Dr. Radhika Sen',
      specialty: 'Chest Physician & Pulmonologist',
      qualifications: 'MBBS, MD (Chest Medicine, KEM Mumbai), FCCP (USA)',
      experience: '12+ Years Experience',
      regNo: 'NMC-39104',
      hospital: 'Manipal Hospital, Bengaluru',
      rating: 4.88,
      fee: '₹850',
    },
  ];

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-viewport">
      {/* ── 1. Top Navigation Bar (Proton.ai Style) ── */}
      <header className="landing-navbar">
        <div className="landing-nav-container">
          <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="landing-brand-icon">
              <HeartPulse size={20} color="#10b981" />
            </div>
            <span className="landing-brand-text">ClinGuard Telehealth</span>
          </div>

          <nav className="landing-nav-links">
            <button type="button" onClick={() => scrollToSection('platform')} className="nav-link-btn">
              Platform
            </button>
            <button type="button" onClick={() => scrollToSection('specialists')} className="nav-link-btn">
              Specialists
            </button>
            <button type="button" onClick={() => scrollToSection('clinical-safety')} className="nav-link-btn">
              Clinical Safety
            </button>
            <button type="button" onClick={() => scrollToSection('how-it-works')} className="nav-link-btn">
              How It Works
            </button>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="ghost-signin-btn"
              onClick={() => onNavigateAuth('signin')}
            >
              Sign in
            </button>
            <button
              type="button"
              className="primary-get-started-btn"
              onClick={() => onNavigateAuth('signup')}
            >
              <span>Get started</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. Hero Section ── */}
      <section className="landing-hero-section">
        <div className="landing-hero-glow"></div>
        <div className="landing-hero-content">
          <div className="hero-pill-tag">
            <span className="prompt-dot" />
            <span>PRECISION CLINICAL DECISION SUPPORT • BIOTECHNOLOGY PROTOCOL</span>
          </div>

          <h1 className="hero-headline">
            Clinical AI for patients and doctors, <span className="cursive-serif-accent">taking guidance from cell to clinic.</span>
          </h1>

          <p className="hero-subtitle">
            Global evidence-grounded clinical AI and telemedicine infrastructure. We synthesize multi-stage WHO, NIH, and CDC guidelines with molecular precision and direct peer escalation to licensed specialists.
          </p>

          <div className="hero-cta-group">
            <button
              type="button"
              className="hero-primary-cta"
              onClick={() => onNavigateAuth('signup')}
            >
              <span>Create free account</span>
              <ArrowRight size={16} />
            </button>

            <div className="demo-dropdown-wrapper">
              <button
                type="button"
                className="hero-secondary-cta"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
              >
                <Sparkles size={15} color="#34d399" />
                <span>1-Click Evaluator Demo ▾</span>
              </button>

              {showDemoMenu && (
                <div className="hero-demo-popover">
                  <div className="demo-popover-header">Instant Evaluator Access</div>
                  <button
                    type="button"
                    className="demo-popover-item"
                    onClick={() => {
                      setShowDemoMenu(false);
                      if (onQuickDemo) onQuickDemo('PATIENT');
                      else onNavigateAuth('signin', 'PATIENT');
                    }}
                  >
                    <User size={15} color="#34d399" />
                    <div>
                      <div className="demo-role-title">Patient Portal (Rahul Sharma)</div>
                      <div className="demo-role-desc">Clinical AI chat, triage & appointments</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="demo-popover-item"
                    onClick={() => {
                      setShowDemoMenu(false);
                      if (onQuickDemo) onQuickDemo('DOCTOR');
                      else onNavigateAuth('signin', 'DOCTOR');
                    }}
                  >
                    <Stethoscope size={15} color="#60a5fa" />
                    <div>
                      <div className="demo-role-title">Doctor Portal (Dr. Arvind Swaminathan)</div>
                      <div className="demo-role-desc">Triage queue, video consults & slot settings</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Interactive Live Product Preview Frame ("↓ Go ahead, click around") ── */}
          <div className="preview-frame-wrapper" id="platform">
            <div className="preview-frame-prompt">
              <span className="prompt-dot" />
              <span>↓ Go ahead, click around to explore live workspace capabilities</span>
            </div>

            <div className="preview-browser-card">
              {/* Browser Window Chrome */}
              <div className="preview-browser-chrome">
                <div className="chrome-dots">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </div>
                <div className="chrome-url-bar">
                  <Lock size={12} color="#10b981" />
                  <span className="url-domain">clinguard.health</span>
                  <span className="url-path">/workspace/clinical-triage</span>
                </div>
                <div className="chrome-right-badges">
                  <span className="live-status-pill">● System Online</span>
                </div>
              </div>

              {/* Workspace Preview Header Tabs */}
              <div className="preview-tab-switcher">
                <button
                  type="button"
                  className={`preview-tab-btn ${activePreviewTab === 1 ? 'active' : ''}`}
                  onClick={() => setActivePreviewTab(1)}
                >
                  <Sparkles size={14} />
                  <span>1. Verified AI Triage</span>
                </button>
                <button
                  type="button"
                  className={`preview-tab-btn ${activePreviewTab === 2 ? 'active' : ''}`}
                  onClick={() => setActivePreviewTab(2)}
                >
                  <Calendar size={14} />
                  <span>2. Specialist Slot Lock</span>
                </button>
                <button
                  type="button"
                  className={`preview-tab-btn ${activePreviewTab === 3 ? 'active' : ''}`}
                  onClick={() => setActivePreviewTab(3)}
                >
                  <Video size={14} />
                  <span>3. Split-Screen Video + Rx</span>
                </button>
                <button
                  type="button"
                  className={`preview-tab-btn ${activePreviewTab === 4 ? 'active' : ''}`}
                  onClick={() => setActivePreviewTab(4)}
                >
                  <Monitor size={14} />
                  <span>4. Studio Display Mockup</span>
                </button>
              </div>

              {/* Workspace Content Display Based on Active Preview Tab */}
              <div className="preview-screen-viewport">
                {/* ── TAB 1: Verified AI Triage Preview ── */}
                {activePreviewTab === 1 && (
                  <div className="preview-content-fade">
                    {/* Simulated Patient Query Bar */}
                    <div className="mock-query-box">
                      <div className="mock-avatar user">P</div>
                      <div className="mock-query-text">
                        What are the clinical recommendations for corticosteroids in severe COVID-19 with hypoxemic respiratory failure?
                      </div>
                    </div>

                    {/* Grounded Response Card */}
                    <div className="mock-response-card">
                      <div className="mock-response-top">
                        <div className="mock-badge grounded">
                          <CheckCircle2 size={13} color="#10b981" />
                          <span>100% Grounded in Official Guidelines</span>
                        </div>
                        <span className="mock-badge-alt">PubMed ID: 32678530</span>
                      </div>

                      <div className="mock-answer-body">
                        <strong>Clinical Guideline Summary:</strong> Systemic corticosteroids
                        (<strong>Dexamethasone 6 mg once daily</strong> for up to 10 days) are strongly
                        recommended for hospitalized adult patients with severe COVID-19 experiencing acute hypoxemic
                        respiratory failure (SpO2 &lt; 94% on room air or requiring supplemental oxygen/NIV/IMV).
                        Corticosteroids significantly lower 28-day all-cause mortality (RECOVERY Trial, WHO Therapeutics 2024).
                      </div>

                      {/* Verified Citations List */}
                      <div className="mock-citations-row">
                        <span className="citation-tag">WHO Therapeutics Guidelines 2024 (Section 3.2)</span>
                        <span className="citation-tag">NIH COVID-19 Treatment Guidelines (p. 48)</span>
                        <span className="citation-tag">NEMJ 2021; 384:693-704 (RECOVERY Trial)</span>
                      </div>

                      {/* AI SOAP Structured Note */}
                      <div className="mock-soap-box">
                        <div className="soap-item">
                          <span className="soap-label">S (Subjective):</span>
                          <span>Acute respiratory distress with hypoxemia</span>
                        </div>
                        <div className="soap-item">
                          <span className="soap-label">A (Assessment):</span>
                          <span>Severe viral pneumonitis requiring oxygen support</span>
                        </div>
                        <div className="soap-item">
                          <span className="soap-label">P (Plan):</span>
                          <span>Dexamethasone 6mg OD + prone positioning + urgent Pulmonology review</span>
                        </div>
                      </div>

                      {/* Triage Specialist Match */}
                      <div className="mock-triage-match">
                        <div className="triage-match-left">
                          <Stethoscope size={16} color="#34d399" />
                          <div>
                            <span className="triage-urgent-tag">PRIORITY TRIAGE: PULMONOLOGIST</span>
                            <div className="triage-doc-name">Recommended: Dr. Arvind Swaminathan (AIIMS New Delhi)</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="mock-action-btn"
                          onClick={() => setActivePreviewTab(2)}
                        >
                          <span>Consult Specialist →</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 2: Specialist Slot Lock Preview ── */}
                {activePreviewTab === 2 && (
                  <div className="preview-content-fade">
                    <div className="mock-doctor-card">
                      <div className="doc-card-header">
                        <div className="doc-avatar-circle">AS</div>
                        <div className="doc-info-block">
                          <div className="doc-name-title">
                            <h3>Dr. Arvind Swaminathan</h3>
                            <span className="verified-tick">✓ NMC Verified</span>
                          </div>
                          <div className="doc-credentials">
                            MBBS, MD (Pulmonary Medicine), DM (Critical Care, AIIMS New Delhi)
                          </div>
                          <div className="doc-meta-pills">
                            <span>16+ Years Exp</span>
                            <span>Apollo Specialty Hospital, Bengaluru</span>
                            <span>⭐ 4.95 (1,820 Consults)</span>
                          </div>
                        </div>
                        <div className="doc-fee-box">
                          <span className="fee-label">Consultation Fee</span>
                          <span className="fee-amount">₹950</span>
                        </div>
                      </div>

                      {/* Real-time Slot Selector */}
                      <div className="mock-slot-selector">
                        <div className="slot-selector-title">Select Consultation Time Slot (Today, 24 Nov)</div>
                        <div className="slots-preview-row">
                          <div className="slot-chip locked">09:30 AM (Locked)</div>
                          <div className="slot-chip locked">11:00 AM (Booked)</div>
                          <div className="slot-chip selected">
                            <span>02:30 PM</span>
                            <span className="chip-selected-dot">● Selected</span>
                          </div>
                          <div className="slot-chip available">05:00 PM</div>
                          <div className="slot-chip available">07:30 PM</div>
                        </div>
                      </div>

                      {/* Simulated Payment Strip & Digital Consent */}
                      <div className="mock-checkout-strip">
                        <div className="checkout-payment-info">
                          <CreditCard size={15} color="#10b981" />
                          <span>Instant UPI Payment Verified • Transaction ID: <strong>TXN-2026-849201</strong></span>
                        </div>
                        <div className="consent-verified-chip">
                          <ShieldCheck size={14} color="#10b981" />
                          <span>Digital Patient Consent Timestamped</span>
                        </div>
                      </div>

                      <div className="mock-booking-footer">
                        <span className="pass-code">PASS: APT-2026-ARV910</span>
                        <button
                          type="button"
                          className="mock-action-btn primary"
                          onClick={() => setActivePreviewTab(3)}
                        >
                          <Video size={14} />
                          <span>Launch Video Consultation Room →</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 3: Split-Screen Video + Rx Preview ── */}
                {activePreviewTab === 3 && (
                  <div className="preview-content-fade">
                    <div className="mock-split-room">
                      {/* Left: Video Call Frame */}
                      <div className="mock-video-side">
                        <div className="video-live-badge">
                          <span className="pulse-red" />
                          <span>LIVE WEBRTC CALL • 04:28</span>
                        </div>
                        <div className="doctor-video-feed">
                          <div className="doc-feed-avatar">
                            <Stethoscope size={36} color="#60a5fa" />
                          </div>
                          <div className="doc-feed-label">Dr. Arvind Swaminathan (Pulmonologist)</div>
                        </div>
                        <div className="patient-pip-feed">
                          <div className="pip-label">Rahul Sharma (You)</div>
                        </div>
                        <div className="video-controls-bar">
                          <div className="webrtc-tag">
                            <Lock size={12} color="#10b981" />
                            <span>256-Bit WebRTC Encrypted</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Electronic Prescription Pad */}
                      <div className="mock-rx-side">
                        <div className="rx-pad-header">
                          <FileText size={15} color="#34d399" />
                          <span>Doctor Clinical Prescription & Advice</span>
                        </div>

                        <div className="rx-patient-info">
                          <div><strong>Patient:</strong> Rahul Sharma (Age: 32)</div>
                          <div><strong>Dx:</strong> Acute Hypoxemic Respiratory Distress (Post-Viral)</div>
                        </div>

                        <div className="rx-notes-text">
                          <p><strong>Prescription:</strong></p>
                          <p>1. Tab Dexamethasone 6 mg once daily after breakfast x 7 days.</p>
                          <p>2. Budesonide Respules 1mg via nebulizer twice daily x 5 days.</p>
                          <p>3. SpO2 monitoring q4h; target saturation &gt;= 94%.</p>
                          <p>4. Emergency escalation if resting SpO2 &lt; 92% or severe chest tightness.</p>
                        </div>

                        <div className="rx-signature-strip">
                          <div className="doc-sign-meta">
                            <span className="sign-doc-name">Dr. Arvind Swaminathan, MD, DM</span>
                            <span className="sign-reg">NMC Reg: NMC-48291 • Verified Electronic Rx</span>
                          </div>
                          <span className="rx-saved-pill">✓ Saved to Patient Record</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 4: Photorealistic Studio Display Mockup ── */}
                {activePreviewTab === 4 && (
                  <div className="preview-content-fade preview-mockup-image-box">
                    <img
                      src="/hero-mockup.jpg"
                      alt="ClinGuard Telehealth Studio Display Mockup"
                      className="preview-hero-mockup-img"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Trust Strip (Proton.ai Style) ── */}
      <section className="landing-trust-strip" id="clinical-safety">
        <div className="trust-strip-inner">
          <div className="trust-item">
            <ShieldCheck size={20} color="#10b981" />
            <div>
              <div className="trust-title">100% Citation Grounded</div>
              <div className="trust-subtitle">Every claim references verified clinical guidelines</div>
            </div>
          </div>

          <div className="trust-divider" />

          <div className="trust-item">
            <Cpu size={20} color="#38bdf8" />
            <div>
              <div className="trust-title">Multi-Stage Verification</div>
              <div className="trust-subtitle">Dual-tier grading & hallucination guardrails</div>
            </div>
          </div>

          <div className="trust-divider" />

          <div className="trust-item">
            <Award size={20} color="#a855f7" />
            <div>
              <div className="trust-title">NMC Verified Specialists</div>
              <div className="trust-subtitle">Board-certified doctors with active medical licenses</div>
            </div>
          </div>

          <div className="trust-divider" />

          <div className="trust-item">
            <Lock size={20} color="#f59e0b" />
            <div>
              <div className="trust-title">256-Bit Encrypted Consent</div>
              <div className="trust-subtitle">Patient-governed health records & WebRTC calls</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Interactive Platform Explorer ── */}
      <section className="landing-explorer-section">
        <div className="explorer-container">
          <div className="section-header-centered">
            <div className="section-pill">● Precision at Every Transition</div>
            <h2 className="section-heading">Clinical decision support, engineered with molecular rigor</h2>
            <p className="section-subtext">
              Engineered for healthcare where accuracy is non-negotiable. From patient symptom intake and semantic guideline indexing to specialist video follow-up.
            </p>
          </div>

          <div className="explorer-grid">
            {/* Left Accordion Column */}
            <div className="explorer-accordion">
              {features.map((feat, idx) => {
                const isActive = activeFeatureIndex === idx;
                const IconComponent = feat.previewIcon;

                return (
                  <div
                    key={feat.id}
                    className={`accordion-item ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveFeatureIndex(idx)}
                  >
                    <div className="accordion-item-header">
                      <div className="accordion-icon-box" style={{ color: feat.previewColor }}>
                        <IconComponent size={20} />
                      </div>
                      <div className="accordion-title-block">
                        <div className="accordion-title">{feat.title}</div>
                        <div className="accordion-tagline">{feat.tagline}</div>
                      </div>
                      <ChevronRight
                        size={18}
                        className={`accordion-arrow ${isActive ? 'rotated' : ''}`}
                      />
                    </div>

                    {isActive && (
                      <div className="accordion-body-fade">
                        <p className="accordion-desc">{feat.description}</p>
                        <ul className="accordion-bullets">
                          {feat.highlights.map((h, i) => (
                            <li key={i}>
                              <CheckCircle2 size={13} color="#10b981" />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right Dynamic Live Showcase Column */}
            <div className="explorer-preview-panel">
              {(() => {
                const activeFeat = features[activeFeatureIndex];
                const IconComp = activeFeat.previewIcon;

                return (
                  <div className="dynamic-feature-card">
                    <div className="card-top-tag">
                      <span className="live-pill" style={{ color: activeFeat.previewColor, borderColor: activeFeat.previewColor }}>
                        {activeFeat.previewBadge}
                      </span>
                      <span className="stats-pill">{activeFeat.stats}</span>
                    </div>

                    <div className="feature-card-center">
                      <div className="feature-large-icon" style={{ background: `${activeFeat.previewColor}18`, color: activeFeat.previewColor }}>
                        <IconComp size={48} />
                      </div>
                      <h3 className="feature-card-title">{activeFeat.title}</h3>
                      <p className="feature-card-desc">{activeFeat.description}</p>
                    </div>

                    <div className="feature-highlights-box">
                      <div className="highlights-title">Key Clinical Capabilities:</div>
                      {activeFeat.highlights.map((hl, i) => (
                        <div key={i} className="highlight-row">
                          <Check size={14} color="#10b981" />
                          <span>{hl}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="feature-explore-cta"
                      onClick={() => onNavigateAuth('signup')}
                    >
                      <span>Explore this feature</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. How It Works 3-Column Architecture Diagram ── */}
      <section className="landing-diagram-section" id="how-it-works">
        <div className="diagram-container">
          <div className="section-header-centered">
            <div className="section-pill">● Clinical Verification Architecture</div>
            <h2 className="section-heading">A multi-stage safety standard from cell to clinic</h2>
            <p className="section-subtext">
              How ClinGuard transforms multi-source WHO, NIH, and PubMed knowledge into grounded, actionable, and doctor-verified clinical outcomes.
            </p>
          </div>

          <div className="diagram-three-columns">
            {/* Column 1: Knowledge & Guidelines Layer */}
            <div className="diagram-col">
              <div className="col-header-pill">1. Knowledge Layer</div>
              <div className="diagram-card">
                <div className="card-icon-circle blue">
                  <Database size={22} color="#38bdf8" />
                </div>
                <h4>Official Guidelines & Indexing</h4>
                <p>
                  Vetted clinical documents from WHO, NIH, and PubMed indexed with dense semantic vectors
                  and page-level metadata.
                </p>
                <div className="diagram-chips">
                  <span>WHO Therapeutics</span>
                  <span>PubMed ID Index</span>
                  <span>ChromaDB Vector Store</span>
                </div>
              </div>
            </div>

            {/* Column 2: ClinGuard Verification Engine */}
            <div className="diagram-col highlight-col">
              <div className="col-header-pill green">2. ClinGuard Engine</div>
              <div className="diagram-card active-card">
                <div className="card-icon-circle green">
                  <Cpu size={22} color="#10b981" />
                </div>
                <h4>Multi-Stage Verification</h4>
                <p>
                  Context quality grader evaluates evidence adequacy; hallucination checker validates claims; query rewriter triggers live fallback when needed.
                </p>
                <div className="diagram-chips">
                  <span>Context Quality Judge</span>
                  <span>Hallucination Checker</span>
                  <span>Live Medical Fallback</span>
                </div>
              </div>
            </div>

            {/* Column 3: Patient & Specialist Delivery */}
            <div className="diagram-col">
              <div className="col-header-pill purple">3. Delivery & Care</div>
              <div className="diagram-card">
                <div className="card-icon-circle purple">
                  <Stethoscope size={22} color="#a855f7" />
                </div>
                <h4>Grounded Care & Telehealth</h4>
                <p>
                  100% cited answers for patients, automated SOAP note generation, and seamless video consultations with NMC-certified doctors.
                </p>
                <div className="diagram-chips">
                  <span>Cited Patient Summary</span>
                  <span>Digital Consent</span>
                  <span>WebRTC Split-Screen Rx</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Board-Certified Specialists Section ── */}
      <section className="landing-specialists-section" id="specialists">
        <div className="specialists-container">
          <div className="section-header-centered">
            <div className="section-pill">● On-Duty Specialist Network</div>
            <h2 className="section-heading">Licensed specialists, ready to consult on demand</h2>
            <p className="section-subtext">
              Direct peer escalation to leading clinicians from top medical institutions for video consultations, prescription sign-offs, and critical care oversight.
            </p>
          </div>

          <div className="specialists-cards-grid">
            {specialists.map((doc, idx) => (
              <div key={idx} className="specialist-landing-card">
                <div className="doc-badge-row">
                  <span className="spec-tag">{doc.specialty}</span>
                  <span className="rating-pill">★ {doc.rating}</span>
                </div>

                <h3 className="doc-landing-name">{doc.name}</h3>
                <div className="doc-landing-qual">{doc.qualifications}</div>

                <div className="doc-landing-hospital">
                  <Building size={13} color="#94a3b8" />
                  <span>{doc.hospital}</span>
                </div>

                <div className="doc-landing-meta">
                  <span className="nmc-tag">Reg: {doc.regNo}</span>
                  <span className="exp-tag">{doc.experience}</span>
                </div>

                <div className="doc-card-bottom">
                  <div className="doc-fee-wrap">
                    <span className="fee-muted">Consultation Fee</span>
                    <span className="fee-bold">{doc.fee}</span>
                  </div>
                  <button
                    type="button"
                    className="doc-book-btn"
                    onClick={() => onNavigateAuth('signin', 'PATIENT')}
                  >
                    <span>Book Consult</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Bottom Pre-Footer CTA Section ── */}
      <section className="landing-cta-banner">
        <div className="cta-banner-inner">
          <div className="cta-left">
            <h2 className="cta-heading">Ready for clinical guidance you can <span className="cursive-serif-accent">actually trust?</span></h2>
            <p className="cta-subheading">
              Join thousands of patients and specialists utilizing verified clinical AI and encrypted telehealth consultations today.
            </p>
          </div>
          <div className="cta-right">
            <button
              type="button"
              className="cta-primary-btn"
              onClick={() => onNavigateAuth('signup')}
            >
              <span>Create Free Account</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="cta-secondary-btn"
              onClick={() => {
                if (onQuickDemo) onQuickDemo('PATIENT');
                else onNavigateAuth('signin');
              }}
            >
              <span>Try Instant Demo</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 8. Enterprise Footer with Oversized Watermark (Proton.ai Style) ── */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-columns-grid">
            {/* Brand Column */}
            <div className="footer-brand-col">
              <div className="footer-logo">
                <HeartPulse size={22} color="#10b981" />
                <span className="footer-logo-text">ClinGuard Telehealth</span>
              </div>
              <p className="footer-tagline">
                The verified clinical decision support and telemedicine infrastructure for modern patients and specialist clinicians.
              </p>
              <div className="footer-compliance-badges">
                <span className="compliance-pill">HIPAA Security Aligned</span>
                <span className="compliance-pill">NMC Protocol Governed</span>
              </div>
            </div>

            {/* Links Columns */}
            <div className="footer-links-col">
              <h4>Platform</h4>
              <ul>
                <li><button type="button" onClick={() => scrollToSection('platform')}>Clinical AI Assistant</button></li>
                <li><button type="button" onClick={() => scrollToSection('platform')}>Multi-Stage Verification</button></li>
                <li><button type="button" onClick={() => scrollToSection('specialists')}>Doctor Directory</button></li>
                <li><button type="button" onClick={() => scrollToSection('platform')}>Split-Screen Video Calls</button></li>
              </ul>
            </div>

            <div className="footer-links-col">
              <h4>Clinical Safety</h4>
              <ul>
                <li><button type="button" onClick={() => scrollToSection('clinical-safety')}>Evidence Grounding</button></li>
                <li><button type="button" onClick={() => scrollToSection('clinical-safety')}>Hallucination Audits</button></li>
                <li><button type="button" onClick={() => scrollToSection('clinical-safety')}>Consent Governance</button></li>
                <li><button type="button" onClick={() => scrollToSection('how-it-works')}>System Architecture</button></li>
              </ul>
            </div>

            <div className="footer-links-col">
              <h4>Specialists</h4>
              <ul>
                <li><button type="button" onClick={() => scrollToSection('specialists')}>Pulmonology</button></li>
                <li><button type="button" onClick={() => scrollToSection('specialists')}>Cardiology</button></li>
                <li><button type="button" onClick={() => scrollToSection('specialists')}>Neurology</button></li>
                <li><button type="button" onClick={() => onNavigateAuth('signup', 'DOCTOR')}>Doctor Onboarding</button></li>
              </ul>
            </div>

            <div className="footer-links-col">
              <h4>Compliance & Security</h4>
              <ul>
                <li><span className="footer-plain-text">256-Bit WebRTC Encryption</span></li>
                <li><span className="footer-plain-text">SHA-256 Credentials</span></li>
                <li><span className="footer-plain-text">Audit Trace Telemetry</span></li>
                <li><span className="footer-plain-text">Emergency Care Disclaimer</span></li>
              </ul>
            </div>
          </div>

          {/* Oversized Brand Watermark Graphic (Proton.ai Footer Signature) */}
          <div className="footer-watermark-wrapper">
            <span className="footer-watermark-text">clinguard.health</span>
          </div>

          <div className="footer-bottom-row">
            <div className="footer-copy">
              © {new Date().getFullYear()} ClinGuard Telehealth Inc. All clinical guidelines referenced under open medical license. Not a substitute for emergency 911/112 care.
            </div>
            <div className="footer-bottom-links">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Clinical Service</span>
              <span>•</span>
              <span>Telehealth Ethics Charter</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
