const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/* ================= DATABASE CONFIGURATION & DUAL-MODE SETUP ================= */
let pgPoolInstance = null;
let isMockActive = false;
let initPromise = null;

function ensureLocalPostgresRunning() {
    try {
        const isLocalHost = !process.env.SQL_HOST || !fs.existsSync(process.env.SQL_HOST);
        const dbUrl = process.env.DATABASE_URL || "";
        const isUrlLocal = !dbUrl || dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");

        if (isLocalHost && isUrlLocal && fs.existsSync("/var/lib/postgresql/data")) {
            try {
                execSync("pg_isready -h 127.0.0.1 -p 5432", { stdio: "ignore", timeout: 1000 });
            } catch {
                console.log("Starting local PostgreSQL daemon...");
                execSync("su - postgres -c 'pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/logfile start'", { stdio: "ignore", timeout: 2000 });
            }
        }
    } catch (err) {
        // Silently continue to fallback
    }
}

function getPostgresPoolConfig() {
    // 1. Google Cloud SQL Auth Proxy Unix Socket
    if (process.env.SQL_HOST && fs.existsSync(process.env.SQL_HOST)) {
        return {
            host: process.env.SQL_HOST,
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            database: process.env.SQL_DB_NAME,
            max: 10,
            connectionTimeoutMillis: 1500
        };
    }

    // 2. Direct PostgreSQL connection URL (e.g. Supabase, Neon, AWS RDS)
    if (process.env.DATABASE_URL) {
        const url = process.env.DATABASE_URL;
        const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
        return {
            connectionString: url,
            ssl: isLocal ? false : { rejectUnauthorized: false },
            max: 10,
            connectionTimeoutMillis: 1500
        };
    }

    // 3. PostgreSQL environment variables or local instance defaults
    return {
        host: process.env.PGHOST || "127.0.0.1",
        port: parseInt(process.env.PGPORT || "5432", 10),
        user: process.env.PGUSER || "user",
        password: process.env.PGPASSWORD || "password",
        database: process.env.PGDATABASE || "medicare",
        max: 10,
        connectionTimeoutMillis: 1500
    };
}

function getPool() {
    if (!pgPoolInstance) {
        ensureLocalPostgresRunning();
        const config = getPostgresPoolConfig();
        pgPoolInstance = new Pool(config);

        pgPoolInstance.on("error", (err) => {
            console.warn("[Database] Idle client warning:", err.message);
        });
    }
    return pgPoolInstance;
}

/* ================= IN-MEMORY MOCK STORE ================= */
// Provides seamless in-memory fallback when external PostgreSQL is not provisioned
const mockStore = {
    users: new Map(),
    doctors: new Map(),
    patients: new Map(),
    documents: new Map(),
    accessRequests: new Map(), // key: "doctorId:patientId"
    accessRecords: new Map(),  // key: "doctorId:patientId"
    chatMessages: [],
    aiChatMessages: [],
    auditLogs: [],
    webauthn: new Map(),
    nextDocId: 100,
    nextLogId: 100,
    nextRequestId: 100
};

async function seedMockStore() {
    if (mockStore.users.size > 0) return;

    const doctorPassword = process.env.DOCTOR_PASSWORD || "1234";
    const patientPassword = process.env.PATIENT_DEMO_PASSWORD || "1234";
    const defaultDoctorHash = await bcrypt.hash(doctorPassword, 10);
    const defaultPatientHash = await bcrypt.hash(patientPassword, 10);

    // Seed Doctor
    mockStore.users.set("USR_DOC_01", {
        userId: "USR_DOC_01",
        fullName: "Dr. Sharma",
        phone: "+919876543200",
        passwordHash: defaultDoctorHash,
        role: "doctor"
    });
    mockStore.doctors.set("doctor", {
        doctorId: "doctor",
        userId: "USR_DOC_01",
        name: "Dr. Sharma",
        phone: "+919876543200",
        specialization: "General Medicine",
        department: "General Medicine"
    });

    // Seed Patient PAT1001
    mockStore.users.set("USR_PAT_1001", {
        userId: "USR_PAT_1001",
        fullName: "Rahul Kumar",
        phone: "+919876543210",
        passwordHash: defaultPatientHash,
        role: "patient"
    });
    mockStore.patients.set("PAT1001", {
        id: "PAT1001",
        patientId: "PAT1001",
        userId: "USR_PAT_1001",
        name: "Rahul Kumar",
        age: "21",
        gender: "Male",
        blood: "O+",
        bloodGroup: "O+",
        phone: "+919876543210",
        email: "rahul@example.com",
        address: "Kurnool, Andhra Pradesh",
        notes: "Blood pressure monitored annually.",
        medicalHistory: "No major surgical history",
        profileCompleted: true,
        guardianName: "Suresh Kumar",
        guardianPhone: "+919876543211",
        guardianRelationship: "Father",
        guardian2Name: "Sunita Kumar",
        guardian2Phone: "+919876543215",
        guardian2Relationship: "Mother",
        healthInformation: {
            allergies: false,
            diabetes: false,
            hypertension: false,
            asthma: false,
            heart_condition: false,
            major_surgery: false,
            regular_medication: false,
            chronic_condition: false,
            drug_reaction: false,
            emergency_condition: false,
            isCompleted: true
        },
        verifications: {
            face: "not_configured",
            passkey: "not_configured",
            camera_live: "not_configured",
            liveness: "not_configured"
        },
        documents: []
    });

    // Seed Patient PAT1002
    mockStore.users.set("USR_PAT_1002", {
        userId: "USR_PAT_1002",
        fullName: "Priya Sharma",
        phone: "+919876543220",
        passwordHash: defaultPatientHash,
        role: "patient"
    });
    mockStore.patients.set("PAT1002", {
        id: "PAT1002",
        patientId: "PAT1002",
        userId: "USR_PAT_1002",
        name: "Priya Sharma",
        age: "24",
        gender: "Female",
        blood: "B+",
        bloodGroup: "B+",
        phone: "+919876543220",
        email: "priya@example.com",
        address: "Hyderabad, Telangana",
        notes: "Regular health records updated.",
        medicalHistory: "Mild seasonal asthma",
        profileCompleted: true,
        guardianName: "Rajesh Sharma",
        guardianPhone: "+919876543221",
        guardianRelationship: "Father",
        guardian2Name: "Meena Sharma",
        guardian2Phone: "+919876543222",
        guardian2Relationship: "Mother",
        healthInformation: {
            allergies: false,
            diabetes: false,
            hypertension: false,
            asthma: true,
            heart_condition: false,
            major_surgery: false,
            regular_medication: false,
            chronic_condition: false,
            drug_reaction: false,
            emergency_condition: false,
            isCompleted: true
        },
        verifications: {
            face: "not_configured",
            passkey: "not_configured",
            camera_live: "not_configured",
            liveness: "not_configured"
        },
        documents: []
    });

    // Seed Helper user
    mockStore.users.set("USR_HELP_01", {
        userId: "USR_HELP_01",
        fullName: "Healthcare Emergency Helper",
        phone: "+919876543299",
        role: "helper"
    });

    // Initial audit log
    mockStore.auditLogs.unshift({
        id: "LOG-1",
        sessionId: "system",
        action: "system_initialized",
        matchedPatientId: "PAT1001",
        timestamp: new Date().toISOString(),
        message: "MediCare healthcare system initialized with secure storage.",
        status: "system_initialized"
    });
}

// Unified query wrapper executing against real PostgreSQL pool if available,
// or returning safe empty results if in mock mode
async function query(sql, params = []) {
    await initializeDatabase();
    if (!isMockActive) {
        try {
            const pool = getPool();
            return await pool.query(sql, params);
        } catch (err) {
            console.warn("[PostgreSQL Query Error, falling back to mock]:", err.message);
        }
    }
    return { rows: [] };
}

/* ================= INITIALIZATION & SCHEMA MIGRATION ================= */

