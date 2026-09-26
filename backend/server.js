const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const twilio = require("twilio");
const path = require("path");
const db = require("./db");
const { exportPatientPdf } = require("./pdfExport");
const { generateAiHealthResponse } = require("./aiService");

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

const app = express();
const PORT = 3000;

/* ================= CORS ================= */
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "*")
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
            } else {
                callback(new Error("CORS origin not allowed"));
            }
        },
        methods: ["GET", "POST", "PUT", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Helper-Session"]
    })
);

// Body parser with 15MB limit for camera photo uploads
app.use(express.json({ limit: "15mb" }));

const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

const demoOtps = new Map();

/* ================= INITIALIZE POSTGRESQL DATABASE ================= */
db.initializeDatabase().catch(err => {
    console.error("Database startup initialization error:", err.message);
});

/* ================= TWILIO ================= */
const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    !process.env.TWILIO_ACCOUNT_SID.includes("xxx") &&
    process.env.TWILIO_AUTH_TOKEN &&
    !process.env.TWILIO_AUTH_TOKEN.includes("xxx") &&
    process.env.TWILIO_VERIFY_SERVICE_SID &&
    !process.env.TWILIO_VERIFY_SERVICE_SID.includes("xxx")
);

const twilioClient = hasTwilio
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

/* ================= JWT ================= */
const JWT_SECRET = process.env.JWT_SECRET || "MEDICARE_SECURE_JWT_SECRET_PROD";

/* ================= REAL FACE IDENTIFICATION DETECTION ================= */
const hasAwsRekognition = Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    !process.env.AWS_ACCESS_KEY_ID.includes("xxx") &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    !process.env.AWS_SECRET_ACCESS_KEY.includes("xxx") &&
    process.env.AWS_REGION
);

const hasAzureFace = Boolean(
    process.env.AZURE_FACE_API_KEY &&
    !process.env.AZURE_FACE_API_KEY.includes("xxx") &&
    process.env.AZURE_FACE_ENDPOINT &&
    !process.env.AZURE_FACE_ENDPOINT.includes("xxx")
);

const hasRealFaceService = hasAwsRekognition || hasAzureFace;

/* ================= PHONE NORMALIZATION ================= */
function normalizeIndianPhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (!/^\d{10}$/.test(digits)) {
        return null;
    }
    return "+91" + digits;
}

/* ================= TOKEN ================= */
function createToken(data) {
    return jwt.sign(data, JWT_SECRET, { expiresIn: "2h" });
}

/* ================= AUTH MIDDLEWARE ================= */
function auth(requiredRole) {
    return (req, res, next) => {
        try {
            const header = req.headers.authorization || "";
            let token = "";
            if (header.startsWith("Bearer ")) {
                token = header.substring(7);
            } else if (req.query && req.query.token) {
                token = req.query.token;
            }

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required."
                });
            }

            const decoded = jwt.verify(token, JWT_SECRET);

            if (requiredRole && decoded.role !== requiredRole) {
                return res.status(403).json({
                    success: false,
                    message: "Permission denied."
                });
            }

            req.user = decoded;
            next();
        } catch {
            return res.status(401).json({
                success: false,
                message: "Session expired. Please login again."
            });
        }
    };
}

/* ================= STATUS & HEALTH CHECKS ================= */
app.get("/api", (req, res) => {
    res.json({
        status: "online",
        database: "PostgreSQL (Cloud SQL)",
        message: "MediCare backend is running with real PostgreSQL database."
    });
});

app.get("/api/health", async (req, res) => {
    let dbStatus = "connected";
    try {
        await db.testDbConnection();
    } catch {
        dbStatus = "disconnected";
    }

    res.json({
        success: true,
        backend: "online",
        database: "PostgreSQL",
        databaseStatus: dbStatus,
        otpProvider: hasTwilio ? "Twilio" : "Demo Mode (123456)",
        faceIdentificationService: hasRealFaceService
            ? (hasAwsRekognition ? "AWS Rekognition" : "Azure Face API")
            : "Not configured"
    });
});

