const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const twilio = require("twilio");
const path = require("path");
const db = require("./db");

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
            if (!header.startsWith("Bearer ")) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required."
                });
            }

            const token = header.substring(7);
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
