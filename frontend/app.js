let selectedLogin = "patient";
let resendTimer = null;
let patientToken = localStorage.getItem("patientToken");


function $(id) {
    return document.getElementById(id);
}


/* ================= TOAST ================= */

function showToast(message) {

    const toast = $("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);
}


/* ================= HIDE ALL ================= */

function hideAll() {

    [
        "homePage",
        "loginPage",
        "patientDashboard",
        "doctorDashboard",
        "helperDashboard"
    ].forEach(id => {

        $(id).classList.add("hidden");

    });
}


/* ================= OPEN LOGIN ================= */

function openLogin(type) {

    // Helper uses emergency camera identification without username/password login
    if (type === "helper") {
        openHelperEmergency();
        return;
    }

    selectedLogin = type;

    hideAll();

    $("loginPage").classList.remove("hidden");

    $("loginMessage").textContent = "";

    $("username").value = "";
    $("password").value = "";
    $("password").type = "password";
    if ($("togglePasswordBtn")) {
        $("togglePasswordBtn").textContent = "👁️";
    }

    if (type === "doctor") {

        $("loginTitle").textContent =
            "Doctor Login";

        $("credentialLabel").textContent =
            "Doctor Username";

        $("username").placeholder =
            "Enter your Doctor Username";

        $("password").placeholder =
            "Enter your password";

        if ($("registerPrompt")) {
            $("registerPrompt").classList.add("hidden");
        }

    }

    else {

        $("loginTitle").textContent =
            "Patient Login";

        $("credentialLabel").textContent =
            "Patient ID";

        $("username").placeholder =
            "Enter your Patient ID";

        $("password").placeholder =
            "Enter your password";

        if ($("registerPrompt")) {
            $("registerPrompt").classList.remove("hidden");
        }

    }
}


/* ================= PASSWORD VISIBILITY TOGGLE ================= */

function togglePasswordVisibility() {
    const passwordInput = $("password");
    const toggleBtn = $("togglePasswordBtn");
    if (!passwordInput) return;

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        if (toggleBtn) {
            toggleBtn.textContent = "🙈";
            toggleBtn.setAttribute("aria-label", "Hide password");
        }
    } else {
        passwordInput.type = "password";
        if (toggleBtn) {
            toggleBtn.textContent = "👁️";
            toggleBtn.setAttribute("aria-label", "Show password");
        }
    }
}


/* ================= HOME ================= */

function goHome() {

    stopEmergencyCamera();

    hideAll();

    $("homePage").classList.remove("hidden");
}


/* ================= PHONE ================= */

function normalizeIndianPhone(value) {

    const digits =
        value.replace(/\D/g, "");

    if (!/^\d{10}$/.test(digits)) {

        return null;

    }

    return "+91" + digits;
}


/* ================= SEND OTP ================= */

async function sendOTP(isResend = false) {

    const phone =
        normalizeIndianPhone(
            $("phone").value
        );


    $("loginMessage").textContent = "";


    if (!phone) {

        $("loginMessage").textContent =
            "Enter a valid 10-digit Indian mobile number.";

        return;
    }


    const button =
        $("sendOtpBtn");

    button.disabled = true;

    button.textContent =
        "Sending...";


    try {

        const response =
            await fetch(
                `${API_URL}/api/auth/send-otp`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        phone: phone
                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok ||
            !data.success) {

            throw new Error(
                data.message ||
                "Unable to send verification code."
            );

        }


        $("otpSection")
            .classList
            .remove("hidden");


        $("otp").focus();


        $("loginMessage")
            .className =
            "success-message";


        $("loginMessage").textContent =
            "Verification code sent successfully.";


        startResendTimer();


        showToast(
            isResend
                ? "OTP resent."
                : "OTP sent."
        );

    }


    catch (error) {

        console.error(error);

        $("loginMessage")
            .className = "error";


        $("loginMessage").textContent =
            error.message;

    }


    finally {

        button.disabled = false;

        button.textContent =
            "Send Verification Code";
    }
}


/* ================= TIMER ================= */

function startResendTimer() {

    let seconds = 60;

    $("resendBtn").disabled = true;

    $("timer").textContent =
        "(60s)";


    clearInterval(resendTimer);


    resendTimer =
        setInterval(() => {

            seconds--;

            $("timer").textContent =
                `(${seconds}s)`;


            if (seconds <= 0) {

                clearInterval(
                    resendTimer
                );

                $("resendBtn").disabled =
                    false;

                $("timer").textContent =
                    "";

            }

        }, 1000);
}


/* ================= VERIFY OTP ================= */

async function verifyOTP() {

    const phone =
        normalizeIndianPhone(
            $("phone").value
        );


    const code =
        $("otp").value.trim();


    if (!phone) {

        $("loginMessage").textContent =
            "Enter a valid phone number.";

        return;
    }


    if (!/^\d{6}$/.test(code)) {

        $("loginMessage").textContent =
            "Enter the 6-digit OTP.";

        return;
    }


    $("verifyOtpBtn").disabled = true;

    $("verifyOtpBtn").textContent =
        "Verifying...";


    try {

        const response =
            await fetch(
                `${API_URL}/api/auth/verify-otp`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        phone: phone,
                        code: code
                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok ||
            !data.success) {

            throw new Error(
                data.message ||
                "Invalid verification code."
            );

        }


        patientToken =
            data.token;


        localStorage.setItem(
            "patientToken",
            patientToken
        );


        await loadPatientDashboard();


        showToast(
            "Phone verified successfully."
        );

    }


    catch (error) {

        console.error(error);

        $("loginMessage")
            .className = "error";

        $("loginMessage").textContent =
            error.message;

    }


    finally {

        $("verifyOtpBtn").disabled =
            false;

        $("verifyOtpBtn").textContent =
            "Verify Code";
    }
}


/* ================= PASSWORD LOGIN ================= */

