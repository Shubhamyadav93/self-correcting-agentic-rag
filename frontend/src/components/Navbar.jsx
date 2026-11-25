import React from 'react';
import {
  Stethoscope,
  BarChart3,
  CalendarCheck,
  UserCheck,
  Cpu,
  Terminal,
  User,
  LogOut,
  BadgeCheck,
} from 'lucide-react';

export default function Navbar({
  backendOnline,
  activePage = 'chat',
  setActivePage,
  consultationsCount = 0,
  showTracer = false,
  setShowTracer,
  currentUser,
  onLogout,
}) {
  const isDoctor = currentUser?.role === 'DOCTOR';

  return (
    <header className="navbar">
      <div
        className="nav-brand"
        onClick={() => setActivePage(isDoctor ? 'doctor-portal' : 'chat')}
        style={{ cursor: 'pointer' }}
      >
        <Stethoscope size={28} color="#3b82f6" />
        <div>
          <div className="nav-title">ClinGuard Telehealth</div>
          <div className="nav-subtitle">
            {isDoctor
              ? 'Specialist Clinical Workspace • Telehealth Command Center'
              : 'Verified Clinical AI & Telemedicine Platform'}
          </div>
        </div>
      </div>

      <div className="status-pills">
        {/* Navigation Tabs - Role Isolated */}
        {!isDoctor && (
          <button
            type="button"
            className={`nav-tab-btn ${activePage === 'chat' ? 'active' : ''}`}
            onClick={() => setActivePage('chat')}
            title="Clinical Decision Support AI Workspace"
          >
            <Stethoscope size={15} color={activePage === 'chat' ? '#34d399' : '#38bdf8'} />
            <span>Clinical AI</span>
          </button>
        )}

        {!isDoctor && (
          <button
            type="button"
            className={`nav-tab-btn ${activePage === 'consultations' ? 'active' : ''}`}
            onClick={() => setActivePage('consultations')}
            title="View Confirmed Patient Passes & Live WebRTC Video Calls"
          >
            <CalendarCheck size={15} color={activePage === 'consultations' ? '#34d399' : '#10b981'} />
            <span>My Consultations</span>
            {consultationsCount > 0 && (
              <span className="nav-count-badge">{consultationsCount}</span>
            )}
          </button>
        )}

        {isDoctor && (
          <button
            type="button"
            className={`nav-tab-btn ${activePage === 'doctor-portal' ? 'active' : ''}`}
            onClick={() => setActivePage('doctor-portal')}
            title="Doctor Clinical Telemedicine Dashboard & Patient Queue"
          >
            <UserCheck size={15} color={activePage === 'doctor-portal' ? '#34d399' : '#60a5fa'} />
            <span>Doctor Portal</span>
            {consultationsCount > 0 && (
              <span className="nav-count-badge doctor-badge">{consultationsCount}</span>
            )}
          </button>
        )}

        {/* Observability Metrics Tab */}
        <button
          type="button"
          className={`nav-tab-btn ${activePage === 'metrics' ? 'active' : ''}`}
          onClick={() => setActivePage('metrics')}
          title="Clinical Safety, Grounding & Observability Metrics"
        >
          <BarChart3 size={15} color={activePage === 'metrics' ? '#34d399' : '#94a3b8'} />
          <span>Metrics</span>
        </button>

        {/* Telemetry Console Tab */}
        <button
          type="button"
          className={`nav-tab-btn ${activePage === 'console' ? 'active' : ''}`}
          onClick={() => setActivePage('console')}
          title="Clinical System Telemetry & LangGraph Node Trace Logs"
        >
          <Terminal size={15} color={activePage === 'console' ? '#34d399' : '#94a3b8'} />
          <span>Console</span>
        </button>

        {/* Clinical Audit Trace Toggle Button (Shown ONLY for patients on Clinical AI page) */}
        {!isDoctor && activePage === 'chat' && (
          <button
            type="button"
            className={`tab-btn tracer-nav-btn ${showTracer ? 'active tracer-active' : ''}`}
            onClick={() => setShowTracer && setShowTracer(!showTracer)}
            title={showTracer ? 'Hide Clinical Audit Trace' : 'Open Multi-Stage Clinical Verification Engine'}
          >
            <Cpu size={14} color={showTracer ? '#c084fc' : '#a855f7'} />
            <span>Clinical Audit Trace</span>
            {showTracer && <span className="tracer-nav-dot" />}
          </button>
        )}


        {/* Authenticated User Badge & Logout */}
        {currentUser && (
          <div className="user-profile-badge">
            <div className={`user-avatar ${isDoctor ? 'doctor-avatar' : 'patient-avatar'}`}>
              {isDoctor ? <BadgeCheck size={14} color="#60a5fa" /> : <User size={14} color="#34d399" />}
            </div>
            <div className="user-info-text">
              <span className="user-name">{currentUser.full_name}</span>
              <span className={`user-role-tag ${isDoctor ? 'role-doctor' : 'role-patient'}`}>
                {isDoctor ? (currentUser.doctor_profile?.specialty || 'Specialist') : 'Patient'}
              </span>
            </div>
            {onLogout && (
              <button
                type="button"
                className="user-logout-btn"
                onClick={onLogout}
                title="Sign Out of Healthcare Session"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
