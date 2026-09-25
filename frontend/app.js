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


    else if (type === "helper") {

        $("loginTitle").textContent =
            "Helper Login";

        $("loginSubtitle").textContent =
            "Use your helper username and password.";

        $("credentialLabel").textContent =
            "Helper Username";

        $("username").placeholder =
            "helper";

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


        else if (data.role === "helper") {

            localStorage.setItem(
                "helperToken",
                data.token
            );

            hideAll();

            $("helperDashboard")
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

    localStorage.removeItem(
        "helperToken"
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