async function passwordLogin() {

    const username =
        $("username").value.trim();

    const password =
        $("password").value;


    if (!username || !password) {

        $("loginMessage").textContent =
            "Enter your login details.";

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/auth/password-login`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        username,
                        password,
                        role: selectedLogin

                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok ||
            !data.success) {

            throw new Error(
                data.message ||
                "Login failed."
            );

        }


        if (data.role === "patient") {

            patientToken =
                data.token;

            localStorage.setItem(
                "patientToken",
                patientToken
            );

            await loadPatientDashboard();

        }


        else if (data.role === "doctor") {

            localStorage.setItem(
                "doctorToken",
                data.token
            );

            hideAll();

            $("doctorDashboard")
                .classList
                .remove("hidden");

        }

    }


    catch (error) {

        console.error(error);

        $("loginMessage").className =
            "error";

        $("loginMessage").textContent =
            error.message;

    }
}


/* ================= PATIENT DASHBOARD ================= */

let currentHealthInfo = {
    allergies: false,
    diabetes: false,
    hypertension: false,
    asthma: false,
    heart_condition: false,
    major_surgery: false,
    regular_medication: false,
    chronic_condition: false,
    drug_reaction: false,
    emergency_condition: false
};

async function loadPatientDashboard() {
    const response = await fetch(`${API_URL}/api/patient/me`, {
        headers: {
            Authorization: `Bearer ${patientToken}`
        }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        localStorage.removeItem("patientToken");
        patientToken = null;
        throw new Error(data.message || "Could not load patient details.");
    }

    const p = data.patient;

    $("patientName").textContent = p.name;
    $("patientHeaderName").textContent = p.name;
    $("patientId").textContent = p.id;
    if ($("pPatientId")) $("pPatientId").value = p.id;

    // Primary Details
    if ($("pName")) $("pName").value = p.name || "";
    if ($("pAge")) $("pAge").value = p.age || "";
    if ($("pGender")) $("pGender").value = p.gender || "Other";
    if ($("pBlood")) $("pBlood").value = p.bloodGroup || p.blood || "O+";
    if ($("pPhone")) $("pPhone").value = p.phone || "";
    if ($("pEmail")) $("pEmail").value = p.email || "";
    if ($("pAddress")) $("pAddress").value = p.address || "";

    // Primary Guardian (Editable fields)
    if ($("pGuardianName")) $("pGuardianName").value = p.guardianName || "";
    if ($("pGuardianPhone")) $("pGuardianPhone").value = p.guardianPhone || "";
    if ($("pGuardianRelationship")) $("pGuardianRelationship").value = p.guardianRelationship || "";

    // Medical Notes & History
    if ($("pMedicalHistory")) $("pMedicalHistory").value = p.medicalHistory || "";
    if ($("pNotes")) $("pNotes").value = p.notes || "";

    // Ensure inputs are initially disabled until "Update Details" is clicked
    [
        "pName", "pAge", "pGender", "pBlood", "pPhone", "pEmail", "pAddress",
        "pGuardianName", "pGuardianPhone", "pGuardianRelationship", "pMedicalHistory", "pNotes"
    ].forEach(id => {
        if ($(id)) $(id).disabled = true;
    });

    $("updateBtn").classList.remove("hidden");
    $("saveBtn").classList.add("hidden");
    $("cancelBtn").classList.add("hidden");

    // Secondary Guardian Details
    if ($("pGuardian2Name")) $("pGuardian2Name").value = p.guardian2Name || "";
    if ($("pGuardian2Phone")) $("pGuardian2Phone").value = p.guardian2Phone || "";
    if ($("pGuardian2Relationship")) $("pGuardian2Relationship").value = p.guardian2Relationship || "";

    // Structured Health Information
    if (p.healthInformation) {
        currentHealthInfo = {
            allergies: Boolean(p.healthInformation.allergies),
            diabetes: Boolean(p.healthInformation.diabetes),
            hypertension: Boolean(p.healthInformation.hypertension),
            asthma: Boolean(p.healthInformation.asthma),
            heart_condition: Boolean(p.healthInformation.heart_condition),
            major_surgery: Boolean(p.healthInformation.major_surgery),
            regular_medication: Boolean(p.healthInformation.regular_medication),
            chronic_condition: Boolean(p.healthInformation.chronic_condition),
            drug_reaction: Boolean(p.healthInformation.drug_reaction),
            emergency_condition: Boolean(p.healthInformation.emergency_condition)
        };
        updateHealthUI();
    }

    // Verification Badges (Strictly 'Not configured' unless real verification has occurred)
    if (p.verifications) {
        updateVerifBadge("verifFaceBadge", p.verifications.face);
        updateVerifBadge("verifPasskeyBadge", p.verifications.passkey);
        updateVerifBadge("verifCameraBadge", p.verifications.camera_live);
        updateVerifBadge("verifLivenessBadge", p.verifications.liveness);
    }

    hideAll();
    $("patientDashboard").classList.remove("hidden");
}

function updateVerifBadge(badgeId, status) {
    const badge = $(badgeId);
    if (!badge) return;
    if (status === "verified") {
        badge.className = "status-badge status-verified";
        badge.textContent = "Verified";
    } else if (status === "configured") {
        badge.className = "status-badge status-verified";
        badge.textContent = "Configured";
    } else if (status === "pending") {
        badge.className = "status-badge status-pending";
        badge.textContent = "Pending";
    } else {
        badge.className = "status-badge status-unconfigured";
        badge.textContent = "Not configured";
    }
}

/* ================= UPDATE PRIMARY DETAILS ================= */

function enableUpdate() {
    [
        "pName",
        "pAge",
        "pGender",
        "pBlood",
        "pPhone",
        "pEmail",
        "pAddress",
        "pGuardianName",
        "pGuardianPhone",
        "pGuardianRelationship",
        "pMedicalHistory",
        "pNotes"
    ].forEach(id => {
        if ($(id)) $(id).disabled = false;
    });

    $("updateBtn").classList.add("hidden");
    $("saveBtn").classList.remove("hidden");
    $("cancelBtn").classList.remove("hidden");
}

/* ================= SAVE PRIMARY DETAILS ================= */

async function saveDetails() {
    const bloodVal = $("pBlood").value;
    const details = {
        name: $("pName").value.trim(),
        age: $("pAge").value.trim(),
        gender: $("pGender").value,
        blood: bloodVal,
        bloodGroup: bloodVal,
        phone: $("pPhone").value.trim(),
        email: $("pEmail").value.trim(),
        address: $("pAddress").value.trim(),
        guardianName: $("pGuardianName").value.trim(),
        guardianPhone: $("pGuardianPhone").value.trim(),
        guardianRelationship: $("pGuardianRelationship").value.trim(),
        medicalHistory: $("pMedicalHistory") ? $("pMedicalHistory").value.trim() : "",
        notes: $("pNotes").value.trim()
    };

    try {
        const response = await fetch(`${API_URL}/api/patient/me`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify(details)
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Update failed.");
        }

        await loadPatientDashboard();
        showToast("Primary patient details saved to PostgreSQL.");
    } catch (error) {
        showToast(error.message);
    }
}

/* ================= CANCEL ================= */

function cancelUpdate() {
    loadPatientDashboard().catch(error => showToast(error.message));
}

/* ================= SECONDARY GUARDIAN SAVE ================= */

async function saveSecondaryGuardian() {
    const details = {
        guardian2Name: $("pGuardian2Name") ? $("pGuardian2Name").value.trim() : "",
        guardian2Phone: $("pGuardian2Phone") ? $("pGuardian2Phone").value.trim() : "",
        guardian2Relationship: $("pGuardian2Relationship") ? $("pGuardian2Relationship").value.trim() : ""
    };

    try {
        const response = await fetch(`${API_URL}/api/patient/me`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify(details)
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to save secondary guardian.");
        }

        showToast("Secondary Guardian details saved permanently in PostgreSQL!");
    } catch (err) {
        showToast(err.message);
    }
}

/* ================= HEALTH INFORMATION (STRUCTURED BOOLEANS) ================= */

function setHealthValue(questionKey, val) {
    currentHealthInfo[questionKey] = Boolean(val);
    updateHealthUI();
}

function updateHealthUI() {
    const questions = [
        "allergies", "diabetes", "hypertension", "asthma", "heart_condition",
        "major_surgery", "regular_medication", "chronic_condition", "drug_reaction", "emergency_condition"
    ];

    questions.forEach(q => {
        const group = document.querySelector(`.yn-group[data-q="${q}"]`);
        if (group) {
            const isYes = Boolean(currentHealthInfo[q]);
            const yesBtn = group.querySelector('.yn-btn[data-val="true"]');
            const noBtn = group.querySelector('.yn-btn[data-val="false"]');
            if (yesBtn && noBtn) {
                if (isYes) {
                    yesBtn.classList.add("active");
                    noBtn.classList.remove("active");
                } else {
                    noBtn.classList.add("active");
                    yesBtn.classList.remove("active");
                }
            }
        }
    });
}

async function saveHealthInformation() {
    const btn = $("saveHealthBtn");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Saving...";
    }

    try {
        const response = await fetch(`${API_URL}/api/patient/health-information`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify(currentHealthInfo)
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to save health information.");
        }

        showToast("Health Information answers saved to PostgreSQL!");
    } catch (err) {
        showToast(err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "💾 Save Health Information to PostgreSQL";
        }
    }
}

/* ================= IDENTITY & VERIFICATIONS ================= */

// 1. Face Verification Status Check
async function checkFaceVerification() {
    try {
        showToast("Checking face recognition service configuration...");
        const res = await fetch(`${API_URL}/api/patient/verification/face-status`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const data = await res.json();
        const badge = $("verifFaceBadge");

        if (data.isConfigured) {
            if (badge) {
                badge.className = "status-badge status-verified";
                badge.textContent = "Configured (" + data.provider + ")";
            }
            showToast("Face verification service is active with " + data.provider);
        } else {
            if (badge) {
                badge.className = "status-badge status-unconfigured";
                badge.textContent = "Not configured";
            }
            showToast("Face verification service is not configured yet (AWS Rekognition / Azure Face API keys not set in backend).");
        }
    } catch (err) {
        showToast("Failed to check face service: " + err.message);
    }
}

// 2. FIDO2 / WebAuthn Passkey Verification
async function setupPasskey() {
    if (!window.PublicKeyCredential) {
        showToast("Passkeys / WebAuthn are not supported on this browser.");
        return;
    }

    try {
        showToast("Requesting passkey registration challenge...");
        const chalRes = await fetch(`${API_URL}/api/patient/passkey/register-challenge`, {
            method: "POST",
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const chalData = await chalRes.json();
        if (!chalRes.ok || !chalData.success) {
            throw new Error(chalData.message || "Failed to initiate passkey challenge.");
        }

        const challengeBuffer = Uint8Array.from(atob(chalData.challenge.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
        const userIdBuffer = new TextEncoder().encode(chalData.user.id);

        const createOptions = {
            publicKey: {
                challenge: challengeBuffer,
                rp: {
                    name: chalData.rp.name,
                    id: window.location.hostname
                },
                user: {
                    id: userIdBuffer,
                    name: chalData.user.name,
                    displayName: chalData.user.displayName
                },
                pubKeyCredParams: chalData.pubKeyCredParams,
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "preferred"
                },
                timeout: 60000
            }
        };

        const credential = await navigator.credentials.create(createOptions);
        if (!credential) {
            throw new Error("Passkey creation was canceled.");
        }

        const rawIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

        const verifyRes = await fetch(`${API_URL}/api/patient/passkey/verify-registration`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify({ credentialId: rawIdBase64 })
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData.message || "Passkey verification failed.");
        }

        const badge = $("verifPasskeyBadge");
        if (badge) {
            badge.className = "status-badge status-verified";
            badge.textContent = "Verified";
        }
        showToast("Passkey registered and verified successfully in PostgreSQL!");
    } catch (err) {
        console.warn("Passkey setup notice:", err.message);
        showToast(err.message || "Passkey setup canceled or unavailable.");
    }
}

// 3. Live Camera Verification
let patCameraStream = null;

async function openCameraVerificationModal() {
    const modal = $("patientCameraModal");
    const video = $("patCameraVideo");
    if (!modal || !video) return;

    modal.classList.remove("hidden");
    try {
        patCameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
        });
        video.srcObject = patCameraStream;
        await video.play();
    } catch (err) {
        console.warn("Camera access error:", err.message);
        showToast("Camera access unavailable: " + err.message);
        closeCameraVerificationModal();
    }
}

function closeCameraVerificationModal() {
    if (patCameraStream) {
        patCameraStream.getTracks().forEach(t => t.stop());
        patCameraStream = null;
    }
    const modal = $("patientCameraModal");
    if (modal) modal.classList.add("hidden");
}

async function confirmCameraVerification() {
    try {
        const video = $("patCameraVideo");
        const canvas = $("patCameraCanvas");
        if (video && canvas) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        const res = await fetch(`${API_URL}/api/patient/verification/camera`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify({ verified: true })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to record camera verification.");
        }

        closeCameraVerificationModal();
        const badge = $("verifCameraBadge");
        if (badge) {
            badge.className = "status-badge status-verified";
            badge.textContent = "Verified";
        }
        showToast("Live camera verification confirmed in PostgreSQL!");
    } catch (err) {
        showToast(err.message);
    }
}

// 4. Liveness Verification
function checkLivenessVerification() {
    const badge = $("verifLivenessBadge");
    if (badge) {
        badge.className = "status-badge status-unconfigured";
        badge.textContent = "Not configured";
    }
    showToast("Liveness anti-spoofing service requires active facial recognition provider.");
}

/* ================= DOCTOR SEARCH ================= */

async function searchPatient() {
    const id = $("doctorPatientId").value.trim().toUpperCase();
    const result = $("doctorResult");

    if (!id) {
        result.innerHTML = `<p class="error">Enter Patient ID.</p>`;
        return;
    }

    const token = localStorage.getItem("doctorToken");

    try {
        const response = await fetch(`${API_URL}/api/doctor/patients/${encodeURIComponent(id)}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Patient not found.");
        }

        const p = data.patient;
        const g1 = p.guardianName ? `${escapeHTML(p.guardianName)} (${escapeHTML(p.guardianPhone || "No phone")}, ${escapeHTML(p.guardianRelationship || "Primary")})` : "Not provided";
        const g2 = p.guardian2Name ? `${escapeHTML(p.guardian2Name)} (${escapeHTML(p.guardian2Phone || "No phone")}, ${escapeHTML(p.guardian2Relationship || "Secondary")})` : "None";

        let healthBadges = "";
        if (p.healthInformation) {
            const h = p.healthInformation;
            const items = [
                { label: "Allergies", val: h.allergies },
                { label: "Diabetes", val: h.diabetes },
                { label: "Hypertension", val: h.hypertension },
                { label: "Asthma", val: h.asthma },
                { label: "Heart Condition", val: h.heart_condition },
                { label: "Major Surgery", val: h.major_surgery },
                { label: "Regular Meds", val: h.regular_medication },
                { label: "Chronic Condition", val: h.chronic_condition },
                { label: "Drug Reaction", val: h.drug_reaction },
                { label: "Emergency Condition", val: h.emergency_condition }
            ];
            healthBadges = items.map(item => `
                <span style="display:inline-block; font-size:12px; margin:3px 6px 3px 0; padding:3px 8px; border-radius:4px; font-weight:600; background:${item.val ? '#fee2e2' : '#f1f5f9'}; color:${item.val ? '#b91c1c' : '#475569'}; border:1px solid ${item.val ? '#fca5a5' : '#cbd5e1'};">
                    ${escapeHTML(item.label)}: ${item.val ? 'YES' : 'NO'}
                </span>
            `).join("");
        }

        result.innerHTML = `
            <div class="doctor-result">
                <h3>👤 Patient Found</h3>
                <p><b>Patient ID:</b> ${escapeHTML(p.id)}</p>
                <p><b>Name:</b> ${escapeHTML(p.name)}</p>
                <p><b>Age:</b> ${escapeHTML(String(p.age || ""))}</p>
                <p><b>Gender:</b> ${escapeHTML(p.gender || "")}</p>
                <p><b>Blood Group:</b> <span class="blood-group-badge">${escapeHTML(p.bloodGroup || p.blood || "")}</span></p>
                <p><b>Phone:</b> ${escapeHTML(p.phone || "")}</p>
                <p><b>Email:</b> ${escapeHTML(p.email || "")}</p>
                <p><b>Address:</b> ${escapeHTML(p.address || "")}</p>
                <p><b>Primary Guardian:</b> ${g1}</p>
                <p><b>Secondary Guardian:</b> ${g2}</p>
                <div style="margin-top:10px;">
                    <b>Health Information Screening:</b>
                    <div style="margin-top:6px;">${healthBadges || "No records"}</div>
                </div>
                <p style="margin-top:10px;"><b>Medical History:</b> ${escapeHTML(p.medicalHistory || "None")}</p>
                <p><b>Medical Notes:</b> ${escapeHTML(p.notes || "None")}</p>

                <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; gap: 10px;">
                    <button type="button" class="btn-export-pdf" onclick="downloadDoctorPatientPdf('${escapeHTML(p.id)}')">
                        📥 Export Physical Medical Record (PDF)
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        result.innerHTML = `<p class="error">${escapeHTML(error.message)}</p>`;
    }
}

/* ================= DOWNLOAD MEDICAL RECORD (PDF) ================= */

async function downloadPatientPdf() {
    const btn = $("downloadPdfBtn");
    const origText = btn ? btn.innerHTML : "";
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = "⏳ Generating Official PDF...";
    }

    try {
        showToast("Generating official physical medical record PDF...");
        const response = await fetch(`${API_URL}/api/patient/export-pdf`, {
            headers: {
                Authorization: `Bearer ${patientToken}`
            }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to download medical record PDF.");
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        const patientId = $("pPatientId") ? $("pPatientId").value : "PAT";
        a.href = blobUrl;
        a.download = `MediCare_Medical_Record_${patientId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);

        showToast("Medical record PDF downloaded successfully for physical records!");
    } catch (err) {
        console.error("PDF download error:", err);
        showToast(err.message || "Could not download medical record PDF.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    }
}

async function downloadDoctorPatientPdf(patientId) {
    const token = localStorage.getItem("doctorToken");
    if (!token) {
        showToast("Doctor authentication required.");
        return;
    }

    try {
        showToast(`Generating physical medical record PDF for ${patientId}...`);
        const response = await fetch(`${API_URL}/api/doctor/patients/${encodeURIComponent(patientId)}/export-pdf`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to download patient PDF.");
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `MediCare_Medical_Record_${patientId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);

        showToast(`Patient ${patientId} physical record PDF exported successfully!`);
    } catch (err) {
        console.error("Doctor PDF export error:", err);
        showToast(err.message || "Could not download patient PDF.");
    }
}

/* ================= SECURITY ================= */

function escapeHTML(value) {
    return String(value || "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[character])
    );
}

/* ================= PATIENT REGISTRATION ================= */

function createUser() {
    openRegisterModal();
}

function openRegisterModal() {
    if ($("regName")) $("regName").value = "";
    if ($("regPhone")) $("regPhone").value = "";
    if ($("regPassword")) $("regPassword").value = "";
    if ($("regBlood")) $("regBlood").value = "O+";
    if ($("regGuardianName")) $("regGuardianName").value = "";
    if ($("regGuardianPhone")) $("regGuardianPhone").value = "";
    if ($("regGuardianRel")) $("regGuardianRel").value = "";
    if ($("regMessage")) $("regMessage").textContent = "";
    if ($("registerModal")) $("registerModal").classList.remove("hidden");
}

function closeRegisterModal() {
    if ($("registerModal")) $("registerModal").classList.add("hidden");
}

async function submitRegistration() {
    const fullName = $("regName") ? $("regName").value.trim() : "";
    const phone = $("regPhone") ? $("regPhone").value.trim() : "";
    const password = $("regPassword") ? $("regPassword").value.trim() : "";
    const bloodGroup = $("regBlood") ? $("regBlood").value : "O+";
    const guardianName = $("regGuardianName") ? $("regGuardianName").value.trim() : "";
    const guardianPhone = $("regGuardianPhone") ? $("regGuardianPhone").value.trim() : "";
    const guardianRelationship = $("regGuardianRel") ? $("regGuardianRel").value.trim() : "";

    if (!fullName || !password) {
        if ($("regMessage")) $("regMessage").textContent = "Please enter your Full Name and Password.";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/register-patient`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName,
                phone,
                password,
                bloodGroup,
                guardianName,
                guardianPhone,
                guardianRelationship
            })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Registration failed.");
        }

        closeRegisterModal();
        showToast(`Registration complete! Your Patient ID is ${data.patientId}`);
        $("username").value = data.patientId;
        $("password").value = password;
        $("loginMessage").className = "success-text";
        $("loginMessage").textContent = `Registered successfully! Your Patient ID is ${data.patientId}. You can now log in.`;
    } catch (err) {
        if ($("regMessage")) $("regMessage").textContent = err.message;
    }
}


