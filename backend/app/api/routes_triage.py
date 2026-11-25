import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Doctor, Appointment

router = APIRouter(prefix="/api", tags=["Clinical Triage & Telemedicine"])


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────────────

class TriageRequest(BaseModel):
    query: str = Field(..., description="Patient clinical query or presented symptoms")
    answer: Optional[str] = Field(default="", description="Generated RAG answer or clinical guideline output")
    citations: Optional[List[Any]] = Field(default=[], description="Verified clinical citations and sources")


class SoapNote(BaseModel):
    subjective: str
    assessment: str
    guideline_evidence: str
    plan: str


class TriageResponse(BaseModel):
    condition: str
    specialty: str
    urgency_level: str  # "ROUTINE", "PRIORITY", "URGENT"
    urgency_badge: str
    urgency_reason: str
    soap_note: SoapNote
    doctors: List[Dict[str, Any]]


class AppointmentCreate(BaseModel):
    doctor_id: int
    patient_name: str
    patient_age: int
    patient_contact: str
    patient_email: Optional[str] = None
    appointment_date: str  # YYYY-MM-DD
    time_slot: str  # e.g., "09:30 AM"
    consultation_mode: str = "Video Call"
    urgency_level: str = "ROUTINE"
    patient_query: str
    soap_clinical_summary: str
    verified_citations: Optional[List[Any]] = []
    consent_granted: bool = False
    consent_scope: Optional[str] = "Telemedicine Consultation & AI SOAP Summary Sharing"
    payment_status: Optional[str] = "PAID"
    payment_method: Optional[str] = "UPI"
    transaction_id: Optional[str] = None
    amount_paid: Optional[int] = None
    doctor_notified: Optional[bool] = True
    doctor_notes: Optional[str] = None


class DoctorRegister(BaseModel):
    name: str
    specialty: str
    qualifications: str
    registration_number: str
    hospital_affiliation: str
    experience_years: Optional[int] = 5
    languages: Optional[str] = "English, Hindi"
    rating: Optional[float] = 4.9
    consultations_count: Optional[int] = 0
    consultation_fee: Optional[int] = 800
    bio: str
    available_slots: Optional[List[str]] = None


class PrescriptionUpdate(BaseModel):
    doctor_notes: str
    status: Optional[str] = "COMPLETED"


# ─────────────────────────────────────────────────────────────────────────────
# Clinical Classification & SOAP Generator
# ─────────────────────────────────────────────────────────────────────────────

SPECIALTY_KEYWORDS = {
    "Pulmonologist": [
        "corticosteroid", "covid", "oxygen", "saturation", "hypoxemia", "respiratory",
        "pulmonary", "remdesivir", "asthma", "copd", "cough", "dyspnea", "breath",
        "pneumonia", "ventilat", "ards", "lung", "spo2", "bronchitis", "wheez"
    ],
    "Cardiologist": [
        "heart", "cardiac", "chest pain", "angina", "myocardial", "infarction",
        "hypertension", "blood pressure", "arrhythmia", "palpitation", "ecg", "troponin",
        "atherosclerosis", "coronary", "chf", "tachycardia"
    ],
    "Neurologist": [
        "stroke", "seizure", "epilepsy", "neuropathy", "headache", "migraine",
        "numbness", "paralysis", "tremor", "parkinson", "alzheimer", "meningitis",
        "coma", "brain", "dizziness", "vertigo", "concussion", "reflex"
    ],
    "Endocrinologist": [
        "diabetes", "insulin", "glucose", "hba1c", "thyroid", "tsh", "adrenal",
        "cortisol", "metabolic", "obesity", "hyperglycemia", "hypoglycemia", "hormone", "pcos"
    ],
    "Gynecologist": [
        "pregnancy", "pregnant", "obstetric", "ovarian", "uterus", "menstrual",
        "gestational", "trimester", "fetal", "postpartum", "cervical", "fertility", "labor"
    ],
}

URGENT_RED_FLAGS = [
    "spo2 < 90", "spo2 < 92", "respiratory failure", "acute hypoxem", "mechanical ventilation",
    "intubation", "crushing chest pain", "radiating arm pain", "unconscious", "anaphylaxis",
    "altered mental", "cyanosis", "hemoptysis", "stroke symptoms", "sudden paralysis"
]

