import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUp, Plus, Stethoscope, PanelLeftClose, PanelLeftOpen, Trash2, X, Paperclip, ShieldCheck, ArrowRight } from 'lucide-react';
import './App.css';
import Navbar from './components/Navbar';
import AgentStateTracer from './components/AgentStateTracer';
import GroundedResponseCard from './components/GroundedResponseCard';
import PdfUploadModal from './components/PdfUploadModal';
import CitationDrawer from './components/CitationDrawer';
import MetricsDashboard from './components/MetricsDashboard';
import DoctorConsultationModal from './components/DoctorConsultationModal';
import ConsultationsDrawer from './components/ConsultationsDrawer';
import VideoConsultRoom from './components/VideoConsultRoom';
import ClinicalConsoleView from './components/ClinicalConsoleView';
import AuthPage from './components/AuthPage';
import LandingPage from './components/LandingPage';
import { checkBackendHealth, sendClinicalQuery, getAppointments, loginUser } from './services/api';

const STORAGE_KEY = 'clinguard_sessions';
const LEGACY_STORAGE_KEY = 'clinical_rag_sessions';
const USER_STORAGE_KEY = 'clinguard_user';
const LEGACY_USER_STORAGE_KEY = 'clinical_rag_user';
const TOKEN_STORAGE_KEY = 'clinguard_token';
const LEGACY_TOKEN_STORAGE_KEY = 'clinical_rag_token';

const SAMPLE_QUESTIONS = [
  'What are the clinical recommendations for corticosteroids in severe COVID-19?',
  'When is remdesivir recommended for COVID-19 patients?',
  'What is the oxygen saturation target for adults with acute hypoxemic respiratory failure?',
];

const ON_DUTY_SPECIALISTS = [
  {
    id: 'doc-pulm-01',
    name: 'Dr. Arvind Swaminathan',
    role: 'MD, DM (Pulmonology)',
    specialty: 'Pulmonology & Critical Care',
    hospital: 'AIIMS New Delhi',
    fee: '$45',
    available: 'Available Now',
    initials: 'AS',
  },
  {
    id: 'doc-id-02',
    name: 'Dr. Siddharth Mukherjee',
    role: 'MD (Infectious Diseases)',
    specialty: 'Infectious Disease Specialist',
    hospital: 'Johns Hopkins Medicine',
    fee: '$50',
    available: 'Available Now',
    initials: 'SM',
  },
  {
    id: 'doc-cardio-03',
    name: 'Dr. Rajesh V. Iyer',
    role: 'MD, DM (Cardiology)',
    specialty: 'Internal Medicine & Diabetology',
    hospital: 'Christian Medical College',
    fee: '$40',
    available: 'Available Now',
    initials: 'RI',
  },
];

const CLINICAL_SCENARIOS = [
  {
    tag: 'NIH CRITICAL CARE',
    tagType: 'orange',
    evidence: 'WHO & NIH 2024',
    title: 'Corticosteroid dosing & escalation in severe COVID-19',
    desc: 'Protocol for Dexamethasone 6mg daily vs IV Methylprednisolone in progressive hypoxemic failure.',
    query: 'What are the clinical recommendations for corticosteroids in severe COVID-19?',
  },
  {
    tag: 'ANTIVIRAL PROTOCOL',
    tagType: 'green',
    evidence: 'FDA & CDC',
    title: 'Remdesivir timing, renal clearance & contraindications',
    desc: 'Criteria for early 5-day initiation, eGFR cutoffs (< 30 mL/min), and ALT/AST elevation ceilings.',
    query: 'When is remdesivir recommended for COVID-19 patients?',
  },
  {
    tag: 'HYPOXEMIC FAILURE',
    tagType: 'orange',
    evidence: 'BMJ & Surviving Sepsis',
    title: 'Oxygen saturation (SpO2) targets in acute respiratory failure',
    desc: 'Target ranges (92–96% vs 88–92% in chronic hypercapnic risk), HFNC titration, and intubation triggers.',
    query: 'What is the oxygen saturation target for adults with acute hypoxemic respiratory failure?',
  },
];

/* ── Helper to detect web search fallback on any result object ── */
const checkWebFallback = (result) => {
  if (!result) return false;
  const citations = result.citations || result.sources || [];
  return Boolean(
    result.web_search_used ||
    result.fallback_used ||
    result.fallback_triggered ||
    citations.some(
      (c) => c?.page === 'Web' || c?.page === 'web' || String(c?.source || '').startsWith('http')
    )
  );
};

