-- Schema migration for MediCare Consultant PostgreSQL Database

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(150),
    phone VARCHAR(50),
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'patient',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(user_id) ON DELETE SET NULL,
    patient_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    date_of_birth VARCHAR(50),
    gender VARCHAR(20) DEFAULT 'Other',
    blood_group VARCHAR(10) NOT NULL DEFAULT 'O+',
    phone VARCHAR(50),
    email VARCHAR(150),
    address TEXT,
    profile_photo TEXT,
    profile_completed BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Primary and Secondary Guardians
CREATE TABLE IF NOT EXISTS guardians (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id) ON DELETE CASCADE,
    guardian_order INTEGER NOT NULL DEFAULT 1, -- 1 = Primary, 2 = Secondary
    guardian_name VARCHAR(150) NOT NULL DEFAULT '',
    guardian_phone VARCHAR(50) NOT NULL DEFAULT '',
    relationship VARCHAR(100) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_patient_guardian_order UNIQUE (patient_id, guardian_order)
);

-- Structured Health Information (Booleans in PostgreSQL)
CREATE TABLE IF NOT EXISTS health_information (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) UNIQUE REFERENCES patients(patient_id) ON DELETE CASCADE,
    allergies BOOLEAN NOT NULL DEFAULT FALSE,
    diabetes BOOLEAN NOT NULL DEFAULT FALSE,
    hypertension BOOLEAN NOT NULL DEFAULT FALSE,
    asthma BOOLEAN NOT NULL DEFAULT FALSE,
    heart_condition BOOLEAN NOT NULL DEFAULT FALSE,
    major_surgery BOOLEAN NOT NULL DEFAULT FALSE,
    regular_medication BOOLEAN NOT NULL DEFAULT FALSE,
    chronic_condition BOOLEAN NOT NULL DEFAULT FALSE,
    drug_reaction BOOLEAN NOT NULL DEFAULT FALSE,
    emergency_condition BOOLEAN NOT NULL DEFAULT FALSE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(user_id) ON DELETE SET NULL,
    doctor_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS helpers (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(user_id) ON DELETE SET NULL,
    helper_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) UNIQUE REFERENCES patients(patient_id) ON DELETE CASCADE,
    medical_history TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical Documents with metadata & file reference
CREATE TABLE IF NOT EXISTS medical_documents (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(100) UNIQUE NOT NULL,
    patient_id VARCHAR(50) REFERENCES patients(patient_id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    storage_reference TEXT NOT NULL,
    uploaded_by VARCHAR(100) DEFAULT 'patient',
    extracted_text TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medications Table
CREATE TABLE IF NOT EXISTS medications (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    start_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mood Entries Table
CREATE TABLE IF NOT EXISTS mood_entries (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    mood VARCHAR(50) NOT NULL,
    score INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Symptom Entries Table
CREATE TABLE IF NOT EXISTS symptom_entries (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    symptom VARCHAR(255) NOT NULL,
    severity VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health Metrics Table
CREATE TABLE IF NOT EXISTS health_metrics (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value NUMERIC NOT NULL,
    unit VARCHAR(50),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification Status Records (Face, Passkey, Camera, Liveness)
CREATE TABLE IF NOT EXISTS verification_records (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL, -- 'face', 'passkey', 'camera_live', 'liveness'
    status VARCHAR(50) NOT NULL DEFAULT 'not_configured', -- 'verified', 'not_configured', 'pending'
    verified_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_patient_verification_type UNIQUE (patient_id, verification_type)
);

-- WebAuthn Credentials for Passkey
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(user_id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    target_user_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Doctor-Patient Persistent Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(100) UNIQUE NOT NULL,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id VARCHAR(50) NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    sender_id VARCHAR(100) NOT NULL,
    receiver_id VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Chat Sessions
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    session_id VARCHAR(100) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'Health Consultation',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Health Assistant Chat History
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'user' or 'model'
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_guardians_patient_id ON guardians(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_info_patient_id ON health_information(patient_id);
CREATE INDEX IF NOT EXISTS idx_verifications_patient_id ON verification_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_patient_id ON medical_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_patient_id ON mood_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_symptom_entries_patient_id ON symptom_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_patient_id ON health_metrics(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_patient ON ai_chat_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_chat_messages_patient_doctor ON chat_messages(patient_id, doctor_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_read ON chat_messages(receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id, created_at ASC);
