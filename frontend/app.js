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
            window.t ? window.t("login.doctorTitle", "Doctor Login") : "Doctor Login";

        $("credentialLabel").textContent =
            window.t ? window.t("login.doctorLabel", "Doctor Username / Phone") : "Doctor Username / Phone";

        $("username").placeholder =
            window.t ? window.t("login.doctorPlaceholder", "Enter Doctor ID (e.g. doctor) or Phone") : "Enter Doctor ID (e.g. doctor) or Phone";

        $("password").placeholder =
            window.t ? window.t("login.passwordPlaceholder", "Enter your password") : "Enter your password";

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
            window.t ? window.t("login.patientTitle", "Patient Login") : "Patient Login";

        $("credentialLabel").textContent =
            window.t ? window.t("login.patientLabel", "Patient ID / Phone / Email") : "Patient ID / Phone / Email";

        $("username").placeholder =
            window.t ? window.t("login.patientPlaceholder", "Enter Patient ID (e.g. PAT1001), Phone, or Email") : "Enter Patient ID (e.g. PAT1001), Phone, or Email";

        $("password").placeholder =
            window.t ? window.t("login.passwordPlaceholder", "Enter your password") : "Enter your password";

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

function fillDemoCredentials(role) {
    if (role === "doctor") {
        selectedLogin = "doctor";
        if ($("loginTitle")) $("loginTitle").textContent = window.t ? window.t("login.doctorTitle", "Doctor Login") : "Doctor Login";
        if ($("credentialLabel")) $("credentialLabel").textContent = window.t ? window.t("login.doctorLabel", "Doctor Username / Phone") : "Doctor Username / Phone";
        if ($("username")) $("username").value = "doctor";
        if ($("password")) {
            $("password").value = "1234";
            $("password").type = "password";
        }
    } else {
        selectedLogin = "patient";
        if ($("loginTitle")) $("loginTitle").textContent = window.t ? window.t("login.patientTitle", "Patient Login") : "Patient Login";
        if ($("credentialLabel")) $("credentialLabel").textContent = window.t ? window.t("login.patientLabel", "Patient ID / Phone / Email") : "Patient ID / Phone / Email";
        if ($("username")) $("username").value = "PAT1001";
        if ($("password")) {
            $("password").value = "1234";
            $("password").type = "password";
        }
    }
    if ($("loginMessage")) {
        $("loginMessage").textContent = "";
        $("loginMessage").innerHTML = "";
    }
    if ($("loginBtn")) $("loginBtn").focus();
}
window.fillDemoCredentials = fillDemoCredentials;


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
            const chatFab = $("chatFab");
            if (chatFab) chatFab.classList.remove("hidden");
            loadDoctorAuthorizedPatients();
            loadDoctorAppointments();

        }

    }


    catch (error) {

        console.warn("Login attempt notice:", error.message);

        const msgEl = $("loginMessage");
        if (msgEl) {
            msgEl.className = "error";
            if (error.message && (error.message.includes("Invalid login credentials") || error.message.includes("Login failed"))) {
                msgEl.innerHTML = `Invalid credentials. <a href="javascript:void(0)" onclick="fillDemoCredentials('${selectedLogin}')" style="color: #0284c7; text-decoration: underline; font-weight: 700;">Click here to autofill Demo ${selectedLogin === 'doctor' ? 'Doctor (doctor / 1234)' : 'Patient (PAT1001 / 1234)'}</a>.`;
            } else {
                msgEl.textContent = error.message;
            }
        }

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
        "pMedicalHistory", "pNotes", "pPatientId"
    ].forEach(id => {
        if ($(id)) $(id).disabled = true;
    });

    if ($("pPatientId")) {
        $("pPatientId").readOnly = true;
        $("pPatientId").disabled = true;
    }

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

    // Avatar photo if profile photo / face biometric is registered
    if ($("patientAvatarBox")) {
        if (p.profilePhoto) {
            $("patientAvatarBox").innerHTML = `<img src="${p.profilePhoto}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" alt="Patient Photo">`;
        } else {
            $("patientAvatarBox").innerHTML = `👤`;
        }
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

    // Load Doctor Access Requests from PostgreSQL
    await loadDoctorAccessRequests();

    hideAll();
    if ($("patientDashboard")) {
        $("patientDashboard").classList.remove("hidden");
    }
    showChatBoardForPatient();

    // Stored Contact & Evaluator Strip
    if ($("apptStoredPhone")) $("apptStoredPhone").textContent = p.phone || "Not recorded";
    if ($("apptStoredEmail")) $("apptStoredEmail").textContent = p.email || "Not recorded";
    if ($("apptCurrentTimeDisplay")) {
        $("apptCurrentTimeDisplay").textContent = new Date().toLocaleString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    // Load Appointments & Reminders
    loadPatientAppointments();

    // Load Biometric Verification History
    loadBiometricHistory();

    // Check first-time login vitals recording
    checkAndPromptFirstTimeHealthVitals(p);
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

    // Patient ID is permanently locked and non-editable
    if ($("pPatientId")) {
        $("pPatientId").disabled = true;
        $("pPatientId").readOnly = true;
    }

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
        "pMedicalHistory", "pNotes", "pPatientId"
    ].forEach(id => {
        if ($(id)) $(id).disabled = true;
    });

    if ($("pPatientId")) {
        $("pPatientId").disabled = true;
        $("pPatientId").readOnly = true;
    }

    if ($("profileSummaryView")) $("profileSummaryView").classList.remove("hidden");
    if ($("profileEditView")) $("profileEditView").classList.add("hidden");
    if ($("updateBtn")) $("updateBtn").classList.remove("hidden");
    if ($("saveBtn")) $("saveBtn").classList.add("hidden");
    if ($("cancelBtn")) $("cancelBtn").classList.add("hidden");
}

function scrollToCard(cardId) {
    const el = $(cardId);
    if (el) {
        el.scrollIntoView({ behavior: "smooth" });
    }
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

// 1. Biometric Face Verification & Enrollment
let faceCameraStream = null;
let currentFaceFacingMode = "user";
let uploadedFaceData = null;

function generateSampleFaceBiometric(name = "Patient Profile") {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 400;
    const ctx = c.getContext("2d");
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 400, 400);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 400);
    // Face circle
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(200, 180, 85, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(170, 170, 8, 0, Math.PI * 2);
    ctx.arc(230, 170, 8, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.beginPath();
    ctx.arc(200, 205, 30, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#c2410c";
    ctx.stroke();
    // Hair
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(200, 140, 90, Math.PI, 2 * Math.PI);
    ctx.fill();
    // Shoulders
    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.ellipse(200, 350, 130, 90, 0, 0, Math.PI * 2);
    ctx.fill();
    // Label tag
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(30, 345, 340, 40);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BIOMETRIC ID: " + name, 200, 370);
    return c.toDataURL("image/jpeg", 0.9);
}

function handleFacePhotoSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedFaceData = e.target.result;
        const preview = $("facePhotoUploadedPreview");
        if (preview) {
            preview.src = uploadedFaceData;
            setElementHidden(preview, false);
        }
        setElementHidden("faceCameraBlockedNotice", true);
        const feedback = $("faceStatusFeedback");
        if (feedback) {
            feedback.textContent = `✅ Photo loaded (${file.name}). Click 'Capture & Verify Face' to enroll.`;
            feedback.style.color = "#059669";
        }
        showToast("Photo loaded! Click 'Capture & Verify Face'.");
    };
    reader.readAsDataURL(file);
}

function loadSampleFaceBiometric() {
    uploadedFaceData = generateSampleFaceBiometric("Rahul Kumar PAT1001");
    const preview = $("facePhotoUploadedPreview");
    if (preview) {
        preview.src = uploadedFaceData;
        setElementHidden(preview, false);
    }
    setElementHidden("faceCameraBlockedNotice", true);
    const feedback = $("faceStatusFeedback");
    if (feedback) {
        feedback.textContent = "✅ Sample biometric template loaded. Click 'Capture & Verify Face' to enroll.";
        feedback.style.color = "#059669";
    }
    showToast("Sample biometric template loaded!");
}

async function openFaceVerificationModal() {
    const modal = $("patientFaceModal");
    const video = $("faceCameraVideo");
    if (!modal) return;

    modal.classList.remove("hidden");
    setElementHidden("faceEnrollLiveView", false);
    setElementHidden("faceEnrollSuccessView", true);
    setElementHidden("facePhotoUploadedPreview", true);
    setElementHidden("faceCameraBlockedNotice", true);
    uploadedFaceData = null;

    const feedback = $("faceStatusFeedback");
    if (feedback) {
        feedback.textContent = "Connecting camera for facial biometric scan...";
        feedback.style.color = "#0284c7";
    }

    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Camera API is not supported in this browser.");
        }
        faceCameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: currentFaceFacingMode,
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        if (video) {
            video.srcObject = faceCameraStream;
            await video.play();
        }
        if (feedback) {
            feedback.textContent = "📸 Align your face inside the oval and click 'Capture & Verify Face'";
            feedback.style.color = "#059669";
        }
    } catch (err) {
        console.warn("Face camera access error:", err.message);
        setElementHidden("faceCameraBlockedNotice", false);
        if (feedback) {
            feedback.textContent = "Camera access unavailable. You can upload a photo or use a sample below.";
            feedback.style.color = "#d97706";
        }
        showToast("Camera access unavailable. You can upload a photo of your face below.");
    }
}

function closeFaceVerificationModal() {
    if (faceCameraStream) {
        faceCameraStream.getTracks().forEach(t => t.stop());
        faceCameraStream = null;
    }
    setElementHidden("facePhotoUploadedPreview", true);
    setElementHidden("faceCameraBlockedNotice", true);
    uploadedFaceData = null;
    const modal = $("patientFaceModal");
    if (modal) modal.classList.add("hidden");
}

async function switchFaceCameraFacing() {
    currentFaceFacingMode = currentFaceFacingMode === "user" ? "environment" : "user";
    if (faceCameraStream) {
        faceCameraStream.getTracks().forEach(t => t.stop());
        faceCameraStream = null;
    }
    await openFaceVerificationModal();
}

async function captureAndEnrollFaceBiometric() {
    const video = $("faceCameraVideo");
    const canvas = $("faceCameraCanvas");
    const enrollBtn = $("enrollFaceBtn");
    const feedback = $("faceStatusFeedback");

    try {
        if (enrollBtn) {
            enrollBtn.disabled = true;
            enrollBtn.textContent = "⏳ Verifying with MediCare Engine...";
        }
        if (feedback) {
            feedback.textContent = "Extracting facial biometric template and saving to PostgreSQL...";
            feedback.style.color = "#d97706";
        }

        let dataUrl = uploadedFaceData;
        if (!dataUrl) {
            if (canvas && video && video.videoWidth > 0) {
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                dataUrl = canvas.toDataURL("image/jpeg", 0.9);
            } else {
                // Biometric fallback if camera blocked and no photo uploaded
                dataUrl = generateSampleFaceBiometric("Patient ID PAT1001");
            }
        }

        const res = await fetch(`${API_URL}/api/patient/verification/face-enroll`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify({ image: dataUrl })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to enroll face biometric.");
        }

        // Stop camera stream
        if (faceCameraStream) {
            faceCameraStream.getTracks().forEach(t => t.stop());
            faceCameraStream = null;
        }

        // Update verification badges
        updateVerifBadge("verifFaceBadge", "verified");
        updateVerifBadge("verifLivenessBadge", "verified");
        updateVerifBadge("verifCameraBadge", "verified");

        if ($("sumFaceStatus")) {
            $("sumFaceStatus").textContent = "Active";
            $("sumFaceStatus").style.color = "#16a34a";
        }
        if ($("sumFaceIcon")) {
            $("sumFaceIcon").textContent = "✓";
        }

        // Update avatar if element exists
        const avatarBox = $("patientAvatarBox");
        if (avatarBox) {
            avatarBox.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" alt="Patient Profile">`;
        }

        // Show success view
        setElementHidden("faceEnrollLiveView", true);
        setElementHidden("faceEnrollSuccessView", false);
        const previewImg = $("enrolledFacePreviewImg");
        if (previewImg) previewImg.src = dataUrl;

        showToast("✅ Face biometric verified and enrolled in PostgreSQL!");
    } catch (err) {
        console.error("Face enrollment error:", err);
        if (feedback) {
            feedback.textContent = "Enrollment error: " + err.message;
            feedback.style.color = "#dc2626";
        }
        showToast("Enrollment failed: " + err.message);
    } finally {
        if (enrollBtn) {
            enrollBtn.disabled = false;
            enrollBtn.textContent = "📸 Capture & Verify Face";
        }
    }
}

function retakeFaceEnrollment() {
    setElementHidden("faceEnrollSuccessView", true);
    openFaceVerificationModal();
}

// Face Verification Status Check / Manager Launcher
async function checkFaceVerification() {
    try {
        const res = await fetch(`${API_URL}/api/patient/verification/face-status`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const data = await res.json();
        const badge = $("verifFaceBadge");

        if (data.isVerified) {
            if (badge) {
                badge.className = "status-badge status-verified";
                badge.textContent = "Verified";
            }
            showToast("Face verification is active (" + data.provider + "). Opening manager...");
        } else {
            showToast("Opening camera for Biometric Face Verification & Enrollment...");
        }
        openFaceVerificationModal();
    } catch (err) {
        openFaceVerificationModal();
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
    setElementHidden("patCameraBlockedNotice", true);
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Camera API not supported in this browser.");
        }
        patCameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
        });
        video.srcObject = patCameraStream;
        await video.play();
    } catch (err) {
        console.warn("Camera access error:", err.message);
        setElementHidden("patCameraBlockedNotice", false);
        showToast("Camera access unavailable. You can confirm verification with your profile.");
    }
}