/* ================= LOGOUT ================= */

function logout() {

    localStorage.removeItem(
        "patientToken"
    );

    localStorage.removeItem(
        "doctorToken"
    );

    patientToken = null;

    clearInterval(
        resendTimer
    );

    goHome();
}


/* ================= CHAT ================= */

/* ================= UPGRADED CHAT BOARD (DOCTOR CHAT & AI HEALTH ASSISTANT) ================= */

let currentChatMode = "doctor"; // 'doctor' or 'ai'
let chatActivePatientId = null;
let chatActiveDoctorId = null;
let chatPollingTimer = null;

function getCurrentChatAuth() {
    const pToken = patientToken || localStorage.getItem("patientToken");
    const dToken = localStorage.getItem("doctorToken");

    // If currently on doctor page or dashboard, prefer doctor token
    if (dToken && (!$("doctorDashboard").classList.contains("hidden") || !pToken)) {
        return { role: "doctor", token: dToken };
    }
    if (pToken) {
        return { role: "patient", token: pToken };
    }
    if (dToken) {
        return { role: "doctor", token: dToken };
    }
    return null;
}

function toggleChat() {
    const chatBox = $("chatBox");
    if (!chatBox) return;

    const isOpening = chatBox.classList.contains("hidden");
    chatBox.classList.toggle("hidden");

    if (isOpening) {
        updateChatAuthUI();
        if (currentChatMode === "doctor") {
            initDoctorChat();
        } else {
            loadAiChatHistory();
        }
        startChatPolling();
    } else {
        stopChatPolling();
    }
}

