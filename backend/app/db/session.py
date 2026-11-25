import os
import json
import hashlib
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Ensure data directory exists
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(DATA_DIR, 'clinical_agent.db')}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str) -> str:
    """Computes SHA-256 hash for secure user authentication."""
    return hashlib.sha256(password.strip().encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed: str) -> bool:
    """Verifies plain password against hashed password."""
    return hash_password(plain_password) == hashed


DEFAULT_SLOTS = ["09:30 AM", "11:00 AM", "02:30 PM", "05:00 PM", "07:30 PM"]

SEED_DOCTORS = [
    {
        "name": "Dr. Arvind Swaminathan",
        "specialty": "Pulmonologist",
        "qualifications": "MBBS, MD (Pulmonary Medicine), DM (Critical Care, AIIMS New Delhi)",
        "experience_years": 16,
        "registration_number": "NMC-48291",
        "hospital_affiliation": "Apollo Specialty Hospital, Bengaluru",
        "languages": "English, Hindi, Kannada",
        "rating": 4.95,
        "consultations_count": 1820,
        "consultation_fee": 950,
        "bio": "Senior Consultant Pulmonologist and Critical Care Specialist with 16+ years of expertise in ARDS, severe COVID-19, mechanical ventilation, and interstitial lung diseases. Former Chief Resident at AIIMS.",
        "available_slots": json.dumps(DEFAULT_SLOTS),
    },
    {
        "name": "Dr. Radhika Sen",
        "specialty": "Pulmonologist",
        "qualifications": "MBBS, MD (Chest Medicine, KEM Mumbai), FCCP (USA)",
        "experience_years": 12,
        "registration_number": "NMC-39104",
        "hospital_affiliation": "Manipal Hospital, Bengaluru",
        "languages": "English, Hindi, Bengali",
        "rating": 4.88,
        "consultations_count": 1240,
        "consultation_fee": 850,
        "bio": "Expert in obstructive airway diseases, acute respiratory failure, post-viral pulmonary fibrosis, and bronchoscopy interventions. Active member of Indian Chest Society.",
        "available_slots": json.dumps(DEFAULT_SLOTS),
    },
    {
        "name": "Dr. Siddharth Mukherjee",
        "specialty": "Cardiologist",
        "qualifications": "MBBS, MD (Medicine), DM (Cardiology, CMC Vellore), FACC",
        "experience_years": 18,
        "registration_number": "NMC-51209",
        "hospital_affiliation": "Fortis Escorts Heart Institute, New Delhi",
        "languages": "English, Hindi, Tamil",
        "rating": 4.96,
        "consultations_count": 2340,
        "consultation_fee": 1200,
        "bio": "Interventional Cardiologist specializing in ischemic heart disease, acute coronary syndromes, refractory hypertension, and cardiac arrhythmias.",
        "available_slots": json.dumps(DEFAULT_SLOTS),
    },
    {
        "name": "Dr. Meera Nambiar",
        "specialty": "Cardiologist",
        "qualifications": "MBBS, MD (Internal Medicine), DNB (Cardiology, AIIMS)",
        "experience_years": 11,
        "registration_number": "NMC-62381",
        "hospital_affiliation": "Aster CMI Hospital, Bengaluru",
        "languages": "English, Malayalam, Hindi, Kannada",
        "rating": 4.89,
        "consultations_count": 970,
        "consultation_fee": 900,
        "bio": "Clinical cardiologist focusing on preventative cardiology, heart failure pharmacotherapy, dyslipidemia management, and valvular heart conditions.",
        "available_slots": json.dumps(DEFAULT_SLOTS),
    },
    {
        "name": "Dr. Rohan Kulkarni",
        "specialty": "Neurologist",
        "qualifications": "MBBS, MD, DM (Neurology, NIMHANS Bengaluru)",
        "experience_years": 14,
        "registration_number": "NMC-34710",
        "hospital_affiliation": "Apollo Hospitals, Hyderabad",
        "languages": "English, Hindi, Telugu, Marathi",
        "rating": 4.92,
        "consultations_count": 1560,
        "consultation_fee": 1100,
        "bio": "Senior Neurologist with deep clinical experience in acute stroke management, intractable seizures, neuropathy, headache syndromes, and neuro-immunological disorders.",
        "available_slots": json.dumps(DEFAULT_SLOTS),
    },
    {
        "name": "Dr. Ananya Roy",
        "specialty": "Endocrinologist",
        "qualifications": "MBBS, MD (Medicine, PGI Chandigarh), DM (Endocrinology)",
        "experience_years": 13,
        "registration_number": "NMC-58923",
        "hospital_affiliation": "Max Super Speciality Hospital, New Delhi",
        "languages": "English, Hindi, Bengali",
        "rating": 4.91,
        "consultations_count": 1420,
        "consultation_fee": 900,
        "bio": "Specialist in Type 1 & 2 diabetes optimization, steroid-induced hyperglycemia, thyroid nodules, gestational endocrinopathies, and metabolic bone disorders.",
        "available_slots": json.dumps(DEFAULT_SLOTS),
    },
    {
        "name": "Dr. Kavita Deshmukh",
        "specialty": "Gynecologist",
        "qualifications": "MBBS, MS (OBG), DNB, Fellowship in Reproductive Medicine",
        "experience_years": 15,
        "registration_number": "NMC-41908",
        "hospital_affiliation": "Cloudnine Hospital, Mumbai",
        "languages": "English, Hindi, Marathi, Gujarati",
        "rating": 4.94,
        "consultations_count": 1950,
        "consultation_fee": 1000,
        "bio": "Leading Obstetrician & Gynecologist specializing in high-risk pregnancies, maternal-fetal wellness, PCOS protocols, and reproductive endocrinology.",
        "available_slots": json.dumps(DEFAULT_SLOTS),
    },
    {
        "name": "Dr. Rajesh V. Iyer",
        "specialty": "General Physician",
        "qualifications": "MBBS, MD (Internal Medicine, Madras Medical College)",
        "experience_years": 20,
        "registration_number": "NMC-28941",
        "hospital_affiliation": "Narayana Health City, Bengaluru",
        "languages": "English, Hindi, Tamil, Kannada",
        "rating": 4.9,
        "consultations_count": 3400,
        "consultation_fee": 700,
        "bio": "Consultant Physician with 20 years of clinical acumen in multi-system infection management, fever of unknown origin, adult immunization, and comprehensive triage.",
        "available_slots": json.dumps(DEFAULT_SLOTS),
    },
    {
        "name": "Dr. Pooja Chawla",
        "specialty": "General Physician",
        "qualifications": "MBBS, DNB (Family Medicine, Sir Ganga Ram Hospital)",
        "experience_years": 9,
        "registration_number": "NMC-71829",
        "hospital_affiliation": "Apollo Clinic, Gurugram",
        "languages": "English, Hindi, Punjabi",
        "rating": 4.84,
        "consultations_count": 910,
        "consultation_fee": 650,
        "bio": "Family Medicine & Acute Care Physician dedicated to evidence-based primary care, acute viral illnesses, antibiotic stewardship, and chronic illness triage.",
        "available_slots": json.dumps(DEFAULT_SLOTS),
    },
]


