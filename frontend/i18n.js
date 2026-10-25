/**
 * i18n.js
 * Internationalization engine for MediCare Consultant powered by i18next.
 * Supports English (en), Hindi (hi), Telugu (te), Tamil (ta), Kannada (kn), and Spanish (es).
 */

const APP_LANGUAGES = {
    en: { name: "English", nativeName: "English", flag: "🇬🇧" },
    hi: { name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
    te: { name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
    ta: { name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
    kn: { name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
    es: { name: "Spanish", nativeName: "Español", flag: "🇪🇸" }
};

const I18N_RESOURCES = {
    en: {
        translation: {
            // Brand & Navigation
            "brand.name": "MediCare Consultant",
            "nav.home": "Home",
            "nav.about": "About",
            "nav.contact": "Contact",
            "nav.language": "Language",

            // Hero
            "hero.eyebrow": "DIGITAL HEALTHCARE PORTAL",
            "hero.title": "Medical care,",
            "hero.titleHighlight": "made simple.",
            "hero.subtitle": "Secure access for patients, doctors and healthcare helpers.",

            // Portal Card
            "portal.title": "Login Portal",
            "portal.subtitle": "Choose how you want to sign in.",
            "portal.roleDoctor": "👨‍⚕️ Login as Doctor",
            "portal.roleHelper": "🧑‍⚕️ Login as Helper",
            "portal.rolePatient": "👨‍🦰 Login as Patient",

            // Login Page
            "login.back": "← Back",
            "login.patientTitle": "Patient Login",
            "login.doctorTitle": "Doctor Login",
            "login.helperTitle": "Healthcare Helper Login",
            "login.demoTitle": "⚡ Quick Demo Access",
            "login.oneClickFill": "1-Click Fill",
            "login.demoPatientBtn": "👨‍🦰 Demo Patient (PAT1001 / 1234)",
            "login.demoDoctorBtn": "👨‍⚕️ Demo Doctor (doctor / 1234)",
            "login.demoTip": "Also supports phone (+919876543210) or registered email with password 1234.",
            "login.patientLabel": "Patient ID / Phone / Email",
            "login.patientPlaceholder": "Enter Patient ID (e.g. PAT1001), Phone, or Email",
            "login.doctorLabel": "Doctor Username / Phone",
            "login.doctorPlaceholder": "Enter Doctor ID (e.g. doctor) or Phone",
            "login.passwordLabel": "Password",
            "login.passwordPlaceholder": "Enter your password",
            "login.togglePassword": "Show or hide password",
            "login.signInBtn": "Sign In with Password",
            "login.divider": "OR",
            "login.sendOtpBtn": "📲 Login with Mobile OTP",
            "login.phoneLabel": "Phone Number",
            "login.phonePlaceholder": "Enter 10-digit mobile number (e.g. 9876543210)",
            "login.sendOtpAction": "Send OTP Code",
            "login.otpLabel": "Enter 6-Digit OTP",
            "login.otpPlaceholder": "Enter code (e.g. 123456)",
            "login.verifyOtpBtn": "Verify OTP & Login",
            "login.resendOtp": "Resend OTP",
            "login.usePassword": "Use Password Login Instead",
            "login.helperInfo": "Helpers can instantly identify patients in emergency situations using biometrics.",
            "login.emergencyBtn": "🚨 Launch Emergency Camera Identification",

            // Patient Dashboard
            "patient.dashboard": "Patient Health Portal",
            "patient.welcome": "Welcome",
            "patient.id": "Patient ID",
            "patient.phone": "Phone",
            "patient.age": "Age",
            "patient.gender": "Gender",
            "patient.bloodGroup": "Blood Group",
            "patient.address": "Address",
            "patient.guardian": "Emergency Contact",
            "patient.logout": "Sign Out",
            "patient.bookAppt": "📅 Schedule Appointment",
            "patient.exportPdf": "📄 Download Medical Record PDF",
            "patient.remindersCenter": "🔔 Reminders Center",

            // Biometric History
            "biometric.historyTitle": "Biometric Verification History",
            "biometric.historySubtitle": "Chronological log of all successful and failed biometric verification attempts, methods used, and timestamps.",
            "biometric.refresh": "Refresh Log",
            "biometric.testVerification": "Test Verification",
            "biometric.totalAttempts": "Total Attempts",
            "biometric.successfulVerifications": "Successful",
            "biometric.failedAttempts": "Failed / Rejected",
            "biometric.activeEngines": "Active Engines",
            "biometric.noLogs": "No biometric verification attempts recorded yet.",

            // Tabs
            "tab.overview": "Overview & Timeline",
            "tab.questionnaire": "Health Questionnaire",
            "tab.documents": "Medical Documents",
            "tab.consultations": "Consultations & Doctors",
            "tab.ai": "MediCare AI Assistant",
            "tab.verifications": "Identity & Biometrics",
            "tab.account": "Profile & Guardians",

            // Doctor Dashboard
            "doctor.dashboard": "Doctor Clinical Portal",
            "doctor.welcome": "Dr. Sharma",
            "doctor.specialization": "General Medicine",
            "doctor.authorizedPatients": "Authorized Patients",
            "doctor.pendingRequests": "Pending Access Requests",
            "doctor.requestAccess": "Request Patient Access",
            "doctor.searchPlaceholder": "Enter Patient ID (e.g. PAT1001)",
            "doctor.sendRequestBtn": "Send Access Request",
            "doctor.viewRecord": "View Complete Record",
            "doctor.exportRecordPdf": "Export Official PDF",
            "doctor.noPatients": "No authorized patients currently.",

            // Helper Dashboard
            "helper.dashboard": "Emergency Biometric Identification",
            "helper.notice": "For first responders and emergency healthcare workers.",
            "helper.capturePhoto": "Capture Camera Photo",
            "helper.identifyBtn": "🔍 Identify Patient with Biometrics",
            "helper.privacyNotice": "Privacy Guaranteed: Helper access only displays emergency contact and blood group.",
            "helper.matchedPatient": "Identified Patient",
            "helper.guardianPhone": "Emergency Guardian Phone",
            "helper.callGuardian": "📞 Call Emergency Guardian",

            // Common Actions & Alerts
            "common.save": "Save Changes",
            "common.cancel": "Cancel",
            "common.close": "Close",
            "common.confirm": "Confirm",
            "common.upload": "Upload Document",
            "common.loading": "Loading...",
            "common.success": "Success",
            "common.error": "Error",
            "common.switchLanguage": "Language",

            // About & Contact Sections
            "about.title": "About MediCare Consultant",
            "about.text": "MediCare is a comprehensive digital healthcare platform facilitating patient record access, secure doctor-patient authorization, emergency biometric identification, and automated consultation scheduling.",
            "contact.title": "Healthcare Support & Assistance",
            "contact.text": "For patient records support, hospital onboarding, or technical assistance, contact your healthcare provider's IT administrator."
        }
    },
    hi: {
        translation: {
            "brand.name": "मेडीकेयर कंसल्टेंट",
            "nav.home": "होम",
            "nav.about": "हमारे बारे में",
            "nav.contact": "संपर्क",
            "nav.language": "भाषा",

            "hero.eyebrow": "डिजिटल स्वास्थ्य सेवा पोर्टल",
            "hero.title": "चिकित्सा सेवा,",
            "hero.titleHighlight": "अब हुई आसान।",
            "hero.subtitle": "मरीज़ों, डॉक्टरों और आपातकालीन सहायकों के लिए सुरक्षित डिजिटल पहुंच।",

            "portal.title": "लॉगिन पोर्टल",
            "portal.subtitle": "कृपया साइन इन करने का तरीका चुनें।",
            "portal.roleDoctor": "👨‍⚕️ डॉक्टर के रूप में लॉगिन करें",
            "portal.roleHelper": "🧑‍⚕️ सहायक के रूप में लॉगिन करें",
            "portal.rolePatient": "👨‍🦰 मरीज़ के रूप में लॉगिन करें",

            "login.back": "← वापस जाएं",
            "login.patientTitle": "मरीज़ लॉगिन",
            "login.doctorTitle": "डॉक्टर लॉगिन",
            "login.helperTitle": "स्वास्थ्य सहायक लॉगिन",
            "login.demoTitle": "⚡ त्वरित डेमो एक्सेस",
            "login.oneClickFill": "1-क्लिक भरें",
            "login.demoPatientBtn": "👨‍🦰 डेमो मरीज़ (PAT1001 / 1234)",
            "login.demoDoctorBtn": "👨‍⚕️ डेमो डॉक्टर (doctor / 1234)",
            "login.demoTip": "फ़ोन (+919876543210) या ईमेल और पासवर्ड 1234 के साथ भी समर्थित।",
            "login.patientLabel": "मरीज़ आईडी / फ़ोन / ईमेल",
            "login.patientPlaceholder": "मरीज़ आईडी (उदा. PAT1001), फ़ोन या ईमेल दर्ज करें",
            "login.doctorLabel": "डॉक्टर यूज़रनेम / फ़ोन",
            "login.doctorPlaceholder": "डॉक्टर आईडी (उदा. doctor) या फ़ोन दर्ज करें",
            "login.passwordLabel": "पासवर्ड",
            "login.passwordPlaceholder": "अपना पासवर्ड दर्ज करें",
            "login.togglePassword": "पासवर्ड दिखाएं या छुपाएं",
            "login.signInBtn": "पासवर्ड से साइन इन करें",
            "login.divider": "अथवा",
            "login.sendOtpBtn": "📲 मोबाइल ओटीपी से लॉगिन करें",
            "login.phoneLabel": "फ़ोन नंबर",
            "login.phonePlaceholder": "10-अंकों का मोबाइल नंबर दर्ज करें",
            "login.sendOtpAction": "ओटीपी कोड भेजें",
            "login.otpLabel": "6-अंकों का ओटीपी दर्ज करें",
            "login.otpPlaceholder": "ओटीपी कोड दर्ज करें (उदा. 123456)",
            "login.verifyOtpBtn": "ओटीपी सत्यापित करें और लॉगिन करें",
            "login.resendOtp": "पुनः ओटीपी भेजें",
            "login.usePassword": "इसके बजाय पासवर्ड का उपयोग करें",
            "login.helperInfo": "सहायक आपात स्थिति में बायोमेट्रिक्स का उपयोग करके मरीज़ की पहचान कर सकते हैं।",
            "login.emergencyBtn": "🚨 आपातकालीन कैमरा पहचान प्रारंभ करें",

            "patient.dashboard": "मरीज़ स्वास्थ्य पोर्टल",
            "patient.welcome": "स्वागत है",
            "patient.id": "मरीज़ आईडी",
            "patient.phone": "फ़ोन",
            "patient.age": "आयु",
            "patient.gender": "लिंग",
            "patient.bloodGroup": "रक्त समूह",
            "patient.address": "पता",
            "patient.guardian": "आपातकालीन संपर्क",
            "patient.logout": "साइन आउट",
            "patient.bookAppt": "📅 अपॉइंटमेंट बुक करें",
            "patient.exportPdf": "📄 मेडिकल रिकॉर्ड पीडीएफ डाउनलोड करें",
            "patient.remindersCenter": "🔔 रिमाइंडर केंद्र",

            // Biometric History
            "biometric.historyTitle": "बायोमेट्रिक सत्यापन इतिहास",
            "biometric.historySubtitle": "सभी सफल और असफल बायोमेट्रिक सत्यापन प्रयासों, उपयोग की गई विधियों और समय-मुहरों का कालानुक्रमिक लॉग।",
            "biometric.refresh": "लॉग रीफ़्रेश करें",
            "biometric.testVerification": "सत्यापन का परीक्षण करें",
            "biometric.totalAttempts": "कुल प्रयास",
            "biometric.successfulVerifications": "सफल",
            "biometric.failedAttempts": "असफल / अस्वीकृत",
            "biometric.activeEngines": "सक्रिय इंजन",
            "biometric.noLogs": "अभी तक कोई बायोमेट्रिक सत्यापन प्रयास दर्ज नहीं हुआ है।",

            "tab.overview": "अवलोकन और समयरेखा",
            "tab.questionnaire": "स्वास्थ्य प्रश्नावली",
            "tab.documents": "चिकित्सा दस्तावेज",
            "tab.consultations": "परामर्श और डॉक्टर",
            "tab.ai": "मेडीकेयर एआई सहायक",
            "tab.verifications": "पहचान और बायोमेट्रिक्स",
            "tab.account": "प्रोफ़ाइल और अभिभावक",

            "doctor.dashboard": "डॉक्टर क्लिनिकल पोर्टल",
            "doctor.welcome": "डॉ. शर्मा",
            "doctor.specialization": "सामान्य चिकित्सा",
            "doctor.authorizedPatients": "अधिकृत मरीज़",
            "doctor.pendingRequests": "लंबित पहुंच अनुरोध",
            "doctor.requestAccess": "मरीज़ एक्सेस का अनुरोध करें",
            "doctor.searchPlaceholder": "मरीज़ आईडी दर्ज करें (उदा. PAT1001)",
            "doctor.sendRequestBtn": "एक्सेस अनुरोध भेजें",
            "doctor.viewRecord": "पूर्ण रिकॉर्ड देखें",
            "doctor.exportRecordPdf": "आधिकारिक पीडीएफ निर्यात करें",
            "doctor.noPatients": "वर्तमान में कोई अधिकृत मरीज़ नहीं है।",

            "helper.dashboard": "आपातकालीन बायोमेट्रिक पहचान",
            "helper.notice": "आपातकालीन स्वास्थ्य कर्मियों और सहायकों के लिए।",
            "helper.capturePhoto": "कैमरा फ़ोटो लें",
            "helper.identifyBtn": "🔍 बायोमेट्रिक्स से मरीज़ की पहचान करें",
            "helper.privacyNotice": "गोपनीयता सुरक्षा: सहायक को केवल आपातकालीन अभिभावक संपर्क और रक्त समूह दिखाई देगा।",
            "helper.matchedPatient": "पहचाना गया मरीज़",
            "helper.guardianPhone": "अभिभावक का फ़ोन",
            "helper.callGuardian": "📞 अभिभावक को कॉल करें",

            "common.save": "परिवर्तन सहेजें",
            "common.cancel": "रद्द करें",
            "common.close": "बंद करें",
            "common.confirm": "पुष्टि करें",
            "common.upload": "दस्तावेज़ अपलोड करें",
            "common.loading": "लोड हो रहा है...",
            "common.success": "सफल",
            "common.error": "त्रुटि",
            "common.switchLanguage": "भाषा बदलें",

            "about.title": "मेडीकेयर कंसल्टेंट के बारे में",
            "about.text": "मेडीकेयर एक सुरक्षित डिजिटल स्वास्थ्य प्लेटफॉर्म है जो मरीज़ों के रिकॉर्ड, डॉक्टर प्राधिकरण, बायोमेट्रिक आपातकालीन पहचान और अपॉइंटमेंट शेड्यूलिंग का प्रबंधन करता है।",
            "contact.title": "सहायता और संपर्क",
            "contact.text": "तकनीकी सहायता या अस्पताल सहयोग के लिए अपने स्वास्थ्य सेवा प्रशासक से संपर्क करें।"
        }
    },
    te: {
        translation: {
            "brand.name": "మెడికేర్ కన్సల్టెంట్",
            "nav.home": "హోమ్",
            "nav.about": "గురించి",
            "nav.contact": "సంప్రదించండి",
            "nav.language": "భాష",

            "hero.eyebrow": "డిజిటల్ హెల్త్‌కేర్ పోర్టల్",
            "hero.title": "వైద్య సంరక్షణ,",
            "hero.titleHighlight": "ఇప్పుడు సులభం.",
            "hero.subtitle": "రోగులు, వైద్యులు మరియు సహాయకులకు సురక్షితమైన డిజిటల్ సేవలు.",

            "portal.title": "లాగిన్ పోర్టల్",
            "portal.subtitle": "మీరు ఎలా సైన్ ఇన్ చేయాలనుకుంటున్నారో ఎంచుకోండి.",
            "portal.roleDoctor": "👨‍⚕️ డాక్టర్‌గా లాగిన్ అవ్వండి",
            "portal.roleHelper": "🧑‍⚕️ హెల్పర్‌గా లాగిన్ అవ్వండి",
            "portal.rolePatient": "👨‍🦰 పేషెంట్‌గా లాగిన్ అవ్వండి",

            "login.back": "← వెనుకకు",
            "login.patientTitle": "పేషెంట్ లాగిన్",
            "login.doctorTitle": "డాక్టర్ లాగిన్",
            "login.helperTitle": "హెల్త్‌కేర్ హెల్పర్ లాగిన్",
            "login.demoTitle": "⚡ శీఘ్ర డెమో యాక్సెస్",
            "login.oneClickFill": "1-క్లిక్ ఫిల్",
            "login.demoPatientBtn": "👨‍🦰 డెమో పేషెంట్ (PAT1001 / 1234)",
            "login.demoDoctorBtn": "👨‍⚕️ డెమో డాక్టర్ (doctor / 1234)",
            "login.demoTip": "ఫోన్ (+919876543210) లేదా ఈమెయిల్ మరియు పాస్‌వర్డ్ 1234 కూడా పనిచేస్తుంది.",
            "login.patientLabel": "పేషెంట్ ఐడీ / ఫోన్ / ఈమెయిల్",
            "login.patientPlaceholder": "పేషెంట్ ఐడీ (ఉదా. PAT1001), ఫోన్ లేదా ఈమెయిల్ నమోదు చేయండి",
            "login.doctorLabel": "డాక్టర్ యూజర్‌నేమ్ / ఫోన్",
            "login.doctorPlaceholder": "డాక్టర్ ఐడీ (ఉదా. doctor) లేదా ఫోన్ నమోదు చేయండి",
            "login.passwordLabel": "పాస్‌వర్డ్",
            "login.passwordPlaceholder": "మీ పాస్‌వర్డ్ నమోదు చేయండి",
            "login.togglePassword": "పాస్‌వర్డ్ చూపించు లేదా దాచు",
            "login.signInBtn": "పాస్‌వర్డ్‌తో సైన్ ఇన్ చేయండి",
            "login.divider": "లేదా",
            "login.sendOtpBtn": "📲 మొబైల్ ఓటీపీతో లాగిన్ అవ్వండి",
            "login.phoneLabel": "ఫోన్ నంబర్",
            "login.phonePlaceholder": "10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి",
            "login.sendOtpAction": "ఓటీపీ కోడ్ పంపండి",
            "login.otpLabel": "6 అంకెల ఓటీపీ నమోదు చేయండి",
            "login.otpPlaceholder": "ఓటీపీ కోడ్ నమోదు చేయండి (ఉదా. 123456)",
            "login.verifyOtpBtn": "ఓటీపీని ధృవీకరించి లాగిన్ అవ్వండి",
            "login.resendOtp": "మళ్ళీ ఓటీపీ పంపండి",
            "login.usePassword": "బదులుగా పాస్‌వర్డ్‌ని ఉపయోగించండి",
            "login.helperInfo": "అత్యవసర పరిస్థితుల్లో బయోమెట్రిక్స్ ద్వారా హెల్పర్లు రోగులను గుర్తించవచ్చు.",
            "login.emergencyBtn": "🚨 అత్యవసర కెమెరా గుర్తింపును ప్రారంభించండి",

            "patient.dashboard": "పేషెంట్ హెల్త్ పోర్టల్",
            "patient.welcome": "స్వాగతం",
            "patient.id": "పేషెంట్ ఐడీ",
            "patient.phone": "ఫోన్",
            "patient.age": "వయస్సు",
            "patient.gender": "లింగం",
            "patient.bloodGroup": "రక్త గ్రూపు",
            "patient.address": "చిరునామా",
            "patient.guardian": "అత్యవసర సంప్రదింపు",
            "patient.logout": "సైన్ అవుట్",
            "patient.bookAppt": "📅 అపాయింట్‌మెంట్ బుక్ చేయండి",
            "patient.exportPdf": "📄 మెడికల్ రికార్డ్ పీడీఎఫ్ డౌన్‌లోడ్",
            "patient.remindersCenter": "🔔 రిమైండర్ల కేంద్రం",

            // Biometric History
            "biometric.historyTitle": "బయోమెట్రిక్ ధృవీకరణ చరిత్ర",
            "biometric.historySubtitle": "అన్ని విజయవంతమైన మరియు విఫలమైన బయోమెట్రిక్ ధృవీకరణ ప్రయత్నాలు, పద్ధతులు మరియు సమయాల వివరాల రికార్డు.",
            "biometric.refresh": "లాగ్‌ని రీఫ్రెష్ చేయండి",
            "biometric.testVerification": "ధృవీకరణ పరీక్షించండి",
            "biometric.totalAttempts": "మొత్తం ప్రయత్నాలు",
            "biometric.successfulVerifications": "విజయవంతమైనవి",
            "biometric.failedAttempts": "విఫలమైనవి / తిరస్కరించబడినవి",
            "biometric.activeEngines": "క్రియాశీల ఇంజన్లు",
            "biometric.noLogs": "ఇంకా ఎటువంటి బయోమెట్రిక్ ప్రయత్నాలు నమోదు కాలేదు.",

            "tab.overview": "సమీక్ష & కాలక్రమం",
            "tab.questionnaire": "ఆరోగ్య ప్రశ్నాపత్రం",
            "tab.documents": "వైద్య పత్రాలు",
            "tab.consultations": "సంప్రదింపులు & వైద్యులు",
            "tab.ai": "మెడికేర్ ఏఐ అసిస్టెంట్",
            "tab.verifications": "గుర్తింపు & బయోమెట్రిక్స్",
            "tab.account": "ప్రొఫైల్ & సంరక్షకులు",

            "doctor.dashboard": "డాక్టర్ క్లినికల్ పోర్టల్",
            "doctor.welcome": "డాక్టర్ శర్మ",
            "doctor.specialization": "జనరల్ మెడిసిన్",
            "doctor.authorizedPatients": "అధీకృత రోగులు",
            "doctor.pendingRequests": "పెండింగ్ యాక్సెస్ అభ్యర్థనలు",
            "doctor.requestAccess": "పేషెంట్ యాక్సెస్ అభ్యర్థించండి",
            "doctor.searchPlaceholder": "పేషెంట్ ఐడీ నమోదు చేయండి (ఉదా. PAT1001)",
            "doctor.sendRequestBtn": "యాక్సెస్ అభ్యర్థన పంపండి",
            "doctor.viewRecord": "పూర్తి రికార్డ్ చూడండి",
            "doctor.exportRecordPdf": "అధికారిక పీడీఎఫ్ ఎగుమతి చేయండి",
            "doctor.noPatients": "ప్రస్తుతం అధీకృత రోగులు ఎవరూ లేరు.",

            "helper.dashboard": "అత్యవసర బయోమెట్రిక్ గుర్తింపు",
            "helper.notice": "అత్యవసర సేవా సిబ్బంది మరియు ఆరోగ్య సహాయకుల కోసం.",
            "helper.capturePhoto": "కెమెరా ఫోటో తీయండి",
            "helper.identifyBtn": "🔍 బయోమెట్రిక్స్ ద్వారా పేషెంట్‌ని గుర్తించండి",
            "helper.privacyNotice": "గోప్యతా హామీ: సహాయకులకు అత్యవసర సంరక్షకుల ఫోన్ మరియు రక్త గ్రూపు మాత్రమే కనిపిస్తాయి.",
            "helper.matchedPatient": "గుర్తించిన రోగి",
            "helper.guardianPhone": "సంరక్షకుని ఫోన్ నంబర్",
            "helper.callGuardian": "📞 సంరక్షకునికి కాల్ చేయండి",

            "common.save": "మార్పులను సేవ్ చేయండి",
            "common.cancel": "రద్దు చేయండి",
            "common.close": "మూసివేయండి",
            "common.confirm": "ధృవీకరించండి",
            "common.upload": "పత్రం అప్‌లోడ్ చేయండి",
            "common.loading": "లోడ్ అవుతోంది...",
            "common.success": "విజయవంతమైంది",
            "common.error": "లోపం",
            "common.switchLanguage": "భాషను మార్చండి",

            "about.title": "మెడికేర్ కన్సల్టెంట్ గురించి",
            "about.text": "మెడికేర్ అనేది రోగుల రికార్డులు, డాక్టర్ అనుమతులు, అత్యవసర బయోమెట్రిక్ గుర్తింపు మరియు వైద్య అపాయింట్‌మెంట్‌లను నిర్వహించే సమగ్ర డిజిటల్ ప్లాట్‌ఫామ్.",
            "contact.title": "మద్దతు మరియు సంప్రదింపులు",
            "contact.text": "సాంకేతిక సహాయం కోసం మీ ఆసుపత్రి అడ్మినిస్ట్రేటర్‌ను సంప్రదించండి."
        }
    },
    ta: {
        translation: {
            "brand.name": "மெடிகேர் கன்சல்டன்ட்",
            "nav.home": "முகப்பு",
            "nav.about": "பற்றி",
            "nav.contact": "தொடர்பு",
            "nav.language": "மொழி",

            "hero.eyebrow": "டிஜிட்டல் சுகாதார தளம்",
            "hero.title": "மருத்துவ பராமரிப்பு,",
            "hero.titleHighlight": "இப்போது எளிதானது.",
            "hero.subtitle": "நோயாளிகள், மருத்துவர்கள் மற்றும் அவசர உதவியாளர்களுக்கான பாதுகாப்பான தளம்.",

            "portal.title": "உள்நுழைவு தளம்",
            "portal.subtitle": "உள்நுழைய விரும்பும் வழியைத் தேர்வுசெய்யவும்.",
            "portal.roleDoctor": "👨‍⚕️ மருத்துவராக உள்நுழைக",
            "portal.roleHelper": "🧑‍⚕️ உதவியாளராக உள்நுழைக",
            "portal.rolePatient": "👨‍🦰 நோயாளியாக உள்நுழைக",

            "login.back": "← பின்செல்",
            "login.patientTitle": "நோயாளி உள்நுழைவு",
            "login.doctorTitle": "மருத்துவர் உள்நுழைவு",
            "login.helperTitle": "சுகாதார உதவியாளர் உள்நுழைவு",
            "login.demoTitle": "⚡ விரைவு டெமோ அணுகல்",
            "login.oneClickFill": "1-கிளிக் நிரப்பு",
            "login.demoPatientBtn": "👨‍🦰 டெமோ நோயாளி (PAT1001 / 1234)",
            "login.demoDoctorBtn": "👨‍⚕️ டெமோ மருத்துவர் (doctor / 1234)",
            "login.demoTip": "தொலைபேசி (+919876543210) அல்லது கடவுச்சொல் 1234 உடன் ஆதரிக்கப்படுகிறது.",
            "login.patientLabel": "நோயாளி எண் / தொலைபேசி / மின்னஞ்சல்",
            "login.patientPlaceholder": "நோயாளி எண் (எ.கா. PAT1001) உள்ளிடவும்",
            "login.doctorLabel": "மருத்துவர் பயனர் பெயர் / தொலைபேசி",
            "login.doctorPlaceholder": "மருத்துவர் எண் உள்ளிடவும்",
            "login.passwordLabel": "கடவுச்சொல்",
            "login.passwordPlaceholder": "உங்கள் கடவுச்சொல்லை உள்ளிடவும்",
            "login.togglePassword": "கடவுச்சொல்லைக் காட்டு அல்லது மறை",
            "login.signInBtn": "கடவுச்சொல் மூலம் உள்நுழைக",
            "login.divider": "அல்லது",
            "login.sendOtpBtn": "📲 OTP மூலம் உள்நுழைக",
            "login.phoneLabel": "தொலைபேசி எண்",
            "login.phonePlaceholder": "10-இலக்க மொபைல் எண்ணை உள்ளிடவும்",
            "login.sendOtpAction": "OTP அனுப்புக",
            "login.otpLabel": "6-இலக்க OTP உள்ளிடவும்",
            "login.otpPlaceholder": "OTP உள்ளிடவும் (எ.கா. 123456)",
            "login.verifyOtpBtn": "OTP சரிபார்த்து உள்நுழைக",
            "login.resendOtp": "மீண்டும் OTP அனுப்புக",
            "login.usePassword": "கடவுச்சொல்லைப் பயன்படுத்துக",
            "login.helperInfo": "உதவியாளர்கள் பயோமெட்ரிக்ஸ் மூலம் அவசர காலங்களில் நோயாளிகளை அடையாளம் காணலாம்.",
            "login.emergencyBtn": "🚨 அவசர கேமரா அடையாளத்தை துவக்குக",

            "patient.dashboard": "நோயாளி சுகாதார தளம்",
            "patient.welcome": "வரவேற்கிறோம்",
            "patient.id": "நோயாளி எண்",
            "patient.phone": "தொலைபேசி",
            "patient.age": "வயது",
            "patient.gender": "பாலினம்",
            "patient.bloodGroup": "இரத்த வகை",
            "patient.address": "முகவரி",
            "patient.guardian": "அவசர தொடர்பு",
            "patient.logout": "வெளியேறு",
            "patient.bookAppt": "📅 முன்பதிவு செய்க",
            "patient.exportPdf": "📄 மருத்துவ பதிவேடு PDF பதிவிறக்குக",
            "patient.remindersCenter": "🔔 நினைவூட்டல் மையம்",

            // Biometric History
            "biometric.historyTitle": "பயோமெட்ரிக் சரிபார்ப்பு வரலாறு",
            "biometric.historySubtitle": "வெற்றி மற்றும் தோல்வியுற்ற பயோமெட்ரிக் சரிபார்ப்பு முயற்சிகள், முறைகள் மற்றும் நேரங்களின் பதிவு.",
            "biometric.refresh": "புதுப்பிக்கவும்",
            "biometric.testVerification": "சரிபார்ப்பை சோதிக்கவும்",
            "biometric.totalAttempts": "மொத்த முயற்சிகள்",
            "biometric.successfulVerifications": "வெற்றி",
            "biometric.failedAttempts": "தோல்வி / நிராகரிக்கப்பட்டது",
            "biometric.activeEngines": "செயலில் உள்ள அமைப்புகள்",
            "biometric.noLogs": "இதுவரை பயோமெட்ரிக் முயற்சிகள் எதுவும் பதிவு செய்யப்படவில்லை.",

            "tab.overview": "கண்ணோட்டம் & காலவரிசை",
            "tab.questionnaire": "சுகாதார கேள்வித்தாள்",
            "tab.documents": "மருத்துவ ஆவணங்கள்",
            "tab.consultations": "ஆலோசனைகள் & மருத்துவர்கள்",
            "tab.ai": "மெடிகேர் AI உதவியாளர்",
            "tab.verifications": "அடையாளம் & பயோமெட்ரிக்ஸ்",
            "tab.account": "சுயவிவரம் & பாதுகாவலர்கள்",

            "doctor.dashboard": "மருத்துவர் மருத்துவ தளம்",
            "doctor.welcome": "டாக்டர் சர்மா",
            "doctor.specialization": "பொது மருத்துவம்",
            "doctor.authorizedPatients": "அங்கீகரிக்கப்பட்ட நோயாளிகள்",
            "doctor.pendingRequests": "நிலுவையில் உள்ள கோரிக்கைகள்",
            "doctor.requestAccess": "அனுமதி கோருக",
            "doctor.searchPlaceholder": "நோயாளி எண் உள்ளிடவும்",
            "doctor.sendRequestBtn": "கோரிக்கை அனுப்புக",
            "doctor.viewRecord": "முழு பதிவை காண்க",
            "doctor.exportRecordPdf": "அதிகாரப்பூர்வ PDF ஏற்றுமதி",
            "doctor.noPatients": "தற்போது நோயாளிகள் இல்லை.",

            "helper.dashboard": "அவசர பயோமெட்ரிக் அடையாளம்",
            "helper.notice": "அவசர சுகாதாரப் பணியாளர்களுக்கானது.",
            "helper.capturePhoto": "புகைப்படம் எடுக்கவும்",
            "helper.identifyBtn": "🔍 நோயாளியை அடையாளம் காண்க",
            "helper.privacyNotice": "தனியுரிமை பாதுகாப்பு: பாதுகாவலர் தொலைபேசி மற்றும் இரத்த வகை மட்டுமே காண்பிக்கப்படும்.",
            "helper.matchedPatient": "அடையாளம் காணப்பட்ட நோயாளி",
            "helper.guardianPhone": "பாதுகாவலர் தொலைபேசி",
            "helper.callGuardian": "📞 பாதுகாவலரை அழைக்கவும்",

            "common.save": "சேமிக்க",
            "common.cancel": "ரத்துசெய்",
            "common.close": "மூடு",
            "common.confirm": "உறுதிப்படுத்து",
            "common.upload": "பதிவேற்றுக",
            "common.loading": "ஏற்றுகிறது...",
            "common.success": "வெற்றி",
            "common.error": "பிழை",
            "common.switchLanguage": "மொழியை மாற்றவும்",

            "about.title": "மெடிகேர் கன்சல்டன்ட் பற்றி",
            "about.text": "மெடிகேர் என்பது நோயாளிகள் மற்றும் மருத்துவர்களுக்கான பாதுகாப்பான டிஜிட்டல் தளமாகும்.",
            "contact.title": "ஆதரவு மற்றும் உதவி",
            "contact.text": "உதவிக்கு உங்கள் மருத்துவமனை நிர்வாகியைத் தொடர்பு கொள்ளவும்."
        }
    },
    kn: {
        translation: {
            "brand.name": "ಮೆಡಿಕೇರ್ ಕನ್ಸಲ್ಟೆಂಟ್",
            "nav.home": "ಮುಖಪುಟ",
            "nav.about": "ನಮ್ಮ ಬಗ್ಗೆ",
            "nav.contact": "ಸಂಪರ್ಕಿಸಿ",
            "nav.language": "ಭಾಷೆ",

            "hero.eyebrow": "ಡಿಜಿಟಲ್ ಆರೋಗ್ಯ ಸೇವಾ ಪೋರ್ಟಲ್",
            "hero.title": "ವೈದ್ಯಕೀಯ ಆರೈಕೆ,",
            "hero.titleHighlight": "ಈಗ ಸುಲಭ.",
            "hero.subtitle": "ರೋಗಿಗಳು, ವೈದ್ಯರು ಮತ್ತು ತುರ್ತು ಸಹಾಯಕರಿಗೆ ಸುರಕ್ಷಿತ ಡಿಜಿಟಲ್ ಪ್ರವೇಶ.",

            "portal.title": "ಲಾಗಿನ್ ಪೋರ್ಟಲ್",
            "portal.subtitle": "ನೀವು ಹೇಗೆ ಸೈನ್ ಇನ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ ಎಂಬುದನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
            "portal.roleDoctor": "👨‍⚕️ ವೈದ್ಯರಾಗಿ ಲಾಗಿನ್ ಮಾಡಿ",
            "portal.roleHelper": "🧑‍⚕️ ಸಹಾಯಕರಾಗಿ ಲಾಗಿನ್ ಮಾಡಿ",
            "portal.rolePatient": "👨‍🦰 ರೋಗಿಯಾಗಿ ಲಾಗಿನ್ ಮಾಡಿ",

            "login.back": "← ಹಿಂದಕ್ಕೆ",
            "login.patientTitle": "ರೋಗಿ ಲಾಗಿನ್",
            "login.doctorTitle": "ವೈದ್ಯರ ಲಾಗಿನ್",
            "login.helperTitle": "ಆರೋಗ್ಯ ಸಹಾಯಕ ಲಾಗಿನ್",
            "login.demoTitle": "⚡ ತ್ವರಿತ ಡೆಮೊ ಪ್ರವೇಶ",
            "login.oneClickFill": "1-ಕ್ಲಿಕ್ ಭರ್ತಿ",
            "login.demoPatientBtn": "👨‍🦰 ಡೆಮೊ ರೋಗಿ (PAT1001 / 1234)",
            "login.demoDoctorBtn": "👨‍⚕️ ಡೆಮೊ ವೈದ್ಯ (doctor / 1234)",
            "login.demoTip": "ಫೋನ್ (+919876543210) ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ 1234 ನೊಂದಿಗೆ ಸಹ ಬೆಂಬಲಿತವಾಗಿದೆ.",
            "login.patientLabel": "ರೋಗಿ ಐಡಿ / ಫೋನ್ / ಇಮೇಲ್",
            "login.patientPlaceholder": "ರೋಗಿ ಐಡಿ (ಉದಾ. PAT1001), ಫೋನ್ ಅಥವಾ ಇಮೇಲ್ ನಮೂದಿಸಿ",
            "login.doctorLabel": "ವೈದ್ಯರ ಬಳಕೆದಾರ ಹೆಸರು / ಫೋನ್",
            "login.doctorPlaceholder": "ವೈದ್ಯರ ಐಡಿ ನಮೂದಿಸಿ",
            "login.passwordLabel": "ಪಾಸ್‌ವರ್ಡ್",
            "login.passwordPlaceholder": "ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ",
            "login.togglePassword": "ಪಾಸ್‌ವರ್ಡ್ ತೋರಿಸಿ ಅಥವಾ ಮರೆಮಾಡಿ",
            "login.signInBtn": "ಪಾಸ್‌ವರ್ಡ್‌ನೊಂದಿಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ",
            "login.divider": "ಅಥವಾ",
            "login.sendOtpBtn": "📲 ಮೊಬೈಲ್ OTP ಯೊಂದಿಗೆ ಲಾಗಿನ್ ಮಾಡಿ",
            "login.phoneLabel": "ಫೋನ್ ಸಂಖ್ಯೆ",
            "login.phonePlaceholder": "10-ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ",
            "login.sendOtpAction": "OTP ಕೋಡ್ ಕಳುಹಿಸಿ",
            "login.otpLabel": "6-ಅಂಕಿಯ OTP ನಮೂದಿಸಿ",
            "login.otpPlaceholder": "OTP ನಮೂದಿಸಿ (ಉದಾ. 123456)",
            "login.verifyOtpBtn": "OTP ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಲಾಗಿನ್ ಮಾಡಿ",
            "login.resendOtp": "ಮತ್ತೆ OTP ಕಳುಹಿಸಿ",
            "login.usePassword": "ಬದಲಿಗೆ ಪಾಸ್‌ವರ್ಡ್ ಬಳಸಿ",
            "login.helperInfo": "ತುರ್ತು ಪರಿಸ್ಥಿತಿಗಳಲ್ಲಿ ಬಯೋಮೆಟ್ರಿಕ್ಸ್ ಬಳಸಿ ಸಹಾಯಕರು ರೋಗಿಗಳನ್ನು ಗುರುತಿಸಬಹುದು.",
            "login.emergencyBtn": "🚨 ತುರ್ತು ಕ್ಯಾಮೆರಾ ಗುರುತಿಸುವಿಕೆ ಪ್ರಾರಂಭಿಸಿ",

            "patient.dashboard": "ರೋಗಿ ಆರೋಗ್ಯ ಪೋರ್ಟಲ್",
            "patient.welcome": "ಸ್ವಾಗತ",
            "patient.id": "ರೋಗಿ ಐಡಿ",
            "patient.phone": "ಫೋನ್",
            "patient.age": "ವಯಸ್ಸು",
            "patient.gender": "ಲಿಂಗ",
            "patient.bloodGroup": "ರಕ್ತದ ಗುಂಪು",
            "patient.address": "ವಿಳಾಸ",
            "patient.guardian": "ತುರ್ತು ಸಂಪರ್ಕ",
            "patient.logout": "ಸೈನ್ ಔಟ್",
            "patient.bookAppt": "📅 ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ",
            "patient.exportPdf": "📄 ವೈದ್ಯಕೀಯ ದಾಖಲೆ PDF ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
            "patient.remindersCenter": "🔔 ಜ್ಞಾಪನೆ ಕೇಂದ್ರ",

            // Biometric History
            "biometric.historyTitle": "ಬಯೋಮೆಟ್ರಿಕ್ ಪರಿಶೀಲನಾ ಇತಿಹಾಸ",
            "biometric.historySubtitle": "ಎಲ್ಲಾ ಯಶಸ್ವಿ ಮತ್ತು ವಿಫಲ ಬಯೋಮೆಟ್ರಿಕ್ ಪರಿಶೀಲನಾ ಪ್ರಯತ್ನಗಳು, ವಿಧಾನಗಳು ಮತ್ತು ಸಮಯದ ದಾಖಲೆ.",
            "biometric.refresh": "ಲಾಗ್ ನವೀಕರಿಸಿ",
            "biometric.testVerification": "ಪರಿಶೀಲನೆ ಪರೀಕ್ಷಿಸಿ",
            "biometric.totalAttempts": "ಒಟ್ಟು ಪ್ರಯತ್ನಗಳು",
            "biometric.successfulVerifications": "ಯಶಸ್ವಿ",
            "biometric.failedAttempts": "ವಿಫಲ / ತಿರಸ್ಕೃತ",
            "biometric.activeEngines": "ಸಕ್ರಿಯ ಎಂಜಿನ್ಗಳು",
            "biometric.noLogs": "ಇನ್ನೂ ಯಾವುದೇ ಬಯೋಮೆಟ್ರಿಕ್ ಪ್ರಯತ್ನಗಳು ದಾಖಲಾಗಿಲ್ಲ.",

            "tab.overview": "ಅವಲೋಕನ ಮತ್ತು ಸಮಯರೇಖೆ",
            "tab.questionnaire": "ಆರೋಗ್ಯ ಪ್ರಶ್ನಾವಳಿ",
            "tab.documents": "ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳು",
            "tab.consultations": "ಸಮಾಲೋಚನೆಗಳು & ವೈದ್ಯರು",
            "tab.ai": "ಮೆಡಿಕೇರ್ AI ಸಹಾಯಕ",
            "tab.verifications": "ಗುರುತು & ಬಯೋಮೆಟ್ರಿಕ್ಸ್",
            "tab.account": "ಪ್ರೊಫೈಲ್ ಮತ್ತು ಪೋಷಕರು",

            "doctor.dashboard": "ವೈದ್ಯ ಕ್ಲಿನಿಕಲ್ ಪೋರ್ಟಲ್",
            "doctor.welcome": "ಡಾ. ಶರ್ಮಾ",
            "doctor.specialization": "ಸಾಮಾನ್ಯ ಔಷಧ",
            "doctor.authorizedPatients": "ಅಧಿಕೃತ ರೋಗಿಗಳು",
            "doctor.pendingRequests": "ಬಾಕಿ ಇರುವ ವಿನಂತಿಗಳು",
            "doctor.requestAccess": "ರೋಗಿ ಪ್ರವೇಶವನ್ನು ವಿನಂತಿಸಿ",
            "doctor.searchPlaceholder": "ರೋಗಿ ಐಡಿ ನಮೂದಿಸಿ",
            "doctor.sendRequestBtn": "ವಿನಂತಿ ಕಳುಹಿಸಿ",
            "doctor.viewRecord": "ಸಂಪೂರ್ಣ ದಾಖಲೆ ವೀಕ್ಷಿಸಿ",
            "doctor.exportRecordPdf": "ಅಧಿಕೃತ PDF ರಫ್ತು ಮಾಡಿ",
            "doctor.noPatients": "ಪ್ರಸ್ತುತ ಅಧಿಕೃತ ರೋಗಿಗಳಿಲ್ಲ.",

            "helper.dashboard": "ತುರ್ತು ಬಯೋಮೆಟ್ರಿಕ್ ಗುರುತಿಸುವಿಕೆ",
            "helper.notice": "ತುರ್ತು ಆರೋಗ್ಯ ಕಾರ್ಯಕರ್ತರಿಗೆ ಮಾತ್ರ.",
            "helper.capturePhoto": "ಕ್ಯಾಮೆರಾ ಫೋಟೋ ತೆಗೆಯಿರಿ",
            "helper.identifyBtn": "🔍 ರೋಗಿಯನ್ನು ಗುರುತಿಸಿ",
            "helper.privacyNotice": "ಗೌಪ್ಯತೆ ರಕ್ಷಣೆ: ಕೇವಲ ಪೋಷಕರ ಫೋನ್ ಮತ್ತು ರಕ್ತದ ಗುಂಪು ಮಾತ್ರ ಗೋಚರಿಸುತ್ತದೆ.",
            "helper.matchedPatient": "ಗುರುತಿಸಲಾದ ರೋಗಿ",
            "helper.guardianPhone": "ಪೋಷಕರ ಫೋನ್ ಸಂಖ್ಯೆ",
            "helper.callGuardian": "📞 ಪೋಷಕರಿಗೆ ಕರೆ ಮಾಡಿ",

            "common.save": "ಉಳಿಸಿ",
            "common.cancel": "ರದ್ದುಮಾಡಿ",
            "common.close": "ಮುಚ್ಚಿ",
            "common.confirm": "ದೃಢೀಕರಿಸಿ",
            "common.upload": "ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
            "common.loading": "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
            "common.success": "ಯಶಸ್ವಿ",
            "common.error": "ದೋಷ",
            "common.switchLanguage": "ಭಾಷೆ ಬದಲಿಸಿ",

            "about.title": "ಮೆಡಿಕೇರ್ ಕನ್ಸಲ್ಟೆಂಟ್ ಬಗ್ಗೆ",
            "about.text": "ಮೆಡಿಕೇರ್ ಎಂಬುದು ರೋಗಿಗಳ ದಾಖಲೆಗಳು ಮತ್ತು ತುರ್ತು ಗುರುತಿಸುವಿಕೆಗಾಗಿ ಸುರಕ್ಷಿತ ಡಿಜಿಟಲ್ ವೇದಿಕೆಯಾಗಿದೆ.",
            "contact.title": "ಬೆಂಬಲ ಮತ್ತು ಸಂಪರ್ಕ",
            "contact.text": "ಸಹಾಯಕ್ಕಾಗಿ ನಿಮ್ಮ ಆಸ್ಪತ್ರೆಯ ನಿರ್ವಾಹಕರನ್ನು ಸಂಪರ್ಕಿಸಿ."
        }
    },
    es: {
        translation: {
            "brand.name": "MediCare Consultant",
            "nav.home": "Inicio",
            "nav.about": "Acerca de",
            "nav.contact": "Contacto",
            "nav.language": "Idioma",

            "hero.eyebrow": "PORTAL DE SALUD DIGITAL",
            "hero.title": "Atención médica,",
            "hero.titleHighlight": "simplificada.",
            "hero.subtitle": "Acceso seguro para pacientes, médicos y personal de emergencia.",

            "portal.title": "Portal de Acceso",
            "portal.subtitle": "Seleccione cómo desea iniciar sesión.",
            "portal.roleDoctor": "👨‍⚕️ Iniciar como Médico",
            "portal.roleHelper": "🧑‍⚕️ Iniciar como Asistente",
            "portal.rolePatient": "👨‍🦰 Iniciar como Paciente",

            "login.back": "← Volver",
            "login.patientTitle": "Acceso Paciente",
            "login.doctorTitle": "Acceso Médico",
            "login.helperTitle": "Acceso Asistente de Emergencia",
            "login.demoTitle": "⚡ Acceso Rápido Demo",
            "login.oneClickFill": "Autocompletar",
            "login.demoPatientBtn": "👨‍🦰 Paciente Demo (PAT1001 / 1234)",
            "login.demoDoctorBtn": "👨‍⚕️ Médico Demo (doctor / 1234)",
            "login.demoTip": "También admite teléfono (+919876543210) o correo con clave 1234.",
            "login.patientLabel": "ID de Paciente / Teléfono / Correo",
            "login.patientPlaceholder": "Ingrese ID (ej. PAT1001), teléfono o correo",
            "login.doctorLabel": "Usuario Médico / Teléfono",
            "login.doctorPlaceholder": "Ingrese ID de médico (ej. doctor)",
            "login.passwordLabel": "Contraseña",
            "login.passwordPlaceholder": "Ingrese su contraseña",
            "login.togglePassword": "Ver u ocultar contraseña",
            "login.signInBtn": "Iniciar Sesión con Contraseña",
            "login.divider": "O",
            "login.sendOtpBtn": "📲 Iniciar con Código OTP Móvil",
            "login.phoneLabel": "Número de Teléfono",
            "login.phonePlaceholder": "Ingrese número móvil de 10 dígitos",
            "login.sendOtpAction": "Enviar Código OTP",
            "login.otpLabel": "Código OTP de 6 Dígitos",
            "login.otpPlaceholder": "Ingrese código (ej. 123456)",
            "login.verifyOtpBtn": "Verificar OTP e Iniciar Sesión",
            "login.resendOtp": "Reenviar OTP",
            "login.usePassword": "Usar Contraseña en su Lugar",
            "login.helperInfo": "El personal de emergencia puede identificar pacientes mediante biometría facial.",
            "login.emergencyBtn": "🚨 Iniciar Identificación Biométrica por Cámara",

            "patient.dashboard": "Portal de Salud del Paciente",
            "patient.welcome": "Bienvenido",
            "patient.id": "ID Paciente",
            "patient.phone": "Teléfono",
            "patient.age": "Edad",
            "patient.gender": "Género",
            "patient.bloodGroup": "Grupo Sanguíneo",
            "patient.address": "Dirección",
            "patient.guardian": "Contacto de Emergencia",
            "patient.logout": "Cerrar Sesión",
            "patient.bookAppt": "📅 Agendar Cita Médica",
            "patient.exportPdf": "📄 Descargar Historia Clínica en PDF",
            "patient.remindersCenter": "🔔 Centro de Recordatorios",

            // Biometric History
            "biometric.historyTitle": "Historial de Verificación Biométrica",
            "biometric.historySubtitle": "Registro cronológico de todos los intentos de verificación biométrica exitosos y fallidos, métodos utilizados y marcas de tiempo.",
            "biometric.refresh": "Actualizar Registro",
            "biometric.testVerification": "Probar Verificación",
            "biometric.totalAttempts": "Intentos Totales",
            "biometric.successfulVerifications": "Exitosos",
            "biometric.failedAttempts": "Fallidos / Rechazados",
            "biometric.activeEngines": "Motores Activos",
            "biometric.noLogs": "Aún no se han registrado intentos de verificación biométrica.",

            "tab.overview": "Resumen y Cronograma",
            "tab.questionnaire": "Cuestionario de Salud",
            "tab.documents": "Documentos Médicos",
            "tab.consultations": "Consultas y Médicos",
            "tab.ai": "Asistente de IA MediCare",
            "tab.verifications": "Identidad y Biometría",
            "tab.account": "Perfil y Contactos",

            "doctor.dashboard": "Portal Clínico del Médico",
            "doctor.welcome": "Dr. Sharma",
            "doctor.specialization": "Medicina General",
            "doctor.authorizedPatients": "Pacientes Autorizados",
            "doctor.pendingRequests": "Solicitudes Pendientes",
            "doctor.requestAccess": "Solicitar Acceso a Paciente",
            "doctor.searchPlaceholder": "Ingrese ID de Paciente (ej. PAT1001)",
            "doctor.sendRequestBtn": "Enviar Solicitud de Acceso",
            "doctor.viewRecord": "Ver Historial Completo",
            "doctor.exportRecordPdf": "Exportar PDF Oficial",
            "doctor.noPatients": "No hay pacientes autorizados actualmente.",

            "helper.dashboard": "Identificación Biométrica de Emergencia",
            "helper.notice": "Para personal de primera respuesta y emergencias médicas.",
            "helper.capturePhoto": "Capturar Foto con Cámara",
            "helper.identifyBtn": "🔍 Identificar Paciente con Biometría",
            "helper.privacyNotice": "Garantía de Privacidad: Solo se muestra el contacto de emergencia y el grupo sanguíneo.",
            "helper.matchedPatient": "Paciente Identificado",
            "helper.guardianPhone": "Teléfono de Contacto de Emergencia",
            "helper.callGuardian": "📞 Llamar al Contacto de Emergencia",

            "common.save": "Guardar Cambios",
            "common.cancel": "Cancelar",
            "common.close": "Cerrar",
            "common.confirm": "Confirmar",
            "common.upload": "Subir Documento",
            "common.loading": "Cargando...",
            "common.success": "Éxito",
            "common.error": "Error",
            "common.switchLanguage": "Cambiar Idioma",

            "about.title": "Acerca de MediCare Consultant",
            "about.text": "MediCare es una plataforma digital integral que facilita la gestión médica, la autorización segura entre médicos y pacientes, y la identificación biométrica de emergencia.",
            "contact.title": "Soporte y Asistencia",
            "contact.text": "Para asistencia técnica o consultas institucionales, comuníquese con el administrador del sistema."
        }
    }
};

/**
 * Initializes i18next and applies stored or browser language.
 */
function initI18n() {
    const savedLang = localStorage.getItem("medicare_language") || "en";
    const initialLang = APP_LANGUAGES[savedLang] ? savedLang : "en";

    const i18nInstance = window.i18next || (typeof globalThis !== "undefined" ? globalThis.i18next : null);

    if (i18nInstance) {
        window.i18next = i18nInstance;
        i18nInstance.init({
            lng: initialLang,
            fallbackLng: "en",
            debug: false,
            resources: I18N_RESOURCES
        }, function(err, t) {
            if (err) {
                console.error("i18next init error:", err);
            }
            applyTranslations();
            syncLanguageSelectors(initialLang);
        });
    } else {
        console.warn("i18next not yet loaded; will retry shortly.");
        setTimeout(initI18n, 150);
    }
}

/**
 * Translates a key with fallback.
 */
function t(key, defaultValue) {
    if (window.i18next && typeof window.i18next.t === "function") {
        const val = window.i18next.t(key);
        if (val && val !== key) return val;
    }
    // Fallback directly to English dictionary
    const enDict = I18N_RESOURCES.en.translation;
    return enDict[key] || defaultValue || key;
}

/**
 * Applies translations to all DOM elements marked with data-i18n attributes.
 */
function applyTranslations() {
    // 1. Text Content
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (key) {
            const translated = t(key);
            if (translated && translated !== key) {
                el.textContent = translated;
            }
        }
    });

    // 2. HTML Content (for elements with styled spans or highlights)
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
        const key = el.getAttribute("data-i18n-html");
        if (key) {
            const translated = t(key);
            if (translated && translated !== key) {
                el.innerHTML = translated;
            }
        }
    });

    // 3. Placeholders
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (key) {
            const translated = t(key);
            if (translated && translated !== key) {
                el.placeholder = translated;
            }
        }
    });

    // 4. Titles / Aria Labels
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
        const key = el.getAttribute("data-i18n-title");
        if (key) {
            const translated = t(key);
            if (translated && translated !== key) {
                el.title = translated;
                el.setAttribute("aria-label", translated);
            }
        }
    });

    // 5. Update html lang attribute
    const currentLang = getCurrentLanguage();
    document.documentElement.lang = currentLang;

    // Dispatch event so other components (e.g. appointmentTimeline) can re-render labels
    window.dispatchEvent(new CustomEvent("languageChanged", { detail: { language: currentLang } }));
}