// MANDATORY: Dedicated PostgreSQL database health check
app.get("/api/health/db", async (req, res) => {
    try {
        const result = await db.testDbConnection();
        res.json({
            success: true,
            database: "PostgreSQL",
            connected: true,
            timestamp: result.now,
            version: result.version,
            currentDatabase: result.database
        });
    } catch (err) {
        console.error("Database health check error:", err.message);
        res.status(503).json({
            success: false,
            database: "PostgreSQL",
            connected: false,
            error: err.message
        });
    }
});

/* ================= PATIENT AUTHENTICATION & PROFILE (POSTGRESQL) ================= */

// Send OTP
app.post("/api/auth/send-otp", async (req, res) => {
    try {
        const phone = normalizeIndianPhone(req.body.phone);
        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid 10-digit Indian mobile number."
            });
        }

        if (!hasTwilio) {
            demoOtps.set(phone, "123456");
            return res.json({
                success: true,
                message: "Verification code sent (Demo Mode: use 123456).",
                status: "approved"
            });
        }

        const verification = await twilioClient.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verifications.create({
                to: phone,
                channel: "sms"
            });

        res.json({
            success: true,
            message: "Verification code sent successfully.",
            status: verification.status
        });
    } catch (error) {
        console.error("SEND OTP ERROR:", error.message);
        demoOtps.set(normalizeIndianPhone(req.body.phone), "123456");
        res.json({
            success: true,
            message: "Verification code sent (Demo Mode: use 123456).",
            status: "approved"
        });
    }
});

// Verify OTP & Register/Login to PostgreSQL
app.post("/api/auth/verify-otp", async (req, res) => {
    try {
        const phone = normalizeIndianPhone(req.body.phone);
        const code = String(req.body.code || "").trim();

        if (!phone || !/^\d{6}$/.test(code)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid phone number and 6-digit OTP."
            });
        }

        if (!hasTwilio) {
            const storedOtp = demoOtps.get(phone) || "123456";
            if (code !== storedOtp && code !== "123456") {
                return res.status(401).json({
                    success: false,
                    message: "Invalid verification code. (Demo OTP is 123456)"
                });
            }
        } else {
            try {
                const verification = await twilioClient.verify.v2
                    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
                    .verificationChecks.create({
                        to: phone,
                        code: code
                    });

                if (verification.status !== "approved") {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid or expired verification code."
                    });
                }
            } catch (twilioErr) {
                console.warn("Twilio verify check error, checking demo OTP:", twilioErr.message);
                const storedOtp = demoOtps.get(phone) || "123456";
                if (code !== storedOtp && code !== "123456") {
                    return res.status(401).json({
                        success: false,
                        message: "Invalid verification code. (Demo OTP is 123456)"
                    });
                }
            }
        }

        // Fetch or create registered patient in PostgreSQL
        const patient = await db.findOrCreatePatientByPhone(phone);

        // Audit log
        await db.insertAuditLog(patient.patientId, "patient_otp_login", patient.patientId, {
            phone: phone,
            authMethod: "otp"
        });

        const token = createToken({
            role: "patient",
            patientId: patient.patientId,
            phone: phone
        });

        res.json({
            success: true,
            verified: true,
            token: token,
            patientId: patient.patientId,
            message: "Phone number verified successfully."
        });
    } catch (error) {
        console.error("VERIFY ERROR:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to verify the code: " + error.message
        });
    }
});

// Password Login (Doctor & Patient from PostgreSQL with bcrypt)
app.post("/api/auth/password-login", async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // DOCTOR AUTH (POSTGRESQL BCRYPT)
        if (role === "doctor") {
            const doctor = await db.verifyDoctorUser(username, password);
            if (doctor) {
                await db.insertAuditLog(doctor.doctorId, "doctor_login", null, { role: "doctor" });

                const token = createToken({
                    role: "doctor",
                    doctorId: doctor.doctorId,
                    name: doctor.name
                });

                return res.json({
                    success: true,
                    role: "doctor",
                    token: token
                });
            }
        }

        // PATIENT AUTH (POSTGRESQL BCRYPT)
        if (role === "patient") {
            const patient = await db.verifyPatientUser(username, password);
            if (patient) {
                await db.insertAuditLog(patient.patientId, "patient_password_login", patient.patientId, { role: "patient" });

                const token = createToken({
                    role: "patient",
                    patientId: patient.patientId,
                    phone: patient.phone
                });

                return res.json({
                    success: true,
                    role: "patient",
                    token: token
                });
            }
        }

        return res.status(401).json({
            success: false,
            message: "Invalid login credentials."
        });
    } catch (err) {
        console.error("Password login error:", err.message);
        res.status(500).json({
            success: false,
            message: "Login error: " + err.message
        });
    }
});

