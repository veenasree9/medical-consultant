const { GoogleGenAI } = require("@google/genai");

let aiClient = null;

function getAiClient() {
    if (!aiClient) {
        aiClient = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
                headers: {
                    "User-Agent": "aistudio-build"
                }
            }
        });
    }
    return aiClient;
}

const SYSTEM_INSTRUCTION = `You are the MediCare AI Health Assistant.
Your core objectives:
1. Answer general health questions clearly, accurately, and empathetically.
2. Explain complex medical terminology, diagnoses, and lab terms in simple, easily understandable language.
3. Provide general health education, preventative wellness, and lifestyle guidance.
4. Help patients organize their thoughts and formulate helpful questions to ask their attending doctors.
5. Provide evidence-based, compassionate explanations.

CRITICAL CLINICAL SAFETY RULES:
- You are an educational AI assistant, NOT a human physician or medical doctor.
- You must NOT claim to make a confirmed medical diagnosis or definitive clinical diagnosis.
- You must NOT prescribe prescription medicines, adjust drug dosages, or recommend off-label pharmaceutical use.
- If the user describes any potentially serious or emergency symptoms (e.g., severe or crushing chest pain, sudden difficulty breathing, sudden facial drooping or limb weakness, sudden severe headache, coughing up blood, uncontrolled bleeding, or suicidal ideation), you MUST IMMEDIATELY and EMPHATICALLY advise them to call emergency services (such as 112 / 911) or visit the nearest emergency room without delay.
- You must NEVER fabricate medical records, test results, lab findings, or messages from human physicians.
- Format responses cleanly with brief paragraphs and bullet points where helpful for readability.`;

/**
 * Generates an AI Health Assistant response using Gemini 3.8 Flash
 *
 * @param {string} prompt - Current user message
 * @param {Array<{role: string, message: string}>} history - Previous messages
 * @returns {Promise<string>}
 */
async function generateAiHealthResponse(prompt, history = []) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured on the server. Please verify environment settings.");
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

    // Add current turn
    contents.push({
        role: "user",
        parts: [{ text: prompt }]
    });

    const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: contents,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7
        }
    });

    const responseText = response.text;
    if (!responseText) {
        throw new Error("No response was returned from the AI model.");
    }

    return responseText.trim();
}

module.exports = {
    generateAiHealthResponse
};
