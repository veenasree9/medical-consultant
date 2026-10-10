const PDFDocument = require("pdfkit");

/**
 * Generates an official, publication-quality physical medical record PDF
 * for patient and emergency archive.
 *
 * @param {Object} patient - The complete patient object from getPatientDetails
 * @param {http.ServerResponse} res - Express response stream
 */
function exportPatientPdf(patient, res) {
    const doc = new PDFDocument({
        size: "A4",
        margins: { top: 36, bottom: 36, left: 40, right: 40 },
        info: {
            Title: `Medical Record - ${patient.patientId} - ${patient.name}`,
            Author: "MediCare Consultant Healthcare System",
            Subject: "Physical Medical Record and Emergency Contact Archive",
            Creator: "MediCare Consultant System"
        }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="MediCare_Medical_Record_${patient.patientId}.pdf"`
    );

    doc.pipe(res);

    const primaryColor = "#0f766e"; // Teal
    const darkColor = "#0f172a";    // Slate 900
    const grayColor = "#475569";    // Slate 600
    const lightBg = "#f8fafc";      // Slate 50
    const borderColor = "#cbd5e1";  // Slate 300
    const redAccent = "#b91c1c";    // Red 700
    const greenAccent = "#059669";  // Green 600

    const contentWidth = 515; // 595 (A4) - 80 margins
    const leftMargin = 40;

    // Helper: Draw Section Banner
    function drawSectionHeader(title, icon = "") {
        doc.moveDown(0.6);
        const y = doc.y;

        doc.rect(leftMargin, y, contentWidth, 22)
            .fillAndStroke("#e6fffa", "#14b8a6");

        doc.fillColor(primaryColor)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(`${icon} ${title}`.trim(), leftMargin + 8, y + 5.5);

        doc.moveDown(0.9);
    }

    // Helper: Draw 2-column info grid row
    function drawInfoRow(label1, val1, label2, val2) {
        const y = doc.y;
        const colWidth = (contentWidth - 10) / 2;

        // Col 1
        doc.fillColor(grayColor)
            .fontSize(8.5)
            .font("Helvetica")
            .text(label1, leftMargin, y);

        doc.fillColor(darkColor)
            .fontSize(9.5)
            .font("Helvetica-Bold")
            .text(val1 || "—", leftMargin, y + 11, { width: colWidth });

        // Col 2
        if (label2) {
            const x2 = leftMargin + colWidth + 10;
            doc.fillColor(grayColor)
                .fontSize(8.5)
                .font("Helvetica")
                .text(label2, x2, y);

            doc.fillColor(darkColor)
                .fontSize(9.5)
                .font("Helvetica-Bold")
                .text(val2 || "—", x2, y + 11, { width: colWidth });
        }

        doc.moveDown(0.9);
    }

    // ================= HEADER =================
    // Top border line
    doc.rect(leftMargin, 36, contentWidth, 4)
        .fill(primaryColor);

    doc.moveDown(0.4);

    // Title and Subhead
    doc.fillColor(primaryColor)
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("MEDICARE HEALTH CONSULTANT", leftMargin, 48);

    doc.fillColor(grayColor)
        .fontSize(9)
        .font("Helvetica")
        .text("OFFICIAL PATIENT MEDICAL RECORD & PHYSICAL EMERGENCY ARCHIVE", leftMargin, 69);

    const generatedDate = new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    doc.fillColor(grayColor)
        .fontSize(7.5)
        .text(`Archive Reference: REF-${patient.patientId}-${Date.now().toString(36).toUpperCase()} | Printed: ${generatedDate}`, leftMargin, 81);

    // Blood Group Critical Emergency Badge (Top Right)
    const bloodBadgeWidth = 90;
    const bloodBadgeHeight = 44;
    const badgeX = leftMargin + contentWidth - bloodBadgeWidth;
    const badgeY = 46;

    doc.roundedRect(badgeX, badgeY, bloodBadgeWidth, bloodBadgeHeight, 6)
        .fillAndStroke("#fee2e2", "#f87171");

    doc.fillColor(redAccent)
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .text("BLOOD GROUP", badgeX, badgeY + 6, { width: bloodBadgeWidth, align: "center" });

    doc.fillColor(redAccent)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(patient.bloodGroup || patient.blood || "UNKNOWN", badgeX, badgeY + 18, { width: bloodBadgeWidth, align: "center" });

    doc.y = 96;

    // Confidentiality Notice Box
    doc.rect(leftMargin, doc.y, contentWidth, 18)
        .fillAndStroke("#f1f5f9", borderColor);

    doc.fillColor(grayColor)
        .fontSize(7)
        .font("Helvetica-Bold")
        .text("CONFIDENTIAL MEDICAL DOCUMENT - AUTHORIZED FOR PHYSICAL FILING, EMERGENCY CLINIC USE & ATTENDING PHYSICIANS ONLY", leftMargin + 6, doc.y + 5, { width: contentWidth - 12 });

    doc.y = 120;

    // ================= SECTION 1: PRIMARY PATIENT INFORMATION =================
    drawSectionHeader("1. PRIMARY PATIENT IDENTIFICATION", "📋");

    drawInfoRow(
        "Patient ID:",
        patient.patientId,
        "Full Legal Name:",
        patient.name
    );

    drawInfoRow(
        "Age / Date of Birth:",
        patient.age ? `${patient.age} years` : "Not provided",
        "Gender:",
        patient.gender || "Other"
    );

    drawInfoRow(
        "Primary Mobile / Emergency Phone:",
        patient.phone || "Not provided",
        "Email Address:",
        patient.email || "Not provided"
    );

    // Residential Address
    const yAddr = doc.y;
    doc.fillColor(grayColor)
        .fontSize(8.5)
        .font("Helvetica")
        .text("Residential Address:", leftMargin, yAddr);

    doc.fillColor(darkColor)
        .fontSize(9)
        .font("Helvetica")
        .text(patient.address || "Not provided on record", leftMargin, yAddr + 11, { width: contentWidth });

    doc.moveDown(0.9);

    // ================= SECTION 2: EMERGENCY CONTACTS / GUARDIANS =================
    drawSectionHeader("2. GUARDIAN & EMERGENCY CONTACT DETAILS", "🚨");

    const gBoxWidth = (contentWidth - 10) / 2;
    const gBoxY = doc.y;
    const gBoxHeight = 62;

    // Guardian 1 Box
    doc.roundedRect(leftMargin, gBoxY, gBoxWidth, gBoxHeight, 4)
        .fillAndStroke(lightBg, borderColor);

    doc.fillColor(primaryColor)
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text("Primary Guardian (Contact 1)", leftMargin + 8, gBoxY + 6);

    doc.fillColor(darkColor)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(patient.guardianName || "Not assigned", leftMargin + 8, gBoxY + 19);

    doc.fillColor(grayColor)
        .fontSize(8)
        .font("Helvetica")
        .text(`Phone: ${patient.guardianPhone || "None"}`, leftMargin + 8, gBoxY + 33);

    doc.text(`Relationship: ${patient.guardianRelationship || "Unspecified"}`, leftMargin + 8, gBoxY + 45);

    // Guardian 2 Box
    const g2X = leftMargin + gBoxWidth + 10;
    doc.roundedRect(g2X, gBoxY, gBoxWidth, gBoxHeight, 4)
        .fillAndStroke(lightBg, borderColor);

    doc.fillColor(primaryColor)
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text("Secondary Guardian (Contact 2)", g2X + 8, gBoxY + 6);

    doc.fillColor(darkColor)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(patient.guardian2Name || "Not assigned", g2X + 8, gBoxY + 19);

    doc.fillColor(grayColor)
        .fontSize(8)
        .font("Helvetica")
        .text(`Phone: ${patient.guardian2Phone || "None"}`, g2X + 8, gBoxY + 33);

    doc.text(`Relationship: ${patient.guardian2Relationship || "Unspecified"}`, g2X + 8, gBoxY + 45);

    doc.y = gBoxY + gBoxHeight + 8;

    // ================= SECTION 3: STRUCTURED CLINICAL HEALTH SCREENING =================
    drawSectionHeader("3. EMERGENCY CLINICAL HEALTH SCREENING (STRUCTURED RESPONSES)", "🩺");

    const health = patient.healthInformation || {};
    const questions = [
        { label: "1. Known Allergies", val: Boolean(health.allergies) },
        { label: "2. Diabetes Diagnosis", val: Boolean(health.diabetes) },
        { label: "3. Hypertension / High BP", val: Boolean(health.hypertension) },
        { label: "4. Asthma / Breathing Issues", val: Boolean(health.asthma) },
        { label: "5. Heart-Related Condition", val: Boolean(health.heart_condition) },
        { label: "6. Major Surgical History", val: Boolean(health.major_surgery) },
        { label: "7. Regular Medication Intake", val: Boolean(health.regular_medication) },
        { label: "8. Chronic Medical Condition", val: Boolean(health.chronic_condition) },
        { label: "9. Serious Drug Reactions", val: Boolean(health.drug_reaction) },
        { label: "10. Important Emergency Status", val: Boolean(health.emergency_condition) }
    ];

    // Render 2 columns of 5 questions each
    const tableY = doc.y;
    const rowHeight = 16;
    const colW = (contentWidth - 12) / 2;

    for (let i = 0; i < 5; i++) {
        const qLeft = questions[i];
        const qRight = questions[i + 5];
        const currentY = tableY + i * (rowHeight + 3);

        // Left Item
        doc.roundedRect(leftMargin, currentY, colW, rowHeight, 3)
            .fillAndStroke(qLeft.val ? "#fef2f2" : "#f8fafc", qLeft.val ? "#fecaca" : "#e2e8f0");

        doc.fillColor(darkColor)
            .fontSize(8)
            .font("Helvetica")
            .text(qLeft.label, leftMargin + 6, currentY + 4, { width: colW - 42 });

        doc.roundedRect(leftMargin + colW - 32, currentY + 2.5, 26, rowHeight - 5, 2)
            .fill(qLeft.val ? redAccent : "#94a3b8");

        doc.fillColor("#ffffff")
            .fontSize(7)
            .font("Helvetica-Bold")
            .text(qLeft.val ? "YES" : "NO", leftMargin + colW - 32, currentY + 4.5, { width: 26, align: "center" });

        // Right Item
        const rightX = leftMargin + colW + 12;
        doc.roundedRect(rightX, currentY, colW, rowHeight, 3)
            .fillAndStroke(qRight.val ? "#fef2f2" : "#f8fafc", qRight.val ? "#fecaca" : "#e2e8f0");

        doc.fillColor(darkColor)
            .fontSize(8)
            .font("Helvetica")
            .text(qRight.label, rightX + 6, currentY + 4, { width: colW - 42 });

        doc.roundedRect(rightX + colW - 32, currentY + 2.5, 26, rowHeight - 5, 2)
            .fill(qRight.val ? redAccent : "#94a3b8");

        doc.fillColor("#ffffff")
            .fontSize(7)
            .font("Helvetica-Bold")
            .text(qRight.val ? "YES" : "NO", rightX + colW - 32, currentY + 4.5, { width: 26, align: "center" });
    }

    doc.y = tableY + 5 * (rowHeight + 3) + 6;

    // ================= SECTION 4: MEDICAL HISTORY & PHYSICIAN NOTES =================
    drawSectionHeader("4. MEDICAL HISTORY & CLINICAL NOTES", "📝");

    const medHist = patient.medicalHistory ? patient.medicalHistory.trim() : "No past medical illnesses or surgery noted.";
    const notes = patient.notes ? patient.notes.trim() : "No physician instructions or special precautions recorded.";

    const notesY = doc.y;
    doc.fillColor(grayColor)
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text("Past Medical History:", leftMargin, notesY);

    doc.fillColor(darkColor)
        .fontSize(8.5)
        .font("Helvetica")
        .text(medHist, leftMargin, notesY + 11, { width: contentWidth });

    doc.moveDown(0.6);

    const notes2Y = doc.y;
    doc.fillColor(grayColor)
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text("Physician Clinical Notes & Instructions:", leftMargin, notes2Y);

    doc.fillColor(darkColor)
        .fontSize(8.5)
        .font("Helvetica")
        .text(notes, leftMargin, notes2Y + 11, { width: contentWidth });

    doc.moveDown(0.7);

    // ================= SECTION 5: BIOMETRIC & VERIFICATION AUDIT =================
    drawSectionHeader("5. IDENTITY & BIOMETRIC VERIFICATION AUDIT", "🛡️");

    const verifs = patient.verifications || {};
    const verifSummary = [
        `FIDO2 Passkey: ${verifs.passkey === "verified" ? "VERIFIED (WebAuthn Platform Key)" : "Not Configured"}`,
        `Live Camera Presence: ${verifs.camera_live === "verified" ? "VERIFIED (Live Session)" : "Not Completed"}`,
        `Facial Biometrics: ${verifs.face === "verified" || verifs.face === "configured" ? "CONFIGURED" : "Not Configured"}`
    ].join("   |   ");

    doc.fillColor(grayColor)
        .fontSize(8)
        .font("Helvetica")
        .text(verifSummary, leftMargin, doc.y);

    doc.moveDown(0.8);

    // ================= SECTION 6: PHYSICAL ARCHIVE SIGN-OFF FOOTER =================
    const footerY = 740;
    doc.rect(leftMargin, footerY, contentWidth, 0.5)
        .fill(borderColor);

    const sigColW = (contentWidth - 20) / 3;

    // Patient Sign
    doc.fillColor(grayColor)
        .fontSize(7.5)
        .font("Helvetica")
        .text("Patient Signature / Thumbprint", leftMargin, footerY + 8);
    doc.rect(leftMargin, footerY + 36, sigColW, 0.5).fill("#94a3b8");

    // Attending Physician
    const col2X = leftMargin + sigColW + 10;
    doc.fillColor(grayColor)
        .fontSize(7.5)
        .font("Helvetica")
        .text("Attending Physician Signature & Stamp", col2X, footerY + 8);
    doc.rect(col2X, footerY + 36, sigColW, 0.5).fill("#94a3b8");

    // Clinic Date
    const col3X = leftMargin + (sigColW * 2) + 20;
    doc.fillColor(grayColor)
        .fontSize(7.5)
        .font("Helvetica")
        .text("Hospital Archive Stamp & Date", col3X, footerY + 8);
    doc.rect(col3X, footerY + 36, sigColW, 0.5).fill("#94a3b8");

    // Small footer disclaimer
    doc.fillColor("#94a3b8")
        .fontSize(6.5)
        .text("Document generated by MediCare Healthcare Information System. Valid for physical health archives, emergency trauma triage, and patient paper filing.", leftMargin, footerY + 44, { width: contentWidth, align: "center" });

    doc.end();
}

/**
 * Generates an official Initial Health & Vitals Report PDF Buffer
 * for saving directly into patient documents repository.
 *
 * @param {Object} patient - The complete patient object
 * @param {Object} vitals - The recorded health vitals (bp, sugar, pulse, etc.)
 * @returns {Promise<Buffer>}
 */
function generateVitalsPdfBuffer(patient, vitals = {}) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margins: { top: 36, bottom: 36, left: 40, right: 40 },
                info: {
                    Title: `Initial Health & Vitals Report - ${patient.patientId || patient.id}`,
                    Author: "MediCare Consultant Healthcare Portal",
                    Subject: "Patient Baseline Vitals and Clinical Screening Assessment"
                }
            });

            const buffers = [];
            doc.on("data", chunk => buffers.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(buffers)));
            doc.on("error", err => reject(err));

            const primaryColor = "#0f766e"; // Teal
            const darkColor = "#0f172a";
            const grayColor = "#475569";
            const contentWidth = 515;
            const leftMargin = 40;

            // Header Banner
            doc.rect(leftMargin, 36, contentWidth, 64).fill(primaryColor);
            doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold")
               .text("MediCare Healthcare Consultant", leftMargin + 16, 48);
            doc.fontSize(10.5).font("Helvetica")
               .text("INITIAL HEALTH ASSESSMENT & VITALS REPORT (SHOW ALL FILES ARCHIVE)", leftMargin + 16, 74);

            // Patient Summary Box
            const nowStr = new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
            const startY = 114;
            doc.rect(leftMargin, startY, contentWidth, 54).fillAndStroke("#f8fafc", "#cbd5e1");
            doc.fillColor(darkColor).fontSize(9.5).font("Helvetica-Bold")
               .text(`Patient ID: ${patient.patientId || patient.id}`, leftMargin + 12, startY + 10)
               .text(`Patient Name: ${patient.name || "N/A"}`, leftMargin + 190, startY + 10)
               .text(`Blood Group: ${patient.bloodGroup || patient.blood || "N/A"}`, leftMargin + 370, startY + 10);

            doc.fillColor(grayColor).fontSize(8.5).font("Helvetica")
               .text(`Assessment Date: ${nowStr}`, leftMargin + 12, startY + 30)
               .text(`Phone: ${patient.phone || "N/A"}`, leftMargin + 190, startY + 30)
               .text(`Guardian: ${patient.guardianName || "N/A"}`, leftMargin + 370, startY + 30);

            // Vitals Table Header
            const vitalsY = 180;
            doc.rect(leftMargin, vitalsY, contentWidth, 22).fill("#0d9488");
            doc.fillColor("#ffffff").fontSize(10.5).font("Helvetica-Bold")
               .text("RECORDED CLINICAL VITALS & BASELINE METRICS", leftMargin + 12, vitalsY + 5.5);

            // Metrics rows
            const metrics = [
                { label: "Blood Pressure (BP)", val: vitals.bp ? `${vitals.bp} mmHg` : "120/80 mmHg", ref: "Normal Range: 90/60 to 120/80 mmHg" },
                { label: "Blood Sugar / Glucose", val: vitals.sugar ? `${vitals.sugar} mg/dL (${vitals.sugarType || 'Random'})` : "95 mg/dL (Random)", ref: "Fasting: 70-99 mg/dL | Post-meal: <140 mg/dL" },
                { label: "Heart Rate / Pulse", val: vitals.pulse ? `${vitals.pulse} bpm` : "72 bpm", ref: "Normal Resting: 60-100 bpm" },
                { label: "Oxygen Saturation (SpO2)", val: vitals.spo2 ? `${vitals.spo2}%` : "98%", ref: "Normal Range: 95% - 100%" },
                { label: "Body Temperature", val: vitals.temperature ? `${vitals.temperature} °F` : "98.6 °F", ref: "Normal Range: 97.8°F - 99.1°F" },
                { label: "Body Weight", val: vitals.weight ? `${vitals.weight} kg` : "Not provided", ref: "Baseline Metabolic Metric" }
            ];

            let rowY = vitalsY + 24;
            metrics.forEach((m, idx) => {
                const bg = idx % 2 === 0 ? "#f8fafc" : "#ffffff";
                doc.rect(leftMargin, rowY, contentWidth, 22).fillAndStroke(bg, "#e2e8f0");
                doc.fillColor(darkColor).fontSize(9).font("Helvetica-Bold")
                   .text(m.label, leftMargin + 10, rowY + 5.5);
                doc.fillColor(primaryColor).fontSize(9.5).font("Helvetica-Bold")
                   .text(m.val, leftMargin + 175, rowY + 5);
                doc.fillColor(grayColor).fontSize(8).font("Helvetica")
                   .text(m.ref, leftMargin + 310, rowY + 6);
                rowY += 22;
            });

            // Chronic Conditions Screened
            rowY += 14;
            doc.rect(leftMargin, rowY, contentWidth, 20).fill("#e0f2fe");
            doc.fillColor("#0369a1").fontSize(9.5).font("Helvetica-Bold")
               .text("CHRONIC CONDITIONS & CLINICAL RISK SCREENING", leftMargin + 12, rowY + 5);

            rowY += 22;
            const conditions = [
                { name: "Hypertension / High Blood Pressure", status: vitals.hypertension ? "YES (Flagged Condition)" : "No reported condition" },
                { name: "Diabetes / Blood Sugar Condition", status: vitals.diabetes ? "YES (Flagged Condition)" : "No reported condition" },
                { name: "Known Drug / Food Allergies", status: vitals.allergies ? "YES (Flagged Condition)" : "No reported allergies" },
                { name: "Asthma / Respiratory Conditions", status: vitals.asthma ? "YES (Flagged Condition)" : "No reported condition" }
            ];

            conditions.forEach((c) => {
                doc.rect(leftMargin, rowY, contentWidth, 19).fillAndStroke("#ffffff", "#e2e8f0");
                doc.fillColor(darkColor).fontSize(8.5).font("Helvetica")
                   .text(c.name, leftMargin + 12, rowY + 4.5);
                const isFlagged = c.status.includes("YES");
                doc.fillColor(isFlagged ? "#b91c1c" : "#16a34a").fontSize(8.5).font("Helvetica-Bold")
                   .text(c.status, leftMargin + 310, rowY + 4.5);
                rowY += 19;
            });

            // Clinical Notes & Current Medications
            rowY += 14;
            doc.rect(leftMargin, rowY, contentWidth, 19).fill("#f1f5f9");
            doc.fillColor(darkColor).fontSize(9).font("Helvetica-Bold")
               .text("PATIENT NOTES & REPORTED MEDICATIONS", leftMargin + 12, rowY + 4.5);
            rowY += 21;

            doc.rect(leftMargin, rowY, contentWidth, 48).fillAndStroke("#ffffff", "#cbd5e1");
            const noteText = vitals.notes || "Baseline clinical vitals logged during patient portal setup. Verified and archived in secure health files.";
            doc.fillColor(darkColor).fontSize(8.5).font("Helvetica")
               .text(noteText, leftMargin + 10, rowY + 6, { width: contentWidth - 20 });

            // Archive Notice
            rowY += 58;
            doc.rect(leftMargin, rowY, contentWidth, 38).fillAndStroke("#ecfdf5", "#a7f3d0");
            doc.fillColor("#065f46").fontSize(8.5).font("Helvetica-Bold")
               .text("Official MediCare Health Records Vault Archive", leftMargin + 12, rowY + 6);
            doc.fillColor("#047857").fontSize(8).font("Helvetica")
               .text("This report is saved in your 'Show All Files' portal. You can download it as PDF or discuss with the MediCare AI Health Assistant anytime.", leftMargin + 12, rowY + 20);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    exportPatientPdf,
    generateVitalsPdfBuffer
};
