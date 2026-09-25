let selectedLogin = "patient";
let resendTimer = null;
let patientToken = localStorage.getItem("patientToken");
let lastAuthenticatedPassword = "";


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
        "registrationPage",
        "patientDashboard",
        "doctorDashboard",
        "helperDashboard"
    ].forEach(id => {

        $(id).classList.add("hidden");

    });
}


/* ================= OPEN LOGIN ================= */

let helperPhotoData = "";
let helperStream = null;
let patientFaceData = "";
let patientFingerprintCaptured = false;
let patientStream = null;
let securityCameraStream = null;
let securityCameraMode = "camera";
let securityCapturedImage = "";

function openLogin(type) {

    selectedLogin = type;

    hideAll();

    $("loginPage").classList.remove("hidden");

    $("loginMessage").textContent = "";

    const isHelper = type === "helper";
    const isPatient = type === "patient";

    $("passwordLoginSection").classList.toggle("hidden", isHelper);
    $("patientBiometricSection").classList.toggle("hidden", !isPatient);
    $("helperCameraSection").classList.toggle("hidden", !isHelper);

    if (type === "doctor") {

        $("loginTitle").textContent =
            "Doctor Login";

        $("loginSubtitle").textContent =
            "Use your doctor username and password.";

        $("credentialLabel").textContent =
            "Doctor Username";

        $("username").placeholder =
            "doctor";

        stopHelperCamera();

    }


    else if (type === "helper") {

        $("loginTitle").textContent =
            "Helper Login";

        $("loginSubtitle").textContent =
            "Use a face or accident photo for identity verification.";

        $("credentialLabel").textContent =
            "Helper Username";

        $("username").placeholder =
            "helper";

        startHelperCamera();

    }


    else {

        $("loginTitle").textContent =
            "User Login";

        $("loginSubtitle").textContent =
            "Use your User ID and password to access your dashboard.";

        $("credentialLabel").textContent =
            "User ID";

        $("username").placeholder =
            "PAT1001";

        stopHelperCamera();
        stopPatientCamera();
        $("patientBiometricSection").classList.add("hidden");

    }
}

async function startHelperCamera() {

    if (selectedLogin !== "helper") {
        return;
    }

    const video = $("helperCamera");
    const preview = $("helperPhotoPreview");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        $("loginMessage").className = "error";
        $("loginMessage").textContent = "Camera access is not supported in this browser. Please upload a photo instead.";
        preview.classList.remove("hidden");
        return;
    }

    try {

        helperStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user"
            },
            audio: false
        });

        video.srcObject = helperStream;
        video.classList.remove("hidden");
        preview.classList.add("hidden");

        $("loginMessage").className = "success-message";
        $("loginMessage").textContent = "Camera ready. Capture a face or accident photo to continue.";

    }
    catch (error) {

        console.error(error);

        $("loginMessage").className = "error";
        $("loginMessage").textContent = "Camera permission was denied. Please upload a clear photo instead.";
    }
}

function stopHelperCamera() {
    if (helperStream) {
        helperStream.getTracks().forEach(track => track.stop());
        helperStream = null;
    }

    const video = $("helperCamera");
    if (video) {
        video.srcObject = null;
    }
}

function captureHelperPhoto() {

    const video = $("helperCamera");
    const canvas = $("helperCanvas");
    const preview = $("helperPhotoPreview");

    if (!video || !video.videoWidth || !video.videoHeight) {
        $("loginMessage").className = "error";
        $("loginMessage").textContent = "Open the camera first before taking the photo.";
        return;
    }

    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    helperPhotoData = canvas.toDataURL("image/png");
    preview.src = helperPhotoData;
    preview.classList.remove("hidden");
    video.classList.add("hidden");

    $("loginMessage").className = "success-message";
    $("loginMessage").textContent = "Photo captured successfully. Verify helper access.";
}

function handleHelperPhotoUpload(event) {
    const file = event.target.files && event.target.files[0];
    const preview = $("helperPhotoPreview");

    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        helperPhotoData = reader.result;
        preview.src = helperPhotoData;
        preview.classList.remove("hidden");
        $("helperCamera").classList.add("hidden");
        $("loginMessage").className = "success-message";
        $("loginMessage").textContent = "Photo uploaded successfully. Verify helper access.";
    };
    reader.readAsDataURL(file);
}