/**
 * Changes active application language, persists choice, and updates the entire UI.
 */
function changeLanguage(newLang) {
    if (!APP_LANGUAGES[newLang]) {
        newLang = "en";
    }

    localStorage.setItem("medicare_language", newLang);

    if (window.i18next && typeof window.i18next.changeLanguage === "function") {
        window.i18next.changeLanguage(newLang, function(err) {
            if (err) {
                console.error("Error changing language:", err);
            }
            applyTranslations();
            syncLanguageSelectors(newLang);
        });
    } else {
        applyTranslations();
        syncLanguageSelectors(newLang);
    }
}

/**
 * Synchronizes all language picker dropdowns on the page.
 */
function syncLanguageSelectors(lang) {
    document.querySelectorAll(".app-lang-picker").forEach(select => {
        select.value = lang;
    });
}

/**
 * Returns current active language code (e.g. "en", "hi", "te").
 */
function getCurrentLanguage() {
    if (window.i18next && window.i18next.language) {
        return window.i18next.language;
    }
    return localStorage.getItem("medicare_language") || "en";
}

// Global exposure
window.t = t;
window.changeLanguage = changeLanguage;
window.getCurrentLanguage = getCurrentLanguage;
window.applyTranslations = applyTranslations;
window.APP_LANGUAGES = APP_LANGUAGES;

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initI18n);
} else {
    initI18n();
}