PRIORITY_FLAGS = [
    "severe covid", "corticosteroid", "remdesivir", "oxygen saturation target",
    "high fever", "progressive dyspnea", "uncontrolled hypertension", "arrhythmia",
    "severe pain", "gestational complication", "hyperglycemia > 300"
]


def classify_clinical_triage(query: str, answer: str, citations: List[Any]) -> Dict[str, Any]:
    text_corpus = f"{query.lower()} {answer.lower()}"

    # 1. Classify Specialty
    specialty_scores = {spec: 0 for spec in SPECIALTY_KEYWORDS}
    for spec, kw_list in SPECIALTY_KEYWORDS.items():
        for kw in kw_list:
            if kw in text_corpus:
                specialty_scores[spec] += 2 if kw in query.lower() else 1

    top_specialty = max(specialty_scores, key=specialty_scores.get)
    if specialty_scores[top_specialty] == 0:
        top_specialty = "General Physician"

    # 2. Determine Urgency
    is_urgent = any(rf in text_corpus for rf in URGENT_RED_FLAGS)
    is_priority = any(pf in text_corpus for pf in PRIORITY_FLAGS)

    if is_urgent:
        urgency_level = "URGENT"
        urgency_badge = "Urgent Specialist Intervention Required"
        urgency_reason = "Critical clinical indicators (hypoxemic crisis / acute organ compromise) detected."
    elif is_priority:
        urgency_level = "PRIORITY"
        urgency_badge = "Priority Review Recommended (Within 24 Hours)"
        urgency_reason = "Severe clinical presentation requires specialist regimen adjustment and vitals monitoring."
    else:
        urgency_level = "ROUTINE"
        urgency_badge = "Routine Specialist Consult (Next 2-3 Days)"
        urgency_reason = "Stable symptoms; clinical guideline consultation recommended for optimal management."

    # 3. Detect Clinical Condition Title
    condition = "General Clinical Review"
    if "corticosteroid" in text_corpus or "covid" in text_corpus:
        condition = "Severe COVID-19 / Acute Respiratory Distress Syndrome"
    elif "remdesivir" in text_corpus:
        condition = "COVID-19 Pharmacotherapy & Antiviral Protocol"
    elif "oxygen" in text_corpus or "hypoxem" in text_corpus:
        condition = "Acute Hypoxemic Respiratory Failure"
    elif "chest pain" in text_corpus or "heart" in text_corpus:
        condition = "Acute Coronary / Cardiovascular Assessment"
    elif "diabetes" in text_corpus or "glucose" in text_corpus:
        condition = "Endocrine Glycemic Optimization"
    elif top_specialty != "General Physician":
        condition = f"{top_specialty} Guideline Evaluation"

    # 4. Synthesize Pre-Consultation SOAP Note
    # Subjective
    subjective = f"Patient presented with clinical inquiry regarding: '{query}'. Symptoms and questions involve therapeutic guidance and safety parameters."
    
    # Assessment
    assessment = (
        f"Clinical classification: {condition}. Assessed urgency: {urgency_level}. "
        f"Primary physiological considerations involve {top_specialty.lower()} evaluation. "
        f"{urgency_reason}"
    )

    # Guideline Evidence
    guideline_evidence = ""
    if answer:
        # Extract first 250 characters of answer as crisp summary
        clean_ans = " ".join(answer.split()[:50])
        guideline_evidence = f"Verified Guideline Findings: {clean_ans}..."
    else:
        guideline_evidence = "Reference NIH/WHO/ICMR peer-reviewed guidelines indexed in ChromaDB vector repository."

    # Plan
    plan = (
        f"1. Schedule telemedicine consultation with a board-certified {top_specialty}.\n"
        f"2. Monitor baseline physiological parameters (SpO2, Pulse, Blood Pressure).\n"
        f"3. Review current medication list and past medical history with specialist.\n"
        f"4. Seek immediate emergency care if breathing difficulty or acute chest pain worsens."
    )

    soap = SoapNote(
        subjective=subjective,
        assessment=assessment,
        guideline_evidence=guideline_evidence,
        plan=plan,
    )

    return {
        "condition": condition,
        "specialty": top_specialty,
        "urgency_level": urgency_level,
        "urgency_badge": urgency_badge,
        "urgency_reason": urgency_reason,
        "soap_note": soap,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/triage/recommend", response_model=TriageResponse)
def get_triage_recommendations(payload: TriageRequest, db: Session = Depends(get_db)):
    """
    Classifies the clinical query, generates a structured SOAP pre-consultation note,
    and returns matching specialist doctors from SQLite.
    """
    triage_info = classify_clinical_triage(
        query=payload.query,
        answer=payload.answer or "",
        citations=payload.citations or []
    )

    specialty = triage_info["specialty"]

    # Query matching specialist doctors
    matched_doctors = db.query(Doctor).filter(Doctor.specialty == specialty).all()

    # If fewer than 2 matched, augment with General Physicians or other specialists
    if len(matched_doctors) < 2:
        general_docs = db.query(Doctor).filter(Doctor.specialty == "General Physician").all()
        matched_doctors.extend(general_docs)

    # Sort doctors by rating descending
    matched_doctors.sort(key=lambda d: d.rating, reverse=True)
    doctors_list = [d.to_dict() for d in matched_doctors[:4]]

    return {
        "condition": triage_info["condition"],
        "specialty": triage_info["specialty"],
        "urgency_level": triage_info["urgency_level"],
        "urgency_badge": triage_info["urgency_badge"],
        "urgency_reason": triage_info["urgency_reason"],
        "soap_note": triage_info["soap_note"],
        "doctors": doctors_list,
    }


@router.get("/doctors")
def list_doctors(
    specialty: Optional[str] = Query(None, description="Optional specialty filter"),
    db: Session = Depends(get_db),
):
    """
    Returns verified doctor profiles with hospital affiliations and ratings.
    """
    query = db.query(Doctor)
    if specialty:
        query = query.filter(Doctor.specialty == specialty)
    doctors = query.order_by(Doctor.rating.desc()).all()
    return [d.to_dict() for d in doctors]


@router.get("/doctors/{doctor_id}/slots")
def get_doctor_slots(
    doctor_id: int,
    date: str = Query(..., description="Target consultation date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
):
    """
    Returns available time slots for a given doctor and date,
    checking SQLite appointments to flag is_booked=True (real-time double booking lock).
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    doc_dict = doctor.to_dict()
    slots = doc_dict.get("available_slots", [])

    # Find already-booked appointments for this doctor on this date
    booked_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date == date,
            Appointment.status != "CANCELLED",
        )
        .all()
    )
    booked_slots = {apt.time_slot for apt in booked_appointments}

    slots_status = [
        {
            "slot": s,
            "is_booked": s in booked_slots,
        }
        for s in slots
    ]

    return {
        "doctor": doc_dict,
        "date": date,
        "slots": slots_status,
        "total_slots": len(slots),
        "available_count": len(slots) - len(booked_slots),
    }


@router.post("/api/appointments", response_model=Dict[str, Any])
@router.post("/appointments", response_model=Dict[str, Any])
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    """
    Books a consultation appointment with mandatory digital patient consent
    and double-booking prevention.
    """
    # 1. Validate mandatory digital patient consent
    if not payload.consent_granted:
        raise HTTPException(
            status_code=400,
            detail="Explicit patient consent is required to share clinical summary and schedule a consultation.",
        )

    # 2. Verify doctor exists
    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Selected doctor not found.")

    # 3. Check for double-booking lock
    existing_booking = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == payload.doctor_id,
            Appointment.appointment_date == payload.appointment_date,
            Appointment.time_slot == payload.time_slot,
            Appointment.status != "CANCELLED",
        )
        .first()
    )
    if existing_booking:
        raise HTTPException(
            status_code=409,
            detail=f"Time slot '{payload.time_slot}' on {payload.appointment_date} has already been booked. Please choose another slot.",
        )

    # 4. Compute day of week from date
    try:
        date_obj = datetime.strptime(payload.appointment_date, "%Y-%m-%d")
        day_of_week = date_obj.strftime("%A")
    except Exception:
        day_of_week = "Scheduled Day"

    # 5. Generate unique booking code, transaction ID, and Jitsi WebRTC room URL
    booking_code = f"APT-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}"
    transaction_id = payload.transaction_id or f"TXN-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}"
    amount_paid = payload.amount_paid or doctor.consultation_fee
    meeting_url = f"https://meet.jit.si/ClinGuard-{booking_code}"

    # 6. Save to SQLite
    citations_json = json.dumps(payload.verified_citations) if payload.verified_citations else "[]"
    appointment = Appointment(
        booking_code=booking_code,
        doctor_id=payload.doctor_id,
        patient_name=payload.patient_name.strip(),
        patient_age=payload.patient_age,
        patient_contact=payload.patient_contact.strip(),
        patient_email=payload.patient_email.strip().lower() if payload.patient_email else None,
        appointment_date=payload.appointment_date.strip(),
        appointment_day=day_of_week,
        time_slot=payload.time_slot.strip(),
        consultation_mode=payload.consultation_mode,
        urgency_level=payload.urgency_level,
        patient_query=payload.patient_query.strip(),
        soap_clinical_summary=payload.soap_clinical_summary.strip(),
        verified_citations=citations_json,
        consent_granted=True,
        consent_timestamp=datetime.utcnow().isoformat(),
        consent_scope=payload.consent_scope or "Direct Doctor Consultation & Clinical Summary Review",
        meeting_url=meeting_url,
        status="CONFIRMED",
        payment_status=payload.payment_status or "PAID",
        payment_method=payload.payment_method or "UPI",
        transaction_id=transaction_id,
        amount_paid=amount_paid,
        doctor_notified=True,
        doctor_notes=payload.doctor_notes or "",
    )

    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return appointment.to_dict()


@router.post("/api/doctors/register")
@router.post("/doctors/register")
def register_doctor(payload: DoctorRegister, db: Session = Depends(get_db)):
    """
    Onboards a new specialist doctor into the SQLite doctors table.
    Allows extending the doctor directory dynamically during live demos.
    """
    default_slots = payload.available_slots or ["09:30 AM", "11:00 AM", "02:30 PM", "05:00 PM", "07:30 PM"]
    doctor = Doctor(
        name=payload.name.strip(),
        specialty=payload.specialty.strip(),
        qualifications=payload.qualifications.strip(),
        experience_years=payload.experience_years or 5,
        registration_number=payload.registration_number.strip(),
        hospital_affiliation=payload.hospital_affiliation.strip(),
        languages=payload.languages or "English, Hindi",
        rating=payload.rating or 4.9,
        consultations_count=payload.consultations_count or 0,
        consultation_fee=payload.consultation_fee or 800,
        bio=payload.bio.strip(),
        available_slots=json.dumps(default_slots),
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor.to_dict()


@router.patch("/api/appointments/{booking_code}/prescription")
@router.patch("/appointments/{booking_code}/prescription")
def update_appointment_prescription(
    booking_code: str,
    payload: PrescriptionUpdate,
    db: Session = Depends(get_db),
):
    """
    Allows a doctor in the Doctor Portal or Embedded Video Room to save
    post-consultation clinical advice / prescription notes and mark status COMPLETED.
    """
    appointment = db.query(Appointment).filter(Appointment.booking_code == booking_code).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    appointment.doctor_notes = payload.doctor_notes.strip()
    if payload.status:
        appointment.status = payload.status

    db.commit()
    db.refresh(appointment)
    return appointment.to_dict()


@router.get("/api/appointments")
@router.get("/appointments")
def list_appointments(
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    patient_email: Optional[str] = Query(None, description="Filter by patient email"),
    db: Session = Depends(get_db),
):
    """
    Returns booked appointments joined with doctor profiles.
    Can be filtered by doctor_id (for Doctor Portal) or patient_email (for Patient Consultations).
    """
    from sqlalchemy import or_

    query = db.query(Appointment).order_by(Appointment.id.desc())
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)

    if patient_email:
        email_clean = patient_email.strip().lower()
        query = query.filter(
            or_(
                Appointment.patient_email == email_clean,
                Appointment.patient_contact.contains(email_clean),
            )
        )

    appointments = query.all()
    return [apt.to_dict() for apt in appointments]