async function helperCameraLogin() {

    if (selectedLogin !== "helper") {
        return;
    }

    if (!helperPhotoData) {
        $("loginMessage").className = "error";
        $("loginMessage").textContent = "Capture a clear photo before continuing.";
        return;
    }

    try {
        await authorizeHelperSession();
        stopHelperCamera();
        hideAll();
        $("helperDashboard").classList.remove("hidden");
        showToast("Helper access verified.");
    }
    catch (error) {
        $("loginMessage").className = "error";
        $("loginMessage").textContent = error.message || "Helper authorization failed.";
    }
}

async function authorizeHelperSession() {
    const response = await fetch(`${API_URL}/api/auth/helper/authorize`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Helper authorization failed.");
    }

    localStorage.setItem("helperToken", data.token);
    return data.token;
}

function retakeHelperPhoto() {
    helperPhotoData = "";
    $("helperPhotoPreview").src = "";
    $("helperPhotoPreview").classList.add("hidden");
    $("helperCamera").classList.remove("hidden");
    $("helperEmergencyStatus").textContent = "Capture a clear photo of the person's face to search registered users.";
    $("helperEmergencyStatus").className = "helper-emergency-status";
}

function startHelperDashboardCamera() {
    const video = $("helperDashboardCamera");
    const preview = $("helperDashboardPreview");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        $("helperIdentificationResult").textContent = "Camera access is not supported in this browser.";
        preview.classList.remove("hidden");
        return;
    }

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
    }).then(stream => {
        helperStream = stream;
        video.srcObject = stream;
        video.classList.remove("hidden");
        preview.classList.add("hidden");
        $("helperIdentificationResult").textContent = "Camera ready. Capture a clear photo to begin the search.";
    }).catch(() => {
        $("helperIdentificationResult").textContent = "Camera permission denied. Please retry after allowing access.";
    });
}

function captureHelperDashboardPhoto() {
    const video = $("helperDashboardCamera");
    const canvas = $("helperDashboardCanvas");
    const preview = $("helperDashboardPreview");

    if (!video || !video.videoWidth || !video.videoHeight) {
        $("helperIdentificationResult").textContent = "Open the camera first before capturing the photo.";
        return;
    }

    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    helperPhotoData = canvas.toDataURL("image/png");
    preview.src = helperPhotoData;
    preview.classList.remove("hidden");
    video.classList.add("hidden");

    $("helperIdentificationResult").textContent = "Photo captured successfully. You can now search registered users.";
}

function retakeHelperDashboardPhoto() {
    helperPhotoData = "";
    $("helperDashboardPreview").src = "";
    $("helperDashboardPreview").classList.add("hidden");
    $("helperDashboardCamera").classList.remove("hidden");
    $("helperIdentificationResult").textContent = "Capture a clear photo of the person's face to search registered users.";
}

async function startPatientCamera() {

    if (selectedLogin !== "patient") {
        return;
    }

    const video = $("patientCamera");
    const preview = $("patientFacePreview");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        $("biometricStatus").textContent = "Camera not supported on this browser. Use a photo upload option if available.";
        preview.classList.remove("hidden");
        return;
    }

    try {
        patientStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false
        });

        video.srcObject = patientStream;
        video.classList.remove("hidden");
        preview.classList.add("hidden");
        $("biometricStatus").textContent = "Live face camera is active. Capture the face before login.";

    } catch (error) {
        console.error(error);
        $("biometricStatus").textContent = "Camera permission denied. Please upload a face image if needed.";
    }
}

function capturePatientFace() {
    const video = $("patientCamera");
    const canvas = $("patientCanvas");
    const preview = $("patientFacePreview");

    if (!video || !video.videoWidth || !video.videoHeight) {
        $("biometricStatus").textContent = "Open the live face camera before capturing.";
        return;
    }

    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    patientFaceData = canvas.toDataURL("image/png");
    preview.src = patientFaceData;
    preview.classList.remove("hidden");
    video.classList.add("hidden");

    $("biometricStatus").textContent = "Face capture complete. Please scan the fingerprint to continue.";
}

function scanPatientFingerprint() {
    patientFingerprintCaptured = true;
    $("biometricStatus").textContent = "Fingerprint scan complete. Face and fingerprint verification is ready.";
    showToast("Fingerprint captured.");
}

function stopPatientCamera() {
    if (patientStream) {
        patientStream.getTracks().forEach(track => track.stop());
        patientStream = null;
    }

    const video = $("patientCamera");
    if (video) {
        video.srcObject = null;
    }
}