function switchChatMode(mode) {
    currentChatMode = mode;
    const tabDoc = $("tabDoctorChat");
    const tabAi = $("tabAiAssistant");
    const panelDoc = $("doctorChatContainer");
    const panelAi = $("aiChatContainer");

    if (mode === "doctor") {
        if (tabDoc) tabDoc.classList.add("active");
        if (tabAi) tabAi.classList.remove("active");
        if (panelDoc) panelDoc.classList.remove("hidden");
        if (panelAi) panelAi.classList.add("hidden");
        initDoctorChat();
    } else {
        if (tabDoc) tabDoc.classList.remove("active");
        if (tabAi) tabAi.classList.add("active");
        if (panelDoc) panelDoc.classList.add("hidden");
        if (panelAi) panelAi.classList.remove("hidden");
        loadAiChatHistory();
    }
}

function updateChatAuthUI() {
    const authInfo = getCurrentChatAuth();
    const statusElem = $("chatAuthStatus");
    if (!statusElem) return;

    if (!authInfo) {
        statusElem.textContent = "Guest (Login required to chat)";
    } else if (authInfo.role === "patient") {
        const patId = $("pPatientId") ? $("pPatientId").value : "Patient";
        statusElem.textContent = `Patient: ${patId}`;
    } else if (authInfo.role === "doctor") {
        statusElem.textContent = "Attending Physician";
    }
}

