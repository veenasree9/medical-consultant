const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/* ================= POSTGRESQL CONNECTION POOL SETUP ================= */
let pgPoolInstance = null;

function ensureLocalPostgresRunning() {
    try {
        const isLocalHost = !process.env.SQL_HOST || !fs.existsSync(process.env.SQL_HOST);
        const dbUrl = process.env.DATABASE_URL || "";
        const isUrlLocal = !dbUrl || dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");

        if (isLocalHost && isUrlLocal && fs.existsSync("/var/lib/postgresql/data")) {
            try {
                execSync("pg_isready -h 127.0.0.1 -p 5432", { stdio: "ignore" });
            } catch {
                console.log("Local PostgreSQL not running. Starting PostgreSQL server...");
                execSync("su - postgres -c 'pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/logfile start'", { stdio: "ignore" });
            }
        }
    } catch (err) {
        console.warn("Notice checking local PostgreSQL status:", err.message);
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
            connectionTimeoutMillis: 5000
        };
    }

    // 2. Direct PostgreSQL connection URL (e.g. Supabase, Neon, AWS RDS, or local)
    if (process.env.DATABASE_URL) {
        const url = process.env.DATABASE_URL;
        const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
        return {
            connectionString: url,
            ssl: isLocal ? false : { rejectUnauthorized: false },
            max: 10,
            connectionTimeoutMillis: 5000
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
        connectionTimeoutMillis: 5000
    };
}

function getPool() {
    if (!pgPoolInstance) {
        ensureLocalPostgresRunning();
        const config = getPostgresPoolConfig();
        pgPoolInstance = new Pool(config);

        pgPoolInstance.on("error", (err) => {
            console.error("Unexpected error on idle PostgreSQL client:", err.message);
        });
    }
    return pgPoolInstance;
}

// Unified query wrapper executing against real PostgreSQL pool
async function query(sql, params = []) {
    const pool = getPool();
    return await pool.query(sql, params);
}

/* ================= INITIALIZATION & SCHEMA MIGRATION ================= */
let initPromise = null;