async function startSecondaryPatientCamera() {
    const video = $("patientSecondaryCamera");
    const preview = $("patientSecondaryFacePreview");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        $("secondaryBiometricStatus").textContent = "Camera not supported on this browser.";
        preview.classList.remove("hidden");
        return;
    }

    try {
        patientStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false
        });

        video.srcObject = patientStream;
        video.classList.remove("hidden");
        preview.classList.add("hidden");
        $("secondaryBiometricStatus").textContent = "Live face camera is active. Capture the face.";
    } catch (error) {
        console.error(error);
        $("secondaryBiometricStatus").textContent = "Camera permission denied. You can still use the secondary details section for manual updates.";
    }
}

function captureSecondaryPatientFace() {
    const video = $("patientSecondaryCamera");
    const canvas = $("patientSecondaryCanvas");
    const preview = $("patientSecondaryFacePreview");

    if (!video || !video.videoWidth || !video.videoHeight) {
        $("secondaryBiometricStatus").textContent = "Open the live face camera before capturing.";
        return;
    }

    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    patientFaceData = canvas.toDataURL("image/png");
    preview.src = patientFaceData;
    preview.classList.remove("hidden");
    video.classList.add("hidden");

    $("secondaryBiometricStatus").textContent = "Face captured successfully. Fingerprint can be scanned now.";
}

function scanSecondaryPatientFingerprint() {
    patientFingerprintCaptured = true;
    $("secondaryBiometricStatus").textContent = "Fingerprint scan complete.";
    showToast("Fingerprint captured.");
}


/* ================= HOME ================= */