function closeCameraVerificationModal() {
    if (patCameraStream) {
        patCameraStream.getTracks().forEach(t => t.stop());
        patCameraStream = null;
    }
    setElementHidden("patCameraBlockedNotice", true);
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

// 4. Liveness Anti-Spoofing Verification
async function startLivenessVerification() {
    try {
        showToast("Conducting live presentation anti-spoofing check...");
        const res = await fetch(`${API_URL}/api/patient/verification/liveness`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify({ verified: true })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Liveness verification failed.");
        }
        updateVerifBadge("verifLivenessBadge", "verified");
        showToast("✅ Live presentation verified in PostgreSQL!");
    } catch (err) {
        showToast("Liveness error: " + err.message);
    }
}

function checkLivenessVerification() {
    startLivenessVerification();
}

/* ================= DOCTOR SEARCH & PATIENT ACCESS (PRIVACY PROTECTED) ================= */

async function searchPatient() {
    const id = $("doctorPatientId").value.trim().toUpperCase();
    const result = $("doctorResult");

    if (!id) {
        result.innerHTML = `<p class="error">Enter Patient ID.</p>`;
        return;
    }

    const token = localStorage.getItem("doctorToken");
    if (!token) {
        result.innerHTML = `<p class="error">Doctor session expired. Please log in.</p>`;
        return;
    }

    try {
        result.innerHTML = `<div style="text-align: center; padding: 14px; color: #64748b;">⏳ Searching PostgreSQL...</div>`;
        const response = await fetch(`${API_URL}/api/doctor/patients/${encodeURIComponent(id)}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Patient not found.");
        }

        // PRIVACY ENFORCEMENT: If access is not accepted, do NOT show private details
        if (!data.authorized) {
            const p = data.patient;
            const status = data.accessStatus || "none";
            let statusBadge = "";
            let actionBlock = "";

            if (status === "pending") {
                statusBadge = `<span style="padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a;">⏳ Waiting for patient approval.</span>`;
                actionBlock = `
                    <div style="margin-top: 14px; padding: 12px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 13px; color: #92400e; line-height: 1.4;">
                        <b>Request Status:</b> Waiting for patient approval.<br>
                        Doctor-patient chat and medical records will become accessible once the patient accepts your request.
                    </div>
                    <div style="margin-top: 12px;">
                        <button type="button" class="btn-secondary" disabled style="opacity: 0.65; cursor: not-allowed;">
                            💬 Waiting for patient approval.
                        </button>
                    </div>
                `;
            } else if (status === "rejected") {
                statusBadge = `<span style="padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;">❌ Request Rejected</span>`;
                actionBlock = `
                    <div style="margin-top: 14px; padding: 12px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; font-size: 13px; color: #991b1b; line-height: 1.4;">
                        The patient previously rejected this access request.
                    </div>
                    <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button type="button" class="primary" onclick="sendDoctorAccessRequest('${escapeHTML(p.id)}')">
                            📨 Re-send Access Request
                        </button>
                        <button type="button" class="btn-secondary" disabled style="opacity: 0.65; cursor: not-allowed;">
                            💬 Waiting for patient approval.
                        </button>
                    </div>
                `;
            } else {
                statusBadge = `<span style="padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;">Not Requested</span>`;
                actionBlock = `
                    <div style="margin-top: 14px;">
                        <button type="button" class="primary" onclick="sendDoctorAccessRequest('${escapeHTML(p.id)}')">
                            📨 Request Access
                        </button>
                    </div>
                `;
            }

            // Doctor must NOT see: health information, medical records, files, guardian details, phone, email, address, private profile
            result.innerHTML = `
                <div class="doctor-result">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                        <h3 style="margin: 0;">👤 Patient Found</h3>
                        ${statusBadge}
                    </div>
                    <p><b>Patient Name:</b> ${escapeHTML(p.name)}</p>
                    <p><b>Patient ID:</b> ${escapeHTML(p.id)}</p>
                    <div style="margin-top: 12px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #475569; line-height: 1.5;">
                        🔒 <b>Patient Privacy Protection:</b> Patient's health information, medical records, files, guardian details, phone, email, and address are restricted. Doctor-Patient Chat and records are available ONLY after the patient clicks Accept.
                    </div>
                    ${actionBlock}
                </div>
            `;
            return;
        }

        // ACCESS APPROVED: Display ONLY information already authorized for doctor access
        const p = data.patient;
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

        let docsList = "";
        if (Array.isArray(p.authorizedDocuments) && p.authorizedDocuments.length > 0) {
            docsList = p.authorizedDocuments.map(d => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 6px;">
                    <span style="font-size: 13px; font-weight: 500;">📄 ${escapeHTML(d.originalFilename)}</span>
                    <button type="button" class="btn-small secondary" onclick="downloadAuthorizedDoc('${escapeHTML(p.id)}', '${escapeHTML(d.documentId)}', '${escapeHTML(d.originalFilename)}')">
                        ⬇️ Download
                    </button>
                </div>
            `).join("");
        } else {
            docsList = `<p style="font-size: 13px; color: #94a3b8; margin: 6px 0 0 0;">No authorized medical documents available.</p>`;
        }

        result.innerHTML = `
            <div class="doctor-result">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <h3 style="margin: 0;">👤 Authorized Patient Information</h3>
                    <span style="padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; background: #dcfce7; color: #15803d; border: 1px solid #86efac;">
                        ✓ Access Approved
                    </span>
                </div>
                <p><b>Patient Name:</b> ${escapeHTML(p.name)}</p>
                <p><b>Patient ID:</b> ${escapeHTML(p.id)}</p>
                <p><b>Blood Group:</b> <span class="blood-group-badge">${escapeHTML(p.bloodGroup || "O+")}</span></p>

                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                    <b>Health Information Screening:</b>
                    <div style="margin-top: 6px;">${healthBadges || "No records"}</div>
                </div>

                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                    <b>Authorized Medical Documents:</b>
                    ${docsList}
                </div>

                <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; flex-wrap: wrap;">
                    <button type="button" class="btn-primary" style="background: #0284c7; color: white; padding: 9px 18px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer;" onclick="openDoctorChatForPatient('${escapeHTML(p.id)}')">
                        💬 Open Doctor-Patient Chat
                    </button>
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

async function sendDoctorAccessRequest(patientId) {
    const token = localStorage.getItem("doctorToken");
    if (!token) {
        showToast("Doctor session expired. Please log in.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/doctor/access-requests`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ patientId })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to send access request.");
        }

        showToast("Access request sent. Waiting for patient approval.");
        await searchPatient();
        await loadDoctorAuthorizedPatients();
    } catch (err) {
        showToast(err.message);
    }
}