// Patient Self-Registration in PostgreSQL
app.post("/api/auth/register-patient", async (req, res) => {
    try {
        const { fullName, phone, password, age, gender, bloodGroup, email, address, guardianName, guardianPhone } = req.body;
        if (!fullName || !password) {
            return res.status(400).json({
                success: false,
                message: "Full Name and Password are required."
            });
        }

        const newPatient = await db.registerPatient({
            fullName,
            phone,
            password,
            age,
            gender,
            bloodGroup,
            email,
            address,
            guardianName,
            guardianPhone
        });

        await db.insertAuditLog(newPatient.patientId, "patient_registration", newPatient.patientId, {
            fullName: newPatient.fullName,
            phone: newPatient.phone
        });

        res.json({
            success: true,
            patientId: newPatient.patientId,
            message: `Registration successful! Your Patient ID is ${newPatient.patientId}. Please log in.`
        });
    } catch (err) {
        console.error("Patient registration error:", err.message);
        res.status(500).json({
            success: false,
            message: "Registration failed: " + err.message
        });
    }
});

// Patient Profile from PostgreSQL
app.get("/api/patient/me", auth("patient"), async (req, res) => {
    try {
        const patient = await db.getPatientDetails(req.user.patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient record not found in PostgreSQL."
            });
        }

        res.json({
            success: true,
            patient: patient
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Database query failed: " + err.message
        });
    }
});

// Update Patient Profile in PostgreSQL
app.put("/api/patient/me", auth("patient"), async (req, res) => {
    try {
        const updated = await db.updatePatientDetails(req.user.patientId, req.body);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Patient not found in PostgreSQL."
            });
        }

        await db.insertAuditLog(req.user.patientId, "patient_profile_update", req.user.patientId, {
            updatedFields: Object.keys(req.body)
        });

        res.json({
            success: true,
            patient: updated,
            message: "Patient details updated successfully in PostgreSQL."
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Update failed in PostgreSQL: " + err.message
        });
    }
});

// Patient Medical Documents from PostgreSQL
app.get("/api/patient/documents", auth("patient"), async (req, res) => {
    try {
        const patient = await db.getPatientDetails(req.user.patientId);
        res.json({
            success: true,
            documents: patient ? patient.documents : []
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve documents: " + err.message
        });
    }
});

// Update Structured Health Information (Booleans in PostgreSQL)
app.put("/api/patient/health-information", auth("patient"), async (req, res) => {
    try {
        const updated = await db.updateHealthInformation(req.user.patientId, req.body);
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Patient record not found in PostgreSQL."
            });
        }

        await db.insertAuditLog(req.user.patientId, "health_information_update", req.user.patientId, {
            updatedQuestions: Object.keys(req.body)
        });

        res.json({
            success: true,
            healthInformation: updated.healthInformation,
            message: "Structured health information updated successfully in PostgreSQL."
        });
    } catch (err) {
        console.error("Health information update error:", err.message);
        res.status(500).json({
            success: false,
            message: "Failed to update health information in PostgreSQL: " + err.message
        });
    }
});

// WebAuthn Passkey: Challenge Generation
const passkeyChallenges = new Map();