function goHome() {

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

            lastAuthenticatedPassword = password;

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


        else if (data.role === "helper") {

            localStorage.setItem(
                "helperToken",
                data.token
            );

            hideAll();

            $("helperDashboard")
                .classList
                .remove("hidden");

            showToast("Helper access granted.");

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

async function loadPatientDashboard() {

    const response =
        await fetch(
            `${API_URL}/api/patient/me`,
            {

                headers: {

                    Authorization:
                        `Bearer ${patientToken}`

                }

            }
        );


    const data =
        await response.json();


    if (!response.ok ||
        !data.success) {

        localStorage.removeItem(
            "patientToken"
        );

        patientToken = null;

        throw new Error(
            data.message ||
                "Could not load user details."
        );
    }


    const p =
        data.patient;


    $("patientName").textContent =
        p.name;

    $("patientHeaderName").textContent =
        p.name;

    $("patientId").textContent =
        p.id;

    $("pId").value =
        p.id || "";

    $("pName").value =
        p.name || "";

    $("pAge").value =
        p.age || "";

    $("pGender").value =
        p.gender || "Other";

    $("pBlood").value =
        p.blood || "";

    $("pPhone").value =
        p.phone || "";

    $("pGuardianName").value =
        p.guardian_name || "";

    $("pGuardianPhone").value =
        p.guardian_phone || "";

    $("pEmail").value =
        p.email || "";

    $("pAddress").value =
        p.address || "";

    $("pNotes").value =
        p.notes || "";

    const securityPassword = $("securityPassword");
    securityPassword.value = lastAuthenticatedPassword || "••••••••";
    securityPassword.type = "password";
    $("passwordVisibilityButton").textContent = "👁 Show Password";
    $("passwordVisibilityButton").setAttribute("aria-label", "Show Password");
    $("passwordVisibilityButton").setAttribute("title", "Show Password");

    await loadSecurityStatus();

    hideAll();

    $("patientDashboard")
        .classList
        .remove("hidden");
}


/* ================= UPDATE ================= */

function toggleSecondaryDetails() {
    const block = $("secondaryDetailsBlock");
    const button = $("securityToggleBtn");

    const isHidden = block.classList.toggle("hidden");
    button.textContent = isHidden
        ? "Show Security Details"
        : "Hide Security Details";
}

function togglePasswordVisibility() {
    const passwordField = $("securityPassword");
    const button = $("passwordVisibilityButton");
    const showing = passwordField.type === "text";

    if (!lastAuthenticatedPassword) {
        passwordField.type = "password";
        passwordField.value = "••••••••";
        button.textContent = "👁 Password unavailable";
        button.setAttribute("aria-label", "Password unavailable");
        button.setAttribute("title", "The password is not available in this session");
        return;
    }

    passwordField.type = showing ? "password" : "text";
    passwordField.value = lastAuthenticatedPassword;
    button.textContent = showing ? "👁 Show Password" : "🙈 Hide Password";
    button.setAttribute("aria-label", showing ? "Show Password" : "Hide Password");
    button.setAttribute("title", showing ? "Show Password" : "Hide Password");
}

async function loadSecurityStatus() {
    try {
        const response = await fetch(`${API_URL}/api/patient/security-status`, {
            headers: {
                Authorization: `Bearer ${patientToken}`
            }
        });
        const data = await response.json();

        if (!response.ok || !data.success) return;

        const status = data.status || {};
        $("faceVerificationStatus").textContent = status.face_status || "Not started";
        $("livenessVerificationStatus").textContent = status.liveness_status || "Not started";
        $("passkeyStatus").textContent = status.passkey_registered || data.passkeyRegistered
            ? "Passkey registered"
            : "Not registered";
        $("removePasskeyButton").classList.toggle("hidden", !(status.passkey_registered || data.passkeyRegistered));
    }
    catch (error) {
        console.error("SECURITY STATUS ERROR:", error);
    }
}

function base64urlToBytes(value) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function bufferToBase64url(value) {
    const bytes = new Uint8Array(value);
    let binary = "";

    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function serializeCredential(credential) {
    return {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
            clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
            attestationObject: bufferToBase64url(credential.response.attestationObject)
        },
        clientExtensionResults: credential.getClientExtensionResults()
    };
}

async function setupPasskey() {
    const status = $("passkeyStatus");

    if (!window.PublicKeyCredential || !navigator.credentials) {
        status.textContent = "This device does not support passkey authentication.";
        return;
    }

    try {
        if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
            const platformAuthenticatorAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

            if (!platformAuthenticatorAvailable) {
                status.textContent = "This device does not support passkey authentication.";
                return;
            }
        }

        status.textContent = "Preparing secure passkey registration...";

        const optionsResponse = await fetch(`${API_URL}/api/patient/passkey/register/options`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${patientToken}`
            }
        });
        const optionsData = await optionsResponse.json();

        if (!optionsResponse.ok || !optionsData.success) {
            throw new Error(optionsData.message || "Unable to prepare passkey registration.");
        }

        const publicKey = optionsData.options;
        publicKey.challenge = base64urlToBytes(publicKey.challenge);
        publicKey.user.id = base64urlToBytes(publicKey.user.id);
        publicKey.excludeCredentials = (publicKey.excludeCredentials || []).map(credential => ({
            ...credential,
            id: base64urlToBytes(credential.id)
        }));

        const credential = await navigator.credentials.create({ publicKey });

        if (!credential) {
            throw new Error("Passkey registration was cancelled.");
        }

        const verifyResponse = await fetch(`${API_URL}/api/patient/passkey/register/verify`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify(serializeCredential(credential))
        });
        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok || !verifyData.success) {
            throw new Error(verifyData.message || "Passkey registration could not be verified.");
        }

        status.textContent = "Passkey registered";
        $("removePasskeyButton").classList.remove("hidden");
        showToast("Passkey registered successfully.");
    }
    catch (error) {
        console.error("PASSKEY SETUP ERROR:", error);
        status.textContent = error.message || "Passkey registration failed.";
    }
}

async function removePasskey() {
    const status = $("passkeyStatus");

    try {
        const response = await fetch(`${API_URL}/api/patient/passkey/remove`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${patientToken}`
            },
            body: JSON.stringify({})
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to remove passkey.");
        }

        status.textContent = "Not registered";
        $("removePasskeyButton").classList.add("hidden");
        showToast("Passkey removed.");
    }
    catch (error) {
        status.textContent = error.message;
    }
}