async function runInitialization() {
    try {
        const pool = getPool();
        const client = await pool.connect();
        try {
            await client.query("SELECT 1");
            console.log("Connected to PostgreSQL database successfully.");
            isMockActive = false;

            // Apply schema if exists
            const schemaPath = path.join(__dirname, "schema.sql");
            if (fs.existsSync(schemaPath)) {
                const schemaSql = fs.readFileSync(schemaPath, "utf8");
                const statements = schemaSql
                    .split(";")
                    .map(s => s.trim())
                    .filter(s => s.length > 0);

                for (const statement of statements) {
                    try {
                        await client.query(statement);
                    } catch (_) {}
                }
            }

            // Seed initial records in PostgreSQL if users table is empty
            const userCountRes = await client.query("SELECT COUNT(*) AS count FROM users");
            const count = parseInt(userCountRes.rows[0].count, 10);
            if (count === 0) {
                const defaultDoctorHash = await bcrypt.hash(process.env.DOCTOR_PASSWORD || "1234", 10);
                const defaultPatientHash = await bcrypt.hash(process.env.PATIENT_DEMO_PASSWORD || "1234", 10);

                await client.query(
                    `INSERT INTO users (user_id, full_name, phone, password_hash, role)
                     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
                    ["USR_DOC_01", "Dr. Sharma", "+919876543200", defaultDoctorHash, "doctor"]
                );
                await client.query(
                    `INSERT INTO doctors (user_id, doctor_id, full_name, phone)
                     VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
                    ["USR_DOC_01", "doctor", "Dr. Sharma", "+919876543200"]
                );
                await client.query(
                    `INSERT INTO users (user_id, full_name, phone, password_hash, role)
                     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
                    ["USR_PAT_1001", "Rahul Kumar", "+919876543210", defaultPatientHash, "patient"]
                );
                await client.query(
                    `INSERT INTO patients (user_id, patient_id, full_name, date_of_birth, gender, blood_group, phone, email, address)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
                    ["USR_PAT_1001", "PAT1001", "Rahul Kumar", "21", "Male", "O+", "+919876543210", "rahul@example.com", "Kurnool, Andhra Pradesh"]
                );
                await client.query(
                    `INSERT INTO guardians (patient_id, guardian_order, guardian_name, guardian_phone, relationship)
                     VALUES ($1, 1, 'Suresh Kumar', '+919876543211', 'Father'), ($1, 2, 'Sunita Kumar', '+919876543215', 'Mother')
                     ON CONFLICT DO NOTHING`,
                    ["PAT1001"]
                );
                await client.query(
                    `INSERT INTO health_information (patient_id) VALUES ($1) ON CONFLICT DO NOTHING`,
                    ["PAT1001"]
                );
            }
            return;
        } finally {
            client.release();
        }
    } catch (err) {
        console.warn("[Notice] PostgreSQL not available (" + err.message + ") — in-memory mock datastore active.");
        isMockActive = true;
        await seedMockStore();
    }
}

async function initializeDatabase() {
    if (!initPromise) {
        initPromise = runInitialization();
    }
    return initPromise;
}

/* ================= QUERY METHODS ================= */

// Health check executing SELECT NOW(); or returning in-memory timestamp
async function testDbConnection() {
    await initializeDatabase();
    if (!isMockActive) {
        try {
            const res = await query("SELECT NOW() AS now, version() AS version, current_database() AS database, current_user AS user");
            if (res && res.rows && res.rows.length > 0) {
                return res.rows[0];
            }
        } catch (e) {
            // fall back to mock report
        }
    }
    return {
        now: new Date().toISOString(),
        version: "PostgreSQL (In-Memory Datastore)",
        database: "medicare",
        user: "medicare_user"
    };
}

// Fetch complete patient details including guardians and structured health info
async function getPatientDetails(patientId) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();

    if (!isMockActive) {
        try {
            const patientRes = await query(
                `SELECT p.id, p.user_id, p.patient_id, p.full_name, p.date_of_birth,
                        p.gender, p.blood_group, p.phone, p.email, p.address,
                        p.profile_completed, p.created_at, p.updated_at,
                        m.medical_history, m.notes
                 FROM patients p
                 LEFT JOIN medical_records m ON m.patient_id = p.patient_id
                 WHERE UPPER(p.patient_id) = UPPER($1)`,
                [cleanId]
            );

            if (patientRes.rows.length > 0) {
                const row = patientRes.rows[0];
                const guardiansRes = await query(
                    `SELECT guardian_order, guardian_name, guardian_phone, relationship
                     FROM guardians
                     WHERE UPPER(patient_id) = UPPER($1)
                     ORDER BY guardian_order ASC`,
                    [cleanId]
                );

                let guardian1 = { name: "", phone: "", relationship: "" };
                let guardian2 = { name: "", phone: "", relationship: "" };
                for (const g of guardiansRes.rows) {
                    if (g.guardian_order === 1) guardian1 = { name: g.guardian_name || "", phone: g.guardian_phone || "", relationship: g.relationship || "" };
                    else if (g.guardian_order === 2) guardian2 = { name: g.guardian_name || "", phone: g.guardian_phone || "", relationship: g.relationship || "" };
                }

                const healthRes = await query(
                    `SELECT * FROM health_information WHERE UPPER(patient_id) = UPPER($1)`,
                    [cleanId]
                );
                const health = healthRes.rows[0] || {};

                const verifRes = await query(
                    `SELECT verification_type, status FROM verification_records WHERE UPPER(patient_id) = UPPER($1)`,
                    [cleanId]
                );
                const verifications = { face: "not_configured", passkey: "not_configured", camera_live: "not_configured", liveness: "not_configured" };
                for (const v of verifRes.rows) {
                    verifications[v.verification_type] = v.status || "not_configured";
                }

                const docsRes = await query(
                    `SELECT * FROM medical_documents WHERE UPPER(patient_id) = UPPER($1) ORDER BY created_at DESC`,
                    [cleanId]
                );

                return {
                    id: row.patient_id,
                    patientId: row.patient_id,
                    name: row.full_name,
                    age: row.date_of_birth,
                    gender: row.gender || "Other",
                    blood: row.blood_group || "O+",
                    bloodGroup: row.blood_group || "O+",
                    phone: row.phone || "",
                    email: row.email || "",
                    address: row.address || "",
                    notes: row.notes || "",
                    medicalHistory: row.medical_history || "",
                    profileCompleted: row.profile_completed !== false,
                    guardianName: guardian1.name,
                    guardianPhone: guardian1.phone,
                    guardianRelationship: guardian1.relationship,
                    guardian2Name: guardian2.name,
                    guardian2Phone: guardian2.phone,
                    guardian2Relationship: guardian2.relationship,
                    healthInformation: {
                        allergies: Boolean(health.allergies),
                        diabetes: Boolean(health.diabetes),
                        hypertension: Boolean(health.hypertension),
                        asthma: Boolean(health.asthma),
                        heart_condition: Boolean(health.heart_condition),
                        major_surgery: Boolean(health.major_surgery),
                        regular_medication: Boolean(health.regular_medication),
                        chronic_condition: Boolean(health.chronic_condition),
                        drug_reaction: Boolean(health.drug_reaction),
                        emergency_condition: Boolean(health.emergency_condition),
                        isCompleted: Boolean(health.is_completed)
                    },
                    verifications,
                    documents: docsRes.rows
                };
            }
        } catch (e) {
            console.warn("Falling back to in-memory patient details:", e.message);
        }
    }

    // In-memory mock patient lookup
    const patient = mockStore.patients.get(cleanId);
    if (!patient) return null;

    // Attach documents
    const docs = [];
    for (const d of mockStore.documents.values()) {
        if (d.patient_id && d.patient_id.toUpperCase() === cleanId) {
            docs.push(d);
        }
    }
    docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
        ...patient,
        documents: docs
    };
}

