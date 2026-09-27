let selectedLogin = "patient";
let resendTimer = null;
let patientToken = localStorage.getItem("patientToken");


function $(id) {
    return document.getElementById(id);
}


/* ================= TOAST ================= */

function showToast(message) {

    const toast = $("toast");
    if (!toast) return;

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        if (toast) {
            toast.classList.remove("show");
        }
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
        const el = $(id);
        if (el) el.classList.add("hidden");
    });

    hideChatBoard();
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

    if ($("loginPage")) {
        $("loginPage").classList.remove("hidden");
    }

    if ($("loginMessage")) {
        $("loginMessage").textContent = "";
    }

    if ($("username")) $("username").value = "";
    if ($("password")) {
        $("password").value = "";
        $("password").type = "password";
    }
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
            $("registerPrompt").classList.remove("hidden");
            if ($("registerPromptText")) $("registerPromptText").textContent = "New doctor? ";
            if ($("registerPromptBtn")) {
                $("registerPromptBtn").textContent = "Register here";
                $("registerPromptBtn").setAttribute("onclick", "openDoctorRegisterModal()");
            }
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
            if ($("registerPromptText")) $("registerPromptText").textContent = "New patient? ";
            if ($("registerPromptBtn")) {
                $("registerPromptBtn").textContent = "Register here";
                $("registerPromptBtn").setAttribute("onclick", "openRegisterModal()");
            }
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

    if ($("homePage")) {
        $("homePage").classList.remove("hidden");
    }
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


        if ($("otpSection")) {
            $("otpSection").classList.remove("hidden");
        }


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

            localStorage.removeItem("doctorToken");
            patientToken = data.token;

            localStorage.setItem(
                "patientToken",
                patientToken
            );

            await loadPatientDashboard();
            showChatBoardForPatient();

        }

        else if (data.role === "doctor") {

            localStorage.removeItem("patientToken");
            patientToken = null;

            localStorage.setItem(
                "doctorToken",
                data.token
            );

            hideChatBoard();
            hideAll();
            if ($("doctorDashboard")) {
                $("doctorDashboard").classList.remove("hidden");
            }

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

    if ($("patientName")) $("patientName").textContent = p.name || "";
    if ($("patientHeaderName")) $("patientHeaderName").textContent = p.name || "";
    if ($("patientId")) $("patientId").textContent = p.id || "";
    if ($("pPatientId")) $("pPatientId").value = p.id || "";

    // Summary Card Details
    if ($("sumPatientId")) $("sumPatientId").textContent = p.id || "-";
    if ($("sumName")) $("sumName").textContent = p.name || "-";
    if ($("sumAge")) $("sumAge").textContent = p.age ? String(p.age) : "-";
    if ($("sumGender")) $("sumGender").textContent = p.gender || "-";
    if ($("sumBlood")) $("sumBlood").textContent = p.bloodGroup || p.blood || "-";
    if ($("sumPhone")) $("sumPhone").textContent = p.phone || "-";
    if ($("sumEmail")) $("sumEmail").textContent = p.email || "-";
    if ($("sumAddress")) $("sumAddress").textContent = p.address || "-";
    if ($("sumGuardian")) {
        $("sumGuardian").textContent = p.guardianName
            ? `${p.guardianName} (${p.guardianRelationship || "Guardian"}, ${p.guardianPhone || "No phone"})`
            : "-";
    }
    if ($("sumGuardian2")) {
        $("sumGuardian2").textContent = p.guardian2Name
            ? `${p.guardian2Name} (${p.guardian2Relationship || "Secondary"}, ${p.guardian2Phone || "No phone"})`
            : "None recorded";
    }

    // Primary Details Form Fields
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

    // Ensure inputs are initially disabled until "Edit Profile" is clicked
    [
        "pName", "pAge", "pGender", "pBlood", "pPhone", "pEmail", "pAddress",
        "pGuardianName", "pGuardianPhone", "pGuardianRelationship",
        "pGuardian2Name", "pGuardian2Phone", "pGuardian2Relationship",
        "pMedicalHistory", "pNotes"
    ].forEach(id => {
        if ($(id)) $(id).disabled = true;
    });

    if ($("updateBtn")) $("updateBtn").classList.remove("hidden");
    if ($("saveBtn")) $("saveBtn").classList.add("hidden");
    if ($("cancelBtn")) $("cancelBtn").classList.add("hidden");

    if ($("profileSummaryView")) $("profileSummaryView").classList.remove("hidden");
    if ($("profileEditView")) $("profileEditView").classList.add("hidden");

    // Secondary Guardian Details
    if ($("pGuardian2Name")) $("pGuardian2Name").value = p.guardian2Name || "";
    if ($("pGuardian2Phone")) $("pGuardian2Phone").value = p.guardian2Phone || "";
    if ($("pGuardian2Relationship")) $("pGuardian2Relationship").value = p.guardian2Relationship || "";
    if ($("secGuardian2Name")) $("secGuardian2Name").value = p.guardian2Name || "";
    if ($("secGuardian2Phone")) $("secGuardian2Phone").value = p.guardian2Phone || "";
    if ($("secGuardian2Relationship")) $("secGuardian2Relationship").value = p.guardian2Relationship || "";

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

        const isFaceActive = p.verifications.face === "verified";
        if ($("sumFaceStatus")) {
            $("sumFaceStatus").textContent = isFaceActive ? "Active" : "Not configured";
            $("sumFaceStatus").style.color = isFaceActive ? "#16a34a" : "#64748b";
        }
        if ($("sumFaceIcon")) {
            $("sumFaceIcon").textContent = isFaceActive ? "✓" : "○";
        }

        const isPasskeyActive = p.verifications.passkey === "verified" || p.verifications.passkey === "configured";
        if ($("sumPasskeyStatus")) {
            $("sumPasskeyStatus").textContent = isPasskeyActive ? "Active" : "Not configured";
            $("sumPasskeyStatus").style.color = isPasskeyActive ? "#16a34a" : "#64748b";
        }
        if ($("sumPasskeyIcon")) {
            $("sumPasskeyIcon").textContent = isPasskeyActive ? "✓" : "○";
        }
    }

    // Load Medical Documents from PostgreSQL
    await loadPatientDocuments();

    hideAll();
    if ($("patientDashboard")) {
        $("patientDashboard").classList.remove("hidden");
    }
    showChatBoardForPatient();
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