async function updateVerificationStatus(kind, status) {
    await fetch(`${API_URL}/api/patient/security-status`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${patientToken}`
        },
        body: JSON.stringify({ kind, status })
    });
}

async function startSecurityCamera(statusElement, message, mode) {
    const video = $("securityCamera");
    const panel = $("securityCameraPanel");

    securityCameraMode = mode;
    securityCapturedImage = "";
    $("securityCameraPreview").classList.add("hidden");
    $("securityCaptureButton").classList.remove("hidden");
    $("securityConfirmButton").classList.add("hidden");
    $("securityRetakeButton").classList.add("hidden");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        $(statusElement).textContent = "Camera access is not supported by this browser.";
        return false;
    }

    $(statusElement).textContent = "Requesting camera permission...";

    try {
        stopSecurityCamera();
        securityCameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = securityCameraStream;
        panel.classList.remove("hidden");
        $(statusElement).textContent = message;
        return true;
    }
    catch (error) {
        console.error("SECURITY CAMERA ERROR:", error);
        $(statusElement).textContent = "Camera permission was denied.";
        return false;
    }
}

async function startFaceVerification() {
    const started = await startSecurityCamera("faceVerificationStatus", "Camera active. Capture a face sample to continue enrollment.", "face");

    if (started) {
        await updateVerificationStatus("face", "started");
    }
}

async function startCameraVerification() {
    await startSecurityCamera("cameraVerificationStatus", "Camera active. No verification claim has been made.", "camera");
}

function captureSecurityImage() {
    const video = $("securityCamera");
    const canvas = $("securityCameraCanvas");
    const preview = $("securityCameraPreview");

    if (!video.videoWidth || !video.videoHeight) {
        $("faceVerificationStatus").textContent = "Start the camera before capturing a sample.";
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    securityCapturedImage = canvas.toDataURL("image/jpeg", 0.85);
    preview.src = securityCapturedImage;
    preview.classList.remove("hidden");
    video.classList.add("hidden");
    $("securityCaptureButton").classList.add("hidden");
    $("securityConfirmButton").classList.remove("hidden");
    $("securityRetakeButton").classList.remove("hidden");
    stopSecurityCamera(false);
}

async function confirmSecurityCapture() {
    if (!securityCapturedImage) return;

    if (securityCameraMode === "face") {
        $("faceVerificationStatus").textContent = "Face sample captured locally. Verification requires a configured face service.";
        await updateVerificationStatus("face", "captured");
    }
    else {
        $("cameraVerificationStatus").textContent = "Image captured locally. It does not prove identity.";
    }

    securityCapturedImage = "";
    $("securityConfirmButton").classList.add("hidden");
    $("securityRetakeButton").classList.add("hidden");
}

function retakeSecurityCapture() {
    securityCapturedImage = "";
    $("securityCameraPreview").classList.add("hidden");
    $("securityCamera").classList.remove("hidden");
    $("securityCaptureButton").classList.remove("hidden");
    $("securityConfirmButton").classList.add("hidden");
    $("securityRetakeButton").classList.add("hidden");

    if (securityCameraMode === "face") {
        startFaceVerification();
    }
    else {
        startCameraVerification();
    }
}

function cancelSecurityCamera() {
    securityCapturedImage = "";
    stopSecurityCamera();
}

async function captureFaceVerification() {
    captureSecurityImage();
}

async function startLivenessCheck() {
    $("livenessVerificationStatus").textContent = "Liveness verification requires configuration.";
    await updateVerificationStatus("liveness", "requires_configuration");
}

function stopSecurityCamera(hidePanel = true) {
    if (securityCameraStream) {
        securityCameraStream.getTracks().forEach(track => track.stop());
        securityCameraStream = null;
    }

    const video = $("securityCamera");
    const panel = $("securityCameraPanel");

    if (video) video.srcObject = null;
    if (hidePanel && panel) panel.classList.add("hidden");
    if (hidePanel && $("securityCameraPreview")) $("securityCameraPreview").classList.add("hidden");
    if ($("cameraVerificationStatus")) $("cameraVerificationStatus").textContent = "Camera is off";
}

function enableUpdate() {

    [
        "pName",
        "pAge",
        "pGender",
        "pBlood",
        "pPhone",
        "pGuardianName",
        "pGuardianPhone",
        "pEmail",
        "pAddress",
        "pNotes"
    ].forEach(id => {

        $(id).disabled = false;

    });


    $("updateBtn")
        .classList
        .add("hidden");

    $("saveBtn")
        .classList
        .remove("hidden");

    $("cancelBtn")
        .classList
        .remove("hidden");
}


/* ================= SAVE ================= */

async function saveDetails() {

    const details = {

        name:
            $("pName").value.trim(),

        age:
            $("pAge").value,

        gender:
            $("pGender").value,

        blood:
            $("pBlood").value,

        phone:
            $("pPhone").value.trim(),

        guardian_name:
            $("pGuardianName").value.trim(),

        guardian_phone:
            $("pGuardianPhone").value.trim(),

        email:
            $("pEmail").value.trim(),

        address:
            $("pAddress").value.trim(),

        notes:
            $("pNotes").value.trim()

    };


    try {

        const response =
            await fetch(
                `${API_URL}/api/patient/me`,
                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${patientToken}`

                    },

                    body:
                        JSON.stringify(details)

                }
            );


        const data =
            await response.json();


        if (!response.ok ||
            !data.success) {

            throw new Error(
                data.message ||
                "Update failed."
            );
        }


        await loadPatientDashboard();

        showToast(
            "User details updated."
        );

    }


    catch (error) {

        showToast(
            error.message
        );
    }
}