// Update primary & guardian details
async function updatePatientDetails(patientId, fields) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();

    if (!isMockActive) {
        try {
            await query(
                `UPDATE patients
                 SET full_name = COALESCE($1, full_name),
                     date_of_birth = COALESCE($2, date_of_birth),
                     gender = COALESCE($3, gender),
                     blood_group = COALESCE($4, blood_group),
                     email = COALESCE($5, email),
                     address = COALESCE($6, address),
                     phone = COALESCE($7, phone),
                     profile_completed = TRUE,
                     updated_at = NOW()
                 WHERE UPPER(patient_id) = UPPER($8)`,
                [
                    fields.name !== undefined ? fields.name : null,
                    fields.age !== undefined ? String(fields.age) : null,
                    fields.gender !== undefined ? fields.gender : null,
                    fields.blood !== undefined ? fields.blood : (fields.bloodGroup !== undefined ? fields.bloodGroup : null),
                    fields.email !== undefined ? fields.email : null,
                    fields.address !== undefined ? fields.address : null,
                    fields.phone !== undefined ? fields.phone : null,
                    cleanId
                ]
            );

            if (fields.guardianName !== undefined || fields.guardianPhone !== undefined || fields.guardianRelationship !== undefined) {
                await query(
                    `INSERT INTO guardians (patient_id, guardian_order, guardian_name, guardian_phone, relationship, updated_at)
                     VALUES ($1, 1, COALESCE($2, ''), COALESCE($3, ''), COALESCE($4, ''), NOW())
                     ON CONFLICT (patient_id, guardian_order)
                     DO UPDATE SET guardian_name = EXCLUDED.guardian_name, guardian_phone = EXCLUDED.guardian_phone, relationship = EXCLUDED.relationship, updated_at = NOW()`,
                    [cleanId, fields.guardianName || "", fields.guardianPhone || "", fields.guardianRelationship || ""]
                );
            }

            if (fields.guardian2Name !== undefined || fields.guardian2Phone !== undefined || fields.guardian2Relationship !== undefined) {
                await query(
                    `INSERT INTO guardians (patient_id, guardian_order, guardian_name, guardian_phone, relationship, updated_at)
                     VALUES ($1, 2, COALESCE($2, ''), COALESCE($3, ''), COALESCE($4, ''), NOW())
                     ON CONFLICT (patient_id, guardian_order)
                     DO UPDATE SET guardian_name = EXCLUDED.guardian_name, guardian_phone = EXCLUDED.guardian_phone, relationship = EXCLUDED.relationship, updated_at = NOW()`,
                    [cleanId, fields.guardian2Name || "", fields.guardian2Phone || "", fields.guardian2Relationship || ""]
                );
            }

            if (fields.notes !== undefined || fields.medicalHistory !== undefined) {
                await query(
                    `INSERT INTO medical_records (patient_id, medical_history, notes, updated_at)
                     VALUES ($1, COALESCE($2, ''), COALESCE($3, ''), NOW())
                     ON CONFLICT (patient_id)
                     DO UPDATE SET medical_history = COALESCE(EXCLUDED.medical_history, medical_records.medical_history), notes = COALESCE(EXCLUDED.notes, medical_records.notes), updated_at = NOW()`,
                    [cleanId, fields.medicalHistory || "", fields.notes || ""]
                );
            }

            return getPatientDetails(cleanId);
        } catch (e) {
            console.warn("Postgres update failed, updating in-memory store:", e.message);
        }
    }

    const patient = mockStore.patients.get(cleanId);
    if (!patient) return null;

    if (fields.name !== undefined) patient.name = fields.name;
    if (fields.age !== undefined) patient.age = String(fields.age);
    if (fields.gender !== undefined) patient.gender = fields.gender;
    if (fields.blood !== undefined) { patient.blood = fields.blood; patient.bloodGroup = fields.blood; }
    if (fields.bloodGroup !== undefined) { patient.blood = fields.bloodGroup; patient.bloodGroup = fields.bloodGroup; }
    if (fields.email !== undefined) patient.email = fields.email;
    if (fields.address !== undefined) patient.address = fields.address;
    if (fields.phone !== undefined) patient.phone = fields.phone;
    if (fields.notes !== undefined) patient.notes = fields.notes;
    if (fields.medicalHistory !== undefined) patient.medicalHistory = fields.medicalHistory;

    if (fields.guardianName !== undefined) patient.guardianName = fields.guardianName;
    if (fields.guardianPhone !== undefined) patient.guardianPhone = fields.guardianPhone;
    if (fields.guardianRelationship !== undefined) patient.guardianRelationship = fields.guardianRelationship;

    if (fields.guardian2Name !== undefined) patient.guardian2Name = fields.guardian2Name;
    if (fields.guardian2Phone !== undefined) patient.guardian2Phone = fields.guardian2Phone;
    if (fields.guardian2Relationship !== undefined) patient.guardian2Relationship = fields.guardian2Relationship;

    patient.profileCompleted = true;
    return getPatientDetails(cleanId);
}

// Update Structured Health Information
async function updateHealthInformation(patientId, health) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();

    if (!isMockActive) {
        try {
            await query(
                `INSERT INTO health_information (
                    patient_id, allergies, diabetes, hypertension, asthma,
                    heart_condition, major_surgery, regular_medication,
                    chronic_condition, drug_reaction, emergency_condition,
                    is_completed, updated_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, NOW())
                 ON CONFLICT (patient_id)
                 DO UPDATE SET
                     allergies = EXCLUDED.allergies,
                     diabetes = EXCLUDED.diabetes,
                     hypertension = EXCLUDED.hypertension,
                     asthma = EXCLUDED.asthma,
                     heart_condition = EXCLUDED.heart_condition,
                     major_surgery = EXCLUDED.major_surgery,
                     regular_medication = EXCLUDED.regular_medication,
                     chronic_condition = EXCLUDED.chronic_condition,
                     drug_reaction = EXCLUDED.drug_reaction,
                     emergency_condition = EXCLUDED.emergency_condition,
                     is_completed = TRUE,
                     updated_at = NOW()`,
                [
                    cleanId,
                    Boolean(health.allergies),
                    Boolean(health.diabetes),
                    Boolean(health.hypertension),
                    Boolean(health.asthma),
                    Boolean(health.heart_condition),
                    Boolean(health.major_surgery),
                    Boolean(health.regular_medication),
                    Boolean(health.chronic_condition),
                    Boolean(health.drug_reaction),
                    Boolean(health.emergency_condition)
                ]
            );
            return getPatientDetails(cleanId);
        } catch (e) {
            console.warn("Postgres health info update failed, falling back to mock:", e.message);
        }
    }

    const patient = mockStore.patients.get(cleanId);
    if (!patient) return null;

    patient.healthInformation = {
        allergies: Boolean(health.allergies),
        diabetes: Boolean(health.diabetes),
        hypertension: Boolean(health.hypertension),
        asthma: Boolean(health.asthma),
        heart_condition: Boolean(health.heart_condition),
        major_surgery: Boolean(health.major_surgery),
        regular_medication: Boolean(health.regular_medication),
        chronic_condition: Boolean(health.chronic_condition),
        drug_reaction: Boolean(health.drug_reaction),
        emergency_condition: Boolean(health.emergency_condition),
        isCompleted: true
    };

    return getPatientDetails(cleanId);
}

// Update Verification Status
async function updateVerificationRecord(patientId, verificationType, status, metadata = {}) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();

    if (!isMockActive) {
        try {
            await query(
                `INSERT INTO verification_records (
                    patient_id, verification_type, status, verified_at, metadata, updated_at
                 ) VALUES ($1, $2, $3, CASE WHEN $3 = 'verified' THEN NOW() ELSE NULL END, $4, NOW())
                 ON CONFLICT (patient_id, verification_type)
                 DO UPDATE SET
                     status = EXCLUDED.status,
                     verified_at = EXCLUDED.verified_at,
                     metadata = EXCLUDED.metadata,
                     updated_at = NOW()`,
                [cleanId, verificationType, status, JSON.stringify(metadata)]
            );
            return getPatientDetails(cleanId);
        } catch (e) {
            console.warn("Postgres verification update failed, falling back to mock:", e.message);
        }
    }

    const patient = mockStore.patients.get(cleanId);
    if (patient && patient.verifications) {
        patient.verifications[verificationType] = status;
    }
    return getPatientDetails(cleanId);
}

/* ================= MEDICAL DOCUMENTS ================= */

async function saveMedicalDocument(patientId, doc) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();
    const documentId = doc.documentId || ("DOC_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8).toUpperCase());

    if (!isMockActive) {
        try {
            const res = await query(
                `INSERT INTO medical_documents (
                    document_id, patient_id, original_filename, file_type, file_size, storage_reference, uploaded_by, extracted_text, uploaded_at, created_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                 RETURNING id, document_id, patient_id, original_filename, file_type, file_size, storage_reference, uploaded_by, uploaded_at, created_at`,
                [
                    documentId,
                    cleanId,
                    doc.originalFilename,
                    doc.fileType,
                    doc.fileSize,
                    doc.storageReference,
                    doc.uploadedBy || "patient",
                    doc.extractedText || null
                ]
            );
            return res.rows[0];
        } catch (e) {
            console.warn("Postgres save doc failed, saving in mockStore:", e.message);
        }
    }

    const record = {
        id: ++mockStore.nextDocId,
        document_id: documentId,
        patient_id: cleanId,
        original_filename: doc.originalFilename,
        file_type: doc.fileType,
        file_size: doc.fileSize,
        storage_reference: doc.storageReference,
        uploaded_by: doc.uploadedBy || "patient",
        extracted_text: doc.extractedText || null,
        uploaded_at: new Date().toISOString(),
        created_at: new Date().toISOString()
    };
    mockStore.documents.set(documentId, record);
    return record;
}

