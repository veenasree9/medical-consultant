const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const twilio = require("twilio");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const {
    generateRegistrationOptions,
    verifyRegistrationResponse
} = require("@simplewebauthn/server");


dotenv.config();


const app = express();

const PORT =
    process.env.PORT || 3000;


/* ================= CORS ================= */

const allowedOrigins =
    (process.env.FRONTEND_ORIGIN || "*")
        .split(",")
        .map(origin => origin.trim());


app.use(

    cors({

        origin: (origin, callback) => {

            if (
                !origin ||
                allowedOrigins.includes("*") ||
                allowedOrigins.includes(origin)
            ) {

                callback(null, true);

            }

            else {

                callback(
                    new Error(
                        "CORS origin not allowed"
                    )
                );

            }

        },

        methods: [
            "GET",
            "POST",
            "PUT",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]

    })

);


app.use(
    express.json()
);

app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);

const medicalStorageDirectory = path.join(__dirname, "storage", "medical-documents");
fs.mkdirSync(medicalStorageDirectory, { recursive: true });

const allowedMedicalMimeTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const medicalUpload = multer({
    storage: multer.diskStorage({
        destination: medicalStorageDirectory,
        filename: (req, file, callback) => {
            const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
            callback(null, `${Date.now()}-${safeName}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        if (!allowedMedicalMimeTypes.has(file.mimetype)) {
            return callback(new Error("Only PDF, JPG, JPEG, PNG, DOC, and DOCX files are allowed."));
        }

        callback(null, true);
    }
});


/* ================= TWILIO ================= */

const hasTwilio =
    Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_VERIFY_SERVICE_SID
    );


const twilioClient =
    hasTwilio

        ? twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        )

        : null;


/* ================= JWT ================= */

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "CHANGE_THIS_SECRET";

const webAuthnRpId = process.env.WEBAUTHN_RP_ID || "localhost";
const webAuthnOrigin = process.env.WEBAUTHN_ORIGIN || `http://localhost:${PORT}`;
const webAuthnChallenges = new Map();


/* ================= PATIENT DATABASE ================= */

const db = new Database(
    path.join(__dirname, "medical-consultant.db")
);

const pgPool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : false
    })
    : null;

function ensureSqliteSchema() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE,
            role TEXT NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            password_hash TEXT NOT NULL,
            account_status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS doctors (
            doctor_id TEXT PRIMARY KEY,
            user_id TEXT,
            full_name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            specialization TEXT,
            hospital_clinic TEXT,
            profile_photo TEXT,
            verification_info TEXT,
            password_hash TEXT NOT NULL,
            account_status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS helpers (
            helper_id TEXT PRIMARY KEY,
            user_id TEXT,
            full_name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            organization_name TEXT,
            profile_photo TEXT,
            verification_info TEXT,
            password_hash TEXT NOT NULL,
            account_status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS guardians (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT,
            name TEXT,
            phone TEXT,
            relationship TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT,
            uploader_role TEXT,
            uploader_id TEXT,
            file_name TEXT,
            file_url TEXT,
            storage_type TEXT,
            mime_type TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS medical_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT,
            record_type TEXT,
            description TEXT,
            document_url TEXT,
            created_by TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS biometric_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            credential_type TEXT,
            auth_method TEXT,
            public_key TEXT,
            key_handle TEXT,
            encrypted_material TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            revoked_at TEXT
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor_role TEXT,
            actor_id TEXT,
            patient_id TEXT,
            action TEXT,
            reason TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    const patientColumns = new Set(
        db.prepare("PRAGMA table_info(patients)").all().map(column => column.name)
    );

    const columnsToAdd = {
        guardian_name: "TEXT DEFAULT ''",
        guardian_phone: "TEXT DEFAULT ''",
        profile_photo: "TEXT DEFAULT ''",
        medical_history: "TEXT DEFAULT ''",
        medical_notes: "TEXT DEFAULT ''",
        date_of_birth: "TEXT DEFAULT ''",
        created_at: "TEXT DEFAULT ''",
        updated_at: "TEXT DEFAULT ''"
    };

    Object.entries(columnsToAdd).forEach(([column, definition]) => {
        if (!patientColumns.has(column)) {
            db.exec(`ALTER TABLE patients ADD COLUMN ${column} ${definition}`);
        }
    });

    const biometricColumns = new Set(
        db.prepare("PRAGMA table_info(biometric_credentials)").all().map(column => column.name)
    );

    const biometricColumnsToAdd = {
        credential_id_text: "TEXT DEFAULT ''",
        sign_count: "INTEGER DEFAULT 0",
        verification_status: "TEXT DEFAULT 'verified'"
    };

    Object.entries(biometricColumnsToAdd).forEach(([column, definition]) => {
        if (!biometricColumns.has(column)) {
            db.exec(`ALTER TABLE biometric_credentials ADD COLUMN ${column} ${definition}`);
        }
    });
}

ensureSqliteSchema();

function generatePatientId() {
    const prefix = "PAT";
    const existing = db.prepare("SELECT id FROM patients WHERE id LIKE ? ORDER BY id DESC LIMIT 1").get(`${prefix}%`);
    let number = 1000;

    if (existing && existing.id) {
        const match = String(existing.id).match(/(\d+)$/);
        if (match) {
            number = Number(match[1]) + 1;
        }
    }

    return `${prefix}${number}`;
}

function generateDoctorId() {
    const prefix = "DOC";
    const existing = db.prepare("SELECT doctor_id FROM doctors WHERE doctor_id LIKE ? ORDER BY doctor_id DESC LIMIT 1").get(`${prefix}%`);
    let number = 1000;

    if (existing && existing.doctor_id) {
        const match = String(existing.doctor_id).match(/(\d+)$/);
        if (match) {
            number = Number(match[1]) + 1;
        }
    }

    return `${prefix}${number}`;
}

function generateHelperId() {
    const prefix = "HLP";
    const existing = db.prepare("SELECT helper_id FROM helpers WHERE helper_id LIKE ? ORDER BY helper_id DESC LIMIT 1").get(`${prefix}%`);
    let number = 1000;

    if (existing && existing.helper_id) {
        const match = String(existing.helper_id).match(/(\d+)$/);
        if (match) {
            number = Number(match[1]) + 1;
        }
    }

    return `${prefix}${number}`;
}

function normalizeRegistrationPayload(body) {
    const payload = body || {};
    return {
        accountType: String(payload.accountType || payload.role || "patient").trim().toLowerCase(),
        fullName: String(payload.fullName || payload.name || "").trim(),
        dateOfBirth: String(payload.dateOfBirth || "").trim(),
        age: String(payload.age || "").trim(),
        gender: String(payload.gender || "Other").trim(),
        bloodGroup: String(payload.bloodGroup || payload.blood || "").trim(),
        phone: String(payload.phone || "").trim(),
        guardianName: String(payload.guardianName || "").trim(),
        guardianPhone: String(payload.guardianPhone || "").trim(),
        email: String(payload.email || "").trim(),
        address: String(payload.address || "").trim(),
        medicalHistory: String(payload.medicalHistory || "").trim(),
        medicalNotes: String(payload.medicalNotes || "").trim(),
        password: String(payload.password || ""),
        confirmPassword: String(payload.confirmPassword || ""),
        doctorId: String(payload.doctorId || "").trim(),
        specialization: String(payload.specialization || "").trim(),
        hospitalClinic: String(payload.hospitalClinic || "").trim(),
        helperId: String(payload.helperId || "").trim(),
        organization: String(payload.organization || "").trim(),
        profilePhoto: String(payload.profilePhoto || "").trim(),
        documents: Array.isArray(payload.documents) ? payload.documents : []
    };
}

const commonBloodGroups = new Set(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

function isValidBloodGroup(value) {
    return commonBloodGroups.has(String(value || "").trim());
}

async function insertAuditLog(actorRole, actorId, patientId, action, reason) {
    if (pgPool) {
        await pgPool.query(
            `INSERT INTO audit_logs (actor_role, actor_id, patient_id, action, reason) VALUES ($1, $2, $3, $4, $5)`,
            [actorRole, actorId, patientId || null, action, reason || null]
        );
    }
    else {
        db.prepare(`INSERT INTO audit_logs (actor_role, actor_id, patient_id, action, reason) VALUES (?, ?, ?, ?, ?)`)
          .run(actorRole, actorId, patientId || null, action, reason || null);
    }
}

async function saveDocumentsForUser(patientId, documents, uploaderRole, uploaderId) {
    if (!Array.isArray(documents) || !documents.length) return;

    const rows = documents
        .filter(item => item && item.fileName)
        .map(item => ({
            patient_id: patientId,
            uploader_role: uploaderRole,
            uploader_id: uploaderId,
            file_name: item.fileName,
            file_url: item.fileUrl || "",
            storage_type: item.storageType || "object_storage",
            mime_type: item.mimeType || "application/octet-stream"
        }));

    if (!rows.length) return;

    if (pgPool) {
        for (const row of rows) {
            await pgPool.query(
                `INSERT INTO documents (patient_id, uploader_role, uploader_id, file_name, file_url, storage_type, mime_type)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [row.patient_id, row.uploader_role, row.uploader_id, row.file_name, row.file_url, row.storage_type, row.mime_type]
            );
        }
    }
    else {
        const stmt = db.prepare(`INSERT INTO documents (patient_id, uploader_role, uploader_id, file_name, file_url, storage_type, mime_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)`);
        rows.forEach(row => stmt.run(row.patient_id, row.uploader_role, row.uploader_id, row.file_name, row.file_url, row.storage_type, row.mime_type));
    }
}

async function initializePostgresSchema() {
    if (!pgPool) {
        console.log("PostgreSQL not configured. Using local SQLite layer for this project.");
        return;
    }

    try {
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                patient_id TEXT UNIQUE,
                role VARCHAR(20) NOT NULL,
                full_name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                password_hash TEXT,
                account_status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS patients (
                patient_id TEXT PRIMARY KEY,
                user_id INTEGER REFERENCES users(user_id),
                full_name TEXT NOT NULL,
                date_of_birth DATE,
                age TEXT DEFAULT '',
                gender TEXT DEFAULT 'Other',
                blood_group TEXT DEFAULT '',
                phone TEXT,
                guardian_name TEXT DEFAULT '',
                guardian_phone TEXT DEFAULT '',
                email TEXT DEFAULT '',
                address TEXT DEFAULT '',
                medical_history TEXT DEFAULT '',
                medical_notes TEXT DEFAULT '',
                profile_photo TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS doctors (
                doctor_id TEXT PRIMARY KEY,
                user_id INTEGER REFERENCES users(user_id),
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                specialization TEXT,
                authentication_mode TEXT DEFAULT 'password',
                account_status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pgPool.query(`ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hospital_clinic TEXT`);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS helpers (
                helper_id TEXT PRIMARY KEY,
                user_id INTEGER REFERENCES users(user_id),
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                authentication_mode TEXT DEFAULT 'password',
                account_status VARCHAR(20) DEFAULT 'active',
                emergency_permission BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pgPool.query(`ALTER TABLE helpers ADD COLUMN IF NOT EXISTS organization_name TEXT`);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS guardians (
                guardian_id SERIAL PRIMARY KEY,
                patient_id TEXT REFERENCES patients(patient_id),
                name TEXT NOT NULL,
                phone TEXT,
                relationship TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS medical_records (
                record_id SERIAL PRIMARY KEY,
                patient_id TEXT REFERENCES patients(patient_id),
                record_type TEXT,
                description TEXT,
                document_url TEXT,
                created_by TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS documents (
                document_id SERIAL PRIMARY KEY,
                patient_id TEXT REFERENCES patients(patient_id),
                uploader_role TEXT,
                uploader_id TEXT,
                file_name TEXT,
                file_url TEXT,
                storage_type TEXT DEFAULT 'object_storage',
                mime_type TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pgPool.query(`
            ALTER TABLE documents
                ADD COLUMN IF NOT EXISTS original_file_name TEXT,
                ADD COLUMN IF NOT EXISTS file_type TEXT,
                ADD COLUMN IF NOT EXISTS file_size BIGINT,
                ADD COLUMN IF NOT EXISTS storage_reference TEXT,
                ADD COLUMN IF NOT EXISTS uploaded_date TIMESTAMP DEFAULT NOW(),
                ADD COLUMN IF NOT EXISTS uploaded_by TEXT;
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS doctor_patient_access (
                doctor_id TEXT REFERENCES doctors(doctor_id),
                patient_id TEXT REFERENCES patients(patient_id),
                granted_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (doctor_id, patient_id)
            );
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS biometric_credentials (
                credential_id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(user_id),
                credential_type TEXT,
                auth_method TEXT,
                public_key TEXT,
                key_handle TEXT,
                encrypted_material TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                revoked_at TIMESTAMP
            );
        `);

        await pgPool.query(`
            ALTER TABLE biometric_credentials
                ADD COLUMN IF NOT EXISTS credential_id_text TEXT,
                ADD COLUMN IF NOT EXISTS sign_count INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified';
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS security_verification_status (
                patient_id TEXT PRIMARY KEY REFERENCES patients(patient_id),
                face_status TEXT DEFAULT 'not_started',
                liveness_status TEXT DEFAULT 'not_started',
                iris_status TEXT DEFAULT 'unsupported',
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS photo_records (
                photo_id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(user_id),
                patient_id TEXT REFERENCES patients(patient_id),
                image_data TEXT,
                source TEXT,
                consent_given BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                embedding_hash TEXT,
                is_enrolled BOOLEAN DEFAULT false
            );
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                message_id SERIAL PRIMARY KEY,
                sender_role TEXT NOT NULL,
                sender_id TEXT NOT NULL,
                receiver_role TEXT NOT NULL,
                receiver_id TEXT NOT NULL,
                patient_id TEXT REFERENCES patients(patient_id),
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                audit_id SERIAL PRIMARY KEY,
                actor_role TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                patient_id TEXT REFERENCES patients(patient_id),
                action TEXT NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        const demoPasswordHash = await bcrypt.hash(process.env.PATIENT_DEMO_PASSWORD || "1234", 10);

        await pgPool.query(
            `INSERT INTO users (patient_id, role, full_name, email, phone, password_hash, account_status)
             VALUES ('PAT1001', 'patient', 'Rahul Kumar', 'rahul@example.com', '+919876543210', $1, 'active')
             ON CONFLICT (patient_id) DO NOTHING;`,
            [demoPasswordHash]
        );

        await pgPool.query(`
            INSERT INTO patients (
                patient_id, user_id, full_name, age, gender, blood_group, phone, guardian_name, guardian_phone, email, address, medical_history, medical_notes, profile_photo
            )
            VALUES (
                'PAT1001',
                1,
                'Rahul Kumar',
                '21',
                'Male',
                'O+',
                '+919876543210',
                'Anita Kumar',
                '+919876543211',
                'rahul@example.com',
                'Kurnool, Andhra Pradesh',
                'No major medical history',
                'No major medical history',
                NULL
            )
            ON CONFLICT (patient_id) DO NOTHING;
        `);

        console.log("PostgreSQL schema initialized successfully.");
    }
    catch (error) {
        console.error("PostgreSQL initialization failed:", error.message);
    }
}

initializePostgresSchema();

db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        full_name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL DEFAULT '',
        account_status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
        doctor_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        specialization TEXT NOT NULL DEFAULT '',
        hospital_clinic TEXT NOT NULL DEFAULT '',
        profile_photo TEXT NOT NULL DEFAULT '',
        verification_info TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL DEFAULT '',
        account_status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS helpers (
        helper_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        organization_name TEXT NOT NULL DEFAULT '',
        profile_photo TEXT NOT NULL DEFAULT '',
        verification_info TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL DEFAULT '',
        account_status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
        document_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT NOT NULL,
        uploader_role TEXT NOT NULL DEFAULT 'patient',
        uploader_id TEXT NOT NULL DEFAULT '',
        file_name TEXT NOT NULL DEFAULT '',
        file_url TEXT NOT NULL DEFAULT '',
        storage_type TEXT NOT NULL DEFAULT 'object_storage',
        mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS doctor_patient_access (
        doctor_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (doctor_id, patient_id)
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS security_verification_status (
        patient_id TEXT PRIMARY KEY,
        face_status TEXT NOT NULL DEFAULT 'not_started',
        liveness_status TEXT NOT NULL DEFAULT 'not_started',
        iris_status TEXT NOT NULL DEFAULT 'unsupported',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`);

const documentColumns = new Set(
    db.prepare("PRAGMA table_info(documents)").all().map(column => column.name)
);

const documentColumnsToAdd = {
    original_file_name: "TEXT DEFAULT ''",
    file_type: "TEXT DEFAULT ''",
    file_size: "INTEGER DEFAULT 0",
    storage_reference: "TEXT DEFAULT ''",
    uploaded_date: "TEXT DEFAULT ''",
    uploaded_by: "TEXT DEFAULT ''"
};

Object.entries(documentColumnsToAdd).forEach(([column, definition]) => {
    if (!documentColumns.has(column)) {
        db.exec(`ALTER TABLE documents ADD COLUMN ${column} ${definition}`);
    }
});

db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
        audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_role TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        patient_id TEXT,
        action TEXT NOT NULL,
        reason TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        age TEXT NOT NULL DEFAULT '',
        gender TEXT NOT NULL DEFAULT 'Other',
        blood TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT ''
    )
`);

const patientColumns =
    db.prepare("PRAGMA table_info(patients)").all()
        .map(column => column.name);

if (!patientColumns.includes("guardian_name")) {
    db.exec(
        "ALTER TABLE patients ADD COLUMN guardian_name TEXT NOT NULL DEFAULT ''"
    );
}

if (!patientColumns.includes("guardian_phone")) {
    db.exec(
        "ALTER TABLE patients ADD COLUMN guardian_phone TEXT NOT NULL DEFAULT ''"
    );
}

db.prepare(`
    INSERT OR IGNORE INTO patients
    (id, phone, name, age, gender, blood, email, address, notes)
    VALUES (@id, @phone, @name, @age, @gender, @blood, @email, @address, @notes)
`).run({
    id: "PAT1001",
    phone: "+919876543210",
    name: "Rahul Kumar",
    age: "21",
    gender: "Male",
    blood: "O+",
    email: "rahul@example.com",
    address: "Kurnool, Andhra Pradesh",
    notes: "No major medical history"
});


/* ================= ACCOUNTS ================= */

const accounts = {

    doctor: {

        username:
            process.env.DOCTOR_USERNAME ||
            "doctor",

        password:
            process.env.DOCTOR_PASSWORD ||
            "1234",

        role: "doctor"

    },


    helper: {

        username:
            process.env.HELPER_USERNAME ||
            "helper",

        password:
            process.env.HELPER_PASSWORD ||
            "1234",

        role: "helper"

    }

};


/* ================= REGISTRATION HELPERS ================= */

function insertUserRecord(userId, role, fullName, email, phone, passwordHash) {
    db.prepare(`
        INSERT OR REPLACE INTO users (user_id, role, full_name, email, phone, password_hash, account_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(userId, role, fullName, String(email || "").toLowerCase(), phone, passwordHash, new Date().toISOString(), new Date().toISOString());
}


/* ================= PHONE ================= */

function normalizeIndianPhone(value) {

    const digits =
        String(value || "")
            .replace(/\D/g, "");


    if (
        !/^\d{10}$/
            .test(digits)
    ) {

        return null;
    }


    return "+91" + digits;
}


/* ================= TOKEN ================= */

function createToken(data) {

    return jwt.sign(
        data,
        JWT_SECRET,
        {
            expiresIn: "2h"
        }
    );
}

async function logAudit(actorRole, actorId, patientId, action, reason) {
    try {
        if (pgPool) {
            await pgPool.query(
                `INSERT INTO audit_logs (actor_role, actor_id, patient_id, action, reason)
                 VALUES ($1, $2, $3, $4, $5)`,
                [actorRole, actorId, patientId || null, action, reason || null]
            );
        }

        db.prepare(`
            INSERT INTO audit_logs (actor_role, actor_id, patient_id, action, reason, created_at)
            VALUES (@actorRole, @actorId, @patientId, @action, @reason, datetime('now'))
        `).run({
            actorRole,
            actorId: String(actorId || "unknown"),
            patientId: patientId || null,
            action,
            reason: reason || null
        });
    }
    catch (error) {
        console.error("Audit log failed:", error.message);
    }
}

async function helperEmergencyMatch(photoData) {
    const faceMatchingEnabled = process.env.FACE_MATCHING_ENABLED === "true";
    const threshold = Number(process.env.FACE_MATCHING_THRESHOLD || 0.75);

    if (!photoData) {
        return {
            success: false,
            message: "No registered user match found.",
            configured: false
        };
    }

    if (!faceMatchingEnabled) {
        return {
            success: false,
            message: "Face matching service not configured.",
            threshold,
            configured: false
        };
    }

    let enrolledPatients = [];

    if (pgPool) {
        const result = await pgPool.query(`
            SELECT patient_id, full_name, blood_group, guardian_name, guardian_phone
            FROM patients
            WHERE patient_id IS NOT NULL
              AND full_name IS NOT NULL
              AND TRIM(full_name) <> ''
              AND COALESCE(profile_photo, '') <> ''
        `);
        enrolledPatients = result.rows;
    }
    else {
        enrolledPatients = db.prepare(`
            SELECT id AS patient_id, name AS full_name, blood AS blood_group, guardian_name, guardian_phone
            FROM patients
            WHERE id IS NOT NULL AND TRIM(name) <> ''
        `).all();
    }

    if (!enrolledPatients.length) {
        return {
            success: false,
            message: "No registered user match found.",
            threshold,
            configured: true
        };
    }

    return {
        success: false,
        message: "No registered user match found.",
        threshold,
        configured: true
    };
}

/* ================= AUTH ================= */

function auth(requiredRole) {

    return (
        req,
        res,
        next
    ) => {

        try {

            const header =
                req.headers.authorization ||
                "";


            if (
                !header.startsWith(
                    "Bearer "
                )
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."

                });

            }


            const token =
                header.substring(7);


            const decoded =
                jwt.verify(
                    token,
                    JWT_SECRET
                );


            if (
                requiredRole &&
                decoded.role !== requiredRole
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Permission denied."

                });

            }


            req.user =
                decoded;


            next();

        }

        catch {

            return res.status(401).json({

                success: false,

                message:
                    "Session expired. Please login again."

            });

        }

    };

}


/* ================= HOME ================= */

app.get(
    "/",

    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../frontend/index.html"
            )
        );

    }
);


/* ================= HEALTH ================= */

app.get(
    "/api/health",

    (req, res) => {

        res.json({

            success: true,

            backend: "online",

            otpProvider:
                hasTwilio
                    ? "Twilio"
                    : "Not configured"

        });

    }
);


/* ================= SEND OTP ================= */

app.post(
    "/api/auth/send-otp",

    async (req, res) => {

        try {

            const phone =
                normalizeIndianPhone(
                    req.body.phone
                );


            if (!phone) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Enter a valid 10-digit Indian mobile number."

                });

            }


            if (!hasTwilio) {

                return res.status(503).json({

                    success: false,

                    message:
                        "SMS OTP is not configured. Add Twilio credentials to the backend."

                });

            }


            const verification =
                await twilioClient
                    .verify
                    .v2
                    .services(
                        process.env
                            .TWILIO_VERIFY_SERVICE_SID
                    )
                    .verifications
                    .create({

                        to: phone,

                        channel: "sms"

                    });


            console.log(
                "OTP status:",
                verification.status
            );


            res.json({

                success: true,

                message:
                    "Verification code sent successfully.",

                status:
                    verification.status

            });

        }


        catch (error) {

            console.error(
                "SEND OTP ERROR:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to send verification code."

            });

        }

    }
);


/* ================= VERIFY OTP ================= */

app.post(
    "/api/auth/verify-otp",

    async (req, res) => {

        try {

            const phone =
                normalizeIndianPhone(
                    req.body.phone
                );


            const code =
                String(
                    req.body.code || ""
                ).trim();


            if (
                !phone ||
                !/^\d{6}$/.test(code)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Enter a valid phone number and 6-digit OTP."

                });

            }


            if (!hasTwilio) {

                return res.status(503).json({

                    success: false,

                    message:
                        "SMS OTP is not configured."

                });

            }


            const verification =
                await twilioClient
                    .verify
                    .v2
                    .services(
                        process.env
                            .TWILIO_VERIFY_SERVICE_SID
                    )
                    .verificationChecks
                    .create({

                        to: phone,

                        code: code

                    });


            if (
                verification.status !==
                "approved"
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid or expired verification code."

                });

            }


            /* Find existing patient */

            let patient =
                db.prepare(
                    "SELECT * FROM patients WHERE phone = ?"
                ).get(phone);


            /* Create patient */

            if (!patient) {

                const patientCount =
                    db.prepare(
                        "SELECT COUNT(*) AS count FROM patients"
                    ).get().count;

                const newId =
                    "PAT" +
                    (1000 + patientCount + 1);


                patient = {

                    id: newId,

                    phone: phone,

                    name: "New Patient",

                    age: "",

                    gender: "Other",

                    blood: "",

                    email: "",

                    address: "",

                    notes: "",

                    guardian_name: "",

                    guardian_phone: ""

                };


                db.prepare(`
                    INSERT INTO patients
                    (id, phone, name, age, gender, blood, email, address, notes, guardian_name, guardian_phone)
                    VALUES (@id, @phone, @name, @age, @gender, @blood, @email, @address, @notes, @guardian_name, @guardian_phone)
                `).run(patient);

            }


            const token =
                createToken({

                    role: "patient",

                    patientId:
                        patient.id,

                    phone: phone

                });


            res.json({

                success: true,

                verified: true,

                token: token,

                patientId:
                    patient.id,

                message:
                    "Phone number verified successfully."

            });

        }


        catch (error) {

            console.error(
                "VERIFY ERROR:",
                error.message
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to verify the code."

            });

        }

    }
);


/* ================= REGISTER USER ================= */

app.post(
    "/api/auth/register",
    async (req, res) => {
        try {
            const payload = normalizeRegistrationPayload(req.body);
            const accountType = payload.accountType;

            if (!['patient', 'doctor', 'helper'].includes(accountType)) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a valid account type."
                });
            }

            if (!payload.fullName) {
                return res.status(400).json({
                    success: false,
                    message: "Full name is required."
                });
            }

            if (!payload.password || !payload.confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: "Password and confirm password are required."
                });
            }

            if (payload.password !== payload.confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: "Passwords do not match."
                });
            }

            if (payload.password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters long."
                });
            }

            if (pgPool) {
                const client = await pgPool.connect();

                try {
                    await client.query("BEGIN");

                    const email = payload.email.toLowerCase();
                    const passwordHash = await bcrypt.hash(payload.password, 10);
                    let accountId;
                    let patientId = null;

                    if (accountType === "patient") {
                        const normalizedPhone = normalizeIndianPhone(payload.phone);

                        if (!normalizedPhone || !payload.email) {
                            await client.query("ROLLBACK");
                            return res.status(400).json({ success: false, message: "Enter a valid phone number and email." });
                        }

                        const duplicate = await client.query(
                            "SELECT patient_id FROM patients WHERE phone = $1 OR email = $2 LIMIT 1",
                            [normalizedPhone, email]
                        );

                        if (duplicate.rowCount) {
                            await client.query("ROLLBACK");
                            return res.status(409).json({ success: false, message: "A patient with this phone number or email already exists." });
                        }

                        const latest = await client.query("SELECT patient_id FROM patients WHERE patient_id LIKE 'PAT%' ORDER BY patient_id DESC LIMIT 1");
                        const lastNumber = latest.rows[0] && String(latest.rows[0].patient_id).match(/(\d+)$/);
                        patientId = `PAT${lastNumber ? Number(lastNumber[1]) + 1 : 1000}`;

                        const user = await client.query(
                            `INSERT INTO users (patient_id, role, full_name, email, phone, password_hash)
                             VALUES ($1, 'patient', $2, $3, $4, $5) RETURNING user_id`,
                            [patientId, payload.fullName, email, normalizedPhone, passwordHash]
                        );

                        await client.query(
                            `INSERT INTO patients (patient_id, user_id, full_name, date_of_birth, age, gender, blood_group, phone, guardian_name, guardian_phone, email, address, medical_history, medical_notes)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)`,
                            [patientId, user.rows[0].user_id, payload.fullName, payload.dateOfBirth || null, payload.age, payload.gender, payload.bloodGroup, normalizedPhone, payload.guardianName, payload.guardianPhone, email, payload.address, payload.medicalHistory]
                        );

                        accountId = patientId;
                    }
                    else if (accountType === "doctor") {
                        if (!payload.specialization || !payload.phone || !payload.email || !payload.hospitalClinic) {
                            await client.query("ROLLBACK");
                            return res.status(400).json({ success: false, message: "Doctor name, phone, email, specialization, and clinic/hospital are required." });
                        }

                        const latest = await client.query("SELECT doctor_id FROM doctors WHERE doctor_id LIKE 'DOC%' ORDER BY doctor_id DESC LIMIT 1");
                        const lastNumber = latest.rows[0] && String(latest.rows[0].doctor_id).match(/(\d+)$/);
                        accountId = `DOC${lastNumber ? Number(lastNumber[1]) + 1 : 1000}`;

                        const user = await client.query(
                            `INSERT INTO users (role, full_name, email, phone, password_hash)
                             VALUES ('doctor', $1, $2, $3, $4) RETURNING user_id`,
                            [payload.fullName, email, payload.phone, passwordHash]
                        );

                        await client.query(
                            `INSERT INTO doctors (doctor_id, user_id, name, phone, email, specialization, hospital_clinic)
                             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                            [accountId, user.rows[0].user_id, payload.fullName, payload.phone, email, payload.specialization, payload.hospitalClinic]
                        );
                    }
                    else {
                        if (!payload.organization || !payload.phone || !payload.email) {
                            await client.query("ROLLBACK");
                            return res.status(400).json({ success: false, message: "Helper name, phone, email, and organization are required." });
                        }

                        const latest = await client.query("SELECT helper_id FROM helpers WHERE helper_id LIKE 'HLP%' ORDER BY helper_id DESC LIMIT 1");
                        const lastNumber = latest.rows[0] && String(latest.rows[0].helper_id).match(/(\d+)$/);
                        accountId = `HLP${lastNumber ? Number(lastNumber[1]) + 1 : 1000}`;

                        const user = await client.query(
                            `INSERT INTO users (role, full_name, email, phone, password_hash)
                             VALUES ('helper', $1, $2, $3, $4) RETURNING user_id`,
                            [payload.fullName, email, payload.phone, passwordHash]
                        );

                        await client.query(
                            `INSERT INTO helpers (helper_id, user_id, name, phone, email, organization_name)
                             VALUES ($1, $2, $3, $4, $5, $6)`,
                            [accountId, user.rows[0].user_id, payload.fullName, payload.phone, email, payload.organization]
                        );
                    }

                    await client.query(
                        `INSERT INTO audit_logs (actor_role, actor_id, patient_id, action, reason)
                         VALUES ($1, $2, $3, 'registration', 'Account registered via Create New User form')`,
                        [accountType, accountId, patientId]
                    );

                    await client.query("COMMIT");

                    return res.status(201).json({
                        success: true,
                        message: `${accountType[0].toUpperCase()}${accountType.slice(1)} registration successful.`,
                        accountType,
                        ...(accountType === "patient" ? { patientId: accountId } : {}),
                        ...(accountType === "doctor" ? { doctorId: accountId } : {}),
                        ...(accountType === "helper" ? { helperId: accountId } : {})
                    });
                }
                catch (error) {
                    await client.query("ROLLBACK");
                    throw error;
                }
                finally {
                    client.release();
                }
            }

            if (accountType === 'patient') {
                if (!payload.phone || !payload.email || !isValidBloodGroup(payload.bloodGroup)) {
                    return res.status(400).json({
                        success: false,
                        message: "Phone, email, and a valid blood group are required for patient registration."
                    });
                }

                const normalizedPhone = normalizeIndianPhone(payload.phone);
                if (!normalizedPhone) {
                    return res.status(400).json({
                        success: false,
                        message: "Enter a valid 10-digit Indian mobile number."
                    });
                }

                const existingPatient = db.prepare("SELECT * FROM patients WHERE phone = ? OR email = ?").get(normalizedPhone, payload.email.toLowerCase());
                if (existingPatient) {
                    return res.status(409).json({
                        success: false,
                        message: "A patient with this phone number or email already exists."
                    });
                }

                const patientId = generatePatientId();
                const passwordHash = await bcrypt.hash(payload.password, 10);

                const patientRecord = {
                    id: patientId,
                    phone: normalizedPhone,
                    name: payload.fullName,
                    age: payload.age || payload.dateOfBirth || "",
                    gender: payload.gender || "Other",
                    blood: payload.bloodGroup || "",
                    email: payload.email,
                    address: payload.address || "",
                    notes: payload.medicalNotes || payload.medicalHistory || "",
                    guardian_name: payload.guardianName || "",
                    guardian_phone: payload.guardianPhone || "",
                    profile_photo: payload.profilePhoto || "",
                    medical_history: payload.medicalHistory || "",
                    medical_notes: payload.medicalNotes || "",
                    date_of_birth: payload.dateOfBirth || "",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                db.prepare(`
                    INSERT INTO patients (
                        id, phone, name, age, gender, blood, email, address, notes,
                        guardian_name, guardian_phone, profile_photo, medical_history, medical_notes, date_of_birth, created_at, updated_at
                    ) VALUES (
                        @id, @phone, @name, @age, @gender, @blood, @email, @address, @notes,
                        @guardian_name, @guardian_phone, @profile_photo, @medical_history, @medical_notes, @date_of_birth, @created_at, @updated_at
                    )
                `).run(patientRecord);

                db.prepare(`
                    INSERT INTO users (user_id, role, full_name, email, phone, password_hash, account_status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
                `).run(patientId, 'patient', payload.fullName, payload.email.toLowerCase(), normalizedPhone, passwordHash, new Date().toISOString(), new Date().toISOString());

                if (Array.isArray(payload.documents) && payload.documents.length) {
                    await saveDocumentsForUser(patientId, payload.documents, 'patient', patientId);
                }

                await insertAuditLog('patient', patientId, patientId, 'registration', 'Patient registered via Create New User form');

                return res.status(201).json({
                    success: true,
                    message: "Patient registration successful.",
                    patientId,
                    accountType: 'patient'
                });
            }

            if (accountType === 'doctor') {
                if (!payload.specialization || !payload.phone || !payload.email || !payload.hospitalClinic) {
                    return res.status(400).json({
                        success: false,
                        message: "Doctor name, phone, email, specialization, and clinic/hospital are required."
                    });
                }

                const normalizedPhone = normalizeIndianPhone(payload.phone) || payload.phone.trim();
                const doctorId = generateDoctorId();
                const passwordHash = await bcrypt.hash(payload.password, 10);

                db.prepare(`
                    INSERT INTO doctors (doctor_id, full_name, phone, email, specialization, hospital_clinic, profile_photo, verification_info, password_hash, account_status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
                `).run(
                    doctorId,
                    payload.fullName,
                    normalizedPhone,
                    payload.email.toLowerCase(),
                    payload.specialization,
                    payload.hospitalClinic,
                    payload.profilePhoto || "",
                    "Professional verification submitted",
                    passwordHash,
                    new Date().toISOString(),
                    new Date().toISOString()
                );

                db.prepare(`
                    INSERT INTO users (user_id, role, full_name, email, phone, password_hash, account_status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
                `).run(doctorId, 'doctor', payload.fullName, payload.email.toLowerCase(), normalizedPhone, passwordHash, new Date().toISOString(), new Date().toISOString());

                await insertAuditLog('doctor', doctorId, null, 'registration', 'Doctor registered via Create New User form');

                return res.status(201).json({
                    success: true,
                    message: "Doctor registration successful.",
                    doctorId,
                    accountType: 'doctor'
                });
            }

            if (accountType === 'helper') {
                if (!payload.organization || !payload.phone || !payload.email) {
                    return res.status(400).json({
                        success: false,
                        message: "Helper name, phone, email, and organization are required."
                    });
                }

                const normalizedPhone = normalizeIndianPhone(payload.phone) || payload.phone.trim();
                const helperId = generateHelperId();
                const passwordHash = await bcrypt.hash(payload.password, 10);

                db.prepare(`
                    INSERT INTO helpers (helper_id, full_name, phone, email, organization_name, profile_photo, verification_info, password_hash, account_status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
                `).run(
                    helperId,
                    payload.fullName,
                    normalizedPhone,
                    payload.email.toLowerCase(),
                    payload.organization,
                    payload.profilePhoto || "",
                    "Helper verification submitted",
                    passwordHash,
                    new Date().toISOString(),
                    new Date().toISOString()
                );

                db.prepare(`
                    INSERT INTO users (user_id, role, full_name, email, phone, password_hash, account_status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
                `).run(helperId, 'helper', payload.fullName, payload.email.toLowerCase(), normalizedPhone, passwordHash, new Date().toISOString(), new Date().toISOString());

                await insertAuditLog('helper', helperId, null, 'registration', 'Helper registered via Create New User form');

                return res.status(201).json({
                    success: true,
                    message: "Helper registration successful.",
                    helperId,
                    accountType: 'helper'
                });
            }

            return res.status(400).json({
                success: false,
                message: "Unsupported account type."
            });
        }
        catch (error) {
            console.error("Registration error:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to complete registration.",
                error: error.message
            });
        }
    }
);

app.post(
    "/api/auth/helper/authorize",
    (req, res) => {
        const helperId = process.env.HELPER_ID || "HLP1001";
        const token = createToken({
            role: "helper",
            username: helperId,
            permissions: ["emergency_identification"]
        });

        res.json({
            success: true,
            role: "helper",
            token,
            helperId
        });
    }
);

/* ================= PASSWORD LOGIN ================= */

app.post(
    "/api/auth/password-login",

    async (req, res) => {

        const {
            username,
            password,
            role
        } = req.body;

        if (pgPool && ["patient", "doctor", "helper"].includes(role)) {
            let result;

            if (role === "patient") {
                result = await pgPool.query(
                    `SELECT u.*, p.phone AS patient_phone
                     FROM users u LEFT JOIN patients p ON p.patient_id = u.patient_id
                     WHERE u.role = 'patient' AND (u.patient_id = $1 OR u.email = $2) LIMIT 1`,
                    [String(username).toUpperCase(), String(username).toLowerCase()]
                );
            }
            else if (role === "doctor") {
                result = await pgPool.query(
                    `SELECT u.*, d.doctor_id
                     FROM users u JOIN doctors d ON d.user_id = u.user_id
                     WHERE u.role = 'doctor' AND (d.doctor_id = $1 OR u.email = $2) LIMIT 1`,
                    [String(username).toUpperCase(), String(username).toLowerCase()]
                );
            }
            else {
                result = await pgPool.query(
                    `SELECT u.*, h.helper_id
                     FROM users u JOIN helpers h ON h.user_id = u.user_id
                     WHERE u.role = 'helper' AND (h.helper_id = $1 OR u.email = $2) LIMIT 1`,
                    [String(username).toUpperCase(), String(username).toLowerCase()]
                );
            }

            const user = result.rows[0];

            if (user && await bcrypt.compare(password, user.password_hash)) {
                const patientId = user.patient_id || null;
                const token = createToken({
                    role,
                    patientId,
                    phone: user.patient_phone || user.phone || null,
                    username
                });

                return res.json({ success: true, role, token });
            }

            return res.status(401).json({ success: false, message: "Invalid login details." });
        }


        /* DOCTOR */

        if (

            role === "doctor" &&

            username ===
                accounts.doctor.username &&

            password ===
                accounts.doctor.password

        ) {

            const token =
                createToken({

                    role: "doctor",

                    username:
                        username

                });


            return res.json({

                success: true,

                role: "doctor",

                token: token

            });

        }


        /* HELPER */

        if (

            role === "helper" &&

            username ===
                accounts.helper.username &&

            password ===
                accounts.helper.password

        ) {

            const token =
                createToken({

                    role: "helper",

                    username:
                        username

                });


            return res.json({

                success: true,

                role: "helper",

                token: token

            });

        }


        /* PATIENT */

        if (role === "patient") {

            const patient =
                db.prepare(
                    "SELECT * FROM patients WHERE id = ?"
                ).get(
                    String(username).toUpperCase()
                );

            const userRow =
                db.prepare(
                    "SELECT * FROM users WHERE user_id = ? AND role = 'patient'"
                ).get(
                    String(username).toUpperCase()
                );

            const passwordMatchesDemo =
                patient &&
                password === (
                    process.env.PATIENT_DEMO_PASSWORD || "1234"
                );

            const passwordMatchesHash =
                userRow && userRow.password_hash && bcrypt.compareSync(password, userRow.password_hash);


            if (patient && (passwordMatchesDemo || passwordMatchesHash)) {

                const token =
                    createToken({

                        role: "patient",
                        permissions: ["view_own_record"],
                        patientId:
                            patient.id,

                        phone:
                            patient.phone

                    });



                if (role === "doctor") {
                    const doctorRow = db.prepare("SELECT * FROM doctors WHERE doctor_id = ? OR email = ?").get(String(username).toUpperCase(), String(username).toLowerCase());
                    const userRow = db.prepare("SELECT * FROM users WHERE user_id = ? AND role = 'doctor'").get(String(username).toUpperCase());

                    const passwordMatchesDemo = username === accounts.doctor.username && password === accounts.doctor.password;
                    const passwordMatchesHash = (doctorRow || userRow) && (doctorRow ? doctorRow.password_hash : userRow.password_hash) && bcrypt.compareSync(password, (doctorRow ? doctorRow.password_hash : userRow.password_hash));

                    if (passwordMatchesDemo || passwordMatchesHash) {
                        const token = createToken({ role: "doctor", username });
                        return res.json({ success: true, role: "doctor", token });
                    }
                }

                if (role === "helper") {
                    const helperRow = db.prepare("SELECT * FROM helpers WHERE helper_id = ? OR email = ?").get(String(username).toUpperCase(), String(username).toLowerCase());
                    const userRow = db.prepare("SELECT * FROM users WHERE user_id = ? AND role = 'helper'").get(String(username).toUpperCase());

                    const passwordMatchesDemo = username === accounts.helper.username && password === accounts.helper.password;
                    const passwordMatchesHash = (helperRow || userRow) && (helperRow ? helperRow.password_hash : userRow.password_hash) && bcrypt.compareSync(password, (helperRow ? helperRow.password_hash : userRow.password_hash));

                    if (passwordMatchesDemo || passwordMatchesHash) {
                        const token = createToken({ role: "helper", username });
                        return res.json({ success: true, role: "helper", token });
                    }
                }
                return res.json({

                    success: true,

                    role: "patient",

                    token: token

                });

            }

        }


        return res.status(401).json({

            success: false,

            message:
                "Invalid login details."

        });

    }
);


/* ================= PATIENT DETAILS ================= */

app.get(
    "/api/patient/security-status",
    auth("patient"),
    async (req, res) => {
        if (pgPool) {
            const result = await pgPool.query(
                `SELECT face_status, liveness_status, iris_status, updated_at,
                        EXISTS (
                            SELECT 1 FROM biometric_credentials
                            WHERE user_id = (SELECT user_id FROM users WHERE patient_id = $1)
                              AND is_active = true
                        ) AS passkey_registered
                 FROM security_verification_status WHERE patient_id = $1`,
                [req.user.patientId]
            );

            return res.json({
                success: true,
                status: result.rows[0] || {
                    face_status: "not_started",
                    liveness_status: "not_started",
                    iris_status: "unsupported",
                    passkey_registered: false
                }
            });
        }

        const status = db.prepare("SELECT * FROM security_verification_status WHERE patient_id = ?").get(req.user.patientId);
        const passkey = db.prepare("SELECT 1 FROM biometric_credentials WHERE user_id = ? AND is_active = 1 LIMIT 1").get(req.user.patientId);

        return res.json({
            success: true,
            status: status || {
                face_status: "not_started",
                liveness_status: "not_started",
                iris_status: "unsupported",
                passkey_registered: Boolean(passkey)
            },
            passkeyRegistered: Boolean(passkey)
        });
    }
);

app.post(
    "/api/patient/security-status",
    auth("patient"),
    async (req, res) => {
        const kind = String(req.body.kind || "");
        const status = String(req.body.status || "");

        if (!(kind === "face" || kind === "liveness") || !["started", "captured", "requires_configuration"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid security status." });
        }

        if (pgPool) {
            await pgPool.query(
                `INSERT INTO security_verification_status (patient_id, ${kind}_status, updated_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (patient_id) DO UPDATE SET ${kind}_status = EXCLUDED.${kind}_status, updated_at = NOW()`,
                [req.user.patientId, status]
            );
        }
        else {
            db.prepare(`
                INSERT INTO security_verification_status (patient_id, ${kind}_status, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(patient_id) DO UPDATE SET ${kind}_status = excluded.${kind}_status, updated_at = excluded.updated_at
            `).run(req.user.patientId, status, new Date().toISOString());
        }

        return res.json({ success: true, status });
    }
);

app.post(
    "/api/patient/passkey/register/options",
    auth("patient"),
    async (req, res) => {
        try {
            const existingCredentials = pgPool
                ? (await pgPool.query(
                    `SELECT credential_id_text FROM biometric_credentials
                     WHERE user_id = (SELECT user_id FROM users WHERE patient_id = $1) AND is_active = true`,
                    [req.user.patientId]
                )).rows
                : db.prepare("SELECT credential_id_text FROM biometric_credentials WHERE user_id = ? AND is_active = 1").all(req.user.patientId);

            const options = await generateRegistrationOptions({
                rpName: "MediCare Consultant",
                rpID: webAuthnRpId,
                userName: req.user.patientId,
                userDisplayName: req.user.patientId,
                userID: Buffer.from(req.user.patientId),
                attestationType: "none",
                excludeCredentials: existingCredentials
                    .filter(credential => credential.credential_id_text)
                    .map(credential => ({ id: credential.credential_id_text })),
                authenticatorSelection: {
                    residentKey: "preferred",
                    userVerification: "preferred"
                }
            });

            webAuthnChallenges.set(req.user.patientId, {
                challenge: options.challenge,
                expiresAt: Date.now() + 5 * 60 * 1000
            });

            return res.json({ success: true, options });
        }
        catch (error) {
            console.error("PASSKEY OPTIONS ERROR:", error.message);
            return res.status(500).json({ success: false, message: "Unable to prepare passkey registration." });
        }
    }
);

app.post(
    "/api/patient/passkey/register/verify",
    auth("patient"),
    async (req, res) => {
        const challengeState = webAuthnChallenges.get(req.user.patientId);

        if (!challengeState || challengeState.expiresAt < Date.now()) {
            webAuthnChallenges.delete(req.user.patientId);
            return res.status(400).json({ success: false, message: "Passkey registration expired. Start again." });
        }

        try {
            const verification = await verifyRegistrationResponse({
                response: req.body,
                expectedChallenge: challengeState.challenge,
                expectedOrigin: webAuthnOrigin,
                expectedRPID: webAuthnRpId
            });

            if (!verification.verified || !verification.registrationInfo) {
                return res.status(400).json({ success: false, message: "Passkey registration could not be verified." });
            }

            const credential = verification.registrationInfo.credential;
            const publicKey = Buffer.from(credential.publicKey).toString("base64");

            if (pgPool) {
                const user = await pgPool.query("SELECT user_id FROM users WHERE patient_id = $1", [req.user.patientId]);
                await pgPool.query(
                    `INSERT INTO biometric_credentials (
                        user_id, credential_type, auth_method, public_key, key_handle,
                        credential_id_text, sign_count, verification_status, is_active
                    ) VALUES ($1, 'passkey', 'webauthn', $2, $3, $3, $4, 'verified', true)`,
                    [user.rows[0]?.user_id || null, publicKey, credential.id, credential.counter]
                );
            }
            else {
                db.prepare(`
                    INSERT INTO biometric_credentials (
                        user_id, credential_type, auth_method, public_key, key_handle,
                        credential_id_text, sign_count, verification_status, is_active
                    ) VALUES (?, 'passkey', 'webauthn', ?, ?, ?, ?, 'verified', 1)
                `).run(req.user.patientId, publicKey, credential.id, credential.id, credential.counter);
            }

            webAuthnChallenges.delete(req.user.patientId);
            return res.json({ success: true, message: "Passkey registered successfully." });
        }
        catch (error) {
            console.error("PASSKEY VERIFY ERROR:", error.message);
            return res.status(400).json({ success: false, message: "Passkey registration could not be verified." });
        }
    }
);

app.post(
    "/api/patient/passkey/remove",
    auth("patient"),
    async (req, res) => {
        try {
            const credentialId = String(req.body.credentialId || "").trim();

            if (pgPool) {
                const result = credentialId
                    ? await pgPool.query(
                        `UPDATE biometric_credentials SET is_active = false, revoked_at = NOW(), verification_status = 'revoked'
                         WHERE credential_id_text = $1
                           AND user_id = (SELECT user_id FROM users WHERE patient_id = $2)
                           AND is_active = true`,
                        [credentialId, req.user.patientId]
                    )
                    : await pgPool.query(
                        `UPDATE biometric_credentials SET is_active = false, revoked_at = NOW(), verification_status = 'revoked'
                         WHERE user_id = (SELECT user_id FROM users WHERE patient_id = $1) AND is_active = true`,
                        [req.user.patientId]
                    );

                return res.json({ success: true, revoked: result.rowCount });
            }

            const result = credentialId
                ? db.prepare(
                    `UPDATE biometric_credentials
                     SET is_active = 0, revoked_at = ?, verification_status = 'revoked'
                     WHERE credential_id_text = ? AND user_id = ? AND is_active = 1`
                ).run(new Date().toISOString(), credentialId, req.user.patientId)
                : db.prepare(
                    `UPDATE biometric_credentials
                     SET is_active = 0, revoked_at = ?, verification_status = 'revoked'
                     WHERE user_id = ? AND is_active = 1`
                ).run(new Date().toISOString(), req.user.patientId);

            return res.json({ success: true, revoked: result.changes });
        }
        catch (error) {
            console.error("PASSKEY REMOVE ERROR:", error.message);
            return res.status(500).json({ success: false, message: "Unable to remove passkey." });
        }
    }
);

async function canUploadMedicalDocument(req, patientId) {
    if (req.user.role === "patient") {
        return req.user.patientId === patientId;
    }

    if (req.user.role !== "doctor") {
        return false;
    }

    const doctorId = String(req.user.username || "").toUpperCase();

    if (pgPool) {
        const access = await pgPool.query(
            "SELECT 1 FROM doctor_patient_access WHERE doctor_id = $1 AND patient_id = $2",
            [doctorId, patientId]
        );
        return access.rowCount > 0;
    }

    return Boolean(
        db.prepare("SELECT 1 FROM doctor_patient_access WHERE doctor_id = ? AND patient_id = ?")
            .get(doctorId, patientId)
    );
}

app.post(
    "/api/patient/:patientId/medical-documents",
    auth(),
    (req, res) => {
        medicalUpload.single("medicalFile")(req, res, async error => {
            if (error) {
                return res.status(400).json({ success: false, message: error.message });
            }

            const patientId = String(req.params.patientId || "").toUpperCase();

            try {
                if (!(await canUploadMedicalDocument(req, patientId))) {
                    if (req.file) fs.unlinkSync(req.file.path);
                    await logAudit(req.user.role, req.user.username || req.user.patientId || "unknown", patientId, "medical_document_upload_denied", "Unauthorized document upload");
                    return res.status(403).json({ success: false, message: "You are not authorized to upload documents for this patient." });
                }

                if (!req.file) {
                    return res.status(400).json({ success: false, message: "Select a medical file to upload." });
                }

                const uploadedBy = req.user.patientId || req.user.username || "unknown";
                const storageReference = path.relative(path.join(__dirname, "storage"), req.file.path).replace(/\\/g, "/");

                if (pgPool) {
                    await pgPool.query(
                        `INSERT INTO documents (
                            patient_id, uploader_role, uploader_id, file_name, original_file_name,
                            file_url, storage_type, mime_type, file_type, file_size,
                            storage_reference, uploaded_date, uploaded_by
                        ) VALUES ($1, $2, $3, $4, $4, $5, 'private_local_storage', $6, $6, $7, $8, NOW(), $3)`,
                        [patientId, req.user.role, uploadedBy, req.file.originalname, "", req.file.mimetype, req.file.size, storageReference]
                    );
                }
                else {
                    db.prepare(`
                        INSERT INTO documents (
                            patient_id, uploader_role, uploader_id, file_name, original_file_name,
                            file_url, storage_type, mime_type, file_type, file_size,
                            storage_reference, uploaded_date, uploaded_by
                        ) VALUES (?, ?, ?, ?, ?, '', 'private_local_storage', ?, ?, ?, ?, ?, ?)
                    `).run(
                        patientId,
                        req.user.role,
                        uploadedBy,
                        req.file.originalname,
                        req.file.originalname,
                        req.file.mimetype,
                        req.file.mimetype,
                        req.file.size,
                        storageReference,
                        new Date().toISOString(),
                        uploadedBy
                    );
                }

                await logAudit(req.user.role, uploadedBy, patientId, "medical_document_uploaded", "Medical document metadata stored");

                return res.status(201).json({
                    success: true,
                    message: "Medical file uploaded securely.",
                    patientId,
                    fileName: req.file.originalname
                });
            }
            catch (uploadError) {
                if (req.file) fs.unlink(req.file.path, () => {});
                console.error("MEDICAL DOCUMENT UPLOAD ERROR:", uploadError.message);
                return res.status(500).json({ success: false, message: "Unable to store the medical file." });
            }
        });
    }
);

app.get(
    "/api/patient/me",

    auth("patient"),

    async (req, res) => {

        if (pgPool) {
            try {
                const result = await pgPool.query(
                    `SELECT patient_id AS id, full_name AS name, date_of_birth, age, gender,
                            blood_group AS blood, phone, guardian_name, guardian_phone,
                            email, address, medical_history, medical_notes,
                            COALESCE(medical_notes, medical_history, '') AS notes
                     FROM patients WHERE patient_id = $1`,
                    [req.user.patientId]
                );

                const patient = result.rows[0];

                if (!patient) {
                    return res.status(404).json({ success: false, message: "Patient record not found." });
                }

                return res.json({ success: true, patient });
            }
            catch (error) {
                console.error("POSTGRES PATIENT READ ERROR:", error.message);
                return res.status(500).json({ success: false, message: "Unable to load patient details." });
            }
        }

        const patient =
            db.prepare(
                "SELECT * FROM patients WHERE id = ?"
            ).get(req.user.patientId);


        if (!patient) {

            return res.status(404).json({

                success: false,

                message:
                    "Patient record not found."

            });

        }


        res.json({

            success: true,

            patient: patient

        });

    }
);


/* ================= UPDATE PATIENT ================= */

app.put(
    "/api/patient/me",

    auth("patient"),

    async (req, res) => {

        if (req.body.blood !== undefined && !isValidBloodGroup(req.body.blood)) {
            return res.status(400).json({ success: false, message: "Select a valid blood group." });
        }

        if (pgPool) {
            try {
                const result = await pgPool.query(
                    `UPDATE patients
                     SET full_name = COALESCE($1, full_name),
                         age = COALESCE($2, age),
                         gender = COALESCE($3, gender),
                         blood_group = COALESCE($4, blood_group),
                         phone = COALESCE($5, phone),
                         guardian_name = COALESCE($6, guardian_name),
                         guardian_phone = COALESCE($7, guardian_phone),
                         email = COALESCE($8, email),
                         address = COALESCE($9, address),
                         medical_history = COALESCE($10, medical_history),
                         medical_notes = COALESCE($11, medical_notes),
                         updated_at = NOW()
                     WHERE patient_id = $12
                     RETURNING patient_id AS id, full_name AS name, age, gender,
                               blood_group AS blood, phone, guardian_name, guardian_phone,
                               email, address, medical_history, medical_notes,
                               COALESCE(medical_notes, medical_history, '') AS notes`,
                    [
                        req.body.name,
                        req.body.age,
                        req.body.gender,
                        req.body.blood,
                        req.body.phone,
                        req.body.guardian_name,
                        req.body.guardian_phone,
                        req.body.email,
                        req.body.address,
                        req.body.notes,
                        req.body.notes,
                        req.user.patientId
                    ]
                );

                if (!result.rowCount) {
                    return res.status(404).json({ success: false, message: "Patient not found." });
                }

                return res.json({ success: true, patient: result.rows[0], message: "Patient details updated successfully." });
            }
            catch (error) {
                console.error("POSTGRES PATIENT UPDATE ERROR:", error.message);
                return res.status(500).json({ success: false, message: "Unable to update patient details." });
            }
        }

        const patient =
            db.prepare(
                "SELECT * FROM patients WHERE id = ?"
            ).get(req.user.patientId);


        if (!patient) {

            return res.status(404).json({

                success: false,

                message:
                    "Patient not found."

            });

        }


        const allowedFields = [

            "name",
            "age",
            "gender",
            "blood",
            "phone",
            "guardian_name",
            "guardian_phone",
            "email",
            "address",
            "notes"

        ];


        const updatedPatient = {
            ...patient
        };

        allowedFields.forEach(
            field => {

                if (
                    req.body[field] !==
                    undefined
                ) {

                    updatedPatient[field] =
                        String(
                            req.body[field]
                        ).trim();

                }

            }
        );

        db.prepare(`
            UPDATE patients
            SET name = @name,
                age = @age,
                gender = @gender,
                blood = @blood,
                phone = @phone,
                guardian_name = @guardian_name,
                guardian_phone = @guardian_phone,
                email = @email,
                address = @address,
                notes = @notes
            WHERE id = @id
        `).run(updatedPatient);


        res.json({

            success: true,

            patient: updatedPatient,

            message:
                "Patient details updated successfully."

        });

    }
);


/* ================= HELPER EMERGENCY IDENTIFICATION ================= */

app.post(
    "/api/helper/identify-person",
    auth("helper"),
    async (req, res) => {
        const helperPermissions = req.user.permissions || [];
        const photoData = req.body.photoData || req.body.image || req.body.photo;

        if (!helperPermissions.includes("emergency_identification")) {
            await logAudit("helper", req.user.username || "helper", null, "identify_person_denied", "Missing emergency identification permission");
            return res.status(403).json({
                success: false,
                message: "Helper does not have emergency identification permission."
            });
        }

        if (!photoData) {
            await logAudit("helper", req.user.username || "helper", null, "identify_person_failed", "No photo submitted");
            return res.status(400).json({
                success: false,
                message: "A person photo is required for emergency identification."
            });
        }

        const matchResult = await helperEmergencyMatch(photoData);

        if (!matchResult.success) {
            await logAudit("helper", req.user.username || "helper", null, "identify_person_attempt", matchResult.message);
            return res.status(404).json({
                success: false,
                message: matchResult.message,
                configured: matchResult.configured !== undefined ? matchResult.configured : false
            });
        }

        const patient = pgPool
            ? (await pgPool.query(`
                SELECT patient_id AS patientId, full_name AS fullName, blood_group AS bloodGroup,
                       guardian_name AS guardianName, guardian_phone AS guardianPhone
                FROM patients WHERE patient_id = $1 LIMIT 1`, [matchResult.patientId])).rows[0]
            : db.prepare(
                "SELECT id AS patientId, name AS fullName, blood AS bloodGroup, guardian_name AS guardianName, guardian_phone AS guardianPhone FROM patients WHERE id = ?"
            ).get(matchResult.patientId);

        await logAudit("helper", req.user.username || "helper", patient?.patientId || patient?.id || null, "identify_person_success", "Emergency identification completed");

        return res.json({
            success: true,
            patientId: patient.patientId || patient.id,
            fullName: patient.fullName || patient.name,
            bloodGroup: patient.bloodGroup || patient.blood,
            guardianName: patient.guardianName || patient.guardian_name,
            guardianPhone: patient.guardianPhone || patient.guardian_phone
        });
    }
);

/* ================= DOCTOR SEARCH ================= */

app.get(
    "/api/doctor/patients/:id",

    auth("doctor"),

    (req, res) => {

        const id =
            String(
                req.params.id
            ).toUpperCase();


        const patient =
            db.prepare(
                "SELECT * FROM patients WHERE id = ?"
            ).get(id);


        if (!patient) {

            return res.status(404).json({

                success: false,

                message:
                    "Patient not found."

            });

        }


        res.json({

            success: true,

            patient: patient

        });

    }
);


/* ================= START ================= */

app.listen(
    PORT,

    () => {

        console.log(
            `MediCare backend running on port ${PORT}`
        );

        console.log(
            `Twilio configured: ${hasTwilio}`
        );

    }
);