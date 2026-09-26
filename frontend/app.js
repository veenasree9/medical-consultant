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

    const isPatient = type === "patient";

    $("patientLogin")
        .classList.toggle("hidden", !isPatient);


    if (type === "doctor") {

        $("loginTitle").textContent =
            "Doctor Login";

        $("loginSubtitle").textContent =
            "Use your doctor username and password.";

        $("credentialLabel").textContent =
            "Doctor Username";

        $("username").placeholder =
            "doctor";

    }

    else {

        $("loginTitle").textContent =
            "Patient Login";

        $("loginSubtitle").textContent =
            "Verify your mobile number with OTP.";

        $("credentialLabel").textContent =
            "Patient ID";

        $("username").placeholder =
            "PAT1001";

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
            "Could not load patient details."
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

    $("pEmail").value =
        p.email || "";

    $("pAddress").value =
        p.address || "";

    $("pGuardianName").value =
        p.guardianName || "";

    $("pGuardianPhone").value =
        p.guardianPhone || "";

    $("pNotes").value =
        p.notes || "";


    hideAll();

    $("patientDashboard")
        .classList
        .remove("hidden");
}


/* ================= UPDATE ================= */

function enableUpdate() {

    [
        "pName",
        "pAge",
        "pGender",
        "pBlood",
        "pEmail",
        "pGuardianName",
        "pGuardianPhone",
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
            $("pBlood").value.trim(),

        email:
            $("pEmail").value.trim(),

        guardianName:
            $("pGuardianName").value.trim(),

        guardianPhone:
            $("pGuardianPhone").value.trim(),

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
            "Patient details updated."
        );

    }


    catch (error) {

        showToast(
            error.message
        );
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
                Enter Patient ID.
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
                "Patient not found."
            );
        }


        const p =
            data.patient;


        result.innerHTML = `

            <div class="doctor-result">

                <h3>
                    👤 Patient Found
                </h3>

                <p>
                    <b>Patient ID:</b>
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
                    <b>Guardian:</b>
                    ${escapeHTML(p.guardianName || "Not provided")} (${escapeHTML(p.guardianPhone || "No phone")})
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

    showToast(
        "Registration can be connected to your database later."
    );
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

$("phone").addEventListener(
    "input",
    event => {

        event.target.value =
            event.target.value
                .replace(/\D/g, "")
                .slice(0, 10);

    }
);


$("otp").addEventListener(
    "input",
    event => {

        event.target.value =
            event.target.value
                .replace(/\D/g, "")
                .slice(0, 6);

    }
);


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