async function getPatientDocuments(patientId) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT * FROM medical_documents WHERE UPPER(patient_id) = UPPER($1) ORDER BY created_at DESC`,
                [cleanId]
            );
            return res.rows;
        } catch (e) {
            console.warn("Postgres get docs failed, falling back to mock:", e.message);
        }
    }

    const docs = [];
    for (const d of mockStore.documents.values()) {
        if (d.patient_id && d.patient_id.toUpperCase() === cleanId) {
            docs.push(d);
        }
    }
    docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return docs;
}

async function getMedicalDocument(patientId, documentId) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT * FROM medical_documents
                 WHERE UPPER(patient_id) = UPPER($1) AND (document_id = $2 OR CAST(id AS VARCHAR) = $2)`,
                [cleanId, documentId]
            );
            if (res.rows.length > 0) return res.rows[0];
        } catch (e) {
            console.warn("Postgres get doc failed, falling back to mock:", e.message);
        }
    }

    for (const d of mockStore.documents.values()) {
        if (d.patient_id && d.patient_id.toUpperCase() === cleanId) {
            if (d.document_id === documentId || String(d.id) === String(documentId)) {
                return d;
            }
        }
    }
    return null;
}

async function deleteMedicalDocument(patientId, documentId) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();

    if (!isMockActive) {
        try {
            const res = await query(
                `DELETE FROM medical_documents
                 WHERE UPPER(patient_id) = UPPER($1) AND (document_id = $2 OR CAST(id AS VARCHAR) = $2)
                 RETURNING *`,
                [cleanId, documentId]
            );
            if (res.rows.length > 0) return res.rows[0];
        } catch (e) {
            console.warn("Postgres delete doc failed, falling back to mock:", e.message);
        }
    }

    for (const [key, d] of mockStore.documents.entries()) {
        if (d.patient_id && d.patient_id.toUpperCase() === cleanId) {
            if (d.document_id === documentId || String(d.id) === String(documentId)) {
                mockStore.documents.delete(key);
                return d;
            }
        }
    }
    return null;
}

async function findDocumentForPrompt(patientId, promptText, documentId = null) {
    const cleanId = String(patientId || "").trim().toUpperCase();
    if (documentId) {
        return getMedicalDocument(cleanId, documentId);
    }
    const docs = await getPatientDocuments(cleanId);
    if (!docs || docs.length === 0) return null;

    const lowerPrompt = (promptText || "").toLowerCase();
    for (const d of docs) {
        const fn = (d.original_filename || "").toLowerCase();
        const baseName = fn.split(".")[0];
        if (lowerPrompt.includes(fn) || (baseName.length > 3 && lowerPrompt.includes(baseName))) {
            return d;
        }
    }

    const docKeywords = ["report", "blood", "test", "file", "document", "pdf", "scan", "lab", "result", "prescription"];
    if (docKeywords.some(kw => lowerPrompt.includes(kw))) {
        return docs[0];
    }

    return null;
}

// Find or create patient by phone
async function findOrCreatePatientByPhone(phone) {
    await initializeDatabase();

    if (!isMockActive) {
        try {
            const existing = await query("SELECT patient_id FROM patients WHERE phone = $1", [phone]);
            if (existing.rows.length > 0) {
                return getPatientDetails(existing.rows[0].patient_id);
            }
        } catch (e) {
            console.warn("Postgres find phone failed, using mock:", e.message);
        }
    }

    // Check mock
    for (const p of mockStore.patients.values()) {
        if (p.phone === phone) return getPatientDetails(p.patientId);
    }

    const newId = "PAT" + (1000 + mockStore.patients.size + 1);
    const userId = "USR_" + newId;

    const newPatient = {
        id: newId,
        patientId: newId,
        userId: userId,
        name: "New Patient",
        phone: phone,
        age: "",
        gender: "Other",
        blood: "O+",
        bloodGroup: "O+",
        email: "",
        address: "",
        notes: "",
        medicalHistory: "",
        profileCompleted: false,
        guardianName: "",
        guardianPhone: "",
        guardianRelationship: "",
        guardian2Name: "",
        guardian2Phone: "",
        guardian2Relationship: "",
        healthInformation: {
            allergies: false,
            diabetes: false,
            hypertension: false,
            asthma: false,
            heart_condition: false,
            major_surgery: false,
            regular_medication: false,
            chronic_condition: false,
            drug_reaction: false,
            emergency_condition: false,
            isCompleted: false
        },
        verifications: {
            face: "not_configured",
            passkey: "not_configured",
            camera_live: "not_configured",
            liveness: "not_configured"
        },
        documents: []
    };

    mockStore.patients.set(newId, newPatient);
    mockStore.users.set(userId, {
        userId,
        fullName: "New Patient",
        phone,
        role: "patient"
    });

    return getPatientDetails(newId);
}

// Register a new patient
async function registerPatient(fields) {
    await initializeDatabase();
    const {
        fullName,
        phone,
        password,
        age,
        gender,
        bloodGroup,
        email,
        address,
        guardianName,
        guardianPhone,
        guardianRelationship,
        guardian2Name,
        guardian2Phone,
        guardian2Relationship
    } = fields;

    const passwordHash = await bcrypt.hash(password || "1234", 10);
    const validBloodGroup = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(bloodGroup)
        ? bloodGroup
        : "O+";

    const nextNum = 1000 + mockStore.patients.size + 1;
    const newPatientId = "PAT" + nextNum;
    const newUserId = "USR_" + newPatientId;

    if (!isMockActive) {
        try {
            await query(
                `INSERT INTO users (user_id, full_name, phone, password_hash, role)
                 VALUES ($1, $2, $3, $4, 'patient')`,
                [newUserId, fullName || "Patient", phone || null, passwordHash]
            );
            await query(
                `INSERT INTO patients (user_id, patient_id, full_name, date_of_birth, gender, blood_group, phone, email, address)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [newUserId, newPatientId, fullName || "Patient", age ? String(age) : "", gender || "Other", validBloodGroup, phone || "", email || "", address || ""]
            );
            await query(
                `INSERT INTO guardians (patient_id, guardian_order, guardian_name, guardian_phone, relationship)
                 VALUES ($1, 1, $2, $3, $4), ($1, 2, $5, $6, $7)`,
                [newPatientId, guardianName || "", guardianPhone || "", guardianRelationship || "Primary Guardian", guardian2Name || "", guardian2Phone || "", guardian2Relationship || ""]
            );
            await query(`INSERT INTO health_information (patient_id) VALUES ($1) ON CONFLICT DO NOTHING`, [newPatientId]);
        } catch (e) {
            console.warn("Postgres register patient failed, saving in mock:", e.message);
        }
    }

    mockStore.users.set(newUserId, {
        userId: newUserId,
        fullName: fullName || "Patient",
        phone: phone || null,
        passwordHash,
        role: "patient"
    });

    mockStore.patients.set(newPatientId, {
        id: newPatientId,
        patientId: newPatientId,
        userId: newUserId,
        name: fullName || "Patient",
        age: age ? String(age) : "",
        gender: gender || "Other",
        blood: validBloodGroup,
        bloodGroup: validBloodGroup,
        phone: phone || "",
        email: email || "",
        address: address || "",
        notes: "",
        medicalHistory: "",
        profileCompleted: true,
        guardianName: guardianName || "",
        guardianPhone: guardianPhone || "",
        guardianRelationship: guardianRelationship || "Primary Guardian",
        guardian2Name: guardian2Name || "",
        guardian2Phone: guardian2Phone || "",
        guardian2Relationship: guardian2Relationship || "",
        healthInformation: {
            allergies: false,
            diabetes: false,
            hypertension: false,
            asthma: false,
            heart_condition: false,
            major_surgery: false,
            regular_medication: false,
            chronic_condition: false,
            drug_reaction: false,
            emergency_condition: false,
            isCompleted: false
        },
        verifications: {
            face: "not_configured",
            passkey: "not_configured",
            camera_live: "not_configured",
            liveness: "not_configured"
        },
        documents: []
    });

    return {
        patientId: newPatientId,
        fullName,
        phone
    };
}

// Doctor Self-Registration in PostgreSQL
async function registerDoctor(fields) {
    await initializeDatabase();
    const {
        fullName,
        username,
        doctorId,
        phone,
        password,
        specialization,
        department
    } = fields;

    let cleanDocId = String(username || doctorId || "").trim();
    if (!cleanDocId) {
        const nextDocNum = 1000 + mockStore.doctors.size + 1;
        cleanDocId = "DOC" + nextDocNum;
    }

    const cleanName = String(fullName || "").trim() || "Doctor";
    const cleanSpec = String(specialization || "General Medicine").trim();
    const cleanDept = String(department || cleanSpec).trim();
    const passwordHash = await bcrypt.hash(password || "1234", 10);
    const newUserId = "USR_DOC_" + cleanDocId.replace(/[^a-zA-Z0-9_]/g, "");

    // Check mock cache for existing username/ID
    for (const doc of mockStore.doctors.values()) {
        if (doc.doctorId.toLowerCase() === cleanDocId.toLowerCase() || doc.userId.toLowerCase() === newUserId.toLowerCase()) {
            throw new Error(`A doctor with username "${cleanDocId}" already exists. Please choose a different one.`);
        }
    }

    if (!isMockActive) {
        try {
            const existing = await query(
                `SELECT u.user_id, d.doctor_id
                 FROM users u
                 FULL OUTER JOIN doctors d ON d.user_id = u.user_id
                 WHERE LOWER(u.user_id) = LOWER($1) OR LOWER(d.doctor_id) = LOWER($2)`,
                [newUserId, cleanDocId]
            );

            if (existing.rows && existing.rows.length > 0) {
                throw new Error(`A doctor with username "${cleanDocId}" already exists. Please choose a different one.`);
            }

            await query(
                `INSERT INTO users (user_id, full_name, phone, password_hash, role)
                 VALUES ($1, $2, $3, $4, 'doctor')`,
                [newUserId, cleanName, phone || null, passwordHash]
            );

            await query(
                `INSERT INTO doctors (user_id, doctor_id, full_name, phone, specialization, department)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [newUserId, cleanDocId, cleanName, phone || "", cleanSpec, cleanDept]
            );
        } catch (e) {
            if (e.code === "23505" || (e.message && (e.message.includes("already exists") || e.message.includes("unique") || e.message.includes("duplicate")))) {
                throw new Error(`A doctor with username "${cleanDocId}" already exists. Please choose a different one.`);
            }
            console.warn("Postgres doctor registration fallback to mock:", e.message);
        }
    }

    mockStore.users.set(newUserId, {
        userId: newUserId,
        fullName: cleanName,
        phone: phone || null,
        passwordHash,
        role: "doctor"
    });

    mockStore.doctors.set(cleanDocId, {
        doctorId: cleanDocId,
        userId: newUserId,
        name: cleanName,
        phone: phone || "",
        specialization: cleanSpec,
        department: cleanDept
    });

    return {
        doctorId: cleanDocId,
        fullName: cleanName,
        phone: phone || "",
        specialization: cleanSpec,
        department: cleanDept,
        userId: newUserId
    };
}

