import json
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db, hash_password, verify_password
from app.db.models import User, Doctor

router = APIRouter(tags=["Authentication & User Management"])


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)
    role: str = Field(default="PATIENT")  # "PATIENT" or "DOCTOR"
    age: Optional[int] = None
    phone: Optional[str] = None

    # Doctor specific fields (optional during general registration, required if role == DOCTOR)
    specialty: Optional[str] = None
    qualifications: Optional[str] = None
    registration_number: Optional[str] = None
    hospital_affiliation: Optional[str] = None
    experience_years: Optional[int] = 5
    languages: Optional[str] = "English, Hindi"
    consultation_fee: Optional[int] = 800
    bio: Optional[str] = None
    available_slots: Optional[List[str]] = None


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5)
    password: str
    role: Optional[str] = None  # "PATIENT" or "DOCTOR"


class DoctorProfileUpdate(BaseModel):
    consultation_fee: Optional[int] = None
    available_slots: Optional[List[str]] = None
    hospital_affiliation: Optional[str] = None
    bio: Optional[str] = None
    languages: Optional[str] = None
    qualifications: Optional[str] = None


@router.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new Patient or Doctor account.
    If role is DOCTOR, simultaneously creates the Doctor directory record.
    """
    norm_email = payload.email.lower().strip()
    existing_user = db.query(User).filter(User.email == norm_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{norm_email}' already exists. Please log in.",
        )

    doctor_id = None
    role = payload.role.upper().strip()
    if role not in ("PATIENT", "DOCTOR"):
        role = "PATIENT"

    if role == "DOCTOR":
        slots = payload.available_slots or ["09:30 AM", "11:00 AM", "02:30 PM", "05:00 PM", "07:30 PM"]
        doc = Doctor(
            name=payload.full_name.strip(),
            specialty=payload.specialty.strip() if payload.specialty else "General Physician",
            qualifications=payload.qualifications.strip() if payload.qualifications else "MBBS, MD",
            experience_years=payload.experience_years or 5,
            registration_number=payload.registration_number.strip() if payload.registration_number else f"NMC-{uuid.uuid4().hex[:5].upper()}",
            hospital_affiliation=payload.hospital_affiliation.strip() if payload.hospital_affiliation else "Clinical Medical Center",
            languages=payload.languages or "English, Hindi",
            rating=4.9,
            consultations_count=0,
            consultation_fee=payload.consultation_fee or 800,
            bio=payload.bio.strip() if payload.bio else f"Consultant Specialist in {payload.specialty or 'Medicine'}",
            available_slots=json.dumps(slots),
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        doctor_id = doc.id

    new_user = User(
        full_name=payload.full_name.strip(),
        email=norm_email,
        password_hash=hash_password(payload.password),
        role=role,
        age=payload.age,
        phone=payload.phone.strip() if payload.phone else "",
        doctor_id=doctor_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = f"med-tok-{uuid.uuid4().hex}"
    return {
        "status": "success",
        "message": f"Successfully registered as {role}",
        "token": token,
        "user": new_user.to_dict(),
    }


@router.post("/api/auth/login")
@router.post("/auth/login")
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates user credentials and returns user profile & token.
    Enforces role matching when role parameter is provided.
    """
    norm_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == norm_email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials.",
        )

    if payload.role and payload.role.upper() != user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is registered as a {user.role.title()}. Please switch to the {user.role.title()} login portal.",
        )

    token = f"med-tok-{uuid.uuid4().hex}"
    return {
        "status": "success",
        "message": f"Welcome back, {user.full_name}",
        "token": token,
        "user": user.to_dict(),
    }


@router.patch("/api/doctors/{doctor_id}/profile")
@router.patch("/doctors/{doctor_id}/profile")
def update_doctor_profile(
    doctor_id: int,
    payload: DoctorProfileUpdate,
    db: Session = Depends(get_db),
):
    """
    Allows a specialist doctor to dynamically update their fee, availability slots,
    hospital affiliation, or bio.
    """
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    if payload.consultation_fee is not None:
        doctor.consultation_fee = max(100, int(payload.consultation_fee))

    if payload.available_slots is not None:
        doctor.available_slots = json.dumps(payload.available_slots)

    if payload.hospital_affiliation is not None:
        doctor.hospital_affiliation = payload.hospital_affiliation.strip()

    if payload.bio is not None:
        doctor.bio = payload.bio.strip()

    if payload.languages is not None:
        doctor.languages = payload.languages.strip()

    if payload.qualifications is not None:
        doctor.qualifications = payload.qualifications.strip()

    db.commit()
    db.refresh(doctor)
    return {
        "status": "success",
        "message": "Doctor profile updated successfully.",
        "doctor": doctor.to_dict(),
    }