/* ================= UPDATE PRIMARY & UNIFIED PROFILE DETAILS ================= */

function showProfileEdit() {
    [
        "pName", "pAge", "pGender", "pBlood", "pPhone", "pEmail", "pAddress",
        "pGuardianName", "pGuardianPhone", "pGuardianRelationship",
        "pGuardian2Name", "pGuardian2Phone", "pGuardian2Relationship",
        "pMedicalHistory", "pNotes"
    ].forEach(id => {
        if ($(id)) $(id).disabled = false;
    });

    if ($("profileSummaryView")) $("profileSummaryView").classList.add("hidden");
    if ($("profileEditView")) $("profileEditView").classList.remove("hidden");
    if ($("updateBtn")) $("updateBtn").classList.add("hidden");
    if ($("saveBtn")) $("saveBtn").classList.remove("hidden");
    if ($("cancelBtn")) $("cancelBtn").classList.remove("hidden");

    const editEl = $("profileEditView") || $("profileCard");
    if (editEl) editEl.scrollIntoView({ behavior: "smooth" });
}

function hideProfileEdit() {
    [
        "pName", "pAge", "pGender", "pBlood", "pPhone", "pEmail", "pAddress",
        "pGuardianName", "pGuardianPhone", "pGuardianRelationship",
        "pGuardian2Name", "pGuardian2Phone", "pGuardian2Relationship",
        "pMedicalHistory", "pNotes"
    ].forEach(id => {
        if ($(id)) $(id).disabled = true;
    });

    if ($("profileSummaryView")) $("profileSummaryView").classList.remove("hidden");
    if ($("profileEditView")) $("profileEditView").classList.add("hidden");
    if ($("updateBtn")) $("updateBtn").classList.remove("hidden");
    if ($("saveBtn")) $("saveBtn").classList.add("hidden");
    if ($("cancelBtn")) $("cancelBtn").classList.add("hidden");
}

function enableUpdate() {
    showProfileEdit();
}

function enableEdit() {
    showProfileEdit();
}

function showSecondaryEdit() {
    showProfileEdit();
}

function hideSecondaryEdit() {
    hideProfileEdit();
}

function showHealthEdit() {
    showProfileEdit();
}

function hideHealthEdit() {
    hideProfileEdit();
}

function scrollToCard(cardId) {
    const el = $(cardId);
    if (el) {
        el.scrollIntoView({ behavior: "smooth" });
    }
}

function showVerificationManage() {
    showProfileEdit();
}

async function saveSecondaryDetailsFromPanel() {
    await saveDetails();
}

/* ================= SAVE UNIFIED PROFILE (PRIMARY, SECONDARY & HEALTH TO POSTGRESQL) ================= */