function startChatPolling() {
    stopChatPolling();
    chatPollingTimer = setInterval(() => {
        const chatBox = $("chatBox");
        if (chatBox && !chatBox.classList.contains("hidden") && currentChatMode === "doctor") {
            loadDoctorChatMessages(false);
        }
    }, 4500);
}

function stopChatPolling() {
    if (chatPollingTimer) {
        clearInterval(chatPollingTimer);
        chatPollingTimer = null;
    }
}

/* ================= MODE 1: DOCTOR-PATIENT CHAT LOGIC ================= */

async function initDoctorChat() {
    const authInfo = getCurrentChatAuth();
    const peerLabel = $("doctorChatPeerLabel");
    const peerSelect = $("chatPeerSelect");
    const msgContainer = $("doctorChatMessages");

    if (!authInfo) {
        if (msgContainer) {
            msgContainer.innerHTML = `
                <div class="chat-empty-state">
                    🔒 Please log in as a Patient or Doctor to access secure conversations.
                </div>
            `;
        }
        if (peerSelect) {
            peerSelect.innerHTML = `<option value="">Login Required</option>`;
        }
        return;
    }

    try {
        if (authInfo.role === "patient") {
            if (peerLabel) peerLabel.textContent = "Doctor:";
            const res = await fetch(`${API_URL}/api/chat/doctors`, {
                headers: { Authorization: `Bearer ${authInfo.token}` }
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to load doctors.");
            }

            if (peerSelect) {
                if (data.doctors.length === 0) {
                    peerSelect.innerHTML = `<option value="">No doctors available</option>`;
                } else {
                    peerSelect.innerHTML = data.doctors.map(d => `
                        <option value="${escapeHTML(d.doctorId)}">
                            👨‍⚕️ ${escapeHTML(d.name)} (${escapeHTML(d.doctorId)})
                        </option>
                    `).join("");
                }
            }

            chatActivePatientId = $("pPatientId") ? $("pPatientId").value : "PAT1001";
            chatActiveDoctorId = peerSelect ? peerSelect.value : null;

        } else if (authInfo.role === "doctor") {
            if (peerLabel) peerLabel.textContent = "Patient:";
            const res = await fetch(`${API_URL}/api/chat/patients`, {
                headers: { Authorization: `Bearer ${authInfo.token}` }
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to load patients.");
            }

            if (peerSelect) {
                if (data.patients.length === 0) {
                    peerSelect.innerHTML = `<option value="">No patients available</option>`;
                } else {
                    peerSelect.innerHTML = data.patients.map(p => {
                        const unreadTxt = p.unreadCount > 0 ? ` [${p.unreadCount} NEW]` : "";
                        return `
                            <option value="${escapeHTML(p.patientId)}">
                                👤 ${escapeHTML(p.name)} (${escapeHTML(p.patientId)})${unreadTxt}
                            </option>
                        `;
                    }).join("");
                }
            }

            chatActiveDoctorId = "doctor";
            chatActivePatientId = peerSelect ? peerSelect.value : null;
        }

        await loadDoctorChatMessages(false);
    } catch (err) {
        console.error("Chat init error:", err);
        if (msgContainer) {
            msgContainer.innerHTML = `<div class="chat-empty-state error">⚠️ ${escapeHTML(err.message)}</div>`;
        }
    }
}

function onChatPeerChanged() {
    const peerSelect = $("chatPeerSelect");
    const authInfo = getCurrentChatAuth();
    if (!peerSelect || !authInfo) return;

    if (authInfo.role === "patient") {
        chatActiveDoctorId = peerSelect.value;
    } else {
        chatActivePatientId = peerSelect.value;
    }

    loadDoctorChatMessages(false);
}

async function loadDoctorChatMessages(isManualRefresh = false) {
    const authInfo = getCurrentChatAuth();
    const msgContainer = $("doctorChatMessages");
    const peerSelect = $("chatPeerSelect");
    if (!authInfo || !peerSelect) return;

    let patientId;
    let doctorId;

    if (authInfo.role === "patient") {
        patientId = $("pPatientId") ? $("pPatientId").value : "PAT1001";
        doctorId = peerSelect.value;
    } else {
        doctorId = "doctor";
        patientId = peerSelect.value;
    }

    if (!patientId || !doctorId) {
        if (msgContainer) {
            msgContainer.innerHTML = `<div class="chat-empty-state">Select a contact to view conversation history.</div>`;
        }
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/chat/messages?patientId=${encodeURIComponent(patientId)}&doctorId=${encodeURIComponent(doctorId)}`, {
            headers: { Authorization: `Bearer ${authInfo.token}` }
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to load messages.");
        }

        if (!msgContainer) return;

        if (data.messages.length === 0) {
            msgContainer.innerHTML = `
                <div class="chat-empty-state">
                    💬 No messages yet. Send a message to start this consultation.
                </div>
            `;
            return;
        }

        const currentUserId = authInfo.role === "patient" ? patientId.toUpperCase() : doctorId.toLowerCase();

        msgContainer.innerHTML = data.messages.map(m => {
            const isOutgoing = (m.senderId || "").toUpperCase() === currentUserId.toUpperCase();
            const timeStr = formatChatTime(m.timestamp);
            const senderLabel = isOutgoing
                ? "You"
                : (authInfo.role === "patient" ? "Doctor" : "Patient");
            const readIcon = isOutgoing
                ? `<span class="msg-read-status ${m.isRead ? 'read' : ''}" title="${m.isRead ? 'Read' : 'Delivered'}">${m.isRead ? '✓✓' : '✓'}</span>`
                : "";

            return `
                <div class="chat-msg ${isOutgoing ? 'outgoing' : 'incoming'}">
                    <span class="msg-sender">${senderLabel}</span>
                    <span class="msg-text">${escapeHTML(m.message)}</span>
                    <div class="msg-meta">
                        <span>${timeStr}</span>
                        ${readIcon}
                    </div>
                </div>
            `;
        }).join("");

        msgContainer.scrollTop = msgContainer.scrollHeight;

        if (isManualRefresh) {
            showToast("Chat messages updated.");
        }
    } catch (err) {
        console.error("Load messages error:", err);
    }
}

async function sendDoctorChatMessage() {
    const input = $("doctorChatInput");
    const btn = $("doctorChatSendBtn");
    const peerSelect = $("chatPeerSelect");
    const authInfo = getCurrentChatAuth();

    if (!input || !peerSelect || !authInfo) return;
    const text = input.value.trim();
    if (!text) return;

    let patientId;
    let doctorId;

    if (authInfo.role === "patient") {
        patientId = $("pPatientId") ? $("pPatientId").value : "PAT1001";
        doctorId = peerSelect.value;
    } else {
        doctorId = "doctor";
        patientId = peerSelect.value;
    }

    if (!patientId || !doctorId) {
        showToast("Please select a recipient first.");
        return;
    }

    input.value = "";
    if (btn) btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/api/chat/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authInfo.token}`
            },
            body: JSON.stringify({
                patientId,
                doctorId,
                message: text
            })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to send message.");
        }

        await loadDoctorChatMessages(false);
    } catch (err) {
        showToast(err.message);
    } finally {
        if (btn) btn.disabled = false;
        input.focus();
    }
}