async function runInitialization() {
    ensureLocalPostgresRunning();
    const pool = getPool();

    // Verify connectivity with real PostgreSQL database
    const client = await pool.connect();
    try {
        await client.query("SELECT 1");
        console.log("Connected to PostgreSQL database successfully.");
    } finally {
        client.release();
    }

    // Read and apply schema
    const schemaPath = path.join(__dirname, "schema.sql");
    if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, "utf8");
        const statements = schemaSql
            .split(";")
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            try {
                await query(statement);
            } catch (stmtErr) {
                console.warn("Schema execution notice:", stmtErr.message);
            }
        }
    }

    // Ensure columns and constraints exist
    try {
        await query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'guardians' AND column_name = 'guardian_order'
                ) THEN
                    ALTER TABLE guardians ADD COLUMN guardian_order INTEGER NOT NULL DEFAULT 1;
                END IF;
            END $$;
        `);
    } catch (_) {
        try {
            await query("ALTER TABLE guardians ADD COLUMN IF NOT EXISTS guardian_order INTEGER NOT NULL DEFAULT 1");
        } catch (e) {
            // column may already exist
        }
    }

    try {
        await query(`
            ALTER TABLE patients ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT TRUE;
            ALTER TABLE health_information ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE medical_documents ADD COLUMN IF NOT EXISTS document_id VARCHAR(100);
            ALTER TABLE medical_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW();
            ALTER TABLE medical_documents ADD COLUMN IF NOT EXISTS extracted_text TEXT;
        `);
        await query(`
            UPDATE medical_documents 
            SET document_id = 'DOC_' || id 
            WHERE document_id IS NULL;
        `);
    } catch (migErr) {
        console.warn("Schema column migration notice:", migErr.message);
    }

    // Seed initial records if users table is empty
    const userCountRes = await query("SELECT COUNT(*) AS count FROM users");
    const count = parseInt(userCountRes.rows[0].count, 10);

    if (count === 0) {
        console.log("Seeding initial records into PostgreSQL database...");
        const defaultDoctorHash = await bcrypt.hash(process.env.DOCTOR_PASSWORD || "1234", 10);
        const defaultPatientHash = await bcrypt.hash(process.env.PATIENT_DEMO_PASSWORD || "1234", 10);

        // Doctor
        await query(
            `INSERT INTO users (user_id, full_name, phone, password_hash, role)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id) DO NOTHING`,
            ["USR_DOC_01", "Dr. Sharma", "+919876543200", defaultDoctorHash, "doctor"]
        );

        await query(
            `INSERT INTO doctors (user_id, doctor_id, full_name, phone)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (doctor_id) DO NOTHING`,
            ["USR_DOC_01", "doctor", "Dr. Sharma", "+919876543200"]
        );

        // Patient USR_PAT_1001 / PAT1001
        await query(
            `INSERT INTO users (user_id, full_name, phone, password_hash, role)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id) DO NOTHING`,
            ["USR_PAT_1001", "Rahul Kumar", "+919876543210", defaultPatientHash, "patient"]
        );

        await query(
            `INSERT INTO patients (user_id, patient_id, full_name, date_of_birth, gender, blood_group, phone, email, address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (patient_id) DO NOTHING`,
            ["USR_PAT_1001", "PAT1001", "Rahul Kumar", "21", "Male", "O+", "+919876543210", "rahul@example.com", "Kurnool, Andhra Pradesh"]
        );

        // Guardian 1 (Primary)
        await query(
            `INSERT INTO guardians (patient_id, guardian_order, guardian_name, guardian_phone, relationship)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (patient_id, guardian_order) DO UPDATE
             SET guardian_name = EXCLUDED.guardian_name,
                 guardian_phone = EXCLUDED.guardian_phone,
                 relationship = EXCLUDED.relationship`,
            ["PAT1001", 1, "Suresh Kumar", "+919876543211", "Father"]
        );

        // Guardian 2 (Secondary)
        await query(
            `INSERT INTO guardians (patient_id, guardian_order, guardian_name, guardian_phone, relationship)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (patient_id, guardian_order) DO UPDATE
             SET guardian_name = EXCLUDED.guardian_name,
                 guardian_phone = EXCLUDED.guardian_phone,
                 relationship = EXCLUDED.relationship`,
            ["PAT1001", 2, "Sunita Kumar", "+919876543215", "Mother"]
        );

        // Structured Health Information
        await query(
            `INSERT INTO health_information (
                patient_id, allergies, diabetes, hypertension, asthma,
                heart_condition, major_surgery, regular_medication,
                chronic_condition, drug_reaction, emergency_condition
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (patient_id) DO NOTHING`,
            ["PAT1001", false, false, false, false, false, false, false, false, false, false]
        );

        // Initial Verification Records
        const verifTypes = ["face", "passkey", "camera_live", "liveness"];
        for (const vType of verifTypes) {
            await query(
                `INSERT INTO verification_records (patient_id, verification_type, status)
                 VALUES ($1, $2, 'not_configured')
                 ON CONFLICT (patient_id, verification_type) DO NOTHING`,
                ["PAT1001", vType]
            );
        }

        // Medical records
        await query(
            `INSERT INTO medical_records (patient_id, medical_history, notes)
             VALUES ($1, $2, $3)
             ON CONFLICT (patient_id) DO NOTHING`,
            ["PAT1001", "No major surgical history", "Blood pressure monitored annually."]
        );

        // Helper
        await query(
            `INSERT INTO users (user_id, full_name, phone, role)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO NOTHING`,
            ["USR_HELP_01", "Healthcare Emergency Helper", "+919876543299", "helper"]
        );

        // Audit log
        await query(
            `INSERT INTO audit_logs (user_id, action, target_user_id, metadata)
             VALUES ($1, $2, $3, $4)`,
            ["system", "system_initialized", "PAT1001", JSON.stringify({ message: "MediCare healthcare system initialized with PostgreSQL storage." })]
        );
    }
}

async function initializeDatabase() {
    if (!initPromise) {
        initPromise = runInitialization();
    }
    return initPromise;
}

/* ================= QUERY METHODS ================= */

// Health check executing SELECT NOW(); on real PostgreSQL
async function testDbConnection() {
    await initializeDatabase();
    const res = await query("SELECT NOW() AS now, version() AS version, current_database() AS database, current_user AS user");
    if (!res || !res.rows || res.rows.length === 0) {
        throw new Error("PostgreSQL query returned no results for SELECT NOW();");
    }
    return res.rows[0];
}

// Fetch complete patient details including both guardians and structured health info
async function getPatientDetails(patientId) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();

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

    if (patientRes.rows.length === 0) {
        return null;
    }

    const row = patientRes.rows[0];

    // Get Guardians (1 and 2)
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
        if (g.guardian_order === 1) {
            guardian1 = {
                name: g.guardian_name || "",
                phone: g.guardian_phone || "",
                relationship: g.relationship || ""
            };
        } else if (g.guardian_order === 2) {
            guardian2 = {
                name: g.guardian_name || "",
                phone: g.guardian_phone || "",
                relationship: g.relationship || ""
            };
        }
    }

    // Get Structured Health Information
    const healthRes = await query(
        `SELECT allergies, diabetes, hypertension, asthma, heart_condition,
                major_surgery, regular_medication, chronic_condition,
                drug_reaction, emergency_condition, is_completed, updated_at
         FROM health_information
         WHERE UPPER(patient_id) = UPPER($1)`,
        [cleanId]
    );

    const health = healthRes.rows.length > 0 ? healthRes.rows[0] : {
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
        is_completed: false
    };

    // Get Verification Records
    const verifRes = await query(
        `SELECT verification_type, status, verified_at, metadata
         FROM verification_records
         WHERE UPPER(patient_id) = UPPER($1)`,
        [cleanId]
    );

    const verifications = {
        face: "not_configured",
        passkey: "not_configured",
        camera_live: "not_configured",
        liveness: "not_configured"
    };

    for (const v of verifRes.rows) {
        verifications[v.verification_type] = v.status || "not_configured";
    }

    // Get Documents
    const docsRes = await query(
        `SELECT id, document_id, original_filename, file_type, file_size, storage_reference, uploaded_by, uploaded_at, created_at
         FROM medical_documents
         WHERE UPPER(patient_id) = UPPER($1)
         ORDER BY created_at DESC`,
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
        // Guardian 1 (Primary)
        guardianName: guardian1.name,
        guardianPhone: guardian1.phone,
        guardianRelationship: guardian1.relationship,
        // Guardian 2 (Secondary)
        guardian2Name: guardian2.name,
        guardian2Phone: guardian2.phone,
        guardian2Relationship: guardian2.relationship,
        // Structured Health Information
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
        // Verifications
        verifications,
        documents: docsRes.rows
    };
}

// Update primary & guardian details in PostgreSQL
async function updatePatientDetails(patientId, fields) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();

    // 1. Update patient primary record
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

    // 2. Update Primary Guardian (order 1)
    if (fields.guardianName !== undefined || fields.guardianPhone !== undefined || fields.guardianRelationship !== undefined) {
        await query(
            `INSERT INTO guardians (patient_id, guardian_order, guardian_name, guardian_phone, relationship, updated_at)
             VALUES ($1, 1, COALESCE($2, ''), COALESCE($3, ''), COALESCE($4, ''), NOW())
             ON CONFLICT (patient_id, guardian_order)
             DO UPDATE SET
                 guardian_name = COALESCE(EXCLUDED.guardian_name, guardians.guardian_name),
                 guardian_phone = COALESCE(EXCLUDED.guardian_phone, guardians.guardian_phone),
                 relationship = COALESCE(EXCLUDED.relationship, guardians.relationship),
                 updated_at = NOW()`,
            [
                cleanId,
                fields.guardianName !== undefined ? fields.guardianName : null,
                fields.guardianPhone !== undefined ? fields.guardianPhone : null,
                fields.guardianRelationship !== undefined ? fields.guardianRelationship : null
            ]
        );
    }

    // 3. Update Secondary Guardian (order 2)
    if (fields.guardian2Name !== undefined || fields.guardian2Phone !== undefined || fields.guardian2Relationship !== undefined) {
        await query(
            `INSERT INTO guardians (patient_id, guardian_order, guardian_name, guardian_phone, relationship, updated_at)
             VALUES ($1, 2, COALESCE($2, ''), COALESCE($3, ''), COALESCE($4, ''), NOW())
             ON CONFLICT (patient_id, guardian_order)
             DO UPDATE SET
                 guardian_name = COALESCE(EXCLUDED.guardian_name, guardians.guardian_name),
                 guardian_phone = COALESCE(EXCLUDED.guardian_phone, guardians.guardian_phone),
                 relationship = COALESCE(EXCLUDED.relationship, guardians.relationship),
                 updated_at = NOW()`,
            [
                cleanId,
                fields.guardian2Name !== undefined ? fields.guardian2Name : null,
                fields.guardian2Phone !== undefined ? fields.guardian2Phone : null,
                fields.guardian2Relationship !== undefined ? fields.guardian2Relationship : null
            ]
        );
    }

    // 4. Update Medical Notes / Medical History
    if (fields.notes !== undefined || fields.medicalHistory !== undefined) {
        await query(
            `INSERT INTO medical_records (patient_id, medical_history, notes, updated_at)
             VALUES ($1, COALESCE($2, ''), COALESCE($3, ''), NOW())
             ON CONFLICT (patient_id)
             DO UPDATE SET
                 medical_history = COALESCE(EXCLUDED.medical_history, medical_records.medical_history),
                 notes = COALESCE(EXCLUDED.notes, medical_records.notes),
                 updated_at = NOW()`,
            [
                cleanId,
                fields.medicalHistory !== undefined ? fields.medicalHistory : null,
                fields.notes !== undefined ? fields.notes : null
            ]
        );
    }

    return getPatientDetails(cleanId);
}

// Update Structured Health Information in PostgreSQL
async function updateHealthInformation(patientId, health) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();

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
}

// Update Verification Status in PostgreSQL
async function updateVerificationRecord(patientId, verificationType, status, metadata = {}) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();

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
        [
            cleanId,
            verificationType,
            status,
            JSON.stringify(metadata)
        ]
    );

    return getPatientDetails(cleanId);
}

/* ================= MEDICAL DOCUMENTS (POSTGRESQL METADATA & STORAGE) ================= */

async function saveMedicalDocument(patientId, doc) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();
    const documentId = doc.documentId || ("DOC_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8).toUpperCase());
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
}

async function getPatientDocuments(patientId) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();
    const res = await query(
        `SELECT id, document_id, patient_id, original_filename, file_type, file_size, storage_reference, uploaded_by, uploaded_at, created_at
         FROM medical_documents
         WHERE UPPER(patient_id) = UPPER($1)
         ORDER BY created_at DESC`,
        [cleanId]
    );
    return res.rows;
}

async function getMedicalDocument(patientId, documentId) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();
    const res = await query(
        `SELECT * FROM medical_documents
         WHERE UPPER(patient_id) = UPPER($1) AND (document_id = $2 OR CAST(id AS VARCHAR) = $2)`,
        [cleanId, documentId]
    );
    return res.rows[0] || null;
}

async function deleteMedicalDocument(patientId, documentId) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();
    const res = await query(
        `DELETE FROM medical_documents
         WHERE UPPER(patient_id) = UPPER($1) AND (document_id = $2 OR CAST(id AS VARCHAR) = $2)
         RETURNING *`,
        [cleanId, documentId]
    );
    return res.rows[0] || null;
}

async function findDocumentForPrompt(patientId, promptText, documentId = null) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();
    if (documentId) {
        return getMedicalDocument(cleanId, documentId);
    }
    const docs = await getPatientDocuments(cleanId);
    if (!docs || docs.length === 0) return null;

    const lowerPrompt = (promptText || "").toLowerCase();
    // 1. Check if user explicitly mentioned a filename
    for (const d of docs) {
        const fn = (d.original_filename || "").toLowerCase();
        const baseName = fn.split(".")[0];
        if (lowerPrompt.includes(fn) || (baseName.length > 3 && lowerPrompt.includes(baseName))) {
            return d;
        }
    }

    // 2. Check if prompt refers to report/document/test/blood/file
    const docKeywords = ["report", "blood", "test", "file", "document", "pdf", "scan", "lab", "result", "prescription"];
    const hasKeyword = docKeywords.some(kw => lowerPrompt.includes(kw));
    if (hasKeyword) {
        // Return most recently uploaded document
        return docs[0];
    }

    return null;
}

// Find or create patient by phone
async function findOrCreatePatientByPhone(phone) {
    await initializeDatabase();
    const existing = await query("SELECT patient_id FROM patients WHERE phone = $1", [phone]);
    if (existing.rows.length > 0) {
        return getPatientDetails(existing.rows[0].patient_id);
    }

    const client = await getPool().connect();
    try {
        await client.query("BEGIN");

        const countRes = await client.query("SELECT COUNT(*) AS count FROM patients");
        const newId = "PAT" + (1000 + parseInt(countRes.rows[0].count, 10) + 1);
        const userId = "USR_" + newId;

        await client.query(
            `INSERT INTO users (user_id, full_name, phone, role)
             VALUES ($1, $2, $3, 'patient')
             ON CONFLICT (user_id) DO NOTHING`,
            [userId, "New Patient", phone]
        );

        await client.query(
            `INSERT INTO patients (user_id, patient_id, full_name, phone, gender, blood_group, profile_completed)
             VALUES ($1, $2, $3, $4, 'Other', 'O+', FALSE)`,
            [userId, newId, "New Patient", phone]
        );

        await client.query(
            `INSERT INTO guardians (patient_id, guardian_order, guardian_name, guardian_phone, relationship)
             VALUES ($1, 1, '', '', ''), ($1, 2, '', '', '')`,
            [newId]
        );

        await client.query(
            `INSERT INTO health_information (patient_id)
             VALUES ($1)
             ON CONFLICT (patient_id) DO NOTHING`,
            [newId]
        );

        await client.query(
            `INSERT INTO medical_records (patient_id, medical_history, notes)
             VALUES ($1, '', '')`,
            [newId]
        );

        await client.query("COMMIT");
        return getPatientDetails(newId);
    } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
    } finally {
        client.release();
    }
}

// Register a new patient in PostgreSQL (Atomic Transaction)
async function registerPatient({
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
}) {
    await initializeDatabase();
    const client = await getPool().connect();
    try {
        await client.query("BEGIN");

        const countRes = await client.query("SELECT COUNT(*) AS count FROM patients");
        const nextNum = 1000 + parseInt(countRes.rows[0].count, 10) + 1;
        const newPatientId = "PAT" + nextNum;
        const newUserId = "USR_" + newPatientId;

        const passwordHash = await bcrypt.hash(password || "1234", 10);
        const validBloodGroup = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(bloodGroup)
            ? bloodGroup
            : "O+";

        // 1. Insert into users
        await client.query(
            `INSERT INTO users (user_id, full_name, phone, password_hash, role)
             VALUES ($1, $2, $3, $4, 'patient')`,
            [newUserId, fullName || "Patient", phone || null, passwordHash]
        );

        // 2. Insert into patients
        await client.query(
            `INSERT INTO patients (user_id, patient_id, full_name, date_of_birth, gender, blood_group, phone, email, address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                newUserId,
                newPatientId,
                fullName || "Patient",
                age ? String(age) : "",
                gender || "Other",
                validBloodGroup,
                phone || "",
                email || "",
                address || ""
            ]
        );

        // 3. Primary Guardian
        await client.query(
            `INSERT INTO guardians (patient_id, guardian_order, guardian_name, guardian_phone, relationship)
             VALUES ($1, 1, $2, $3, $4)`,
            [newPatientId, guardianName || "", guardianPhone || "", guardianRelationship || "Primary Guardian"]
        );

        // 4. Secondary Guardian (order 2)
        await client.query(
            `INSERT INTO guardians (patient_id, guardian_order, guardian_name, guardian_phone, relationship)
             VALUES ($1, 2, $2, $3, $4)`,
            [newPatientId, guardian2Name || "", guardian2Phone || "", guardian2Relationship || ""]
        );

        // 5. Health information defaults
        await client.query(
            `INSERT INTO health_information (patient_id)
             VALUES ($1)
             ON CONFLICT (patient_id) DO NOTHING`,
            [newPatientId]
        );

        // 6. Verification records
        const verifTypes = ["face", "passkey", "camera_live", "liveness"];
        for (const vType of verifTypes) {
            await client.query(
                `INSERT INTO verification_records (patient_id, verification_type, status)
                 VALUES ($1, $2, 'not_configured')
                 ON CONFLICT (patient_id, verification_type) DO NOTHING`,
                [newPatientId, vType]
            );
        }

        // 7. Medical records
        await client.query(
            `INSERT INTO medical_records (patient_id, medical_history, notes)
             VALUES ($1, '', '')
             ON CONFLICT (patient_id) DO NOTHING`,
            [newPatientId]
        );

        await client.query("COMMIT");

        return {
            patientId: newPatientId,
            fullName,
            phone
        };
    } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
    } finally {
        client.release();
    }
}