async function saveDetails() {
    const saveBtn = $("saveBtn");
    const origText = saveBtn ? saveBtn.textContent : "";
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "⏳ Saving to PostgreSQL...";
    }

    const bloodVal = $("pBlood") ? $("pBlood").value : "O+";
    const details = {
        name: $("pName") ? $("pName").value.trim() : "",
        age: $("pAge") ? $("pAge").value.trim() : "",
        gender: $("pGender") ? $("pGender").value : "Other",
        blood: bloodVal,
        bloodGroup: bloodVal,
        phone: $("pPhone") ? $("pPhone").value.trim() : "",
        email: $("pEmail") ? $("pEmail").value.trim() : "",
        address: $("pAddress") ? $("pAddress").value.trim() : "",
        guardianName: $("pGuardianName") ? $("pGuardianName").value.trim() : "",
        guardianPhone: $("pGuardianPhone") ? $("pGuardianPhone").value.trim() : "",
        guardianRelationship: $("pGuardianRelationship") ? $("pGuardianRelationship").value.trim() : "",
        guardian2Name: ($("pGuardian2Name") && $("pGuardian2Name").value.trim()) || ($("secGuardian2Name") && $("secGuardian2Name").value.trim()) || "",
        guardian2Phone: ($("pGuardian2Phone") && $("pGuardian2Phone").value.trim()) || ($("secGuardian2Phone") && $("secGuardian2Phone").value.trim()) || "",
        guardian2Relationship: ($("pGuardian2Relationship") && $("pGuardian2Relationship").value.trim()) || ($("secGuardian2Relationship") && $("secGuardian2Relationship").value.trim()) || "",
        medicalHistory: $("pMedicalHistory") ? $("pMedicalHistory").value.trim() : "",
        notes: $("pNotes") ? $("pNotes").value.trim() : ""
    };

    try {
        // 1. Save Primary & Secondary details to PostgreSQL
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
            throw new Error(data.message || "Failed to update profile details.");
        }

        // 2. Save Structured Health Information to PostgreSQL
        const healthResponse = await fetch(`${API_URL}/api/patient/health-information`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify(currentHealthInfo)
        });

        const healthData = await healthResponse.json();
        if (!healthResponse.ok || !healthData.success) {
            throw new Error(healthData.message || "Failed to update health information.");
        }

        hideProfileEdit();
        await loadPatientDashboard();
        showToast("Profile, secondary details, and health information saved to PostgreSQL!");
    } catch (error) {
        showToast(error.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = origText || "💾 Save Profile";
        }
    }
}

/* ================= CANCEL ================= */

function cancelUpdate() {
    hideProfileEdit();
    loadPatientDashboard().catch(error => showToast(error.message));
}

/* ================= SECONDARY GUARDIAN SAVE ================= */

async function saveSecondaryGuardian() {
    await saveDetails();
}

/* ================= HEALTH INFORMATION (STRUCTURED BOOLEANS) ================= */

function setHealthValue(questionKey, val) {
    currentHealthInfo[questionKey] = Boolean(val);
    updateHealthUI();
}

