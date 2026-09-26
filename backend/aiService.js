const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

function getEffectiveApiKey() {
    let key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key.startsWith("MY_")) {
        const potentialPaths = [
            "/app/.dev.env.json",
            path.join(__dirname, "../../.dev.env.json"),
            path.join(__dirname, "../.dev.env.json"),
            path.join(process.cwd(), ".dev.env.json")
        ];
        for (const p of potentialPaths) {
            try {
                if (fs.existsSync(p)) {
                    const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
                    if (parsed.GEMINI_API_KEY && parsed.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" && !parsed.GEMINI_API_KEY.startsWith("MY_")) {
                        key = parsed.GEMINI_API_KEY;
                        process.env.GEMINI_API_KEY = key;
                        break;
                    }
                }
            } catch (_) {}
        }
    }
    return key && key !== "MY_GEMINI_API_KEY" && !key.startsWith("MY_") ? key : null;
}

function isAiConfigured() {
    return Boolean(getEffectiveApiKey());
}

let aiClient = null;
let lastUsedKey = null;

function getAiClient() {
    const apiKey = getEffectiveApiKey();
    if (!apiKey) {
        throw new Error("AI service is not configured. Please configure the required AI API key.");
    }

    if (!aiClient || lastUsedKey !== apiKey) {
        aiClient = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
                headers: {
                    "User-Agent": "aistudio-build"
                }
            }
        });
        lastUsedKey = apiKey;
    }
    return aiClient;
}

const SYSTEM_INSTRUCTION = `You are the MediCare AI Health Assistant.
Your core objectives:
1. Answer general health and wellness questions clearly, accurately, and empathetically.
2. Explain complex medical terminology, diagnoses, lab tests, and blood reports in simple, easily understandable language.
3. When analyzing an authorized patient report or document, examine the ACTUAL document contents carefully. Explain what each marker/test means, whether it is within typical reference ranges if stated, and offer clear educational context.
4. Help patients formulate well-structured questions to ask their human doctors.
5. Provide evidence-based, compassionate explanations.

CRITICAL CLINICAL SAFETY RULES:
- You are an educational AI assistant, NOT a human physician or medical doctor.
- You must NOT claim to make a confirmed medical diagnosis or definitive clinical diagnosis.
- You must NOT prescribe prescription medicines, adjust drug dosages, or recommend off-label pharmaceutical use.
- If the patient describes any potentially serious or emergency symptoms (e.g., severe or crushing chest pain, sudden difficulty breathing, sudden facial drooping or limb weakness, sudden severe headache, coughing up blood, uncontrolled bleeding, or suicidal ideation), you MUST IMMEDIATELY and EMPHATICALLY advise them to call emergency services (such as 112 / 911) or visit the nearest emergency room without delay.
- You must NEVER fabricate medical records, test results, lab findings, or messages from human physicians.
- If a document is provided, ground your analysis strictly in the actual document contents.
- Format responses cleanly with brief paragraphs and bullet points where helpful for readability.`;

/**
 * Generates an AI Health Assistant response using Gemini 3.8 Flash,
 * with optional authorized document analysis and patient health context.
 *
 * @param {string} prompt - Current user message
 * @param {Array<{role: string, message: string}>} history - Previous messages
 * @param {Object} options - Optional context: { document: { original_filename, file_type, storage_reference, extracted_text }, healthInfo: Object }
 * @returns {Promise<string>}
 */
async function generateAiHealthResponse(prompt, history = [], options = {}) {
    const apiKey = getEffectiveApiKey();
    if (!apiKey) {
        throw new Error("AI service is not configured. Please configure the required AI API key.");
    }

    const ai = getAiClient();

    // Map history to contents array: { role: 'user' | 'model', parts: [{ text }] }
    const contents = [];

    // Include up to last 10 previous conversational turns for context
    const recentHistory = (history || []).slice(-10);
    for (const msg of recentHistory) {
        contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.message }]
        });
    }

    // Build parts for the current turn
    const currentParts = [];

    // Optional: Selective Health Information Context (Minimum necessary, NO credentials)
    if (options && options.healthInfo) {
        const h = options.healthInfo;
        const flags = [];
        if (h.allergies) flags.push("Allergies: Yes");
        if (h.diabetes) flags.push("Diabetes: Yes");
        if (h.hypertension) flags.push("Hypertension / High BP: Yes");
        if (h.asthma) flags.push("Asthma / Respiratory condition: Yes");
        if (h.heart_condition) flags.push("Heart Condition: Yes");
        if (h.major_surgery) flags.push("Prior Major Surgery: Yes");
        if (h.regular_medication) flags.push("Regular Medication: Yes");
        if (h.chronic_condition) flags.push("Chronic Condition: Yes");
        if (h.drug_reaction) flags.push("Prior Drug Reaction: Yes");
        if (h.emergency_condition) flags.push("Other Emergency Health Condition: Yes");

        if (flags.length > 0) {
            currentParts.push({
                text: `[Patient Clinical Health Questionnaire Summary on record: ${flags.join("; ")}]`
            });
        }
    }

    // Optional: Authorized Medical Document Attachment
    if (options && options.document) {
        const doc = options.document;
        if (!doc.storage_reference || !fs.existsSync(doc.storage_reference)) {
            throw new Error(`The requested medical document (${doc.original_filename || "report"}) could not be located in secure storage. Please re-upload the document.`);
        }

        const fileBuffer = fs.readFileSync(doc.storage_reference);
        const ext = path.extname(doc.original_filename || "").toLowerCase();
        let mimeType = doc.file_type || "application/pdf";
        if (ext === ".pdf") mimeType = "application/pdf";
        else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
        else if (ext === ".png") mimeType = "image/png";

        if (mimeType === "application/pdf" || mimeType.startsWith("image/")) {
            currentParts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: fileBuffer.toString("base64")
                }
            });
            currentParts.push({
                text: `[Attached Authorized Medical Document: "${doc.original_filename}". Analyze this actual document thoroughly and explain the findings to the patient clearly.]\n\nPatient Query: ${prompt}`
            });
        } else {
            // Text or Word document
            const textContent = doc.extracted_text || fileBuffer.toString("utf8", 0, Math.min(fileBuffer.length, 50000));
            currentParts.push({
                text: `[Attached Authorized Medical Document Content: "${doc.original_filename}"]\n${textContent}\n\nPatient Query: ${prompt}`
            });
        }
    } else {
        currentParts.push({
            text: prompt
        });
    }

    // Add current user turn
    contents.push({
        role: "user",
        parts: currentParts
    });

    const candidateModels = ["gemini-3.8-flash", "gemini-flash-latest"];
    let lastError = null;

    for (const model of candidateModels) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model: model,
                    contents: contents,
                    config: {
                        systemInstruction: SYSTEM_INSTRUCTION,
                        temperature: 0.7
                    }
                });

                const responseText = response.text;
                if (responseText) {
                    return responseText.trim();
                }
            } catch (err) {
                lastError = err;
                const errMsg = err.message || String(err);
                if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
                    throw new Error("AI service is not configured. Please configure the required AI API key.");
                }
                if (errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("429") || errMsg.includes("UNAVAILABLE")) {
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
                break;
            }
        }
    }

    const finalErrMsg = lastError ? (lastError.message || String(lastError)) : "No response returned from AI service.";
    throw new Error("AI service temporarily unavailable: " + finalErrMsg);
}

module.exports = {
    generateAiHealthResponse,
    isAiConfigured,
    getEffectiveApiKey
};