/* ================= MODE 2: AI HEALTH ASSISTANT LOGIC ================= */

async function loadAiChatHistory() {
    const authInfo = getCurrentChatAuth();
    const msgContainer = $("aiChatMessages");
    if (!msgContainer) return;

    if (!authInfo) {
        msgContainer.innerHTML = `
            <div class="ai-msg">
                <b>Welcome to MediCare AI Health Assistant 👋</b>
                <p>Please log in as a Patient or Doctor to begin asking health and wellness questions.</p>
            </div>
        `;
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/chat/ai/history`, {
            headers: { Authorization: `Bearer ${authInfo.token}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to load AI history.");
        }

        if (data.messages.length === 0) {
            msgContainer.innerHTML = `
                <div class="ai-msg">
                    <b>Hello! 👋 I am your MediCare AI Health Assistant.</b>
                    <p>I can help answer general health questions, clarify complex medical terms, and suggest questions to discuss with your doctor.</p>
                    <div class="ai-disclaimer">
                        ⚠️ <i>I am an educational AI tool, not a doctor. In a medical emergency, call 112/911 or visit the ER immediately.</i>
                    </div>
                </div>
            `;
            return;
        }

        msgContainer.innerHTML = data.messages.map(m => {
            if (m.role === "user") {
                return `
                    <div class="ai-user-msg">
                        ${escapeHTML(m.message)}
                    </div>
                `;
            } else {
                return `
                    <div class="ai-msg">
                        ${formatAiResponse(m.message)}
                    </div>
                `;
            }
        }).join("");

        msgContainer.scrollTop = msgContainer.scrollHeight;
    } catch (err) {
        console.error("AI history error:", err);
    }
}

