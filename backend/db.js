const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

/* ================= CONNECTION POOL CONFIGURATION ================= */
// Configure PostgreSQL connection pool using Cloud SQL Object Method or DATABASE_URL
let pool;

if (process.env.SQL_HOST) {
    pool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    });
} else if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("localhost")
            ? false
            : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    });
} else {
    // Default fallback if running locally without Cloud SQL socket
    pool = new Pool({
        host: "localhost",
        port: 5432,
        user: "postgres",
        database: "medicare"
    });
}

// Prevent unhandled errors from breaking the process
pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client:", err.message);
});

/* ================= SCHEMA MIGRATION & SEEDING ================= */
async function initializeDatabase() {
    try {
        // If SQL_ADMIN_USER is available, ensure schema and grant permissions
        if (process.env.SQL_ADMIN_USER && process.env.SQL_ADMIN_PASSWORD) {
            const adminPool = new Pool({
                host: process.env.SQL_HOST,
                user: process.env.SQL_ADMIN_USER,
                password: process.env.SQL_ADMIN_PASSWORD,
                database: process.env.SQL_DB_NAME
            });

            try {
                const schemaPath = path.join(__dirname, "schema.sql");
                if (fs.existsSync(schemaPath)) {
                    const schemaSql = fs.readFileSync(schemaPath, "utf8");
                    await adminPool.query(schemaSql);
                }

                if (process.env.SQL_USER) {
                    await adminPool.query(`
                        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${process.env.SQL_USER};
                        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${process.env.SQL_USER};
                        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${process.env.SQL_USER};
                        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${process.env.SQL_USER};
                    `);
                }
            } finally {
                await adminPool.end().catch(() => {});
            }
        }

        // Seed initial doctor, patient, and helper if users table is empty
        await seedInitialData();
        console.log("PostgreSQL schema and initial records verified.");
    } catch (err) {
        console.warn("Database initialization notice:", err.message);
    }
}

async function seedInitialData() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const userCount = await client.query("SELECT COUNT(*) FROM users");
        if (parseInt(userCount.rows[0].count, 10) === 0) {
            console.log("Seeding initial PostgreSQL records...");

            const defaultDoctorHash = await bcrypt.hash(process.env.DOCTOR_PASSWORD || "1234", 10);
            const defaultPatientHash = await bcrypt.hash(process.env.PATIENT_DEMO_PASSWORD || "1234", 10);

            // 1. Doctor user
            await client.query(
                `INSERT INTO users (user_id, full_name, phone, password_hash, role)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id) DO NOTHING`,
                ["USR_DOC_01", "Dr. Sharma", "+919876543200", defaultDoctorHash, "doctor"]
            );

            await client.query(
                `INSERT INTO doctors (user_id, doctor_id, full_name, phone)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (doctor_id) DO NOTHING`,
                ["USR_DOC_01", "doctor", "Dr. Sharma", "+919876543200"]
            );

            // 2. Patient user & record
            await client.query(
                `INSERT INTO users (user_id, full_name, phone, password_hash, role)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id) DO NOTHING`,
                ["USR_PAT_1001", "Rahul Kumar", "+919876543210", defaultPatientHash, "patient"]
            );

            await client.query(
                `INSERT INTO patients (user_id, patient_id, full_name, date_of_birth, gender, blood_group, phone, email, address)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (patient_id) DO NOTHING`,
                [
                    "USR_PAT_1001",
                    "PAT1001",
                    "Rahul Kumar",
                    "21",
                    "Male",
                    "O+",
                    "+919876543210",
                    "rahul@example.com",
                    "Kurnool, Andhra Pradesh"
                ]
            );

            await client.query(
                `INSERT INTO guardians (patient_id, guardian_name, guardian_phone, relationship)
                 VALUES ($1, $2, $3, $4)`,
                ["PAT1001", "Suresh Kumar", "+919876543211", "Father"]
            );

            await client.query(
                `INSERT INTO medical_records (patient_id, medical_history, notes)
                 VALUES ($1, $2, $3)`,
                ["PAT1001", "No major medical history", "Regular blood pressure checkups"]
            );

            // 3. Helper user & profile
            await client.query(
                `INSERT INTO users (user_id, full_name, phone, role)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id) DO NOTHING`,
                ["USR_HELP_01", "Healthcare Emergency Helper", "+919876543299", "helper"]
            );

            await client.query(
                `INSERT INTO helpers (user_id, helper_id, full_name, phone)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (helper_id) DO NOTHING`,
                ["USR_HELP_01", "helper", "Healthcare Emergency Helper", "+919876543299"]
            );
        }

        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        console.warn("Seeding transaction warning:", err.message);
    } finally {
        client.release();
    }
}

/* ================= QUERY HELPERS ================= */

// Health check query
async function testDbConnection() {
    const res = await pool.query(
        "SELECT NOW() AS now, version() AS version, current_database() AS database"
    );
    return res.rows[0];
}