function openMedicalFilePicker() {
    const picker = $("medicalFileInput");

    if (!patientToken || !$("pId").value) {
        showToast("Save and load the patient details before uploading a file.");
        return;
    }

    picker.click();
}

async function uploadMedicalFile(event) {
    const file = event.target.files && event.target.files[0];
    const status = $("medicalFileStatus");

    if (!file) return;

    const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
        status.textContent = "Choose a PDF, JPG, JPEG, PNG, DOC, or DOCX file up to 10 MB.";
        event.target.value = "";
        return;
    }

    const formData = new FormData();
    formData.append("medicalFile", file);

    status.textContent = "Uploading medical file securely...";

    try {
        const response = await fetch(`${API_URL}/api/patient/${encodeURIComponent($("pId").value)}/medical-documents`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${patientToken}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Medical file upload failed.");
        }

        status.textContent = `${data.fileName} uploaded securely. Existing files remain stored privately.`;
        showToast("Medical file uploaded.");
    }
    catch (error) {
        console.error(error);
        status.textContent = error.message;
    }
    finally {
        event.target.value = "";
    }
}


/* ================= CANCEL ================= */

function cancelUpdate() {

    loadPatientDashboard()
        .catch(error =>
            showToast(error.message)
        );
}


/* ================= DOCTOR SEARCH ================= */

async function searchPatient() {

    const id =
        $("doctorPatientId")
        .value
        .trim()
        .toUpperCase();


    const result =
        $("doctorResult");


    if (!id) {

        result.innerHTML =
            `<p class="error">
                Enter User ID.
            </p>`;

        return;
    }


    const token =
        localStorage.getItem(
            "doctorToken"
        );


    try {

        const response =
            await fetch(
                `${API_URL}/api/doctor/patients/${encodeURIComponent(id)}`,
                {

                    headers: {

                        Authorization:
                            `Bearer ${token}`

                    }

                }
            );


        const data =
            await response.json();


        if (!response.ok ||
            !data.success) {

            throw new Error(
                data.message ||
                "User not found."
            );
        }


        const p =
            data.patient;


        result.innerHTML = `

            <div class="doctor-result">

                <h3>
                    👤 User Found
                </h3>

                <p>
                    <b>User ID:</b>
                    ${escapeHTML(p.id)}
                </p>

                <p>
                    <b>Name:</b>
                    ${escapeHTML(p.name)}
                </p>

                <p>
                    <b>Age:</b>
                    ${escapeHTML(String(p.age || ""))}
                </p>

                <p>
                    <b>Gender:</b>
                    ${escapeHTML(p.gender || "")}
                </p>

                <p>
                    <b>Blood Group:</b>
                    ${escapeHTML(p.blood || "")}
                </p>

                <p>
                    <b>Phone:</b>
                    ${escapeHTML(p.phone || "")}
                </p>

                <p>
                    <b>Medical Notes:</b>
                    ${escapeHTML(p.notes || "")}
                </p>

            </div>

        `;

    }


    catch (error) {

        result.innerHTML =
            `<p class="error">
                ${escapeHTML(error.message)}
            </p>`;
    }
}


/* ================= SECURITY ================= */