// Doctor password login
async function verifyDoctorUser(username, plainPassword) {
    await initializeDatabase();
    const res = await query(
        `SELECT u.user_id, u.password_hash, d.doctor_id, d.full_name
         FROM users u
         JOIN doctors d ON d.user_id = u.user_id
         WHERE (d.doctor_id = $1 OR u.user_id = $1) AND u.role = 'doctor'`,
        [username]
    );

    if (res.rows.length > 0) {
        const doc = res.rows[0];
        const match = await bcrypt.compare(plainPassword, doc.password_hash);
        if (match) {
            return {
                doctorId: doc.doctor_id,
                name: doc.full_name,
                role: "doctor"
            };
        }
    }
    return null;
}

// Patient password login
async function verifyPatientUser(patientId, plainPassword) {
    await initializeDatabase();
    const cleanId = String(patientId || "").trim().toUpperCase();

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
    return null;
}

// Audit log insertion
async function insertAuditLog(userId, action, targetUserId, metadata = {}) {
    await initializeDatabase();
    const res = await query(
        `INSERT INTO audit_logs (user_id, action, target_user_id, metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING id, created_at`,
        [userId || "anonymous", action, targetUserId || null, JSON.stringify(metadata)]
    );
    return res.rows[0];
}

// Recent audit logs
async function getRecentAuditLogs(limit = 25) {
    await initializeDatabase();
    const res = await query(
        `SELECT id, user_id AS "sessionId", action, target_user_id AS "matchedPatientId",
                created_at AS timestamp, metadata
         FROM audit_logs
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
    );

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

// Save WebAuthn passkey credential
async function saveWebAuthnCredential(userId, credentialId, publicKey, counter = 0) {
    await initializeDatabase();
    await query(
        `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (credential_id)
         DO UPDATE SET public_key = EXCLUDED.public_key, counter = EXCLUDED.counter`,
        [userId, credentialId, publicKey, counter]
    );
}

/* ================= CHAT BOARD & MESSAGING METHODS ================= */

// List available doctors for patient chat
async function getDoctorsList() {
    await initializeDatabase();
    const res = await query(
        `SELECT doctor_id AS "doctorId", full_name AS "name", phone
         FROM doctors
         ORDER BY full_name ASC`
    );
    return res.rows;
}

// List patients for doctor chat (with unread counts & last active timestamp)
async function getDoctorPatientsList(doctorId) {
    await initializeDatabase();
    const res = await query(
        `SELECT p.patient_id AS "patientId", p.full_name AS "name", p.phone, p.blood_group AS "bloodGroup",
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
         ORDER BY "lastMessageTime" DESC NULLS LAST, p.patient_id ASC`,
        [doctorId]
    );
    return res.rows.map(r => ({
        ...r,
        unreadCount: parseInt(r.unreadCount, 10) || 0
    }));
}

// Fetch chat messages between patient and doctor
async function getDoctorPatientMessages(patientId, doctorId) {
    await initializeDatabase();
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
         WHERE UPPER(patient_id) = UPPER($1) AND UPPER(doctor_id) = UPPER($2)
         ORDER BY created_at ASC`,
        [patientId, doctorId]
    );
    return res.rows;
}