function updateHealthUI() {
    const questions = [
        { key: "allergies", label: "Allergies" },
        { key: "diabetes", label: "Diabetes" },
        { key: "hypertension", label: "Hypertension / High BP" },
        { key: "asthma", label: "Asthma" },
        { key: "heart_condition", label: "Heart Condition" },
        { key: "major_surgery", label: "Prior Major Surgery" },
        { key: "regular_medication", label: "Regular Medication" },
        { key: "chronic_condition", label: "Chronic Condition" },
        { key: "drug_reaction", label: "Drug Reaction" },
        { key: "emergency_condition", label: "Emergency Condition" }
    ];

    const activeConditions = [];

    questions.forEach(q => {
        const group = document.querySelector(`.yn-group[data-q="${q.key}"]`);
        const isYes = Boolean(currentHealthInfo[q.key]);
        if (group) {
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
        if (isYes) {
            activeConditions.push(q.label);
        }
    });

    const sumGrid = $("healthSummaryGrid");
    if (sumGrid) {
        if (activeConditions.length > 0) {
            sumGrid.innerHTML = activeConditions.map(c => `
                <span class="badge-tag" style="background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; font-size: 11px; padding: 2px 8px; border-radius: 4px;">
                    ⚠️ ${escapeHTML(c)}: YES
                </span>
            `).join("");
        } else {
            sumGrid.innerHTML = `
                <span style="font-size: 12px; color: #16a34a;">
                    ✓ No chronic conditions or drug reactions flagged
                </span>
            `;
        }
    }
}

async function saveHealthInformation() {
    await saveDetails();
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

/* ================= DOCTOR REGISTRATION ================= */

function openDoctorRegisterModal() {
    if ($("regDocName")) $("regDocName").value = "";
    if ($("regDocUsername")) $("regDocUsername").value = "";
    if ($("regDocPhone")) $("regDocPhone").value = "";
    if ($("regDocSpecialization")) $("regDocSpecialization").value = "";
    if ($("regDocPassword")) $("regDocPassword").value = "";
    if ($("regDocMessage")) $("regDocMessage").textContent = "";
    if ($("doctorRegisterModal")) $("doctorRegisterModal").classList.remove("hidden");
}

function closeDoctorRegisterModal() {
    if ($("doctorRegisterModal")) $("doctorRegisterModal").classList.add("hidden");
}

async function submitDoctorRegistration() {
    const fullName = $("regDocName") ? $("regDocName").value.trim() : "";
    const username = $("regDocUsername") ? $("regDocUsername").value.trim() : "";
    const phone = $("regDocPhone") ? $("regDocPhone").value.trim() : "";
    const specialization = $("regDocSpecialization") ? $("regDocSpecialization").value.trim() : "";
    const password = $("regDocPassword") ? $("regDocPassword").value.trim() : "";

    if (!fullName || !password) {
        if ($("regDocMessage")) $("regDocMessage").textContent = "Please enter Doctor Full Name and Password.";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/register-doctor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName,
                username,
                phone,
                specialization,
                password
            })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Doctor registration failed.");
        }

        closeDoctorRegisterModal();
        showToast(`Doctor registration complete! Your Doctor Username is "${data.doctorId}"`);
        if ($("username")) $("username").value = data.doctorId;
        if ($("password")) $("password").value = password;
        if ($("loginMessage")) {
            $("loginMessage").className = "success-text";
            $("loginMessage").textContent = `Doctor registered successfully! Your Doctor Username is "${data.doctorId}". You can now log in.`;
        }
    } catch (err) {
        if ($("regDocMessage")) $("regDocMessage").textContent = err.message;
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

    hideChatBoard();
    goHome();
}


/* ================= CHAT ================= */

/* ================= UPGRADED CHAT BOARD (PATIENT-ONLY: DOCTOR CHAT & AI HEALTH ASSISTANT) ================= */

let currentChatMode = "doctor"; // 'doctor' or 'ai'
let chatActivePatientId = null;
let chatActiveDoctorId = null;
let chatPollingTimer = null;

function hideChatBoard() {
    stopChatPolling();
    const chatFab = $("chatFab");
    const chatBox = $("chatBox");
    if (chatFab) chatFab.classList.add("hidden");
    if (chatBox) chatBox.classList.add("hidden");
}

function showChatBoardForPatient() {
    const pToken = patientToken || localStorage.getItem("patientToken");
    const patientDash = $("patientDashboard");
    const isPatientView = patientDash && !patientDash.classList.contains("hidden");

    if (pToken && isPatientView) {
        const chatFab = $("chatFab");
        if (chatFab) chatFab.classList.remove("hidden");
    } else {
        hideChatBoard();
    }
}

function getCurrentChatAuth() {
    const pToken = patientToken || localStorage.getItem("patientToken");
    const patientDash = $("patientDashboard");
    const isPatientView = patientDash && !patientDash.classList.contains("hidden");

    // Chat Board is strictly available ONLY to authenticated patients
    if (pToken && isPatientView) {
        return { role: "patient", token: pToken };
    }
    return null;
}