def seed_doctors_if_empty(db):
    from app.db.models import Doctor

    count = db.query(Doctor).count()
    if count == 0:
        print("[INFO] Seeding specialist doctors into SQLite...")
        for doc_data in SEED_DOCTORS:
            doctor = Doctor(**doc_data)
            db.add(doctor)
        db.commit()
        print(f"[SUCCESS] Seeded {len(SEED_DOCTORS)} specialist doctors.")


def migrate_schema_if_needed(engine):
    """
    Ensures new columns are added to SQLite tables if they do not exist.
    """
    from sqlalchemy import text

    with engine.connect() as conn:
        # Check appointments table columns
        try:
            result = conn.execute(text("PRAGMA table_info(appointments)"))
            existing_cols = {row[1] for row in result.fetchall()}
            
            new_columns = [
                ("patient_email", "VARCHAR(120)"),
                ("payment_status", "VARCHAR(30) DEFAULT 'PAID'"),
                ("payment_method", "VARCHAR(40) DEFAULT 'UPI'"),
                ("transaction_id", "VARCHAR(80)"),
                ("amount_paid", "INTEGER DEFAULT 800"),
                ("doctor_notified", "BOOLEAN DEFAULT 1"),
                ("doctor_notes", "TEXT"),
            ]

            for col_name, col_type in new_columns:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE appointments ADD COLUMN {col_name} {col_type}"))
                    print(f"[INFO] Migrated SQLite column: appointments.{col_name}")
            conn.commit()
        except Exception as e:
            print(f"[WARN] Schema migration note: {e}")