async function sendAiChatMessage() {
    const input = $("aiChatInput");
    const btn = $("aiChatSendBtn");
    const typing = $("aiTypingIndicator");
    const msgContainer = $("aiChatMessages");
    const authInfo = getCurrentChatAuth();

    if (!input || !authInfo) {
        showToast("Please log in first to use the AI Health Assistant.");
        return;
    }

    const text = input.value.trim();
    if (!text) return;

    input.value = "";

    // Append User Message to UI immediately
    if (msgContainer) {
        const userDiv = document.createElement("div");
        userDiv.className = "ai-user-msg";
        userDiv.textContent = text;
        msgContainer.appendChild(userDiv);
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    // Show Typing Indicator
    if (typing) typing.classList.remove("hidden");
    if (btn) btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/api/chat/ai`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authInfo.token}`
            },
            body: JSON.stringify({ message: text })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "AI Health Assistant is temporarily unavailable.");
        }

        // Append AI Response
        if (msgContainer) {
            const aiDiv = document.createElement("div");
            aiDiv.className = "ai-msg";
            aiDiv.innerHTML = formatAiResponse(data.reply);
            msgContainer.appendChild(aiDiv);
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }
    } catch (err) {
        if (msgContainer) {
            const errDiv = document.createElement("div");
            errDiv.className = "ai-msg";
            errDiv.style.borderColor = "#fca5a5";
            errDiv.style.background = "#fef2f2";
            errDiv.innerHTML = `
                <b style="color:#b91c1c;">Notice:</b> ${escapeHTML(err.message)}
            `;
            msgContainer.appendChild(errDiv);
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }
    } finally {
        if (typing) typing.classList.add("hidden");
        if (btn) btn.disabled = false;
        input.focus();
    }
}

async function clearAiChat() {
    const authInfo = getCurrentChatAuth();
    if (!authInfo) return;

    if (!confirm("Clear your AI Health Assistant chat history?")) return;

    try {
        const res = await fetch(`${API_URL}/api/chat/ai/history`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${authInfo.token}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to clear history.");
        }

        const msgContainer = $("aiChatMessages");
        if (msgContainer) {
            msgContainer.innerHTML = `
                <div class="ai-msg">
                    <b>Conversation cleared.</b>
                    <p>How can I assist you with your health education today?</p>
                </div>
            `;
        }
        showToast("AI chat history cleared.");
    } catch (err) {
        showToast(err.message);
    }
}

function formatChatTime(dateString) {
    if (!dateString) return "";
    try {
        const d = new Date(dateString);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "";
    }
}

function formatAiResponse(rawText) {
    if (!rawText) return "";
    let safe = escapeHTML(rawText);

    // Convert bold **text** to <b>text</b>
    safe = safe.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

    // Convert bullet lines
    const lines = safe.split("\n");
    let inList = false;
    let html = "";

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
            if (!inList) {
                html += "<ul style='margin: 6px 0; padding-left: 20px;'>";
                inList = true;
            }
            html += `<li>${trimmed.substring(2)}</li>`;
        } else {
            if (inList) {
                html += "</ul>";
                inList = false;
            }
            if (trimmed) {
                html += `<p style='margin: 4px 0;'>${trimmed}</p>`;
            }
        }
    });

    if (inList) {
        html += "</ul>";
    }

    return html || safe;
}


/* ================= INPUT VALIDATION ================= */

if ($("phone")) {
    $("phone").addEventListener(
        "input",
        event => {
            event.target.value =
                event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10);
        }
    );
}

if ($("otp")) {
    $("otp").addEventListener(
        "input",
        event => {
            event.target.value =
                event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6);
        }
    );
}


/* ================= EMERGENCY HELPER IDENTIFICATION ================= */

let emergencyCameraStream = null;
let currentFacingMode = "environment"; // default to rear camera for scanning another person
let capturedImageData = null;
let emergencySessionId =
    sessionStorage.getItem("emergencyHelperSession") ||
    ("session-" + Math.random().toString(36).substring(2, 9));

sessionStorage.setItem("emergencyHelperSession", emergencySessionId);


function openHelperEmergency() {
    hideAll();
    $("helperDashboard").classList.remove("hidden");
    resetEmergencyCameraUI();
    loadEmergencyAuditLogs();
}

function exitHelperMode() {
    stopEmergencyCamera();
    goHome();
}

function resetEmergencyCameraUI() {
    stopEmergencyCamera();
    capturedImageData = null;

    $("cameraPreview").classList.add("hidden");
    $("faceGuide").classList.add("hidden");
    $("cameraPlaceholder").classList.remove("hidden");
    $("capturedImage").classList.add("hidden");

    $("startCameraBtn").classList.remove("hidden");
    $("captureBtn").classList.add("hidden");
    $("switchCameraBtn").classList.add("hidden");
    $("retakeBtn").classList.add("hidden");
    $("identifyBtn").classList.add("hidden");
    $("stopCameraBtn").classList.add("hidden");

    $("identifyingSpinner").classList.add("hidden");
    $("unconfiguredResult").classList.add("hidden");
    $("noMatchResult").classList.add("hidden");
    $("matchResult").classList.add("hidden");
}

async function startEmergencyCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Camera API is not supported in this browser.");
        return;
    }

    try {
        const startBtn = $("startCameraBtn");
        startBtn.textContent = "Connecting Camera...";
        startBtn.disabled = true;

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: currentFacingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });
        } catch (facingErr) {
            // Fallback without facingMode constraint
            stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
        }

        emergencyCameraStream = stream;
        const video = $("cameraPreview");
        video.srcObject = stream;
        await video.play();

        video.classList.remove("hidden");
        $("faceGuide").classList.remove("hidden");
        $("cameraPlaceholder").classList.add("hidden");
        $("capturedImage").classList.add("hidden");

        startBtn.classList.add("hidden");
        startBtn.disabled = false;
        startBtn.textContent = "📸 Start Camera";

        $("captureBtn").classList.remove("hidden");
        $("switchCameraBtn").classList.remove("hidden");
        $("stopCameraBtn").classList.remove("hidden");
        $("retakeBtn").classList.add("hidden");
        $("identifyBtn").classList.add("hidden");

        // Hide previous results
        $("unconfiguredResult").classList.add("hidden");
        $("noMatchResult").classList.add("hidden");
        $("matchResult").classList.add("hidden");

        showToast("Camera started. Align the face inside the guide.");
    } catch (err) {
        console.error("Camera access error:", err);
        $("startCameraBtn").disabled = false;
        $("startCameraBtn").textContent = "📸 Start Camera";
        showToast("Camera access denied or unavailable: " + err.message);
    }
}