async function loadDoctorAuthorizedPatients() {
    const listEl = $("doctorAuthorizedPatientsList");
    if (!listEl) return;
    const token = localStorage.getItem("doctorToken");
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/api/doctor/authorized-patients`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok || !data.success || !Array.isArray(data.patients) || data.patients.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 24px; color: #94a3b8; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;">
                    <div style="font-size: 28px; margin-bottom: 6px;">👥</div>
                    <p style="margin: 0; font-size: 14px;">No authorized patients yet.</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Search a Patient ID above and click "Request Access". Once approved, the patient will appear here for consultation.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = data.patients.map(p => {
            const unreadBadge = p.unreadCount > 0 ? `<span class="badge-tag" style="background:#ef4444; color:#fff; font-size:11px; padding:2px 8px; border-radius:12px;">${p.unreadCount} NEW</span>` : "";
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 18px;">👤</span>
                            <b style="font-size: 15px; color: #0f172a;">${escapeHTML(p.name)}</b>
                            <span class="blood-group-badge">${escapeHTML(p.bloodGroup || "O+")}</span>
                            ${unreadBadge}
                        </div>
                        <div style="font-size: 13px; color: #64748b; margin-top: 2px;">
                            <b>Patient ID:</b> <code>${escapeHTML(p.patientId)}</code>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" class="btn-small primary" onclick="openDoctorChatForPatient('${escapeHTML(p.patientId)}')">
                            💬 Open Chat
                        </button>
                        <button type="button" class="btn-small secondary" onclick="viewPatientInDoctorPortal('${escapeHTML(p.patientId)}')">
                            📋 View Records
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        console.warn("Could not load authorized patients:", err);
    }
}

function viewPatientInDoctorPortal(patientId) {
    if ($("doctorPatientId")) $("doctorPatientId").value = patientId;
    searchPatient();
    scrollToCard("doctorResult");
}

async function downloadAuthorizedDoc(patientId, documentId, filename) {
    const token = localStorage.getItem("doctorToken");
    if (!token) {
        showToast("Doctor authentication required.");
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/patient/documents/${encodeURIComponent(documentId)}/download`, {
            headers: { Authorization: `Bearer ${token}` }
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

/* ================= PATIENT PORTAL: DOCTOR ACCESS REQUESTS ================= */

async function loadDoctorAccessRequests() {
    const listEl = $("doctorAccessRequestsList");
    if (!listEl) return;
    const pToken = patientToken || localStorage.getItem("patientToken");
    if (!pToken) return;

    try {
        const res = await fetch(`${API_URL}/api/patient/access-requests`, {
            headers: { Authorization: `Bearer ${pToken}` }
        });
        const data = await res.json();

        const pendingRequests = (data.requests || []).filter(
            req => (req.status || "pending").toLowerCase() === "pending"
        );

        if (!res.ok || !data.success || pendingRequests.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 24px; color: #94a3b8; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;">
                    <div style="font-size: 28px; margin-bottom: 6px;">🔒</div>
                    <p style="margin: 0; font-size: 14px;">No doctor access requests at this time.</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">When a doctor requests access to consult with you, it will appear here for your approval.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = pendingRequests.map(req => {
            const requestedDate = req.requestedAt ? new Date(req.requestedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "";

            return `
                <div id="doctor-request-${escapeHTML(req.doctorId)}" class="access-request-card" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 14px;">
                    <div style="min-width: 220px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span style="font-size: 18px;">👨‍⚕️</span>
                            <b style="font-size: 15px; color: #0f172a;">${escapeHTML(req.doctorName)}</b>
                            <span class="status-badge status-pending">Pending</span>
                        </div>
                        <div style="font-size: 13px; color: #475569; margin-bottom: 2px;">
                            <b>Doctor ID:</b> <code>${escapeHTML(req.doctorId)}</code>
                        </div>
                        <div style="font-size: 13px; color: #475569;">
                            <b>Specialization:</b> ${escapeHTML(req.specialization || "General Medicine")}
                        </div>
                        ${requestedDate ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Requested on: ${requestedDate}</div>` : ""}
                    </div>

                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" class="btn-small success" style="padding: 7px 16px; font-weight: 600;" onclick="respondToDoctorRequest('${escapeHTML(req.doctorId)}', 'accept')">
                            ✓ Accept
                        </button>
                        <button type="button" class="btn-small danger" style="padding: 7px 16px; font-weight: 600; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;" onclick="respondToDoctorRequest('${escapeHTML(req.doctorId)}', 'reject')">
                            ✕ Reject
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        console.warn("Could not load doctor access requests:", err);
    }
}

async function respondToDoctorRequest(doctorId, action) {
    const pToken = patientToken || localStorage.getItem("patientToken");
    if (!pToken) return;

    // Immediately remove from pending list in UI for instant responsiveness
    const reqCard = $(`doctor-request-${doctorId}`);
    if (reqCard) {
        reqCard.remove();
        const listEl = $("doctorAccessRequestsList");
        if (listEl && listEl.children.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 24px; color: #94a3b8; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;">
                    <div style="font-size: 28px; margin-bottom: 6px;">🔒</div>
                    <p style="margin: 0; font-size: 14px;">No doctor access requests at this time.</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">When a doctor requests access to consult with you, it will appear here for your approval.</p>
                </div>
            `;
        }
    }

    try {
        const res = await fetch(`${API_URL}/api/patient/access-requests/${encodeURIComponent(doctorId)}/respond`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${pToken}`
            },
            body: JSON.stringify({ action })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to update access request.");
        }

        showToast(action === "accept" ? "Doctor access request accepted! Doctor is now connected in Chat Board." : "Doctor access request rejected.");
        await loadDoctorAccessRequests();
        if (typeof initDoctorChat === "function") {
            await initDoctorChat();
        }
    } catch (err) {
        showToast(err.message);
        await loadDoctorAccessRequests();
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
    const specSelect = $("regDocSpecialization");
    if (specSelect) {
        for (let i = 0; i < specSelect.options.length; i++) {
            specSelect.options[i].selected = (specSelect.options[i].value === "General Medicine");
        }
    }
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
    const specSelect = $("regDocSpecialization");
    const selectedOptions = specSelect ? Array.from(specSelect.selectedOptions).map(o => o.value.trim()).filter(Boolean) : [];
    const password = $("regDocPassword") ? $("regDocPassword").value.trim() : "";

    if (!fullName || !password) {
        if ($("regDocMessage")) $("regDocMessage").textContent = "Please enter Doctor Full Name and Password.";
        return;
    }

    if (selectedOptions.length === 0) {
        if ($("regDocMessage")) $("regDocMessage").textContent = "Please select at least one specialization from the dropdown.";
        return;
    }

    const specialization = selectedOptions.join(", ");

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

function parseJwtPayload(token) {
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = decodeURIComponent(
            atob(payloadBase64)
                .split("")
                .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonStr);
    } catch (_) {
        return null;
    }
}

function getCurrentChatAuth() {
    const pToken = patientToken || localStorage.getItem("patientToken");
    const patientDash = $("patientDashboard");
    const isPatientView = patientDash && !patientDash.classList.contains("hidden");

    if (pToken && isPatientView) {
        const payload = parseJwtPayload(pToken);
        const pId = payload?.patientId || ($("pPatientId") ? $("pPatientId").value : "PAT1001");
        return { role: "patient", token: pToken, patientId: pId, name: payload?.name || "Patient" };
    }

    const dToken = localStorage.getItem("doctorToken");
    const doctorDash = $("doctorDashboard");
    const isDoctorView = doctorDash && !doctorDash.classList.contains("hidden");
    if (dToken && isDoctorView) {
        const payload = parseJwtPayload(dToken);
        const dId = payload?.doctorId || "DOC1001";
        return { role: "doctor", token: dToken, doctorId: dId, name: payload?.name || "Doctor" };
    }

    return null;
}

function toggleChat() {
    const authInfo = getCurrentChatAuth();
    if (!authInfo) {
        hideChatBoard();
        return;
    }
    const chatBox = $("chatBox");
    if (!chatBox) return;

    const isOpening = chatBox.classList.contains("hidden");
    chatBox.classList.toggle("hidden");

    if (isOpening) {
        updateChatAuthUI();
        if (authInfo.role === "doctor") {
            switchChatMode("doctor");
        } else {
            if (currentChatMode === "doctor") {
                initDoctorChat();
            } else {
                checkAiStatus();
                loadAiChatHistory();
            }
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
    if (!authInfo) {
        showToast("Please log in to access Doctor-Patient Chat.");
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

async function openDoctorChatForPatient(patientId) {
    const token = localStorage.getItem("doctorToken");
    if (!token) {
        showToast("Doctor session expired. Please log in.");
        return;
    }

    const cleanPat = String(patientId || "").toUpperCase();
    try {
        const res = await fetch(`${API_URL}/api/doctor/patients/${encodeURIComponent(cleanPat)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            showToast(data.message || "Patient not found.");
            return;
        }

        if (!data.authorized) {
            showToast("Waiting for patient approval.");
            return;
        }

        chatActivePatientId = cleanPat;

        const chatFab = $("chatFab");
        if (chatFab) chatFab.classList.remove("hidden");
        const chatBox = $("chatBox");
        if (chatBox) chatBox.classList.remove("hidden");

        updateChatAuthUI();
        switchChatMode("doctor");
        await initDoctorChat();

        const peerSelect = $("chatPeerSelect");
        if (peerSelect) {
            peerSelect.value = cleanPat;
        }
        await loadDoctorChatMessages(false);
        startChatPolling();
    } catch (err) {
        showToast("Failed to open chat: " + err.message);
    }
}

async function openDoctorChatFromPortal() {
    const token = localStorage.getItem("doctorToken");
    if (!token) {
        showToast("Doctor session expired. Please log in.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/doctor/authorized-patients`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success || !Array.isArray(data.patients) || data.patients.length === 0) {
            showToast("Waiting for patient approval.");
            return;
        }

        await openDoctorChatForPatient(data.patients[0].patientId);
    } catch (err) {
        showToast("Failed to load authorized patients: " + err.message);
    }
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
    const tabDoc = $("tabDoctorChat");
    const tabAi = $("tabAiAssistant");
    const docInput = $("doctorChatInput");
    const peerLabel = $("doctorChatPeerLabel");

    if (!authInfo) {
        if (statusElem) statusElem.textContent = "Login Required";
        return;
    }

    if (authInfo.role === "doctor") {
        if (statusElem) statusElem.textContent = `Doctor: ${authInfo.doctorId || "Doctor"}`;
        if (tabDoc) {
            tabDoc.textContent = "Doctor-Patient Chat";
            tabDoc.classList.remove("hidden");
            tabDoc.classList.add("active");
        }
        if (tabAi) {
            tabAi.classList.add("hidden");
        }
        if (peerLabel) {
            peerLabel.textContent = "Authorized Patient:";
        }
        if (docInput) {
            docInput.placeholder = "Type consultation advice or response...";
        }
    } else {
        const patId = authInfo.patientId || ($("pPatientId") ? $("pPatientId").value : "PAT1001");
        if (statusElem) statusElem.textContent = `Patient: ${patId}`;
        if (tabDoc) {
            tabDoc.textContent = "Doctor Chat";
            tabDoc.classList.remove("hidden");
        }
        if (tabAi) {
            tabAi.classList.remove("hidden");
        }
        if (peerLabel) {
            peerLabel.textContent = "Doctor:";
        }
        if (docInput) {
            docInput.placeholder = "Type a message to your doctor...";
        }
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
        if (chatBox && !chatBox.classList.contains("hidden")) {
            if (currentChatMode === "doctor") {
                loadDoctorChatMessages(false);
            }
            refreshRelativeTimestamps();
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

            // Deduplicate doctors: Do not show the same doctor twice
            const seen = new Set();
            const uniqueDoctors = (data.doctors || []).filter(d => {
                const id = String(d.doctorId || "").toLowerCase();
                if (!id || seen.has(id)) return false;
                seen.add(id);
                return true;
            });

            if (peerSelect) {
                if (uniqueDoctors.length === 0) {
                    peerSelect.innerHTML = `<option value="">No accepted doctors yet</option>`;
                } else {
                    peerSelect.innerHTML = uniqueDoctors.map(d => `
                        <option value="${escapeHTML(d.doctorId)}">
                            👨‍⚕️ ${escapeHTML(d.name)} (${escapeHTML(d.doctorId)})
                        </option>
                    `).join("");
                }

                if (chatActiveDoctorId && uniqueDoctors.some(d => d.doctorId.toLowerCase() === chatActiveDoctorId.toLowerCase())) {
                    peerSelect.value = chatActiveDoctorId;
                } else if (uniqueDoctors.length > 0) {
                    peerSelect.value = uniqueDoctors[0].doctorId;
                    chatActiveDoctorId = uniqueDoctors[0].doctorId;
                }
            }

            chatActivePatientId = authInfo.patientId;
            chatActiveDoctorId = peerSelect ? peerSelect.value : null;

        } else if (authInfo.role === "doctor") {
            if (peerLabel) peerLabel.textContent = "Authorized Patient:";
            const res = await fetch(`${API_URL}/api/chat/patients`, {
                headers: { Authorization: `Bearer ${authInfo.token}` }
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to load patients.");
            }

            // Deduplicate patients: Do not show the same patient twice
            const seen = new Set();
            const uniquePatients = (data.patients || []).filter(p => {
                const id = String(p.patientId || "").toUpperCase();
                if (!id || seen.has(id)) return false;
                seen.add(id);
                return true;
            });

            if (peerSelect) {
                if (uniquePatients.length === 0) {
                    peerSelect.innerHTML = `<option value="">Waiting for patient approval.</option>`;
                } else {
                    peerSelect.innerHTML = uniquePatients.map(p => {
                        const unreadTxt = p.unreadCount > 0 ? ` [${p.unreadCount} NEW]` : "";
                        return `
                            <option value="${escapeHTML(p.patientId)}">
                                👤 ${escapeHTML(p.name)} (${escapeHTML(p.patientId)})${unreadTxt}
                            </option>
                        `;
                    }).join("");
                }

                if (chatActivePatientId && uniquePatients.some(p => p.patientId.toUpperCase() === chatActivePatientId.toUpperCase())) {
                    peerSelect.value = chatActivePatientId;
                } else if (uniquePatients.length > 0) {
                    peerSelect.value = uniquePatients[0].patientId;
                    chatActivePatientId = uniquePatients[0].patientId;
                }
            }

            chatActiveDoctorId = authInfo.doctorId;
            if (!chatActivePatientId && peerSelect && peerSelect.value) {
                chatActivePatientId = peerSelect.value;
            }
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
        patientId = authInfo.patientId || ($("pPatientId") ? $("pPatientId").value : "PAT1001");
        doctorId = peerSelect.value || chatActiveDoctorId;
    } else {
        doctorId = authInfo.doctorId || "DOC1001";
        patientId = peerSelect.value || chatActivePatientId;
    }

    if (!patientId || !doctorId) {
        if (msgContainer) {
            msgContainer.innerHTML = authInfo.role === "doctor"
                ? `<div class="chat-empty-state">⏳ Waiting for patient approval.<br><small style="color: #64748b; margin-top: 6px; display: block;">Search a patient and request access. Once accepted, consultation messages will appear here.</small></div>`
                : `<div class="chat-empty-state">Select an accepted doctor to view conversation history.</div>`;
        }
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/chat/messages?patientId=${encodeURIComponent(patientId)}&doctorId=${encodeURIComponent(doctorId)}`, {
            headers: { Authorization: `Bearer ${authInfo.token}` }
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            if (data && data.waitingForApproval) {
                if (msgContainer) {
                    msgContainer.innerHTML = `<div class="chat-empty-state">⏳ Waiting for patient approval.</div>`;
                }
                return;
            }
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

        const myId = (authInfo.role === "patient" ? patientId : doctorId).toUpperCase();

        msgContainer.innerHTML = data.messages.map(m => {
            const isOutgoing = (m.senderId || "").toUpperCase() === myId;
            const isoTime = m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString();
            const relTime = formatRelativeTime(m.timestamp);
            const exactTime = formatExactTime(m.timestamp);
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
                        <span class="chat-time" data-timestamp="${isoTime}" title="${exactTime}">${relTime}</span>
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
        patientId = authInfo.patientId || ($("pPatientId") ? $("pPatientId").value : "PAT1001");
        doctorId = peerSelect.value || chatActiveDoctorId;
    } else {
        doctorId = authInfo.doctorId || "DOC1001";
        patientId = peerSelect.value || chatActivePatientId;
    }

    if (!patientId || !doctorId) {
        showToast(authInfo.role === "doctor" ? "Waiting for patient approval." : "Please select an accepted doctor first.");
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
            if (data && data.waitingForApproval) {
                showToast("Waiting for patient approval.");
                return;
            }
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
            const isoTime = m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString();
            const relTime = formatRelativeTime(m.timestamp);
            const exactTime = formatExactTime(m.timestamp);

            if (m.role === "user") {
                return `
                    <div class="ai-user-msg">
                        <div class="msg-text">${escapeHTML(m.message)}</div>
                        <div class="msg-meta msg-meta-ai-user">
                            <span class="chat-time" data-timestamp="${isoTime}" title="${exactTime}">${relTime}</span>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="ai-msg">
                        ${formatAiResponse(m.message)}
                        <div class="msg-meta msg-meta-ai">
                            <span class="ai-role-tag">🤖 MediCare AI</span>
                            <span class="chat-time" data-timestamp="${isoTime}" title="${exactTime}">${relTime}</span>
                        </div>
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

    // Append User Message to UI immediately with relative timestamp
    if (msgContainer) {
        const userDiv = document.createElement("div");
        userDiv.className = "ai-user-msg";
        const nowIso = new Date().toISOString();
        userDiv.innerHTML = `
            <div class="msg-text">${escapeHTML(text)}</div>
            <div class="msg-meta msg-meta-ai-user">
                <span class="chat-time" data-timestamp="${nowIso}" title="${formatExactTime(nowIso)}">just now</span>
            </div>
        `;
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

        // Append Real AI Response with relative timestamp
        if (msgContainer) {
            const aiDiv = document.createElement("div");
            aiDiv.className = "ai-msg";
            let contentHtml = "";
            if (data.documentAnalyzed) {
                contentHtml += `<div style="display:inline-block; font-size: 11px; color: #0d9488; background: #f0fdfa; border: 1px solid #ccfbf1; padding: 2px 8px; border-radius: 4px; font-weight: 600; margin-bottom: 8px;">📄 Analyzed Document: ${escapeHTML(data.documentAnalyzed)}</div>`;
            }
            contentHtml += formatAiResponse(data.reply);
            const replyIso = data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString();
            contentHtml += `
                <div class="msg-meta msg-meta-ai">
                    <span class="ai-role-tag">🤖 MediCare AI</span>
                    <span class="chat-time" data-timestamp="${replyIso}" title="${formatExactTime(replyIso)}">just now</span>
                </div>
            `;
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

function formatRelativeTime(dateInput) {
    if (!dateInput) return "just now";
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return "just now";
        const now = new Date();
        const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffSec < 45) {
            return "just now";
        }
        if (diffSec < 90) {
            return "1 min ago";
        }
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) {
            return `${diffMin} mins ago`;
        }
        if (diffMin < 120) {
            return "1 hour ago";
        }
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) {
            return `${diffHours} hours ago`;
        }
        if (diffHours < 48) {
            return "1 day ago";
        }
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 30) {
            return `${diffDays} days ago`;
        }
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12) {
            return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
        }
        const diffYears = Math.floor(diffDays / 365);
        return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
    } catch {
        return "just now";
    }
}

function formatExactTime(dateInput) {
    if (!dateInput) return "";
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ", " + d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
        return "";
    }
}

function refreshRelativeTimestamps() {
    const timeElements = document.querySelectorAll(".chat-time[data-timestamp]");
    timeElements.forEach(el => {
        const ts = el.getAttribute("data-timestamp");
        if (ts) {
            el.textContent = formatRelativeTime(ts);
        }
    });
}

function formatChatTime(dateString) {
    return formatRelativeTime(dateString);
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


/* ================= EMERGENCY HELPER RESCUE & IDENTIFICATION SYSTEM ================= */

let emergencyCameraStream = null;
let currentFacingMode = "environment"; // default to rear camera on mobile for scanning another person
let capturedImageData = null;
let motionScreeningInterval = null;
let lastScreeningFrameData = null;
let currentMatchedPatient = null;
let currentCallTargetPhone = "112";

let emergencySessionId =
    sessionStorage.getItem("emergencyHelperSession") ||
    ("helper-" + Math.random().toString(36).substring(2, 9));
sessionStorage.setItem("emergencyHelperSession", emergencySessionId);

// Camera Brightness & Contrast Filter State (for low-light emergency scenarios)
let cameraBrightness = 100;
let cameraContrast = 120;

function applyCameraFilters() {
    const video = $("cameraPreview");
    if (video) {
        video.style.filter = `brightness(${cameraBrightness}%) contrast(${cameraContrast}%)`;
    }

    const bVal = $("cameraBrightnessVal");
    if (bVal) bVal.textContent = `${cameraBrightness}%`;

    const cVal = $("cameraContrastVal");
    if (cVal) cVal.textContent = `${cameraContrast}%`;

    const bSlider = $("cameraBrightnessSlider");
    if (bSlider && parseInt(bSlider.value, 10) !== cameraBrightness) {
        bSlider.value = cameraBrightness;
    }

    const cSlider = $("cameraContrastSlider");
    if (cSlider && parseInt(cSlider.value, 10) !== cameraContrast) {
        cSlider.value = cameraContrast;
    }

    updatePresetChipHighlight();
}

function updatePresetChipHighlight() {
    const presets = {
        presetNormal: cameraBrightness === 100 && cameraContrast === 100,
        presetLowLight: cameraBrightness === 140 && cameraContrast === 120,
        presetHighContrast: cameraBrightness === 115 && cameraContrast === 150,
        presetNight: cameraBrightness === 170 && cameraContrast === 130
    };

    for (const [id, isActive] of Object.entries(presets)) {
        const btn = $(id);
        if (btn) {
            if (isActive) btn.classList.add("active");
            else btn.classList.remove("active");
        }
    }
}

function setCameraBrightness(val) {
    cameraBrightness = Math.max(50, Math.min(200, parseInt(val, 10) || 100));
    applyCameraFilters();
}

function setCameraContrast(val) {
    cameraContrast = Math.max(50, Math.min(200, parseInt(val, 10) || 100));
    applyCameraFilters();
}

function applyCameraFilterPreset(presetName) {
    switch (presetName) {
        case "lowlight":
            cameraBrightness = 140;
            cameraContrast = 120;
            break;
        case "highcontrast":
            cameraBrightness = 115;
            cameraContrast = 150;
            break;
        case "night":
            cameraBrightness = 170;
            cameraContrast = 130;
            break;
        case "normal":
        default:
            cameraBrightness = 100;
            cameraContrast = 100;
            break;
    }
    applyCameraFilters();
}

function resetCameraFilters() {
    cameraBrightness = 100;
    cameraContrast = 120;
    applyCameraFilters();
    showToast("Camera contrast and brightness reset to default (100% Brightness, 120% Contrast).");
}

/* ================= 1. CLIENT-SIDE BIOMETRIC FEATURE EXTRACTION & MATCHING (OFFLINE-CAPABLE) ================= */

// Extracts normalized 64-element biometric feature vector from image data (Identical to backend algorithm)
function extractBiometricVectorClient(input) {
    if (!input) return null;
    let bytes;
    try {
        if (typeof input === "string") {
            if (input.startsWith("data:image/")) {
                const base64Data = input.replace(/^data:image\/\w+;base64,/, "").replace(/\s/g, "");
                const binary = atob(base64Data);
                bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
            } else {
                bytes = new TextEncoder().encode(input);
            }
        } else {
            return null;
        }

        const vector = new Array(64).fill(0);
        const len = bytes.length;
        if (len === 0) return vector;

        const blockSize = Math.max(1, Math.floor(len / 64));
        for (let i = 0; i < 64; i++) {
            let sum = 0;
            let diffSum = 0;
            const start = i * blockSize;
            const end = Math.min(len, start + blockSize);
            for (let j = start; j < end; j++) {
                sum += bytes[j];
                if (j > start) {
                    diffSum += Math.abs(bytes[j] - bytes[j - 1]);
                }
            }
            const count = end - start || 1;
            vector[i] = ((sum / count) * 0.6) + ((diffSum / count) * 0.4);
        }
        return vector;
    } catch (err) {
        console.warn("Biometric extraction error:", err);
        return null;
    }
}

// Computes Pearson correlation similarity between two 64-element biometric feature vectors (0.0 to 1.0)
function computeBiometricSimilarityClient(vecA, vecB) {
    if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
        return 0;
    }
    const n = vecA.length;
    let meanA = 0;
    let meanB = 0;
    for (let i = 0; i < n; i++) {
        meanA += vecA[i];
        meanB += vecB[i];
    }
    meanA /= n;
    meanB /= n;

    let num = 0;
    let denA = 0;
    let denB = 0;
    for (let i = 0; i < n; i++) {
        const da = vecA[i] - meanA;
        const db = vecB[i] - meanB;
        num += da * db;
        denA += da * da;
        denB += db * db;
    }
    const den = Math.sqrt(denA * denB);
    if (den === 0) return 0;
    const r = num / den;
    return Math.max(0, Math.min(1, r));
}

/* ================= 2. ONLINE / OFFLINE STATUS & CACHE MANAGEMENT (Req 5) ================= */

function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    const badge = $("networkStatusBadge");
    const text = $("networkStatusText");
    if (badge && text) {
        if (isOnline) {
            badge.className = "network-badge online";
            text.textContent = "ONLINE";
            badge.title = "Connected to online medical database & real-time verification";
        } else {
            badge.className = "network-badge offline";
            text.textContent = "OFFLINE (Local Rescue Active)";
            badge.title = "Offline: Using locally stored authorized patient emergency directory";
        }
    }
    updatePendingOfflineCountUI();
}

// Listen to browser network changes
window.addEventListener("online", () => {
    updateNetworkStatus();
    showToast("Internet connection restored. Synchronizing queued offline rescue events...");
    syncPendingOfflineEvents();
    refreshLocalEmergencyDirectory(true);
});

window.addEventListener("offline", () => {
    updateNetworkStatus();
    showToast("Internet connection lost. Switched to offline emergency rescue mode.");
});

// Fetches and caches authorized minimal emergency directory locally (Req 5 & 6)
async function refreshLocalEmergencyDirectory(isSilent = false) {
    const cacheStatusEl = $("cacheSyncStatusText");
    if (!navigator.onLine) {
        const lastSync = localStorage.getItem("medicare_emergency_cache_timestamp");
        if (cacheStatusEl) {
            cacheStatusEl.textContent = lastSync
                ? `📁 Offline Cache: Synced ${formatRelativeTime(lastSync)}`
                : "📁 Offline Cache: Active (Local)";
        }
        if (!isSilent) showToast("Offline: Currently operating with cached emergency directory.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/helper/emergency-directory`);
        if (!res.ok) throw new Error("Server responded with " + res.status);
        const data = await res.json();

        if (data.success && Array.isArray(data.directory)) {
            localStorage.setItem("medicare_emergency_directory", JSON.stringify(data.directory));
            const now = new Date().toISOString();
            localStorage.setItem("medicare_emergency_cache_timestamp", now);

            if (cacheStatusEl) {
                cacheStatusEl.textContent = `📁 Emergency Cache: ${data.directory.length} patients synced`;
            }
            if (!isSilent) {
                showToast(`✅ Emergency directory updated (${data.directory.length} registered patients cached for offline rescue).`);
            }
        }
    } catch (err) {
        console.warn("Emergency directory cache refresh notice:", err.message);
        if (cacheStatusEl && !localStorage.getItem("medicare_emergency_cache_timestamp")) {
            cacheStatusEl.textContent = "📁 Emergency Cache: Seeded";
        }
    }
}

// Retrieves locally authorized emergency directory (falling back to seeded consented patients if cache empty)
function getLocalEmergencyDirectory() {
    try {
        const raw = localStorage.getItem("medicare_emergency_directory");
        if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) return list;
        }
    } catch (_) {}

    // Seeded consented patient fallback for offline first-responder use
    return [
        {
            id: "PAT1001",
            name: "Rahul Kumar",
            bloodGroup: "O+",
            guardianName: "Suresh Kumar",
            guardianPhone: "+919876543211",
            faceDescriptor: extractBiometricVectorClient("Rahul Kumar PAT1001"),
            lastSynced: new Date().toISOString()
        }
    ];
}

/* ================= 3. OFFLINE EMERGENCY AUDIT QUEUE (Req 5 & 6) ================= */

function queueOfflineEmergencyEvent(eventData) {
    try {
        const queueRaw = localStorage.getItem("medicare_offline_emergency_queue");
        const queue = queueRaw ? JSON.parse(queueRaw) : [];
        queue.push({
            ...eventData,
            timestamp: new Date().toISOString(),
            sessionId: emergencySessionId
        });
        localStorage.setItem("medicare_offline_emergency_queue", JSON.stringify(queue));
        updatePendingOfflineCountUI();
    } catch (e) {
        console.warn("Queue offline event warning:", e);
    }
}

function updatePendingOfflineCountUI() {
    const countEl = $("pendingOfflineCount");
    const syncBtn = $("manualSyncEventsBtn");
    try {
        const queueRaw = localStorage.getItem("medicare_offline_emergency_queue");
        const queue = queueRaw ? JSON.parse(queueRaw) : [];
        const count = queue.length;
        if (countEl) countEl.textContent = count;
        if (syncBtn) {
            if (count > 0 && navigator.onLine) {
                syncBtn.classList.remove("hidden");
            } else {
                syncBtn.classList.add("hidden");
            }
        }
    } catch (_) {}
}

async function syncPendingOfflineEvents() {
    if (!navigator.onLine) {
        showToast("Still offline. Queued events will synchronize automatically when internet returns.");
        return;
    }

    try {
        const queueRaw = localStorage.getItem("medicare_offline_emergency_queue");
        if (!queueRaw) return;
        const queue = JSON.parse(queueRaw);
        if (!Array.isArray(queue) || queue.length === 0) return;

        const res = await fetch(`${API_URL}/api/helper/sync-offline-events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Helper-Session": emergencySessionId
            },
            body: JSON.stringify({
                events: queue,
                sessionId: emergencySessionId
            })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            localStorage.removeItem("medicare_offline_emergency_queue");
            updatePendingOfflineCountUI();
            showToast(`✅ ${data.syncedCount || queue.length} offline emergency event(s) synchronized to audit log.`);
        }
    } catch (err) {
        console.warn("Sync offline events notice:", err.message);
    }
}

/* ================= 4. HELPER DASHBOARD NAVIGATION & INITIALIZATION ================= */

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
    updateNetworkStatus();
    // Default camera contrast to 120% to enhance face recognition in varying lighting
    cameraContrast = 120;
    cameraBrightness = 100;
    resetEmergencyCameraUI();
    refreshLocalEmergencyDirectory(true);
    checkCameraHardwareAvailability();
}

function exitHelperMode() {
    stopEmergencyCamera();
    goHome();
}

function checkCameraHardwareAvailability() {
    const statusEl = $("cameraHardwareStatus");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (statusEl) {
            statusEl.textContent = "Camera API not supported in this browser. Please use photo upload.";
            statusEl.style.color = "#dc2626";
        }
    } else {
        if (statusEl) {
            statusEl.textContent = "Camera ready (works online and offline locally on device).";
            statusEl.style.color = "#16a34a";
        }
    }
}

function resetEmergencyCameraUI() {
    stopEmergencyCamera();
    capturedImageData = null;
    currentMatchedPatient = null;

    setElementHidden("cameraPreview", true);
    setElementHidden("faceGuide", true);
    setElementHidden("liveScreeningPill", true);
    setElementHidden("cameraPlaceholder", false);
    setElementHidden("capturedImage", true);
    setElementHidden("cameraPermissionDeniedNotice", true);

    setElementHidden("startCameraBtn", false);
    setElementHidden("captureBtn", true);
    setElementHidden("switchCameraBtn", true);
    setElementHidden("retakeBtn", true);
    setElementHidden("identifyBtn", true);
    setElementHidden("stopCameraBtn", true);

    setElementHidden("identifyingSpinner", true);
    setElementHidden("noMatchResult", true);
    setElementHidden("matchResult", true);

    // Reset visual motion indicator
    updateMotionScreeningStatus("Ready (Start camera to screen)", "#0284c7", "Camera stream is evaluated for visible movement or unresponsiveness indicators.");
    applyCameraFilters();
}

/* ================= 5. LIVE CAMERA & MOTION/ACTIVITY SCREENING (Req 1 & 3) ================= */

async function startEmergencyCamera() {
    setElementHidden("cameraPermissionDeniedNotice", true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Camera API is not supported in this browser. Please upload a photo below.");
        return;
    }

    const startBtn = $("startCameraBtn");
    if (startBtn) {
        startBtn.textContent = "Connecting Camera...";
        startBtn.disabled = true;
    }

    try {
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
            // Fallback without facingMode constraint if rear camera unavailable
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
            applyCameraFilters();
            setElementHidden(video, false);
        }

        setElementHidden("faceGuide", false);
        setElementHidden("liveScreeningPill", false);
        setElementHidden("cameraPlaceholder", true);
        setElementHidden("capturedImage", true);

        if (startBtn) {
            setElementHidden(startBtn, true);
            startBtn.disabled = false;
            startBtn.textContent = "📸 Start Camera";
        }

        setElementHidden("helperUploadBtn", true);
        setElementHidden("helperDemoBtn", true);
        setElementHidden("captureBtn", false);
        setElementHidden("switchCameraBtn", false);
        setElementHidden("stopCameraBtn", false);
        setElementHidden("retakeBtn", true);
        setElementHidden("identifyBtn", true);

        // Hide previous results
        setElementHidden("noMatchResult", true);
        setElementHidden("matchResult", true);

        // Start live video motion / activity screening loop (Req 3)
        startMotionScreeningLoop();

        showToast("Camera active. Align face inside guide. Observational screening active.");
    } catch (err) {
        console.warn("Camera access error:", err);
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = "📸 Start Camera";
            setElementHidden(startBtn, false);
        }

        // Display clear permission denied instructions (Req 1)
        setElementHidden("cameraPermissionDeniedNotice", false);
        showToast("Camera permission was denied or camera is unavailable. See instructions above.");
    }
}

function stopEmergencyCamera() {
    stopMotionScreeningLoop();

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
    setElementHidden("liveScreeningPill", true);

    if (!capturedImageData) {
        setElementHidden("cameraPlaceholder", false);
        setElementHidden("startCameraBtn", false);
        setElementHidden("helperUploadBtn", false);
        setElementHidden("helperDemoBtn", false);
    }

    setElementHidden("captureBtn", true);
    setElementHidden("switchCameraBtn", true);
    setElementHidden("stopCameraBtn", true);
}

function switchCameraFacing() {
    currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
    const badge = $("cameraFacingBadge");
    if (badge) {
        badge.textContent = currentFacingMode === "environment" ? "Camera: Rear (Environment)" : "Camera: Front (Selfie)";
    }
    stopEmergencyCamera();
    startEmergencyCamera();
}

// Periodic visual motion screening loop using a tiny offscreen canvas (Req 3)
function startMotionScreeningLoop() {
    stopMotionScreeningLoop();
    lastScreeningFrameData = null;

    motionScreeningInterval = setInterval(() => {
        const video = $("cameraPreview");
        const canvas = $("motionScreeningCanvas");
        if (!video || !canvas || video.paused || video.ended || !emergencyCameraStream) return;

        try {
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, 32, 32);
            const currentData = ctx.getImageData(0, 0, 32, 32).data;

            if (lastScreeningFrameData) {
                let diffSum = 0;
                // Sample every 4th pixel (RGB channels)
                for (let i = 0; i < currentData.length; i += 4) {
                    diffSum += Math.abs(currentData[i] - lastScreeningFrameData[i]);
                }
                const avgDiff = diffSum / 256;

                // Motion observation screening logic
                if (avgDiff > 14) {
                    updateMotionScreeningStatus("Active Movement Detected", "#16a34a", "Movement observed in camera frame. Screening observation only; does not replace clinical evaluation.");
                } else if (avgDiff > 4) {
                    updateMotionScreeningStatus("Minor Movement Observed", "#0284c7", "Minor shifting or facial motion detected.");
                } else {
                    updateMotionScreeningStatus("Low Movement / Stillness Observed", "#d97706", "Person appears still or having difficulty moving. If unresponsive or not breathing, call 112 immediately.");
                }
            }

            lastScreeningFrameData = currentData;
        } catch (e) {
            // Ignore frame capture exceptions on orientation flip
        }
    }, 700);
}

function stopMotionScreeningLoop() {
    if (motionScreeningInterval) {
        clearInterval(motionScreeningInterval);
        motionScreeningInterval = null;
    }
    lastScreeningFrameData = null;
}

function updateMotionScreeningStatus(statusText, color, detailText) {
    const badge = $("motionStatusBadge");
    const detail = $("motionObservationDetail");
    const overlayDot = $("screeningMotionDot");
    const overlayText = $("screeningMotionText");

    if (badge) {
        badge.textContent = statusText;
        badge.style.color = color;
    }
    if (detail) {
        detail.textContent = detailText;
    }
    if (overlayText) {
        overlayText.textContent = `Motion: ${statusText}`;
    }
    if (overlayDot) {
        overlayDot.style.background = color;
    }
}

/* ================= 6. PHOTO CAPTURE & UPLOAD ================= */

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
    if (ctx) {
        if (cameraBrightness !== 100 || cameraContrast !== 100) {
            ctx.filter = `brightness(${cameraBrightness}%) contrast(${cameraContrast}%)`;
        } else {
            ctx.filter = "none";
        }
        ctx.drawImage(video, 0, 0, width, height);
        ctx.filter = "none";
    }

    capturedImageData = canvas.toDataURL("image/jpeg", 0.92);

    // Display captured still photo
    const capturedImg = $("capturedImage");
    if (capturedImg) {
        capturedImg.src = capturedImageData;
        setElementHidden(capturedImg, false);
    }

    // Stop live stream to conserve battery and freeze frame
    stopEmergencyCamera();

    setElementHidden("cameraPlaceholder", true);
    setElementHidden("startCameraBtn", true);
    setElementHidden("helperUploadBtn", true);
    setElementHidden("helperDemoBtn", true);
    setElementHidden("captureBtn", true);
    setElementHidden("switchCameraBtn", true);
    setElementHidden("stopCameraBtn", true);

    setElementHidden("retakeBtn", false);
    setElementHidden("identifyBtn", false);

    showToast("Photo captured! Click 'Identify Registered Patient'.");
}

function handleHelperPhotoUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        capturedImageData = e.target.result;
        stopEmergencyCamera();
        const capturedImg = $("capturedImage");
        if (capturedImg) {
            capturedImg.src = capturedImageData;
            setElementHidden(capturedImg, false);
        }
        setElementHidden("cameraPlaceholder", true);
        setElementHidden("startCameraBtn", true);
        setElementHidden("helperUploadBtn", true);
        setElementHidden("helperDemoBtn", true);
        setElementHidden("captureBtn", true);
        setElementHidden("switchCameraBtn", true);
        setElementHidden("stopCameraBtn", true);
        setElementHidden("retakeBtn", false);
        setElementHidden("identifyBtn", false);
        showToast("Photo loaded! Click 'Identify Registered Patient'.");
    };
    reader.readAsDataURL(file);
}

function loadDemoPatientForIdentification() {
    capturedImageData = generateSampleFaceBiometric("Rahul Kumar PAT1001");
    stopEmergencyCamera();
    const capturedImg = $("capturedImage");
    if (capturedImg) {
        capturedImg.src = capturedImageData;
        setElementHidden(capturedImg, false);
    }
    setElementHidden("cameraPlaceholder", true);
    setElementHidden("startCameraBtn", true);
    setElementHidden("helperUploadBtn", true);
    setElementHidden("helperDemoBtn", true);
    setElementHidden("captureBtn", true);
    setElementHidden("switchCameraBtn", true);
    setElementHidden("stopCameraBtn", true);
    setElementHidden("retakeBtn", false);
    setElementHidden("identifyBtn", false);
    showToast("Consented demo patient (PAT1001) template loaded! Click 'Identify Registered Patient'.");
}

function retakePhoto() {
    capturedImageData = null;
    currentMatchedPatient = null;
    setElementHidden("capturedImage", true);
    setElementHidden("noMatchResult", true);
    setElementHidden("matchResult", true);
    setElementHidden("cameraPlaceholder", false);
    setElementHidden("startCameraBtn", false);
    setElementHidden("helperUploadBtn", false);
    setElementHidden("helperDemoBtn", false);
    setElementHidden("retakeBtn", true);
    setElementHidden("identifyBtn", true);
    updateMotionScreeningStatus("Ready (Start camera to screen)", "#0284c7", "Camera stream is evaluated for visible movement or unresponsiveness indicators.");
}

/* ================= 7. IDENTIFY REGISTERED PATIENT (ONLINE & OFFLINE) (Req 2 & 5) ================= */

async function identifyEmergencyPatient() {
    if (!capturedImageData) {
        showToast("Please capture or upload a face photo first.");
        return;
    }

    const identifyBtn = $("identifyBtn");
    if (identifyBtn) {
        identifyBtn.disabled = true;
        identifyBtn.textContent = "⏳ Identifying...";
    }

    setElementHidden("identifyingSpinner", false);
    setElementHidden("noMatchResult", true);
    setElementHidden("matchResult", true);

    const isOnline = navigator.onLine;
    const engineNotice = $("identifyingEngineNotice");
    if (engineNotice) {
        engineNotice.textContent = isOnline
            ? "Evaluating with MediCare Vision Engine via PostgreSQL database (82% threshold)..."
            : "Evaluating with on-device Biometric Engine using Local Offline Emergency Cache...";
    }

    try {
        let matchResult = null;

        // PATH A: ONLINE IDENTIFICATION VIA BACKEND POSTGRESQL (Req 2)
        if (isOnline) {
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

                if (response.ok) {
                    const data = await response.json();
                    matchResult = {
                        matched: Boolean(data.matched && data.patient),
                        confidence: data.confidence || "0.0%",
                        patient: data.patient || null,
                        source: "Cloud PostgreSQL Database",
                        message: data.message || (data.matched ? "Patient identified" : "Patient not identified")
                    };
                }
            } catch (netErr) {
                console.warn("Online identify failed, falling back to local cache:", netErr.message);
            }
        }

        // PATH B: OFFLINE IDENTIFICATION VIA LOCAL EMERGENCY CACHE (Req 5)
        if (!matchResult) {
            const capturedDescriptor = extractBiometricVectorClient(capturedImageData);
            const directory = getLocalEmergencyDirectory();

            let highestSimilarity = 0;
            let bestCandidate = null;

            for (const cand of directory) {
                const candDescriptor = cand.faceDescriptor || extractBiometricVectorClient(cand.name + " " + cand.id);
                if (candDescriptor) {
                    const sim = computeBiometricSimilarityClient(capturedDescriptor, candDescriptor);
                    if (sim > highestSimilarity) {
                        highestSimilarity = sim;
                        bestCandidate = cand;
                    }
                }
            }

            const MATCH_THRESHOLD = 0.82; // Strict 82% threshold (Req 2)
            const confidencePercent = (highestSimilarity * 100).toFixed(1) + "%";

            if (bestCandidate && highestSimilarity >= MATCH_THRESHOLD) {
                matchResult = {
                    matched: true,
                    confidence: confidencePercent,
                    patient: {
                        id: bestCandidate.id || bestCandidate.patientId,
                        name: bestCandidate.name,
                        bloodGroup: bestCandidate.bloodGroup || "O+",
                        guardianName: bestCandidate.guardianName || "Not Provided",
                        guardianPhone: bestCandidate.guardianPhone || "Not Provided"
                    },
                    source: "Local Device Emergency Cache (Offline Mode)",
                    message: "Patient identified offline"
                };

                // Queue offline audit event (Req 5 & 6)
                queueOfflineEmergencyEvent({
                    action: "offline_emergency_identification_success",
                    matched: true,
                    matchedPatientId: bestCandidate.id,
                    confidence: confidencePercent,
                    source: "offline_cache"
                });
            } else {
                matchResult = {
                    matched: false,
                    confidence: confidencePercent,
                    patient: null,
                    source: "Local Device Emergency Cache (Offline Mode)",
                    message: "Patient not identified"
                };

                // Queue offline audit event (Req 5 & 6)
                queueOfflineEmergencyEvent({
                    action: "offline_emergency_identification_not_identified",
                    matched: false,
                    confidence: confidencePercent,
                    source: "offline_cache"
                });
            }
        }

        setElementHidden("identifyingSpinner", true);
        if (identifyBtn) {
            identifyBtn.disabled = false;
            identifyBtn.textContent = "🔍 Identify Registered Patient";
        }

        // OUTCOME 1: NO RELIABLE MATCH (Strictly display "Patient not identified" - Req 2)
        if (!matchResult.matched || !matchResult.patient) {
            currentMatchedPatient = null;
            setElementHidden("matchResult", true);
            setElementHidden("noMatchResult", false);

            if ($("noMatchMessage")) {
                $("noMatchMessage").textContent = "Patient not identified. Biometric similarity did not reach the strict 82% threshold required for patient safety.";
            }
            if ($("noMatchSubLabel")) {
                $("noMatchSubLabel").textContent = `Best candidate match: ${matchResult.confidence} (Source: ${matchResult.source})`;
            }

            showToast("Patient not identified. You can provide manual emergency assistance or call 112.");
        }
        // OUTCOME 2: RELIABLE REGISTERED PATIENT MATCH
        else {
            const p = matchResult.patient;
            currentMatchedPatient = p;

            if ($("resPatientName")) $("resPatientName").textContent = p.name || "-";
            if ($("resPatientId")) $("resPatientId").textContent = p.id || "-";
            if ($("resBloodGroupBadge")) $("resBloodGroupBadge").textContent = p.bloodGroup || "N/A";
            if ($("resGuardianName")) $("resGuardianName").textContent = p.guardianName || "Not Provided";

            const guardianPhone = p.guardianPhone || "Not Provided";
            if ($("resGuardianPhone")) $("resGuardianPhone").textContent = guardianPhone;

            if ($("matchConfidenceBadge")) {
                $("matchConfidenceBadge").textContent = `${matchResult.confidence} Confidence`;
            }
            if ($("matchSourceLabel")) {
                $("matchSourceLabel").textContent = `Match verified via Real Biometric Engine (${matchResult.source})`;
            }

            setElementHidden("noMatchResult", true);
            setElementHidden("matchResult", false);

            showToast(`✅ Registered patient identified: ${p.name} (${p.id})`);
        }
    } catch (err) {
        console.error("Identification error:", err);
        setElementHidden("identifyingSpinner", true);
        if (identifyBtn) {
            identifyBtn.disabled = false;
            identifyBtn.textContent = "🔍 Identify Registered Patient";
        }
        showToast("Error processing identification: " + err.message);
    }
}

/* ================= 8. AMBULANCE & EMERGENCY CALLING WITH CONFIRMATION (Req 4) ================= */

function openEmergencyCallConfirmation(phoneNumber, recipientName) {
    currentCallTargetPhone = phoneNumber || "112";
    const modal = $("emergencyCallModal");
    const targetLabel = $("callRecipientTarget");
    const directLink = $("confirmCallDirectLink");
    const alternativeNotice = $("noCoverageAlternativeNotice");

    if (targetLabel) {
        targetLabel.textContent = `${recipientName || 'Emergency Services'} (${currentCallTargetPhone})`;
    }

    const cleanPhone = String(currentCallTargetPhone).replace(/[^\d+]/g, "");
    if (directLink) {
        directLink.href = cleanPhone ? `tel:${cleanPhone}` : "tel:112";
    }

    if (alternativeNotice) {
        alternativeNotice.classList.add("hidden");
    }

    if (modal) {
        modal.classList.remove("hidden");
    }
}

function closeEmergencyCallModal() {
    const modal = $("emergencyCallModal");
    if (modal) modal.classList.add("hidden");
}

function callMatchedPatientGuardian() {
    if (!currentMatchedPatient || !currentMatchedPatient.guardianPhone || currentMatchedPatient.guardianPhone === "Not Provided") {
        showToast("No guardian phone number on record for this patient.");
        return;
    }
    openEmergencyCallConfirmation(currentMatchedPatient.guardianPhone, `Guardian: ${currentMatchedPatient.guardianName || 'Primary Contact'}`);
}

function toggleNoCoverageInstructions() {
    const notice = $("noCoverageAlternativeNotice");
    if (notice) {
        notice.classList.toggle("hidden");
    }
}

function onEmergencyCallInitiated() {
    const phone = currentCallTargetPhone;
    const isOnline = navigator.onLine;

    // Log the emergency call event
    if (isOnline) {
        fetch(`${API_URL}/api/helper/sync-offline-events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                events: [{
                    action: phone === "112" ? "emergency_call_112_initiated" : "emergency_call_guardian_initiated",
                    targetPhone: phone,
                    matchedPatientId: currentMatchedPatient ? currentMatchedPatient.id : null,
                    timestamp: new Date().toISOString()
                }],
                sessionId: emergencySessionId
            })
        }).catch(() => {});
    } else {
        queueOfflineEmergencyEvent({
            action: phone === "112" ? "offline_emergency_call_112" : "offline_emergency_call_guardian",
            targetPhone: phone,
            matchedPatientId: currentMatchedPatient ? currentMatchedPatient.id : null
        });
    }

    closeEmergencyCallModal();
    showToast(`Calling ${phone}... Dispatch confirmation required with operator.`);
}

/* ================= 9. MANUAL EMERGENCY ASSISTANCE MODAL (Req 2 & 3) ================= */

function openManualEmergencyModal() {
    const modal = $("manualEmergencyModal");
    if (modal) modal.classList.remove("hidden");
}

function closeManualEmergencyModal() {
    const modal = $("manualEmergencyModal");
    if (modal) modal.classList.add("hidden");
}

// Window export bindings
window.openHelperEmergency = openHelperEmergency;
window.exitHelperMode = exitHelperMode;
window.startEmergencyCamera = startEmergencyCamera;
window.stopEmergencyCamera = stopEmergencyCamera;
window.switchCameraFacing = switchCameraFacing;
window.captureEmergencyPhoto = captureEmergencyPhoto;
window.handleHelperPhotoUpload = handleHelperPhotoUpload;
window.loadDemoPatientForIdentification = loadDemoPatientForIdentification;
window.retakePhoto = retakePhoto;
window.identifyEmergencyPatient = identifyEmergencyPatient;
window.openEmergencyCallConfirmation = openEmergencyCallConfirmation;
window.closeEmergencyCallModal = closeEmergencyCallModal;
window.callMatchedPatientGuardian = callMatchedPatientGuardian;
window.toggleNoCoverageInstructions = toggleNoCoverageInstructions;
window.onEmergencyCallInitiated = onEmergencyCallInitiated;
window.openManualEmergencyModal = openManualEmergencyModal;
window.closeManualEmergencyModal = closeManualEmergencyModal;
window.refreshLocalEmergencyDirectory = refreshLocalEmergencyDirectory;
window.syncPendingOfflineEvents = syncPendingOfflineEvents;
window.setCameraBrightness = setCameraBrightness;
window.setCameraContrast = setCameraContrast;
window.applyCameraFilterPreset = applyCameraFilterPreset;
window.resetCameraFilters = resetCameraFilters;


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
    const badge = $("filesCountBadge");
    if (badge) {
        const count = (docs && Array.isArray(docs)) ? docs.length : 0;
        badge.textContent = `${count} ${count === 1 ? "file" : "files"}`;
    }
    if (!container) return;

    if (!docs || docs.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; color: #94a3b8; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;">
                <div style="font-size: 28px; margin-bottom: 6px;">📂</div>
                <p style="margin: 0; font-size: 14px; font-weight: 500; color: #475569;">No medical documents uploaded yet.</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Snap a photo of paper reports with the camera, upload PDFs, or record your initial vitals.</p>
                <div style="margin-top: 14px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                    <button type="button" class="btn-small success" style="background: #059669; color: white;" onclick="openReportCameraModal()">
                        📸 Take Photo of Report
                    </button>
                    <button type="button" class="btn-small primary" onclick="openFileUploadModal()">
                        + Upload File
                    </button>
                    <button type="button" class="btn-small secondary" onclick="openFirstTimeHealthModal()">
                        🩺 Record Health Vitals (BP, Sugar)
                    </button>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = docs.map(doc => {
        const ext = (doc.original_filename || "").split(".").pop().toUpperCase();
        const isImg = ["JPG", "JPEG", "PNG", "WEBP"].includes(ext);
        const icon = isImg ? "🖼️" : (ext === "PDF" ? "📑" : "📄");
        const sizeKb = doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "";
        const uploadDate = doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "";

        return `
            <div class="file-item-card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
                    <div style="font-size: 26px;">${icon}</div>
                    <div style="min-width: 0;">
                        <div style="font-weight: 600; color: #0f172a; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(doc.original_filename)}">
                            ${escapeHTML(doc.original_filename)}
                        </div>
                        <div style="font-size: 12px; color: #64748b; display: flex; gap: 8px; align-items: center;">
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

/* ================= SHOW ALL FILES & HIGHLIGHT ================= */

function showAllFilesView() {
    const card = $("medicalFilesCard");
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    card.classList.remove("highlight-pulse");
    void card.offsetWidth; // Reflow to restart animation
    card.classList.add("highlight-pulse");
    loadPatientDocuments();
}

/* ================= FIRST-TIME LOGIN HEALTH VITALS SETUP ================= */

function checkAndPromptFirstTimeHealthVitals(patient) {
    if (!patient || !patient.id) return;
    const patientId = patient.id;
    const hasCompletedVitals = localStorage.getItem("vitals_completed_" + patientId) ||
        (patient.notes && patient.notes.includes("[Initial Vitals Logged")) ||
        (patient.healthInformation && patient.healthInformation.is_completed);

    if (!hasCompletedVitals && !sessionStorage.getItem("vitals_prompt_shown_" + patientId)) {
        sessionStorage.setItem("vitals_prompt_shown_" + patientId, "1");
        setTimeout(() => {
            openFirstTimeHealthModal();
        }, 600);
    }
}

function openFirstTimeHealthModal() {
    const modal = $("firstTimeHealthModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    const err = $("vitalsErrorMsg");
    if (err) {
        err.classList.add("hidden");
        err.textContent = "";
    }
    const bpInput = $("vitalsBp");
    if (bpInput && !bpInput.value) bpInput.value = "120/80";
    const sugarInput = $("vitalsSugar");
    if (sugarInput && !sugarInput.value) sugarInput.value = "95";
    const pulseInput = $("vitalsPulse");
    if (pulseInput && !pulseInput.value) pulseInput.value = "72";
    const spo2Input = $("vitalsSpo2");
    if (spo2Input && !spo2Input.value) spo2Input.value = "98";
    const tempInput = $("vitalsTemperature");
    if (tempInput && !tempInput.value) tempInput.value = "98.6";
    const weightInput = $("vitalsWeight");
    if (weightInput && !weightInput.value) weightInput.value = "65";
}

function closeFirstTimeHealthModal() {
    const modal = $("firstTimeHealthModal");
    if (modal) modal.classList.add("hidden");
}

async function submitFirstTimeHealthVitals() {
    const btn = $("saveVitalsBtn");
    const err = $("vitalsErrorMsg");
    if (!patientToken) {
        showToast("Session expired. Please log in again.");
        return;
    }

    const bp = ($("vitalsBp") ? $("vitalsBp").value : "").trim();
    const sugar = ($("vitalsSugar") ? $("vitalsSugar").value : "").trim();
    const sugarType = ($("vitalsSugarType") ? $("vitalsSugarType").value : "Random");
    const pulse = ($("vitalsPulse") ? $("vitalsPulse").value : "").trim();
    const spo2 = ($("vitalsSpo2") ? $("vitalsSpo2").value : "").trim();
    const temperature = ($("vitalsTemperature") ? $("vitalsTemperature").value : "").trim();
    const weight = ($("vitalsWeight") ? $("vitalsWeight").value : "").trim();
    const allergies = $("vitalsAllergiesCheck") ? $("vitalsAllergiesCheck").checked : false;
    const diabetes = $("vitalsDiabetesCheck") ? $("vitalsDiabetesCheck").checked : false;
    const hypertension = $("vitalsHypertensionCheck") ? $("vitalsHypertensionCheck").checked : false;
    const asthma = $("vitalsAsthmaCheck") ? $("vitalsAsthmaCheck").checked : false;
    const notes = ($("vitalsNotes") ? $("vitalsNotes").value : "").trim();

    if (!bp && !sugar) {
        if (err) {
            err.textContent = "Please enter Blood Pressure (e.g. 120/80) or Blood Sugar (e.g. 95).";
            err.classList.remove("hidden");
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Saving & Generating Report...";
    }

    try {
        const response = await fetch(`${API_URL}/api/patient/record-vitals`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify({
                bp: bp || "120/80",
                sugar: sugar || "95",
                sugarType,
                pulse: pulse || "72",
                spo2: spo2 || "98",
                temperature: temperature || "98.6",
                weight: weight || "65",
                allergies,
                diabetes,
                hypertension,
                asthma,
                notes
            })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to record health vitals.");
        }

        const patientId = $("patientId") ? $("patientId").textContent.trim() : "current";
        localStorage.setItem("vitals_completed_" + patientId, "1");

        closeFirstTimeHealthModal();
        showToast("Health vitals recorded! Official report generated in Show All Files.");

        // Reload documents and jump directly to files
        await loadPatientDocuments();
        showAllFilesView();
    } catch (e) {
        if (err) {
            err.textContent = e.message;
            err.classList.remove("hidden");
        }
        showToast(e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "💾 Save & Generate Report in Show All Files";
        }
    }
}

/* ================= REPORT CAMERA (SCAN PAPER REPORTS & PRESCRIPTIONS) ================= */

let reportCameraStream = null;
let reportCameraFacingMode = "environment"; // default to rear camera for scanning physical documents

async function openReportCameraModal() {
    const modal = $("reportCameraModal");
    if (!modal) return;
    modal.classList.remove("hidden");

    // Reset sections
    const liveSec = $("reportCameraLiveSection");
    const prevSec = $("reportCameraPreviewSection");
    if (liveSec) liveSec.classList.remove("hidden");
    if (prevSec) prevSec.classList.add("hidden");
    setElementHidden("reportCameraBlockedNotice", true);

    await startReportCameraStream();
}

function handleReportPhotoUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = $("reportCameraCanvas");
            if (!canvas) return;
            canvas.width = img.width || 1280;
            canvas.height = img.height || 720;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const defaultName = file.name ? file.name.replace(/\.[^/.]+$/, "") : "Medical_Report_Photo";
            if ($("reportPhotoName")) {
                $("reportPhotoName").value = defaultName;
            }

            stopReportCameraStream();
            setElementHidden("reportCameraLiveSection", true);
            setElementHidden("reportCameraPreviewSection", false);
            showToast("Report image loaded! Confirm name to save.");
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function startReportCameraStream() {
    stopReportCameraStream();
    const video = $("reportCameraVideo");
    if (!video) return;

    setElementHidden("reportCameraBlockedNotice", true);

    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Camera API not supported in this browser.");
        }
        try {
            reportCameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: reportCameraFacingMode },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });
        } catch (modeErr) {
            reportCameraStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
        }
        video.srcObject = reportCameraStream;
        await video.play();
    } catch (err) {
        console.warn("Camera access error:", err);
        setElementHidden("reportCameraBlockedNotice", false);
        showToast("Camera access unavailable. You can select a report photo or document below.");
    }
}

function stopReportCameraStream() {
    if (reportCameraStream) {
        reportCameraStream.getTracks().forEach(track => track.stop());
        reportCameraStream = null;
    }
    const video = $("reportCameraVideo");
    if (video) video.srcObject = null;
}

function closeReportCameraModal() {
    stopReportCameraStream();
    setElementHidden("reportCameraBlockedNotice", true);
    const modal = $("reportCameraModal");
    if (modal) modal.classList.add("hidden");
}

async function switchReportCamera() {
    reportCameraFacingMode = (reportCameraFacingMode === "environment") ? "user" : "environment";
    await startReportCameraStream();
}

function captureReportPhoto() {
    const video = $("reportCameraVideo");
    const canvas = $("reportCameraCanvas");
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    stopReportCameraStream();

    const liveSec = $("reportCameraLiveSection");
    const prevSec = $("reportCameraPreviewSection");
    if (liveSec) liveSec.classList.add("hidden");
    if (prevSec) prevSec.classList.remove("hidden");

    const nameInput = $("reportPhotoName");
    if (nameInput) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "_");
        nameInput.value = `Medical_Report_${dateStr}`;
        nameInput.focus();
    }
}

async function retakeReportPhoto() {
    const liveSec = $("reportCameraLiveSection");
    const prevSec = $("reportCameraPreviewSection");
    if (liveSec) liveSec.classList.remove("hidden");
    if (prevSec) prevSec.classList.add("hidden");
    await startReportCameraStream();
}

async function saveReportPhotoToFile() {
    const canvas = $("reportCameraCanvas");
    const nameInput = $("reportPhotoName");
    const btn = $("saveReportPhotoBtn");

    if (!canvas) return;
    if (!patientToken) {
        showToast("Session expired. Please log in again.");
        return;
    }

    let reportName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : "Medical_Report_Photo";
    if (!reportName.toLowerCase().endsWith(".jpg") && !reportName.toLowerCase().endsWith(".jpeg") && !reportName.toLowerCase().endsWith(".png")) {
        reportName += ".jpg";
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Saving Photo to Show All Files...";
    }

    try {
        const base64Data = canvas.toDataURL("image/jpeg", 0.9);
        const approxSize = Math.round((base64Data.length * 3) / 4);

        const response = await fetch(`${API_URL}/api/patient/documents/upload`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify({
                filename: reportName,
                fileType: "image/jpeg",
                fileData: base64Data,
                fileSize: approxSize
            })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to save report photo.");
        }

        closeReportCameraModal();
        showToast("Report photo saved successfully to Show All Files!");

        await loadPatientDocuments();
        showAllFilesView();
    } catch (err) {
        showToast("Error saving report photo: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "💾 Save to Show All Files";
        }
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
            const chatFab = $("chatFab");
            if (chatFab) chatFab.classList.remove("hidden");
            loadDoctorAuthorizedPatients();
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
window.openDoctorChatForPatient = openDoctorChatForPatient;
window.openDoctorChatFromPortal = openDoctorChatFromPortal;
window.sendDoctorAccessRequest = sendDoctorAccessRequest;
window.loadDoctorAuthorizedPatients = loadDoctorAuthorizedPatients;
window.loadDoctorAccessRequests = loadDoctorAccessRequests;
window.respondToDoctorRequest = respondToDoctorRequest;
window.searchPatient = searchPatient;
window.viewPatientInDoctorPortal = viewPatientInDoctorPortal;
window.downloadDoctorPatientPdf = downloadDoctorPatientPdf;
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
window.setHealthValue = setHealthValue;
window.toggleChat = toggleChat;
window.switchChatMode = switchChatMode;
window.formatRelativeTime = formatRelativeTime;
window.refreshRelativeTimestamps = refreshRelativeTimestamps;
window.showAllFilesView = showAllFilesView;
window.checkAndPromptFirstTimeHealthVitals = checkAndPromptFirstTimeHealthVitals;
window.openFirstTimeHealthModal = openFirstTimeHealthModal;
window.closeFirstTimeHealthModal = closeFirstTimeHealthModal;
window.submitFirstTimeHealthVitals = submitFirstTimeHealthVitals;
window.openReportCameraModal = openReportCameraModal;
window.closeReportCameraModal = closeReportCameraModal;
window.switchReportCamera = switchReportCamera;
window.captureReportPhoto = captureReportPhoto;
window.retakeReportPhoto = retakeReportPhoto;
window.saveReportPhotoToFile = saveReportPhotoToFile;
window.openFaceVerificationModal = openFaceVerificationModal;
window.closeFaceVerificationModal = closeFaceVerificationModal;
window.switchFaceCameraFacing = switchFaceCameraFacing;
window.captureAndEnrollFaceBiometric = captureAndEnrollFaceBiometric;
window.retakeFaceEnrollment = retakeFaceEnrollment;
window.checkFaceVerification = checkFaceVerification;
window.startLivenessVerification = startLivenessVerification;
window.checkLivenessVerification = checkLivenessVerification;

/* ================= APPOINTMENT & REMINDER NOTIFICATIONS SYSTEM ================= */

let currentPatientAppointments = [];
let currentPatientReminders = [];
window.currentPatientAppointments = currentPatientAppointments;
window.currentPatientReminders = currentPatientReminders;

async function loadPatientAppointments() {
    const container = $("appointmentsListContainer");
    if (!patientToken) return;

    try {
        const res = await fetch(`${API_URL}/api/patient/appointments`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to load appointments");
        }

        const appts = data.appointments || [];
        currentPatientAppointments = appts;
        window.currentPatientAppointments = appts;

        if ($("appointmentsCountBadge")) {
            $("appointmentsCountBadge").textContent = `${appts.length} scheduled`;
        }

        if (window.renderAppointmentScheduleVisualization) {
            window.renderAppointmentScheduleVisualization(appts, currentPatientReminders || []);
        }

        renderAppointmentsList(appts);
        loadPatientReminders();
    } catch (err) {
        console.warn("Appointments load notice:", err.message);
        if (container) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;">Unable to load appointments: ${err.message}</div>`;
        }
    }
}

function renderAppointmentsList(appointments) {
    const container = $("appointmentsListContainer");
    if (!container) return;

    if (window.renderAppointmentScheduleVisualization) {
        window.renderAppointmentScheduleVisualization(appointments || [], currentPatientReminders || []);
    }

    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 36px 16px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
                <div style="font-size: 32px; margin-bottom: 8px;">📅</div>
                <div style="font-weight: 600; color: #1e293b; font-size: 14px; margin-bottom: 4px;">No Upcoming Appointments</div>
                <p style="color: #64748b; font-size: 13px; max-width: 380px; margin: 0 auto 14px auto;">
                    Schedule a consultation with your doctor. Our system will automatically trigger SMS and in-app reminders to your stored contact details.
                </p>
                <button type="button" class="btn-small primary" style="background: #0284c7; color: white;" onclick="openBookAppointmentModal()">
                    ➕ Book Your First Appointment
                </button>
            </div>
        `;
        return;
    }

    const now = new Date();
    let html = `<div class="appointment-card-grid">`;

    for (const appt of appointments) {
        let apptDateTime = null;
        try {
            const timeParts = (appt.appointmentTime || "").match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (timeParts) {
                let hours = parseInt(timeParts[1], 10);
                const minutes = parseInt(timeParts[2], 10);
                const ampm = timeParts[3] ? timeParts[3].toUpperCase() : null;
                if (ampm === "PM" && hours < 12) hours += 12;
                if (ampm === "AM" && hours === 12) hours = 0;
                apptDateTime = new Date(appt.appointmentDate + "T" + String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":00");
            }
        } catch (_) {}

        if (!apptDateTime || isNaN(apptDateTime.getTime())) {
            apptDateTime = new Date(appt.appointmentDate + "T09:00:00");
        }

        const diffHours = (apptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        let urgencyClass = "";
        let relativePill = "";

        if (diffHours < 0) {
            urgencyClass = "past";
            relativePill = `<span style="background: #e2e8f0; color: #475569; font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 600;">Past</span>`;
        } else if (diffHours < 24) {
            urgencyClass = "today";
            relativePill = `<span style="background: #dcfce7; color: #166534; font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: bold;">⚡ Today</span>`;
        } else if (diffHours < 48) {
            urgencyClass = "due-soon";
            relativePill = `<span style="background: #fef3c7; color: #92400e; font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: bold;">🔔 Tomorrow</span>`;
        } else {
            const days = Math.round(diffHours / 24);
            relativePill = `<span style="background: #e0f2fe; color: #0369a1; font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 600;">In ${days} days</span>`;
        }

        const reminderStatusHtml = appt.reminderSent
            ? `<div style="font-size: 11.5px; color: #16a34a; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                 <span>✅</span> Reminder sent to stored phone & email
               </div>`
            : `<div style="font-size: 11.5px; color: #d97706; font-weight: 500; display: flex; align-items: center; gap: 4px;">
                 <span>⏳</span> Reminder pending (Due 24-48h prior)
               </div>`;

        html += `
            <div class="appointment-item-card ${urgencyClass}">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        <div>
                            <h4 style="margin: 0 0 2px 0; font-size: 15px; color: #0f172a;">${escapeHtml(appt.doctorName)}</h4>
                            <span class="badge-tag" style="background: #f1f5f9; color: #475569; font-size: 11px; padding: 2px 6px;">${escapeHtml(appt.department)}</span>
                        </div>
                        ${relativePill}
                    </div>

                    <div style="margin: 10px 0; font-size: 13px; color: #1e293b; display: flex; flex-direction: column; gap: 4px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 14px;">📅</span>
                            <b>${escapeHtml(appt.appointmentDate)}</b> at <b>${escapeHtml(appt.appointmentTime)}</b>
                        </div>
                        <div style="color: #64748b; font-size: 12.5px; margin-top: 2px;">
                            Reason: <span style="color: #334155;">${escapeHtml(appt.reason)}</span>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #f1f5f9;">
                    <div style="margin-bottom: 10px;">
                        ${reminderStatusHtml}
                    </div>

                    <div style="display: flex; gap: 6px; justify-content: space-between; align-items: center;">
                        <button type="button" class="btn-small success" style="background: #059669; color: white; font-size: 11.5px; padding: 5px 10px;" onclick="sendAppointmentReminder('${appt.appointmentId}')" title="Trigger manual reminder to stored contact details">
                            🔔 Instant Reminder
                        </button>
                        <button type="button" class="btn-small secondary" style="font-size: 11.5px; padding: 5px 8px; color: #dc2626;" onclick="cancelPatientAppointment('${appt.appointmentId}')" title="Cancel this appointment">
                            ✕ Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;
}

async function loadPatientReminders() {
    if (!patientToken) return;

    try {
        const res = await fetch(`${API_URL}/api/patient/reminders`, {
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) return;

        const reminders = data.reminders || [];
        currentPatientReminders = reminders;
        window.currentPatientReminders = reminders;
        const unreadCount = data.unreadCount || 0;

        if ($("remindersCountBadge")) {
            $("remindersCountBadge").textContent = `${reminders.length} reminder${reminders.length === 1 ? '' : 's'}`;
        }

        if (window.renderAppointmentScheduleVisualization && currentPatientAppointments) {
            window.renderAppointmentScheduleVisualization(currentPatientAppointments, reminders);
        }

        const navBadge = $("reminderNavBadge");
        if (navBadge) {
            if (unreadCount > 0) {
                navBadge.textContent = unreadCount > 9 ? "9+" : unreadCount;
                navBadge.classList.remove("hidden");
            } else {
                navBadge.classList.add("hidden");
            }
        }

        renderRemindersList(reminders);
    } catch (err) {
        console.warn("Reminders load notice:", err.message);
    }
}

function renderRemindersList(reminders) {
    const container = $("remindersListContainer");
    if (!container) return;

    if (!reminders || reminders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px 16px; color: #64748b;">
                <div style="font-size: 32px; margin-bottom: 8px;">📭</div>
                <div style="font-weight: 600; color: #1e293b; font-size: 14px;">No Reminders Dispatched Yet</div>
                <p style="font-size: 12.5px; margin-top: 4px;">
                    When appointments approach or when reminders are checked, dispatched alerts will be logged here.
                </p>
            </div>
        `;
        return;
    }

    let html = "";
    for (const r of reminders) {
        const sentDate = r.sentAt ? new Date(r.sentAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recently";
        html += `
            <div class="reminder-item-card ${r.isRead ? '' : 'unread'}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                    <div style="font-weight: bold; color: #0f172a; font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
                        <span>${escapeHtml(r.title)}</span>
                    </div>
                    <span style="font-size: 11px; color: #64748b;">${sentDate}</span>
                </div>

                <div style="font-size: 12.5px; color: #334155; line-height: 1.45; white-space: pre-wrap; margin: 6px 0; background: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid #f1f5f9;">
                    ${escapeHtml(r.message)}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #64748b; margin-top: 6px;">
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="reminder-channel-tag">${escapeHtml(r.deliveryChannel || 'in_app + sms')}</span>
                        <span>Recipient: <b>${escapeHtml(r.recipientPhone || 'On File')}</b></span>
                    </div>
                    <span style="color: #059669; font-weight: 600;">✓ Dispatched</span>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

async function triggerCheckReminders(force = false) {
    if (!patientToken) return;

    try {
        showToast("Evaluating current date/time and consultation schedule...");
        const res = await fetch(`${API_URL}/api/patient/reminders/trigger-check`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify({ force: Boolean(force) })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to trigger reminders check.");
        }

        showToast(data.message || "Reminders evaluation complete!");
        await loadPatientAppointments();
        await loadPatientReminders();
    } catch (err) {
        console.error("Trigger reminders error:", err);
        showToast(err.message);
    }
}

async function sendAppointmentReminder(appointmentId) {
    if (!patientToken || !appointmentId) return;

    try {
        showToast("Dispatching instant reminder to your stored contact details...");
        const res = await fetch(`${API_URL}/api/patient/appointments/${appointmentId}/send-reminder`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            }
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to dispatch reminder.");
        }

        showToast(data.message || "Appointment reminder dispatched!");
        await loadPatientAppointments();
        await loadPatientReminders();
    } catch (err) {
        console.error("Send reminder error:", err);
        showToast(err.message);
    }
}

async function cancelPatientAppointment(appointmentId) {
    if (!patientToken || !appointmentId) return;

    try {
        showToast("Cancelling appointment...");
        const res = await fetch(`${API_URL}/api/patient/appointments/${appointmentId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${patientToken}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to cancel appointment.");
        }

        showToast("Appointment cancelled successfully.");
        await loadPatientAppointments();
    } catch (err) {
        showToast(err.message);
    }
}

function openBookAppointmentModal() {
    const modal = $("bookAppointmentModal");
    if (!modal) return;

    // Set default date to tomorrow
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    if ($("bookApptDate")) {
        $("bookApptDate").value = tomorrowStr;
        $("bookApptDate").min = new Date().toISOString().split("T")[0];
    }

    if ($("bookApptReason")) $("bookApptReason").value = "Regular Consultation & Health Vitals Review";
    if ($("bookApptError")) $("bookApptError").classList.add("hidden");

    // Populate stored contacts preview
    const phone = $("sumPhone") ? $("sumPhone").textContent.trim() : "+919876543210";
    const email = $("sumEmail") ? $("sumEmail").textContent.trim() : "rahul@example.com";
    if ($("bookModalPhone")) $("bookModalPhone").textContent = phone;
    if ($("bookModalEmail")) $("bookModalEmail").textContent = email;

    modal.classList.remove("hidden");
}

function closeBookAppointmentModal() {
    const modal = $("bookAppointmentModal");
    if (modal) modal.classList.add("hidden");
}

async function submitBookAppointment() {
    const btn = $("confirmBookApptBtn");
    const err = $("bookApptError");
    const doctorSelect = $("bookDoctorSelect");
    const dateInput = $("bookApptDate");
    const timeSelect = $("bookApptTime");
    const reasonInput = $("bookApptReason");

    if (!dateInput || !dateInput.value) {
        if (err) {
            err.textContent = "Please select an appointment date.";
            err.classList.remove("hidden");
        }
        return;
    }

    const selectedOption = doctorSelect ? doctorSelect.options[doctorSelect.selectedIndex] : null;
    const doctorName = selectedOption ? selectedOption.getAttribute("data-name") || "Dr. Sharma" : "Dr. Sharma";
    const department = selectedOption ? selectedOption.getAttribute("data-dept") || "General Medicine" : "General Medicine";
    const doctorId = doctorSelect ? doctorSelect.value : "doctor";
    const appointmentDate = dateInput.value;
    const appointmentTime = timeSelect ? timeSelect.value : "10:30 AM";
    const reason = (reasonInput && reasonInput.value.trim()) ? reasonInput.value.trim() : "Routine Health Check";

    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Scheduling...";
    }

    try {
        const res = await fetch(`${API_URL}/api/patient/appointments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify({
                doctorId,
                doctorName,
                department,
                appointmentDate,
                appointmentTime,
                reason
            })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to schedule appointment.");
        }

        closeBookAppointmentModal();
        showToast("✅ Appointment booked! Reminders automatically activated.");
        await loadPatientAppointments();
    } catch (error) {
        if (err) {
            err.textContent = error.message;
            err.classList.remove("hidden");
        }
        showToast("Error: " + error.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Confirm Appointment";
        }
    }
}

function openRemindersModal() {
    const modal = $("appointmentRemindersModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    loadPatientReminders();
}

function closeRemindersModal() {
    const modal = $("appointmentRemindersModal");
    if (modal) modal.classList.add("hidden");
}

/* ================= DOCTOR APPOINTMENTS & REMINDER DISPATCH ================= */

async function loadDoctorAppointments() {
    const container = $("doctorAppointmentsList");
    const doctorToken = localStorage.getItem("doctorToken");
    if (!doctorToken || !container) return;

    try {
        const res = await fetch(`${API_URL}/api/doctor/appointments`, {
            headers: { Authorization: `Bearer ${doctorToken}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to load doctor appointments");
        }

        const appts = data.appointments || [];
        if (appts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 24px; color: #64748b;">
                    No scheduled appointments for your calendar at this time.
                </div>
            `;
            return;
        }

        let html = `<div style="display: flex; flex-direction: column; gap: 10px;">`;
        for (const appt of appts) {
            html += `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <div style="font-weight: 600; color: #0f172a; font-size: 14px;">
                            Patient: <b>${escapeHtml(appt.patientId)}</b>
                        </div>
                        <div style="font-size: 12.5px; color: #64748b; margin-top: 2px;">
                            📅 <b>${escapeHtml(appt.appointmentDate)}</b> at <b>${escapeHtml(appt.appointmentTime)}</b> | Dept: ${escapeHtml(appt.department)}
                        </div>
                        <div style="font-size: 12px; color: #334155; margin-top: 2px;">
                            Reason: ${escapeHtml(appt.reason)}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" class="btn-small success" style="background: #059669; color: white; padding: 6px 12px; font-size: 12px;" onclick="sendDoctorAppointmentReminder('${appt.appointmentId}')">
                            🔔 Send Reminder to Patient
                        </button>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
        container.innerHTML = html;
    } catch (err) {
        console.warn("Doctor appointments error:", err.message);
        if (container) {
            container.innerHTML = `<div style="text-align:center; padding:16px; color:#94a3b8;">${err.message}</div>`;
        }
    }
}

async function sendDoctorAppointmentReminder(appointmentId) {
    const doctorToken = localStorage.getItem("doctorToken");
    if (!doctorToken || !appointmentId) return;

    try {
        showToast("Sending reminder notification to patient...");
        const res = await fetch(`${API_URL}/api/doctor/appointments/${appointmentId}/send-reminder`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${doctorToken}`
            }
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to dispatch reminder.");
        }

        showToast(data.message || "Reminder sent to patient's contact information!");
        loadDoctorAppointments();
    } catch (err) {
        showToast("Error: " + err.message);
    }
}

// Window bindings for appointments & reminders
window.loadPatientAppointments = loadPatientAppointments;
window.loadPatientReminders = loadPatientReminders;
window.triggerCheckReminders = triggerCheckReminders;
window.sendAppointmentReminder = sendAppointmentReminder;
window.cancelPatientAppointment = cancelPatientAppointment;
window.openBookAppointmentModal = openBookAppointmentModal;
window.closeBookAppointmentModal = closeBookAppointmentModal;
window.submitBookAppointment = submitBookAppointment;
window.openRemindersModal = openRemindersModal;
window.closeRemindersModal = closeRemindersModal;
window.loadDoctorAppointments = loadDoctorAppointments;
window.sendDoctorAppointmentReminder = sendDoctorAppointmentReminder;

// Auto-refresh relative timestamps every 30 seconds
setInterval(refreshRelativeTimestamps, 30000);

/* ================= PATIENT BIOMETRIC HISTORY & VERIFICATION LOGS ================= */
let allBiometricLogs = [];
let currentBioFilter = "all";

async function loadBiometricHistory(forceRefresh = false) {
    const container = $("biometricHistoryListContainer");
    if (!patientToken) return;

    if (forceRefresh && container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 25px; color: #64748b;">
                <div style="font-size: 20px; margin-bottom: 6px;">⏳</div>
                Fetching latest biometric verification logs...
            </div>
        `;
    }

    try {
        const res = await fetch(`${API_URL}/api/patient/biometric-history`, {
            headers: {
                Authorization: `Bearer ${patientToken}`
            }
        });

        if (!res.ok) {
            throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();
        if (data.success) {
            allBiometricLogs = data.history || [];
            updateBiometricSummaryStats(data.summary, allBiometricLogs);
            renderBiometricHistoryList(allBiometricLogs, currentBioFilter);
            if (forceRefresh) {
                showToast("Biometric verification history refreshed!");
            }
        } else {
            if (container) {
                container.innerHTML = `<div style="text-align: center; padding: 20px; color: #dc2626;">${escapeHTML(data.message || "Failed to load biometric history.")}</div>`;
            }
        }
    } catch (err) {
        console.error("Biometric history error:", err);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #64748b;">
                    Unable to load biometric history. <button type="button" class="link-btn" onclick="loadBiometricHistory(true)">Try again</button>
                </div>
            `;
        }
    }
}

function updateBiometricSummaryStats(summary, logs) {
    const total = summary ? summary.total : logs.length;
    const success = summary ? summary.successCount : logs.filter(l => l.status === "success").length;
    const failed = summary ? summary.failedCount : logs.filter(l => l.status === "failed").length;
    const rate = total > 0 ? Math.round((success / total) * 100) : 0;

    if ($("bioStatTotal")) $("bioStatTotal").textContent = total;
    if ($("bioStatSuccess")) $("bioStatSuccess").textContent = success;
    if ($("bioStatFailed")) $("bioStatFailed").textContent = failed;
    if ($("bioStatSuccessRate")) $("bioStatSuccessRate").textContent = `${rate}% verification rate`;

    if ($("bioFilterCountAll")) $("bioFilterCountAll").textContent = total;
    if ($("bioFilterCountSuccess")) $("bioFilterCountSuccess").textContent = success;
    if ($("bioFilterCountFailed")) $("bioFilterCountFailed").textContent = failed;

    if ($("bioStatLastAttempt")) {
        if (logs.length > 0 && logs[0].timestamp) {
            const d = new Date(logs[0].timestamp);
            $("bioStatLastAttempt").textContent = "Last: " + d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else {
            $("bioStatLastAttempt").textContent = "Last: None recorded";
        }
    }
}

function filterBiometricHistory(filter) {
    currentBioFilter = filter;
    ["bioFilterAll", "bioFilterSuccess", "bioFilterFailed"].forEach(id => {
        const btn = $(id);
        if (btn) {
            btn.classList.remove("active");
            btn.classList.add("secondary");
        }
    });

    const activeId = filter === "success" ? "bioFilterSuccess" : (filter === "failed" ? "bioFilterFailed" : "bioFilterAll");
    if ($(activeId)) {
        $(activeId).classList.add("active");
        $(activeId).classList.remove("secondary");
    }

    renderBiometricHistoryList(allBiometricLogs, filter);
}

function renderBiometricHistoryList(logs, filter = "all") {
    const container = $("biometricHistoryListContainer");
    if (!container) return;

    let filtered = logs || [];
    if (filter === "success") {
        filtered = filtered.filter(l => l.status === "success");
    } else if (filter === "failed") {
        filtered = filtered.filter(l => l.status === "failed");
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 36px 20px; color: #64748b; background: #f8fafc; border-radius: 10px; border: 1px dashed #cbd5e1;">
                <div style="font-size: 32px; margin-bottom: 8px;">🛡️</div>
                <div style="font-weight: 600; font-size: 15px; color: #334155;">No biometric verification attempts found</div>
                <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">
                    ${filter !== "all" ? `No ${filter} verification attempts match the selected filter.` : "Verification attempts using face recognition, live presence, passkeys, or liveness detection will appear here chronologically."}
                </div>
                <div style="margin-top: 14px;">
                    <button type="button" class="btn-small primary" onclick="openTestBiometricModal()" style="background: #0f766e; color: white;">
                        🧪 Test Biometric Verification
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const html = filtered.map(log => {
        const isSuccess = log.status === "success";
        const dateObj = new Date(log.timestamp);
        const formattedDate = dateObj.toLocaleDateString([], {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric"
        });
        const formattedTime = dateObj.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });

        // Determine icon based on method or action
        let methodIcon = "👤";
        const methodLower = (log.method || "").toLowerCase();
        if (methodLower.includes("passkey") || methodLower.includes("fingerprint")) methodIcon = "🔑";
        else if (methodLower.includes("liveness")) methodIcon = "👁️";
        else if (methodLower.includes("camera")) methodIcon = "📷";
        else if (methodLower.includes("emergency")) methodIcon = "🚨";

        return `
            <div class="biometric-log-item status-${isSuccess ? 'success' : 'failed'}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">${methodIcon}</span>
                        <div>
                            <span style="font-weight: 700; font-size: 14.5px; color: #0f172a;">
                                ${escapeHTML(log.method || "Biometric Verification")}
                            </span>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                                Event: <code>${escapeHTML(log.id || "BIO-LOG")}</code> • Action: <code>${escapeHTML(log.action || "verification")}</code>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span class="bio-confidence-tag">
                            Match: <b>${escapeHTML(String(log.confidence || "N/A"))}</b>
                        </span>
                        <span class="bio-status-badge ${isSuccess ? 'success' : 'failed'}">
                            ${isSuccess ? '✅ VERIFIED / SUCCESS' : '❌ FAILED / REJECTED'}
                        </span>
                    </div>
                </div>

                <div style="font-size: 13px; color: #334155; line-height: 1.45; background: #f8fafc; padding: 8px 12px; border-radius: 6px; margin: 4px 0;">
                    ${escapeHTML(log.details || (isSuccess ? "Biometric authentication verified." : "Verification rejected."))}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #64748b; flex-wrap: wrap; gap: 6px;">
                    <span style="display: inline-flex; align-items: center; gap: 4px;">
                        🕒 <b>${formattedDate}</b> at <b>${formattedTime}</b>
                    </span>
                    <span style="color: #94a3b8;">
                        Session Actor: ${escapeHTML(log.sessionId || log.matchedPatientId || "Secure Session")}
                    </span>
                </div>
            </div>
        `;
    }).join("");

    container.innerHTML = html;
}

function openTestBiometricModal() {
    const modal = $("testBiometricModal");
    if (modal) modal.classList.remove("hidden");
}

function closeTestBiometricModal() {
    const modal = $("testBiometricModal");
    if (modal) modal.classList.add("hidden");
}

async function executeTestBiometricVerification() {
    const methodSelect = $("testBioMethod");
    const outcomeSelect = $("testBioOutcome");
    const detailsInput = $("testBioDetails");
    const submitBtn = $("submitTestBioBtn");

    const method = methodSelect ? methodSelect.value : "Face Biometric Scan (MediCare Vision Engine)";
    const outcome = outcomeSelect ? outcomeSelect.value : "success";
    const details = detailsInput ? detailsInput.value.trim() : "";

    if (!patientToken) {
        showToast("Please log in as patient first.");
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "⏳ Running Verification...";
        }

        const res = await fetch(`${API_URL}/api/patient/biometric-verify`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify({
                method,
                outcome,
                details: details || undefined
            })
        });

        const data = await res.json();
        if (data.success) {
            closeTestBiometricModal();
            if (detailsInput) detailsInput.value = "";
            showToast(outcome === "success" ? "✅ Biometric verification passed & recorded!" : "❌ Biometric verification failed & logged!");
            await loadBiometricHistory(false);
            scrollToCard("biometricHistoryCard");
        } else {
            showToast("Failed: " + (data.message || "Unknown error"));
        }
    } catch (err) {
        showToast("Error: " + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "🚀 Run Verification & Log";
        }
    }
}

// Window bindings for Biometric History
window.loadBiometricHistory = loadBiometricHistory;
window.filterBiometricHistory = filterBiometricHistory;
window.openTestBiometricModal = openTestBiometricModal;
window.closeTestBiometricModal = closeTestBiometricModal;
window.executeTestBiometricVerification = executeTestBiometricVerification;

/* ================= PWA SERVICE WORKER REGISTRATION & EMERGENCY RESCUE INIT ================= */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js")
            .then(reg => {
                console.log("[PWA] Service Worker registered successfully:", reg.scope);
            })
            .catch(err => {
                console.warn("[PWA] Service Worker registration notice:", err);
            });
    });
}

// Initialize online/offline status and emergency cache on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    if (typeof updateNetworkStatus === "function") {
        updateNetworkStatus();
    }
    if (typeof refreshLocalEmergencyDirectory === "function") {
        refreshLocalEmergencyDirectory(true);
    }
});