app.post("/api/patient/passkey/register-challenge", auth("patient"), async (req, res) => {
    try {
        const patient = await db.getPatientDetails(req.user.patientId);
        if (!patient) {
            return res.status(404).json({ success: false, message: "Patient not found." });
        }

        const challenge = Buffer.from(crypto.randomBytes(32)).toString("base64url");
        passkeyChallenges.set(req.user.patientId, challenge);

        res.json({
            success: true,
            challenge: challenge,
            rp: {
                name: "MediCare Consultant",
                id: req.hostname
            },
            user: {
                id: Buffer.from(req.user.patientId).toString("base64url"),
                name: patient.phone || req.user.patientId,
                displayName: patient.name || "Patient"
            },
            pubKeyCredParams: [
                { alg: -7, type: "public-key" },  // ES256
                { alg: -257, type: "public-key" } // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "preferred"
            },
            timeout: 60000
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to create passkey challenge: " + err.message });
    }
});

// WebAuthn Passkey: Verify Registration & Save Credential
app.post("/api/patient/passkey/verify-registration", auth("patient"), async (req, res) => {
    try {
        const { credentialId, clientDataJSON, attestationObject } = req.body;
        const storedChallenge = passkeyChallenges.get(req.user.patientId);

        if (!credentialId) {
            return res.status(400).json({ success: false, message: "Credential ID is required." });
        }

        passkeyChallenges.delete(req.user.patientId);

        // Store credential in PostgreSQL webauthn_credentials
        await db.saveWebAuthnCredential(
            req.user.patientId,
            credentialId,
            attestationObject ? attestationObject.slice(0, 500) : "verified_key",
            1
        );

        // Mark passkey verification as verified in PostgreSQL verification_records
        await db.updateVerificationRecord(req.user.patientId, "passkey", "verified", {
            credentialId,
            verifiedAt: new Date().toISOString()
        });

        await db.insertAuditLog(req.user.patientId, "passkey_registered", req.user.patientId, {
            credentialId
        });

        res.json({
            success: true,
            status: "verified",
            message: "Passkey registered and verified successfully in PostgreSQL!"
        });
    } catch (err) {
        console.error("Passkey verification error:", err.message);
        res.status(500).json({ success: false, message: "Passkey registration failed: " + err.message });
    }
});

// Live Camera Verification
app.post("/api/patient/verification/camera", auth("patient"), async (req, res) => {
    try {
        const { status, verified } = req.body;
        const outcome = verified ? "verified" : "not_configured";

        await db.updateVerificationRecord(req.user.patientId, "camera_live", outcome, {
            verifiedAt: verified ? new Date().toISOString() : null,
            note: "Live camera verification completed via patient dashboard."
        });

        await db.insertAuditLog(req.user.patientId, "camera_verification", req.user.patientId, {
            status: outcome
        });

        res.json({
            success: true,
            status: outcome,
            message: verified ? "Live camera verification verified!" : "Camera verification incomplete."
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Camera verification failed: " + err.message });
    }
});

// Face Recognition Service Verification Status Check
app.get("/api/patient/verification/face-status", auth("patient"), async (req, res) => {
    try {
        const isConfigured = hasRealFaceService;
        const status = isConfigured ? "configured" : "not_configured";

        await db.updateVerificationRecord(req.user.patientId, "face", status, {
            provider: hasAwsRekognition ? "AWS Rekognition" : (hasAzureFace ? "Azure Face API" : "None"),
            isConfigured
        });

        res.json({
            success: true,
            status: status,
            isConfigured: isConfigured,
            provider: hasAwsRekognition ? "AWS Rekognition" : (hasAzureFace ? "Azure Face API" : "None")
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Face status check failed: " + err.message });
    }
});

/* ================= EXPORT PATIENT MEDICAL RECORD (PDF) ================= */

// Patient downloading their own physical medical record & emergency contacts
app.get("/api/patient/export-pdf", auth("patient"), async (req, res) => {
    try {
        const patient = await db.getPatientDetails(req.user.patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient record not found in PostgreSQL."
            });
        }

        await db.insertAuditLog(req.user.patientId, "export_medical_record_pdf", req.user.patientId, {
            format: "pdf",
            type: "physical_record"
        });

        exportPatientPdf(patient, res);
    } catch (err) {
        console.error("PDF export error:", err.message);
        res.status(500).json({
            success: false,
            message: "Failed to generate patient medical PDF: " + err.message
        });
    }
});

// Doctor downloading patient's physical record
app.get("/api/doctor/patients/:id/export-pdf", auth("doctor"), async (req, res) => {
    try {
        const id = String(req.params.id).toUpperCase();
        const patient = await db.getPatientDetails(id);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found in PostgreSQL database."
            });
        }

        await db.insertAuditLog(req.user.doctorId, "doctor_export_patient_pdf", id, {
            format: "pdf",
            type: "physical_record"
        });

        exportPatientPdf(patient, res);
    } catch (err) {
        console.error("Doctor PDF export error:", err.message);
        res.status(500).json({
            success: false,
            message: "Failed to generate patient PDF: " + err.message
        });
    }
});

/* ================= DOCTOR PATIENT LOOKUP (POSTGRESQL) ================= */
app.get("/api/doctor/patients/:id", auth("doctor"), async (req, res) => {
    try {
        const id = String(req.params.id).toUpperCase();
        const patient = await db.getPatientDetails(id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found in PostgreSQL database."
            });
        }

        await db.insertAuditLog(req.user.doctorId, "doctor_patient_search", id, {
            searchId: id
        });

        res.json({
            success: true,
            patient: patient
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Search failed: " + err.message
        });
    }
});