function stopEmergencyCamera() {
    if (emergencyCameraStream) {
        emergencyCameraStream.getTracks().forEach(track => track.stop());
        emergencyCameraStream = null;
    }

    const video = $("cameraPreview");
    if (video) {
        video.srcObject = null;
        video.classList.add("hidden");
    }

    $("faceGuide").classList.add("hidden");

    if (!capturedImageData) {
        $("cameraPlaceholder").classList.remove("hidden");
        $("startCameraBtn").classList.remove("hidden");
    }

    $("captureBtn").classList.add("hidden");
    $("switchCameraBtn").classList.add("hidden");
    $("stopCameraBtn").classList.add("hidden");
}

function switchCameraFacing() {
    currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
    stopEmergencyCamera();
    startEmergencyCamera();
}

function captureEmergencyPhoto() {
    const video = $("cameraPreview");
    const canvas = $("captureCanvas");

    if (!video || !emergencyCameraStream) {
        showToast("Camera is not running.");
        return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    capturedImageData = canvas.toDataURL("image/jpeg", 0.92);

    // Display captured still photo
    const capturedImg = $("capturedImage");
    capturedImg.src = capturedImageData;
    capturedImg.classList.remove("hidden");

    // Stop live stream to save battery and freeze frame
    stopEmergencyCamera();

    $("cameraPlaceholder").classList.add("hidden");
    $("startCameraBtn").classList.add("hidden");
    $("captureBtn").classList.add("hidden");
    $("switchCameraBtn").classList.add("hidden");
    $("stopCameraBtn").classList.add("hidden");

    $("retakeBtn").classList.remove("hidden");
    $("identifyBtn").classList.remove("hidden");

    showToast("Photo captured! Click 'Identify Patient'.");
}

function retakePhoto() {
    capturedImageData = null;
    $("capturedImage").classList.add("hidden");
    $("unconfiguredResult").classList.add("hidden");
    $("noMatchResult").classList.add("hidden");
    $("matchResult").classList.add("hidden");

    startEmergencyCamera();
}

async function identifyEmergencyPatient() {
    if (!capturedImageData) {
        showToast("Please capture a photo first.");
        return;
    }

    const identifyBtn = $("identifyBtn");
    identifyBtn.disabled = true;
    identifyBtn.textContent = "⏳ Identifying...";

    $("identifyingSpinner").classList.remove("hidden");
    $("unconfiguredResult").classList.add("hidden");
    $("noMatchResult").classList.add("hidden");
    $("matchResult").classList.add("hidden");

    try {
        const response = await fetch(`${API_URL}/api/helper/identify-person`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Helper-Session": emergencySessionId
            },
            body: JSON.stringify({
                image: capturedImageData,
                sessionId: emergencySessionId
            })
        });

        const data = await response.json();

        $("identifyingSpinner").classList.add("hidden");
        identifyBtn.disabled = false;
        identifyBtn.textContent = "🔍 Identify Patient";

        // 1. Service Unconfigured State
        if (data.configured === false) {
            $("unconfiguredResult").classList.remove("hidden");
            if (data.message) {
                $("unconfiguredMessage").textContent = data.message;
            }
            showToast("Face identification service is not configured.");
        }
        // 2. No Reliable Match Found State
        else if (data.matched === false) {
            $("noMatchResult").classList.remove("hidden");
            if (data.message) {
                $("noMatchMessage").textContent = data.message;
            }
            showToast("No reliable registered patient match found.");
        }
        // 3. Reliable Registered Patient Match Found
        // Displays ONLY: Patient ID, Full Name, Blood Group, Guardian Name, Guardian Phone Number
        // Never displays password, email, address, medical history, notes, documents, or full profile
        else if (data.matched === true && data.patient) {
            const p = data.patient;

            $("resPatientId").textContent = p.id || "-";
            $("resPatientName").textContent = p.name || "-";
            $("resBloodGroupBadge").textContent = p.bloodGroup || p.blood || "N/A";
            $("resGuardianName").textContent = p.guardianName || "Not Provided";

            const guardianPhone = p.guardianPhone || "Not Provided";
            $("resGuardianPhone").textContent = guardianPhone;

            const cleanPhone = String(guardianPhone).replace(/[^\d+]/g, "");
            $("resCallGuardianBtn").href = cleanPhone ? `tel:${cleanPhone}` : "javascript:void(0)";

            $("matchResult").classList.remove("hidden");
            showToast("Registered patient successfully identified!");
        }

        // Refresh audit logs to show the new event
        loadEmergencyAuditLogs();
    } catch (err) {
        console.error("Identification error:", err);
        $("identifyingSpinner").classList.add("hidden");
        identifyBtn.disabled = false;
        identifyBtn.textContent = "🔍 Identify Patient";
        showToast("Error processing identification: " + err.message);
    }
}

async function loadEmergencyAuditLogs() {
    const tbody = $("auditLogTableBody");
    if (!tbody) return;

    try {
        const response = await fetch(`${API_URL}/api/helper/audit-logs`);
        const data = await response.json();

        if (!response.ok || !data.success || !data.logs || data.logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">
                        No identification events recorded yet.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.logs.map(log => {
            let statusTagClass = "unconfigured";
            let statusLabel = "Service Unconfigured";

            if (log.status === "patient_identified" || log.status === "matched") {
                statusTagClass = "matched";
                statusLabel = "Match Verified";
            } else if (log.status === "no_reliable_match" || log.status === "no_match") {
                statusTagClass = "nomatch";
                statusLabel = "No Match Found";
            }

            const formattedTime = new Date(log.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });

            return `
                <tr>
                    <td><b>${formattedTime}</b></td>
                    <td><code>${escapeHTML(log.sessionId || "-")}</code></td>
                    <td><span class="status-tag ${statusTagClass}">${statusLabel}</span></td>
                    <td><b>${escapeHTML(log.matchedPatientId || "None")}</b></td>
                    <td style="color: #64748b;">${escapeHTML(log.message || "-")}</td>
                </tr>
            `;
        }).join("");
    } catch (err) {
        console.warn("Failed to load audit logs:", err);
    }
}