function toggleChat() {
    const authInfo = getCurrentChatAuth();
    if (!authInfo || authInfo.role !== "patient") {
        hideChatBoard();
        return;
    }
    const chatBox = $("chatBox");
    if (!chatBox) return;

    const isOpening = chatBox.classList.contains("hidden");
    chatBox.classList.toggle("hidden");

    if (isOpening) {
        updateChatAuthUI();
        if (currentChatMode === "doctor") {
            initDoctorChat();
        } else {
            checkAiStatus();
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
        checkAiStatus();
        loadAiChatHistory();
    }
}

function openDoctorChatMode() {
    const authInfo = getCurrentChatAuth();
    if (!authInfo || authInfo.role !== "patient") {
        showToast("Please log in as a patient to access Doctor Chat.");
        return;
    }
    const chatFab = $("chatFab");
    if (chatFab) chatFab.classList.remove("hidden");
    const chatBox = $("chatBox");
    if (chatBox) chatBox.classList.remove("hidden");
    updateChatAuthUI();
    switchChatMode("doctor");
    startChatPolling();
}

function openAiChatMode() {
    const authInfo = getCurrentChatAuth();
    if (!authInfo || authInfo.role !== "patient") {
        showToast("Please log in as a patient to access AI Health Assistant.");
        return;
    }
    const chatFab = $("chatFab");
    if (chatFab) chatFab.classList.remove("hidden");
    const chatBox = $("chatBox");
    if (chatBox) chatBox.classList.remove("hidden");
    updateChatAuthUI();
    switchChatMode("ai");
}

function updateChatAuthUI() {
    const authInfo = getCurrentChatAuth();
    const statusElem = $("chatAuthStatus");
    if (!statusElem) return;

    if (!authInfo) {
        statusElem.textContent = "Login Required";
    } else {
        const patId = $("pPatientId") ? $("pPatientId").value : "Patient";
        statusElem.textContent = `Patient: ${patId}`;
    }
}

async function checkAiStatus() {
    const indicator = $("aiStatusIndicator");
    const alertBox = $("aiConfigAlert");
    const authInfo = getCurrentChatAuth();

    if (!indicator) return;

    if (!authInfo) {
        indicator.textContent = "● Login Required";
        indicator.style.color = "#94a3b8";
        if (alertBox) alertBox.classList.add("hidden");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/chat/ai/status`, {
            headers: { Authorization: `Bearer ${authInfo.token}` }
        });
        const data = await res.json();
        if (res.ok && data.success && data.configured) {
            indicator.textContent = "● AI Online";
            indicator.style.color = "#16a34a";
            if (alertBox) alertBox.classList.add("hidden");
        } else {
            indicator.textContent = "● AI Unavailable";
            indicator.style.color = "#dc2626";
            if (alertBox) {
                alertBox.classList.remove("hidden");
                alertBox.textContent = data.message || "AI service is not configured. Please configure the required AI API key.";
            }
        }
    } catch (_) {
        indicator.textContent = "● AI Offline";
        indicator.style.color = "#dc2626";
        if (alertBox) {
            alertBox.classList.remove("hidden");
            alertBox.textContent = "AI service is temporarily unreachable.";
        }
    }
}

function quickAiPrompt(promptText) {
    const input = $("aiChatInput");
    if (!input) return;
    input.value = promptText;
    sendAiChatMessage();
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

    if (!input || !authInfo || authInfo.role !== "patient") {
        showToast("Please log in as a patient to use the AI Health Assistant.");
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
        const payload = { message: text };
        if (currentAiDocumentContext && currentAiDocumentContext.documentId) {
            payload.documentId = currentAiDocumentContext.documentId;
        }

        const res = await fetch(`${API_URL}/api/chat/ai`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authInfo.token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            const errorMsg = data.message || "AI Health Assistant is temporarily unavailable.";
            if (errorMsg.includes("not configured")) {
                const alertBox = $("aiConfigAlert");
                if (alertBox) {
                    alertBox.classList.remove("hidden");
                    alertBox.textContent = errorMsg;
                }
                const indicator = $("aiStatusIndicator");
                if (indicator) {
                    indicator.textContent = "● AI Unavailable";
                    indicator.style.color = "#dc2626";
                }
            }
            throw new Error(errorMsg);
        }

        // Append Real AI Response
        if (msgContainer) {
            const aiDiv = document.createElement("div");
            aiDiv.className = "ai-msg";
            let contentHtml = "";
            if (data.documentAnalyzed) {
                contentHtml += `<div style="display:inline-block; font-size: 11px; color: #0d9488; background: #f0fdfa; border: 1px solid #ccfbf1; padding: 2px 8px; border-radius: 4px; font-weight: 600; margin-bottom: 8px;">📄 Analyzed Document: ${escapeHTML(data.documentAnalyzed)}</div>`;
            }
            contentHtml += formatAiResponse(data.reply);
            aiDiv.innerHTML = contentHtml;
            msgContainer.appendChild(aiDiv);
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }

        currentAiDocumentContext = null;
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


function setElementHidden(id, hidden) {
    const el = typeof id === "string" ? $(id) : id;
    if (!el) return;
    if (hidden) {
        el.classList.add("hidden");
    } else {
        el.classList.remove("hidden");
    }
}

function openHelperEmergency() {
    hideAll();
    if ($("helperDashboard")) {
        $("helperDashboard").classList.remove("hidden");
    }
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

    setElementHidden("cameraPreview", true);
    setElementHidden("faceGuide", true);
    setElementHidden("cameraPlaceholder", false);
    setElementHidden("capturedImage", true);

    setElementHidden("startCameraBtn", false);
    setElementHidden("captureBtn", true);
    setElementHidden("switchCameraBtn", true);
    setElementHidden("retakeBtn", true);
    setElementHidden("identifyBtn", true);
    setElementHidden("stopCameraBtn", true);

    setElementHidden("identifyingSpinner", true);
    setElementHidden("unconfiguredResult", true);
    setElementHidden("noMatchResult", true);
    setElementHidden("matchResult", true);
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
        if (video) {
            video.srcObject = stream;
            await video.play();
            setElementHidden(video, false);
        }

        setElementHidden("faceGuide", false);
        setElementHidden("cameraPlaceholder", true);
        setElementHidden("capturedImage", true);

        if (startBtn) {
            setElementHidden(startBtn, true);
            startBtn.disabled = false;
            startBtn.textContent = "📸 Start Camera";
        }

        setElementHidden("captureBtn", false);
        setElementHidden("switchCameraBtn", false);
        setElementHidden("stopCameraBtn", false);
        setElementHidden("retakeBtn", true);
        setElementHidden("identifyBtn", true);

        // Hide previous results
        setElementHidden("unconfiguredResult", true);
        setElementHidden("noMatchResult", true);
        setElementHidden("matchResult", true);

        showToast("Camera started. Align the face inside the guide.");
    } catch (err) {
        console.error("Camera access error:", err);
        if ($("startCameraBtn")) {
            $("startCameraBtn").disabled = false;
            $("startCameraBtn").textContent = "📸 Start Camera";
        }
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
        setElementHidden(video, true);
    }

    setElementHidden("faceGuide", true);

    if (!capturedImageData) {
        setElementHidden("cameraPlaceholder", false);
        setElementHidden("startCameraBtn", false);
    }

    setElementHidden("captureBtn", true);
    setElementHidden("switchCameraBtn", true);
    setElementHidden("stopCameraBtn", true);
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
    if (capturedImg) {
        capturedImg.src = capturedImageData;
        setElementHidden(capturedImg, false);
    }

    // Stop live stream to save battery and freeze frame
    stopEmergencyCamera();

    setElementHidden("cameraPlaceholder", true);
    setElementHidden("startCameraBtn", true);
    setElementHidden("captureBtn", true);
    setElementHidden("switchCameraBtn", true);
    setElementHidden("stopCameraBtn", true);

    setElementHidden("retakeBtn", false);
    setElementHidden("identifyBtn", false);

    showToast("Photo captured! Click 'Identify Patient'.");
}

function retakePhoto() {
    capturedImageData = null;
    setElementHidden("capturedImage", true);
    setElementHidden("unconfiguredResult", true);
    setElementHidden("noMatchResult", true);
    setElementHidden("matchResult", true);

    startEmergencyCamera();
}

async function identifyEmergencyPatient() {
    if (!capturedImageData) {
        showToast("Please capture a photo first.");
        return;
    }

    const identifyBtn = $("identifyBtn");
    if (identifyBtn) {
        identifyBtn.disabled = true;
        identifyBtn.textContent = "⏳ Identifying...";
    }

    setElementHidden("identifyingSpinner", false);
    setElementHidden("unconfiguredResult", true);
    setElementHidden("noMatchResult", true);
    setElementHidden("matchResult", true);

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

        setElementHidden("identifyingSpinner", true);
        if (identifyBtn) {
            identifyBtn.disabled = false;
            identifyBtn.textContent = "🔍 Identify Patient";
        }

        // 1. Service Unconfigured State
        if (data.configured === false) {
            setElementHidden("unconfiguredResult", false);
            if (data.message && $("unconfiguredMessage")) {
                $("unconfiguredMessage").textContent = data.message;
            }
            showToast("Face identification service is not configured.");
        }
        // 2. No Reliable Match Found State
        else if (data.matched === false) {
            setElementHidden("noMatchResult", false);
            if (data.message && $("noMatchMessage")) {
                $("noMatchMessage").textContent = data.message;
            }
            showToast("No reliable registered patient match found.");
        }
        // 3. Reliable Registered Patient Match Found
        else if (data.matched === true && data.patient) {
            const p = data.patient;

            if ($("resPatientId")) $("resPatientId").textContent = p.id || "-";
            if ($("resPatientName")) $("resPatientName").textContent = p.name || "-";
            if ($("resBloodGroupBadge")) $("resBloodGroupBadge").textContent = p.bloodGroup || p.blood || "N/A";
            if ($("resGuardianName")) $("resGuardianName").textContent = p.guardianName || "Not Provided";

            const guardianPhone = p.guardianPhone || "Not Provided";
            if ($("resGuardianPhone")) $("resGuardianPhone").textContent = guardianPhone;

            const cleanPhone = String(guardianPhone).replace(/[^\d+]/g, "");
            if ($("resCallGuardianBtn")) {
                $("resCallGuardianBtn").href = cleanPhone ? `tel:${cleanPhone}` : "javascript:void(0)";
            }

            setElementHidden("matchResult", false);
            showToast("Registered patient successfully identified!");
        }

        // Refresh audit logs to show the new event
        loadEmergencyAuditLogs();
    } catch (err) {
        console.error("Identification error:", err);
        setElementHidden("identifyingSpinner", true);
        if (identifyBtn) {
            identifyBtn.disabled = false;
            identifyBtn.textContent = "🔍 Identify Patient";
        }
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

/* ================= MEDICAL DOCUMENTS & FILE UPLOADS ================= */

let selectedFileToUpload = null;
let currentAiDocumentContext = null;

function openFileUploadModal() {
    const pToken = patientToken || localStorage.getItem("patientToken");
    if (!pToken) {
        showToast("Please log in as a patient to upload files.");
        return;
    }
    const modal = $("fileUploadModal");
    if (modal) modal.classList.remove("hidden");
    const input = $("docFileInput");
    if (input) input.value = "";
    selectedFileToUpload = null;
    const info = $("selectedFileInfo");
    if (info) info.classList.add("hidden");
    const err = $("uploadErrorMessage");
    if (err) {
        err.classList.add("hidden");
        err.textContent = "";
    }
    const btn = $("confirmUploadBtn");
    if (btn) btn.disabled = true;
}

function closeFileUploadModal() {
    const modal = $("fileUploadModal");
    if (modal) modal.classList.add("hidden");
    selectedFileToUpload = null;
    const input = $("docFileInput");
    if (input) input.value = "";
}

function handleFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    const err = $("uploadErrorMessage");
    const btn = $("confirmUploadBtn");
    const info = $("selectedFileInfo");
    const nameEl = $("selectedFileName");
    const sizeEl = $("selectedFileSize");

    if (!file) return;

    const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
        if (err) {
            err.textContent = `Unsupported file type: ${ext}. Supported formats: PDF, JPG, JPEG, PNG, DOC, DOCX.`;
            err.classList.remove("hidden");
        }
        if (btn) btn.disabled = true;
        if (info) info.classList.add("hidden");
        selectedFileToUpload = null;
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        if (err) {
            err.textContent = "File size exceeds 10MB limit.";
            err.classList.remove("hidden");
        }
        if (btn) btn.disabled = true;
        if (info) info.classList.add("hidden");
        selectedFileToUpload = null;
        return;
    }

    selectedFileToUpload = file;
    if (err) err.classList.add("hidden");
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB`;
    if (info) info.classList.remove("hidden");
    if (btn) btn.disabled = false;
}

async function submitFileUpload() {
    if (!selectedFileToUpload) {
        showToast("Please choose a medical file to upload.");
        return;
    }

    const btn = $("confirmUploadBtn");
    const origText = btn ? btn.textContent : "";
    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Uploading to PostgreSQL...";
    }

    try {
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(selectedFileToUpload);
        });

        const response = await fetch(`${API_URL}/api/patient/documents/upload`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify({
                filename: selectedFileToUpload.name,
                fileType: selectedFileToUpload.type,
                fileData: base64Data,
                fileSize: selectedFileToUpload.size
            })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to upload document.");
        }

        showToast("Medical document uploaded successfully to PostgreSQL!");
        closeFileUploadModal();
        await loadPatientDocuments();
    } catch (err) {
        const errEl = $("uploadErrorMessage");
        if (errEl) {
            errEl.textContent = err.message;
            errEl.classList.remove("hidden");
        }
        showToast(err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = origText || "⬆️ Upload to PostgreSQL";
        }
    }
}