// Doctor password login
async function verifyDoctorUser(username, plainPassword) {
    await initializeDatabase();
    const cleanUser = String(username || "").trim().toLowerCase();

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT u.user_id, u.password_hash, d.doctor_id, d.full_name, d.specialization, d.department
                 FROM users u
                 JOIN doctors d ON d.user_id = u.user_id
                 WHERE (LOWER(d.doctor_id) = LOWER($1) OR LOWER(u.user_id) = LOWER($1)) AND u.role = 'doctor'`,
                [cleanUser]
            );

            if (res.rows.length > 0) {
                const doc = res.rows[0];
                const match = await bcrypt.compare(plainPassword, doc.password_hash);
                if (match) {
                    return {
                        doctorId: doc.doctor_id,
                        name: doc.full_name,
                        specialization: doc.specialization || "General Medicine",
                        department: doc.department || "General Medicine",
                        role: "doctor"
                    };
                }
            }
        } catch (e) {
            console.warn("Postgres doctor login failed, checking mock:", e.message);
        }
    }

    // Check mock doctors
    for (const doc of mockStore.doctors.values()) {
        if (doc.doctorId.toLowerCase() === cleanUser || doc.userId.toLowerCase() === cleanUser) {
            const user = mockStore.users.get(doc.userId);
            if (user && user.passwordHash) {
                const match = await bcrypt.compare(plainPassword, user.passwordHash);
                if (match) {
                    return {
                        doctorId: doc.doctorId,
                        name: doc.name,
                        specialization: doc.specialization || "General Medicine",
                        department: doc.department || "General Medicine",
                        role: "doctor"
                    };
                }
            }
        }
    }
    return null;
}

// Patient password login
async function verifyPatientUser(patientId, plainPassword) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT u.user_id, u.password_hash, p.patient_id, p.phone, p.full_name
                 FROM patients p
                 JOIN users u ON u.user_id = p.user_id
                 WHERE UPPER(p.patient_id) = UPPER($1) AND u.role = 'patient'`,
                [cleanId]
            );

            if (res.rows.length > 0) {
                const patient = res.rows[0];
                const match = await bcrypt.compare(plainPassword, patient.password_hash);
                if (match) {
                    return {
                        patientId: patient.patient_id,
                        phone: patient.phone,
                        name: patient.full_name,
                        role: "patient"
                    };
                }
            }
        } catch (e) {
            console.warn("Postgres patient login failed, checking mock:", e.message);
        }
    }

    const patient = mockStore.patients.get(cleanId);
    if (patient) {
        const user = mockStore.users.get(patient.userId);
        if (user && user.passwordHash) {
            const match = await bcrypt.compare(plainPassword, user.passwordHash);
            if (match) {
                return {
                    patientId: patient.patientId,
                    phone: patient.phone,
                    name: patient.name,
                    role: "patient"
                };
            }
        }
    }
    return null;
}

// Audit log insertion
async function insertAuditLog(userId, action, targetUserId, metadata = {}) {
    await initializeDatabase();

    if (!isMockActive) {
        try {
            const res = await query(
                `INSERT INTO audit_logs (user_id, action, target_user_id, metadata)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, created_at`,
                [userId || "anonymous", action, targetUserId || null, JSON.stringify(metadata)]
            );
            if (res.rows.length > 0) return res.rows[0];
        } catch (e) {
            // fall back to mock
        }
    }

    const logEntry = {
        id: "LOG-" + (++mockStore.nextLogId),
        sessionId: userId || "anonymous",
        action,
        status: (metadata && metadata.status) ? metadata.status : action,
        matchedPatientId: targetUserId || null,
        timestamp: new Date().toISOString(),
        metadata,
        message: (metadata && metadata.message) ? metadata.message : action
    };
    mockStore.auditLogs.unshift(logEntry);
    if (mockStore.auditLogs.length > 100) mockStore.auditLogs.pop();
    return { id: logEntry.id, created_at: logEntry.timestamp };
}

// Recent audit logs
async function getRecentAuditLogs(limit = 25) {
    await initializeDatabase();

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT id, user_id AS "sessionId", action, target_user_id AS "matchedPatientId",
                        created_at AS timestamp, metadata
                 FROM audit_logs
                 ORDER BY created_at DESC
                 LIMIT $1`,
                [limit]
            );

            if (res.rows.length > 0) {
                return res.rows.map(r => {
                    let meta = r.metadata;
                    if (typeof meta === "string") {
                        try { meta = JSON.parse(meta); } catch (_) {}
                    }
                    return {
                        id: "LOG-" + r.id,
                        sessionId: r.sessionId,
                        status: (meta && meta.status) ? meta.status : r.action,
                        matchedPatientId: r.matchedPatientId,
                        timestamp: r.timestamp,
                        message: (meta && meta.message) ? meta.message : r.action
                    };
                });
            }
        } catch (e) {
            // fall back to mock
        }
    }

    return mockStore.auditLogs.slice(0, limit);
}

// Save WebAuthn passkey credential
async function saveWebAuthnCredential(userId, credentialId, publicKey, counter = 0) {
    await initializeDatabase();

    if (!isMockActive) {
        try {
            await query(
                `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (credential_id)
                 DO UPDATE SET public_key = EXCLUDED.public_key, counter = EXCLUDED.counter`,
                [userId, credentialId, publicKey, counter]
            );
            return;
        } catch (e) {
            // fall back to mock
        }
    }

    mockStore.webauthn.set(credentialId, { userId, credentialId, publicKey, counter });
}

/* ================= DOCTOR-PATIENT ACCESS REQUESTS & AUTHORIZATION ================= */

// Doctor Search Preview (Strictly limited: ONLY patientId, name, request status)
async function searchPatientPreview(doctorId, queryTerm) {
    await initializeDatabase();
    const cleanDoc = String(doctorId || "").trim().toLowerCase();
    const cleanTerm = String(queryTerm || "").trim();
    if (!cleanTerm) return null;

    let patientSummary = null;

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT patient_id AS "patientId", full_name AS "name"
                 FROM patients
                 WHERE UPPER(patient_id) = UPPER($1) OR LOWER(full_name) = LOWER($1) OR LOWER(full_name) LIKE LOWER($2)
                 LIMIT 1`,
                [cleanTerm, `%${cleanTerm}%`]
            );
            if (res.rows.length > 0) {
                patientSummary = res.rows[0];
            }
        } catch (e) {
            console.warn("Postgres search preview fallback:", e.message);
        }
    }

    if (!patientSummary) {
        for (const p of mockStore.patients.values()) {
            if (p.patientId.toUpperCase() === cleanTerm.toUpperCase() ||
                p.name.toLowerCase().includes(cleanTerm.toLowerCase())) {
                patientSummary = {
                    patientId: p.patientId,
                    name: p.name
                };
                break;
            }
        }
    }

    if (!patientSummary) return null;

    // Fetch existing request status for this doctor and patient
    const requestStatus = await getDoctorAccessStatus(cleanDoc, patientSummary.patientId);

    return {
        patientId: patientSummary.patientId,
        name: patientSummary.name,
        requestStatus: requestStatus.status,
        requestedAt: requestStatus.requestedAt,
        respondedAt: requestStatus.respondedAt
    };
}