// Fetch complete patient details for patient portal
async function getPatientDetails(patientId) {
    const patientRes = await pool.query(
        `SELECT p.id, p.user_id, p.patient_id, p.full_name, p.date_of_birth,
                p.gender, p.blood_group, p.phone, p.email, p.address,
                p.created_at, p.updated_at,
                g.guardian_name, g.guardian_phone, g.relationship,
                m.medical_history, m.notes
         FROM patients p
         LEFT JOIN guardians g ON g.patient_id = p.patient_id
         LEFT JOIN medical_records m ON m.patient_id = p.patient_id
         WHERE UPPER(p.patient_id) = UPPER($1)`,
        [patientId]
    );

    if (patientRes.rows.length === 0) {
        return null;
    }

    const row = patientRes.rows[0];

    // Fetch medical documents metadata
    const docsRes = await pool.query(
        `SELECT id, original_filename, file_type, file_size, storage_reference, uploaded_by, created_at
         FROM medical_documents
         WHERE patient_id = $1
         ORDER BY created_at DESC`,
        [row.patient_id]
    );

    return {
        id: row.patient_id,
        patientId: row.patient_id,
        name: row.full_name,
        age: row.date_of_birth,
        gender: row.gender,
        blood: row.blood_group,
        bloodGroup: row.blood_group,
        phone: row.phone,
        email: row.email,
        address: row.address,
        notes: row.notes || "",
        medicalHistory: row.medical_history || "",
        guardianName: row.guardian_name || "",
        guardianPhone: row.guardian_phone || "",
        guardianRelationship: row.relationship || "",
        documents: docsRes.rows
    };
}

// Find patient by mobile phone (for OTP verification)
async function findOrCreatePatientByPhone(phone) {
    const existing = await pool.query(
        `SELECT patient_id FROM patients WHERE phone = $1`,
        [phone]
    );

    if (existing.rows.length > 0) {
        return getPatientDetails(existing.rows[0].patient_id);
    }

    // Create new patient record
    const countRes = await pool.query("SELECT COUNT(*) FROM patients");
    const newId = "PAT" + (1000 + parseInt(countRes.rows[0].count, 10) + 1);
    const userId = "USR_" + newId;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(
            `INSERT INTO users (user_id, full_name, phone, role)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId, "New Patient", phone, "patient"]
        );

        await client.query(
            `INSERT INTO patients (user_id, patient_id, full_name, phone, gender)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, newId, "New Patient", phone, "Other"]
        );

        await client.query(
            `INSERT INTO guardians (patient_id, guardian_name, guardian_phone, relationship)
             VALUES ($1, $2, $3, $4)`,
            [newId, "", "", ""]
        );

        await client.query(
            `INSERT INTO medical_records (patient_id, medical_history, notes)
             VALUES ($1, $2, $3)`,
            [newId, "", ""]
        );

        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }

    return getPatientDetails(newId);
}

// Update patient details
async function updatePatientDetails(patientId, fields) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(
            `UPDATE patients
             SET full_name = COALESCE($1, full_name),
                 date_of_birth = COALESCE($2, date_of_birth),
                 gender = COALESCE($3, gender),
                 blood_group = COALESCE($4, blood_group),
                 email = COALESCE($5, email),
                 address = COALESCE($6, address),
                 updated_at = NOW()
             WHERE UPPER(patient_id) = UPPER($7)`,
            [
                fields.name !== undefined ? fields.name : null,
                fields.age !== undefined ? String(fields.age) : null,
                fields.gender !== undefined ? fields.gender : null,
                fields.blood !== undefined ? fields.blood : null,
                fields.email !== undefined ? fields.email : null,
                fields.address !== undefined ? fields.address : null,
                patientId
            ]
        );

        if (fields.notes !== undefined || fields.medicalHistory !== undefined) {
            await client.query(
                `INSERT INTO medical_records (patient_id, medical_history, notes, updated_at)
                 VALUES ($1, COALESCE($2, ''), COALESCE($3, ''), NOW())
                 ON CONFLICT (patient_id)
                 DO UPDATE SET
                     medical_history = COALESCE(EXCLUDED.medical_history, medical_records.medical_history),
                     notes = COALESCE(EXCLUDED.notes, medical_records.notes),
                     updated_at = NOW()`,
                [patientId, fields.medicalHistory || null, fields.notes || null]
            );
        }

        if (fields.guardianName !== undefined || fields.guardianPhone !== undefined) {
            await client.query(
                `INSERT INTO guardians (patient_id, guardian_name, guardian_phone, relationship, updated_at)
                 VALUES ($1, COALESCE($2, ''), COALESCE($3, ''), COALESCE($4, ''), NOW())
                 ON CONFLICT (patient_id)
                 DO UPDATE SET
                     guardian_name = COALESCE(EXCLUDED.guardian_name, guardians.guardian_name),
                     guardian_phone = COALESCE(EXCLUDED.guardian_phone, guardians.guardian_phone),
                     relationship = COALESCE(EXCLUDED.relationship, guardians.relationship),
                     updated_at = NOW()`,
                [patientId, fields.guardianName || null, fields.guardianPhone || null, fields.guardianRelationship || null]
            );
        }

        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }

    return getPatientDetails(patientId);
}

