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

-- Structured Health Information (Structured Booleans)
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

CREATE TABLE IF NOT EXISTS medical_documents (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    storage_reference TEXT,
    uploaded_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
