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

module.exports = {
    exportPatientPdf
};