// Doctor password verification from PostgreSQL users table
async function verifyDoctorUser(username, plainPassword) {
    const res = await pool.query(
        `SELECT u.user_id, u.password_hash, d.doctor_id, d.full_name
         FROM users u
         JOIN doctors d ON d.user_id = u.user_id
         WHERE (d.doctor_id = $1 OR u.user_id = $1) AND u.role = 'doctor'`,
        [username]
    );

    if (res.rows.length === 0) {
        return null;
    }

    const doctor = res.rows[0];
    const match = await bcrypt.compare(plainPassword, doctor.password_hash);
    if (!match) {
        return null;
    }

    return {
        doctorId: doctor.doctor_id,
        name: doctor.full_name,
        role: "doctor"
    };
}

// Patient password login verification from PostgreSQL
async function verifyPatientUser(patientId, plainPassword) {
    const res = await pool.query(
        `SELECT u.user_id, u.password_hash, p.patient_id, p.phone, p.full_name
         FROM patients p
         JOIN users u ON u.user_id = p.user_id
         WHERE UPPER(p.patient_id) = UPPER($1) AND u.role = 'patient'`,
        [patientId]
    );

    if (res.rows.length === 0) {
        return null;
    }

    const patient = res.rows[0];
    const match = await bcrypt.compare(plainPassword, patient.password_hash);
    if (!match) {
        return null;
    }

    return {
        patientId: patient.patient_id,
        phone: patient.phone,
        name: patient.full_name,
        role: "patient"
    };
}

// Record an audit log event
async function insertAuditLog(userId, action, targetUserId, metadata) {
    const res = await pool.query(
        `INSERT INTO audit_logs (user_id, action, target_user_id, metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING id, created_at`,
        [userId || "anonymous", action, targetUserId || null, metadata ? JSON.stringify(metadata) : null]
    );
    return res.rows[0];
}

// Get recent audit logs
async function getRecentAuditLogs(limit = 25) {
    const res = await pool.query(
        `SELECT id, user_id AS "sessionId", action, target_user_id AS "matchedPatientId",
                created_at AS timestamp, metadata
         FROM audit_logs
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
    );

    return res.rows.map(r => ({
        id: "LOG-" + r.id,
        sessionId: r.sessionId,
        status: (r.metadata && r.metadata.status) ? r.metadata.status : r.action,
        matchedPatientId: r.matchedPatientId,
        timestamp: r.timestamp,
        message: (r.metadata && r.metadata.message) ? r.metadata.message : r.action
    }));
}

// Register new patient directly in PostgreSQL
async function registerPatient({ fullName, phone, password, age, gender, bloodGroup, email, address, guardianName, guardianPhone }) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const countRes = await client.query("SELECT COUNT(*) FROM patients");
        const nextNum = 1000 + parseInt(countRes.rows[0].count, 10) + 1;
        const newPatientId = "PAT" + nextNum;
        const newUserId = "USR_" + newPatientId;

        const passwordHash = await bcrypt.hash(password || "1234", 10);

        await client.query(
            `INSERT INTO users (user_id, full_name, phone, password_hash, role)
             VALUES ($1, $2, $3, $4, $5)`,
            [newUserId, fullName || "Patient", phone || null, passwordHash, "patient"]
        );

        await client.query(
            `INSERT INTO patients (user_id, patient_id, full_name, date_of_birth, gender, blood_group, phone, email, address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                newUserId,
                newPatientId,
                fullName || "Patient",
                age ? String(age) : "",
                gender || "Other",
                bloodGroup || "",
                phone || "",
                email || "",
                address || ""
            ]
        );

        await client.query(
            `INSERT INTO guardians (patient_id, guardian_name, guardian_phone, relationship)
             VALUES ($1, $2, $3, $4)`,
            [newPatientId, guardianName || "", guardianPhone || "", ""]
        );

        await client.query(
            `INSERT INTO medical_records (patient_id, medical_history, notes)
             VALUES ($1, $2, $3)`,
            [newPatientId, "", ""]
        );

        await client.query("COMMIT");

        return {
            patientId: newPatientId,
            fullName,
            phone
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    initializeDatabase,
    testDbConnection,
    getPatientDetails,
    findOrCreatePatientByPhone,
    updatePatientDetails,
    registerPatient,
    verifyDoctorUser,
    verifyPatientUser,
    insertAuditLog,
    getRecentAuditLogs
};