// Get Access Status between Doctor and Patient
async function getDoctorAccessStatus(doctorId, patientId) {
    await initializeDatabase();
    const cleanDoc = String(doctorId || "").trim().toLowerCase();
    const cleanPat = String(patientId || "").trim().toUpperCase();

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT status, requested_at AS "requestedAt", responded_at AS "respondedAt"
                 FROM doctor_patient_requests
                 WHERE LOWER(doctor_id) = LOWER($1) AND UPPER(patient_id) = UPPER($2)`,
                [cleanDoc, cleanPat]
            );
            if (res.rows.length > 0) {
                return {
                    status: res.rows[0].status,
                    requestedAt: res.rows[0].requestedAt,
                    respondedAt: res.rows[0].respondedAt
                };
            }
        } catch (e) {
            console.warn("Postgres get access status fallback:", e.message);
        }
    }

    const key = `${cleanDoc}:${cleanPat}`;
    const req = mockStore.accessRequests.get(key);
    if (req) {
        return {
            status: req.status,
            requestedAt: req.requestedAt,
            respondedAt: req.respondedAt
        };
    }

    return { status: "none", requestedAt: null, respondedAt: null };
}

// Check if Doctor has accepted access for Patient
async function isDoctorAccessAccepted(doctorId, patientId) {
    const statusObj = await getDoctorAccessStatus(doctorId, patientId);
    return statusObj.status === "accepted";
}

// Doctor creates access request to a Patient
async function createDoctorAccessRequest(doctorId, patientId) {
    await initializeDatabase();
    const cleanDoc = String(doctorId || "").trim().toLowerCase();
    const cleanPat = String(patientId || "").trim().toUpperCase();

    // Verify patient exists
    let patientExists = false;
    if (!isMockActive) {
        try {
            const chk = await query(`SELECT 1 FROM patients WHERE UPPER(patient_id) = UPPER($1)`, [cleanPat]);
            if (chk.rows.length > 0) patientExists = true;
        } catch (_) {}
    }
    if (!patientExists) {
        patientExists = mockStore.patients.has(cleanPat);
    }
    if (!patientExists) {
        throw new Error(`Patient with ID "${cleanPat}" not found.`);
    }

    if (!isMockActive) {
        try {
            const res = await query(
                `INSERT INTO doctor_patient_requests (doctor_id, patient_id, status, requested_at, responded_at)
                 VALUES ($1, $2, 'pending', NOW(), NULL)
                 ON CONFLICT (doctor_id, patient_id)
                 DO UPDATE SET status = 'pending', requested_at = NOW(), responded_at = NULL
                 RETURNING id, doctor_id, patient_id, status, requested_at`,
                [cleanDoc, cleanPat]
            );
            if (res.rows.length > 0) {
                const row = res.rows[0];
                const key = `${cleanDoc}:${cleanPat}`;
                mockStore.accessRequests.set(key, {
                    id: row.id,
                    doctorId: cleanDoc,
                    patientId: cleanPat,
                    status: "pending",
                    requestedAt: row.requested_at,
                    respondedAt: null
                });
                return row;
            }
        } catch (e) {
            console.warn("Postgres access request fallback:", e.message);
        }
    }

    const key = `${cleanDoc}:${cleanPat}`;
    const req = {
        id: ++mockStore.nextRequestId,
        doctorId: cleanDoc,
        patientId: cleanPat,
        status: "pending",
        requestedAt: new Date().toISOString(),
        respondedAt: null
    };
    mockStore.accessRequests.set(key, req);
    return req;
}

// Get Access Requests for Patient (displayed in Patient Dashboard)
async function getDoctorAccessRequestsForPatient(patientId) {
    await initializeDatabase();
    const cleanPat = String(patientId || "").trim().toUpperCase();

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT r.id, r.doctor_id AS "doctorId", r.patient_id AS "patientId", r.status,
                        r.requested_at AS "requestedAt", r.responded_at AS "respondedAt",
                        COALESCE(d.full_name, 'Doctor') AS "doctorName",
                        d.phone AS "doctorPhone",
                        COALESCE(d.specialization, 'General Medicine') AS "specialization",
                        COALESCE(d.department, 'General Medicine') AS "department"
                 FROM doctor_patient_requests r
                 LEFT JOIN doctors d ON LOWER(d.doctor_id) = LOWER(r.doctor_id)
                 WHERE UPPER(r.patient_id) = UPPER($1)
                 ORDER BY r.requested_at DESC`,
                [cleanPat]
            );
            if (res.rows.length > 0) return res.rows;
        } catch (e) {
            console.warn("Postgres get patient requests fallback:", e.message);
        }
    }

    const list = [];
    for (const r of mockStore.accessRequests.values()) {
        if (r.patientId.toUpperCase() === cleanPat) {
            const doc = mockStore.doctors.get(r.doctorId.toLowerCase()) || { name: "Doctor", specialization: "General Medicine" };
            list.push({
                id: r.id,
                doctorId: r.doctorId,
                patientId: r.patientId,
                status: r.status,
                requestedAt: r.requestedAt,
                respondedAt: r.respondedAt,
                doctorName: doc.name || "Doctor",
                doctorPhone: doc.phone || "",
                specialization: doc.specialization || "General Medicine",
                department: doc.department || "General Medicine"
            });
        }
    }
    list.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    return list;
}