async function loadPatientDocuments() {
    const container = $("medicalFilesContainer");
    if (!container) return;
    if (!patientToken) return;

    try {
        const res = await fetch(`${API_URL}/api/patient/documents`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.documents)) {
            renderPatientDocuments(data.documents);
        } else {
            renderPatientDocuments([]);
        }
    } catch (err) {
        console.warn("Could not load patient documents:", err);
        renderPatientDocuments([]);
    }
}

function renderPatientDocuments(docs) {
    const container = $("medicalFilesContainer");
    if (!container) return;

    if (!docs || docs.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; color: #94a3b8; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;">
                <div style="font-size: 28px; margin-bottom: 6px;">📂</div>
                <p style="margin: 0; font-size: 14px;">No medical documents uploaded yet.</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Upload blood reports, prescriptions, or doctor summaries to analyze with AI.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = docs.map(doc => {
        const ext = (doc.original_filename || "").split(".").pop().toUpperCase();
        const sizeKb = doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "";
        const uploadDate = doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "";

        return `
            <div class="file-item-card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
                    <div style="font-size: 24px;">📄</div>
                    <div style="min-width: 0;">
                        <div style="font-weight: 600; color: #0f172a; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(doc.original_filename)}">
                            ${escapeHTML(doc.original_filename)}
                        </div>
                        <div style="font-size: 12px; color: #64748b; display: flex; gap: 8px;">
                            <span class="badge-tag" style="padding: 2px 6px; font-size: 10px;">${escapeHTML(ext)}</span>
                            <span>${sizeKb}</span>
                            <span>•</span>
                            <span>${uploadDate}</span>
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                    <button type="button" class="btn-small secondary" onclick="downloadPatientDocument('${escapeHTML(doc.document_id)}', '${escapeHTML(doc.original_filename)}')">
                        ⬇️ Download
                    </button>
                    <button type="button" class="btn-small primary" style="background: #0d9488;" onclick="askAiAboutDocument('${escapeHTML(doc.document_id)}', '${escapeHTML(doc.original_filename)}')">
                        🤖 Ask AI
                    </button>
                    <button type="button" class="btn-small danger" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;" onclick="deletePatientDocument('${escapeHTML(doc.document_id)}')">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

async function downloadPatientDocument(documentId, filename) {
    try {
        const response = await fetch(`${API_URL}/api/patient/documents/${encodeURIComponent(documentId)}/download`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        if (!response.ok) {
            throw new Error("Failed to download document.");
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || "medical_document";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (err) {
        showToast(err.message);
    }
}

async function deletePatientDocument(documentId) {
    if (!confirm("Are you sure you want to delete this medical file?")) return;
    try {
        const response = await fetch(`${API_URL}/api/patient/documents/${encodeURIComponent(documentId)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to delete document.");
        }
        showToast("Medical document deleted from PostgreSQL.");
        await loadPatientDocuments();
    } catch (err) {
        showToast(err.message);
    }
}

function askAiAboutDocument(documentId, filename) {
    currentAiDocumentContext = { documentId, filename };
    openAiChatMode();
    const input = $("aiChatInput");
    if (input) {
        input.value = `Explain my uploaded file "${filename}".`;
        input.focus();
    }
}

/* ================= SESSION RESUME ON DOMContentLoaded ================= */

window.addEventListener("DOMContentLoaded", () => {
    const pToken = localStorage.getItem("patientToken");
    if (pToken) {
        patientToken = pToken;
        loadPatientDashboard().catch(err => {
            console.warn("Auto-load patient dashboard notice:", err.message);
            goHome();
        });
    } else {
        const dToken = localStorage.getItem("doctorToken");
        if (dToken) {
            hideAll();
            if ($("doctorDashboard")) $("doctorDashboard").classList.remove("hidden");
        } else {
            goHome();
        }
    }
});

/* ================= EXPOSE TO GLOBAL WINDOW SCOPE ================= */

window.openDoctorRegisterModal = openDoctorRegisterModal;
window.closeDoctorRegisterModal = closeDoctorRegisterModal;
window.submitDoctorRegistration = submitDoctorRegistration;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.submitRegistration = submitRegistration;
window.openDoctorChatMode = openDoctorChatMode;
window.openAiChatMode = openAiChatMode;
window.openFileUploadModal = openFileUploadModal;
window.closeFileUploadModal = closeFileUploadModal;
window.handleFileSelected = handleFileSelected;
window.submitFileUpload = submitFileUpload;
window.loadPatientDocuments = loadPatientDocuments;
window.renderPatientDocuments = renderPatientDocuments;
window.downloadPatientDocument = downloadPatientDocument;
window.deletePatientDocument = deletePatientDocument;
window.askAiAboutDocument = askAiAboutDocument;
window.showProfileEdit = showProfileEdit;
window.hideProfileEdit = hideProfileEdit;
window.saveDetails = saveDetails;
window.showSecondaryEdit = showSecondaryEdit;
window.hideSecondaryEdit = hideSecondaryEdit;
window.showHealthEdit = showHealthEdit;
window.hideHealthEdit = hideHealthEdit;
window.saveSecondaryDetailsFromPanel = saveSecondaryDetailsFromPanel;
window.saveHealthInformation = saveHealthInformation;
window.saveSecondaryGuardian = saveSecondaryGuardian;
window.showVerificationManage = showVerificationManage;
window.setHealthValue = setHealthValue;
window.toggleChat = toggleChat;
window.switchChatMode = switchChatMode;