/* ── localStorage helpers ── */
const loadSessions = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((s) => ({
      ...s,
      messages: (s.messages || []).map((m) => ({ ...m, isNewResponse: false })),
    }));
  } catch {
    return [];
  }
};

const saveSessions = (sessions) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    /* quota exceeded – silently skip */
  }
};

const loadUser = () => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY) || localStorage.getItem(LEGACY_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const generateId = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function App() {
  const [currentUser, setCurrentUser] = useState(loadUser);
  const [authView, setAuthView] = useState('landing'); // 'landing' | 'signin' | 'signup'
  const [authInitialRole, setAuthInitialRole] = useState('PATIENT'); // 'PATIENT' | 'DOCTOR'
  const [backendOnline, setBackendOnline] = useState(false);

  // Dedicated Full-Page Workspace Navigation State:
  // 'chat' (default) | 'consultations' | 'doctor-portal' | 'metrics' | 'console'
  const [activePage, setActivePage] = useState(() => {
    const u = loadUser();
    return u?.role === 'DOCTOR' ? 'doctor-portal' : 'chat';
  });

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* ── Telemedicine & Consultations State ── */
  const [consultationsCount, setConsultationsCount] = useState(0);

  // Booking Modal State
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingTriageData, setBookingTriageData] = useState(null);
  const [bookingQuery, setBookingQuery] = useState('');
  const [bookingCitations, setBookingCitations] = useState([]);

  // Live Split-Screen Video Consultation Room State
  const [activeVideoAppointment, setActiveVideoAppointment] = useState(null);

  // Collapsible LangGraph Agent Tracer Panel State (Hidden by default for clean wide layout)
  const [showTracer, setShowTracer] = useState(false);

  /* ── Session state ── */
  const [sessions, setSessions] = useState(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [activeUploadedPdf, setActiveUploadedPdf] = useState(null);

  const scrollRef = useRef(null);

  /* ── Fetch consultation count on mount & user change ── */
  const refreshConsultationsCount = useCallback(() => {
    let filter = {};
    if (currentUser?.role === 'PATIENT') {
      filter.patient_email = currentUser.email;
    } else if (currentUser?.role === 'DOCTOR' && currentUser?.doctor_id) {
      filter.doctor_id = currentUser.doctor_id;
    }
    getAppointments(filter)
      .then((data) => {
        if (Array.isArray(data)) {
          setConsultationsCount(data.length);
        }
      })
      .catch(() => { });
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshConsultationsCount();
    }
  }, [currentUser, refreshConsultationsCount]);

  /* ── Auth Handlers ── */
  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch { }
    if (user.role === 'DOCTOR') {
      setActivePage('doctor-portal');
    } else {
      setActivePage('chat');
    }
  };

  const handleQuickDemo = async (role = 'PATIENT') => {
    try {
      const email = role === 'DOCTOR' ? 'arvind@clinguard.health' : 'patient@clinguard.health';
      const password = role === 'DOCTOR' ? 'doctor123' : 'patient123';
      const res = await loginUser({ email, password, role });
      handleAuthSuccess(res.user, res.token);
    } catch (err) {
      console.error('Quick demo failed, navigating to auth', err);
      setAuthInitialRole(role);
      setAuthView('signin');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    } catch { }
    setAuthView('landing');
    setActivePage('chat');
  };

  /* ── Role Navigation Safety ── */
  useEffect(() => {
    if (currentUser?.role === 'DOCTOR' && (activePage === 'chat' || activePage === 'consultations')) {
      setActivePage('doctor-portal');
    } else if (currentUser?.role === 'PATIENT' && activePage === 'doctor-portal') {
      setActivePage('chat');
    }
  }, [currentUser, activePage]);

  /* ── Persist sessions to localStorage whenever they change ── */
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  /* ── Auto-scroll to bottom on new messages or loading ── */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  /* ── Auto-scroll tick while streaming typewriter text ── */
  const handleStreamTick = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  /* ── Typing completion handler ── */
  const handleTypingComplete = useCallback((index) => {
    setMessages((prev) => {
      if (!prev[index] || !prev[index].isNewResponse) return prev;
      const next = [...prev];
      next[index] = { ...next[index], isNewResponse: false };
      return next;
    });
  }, []);

  /* ── Health check ── */
  useEffect(() => {
    checkBackendHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  /* ── Persist current session into sessions array (always saves isNewResponse: false) ── */
  const persistSession = useCallback(
    (id, msgs, result) => {
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        const title = msgs.find((m) => m.role === 'user')?.text?.slice(0, 60) || 'Untitled';
        const cleanedMsgs = msgs.map((m) => ({
          ...m,
          isNewResponse: false,
        }));
        const session = {
          id,
          title,
          createdAt: idx >= 0 ? prev[idx].createdAt : new Date().toISOString(),
          messages: cleanedMsgs,
          lastResult: result,
        };
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = session;
          return updated;
        }
        return [session, ...prev];
      });
    },
    []
  );

  /* ── New Chat ── */
  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setLastResult(null);
    setQuery('');
    setActivePage('chat');
  };

  /* ── Load a previous session (NO API call, instant static load) ── */
  const handleLoadSession = (session) => {
    setActiveSessionId(session.id);
    const safeMsgs = (session.messages || []).map((m) => ({
      ...m,
      isNewResponse: false,
    }));
    setMessages(safeMsgs);
    setLastResult(session.lastResult || null);
    setQuery('');
    setActivePage('chat');
  };

  /* ── Delete a session ── */
  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
      setLastResult(null);
    }
  };

  /* ── Clear all history ── */
  const handleClearHistory = () => {
    setSessions([]);
    setActiveSessionId(null);
    setMessages([]);
    setLastResult(null);
  };

  /* ── Handler to open booking modal from triage cards ── */
  const handleOpenBookingModal = useCallback((doctor, triageData, queryText, citations) => {
    setBookingDoctor(doctor);
    setBookingTriageData(triageData);
    setBookingQuery(queryText);
    setBookingCitations(citations || []);
  }, []);

  /* ── Handler to switch to consultations or doctor portal page ── */
  const handleOpenConsultations = useCallback((mode = 'patient') => {
    setActivePage(mode === 'doctor' ? 'doctor-portal' : 'consultations');
  }, []);

  /* ── Ask a question ── */
  const handleAsk = async (questionText) => {
    const cleanQuestion = (questionText || query).trim();
    if (!cleanQuestion || isLoading) return;

    const sessionId = activeSessionId || generateId();
    if (!activeSessionId) setActiveSessionId(sessionId);

    const newMessages = [...messages, { role: 'user', text: cleanQuestion }];
    setMessages(newMessages);
    setQuery('');
    setIsLoading(true);

    /* persist immediately with user message */
    persistSession(sessionId, newMessages, lastResult);

    const startTime = performance.now();

    try {
      const result = await sendClinicalQuery(cleanQuestion);
      const elapsed = Math.round(performance.now() - startTime);
      setLastResult(result);
      setBackendOnline(true);

      const isFallback = checkWebFallback(result);

      const updatedMessages = [
        ...newMessages,
        { role: 'assistant', data: result, isNewResponse: true },
      ];
      setMessages(updatedMessages);

      /* persist with assistant response (saved as isNewResponse: false in localStorage) */
      persistSession(sessionId, updatedMessages, result);

      setAuditLogs((prev) => [
        {
          question: cleanQuestion,
          latency: result.latency_ms || elapsed,
          webFallback: isFallback,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    } catch (error) {
      const errMsg =
        error.response?.data?.detail ||
        'Unable to connect to the backend server. Please ensure FastAPI is running on port 8000.';
      const errorMessages = [
        ...newMessages,
        { role: 'assistant', data: { answer: `⚠️ **Connection Error:** ${errMsg}` }, isNewResponse: false },
      ];
      setMessages(errorMessages);
      persistSession(sessionId, errorMessages, lastResult);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    if (authView === 'landing') {
      return (
        <LandingPage
          onNavigateAuth={(mode = 'signin', role = 'PATIENT') => {
            setAuthInitialRole(role);
            setAuthView(mode);
          }}
          onQuickDemo={handleQuickDemo}
        />
      );
    }

    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
        initialMode={authView}
        initialRole={authInitialRole}
        onBackToHome={() => setAuthView('landing')}
      />
    );
  }

  return (
    <div className="app-container">
      <Navbar
        backendOnline={backendOnline}
        activePage={activePage}
        setActivePage={setActivePage}
        consultationsCount={consultationsCount}
        showTracer={showTracer}
        setShowTracer={setShowTracer}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* ── 1. CLINICAL AI PAGE (Clean ChatGPT / Gemini Wide Workspace) ── */}
      {activePage === 'chat' && (
        <div className={`workspace-layout ${sidebarOpen ? '' : 'sidebar-collapsed'} ${showTracer ? 'tracer-open' : ''}`}>
          {/* Left Sidebar */}
          <aside className={`left-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
            <div className="sidebar-top-row">
              <button type="button" className="new-chat-btn" onClick={handleNewChat}>
                <Plus size={16} />
                <span>New Clinical Query</span>
              </button>
              <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={() => setSidebarOpen(false)}
                title="Collapse sidebar"
              >
                <PanelLeftClose size={18} />
              </button>
            </div>

            <div className="history-label">Session History</div>

            <div className="session-list">
              {sessions.length === 0 ? (
                <div className="no-sessions-text">No sessions yet</div>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`history-item ${activeSessionId === s.id ? 'active' : ''}`}
                    title={s.title}
                    onClick={() => handleLoadSession(s)}
                  >
                    <span className="history-item-text">{s.title}</span>
                    <button
                      type="button"
                      className="history-delete-btn"
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      title="Delete session"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {sessions.length > 0 && (
              <button type="button" className="clear-history-btn" onClick={handleClearHistory}>
                <Trash2 size={14} />
                <span>Clear History</span>
              </button>
            )}
          </aside>

          {/* Collapsed sidebar toggle */}
          {!sidebarOpen && (
            <button
              type="button"
              className="sidebar-open-btn"
              onClick={() => setSidebarOpen(true)}
              title="Expand sidebar"
            >
              <PanelLeftOpen size={18} />
            </button>
          )}

          {/* Center Panel */}
          <main className={`chat-main ${messages.length === 0 ? 'chat-main--empty' : 'chat-main--active'}`}>
            {messages.length === 0 ? (
              <div className="editorial-empty-workspace editorial-workspace--centered">
                <div className="editorial-center-deck">
                  <div className="editorial-eyebrow">
                      <span className="pop-orange-badge">
                        <span className="pulse-orange-dot"></span>
                        CLINICAL INTELLIGENCE PROTOCOL
                      </span>
                      <span className="pop-green-badge">
                        <ShieldCheck size={13} />
                        EVIDENCE-GROUNDED ENGINE
                      </span>
                    </div>

                    <h1 className="editorial-hero-heading">
                      Clinical decision support, <span className="cursive-serif-accent">anchored in evidence.</span>
                    </h1>

                    <p className="editorial-hero-sub">
                      Cross-examine medical guidelines from WHO, NIH, and CDC. Responses are verified through multi-stage citation grounding, with immediate peer escalation to licensed specialists.
                    </p>

                    {/* Wide Query Dock */}
                    <div className="editorial-query-dock">
                      {activeUploadedPdf && (
                        <div className="attached-pdf-bar">
                          <div className="attached-pdf-chip">
                            <span className="pdf-emoji">📄</span>
                            <span className="pdf-name" title={activeUploadedPdf.filename}>
                              {activeUploadedPdf.filename}
                            </span>
                            <span className="pdf-tag">
                              {activeUploadedPdf.chunks ? `${activeUploadedPdf.chunks} chunks • Indexed` : 'Indexed'}
                            </span>
                            <button
                              type="button"
                              className="pdf-chip-close"
                              onClick={() => setActiveUploadedPdf(null)}
                              title="Remove attached PDF context"
                              aria-label="Remove attached PDF context"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      )}

                      <form
                        className="chat-input-form editorial-input-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAsk();
                        }}
                      >
                        <button
                          type="button"
                          className="attach-btn"
                          onClick={() => setIsUploadOpen(true)}
                          title="Upload Clinical PDF Guidelines"
                          aria-label="Upload Clinical PDF Guidelines"
                        >
                          <Paperclip size={18} />
                        </button>
                        <input
                          type="text"
                          className="chat-input"
                          placeholder="Query clinical guidelines (e.g., severe hypoxemia, steroid switch, renal dosing)..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        <button
                          type="submit"
                          className="send-btn pop-orange-send-btn"
                          disabled={isLoading}
                          title="Send clinical query"
                        >
                          <ArrowUp size={16} />
                          <span className="send-btn-label">Verify</span>
                        </button>
                      </form>
                    </div>

                    {/* Clinical Domain Quick Filters */}
                    <div className="clinical-topics-strip">
                      <span className="topics-label">Verified Guideline Topics:</span>
                      <button
                        type="button"
                        className="topic-pill"
                        onClick={() => handleAsk("What is the acute management protocol for hypoxemic respiratory failure?")}
                      >
                        🫁 Pulmonology
                      </button>
                      <button
                        type="button"
                        className="topic-pill"
                        onClick={() => handleAsk("What are the guidelines for dexamethasone vs methylprednisolone in severe COVID-19?")}
                      >
                        💊 Steroid Protocols
                      </button>
                      <button
                        type="button"
                        className="topic-pill"
                        onClick={() => handleAsk("When is remdesivir recommended for COVID-19 patients and what are the contraindications?")}
                      >
                        🦠 Antiviral Stewardship
                      </button>
                      <button
                        type="button"
                        className="topic-pill"
                        onClick={() => handleAsk("What are the blood pressure and oxygenation targets in acute resuscitation?")}
                      >
                        ❤️ Critical Care
                      </button>
                    </div>

                    {/* Clinical Scenario Cards */}
                    <div className="editorial-scenarios-section">
                      <div className="scenarios-header-row">
                        <span className="scenarios-title">Priority Clinical Inquiries</span>
                        <span className="scenarios-hint">Select a case study to execute live multi-node verification</span>
                      </div>

                      <div className="scenarios-grid">
                        {CLINICAL_SCENARIOS.map((sc, idx) => (
                          <div
                            key={idx}
                            className="scenario-card"
                            onClick={() => handleAsk(sc.query)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && handleAsk(sc.query)}
                          >
                            <div className="scenario-card-top">
                              <span className={`scenario-tag tag-${sc.tagType}`}>
                                {sc.tag}
                              </span>
                              <span className="scenario-evidence">{sc.evidence}</span>
                            </div>
                            <div className="scenario-card-title">{sc.title}</div>
                            <div className="scenario-card-desc">{sc.desc}</div>
                            <div className="scenario-card-action">
                              <span>Run Analysis</span>
                              <ArrowRight size={13} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
            ) : (
              <>
                <div className="chat-scroll-area" ref={scrollRef}>
                  <div className="chat-content-column">
                    {messages.map((msg, idx) =>
                      msg.role === 'user' ? (
                        <div key={idx} className="user-bubble">
                          {msg.text}
                        </div>
                      ) : (
                        <GroundedResponseCard
                          key={idx}
                          data={msg.data}
                          isNewResponse={Boolean(msg.isNewResponse)}
                          onSelectCitation={(cit) => setSelectedCitation(cit)}
                          onTypingComplete={() => handleTypingComplete(idx)}
                          onStreamTick={handleStreamTick}
                          onBookDoctor={handleOpenBookingModal}
                        />
                      )
                    )}

                    {isLoading && (
                      <div className="loading-indicator">
                        <div className="typing-dots">
                          <span></span><span></span><span></span>
                        </div>
                        Verifying clinical context via LangGraph nodes...
                      </div>
                    )}
                  </div>
                </div>

                <div className="input-wrapper search-input-wrapper input-wrapper--bottom">
                  {activeUploadedPdf && (
                    <div className="attached-pdf-bar">
                      <div className="attached-pdf-chip">
                        <span className="pdf-emoji">📄</span>
                        <span className="pdf-name" title={activeUploadedPdf.filename}>
                          {activeUploadedPdf.filename}
                        </span>
                        <span className="pdf-tag">
                          {activeUploadedPdf.chunks ? `${activeUploadedPdf.chunks} chunks • Indexed` : 'Indexed'}
                        </span>
                        <button
                          type="button"
                          className="pdf-chip-close"
                          onClick={() => setActiveUploadedPdf(null)}
                          title="Remove attached PDF context"
                          aria-label="Remove attached PDF context"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                  <form
                    className="chat-input-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAsk();
                    }}
                  >
                    <button
                      type="button"
                      className="attach-btn"
                      onClick={() => setIsUploadOpen(true)}
                      title="Upload Clinical PDF Guidelines"
                      aria-label="Upload Clinical PDF Guidelines"
                    >
                      <Paperclip size={18} />
                    </button>
                    <input
                      type="text"
                      className="chat-input"
                      placeholder="Message Clinical Decision Support AI..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="submit" className="send-btn" disabled={isLoading} title="Send clinical query">
                      <ArrowUp size={16} />
                    </button>
                  </form>
                </div>
              </>
            )}
          </main>

          {/* Right Panel: Live Agent State Tracer (Collapsible) */}
          {showTracer && (
            <aside className="right-tracer-panel">
              <AgentStateTracer
                isLoading={isLoading}
                lastResult={lastResult}
                onClose={() => setShowTracer(false)}
              />
            </aside>
          )}
        </div>
      )}

      {/* ── 2. PATIENT CONSULTATIONS FULLPAGE VIEW ── */}
      {activePage === 'consultations' && (
        <div className="fullpage-workspace-view">
          <ConsultationsDrawer
            isFullPage={true}
            initialMode="patient"
            currentUser={currentUser}
            onBackToChat={() => setActivePage('chat')}
            onLaunchVideoRoom={(apt) => setActiveVideoAppointment(apt)}
          />
        </div>
      )}

      {/* ── 3. DOCTOR CLINICAL PORTAL FULLPAGE VIEW ── */}
      {activePage === 'doctor-portal' && (
        <div className="fullpage-workspace-view">
          <ConsultationsDrawer
            isFullPage={true}
            initialMode="doctor"
            currentUser={currentUser}
            onUpdateUser={(updated) => {
              setCurrentUser(updated);
              try {
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
              } catch { }
            }}
            onBackToChat={() => setActivePage('chat')}
            onLaunchVideoRoom={(apt) => setActiveVideoAppointment(apt)}
          />
        </div>
      )}

      {/* ── 4. METRICS OBSERVABILITY FULLPAGE VIEW ── */}
      {activePage === 'metrics' && (
        <div className="fullpage-workspace-view">
          <MetricsDashboard
            auditLogs={auditLogs}
            onBackToChat={() => setActivePage('chat')}
          />
        </div>
      )}

      {/* ── 5. SYSTEM CONSOLE & TELEMETRY FULLPAGE VIEW ── */}
      {activePage === 'console' && (
        <div className="fullpage-workspace-view">
          <ClinicalConsoleView
            auditLogs={auditLogs}
            backendOnline={backendOnline}
            onBackToChat={() => setActivePage('chat')}
          />
        </div>
      )}

      {/* PDF Upload Modal */}
      <PdfUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={(uploadInfo) => {
          if (!uploadInfo) return;
          const filename = typeof uploadInfo === 'string' ? uploadInfo : uploadInfo.filename;
          const chunks = typeof uploadInfo === 'object' ? (uploadInfo.chunks ?? uploadInfo.chunks_added ?? 0) : 0;
          setActiveUploadedPdf({ filename, chunks });
        }}
      />

      {/* Citation Inspector Drawer */}
      <CitationDrawer citation={selectedCitation} onClose={() => setSelectedCitation(null)} />

      {/* Doctor Telemedicine Consultation & Live Slot Booking Modal */}
      {bookingDoctor && (
        <DoctorConsultationModal
          isOpen={Boolean(bookingDoctor)}
          onClose={() => setBookingDoctor(null)}
          doctor={bookingDoctor}
          triageData={bookingTriageData}
          patientQuery={bookingQuery}
          citations={bookingCitations}
          currentUser={currentUser}
          onBookingSuccess={() => refreshConsultationsCount()}
          onOpenConsultations={() => setActivePage('consultations')}
          onLaunchVideoRoom={(apt) => setActiveVideoAppointment(apt)}
        />
      )}

      {/* Fullscreen Embedded Split-Screen Video Consultation Room */}
      {activeVideoAppointment && (
        <VideoConsultRoom
          appointment={activeVideoAppointment}
          onClose={() => {
            setActiveVideoAppointment(null);
            refreshConsultationsCount();
          }}
          onPrescriptionSaved={() => refreshConsultationsCount()}
        />
      )}
    </div>
  );
}