// Get Access Requests sent by Doctor (displayed in Doctor Dashboard)
async function getDoctorAccessRequestsForDoctor(doctorId) {
    await initializeDatabase();
    const cleanDoc = String(doctorId || "").trim().toLowerCase();

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT r.id, r.doctor_id AS "doctorId", r.patient_id AS "patientId", r.status,
                        r.requested_at AS "requestedAt", r.responded_at AS "respondedAt",
                        COALESCE(p.full_name, 'Patient') AS "patientName"
                 FROM doctor_patient_requests r
                 LEFT JOIN patients p ON UPPER(p.patient_id) = UPPER(r.patient_id)
                 WHERE LOWER(r.doctor_id) = LOWER($1)
                 ORDER BY r.requested_at DESC`,
                [cleanDoc]
            );
            if (res.rows.length > 0) return res.rows;
        } catch (e) {
            console.warn("Postgres get doctor requests fallback:", e.message);
        }
    }

    const list = [];
    for (const r of mockStore.accessRequests.values()) {
        if (r.doctorId.toLowerCase() === cleanDoc) {
            const pat = mockStore.patients.get(r.patientId.toUpperCase()) || { name: "Patient" };
            list.push({
                id: r.id,
                doctorId: r.doctorId,
                patientId: r.patientId,
                status: r.status,
                requestedAt: r.requestedAt,
                respondedAt: r.respondedAt,
                patientName: pat.name || "Patient"
            });
        }
    }
    list.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    return list;
}

// Patient responds to access request (accept / reject)
async function respondToDoctorAccessRequest(patientId, doctorId, action) {
    await initializeDatabase();
    const cleanPat = String(patientId || "").trim().toUpperCase();
    const cleanDoc = String(doctorId || "").trim().toLowerCase();
    const newStatus = (action === "accept" || action === "accepted") ? "accepted" : "rejected";

    if (!isMockActive) {
        try {
            await query(
                `UPDATE doctor_patient_requests
                 SET status = $1, responded_at = NOW()
                 WHERE UPPER(patient_id) = UPPER($2) AND LOWER(doctor_id) = LOWER($3)`,
                [newStatus, cleanPat, cleanDoc]
            );

            if (newStatus === "accepted") {
                await query(
                    `INSERT INTO doctor_patient_access (doctor_id, patient_id, status, granted_at, revoked_at)
                     VALUES ($1, $2, 'active', NOW(), NULL)
                     ON CONFLICT (doctor_id, patient_id)
                     DO UPDATE SET status = 'active', granted_at = NOW(), revoked_at = NULL`,
                    [cleanDoc, cleanPat]
                );
            } else {
                await query(
                    `INSERT INTO doctor_patient_access (doctor_id, patient_id, status, revoked_at)
                     VALUES ($1, $2, 'revoked', NOW())
                     ON CONFLICT (doctor_id, patient_id)
                     DO UPDATE SET status = 'revoked', revoked_at = NOW()`,
                    [cleanDoc, cleanPat]
                );
            }
        } catch (e) {
            console.warn("Postgres respond to request fallback:", e.message);
        }
    }

    const key = `${cleanDoc}:${cleanPat}`;
    const req = mockStore.accessRequests.get(key) || {
        id: ++mockStore.nextRequestId,
        doctorId: cleanDoc,
        patientId: cleanPat
    };
    req.status = newStatus;
    req.respondedAt = new Date().toISOString();
    mockStore.accessRequests.set(key, req);

    mockStore.accessRecords.set(key, {
        doctorId: cleanDoc,
        patientId: cleanPat,
        status: newStatus === "accepted" ? "active" : "revoked"
    });

    return { success: true, status: newStatus, doctorId: cleanDoc, patientId: cleanPat };
}

// Get list of Accepted Doctors for Patient (used for active Doctor Chat list)
async function getAcceptedDoctorsForPatient(patientId) {
    await initializeDatabase();
    const cleanPat = String(patientId || "").trim().toUpperCase();

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT d.doctor_id AS "doctorId", d.full_name AS "name", d.phone,
                        COALESCE(d.specialization, 'General Medicine') AS "specialization",
                        COALESCE(d.department, 'General Medicine') AS "department",
                        r.status AS "connectionStatus",
                        r.responded_at AS "acceptedAt"
                 FROM doctors d
                 JOIN doctor_patient_requests r ON LOWER(r.doctor_id) = LOWER(d.doctor_id)
                 WHERE UPPER(r.patient_id) = UPPER($1) AND r.status = 'accepted'
                 ORDER BY d.full_name ASC`,
                [cleanPat]
            );
            if (res.rows.length > 0) return res.rows;
        } catch (e) {
            console.warn("Postgres get accepted doctors fallback:", e.message);
        }
    }

    const list = [];
    for (const r of mockStore.accessRequests.values()) {
        if (r.patientId.toUpperCase() === cleanPat && r.status === "accepted") {
            const doc = mockStore.doctors.get(r.doctorId.toLowerCase());
            if (doc) {
                list.push({
                    doctorId: doc.doctorId,
                    name: doc.name,
                    phone: doc.phone,
                    specialization: doc.specialization || "General Medicine",
                    department: doc.department || "General Medicine",
                    connectionStatus: "connected",
                    acceptedAt: r.respondedAt
                });
            }
        }
    }
    return list;
}

// Get list of Accepted Patients for Doctor (displayed in Doctor Dashboard)
async function getAcceptedPatientsForDoctor(doctorId) {
    await initializeDatabase();
    const cleanDoc = String(doctorId || "").trim().toLowerCase();

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT p.patient_id AS "patientId", p.full_name AS "name", p.blood_group AS "bloodGroup",
                        r.responded_at AS "acceptedAt",
                        COALESCE((
                            SELECT COUNT(*)
                            FROM chat_messages cm
                            WHERE cm.patient_id = p.patient_id
                              AND cm.doctor_id = $1
                              AND cm.receiver_id = $1
                              AND cm.is_read = FALSE
                        ), 0) AS "unreadCount"
                 FROM patients p
                 JOIN doctor_patient_requests r ON UPPER(r.patient_id) = UPPER(p.patient_id)
                 WHERE LOWER(r.doctor_id) = LOWER($1) AND r.status = 'accepted'
                 ORDER BY p.full_name ASC`,
                [cleanDoc]
            );
            if (res.rows.length > 0) {
                return res.rows.map(r => ({
                    ...r,
                    unreadCount: parseInt(r.unreadCount, 10) || 0
                }));
            }
        } catch (e) {
            console.warn("Postgres get accepted patients fallback:", e.message);
        }
    }

    const list = [];
    for (const r of mockStore.accessRequests.values()) {
        if (r.doctorId.toLowerCase() === cleanDoc && r.status === "accepted") {
            const p = mockStore.patients.get(r.patientId.toUpperCase());
            if (p) {
                list.push({
                    patientId: p.patientId,
                    name: p.name,
                    bloodGroup: p.bloodGroup || p.blood || "",
                    acceptedAt: r.respondedAt,
                    unreadCount: 0
                });
            }
        }
    }
    return list;
}

// Get Authorized Patient Details for Doctor (STRICT PRIVACY ENFORCEMENT)
async function getAuthorizedPatientDetailsForDoctor(doctorId, patientId) {
    await initializeDatabase();
    const cleanDoc = String(doctorId || "").trim().toLowerCase();
    const cleanPat = String(patientId || "").trim().toUpperCase();

    // Check authorization
    const isAccepted = await isDoctorAccessAccepted(cleanDoc, cleanPat);
    if (!isAccepted) {
        return null;
    }

    const fullPatient = await getPatientDetails(cleanPat);
    if (!fullPatient) return null;

    // Get authorized medical documents
    const allDocs = await getPatientDocuments(cleanPat);
    const authorizedDocs = (allDocs || [])
        .filter(d => d.is_authorized_for_doctors !== false)
        .map(d => ({
            id: d.id,
            documentId: d.document_id,
            originalFilename: d.original_filename,
            fileType: d.file_type,
            fileSize: d.file_size,
            uploadedAt: d.uploaded_at
        }));

    // Return ONLY permitted fields:
    // Patient Name, Patient ID, Blood Group, Health Information, Authorized Medical Records
    // DO NOT return: phone, email, address, guardians, credentials, password hashes!
    return {
        id: fullPatient.patientId || fullPatient.id,
        patientId: fullPatient.patientId || fullPatient.id,
        name: fullPatient.name,
        bloodGroup: fullPatient.bloodGroup || fullPatient.blood || "Not specified",
        healthInformation: fullPatient.healthInformation || {},
        authorizedDocuments: authorizedDocs
    };
}

// Toggle Medical Document Doctor Authorization
async function toggleDocumentDoctorAuthorization(patientId, documentId, isAuthorized) {
    await initializeDatabase();
    const cleanPat = String(patientId || "").trim().toUpperCase();

    if (!isMockActive) {
        try {
            await query(
                `UPDATE medical_documents
                 SET is_authorized_for_doctors = $1
                 WHERE UPPER(patient_id) = UPPER($2) AND (document_id = $3 OR CAST(id AS VARCHAR) = $3)`,
                [Boolean(isAuthorized), cleanPat, documentId]
            );
        } catch (e) {
            console.warn("Postgres toggle doc auth error:", e.message);
        }
    }

    for (const d of mockStore.documents.values()) {
        if (d.patient_id && d.patient_id.toUpperCase() === cleanPat) {
            if (d.document_id === documentId || String(d.id) === String(documentId)) {
                d.is_authorized_for_doctors = Boolean(isAuthorized);
                return d;
            }
        }
    }
    return { success: true };
}

/* ================= CHAT BOARD & MESSAGING METHODS ================= */

// List available doctors for patient chat (Strictly Accepted Doctors only)
async function getDoctorsList(patientId = null) {
    await initializeDatabase();
    if (patientId) {
        return getAcceptedDoctorsForPatient(patientId);
    }

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT doctor_id AS "doctorId", full_name AS "name", phone,
                        COALESCE(specialization, 'General Medicine') AS "specialization",
                        COALESCE(department, 'General Medicine') AS "department"
                 FROM doctors
                 ORDER BY full_name ASC`
            );
            if (res.rows.length > 0) return res.rows;
        } catch (e) {
            // fall back
        }
    }

    return Array.from(mockStore.doctors.values()).map(d => ({
        doctorId: d.doctorId,
        name: d.name,
        phone: d.phone,
        specialization: d.specialization || "General Medicine",
        department: d.department || "General Medicine"
    }));
}

