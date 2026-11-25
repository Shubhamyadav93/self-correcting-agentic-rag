import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, default="New Clinical Consultation")
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"), index=True)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    grounding_status = Column(String, nullable=True)
    sources_json = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")
    metrics = relationship("QueryMetric", back_populates="message", uselist=False, cascade="all, delete-orphan")


class QueryMetric(Base):
    __tablename__ = "query_metrics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    message_id = Column(Integer, ForeignKey("chat_messages.id"), unique=True)
    grounding_passed = Column(Boolean, default=True)
    sources_used = Column(Integer, default=0)
    web_fallback_used = Column(Boolean, default=False)
    latency_ms = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    message = relationship("ChatMessage", back_populates="metrics")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(120), nullable=False)
    specialty = Column(String(80), nullable=False, index=True)  # Pulmonologist, Cardiologist, etc.
    qualifications = Column(String(200), nullable=False)
    experience_years = Column(Integer, default=10)
    registration_number = Column(String(60), nullable=False)
    hospital_affiliation = Column(String(200), nullable=False)
    languages = Column(String(150), default="English, Hindi")
    rating = Column(Float, default=4.9)
    consultations_count = Column(Integer, default=1000)
    consultation_fee = Column(Integer, default=800)
    bio = Column(Text, nullable=False)
    available_slots = Column(Text, nullable=False)  # JSON string

    appointments = relationship("Appointment", back_populates="doctor")

    def to_dict(self):
        try:
            slots = json.loads(self.available_slots) if self.available_slots else []
        except Exception:
            slots = ["09:30 AM", "11:00 AM", "02:30 PM", "05:00 PM", "07:30 PM"]

        return {
            "id": self.id,
            "name": self.name,
            "specialty": self.specialty,
            "qualifications": self.qualifications,
            "experience_years": self.experience_years,
            "registration_number": self.registration_number,
            "hospital_affiliation": self.hospital_affiliation,
            "languages": self.languages,
            "rating": self.rating,
            "consultations_count": self.consultations_count,
            "consultation_fee": self.consultation_fee,
            "bio": self.bio,
            "available_slots": slots,
        }


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_code = Column(String(40), unique=True, index=True, nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    patient_name = Column(String(120), nullable=False)
    patient_age = Column(Integer, nullable=False)
    patient_contact = Column(String(120), nullable=False)
    patient_email = Column(String(120), nullable=True, index=True)  # Links to User.email
    appointment_date = Column(String(20), nullable=False, index=True)  # YYYY-MM-DD
    appointment_day = Column(String(30), nullable=False)  # e.g., "Friday"
    time_slot = Column(String(30), nullable=False)  # e.g., "09:30 AM"
    consultation_mode = Column(String(30), default="Video Call")  # "Video Call" or "Audio Call"
    urgency_level = Column(String(20), default="ROUTINE")  # "ROUTINE", "PRIORITY", "URGENT"
    patient_query = Column(Text, nullable=False)
    soap_clinical_summary = Column(Text, nullable=False)
    verified_citations = Column(Text, nullable=True)  # JSON string
    consent_granted = Column(Boolean, default=False, nullable=False)
    consent_timestamp = Column(String(40), nullable=True)  # ISO string
    consent_scope = Column(String(200), default="Direct Doctor Consultation & Clinical Summary Review")
    meeting_url = Column(String(250), nullable=False)
    status = Column(String(30), default="CONFIRMED")  # "CONFIRMED" or "COMPLETED"
    
    # Payment & Notification fields
    payment_status = Column(String(30), default="PAID")  # "PAID", "PENDING", "REFUNDED"
    payment_method = Column(String(40), default="UPI")  # "UPI", "Card", "NetBanking"
    transaction_id = Column(String(80), nullable=True)  # e.g., "TXN-2026-849210"
    amount_paid = Column(Integer, default=800)
    doctor_notified = Column(Boolean, default=True)
    doctor_notes = Column(Text, nullable=True)  # Post-call doctor prescription & clinical advice
    
    created_at = Column(DateTime, default=datetime.utcnow)

    doctor = relationship("Doctor", back_populates="appointments")

    def to_dict(self):
        try:
            citations = json.loads(self.verified_citations) if self.verified_citations else []
        except Exception:
            citations = []

        return {
            "id": self.id,
            "booking_code": self.booking_code,
            "doctor_id": self.doctor_id,
            "doctor": self.doctor.to_dict() if self.doctor else None,
            "patient_name": self.patient_name,
            "patient_age": self.patient_age,
            "patient_contact": self.patient_contact,
            "patient_email": self.patient_email or "",
            "appointment_date": self.appointment_date,
            "appointment_day": self.appointment_day,
            "time_slot": self.time_slot,
            "consultation_mode": self.consultation_mode,
            "urgency_level": self.urgency_level,
            "patient_query": self.patient_query,
            "soap_clinical_summary": self.soap_clinical_summary,
            "verified_citations": citations,
            "consent_granted": self.consent_granted,
            "consent_timestamp": self.consent_timestamp,
            "consent_scope": self.consent_scope,
            "meeting_url": self.meeting_url,
            "status": self.status,
            "payment_status": self.payment_status or "PAID",
            "payment_method": self.payment_method or "UPI",
            "transaction_id": self.transaction_id or f"TXN-{self.booking_code}",
            "amount_paid": self.amount_paid or (self.doctor.consultation_fee if self.doctor else 800),
            "doctor_notified": bool(self.doctor_notified),
            "doctor_notes": self.doctor_notes or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(20), nullable=False, default="PATIENT")  # "PATIENT" or "DOCTOR"
    age = Column(Integer, nullable=True)  # For patients
    phone = Column(String(40), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    doctor = relationship("Doctor", foreign_keys=[doctor_id], uselist=False)

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "age": self.age,
            "phone": self.phone or "",
            "doctor_id": self.doctor_id,
            "doctor_profile": self.doctor.to_dict() if self.doctor else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