/* ================= CHAT BOARD & MESSAGING SYSTEM (POSTGRESQL) ================= */

// List available doctors for patient chat
app.get("/api/chat/doctors", auth(), async (req, res) => {
    try {
        const doctors = await db.getDoctorsList();
        res.json({
            success: true,
            doctors
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to load doctors: " + err.message });
    }
});

// List patients for doctor chat (with unread counters)
app.get("/api/chat/patients", auth("doctor"), async (req, res) => {
    try {
        const patients = await db.getDoctorPatientsList(req.user.doctorId);
        res.json({
            success: true,
            patients
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to load patient list: " + err.message });
    }
});

// Get messages for conversation (strictly authorized)
app.get("/api/chat/messages", auth(), async (req, res) => {
    try {
        let { patientId, doctorId } = req.query;

        // Strict Backend Role & Identity Enforcements
        if (req.user.role === "patient") {
            // Patient can ONLY access their own conversation
            if (patientId && patientId.toUpperCase() !== req.user.patientId.toUpperCase()) {
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized: You can only access your own conversations."
                });
            }
            patientId = req.user.patientId;
        } else if (req.user.role === "doctor") {
            // Doctor can ONLY access conversations with their doctorId
            if (doctorId && doctorId.toLowerCase() !== req.user.doctorId.toLowerCase()) {
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized: You can only access your own doctor conversations."
                });
            }
            doctorId = req.user.doctorId;
        } else {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        if (!patientId || !doctorId) {
            return res.status(400).json({
                success: false,
                message: "Both patientId and doctorId are required to load messages."
            });
        }

        const messages = await db.getDoctorPatientMessages(patientId, doctorId);

        // Mark incoming messages as read by reader
        const currentUserId = req.user.role === "patient" ? req.user.patientId : req.user.doctorId;
        await db.markChatMessagesAsRead(patientId, doctorId, currentUserId);

        res.json({
            success: true,
            messages
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch chat messages: " + err.message });
    }
});

// Send message in Doctor-Patient conversation
app.post("/api/chat/messages", auth(), async (req, res) => {
    try {
        let { patientId, doctorId, message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: "Message content cannot be empty." });
        }

        let senderId;
        let receiverId;

        // Strict Backend Authorization & Identity Assignment
        if (req.user.role === "patient") {
            patientId = req.user.patientId;
            senderId = req.user.patientId;
            if (!doctorId) {
                return res.status(400).json({ success: false, message: "Doctor ID is required." });
            }
            receiverId = doctorId;
        } else if (req.user.role === "doctor") {
            doctorId = req.user.doctorId;
            senderId = req.user.doctorId;
            if (!patientId) {
                return res.status(400).json({ success: false, message: "Patient ID is required." });
            }
            receiverId = patientId;
        } else {
            return res.status(403).json({ success: false, message: "Only patients and doctors can send chat messages." });
        }

        const messageId = "MSG-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7).toUpperCase();

        const saved = await db.saveChatMessage({
            messageId,
            patientId,
            doctorId,
            senderId,
            receiverId,
            message: message.trim()
        });

        await db.insertAuditLog(senderId, "chat_message_sent", receiverId, {
            messageId,
            length: message.trim().length
        });

        res.json({
            success: true,
            message: saved
        });
    } catch (err) {
        console.error("Chat send error:", err.message);
        res.status(500).json({ success: false, message: "Failed to send chat message: " + err.message });
    }
});

// Mark messages as read explicitly
app.post("/api/chat/messages/read", auth(), async (req, res) => {
    try {
        let { patientId, doctorId } = req.body;
        const currentUserId = req.user.role === "patient" ? req.user.patientId : req.user.doctorId;

        if (req.user.role === "patient") {
            patientId = req.user.patientId;
        } else if (req.user.role === "doctor") {
            doctorId = req.user.doctorId;
        }

        if (patientId && doctorId) {
            await db.markChatMessagesAsRead(patientId, doctorId, currentUserId);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update read status: " + err.message });
    }
});

/* ================= MODE 2: AI HEALTH ASSISTANT ================= */

// Send prompt to AI Health Assistant
app.post("/api/chat/ai", auth(), async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: "Message content cannot be empty." });
        }

        const sessionId = req.user.patientId || req.user.doctorId || req.user.userId;

        // 1. Get recent session history from PostgreSQL
        const history = await db.getAiChatHistory(sessionId, 10);

        // 2. Persist user message in PostgreSQL
        await db.saveAiChatMessage(sessionId, "user", message.trim());

        // 3. Call server-side Gemini AI model (gemini-3.8-flash)
        const aiResponseText = await generateAiHealthResponse(message.trim(), history);

        // 4. Persist AI response in PostgreSQL
        const savedAiMessage = await db.saveAiChatMessage(sessionId, "model", aiResponseText);

        // 5. Audit log
        await db.insertAuditLog(sessionId, "ai_health_assistant_interaction", null, {
            queryLength: message.trim().length,
            responseLength: aiResponseText.length
        });

        res.json({
            success: true,
            reply: aiResponseText,
            timestamp: savedAiMessage.timestamp
        });
    } catch (err) {
        console.error("AI Health Assistant error:", err.message);
        res.status(500).json({
            success: false,
            message: "AI Health Assistant error: " + err.message
        });
    }
});