// List patients for doctor chat (STRICT: ONLY ACCEPTED PATIENTS)
async function getDoctorPatientsList(doctorId) {
    await initializeDatabase();
    const cleanDoc = String(doctorId || "").trim().toLowerCase();

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT p.patient_id AS "patientId", p.full_name AS "name", p.blood_group AS "bloodGroup",
                        COALESCE((
                            SELECT COUNT(*)
                            FROM chat_messages cm
                            WHERE cm.patient_id = p.patient_id
                              AND cm.doctor_id = $1
                              AND cm.receiver_id = $1
                              AND cm.is_read = FALSE
                        ), 0) AS "unreadCount",
                        (
                            SELECT MAX(created_at)
                            FROM chat_messages cm2
                            WHERE cm2.patient_id = p.patient_id
                              AND cm2.doctor_id = $1
                        ) AS "lastMessageTime"
                 FROM patients p
                 JOIN doctor_patient_requests r ON UPPER(r.patient_id) = UPPER(p.patient_id) AND LOWER(r.doctor_id) = LOWER($1) AND r.status = 'accepted'
                 ORDER BY "lastMessageTime" DESC NULLS LAST, p.patient_id ASC`,
                [cleanDoc]
            );
            if (res.rows.length > 0) {
                return res.rows.map(r => ({
                    ...r,
                    unreadCount: parseInt(r.unreadCount, 10) || 0
                }));
            }
        } catch (e) {
            // fall back
        }
    }

    const list = [];
    for (const p of mockStore.patients.values()) {
        const key = `${cleanDoc}:${p.patientId.toUpperCase()}`;
        const req = mockStore.accessRequests.get(key);
        if (req && req.status === "accepted") {
            const unreadCount = mockStore.chatMessages.filter(
                m => m.patientId === p.patientId && m.doctorId === cleanDoc && m.receiverId === cleanDoc && !m.isRead
            ).length;
            const patientMessages = mockStore.chatMessages.filter(
                m => m.patientId === p.patientId && m.doctorId === cleanDoc
            );
            const lastMessage = patientMessages[patientMessages.length - 1];

            list.push({
                patientId: p.patientId,
                name: p.name,
                bloodGroup: p.bloodGroup,
                unreadCount,
                lastMessageTime: lastMessage ? lastMessage.timestamp : null
            });
        }
    }
    return list;
}

// Fetch chat messages between patient and doctor
async function getDoctorPatientMessages(patientId, doctorId) {
    await initializeDatabase();
    const cleanPatient = String(patientId || "").toUpperCase();
    const cleanDoctor = String(doctorId || "").toLowerCase();

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT message_id AS "messageId",
                        patient_id AS "patientId",
                        doctor_id AS "doctorId",
                        sender_id AS "senderId",
                        receiver_id AS "receiverId",
                        message,
                        is_read AS "isRead",
                        created_at AS "timestamp"
                 FROM chat_messages
                 WHERE UPPER(patient_id) = UPPER($1) AND LOWER(doctor_id) = LOWER($2)
                 ORDER BY created_at ASC`,
                [cleanPatient, cleanDoctor]
            );
            return res.rows;
        } catch (e) {
            // fall back
        }
    }

    return mockStore.chatMessages.filter(
        m => m.patientId.toUpperCase() === cleanPatient && m.doctorId.toLowerCase() === cleanDoctor
    );
}

// Save a doctor-patient chat message
async function saveChatMessage({ messageId, patientId, doctorId, senderId, receiverId, message }) {
    await initializeDatabase();
    const cleanPatient = String(patientId || "").toUpperCase();
    const cleanDoctor = String(doctorId || "").toLowerCase();

    if (!isMockActive) {
        try {
            const res = await query(
                `INSERT INTO chat_messages (
                    message_id, patient_id, doctor_id, sender_id, receiver_id, message, is_read, created_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())
                 RETURNING message_id AS "messageId",
                           patient_id AS "patientId",
                           doctor_id AS "doctorId",
                           sender_id AS "senderId",
                           receiver_id AS "receiverId",
                           message,
                           is_read AS "isRead",
                           created_at AS "timestamp"`,
                [messageId, cleanPatient, cleanDoctor, senderId, receiverId, message]
            );
            if (res.rows.length > 0) return res.rows[0];
        } catch (e) {
            // fall back
        }
    }

    const msg = {
        messageId,
        patientId: cleanPatient,
        doctorId: cleanDoctor,
        senderId,
        receiverId,
        message,
        isRead: false,
        timestamp: new Date().toISOString()
    };
    mockStore.chatMessages.push(msg);
    return msg;
}

// Mark messages as read by reader
async function markChatMessagesAsRead(patientId, doctorId, readerId) {
    await initializeDatabase();
    const cleanPatient = String(patientId || "").toUpperCase();
    const cleanDoctor = String(doctorId || "").toLowerCase();

    if (!isMockActive) {
        try {
            await query(
                `UPDATE chat_messages
                 SET is_read = TRUE
                 WHERE UPPER(patient_id) = UPPER($1)
                   AND LOWER(doctor_id) = LOWER($2)
                   AND UPPER(receiver_id) = UPPER($3)
                   AND is_read = FALSE`,
                [cleanPatient, cleanDoctor, readerId]
            );
            return;
        } catch (e) {
            // fall back
        }
    }

    for (const m of mockStore.chatMessages) {
        if (
            m.patientId.toUpperCase() === cleanPatient &&
            m.doctorId.toLowerCase() === cleanDoctor &&
            m.receiverId.toUpperCase() === String(readerId).toUpperCase()
        ) {
            m.isRead = true;
        }
    }
}

// Save AI Health Assistant message
async function saveAiChatMessage(sessionId, role, message) {
    await initializeDatabase();

    if (!isMockActive) {
        try {
            const res = await query(
                `INSERT INTO ai_chat_messages (session_id, role, message, created_at)
                 VALUES ($1, $2, $3, NOW())
                 RETURNING id, session_id AS "sessionId", role, message, created_at AS "timestamp"`,
                [sessionId, role, message]
            );
            if (res.rows.length > 0) return res.rows[0];
        } catch (e) {
            // fall back
        }
    }

    const entry = {
        id: mockStore.aiChatMessages.length + 1,
        sessionId,
        role,
        message,
        timestamp: new Date().toISOString()
    };
    mockStore.aiChatMessages.push(entry);
    return entry;
}

// Get AI chat history for session
async function getAiChatHistory(sessionId, limit = 50) {
    await initializeDatabase();

    if (!isMockActive) {
        try {
            const res = await query(
                `SELECT id, session_id AS "sessionId", role, message, created_at AS "timestamp"
                 FROM ai_chat_messages
                 WHERE session_id = $1
                 ORDER BY created_at ASC
                 LIMIT $2`,
                [sessionId, limit]
            );
            if (res.rows.length > 0) return res.rows;
        } catch (e) {
            // fall back
        }
    }

    return mockStore.aiChatMessages
        .filter(m => m.sessionId === sessionId)
        .slice(-limit);
}

// Clear AI chat history for session
async function clearAiChatHistory(sessionId) {
    await initializeDatabase();

    if (!isMockActive) {
        try {
            await query(`DELETE FROM ai_chat_messages WHERE session_id = $1`, [sessionId]);
            return;
        } catch (e) {
            // fall back
        }
    }

    mockStore.aiChatMessages = mockStore.aiChatMessages.filter(m => m.sessionId !== sessionId);
}

module.exports = {
    query,
    initializeDatabase,
    testDbConnection,
    getPatientDetails,
    updatePatientDetails,
    updateHealthInformation,
    updateVerificationRecord,
    findOrCreatePatientByPhone,
    registerPatient,
    registerDoctor,
    verifyDoctorUser,
    verifyPatientUser,
    insertAuditLog,
    getRecentAuditLogs,
    saveWebAuthnCredential,
    // Medical Documents CRUD
    saveMedicalDocument,
    getPatientDocuments,
    getMedicalDocument,
    deleteMedicalDocument,
    findDocumentForPrompt,
    // Chat & AI Exports
    getDoctorsList,
    getDoctorPatientsList,
    getDoctorPatientMessages,
    saveChatMessage,
    markChatMessagesAsRead,
    saveAiChatMessage,
    getAiChatHistory,
    clearAiChatHistory
};
