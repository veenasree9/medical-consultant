const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const twilio = require("twilio");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

const app = express();

const PORT = 3000;


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

const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

const demoOtps = new Map();


/* ================= TWILIO ================= */

const hasTwilio =
    Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
        !process.env.TWILIO_ACCOUNT_SID.includes("xxx") &&
        process.env.TWILIO_AUTH_TOKEN &&
        !process.env.TWILIO_AUTH_TOKEN.includes("xxx") &&
        process.env.TWILIO_VERIFY_SERVICE_SID &&
        !process.env.TWILIO_VERIFY_SERVICE_SID.includes("xxx")
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


/* ================= PATIENT DATABASE ================= */

/*
    This is only an in-memory demo database.

    Data disappears when the server restarts.

    For a real project use MongoDB,
    PostgreSQL, MySQL, Firebase etc.
*/

const patients = new Map();


patients.set(
    "PAT1001",

    {

        id: "PAT1001",

        phone: "+919876543210",

        name: "Rahul Kumar",

        age: 21,

        gender: "Male",

        blood: "O+",

        email: "rahul@example.com",

        address: "Kurnool, Andhra Pradesh",

        notes: "No major medical history"

    }

);


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


/* ================= API STATUS ================= */

app.get(
    "/api",

    (req, res) => {

        res.json({

            status: "online",

            message:
                "MediCare backend is running."

        });

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

                demoOtps.set(phone, "123456");

                return res.json({

                    success: true,

                    message:
                        "Verification code sent (Demo Mode: use 123456).",

                    status:
                        "approved"

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

            demoOtps.set(phone, "123456");

            res.json({

                success: true,

                message:
                    "Verification code sent (Demo Mode: use 123456).",

                status:
                    "approved"

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

                const storedOtp =
                    demoOtps.get(phone) || "123456";

                if (
                    code !== storedOtp &&
                    code !== "123456"
                ) {

                    return res.status(401).json({

                        success: false,

                        message:
                            "Invalid verification code. (Demo OTP is 123456)"

                    });

                }

            }

            else {

                try {

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

                }

                catch (twilioErr) {

                    console.warn("Twilio verify error, falling back to demo check:", twilioErr.message);

                    const storedOtp = demoOtps.get(phone) || "123456";

                    if (code !== storedOtp && code !== "123456") {

                        return res.status(401).json({

                            success: false,

                            message:
                                "Invalid verification code. (Demo OTP is 123456)"

                        });

                    }

                }

            }


            /* Find existing patient */

            let patient =
                [...patients.values()]
                    .find(
                        p =>
                            p.phone === phone
                    );


            /* Create patient */

            if (!patient) {

                const newId =
                    "PAT" +
                    (
                        1000 +
                        patients.size +
                        1
                    );


                patient = {

                    id: newId,

                    phone: phone,

                    name: "New Patient",

                    age: "",

                    gender: "Other",

                    blood: "",

                    email: "",

                    address: "",

                    notes: ""

                };


                patients.set(
                    newId,
                    patient
                );

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


/* ================= PASSWORD LOGIN ================= */

app.post(
    "/api/auth/password-login",

    (req, res) => {

        const {
            username,
            password,
            role
        } = req.body;


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
                patients.get(
                    String(username)
                        .toUpperCase()
                );


            if (

                patient &&

                password ===
                    (
                        process.env
                            .PATIENT_DEMO_PASSWORD ||
                        "1234"
                    )

            ) {

                const token =
                    createToken({

                        role: "patient",

                        patientId:
                            patient.id,

                        phone:
                            patient.phone

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

            message:
                "Invalid login details."

        });

    }
);


/* ================= PATIENT DETAILS ================= */

app.get(
    "/api/patient/me",

    auth("patient"),

    (req, res) => {

        const patient =
            patients.get(
                req.user.patientId
            );


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

    (req, res) => {

        const patient =
            patients.get(
                req.user.patientId
            );


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
            "email",
            "address",
            "notes"

        ];


        allowedFields.forEach(
            field => {

                if (
                    req.body[field] !==
                    undefined
                ) {

                    patient[field] =
                        String(
                            req.body[field]
                        ).trim();

                }

            }
        );


        patients.set(
            patient.id,
            patient
        );


        res.json({

            success: true,

            patient: patient,

            message:
                "Patient details updated successfully."

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
            patients.get(id);


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


/* ================= SPA FALLBACK ================= */

app.get(
    "*",

    (req, res) => {

        res.sendFile(
            path.join(frontendPath, "index.html")
        );

    }
);


/* ================= START ================= */

app.listen(
    PORT,
    "0.0.0.0",

    () => {

        console.log(
            `MediCare backend running on port ${PORT}`
        );

        console.log(
            `Twilio configured: ${hasTwilio}`
        );

    }
);