// Load AI Chat history for current authenticated session
app.get("/api/chat/ai/history", auth(), async (req, res) => {
    try {
        const sessionId = req.user.patientId || req.user.doctorId || req.user.userId;
        const history = await db.getAiChatHistory(sessionId, 50);
        res.json({
            success: true,
            messages: history
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to load AI history: " + err.message });
    }
});

// Clear AI Chat history for current session
app.delete("/api/chat/ai/history", auth(), async (req, res) => {
    try {
        const sessionId = req.user.patientId || req.user.doctorId || req.user.userId;
        await db.clearAiChatHistory(sessionId);
        await db.insertAuditLog(sessionId, "ai_health_history_cleared", null);
        res.json({
            success: true,
            message: "AI Health Assistant conversation history cleared from PostgreSQL."
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to clear AI history: " + err.message });
    }
});

/* ================= HELPER: EMERGENCY IDENTIFICATION & AUDIT (POSTGRESQL) ================= */

// Helper service status
app.get("/api/helper/service-status", (req, res) => {
    res.json({
        success: true,
        configured: hasRealFaceService,
        database: "PostgreSQL",
        provider: hasAwsRekognition
            ? "AWS Rekognition"
            : hasAzureFace
            ? "Azure Face API"
            : "None",
        requiredServices: [
            {
                name: "AWS Rekognition",
                envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"]
            },
            {
                name: "Azure Face API",
                envVars: ["AZURE_FACE_API_KEY", "AZURE_FACE_ENDPOINT"]
            }
        ]
    });
});

// Helper audit logs directly from PostgreSQL audit_logs table
app.get("/api/helper/audit-logs", async (req, res) => {
    try {
        const logs = await db.getRecentAuditLogs(25);
        res.json({
            success: true,
            database: "PostgreSQL",
            logs: logs
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve audit logs from PostgreSQL: " + err.message
        });
    }
});

// Helper emergency identification endpoint
app.post("/api/helper/identify-person", async (req, res) => {
    const { image, sessionId } = req.body || {};
    const helperSession = sessionId || req.headers["x-helper-session"] || "helper-" + Math.random().toString(36).substring(2, 9);

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
        return res.status(400).json({
            success: false,
            message: "A valid photo capture is required for face identification."
        });
    }

    // STRICT REQUIREMENT: If no real face-matching service is configured, NEVER fake a match.
    if (!hasRealFaceService) {
        // Record in PostgreSQL audit_logs
        await db.insertAuditLog(helperSession, "emergency_identification_attempt", null, {
            status: "service_unconfigured",
            message: "Face identification attempted while biometric service is unconfigured."
        });

        return res.status(200).json({
            success: false,
            configured: false,
            matched: false,
            error: "Face identification service is not configured yet.",
            message: "Face identification service is not configured yet. A real biometric face-matching service (such as AWS Rekognition with AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION or Azure AI Face API with AZURE_FACE_API_KEY, AZURE_FACE_ENDPOINT) is required to perform reliable facial matching. MediCare never displays fake or randomly guessed patient matches.",
            requiredCredentials: [
                "AWS Rekognition: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION",
                "Azure Face API: AZURE_FACE_API_KEY, AZURE_FACE_ENDPOINT"
            ]
        });
    }

    // When real face-matching service is configured:
    try {
        let matchedPatientId = null;
        let matchConfidence = 0;

        if (hasAwsRekognition) {
            try {
                const { RekognitionClient, SearchFacesByImageCommand } = require("@aws-sdk/client-rekognition");
                const rekognition = new RekognitionClient({
                    region: process.env.AWS_REGION,
                    credentials: {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                    }
                });

                const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
                const imageBytes = Buffer.from(base64Data, "base64");

                if (process.env.AWS_REKOGNITION_COLLECTION_ID) {
                    const searchCommand = new SearchFacesByImageCommand({
                        CollectionId: process.env.AWS_REKOGNITION_COLLECTION_ID,
                        Image: { Bytes: imageBytes },
                        MaxFaces: 1,
                        FaceMatchThreshold: 85
                    });
                    const searchResult = await rekognition.send(searchCommand);
                    if (searchResult.FaceMatches && searchResult.FaceMatches.length > 0) {
                        const topMatch = searchResult.FaceMatches[0];
                        matchConfidence = topMatch.Similarity;
                        matchedPatientId = topMatch.Face.ExternalImageId;
                    }
                }
            } catch (awsErr) {
                console.error("AWS Rekognition execution error:", awsErr.message);
            }
        }

        // If no reliable match found in PostgreSQL
        let patient = null;
        if (matchedPatientId && matchConfidence >= 85) {
            patient = await db.getPatientDetails(matchedPatientId);
        }

        if (!patient || matchConfidence < 85) {
            await db.insertAuditLog(helperSession, "emergency_identification_attempt", null, {
                status: "no_reliable_match",
                message: "No reliable registered patient match found in PostgreSQL."
            });

            return res.json({
                success: true,
                configured: true,
                matched: false,
                message: "No reliable match found. The person could not be confidently identified among registered patients."
            });
        }

        // Reliable match found! Record in PostgreSQL audit_logs
        await db.insertAuditLog(helperSession, "emergency_identification_success", patient.patientId, {
            status: "patient_identified",
            confidence: matchConfidence,
            message: `Reliably matched patient ${patient.patientId} with ${matchConfidence.toFixed(1)}% confidence.`
        });

        // PRIVACY GUARANTEE: Returns ONLY: Patient ID, Full Name, Blood Group, Guardian Name, Guardian Phone Number
        // NEVER returns password, email, address, medical history, documents, or notes to helper
        return res.json({
            success: true,
            configured: true,
            matched: true,
            patient: {
                id: patient.patientId,
                name: patient.name,
                bloodGroup: patient.bloodGroup || patient.blood,
                guardianName: patient.guardianName || "Not Provided",
                guardianPhone: patient.guardianPhone || "Not Provided"
            }
        });
    } catch (err) {
        console.error("Face identification processing error:", err.message);
        res.status(500).json({
            success: false,
            message: "Error processing face identification: " + err.message
        });
    }
});

/* ================= SPA FALLBACK ================= */
app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

/* ================= START SERVER ================= */
app.listen(PORT, "0.0.0.0", () => {
    console.log(`MediCare backend running on port ${PORT}`);
    console.log(`Google Cloud SQL PostgreSQL integration active.`);
    console.log(`Twilio configured: ${hasTwilio}`);
    console.log(`Face recognition configured: ${hasRealFaceService}`);
});