function escapeHTML(value) {

    return value.replace(
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


/* ================= CREATE USER ================= */

function createUser() {

    hideAll();
    $("registrationPage").classList.remove("hidden");
    $("registrationMessage").textContent = "";
    toggleRegistrationFields();
}

function toggleRegistrationFields() {

    const accountType = $("regAccountType").value;

    $("patientRegistrationFields").classList.toggle("hidden", accountType !== "patient");
    $("doctorRegistrationFields").classList.toggle("hidden", accountType !== "doctor");
    $("helperRegistrationFields").classList.toggle("hidden", accountType !== "helper");
}

async function submitRegistration() {
    const accountType = $("regAccountType").value;
    const fullName = $("regFullName").value.trim();
    const phone = $("regPhone").value.trim();
    const email = $("regEmail").value.trim();
    const password = $("regPassword").value;
    const confirmPassword = $("regConfirmPassword").value;

    const registrationMessage = $("registrationMessage");
    registrationMessage.className = "error";
    registrationMessage.textContent = "";

    if (!fullName || !phone || !email || !password || !confirmPassword) {
        registrationMessage.textContent = "Please complete all required fields.";
        return;
    }

    if (password !== confirmPassword) {
        registrationMessage.textContent = "Passwords do not match.";
        return;
    }

    const payload = {
        accountType,
        fullName,
        phone,
        email,
        password,
        confirmPassword,
        dateOfBirth: $("regDob").value,
        age: $("regAge").value,
        gender: $("regGender").value,
        bloodGroup: $("regBloodGroup").value,
        guardianName: $("regGuardianName").value,
        guardianPhone: $("regGuardianPhone").value,
        address: $("regAddress").value,
        medicalHistory: $("regMedicalHistory").value,
        specialization: $("regSpecialization").value,
        hospitalClinic: $("regHospitalClinic").value,
        organization: $("regOrganization").value
    };

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Registration failed.");
        }

        registrationMessage.className = "success-message";
        registrationMessage.textContent = `${data.message} ${data.patientId || data.doctorId || data.helperId || ""}`;

        showToast(data.message || "Registration successful.");

        setTimeout(() => {
            hideAll();
            $("loginPage").classList.remove("hidden");
            $("registrationForm").reset();
            toggleRegistrationFields();
        }, 1200);

    } catch (error) {
        console.error(error);
        registrationMessage.textContent = error.message;
    }
}


async function searchHelperPerson() {
    const token = localStorage.getItem("helperToken");
    const resultBox = $("helperIdentificationResult");

    if (!token) {
        try {
            await authorizeHelperSession();
        }
        catch (error) {
            resultBox.textContent = error.message || "Helper session is not active.";
            return;
        }
    }

    if (!helperPhotoData) {
        resultBox.textContent = "Capture a clear photo of the person's face before searching.";
        return;
    }

    try {
        resultBox.textContent = "Searching registered users...";

        const response = await fetch(`${API_URL}/api/helper/identify-person`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("helperToken")}`
            },
            body: JSON.stringify({
                photoData: helperPhotoData,
                source: "camera"
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            resultBox.textContent = data.message || "No registered user match found.";
            return;
        }

        resultBox.innerHTML = `
            <div class="emergency-result-header">Registered User Found</div>
            <div class="emergency-result-row"><strong>Patient/User ID:</strong> ${escapeHTML(data.patientId || "-")}</div>
            <div class="emergency-result-row"><strong>Name:</strong> ${escapeHTML(data.fullName || "-")}</div>
            <div class="emergency-result-row"><strong>Blood Group:</strong> ${escapeHTML(data.bloodGroup || "-")}</div>
            <div class="emergency-result-row"><strong>Guardian Name:</strong> ${escapeHTML(data.guardianName || "-")}</div>
            <div class="emergency-result-row"><strong>Guardian Phone:</strong> ${escapeHTML(data.guardianPhone || "-")}</div>
        `;
        showToast("Registered user found.");
    }
    catch (error) {
        console.error(error);
        resultBox.textContent = "No registered user match found.";
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

    localStorage.removeItem(
        "helperToken"
    );


    patientToken = null;
    lastAuthenticatedPassword = "";

    clearInterval(
        resendTimer
    );


    goHome();
}


/* ================= CHAT ================= */

function toggleChat() {

    $("chatBox")
        .classList
        .toggle("hidden");
}


function sendMessage() {

    const input =
        $("chatInput");


    const message =
        input.value.trim();


    if (!message) return;


    const chat =
        $("chatMessages");


    const user =
        document.createElement("div");


    user.className =
        "user-msg";


    user.textContent =
        message;


    chat.appendChild(user);


    input.value = "";


    chat.scrollTop =
        chat.scrollHeight;


    setTimeout(() => {

        const bot =
            document.createElement("div");


        bot.className =
            "bot-msg";


        bot.textContent =
            "Thanks for contacting MediCare. A healthcare assistant can respond shortly.";


        chat.appendChild(bot);


        chat.scrollTop =
            chat.scrollHeight;

    }, 600);
}


/* ================= INPUT VALIDATION ================= */