def seed_users_if_empty(db):
    """
    Seeds demo patient and doctor user accounts if they do not already exist.
    Also migrates any legacy @clinicalrag.ai emails to @clinguard.health.
    """
    from app.db.models import User, Doctor

    # 1. Migrate legacy @clinicalrag.ai users if present
    legacy_users = db.query(User).filter(User.email.like("%@clinicalrag.ai")).all()
    for lu in legacy_users:
        lu.email = lu.email.replace("@clinicalrag.ai", "@clinguard.health")
    if legacy_users:
        db.commit()
        print(f"[INFO] Migrated {len(legacy_users)} legacy user emails to @clinguard.health")

    # 2. Seed demo patient
    demo_patient = db.query(User).filter(User.email == "patient@clinguard.health").first()
    if not demo_patient:
        print("[INFO] Seeding demo patient user account...")
        patient_user = User(
            full_name="Rahul Sharma",
            email="patient@clinguard.health",
            password_hash=hash_password("patient123"),
            role="PATIENT",
            age=32,
            phone="+91 98765 43210",
        )
        db.add(patient_user)
        db.commit()
        print("[SUCCESS] Seeded demo patient (patient@clinguard.health / patient123).")

    # 3. Seed doctor accounts for all available doctors
    doctor_logins = [
        ("Dr. Arvind Swaminathan", "arvind@clinguard.health", "doctor123"),
        ("Dr. Siddharth Mukherjee", "siddharth@clinguard.health", "doctor123"),
        ("Dr. Radhika Sen", "radhika@clinguard.health", "doctor123"),
        ("Dr. Rajesh V. Iyer", "rajesh@clinguard.health", "doctor123"),
        ("Dr. Meera Nambiar", "meera@clinguard.health", "doctor123"),
        ("Dr. Rohan Kulkarni", "rohan@clinguard.health", "doctor123"),
        ("Dr. Ananya Roy", "ananya@clinguard.health", "doctor123"),
        ("Dr. Kavita Deshmukh", "kavita@clinguard.health", "doctor123"),
        ("Dr. Pooja Chawla", "pooja@clinguard.health", "doctor123"),
    ]

    for doc_name, email, password in doctor_logins:
        user_exists = db.query(User).filter(User.email == email).first()
        if not user_exists:
            doctor_record = db.query(Doctor).filter(Doctor.name == doc_name).first()
            if doctor_record:
                doc_user = User(
                    full_name=doctor_record.name,
                    email=email,
                    password_hash=hash_password(password),
                    role="DOCTOR",
                    phone="+91 98450 11223",
                    doctor_id=doctor_record.id,
                )
                db.add(doc_user)
                db.commit()
                print(f"[SUCCESS] Seeded doctor account: {email} -> {doctor_record.name}")


def init_db():
    from app.db import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    migrate_schema_if_needed(engine)
    db = SessionLocal()
    try:
        seed_doctors_if_empty(db)
        seed_users_if_empty(db)
    finally:
        db.close()