// Save a doctor-patient chat message
async function saveChatMessage({ messageId, patientId, doctorId, senderId, receiverId, message }) {
    await initializeDatabase();
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
        [messageId, patientId, doctorId, senderId, receiverId, message]
    );
    return res.rows[0];
}

// Mark messages as read by reader
async function markChatMessagesAsRead(patientId, doctorId, readerId) {
    await initializeDatabase();
    await query(
        `UPDATE chat_messages
         SET is_read = TRUE
         WHERE UPPER(patient_id) = UPPER($1)
           AND UPPER(doctor_id) = UPPER($2)
           AND UPPER(receiver_id) = UPPER($3)
           AND is_read = FALSE`,
        [patientId, doctorId, readerId]
    );
}

// Save AI Health Assistant message
async function saveAiChatMessage(sessionId, role, message) {
    await initializeDatabase();
    const res = await query(
        `INSERT INTO ai_chat_messages (session_id, role, message, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, session_id AS "sessionId", role, message, created_at AS "timestamp"`,
        [sessionId, role, message]
    );
    return res.rows[0];
}

// Get AI chat history for session
async function getAiChatHistory(sessionId, limit = 50) {
    await initializeDatabase();
    const res = await query(
        `SELECT id, session_id AS "sessionId", role, message, created_at AS "timestamp"
         FROM ai_chat_messages
         WHERE session_id = $1
         ORDER BY created_at ASC
         LIMIT $2`,
        [sessionId, limit]
    );
    return res.rows;
}

// Clear AI chat history for session
async function clearAiChatHistory(sessionId) {
    await initializeDatabase();
    await query(
        `DELETE FROM ai_chat_messages WHERE session_id = $1`,
        [sessionId]
    );
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
