/**
 * appointmentTimeline.js
 * Recharts-powered Timeline & Calendar Visualization for Patient Appointments & Reminders
 */

(function () {
    let currentAppointments = [];
    let currentReminders = [];
    let activeViewMode = "timeline"; // 'timeline' | 'calendar' | 'weekly'
    let selectedAppointment = null;
    let reactRoot = null;

    /**
     * Parses appointment time string (e.g. "10:30 AM", "02:00 PM") into decimal hours
     */
    function parseTimeToHours(timeStr) {
        if (!timeStr) return 10;
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!match) return 10;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const ampm = match[3] ? match[3].toUpperCase() : null;
        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        return hours + minutes / 60;
    }

    /**
     * Formats date into readable string e.g. "Fri, Oct 24"
     */
    function formatDisplayDate(dateStr) {
        if (!dateStr) return "";
        try {
            const parts = dateStr.split("-");
            if (parts.length === 3) {
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            }
        } catch (_) {}
        return dateStr;
    }

    /**
     * Formats short date e.g. "Oct 24"
     */
    function formatShortDate(dateStr) {
        if (!dateStr) return "";
        try {
            const parts = dateStr.split("-");
            if (parts.length === 3) {
                const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            }
        } catch (_) {}
        return dateStr;
    }

    /**
     * Transforms appointments into Recharts dataset spanning upcoming 14 days
     */
    function prepareTimelineData(appointments) {
        const now = new Date();
        const dateMap = new Map();

        // Populate a 10-day forward timeline window
        for (let i = 0; i <= 10; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            const dateStr = d.toISOString().split("T")[0];
            dateMap.set(dateStr, {
                date: dateStr,
                shortDate: formatShortDate(dateStr),
                displayDate: formatDisplayDate(dateStr),
                dayIndex: i,
                appointmentCount: 0,
                urgencyScore: i === 0 ? 100 : i === 1 ? 85 : Math.max(20, 70 - i * 5),
                appointments: [],
                primaryDoctor: "",
                department: "",
                timeString: "",
                urgencyCategory: i === 0 ? "Today" : i === 1 ? "Tomorrow" : `In ${i} days`
            });
        }

        // Map existing appointments
        (appointments || []).forEach(appt => {
            const dStr = appt.appointmentDate;
            if (!dateMap.has(dStr)) {
                dateMap.set(dStr, {
                    date: dStr,
                    shortDate: formatShortDate(dStr),
                    displayDate: formatDisplayDate(dStr),
                    dayIndex: 99,
                    appointmentCount: 0,
                    urgencyScore: 40,
                    appointments: [],
                    primaryDoctor: "",
                    department: "",
                    timeString: "",
                    urgencyCategory: "Upcoming"
                });
            }
            const entry = dateMap.get(dStr);
            entry.appointmentCount += 1;
            entry.appointments.push(appt);
            if (!entry.primaryDoctor) {
                entry.primaryDoctor = appt.doctorName;
                entry.department = appt.department;
                entry.timeString = appt.appointmentTime;
            }
        });

        // Convert map to sorted array
        return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Transforms appointments into consultation hour distribution dataset
     */
    function prepareHourlyData(appointments) {
        const timeSlots = [
            { slot: "09:00 AM", label: "09:00 AM - Morning", hour: 9, count: 0, appointments: [] },
            { slot: "10:30 AM", label: "10:30 AM - Morning", hour: 10.5, count: 0, appointments: [] },
            { slot: "12:00 PM", label: "12:00 PM - Midday", hour: 12, count: 0, appointments: [] },
            { slot: "02:00 PM", label: "02:00 PM - Afternoon", hour: 14, count: 0, appointments: [] },
            { slot: "03:30 PM", label: "03:30 PM - Afternoon", hour: 15.5, count: 0, appointments: [] },
            { slot: "05:00 PM", label: "05:00 PM - Evening", hour: 17, count: 0, appointments: [] }
        ];

        (appointments || []).forEach(appt => {
            const h = parseTimeToHours(appt.appointmentTime);
            // Find closest slot
            let closest = timeSlots[0];
            let minDiff = 999;
            timeSlots.forEach(s => {
                const diff = Math.abs(s.hour - h);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = s;
                }
            });
            closest.count += 1;
            closest.appointments.push(appt);
        });

        return timeSlots;
    }

    /**
     * Prepares calendar days matrix for the next 14 days
     */
    function prepareCalendarMatrix(appointments) {
        const days = [];
        const now = new Date();
        const apptMap = new Map();
        (appointments || []).forEach(a => {
            if (!apptMap.has(a.appointmentDate)) apptMap.set(a.appointmentDate, []);
            apptMap.get(a.appointmentDate).push(a);
        });

        for (let i = 0; i < 14; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            const dateStr = d.toISOString().split("T")[0];
            const hasAppt = apptMap.has(dateStr);
            days.push({
                dateStr,
                dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
                dayNum: d.getDate(),
                monthName: d.toLocaleDateString("en-US", { month: "short" }),
                isToday: i === 0,
                isTomorrow: i === 1,
                hasAppt,
                appointments: apptMap.get(dateStr) || []
            });
        }
        return days;
    }

    /**
     * Custom Recharts Tooltip Component using React.createElement
     */
    function CustomTimelineTooltip(props) {
        const { active, payload } = props;
        if (!active || !payload || !payload.length) return null;

        const data = payload[0].payload;
        const appts = data.appointments || [];

        const e = React.createElement;

        return e(
            "div",
            {
                style: {
                    background: "#0f172a",
                    color: "#ffffff",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                    fontSize: "12px",
                    maxWidth: "280px",
                    border: "1px solid #334155"
                }
            },
            e(
                "div",
                { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } },
                e("span", { style: { fontWeight: "700", color: "#38bdf8", fontSize: "13px" } }, data.displayDate),
                e(
                    "span",
                    {
                        style: {
                            background: data.appointmentCount > 0 ? "#0284c7" : "#475569",
                            color: "#fff",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "10.5px",
                            fontWeight: "600"
                        }
                    },
                    data.appointmentCount > 0 ? `${data.appointmentCount} consultation${data.appointmentCount > 1 ? "s" : ""}` : "No visits"
                )
            ),
            appts.length > 0
                ? appts.map((a, idx) =>
                      e(
                          "div",
                          {
                              key: idx,
                              style: {
                                  paddingTop: "6px",
                                  marginTop: idx > 0 ? "6px" : "0",
                                  borderTop: idx > 0 ? "1px solid #334155" : "none"
                              }
                          },
                          e("div", { style: { fontWeight: "600", color: "#f8fafc" } }, `${a.doctorName} (${a.department})`),
                          e("div", { style: { color: "#94a3b8", fontSize: "11px", marginTop: "2px" } }, `⏰ ${a.appointmentTime} • ${a.reason}`),
                          e(
                              "div",
                              {
                                  style: {
                                      color: a.reminderSent ? "#4ade80" : "#fbbf24",
                                      fontSize: "10.5px",
                                      marginTop: "4px",
                                      fontWeight: "600"
                                  }
                              },
                              a.reminderSent ? "✅ Reminder sent" : "⏳ Reminder scheduled"
                          )
                      )
                  )
                : e("div", { style: { color: "#94a3b8", fontStyle: "italic", fontSize: "11px" } }, "Free day. Tap + Book Appointment to schedule.")
        );
    }

    /**
     * Main React Component rendering Recharts visualization
     */
    function ScheduleTimelineComponent(props) {
        const { appointments, viewMode } = props;
        const e = React.createElement;

        const timelineData = React.useMemo(() => prepareTimelineData(appointments), [appointments]);
        const hourlyData = React.useMemo(() => prepareHourlyData(appointments), [appointments]);
        const calendarDays = React.useMemo(() => prepareCalendarMatrix(appointments), [appointments]);

        const R = window.Recharts;
        if (!R) {
            return e("div", { style: { padding: "20px", textAlign: "center", color: "#64748b" } }, "Recharts charting engine loading...");
        }

        const {
            ResponsiveContainer,
            ComposedChart,
            BarChart,
            Bar,
            Line,
            XAxis,
            YAxis,
            Tooltip,
            CartesianGrid,
            ReferenceLine,
            Cell
        } = R;

        const handleBarClick = entry => {
            if (entry && entry.appointments && entry.appointments.length > 0) {
                showInspectorAppointment(entry.appointments[0]);
            }
        };

        // 1. TIMELINE CHART VIEW
        if (viewMode === "timeline") {
            return e(
                "div",
                { style: { width: "100%" } },
                e(
                    "div",
                    { style: { height: 260, width: "100%" } },
                    e(
                        ResponsiveContainer,
                        { width: "100%", height: "100%" },
                        e(
                            ComposedChart,
                            {
                                data: timelineData,
                                margin: { top: 15, right: 15, left: -20, bottom: 5 }
                            },
                            e(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f1f5f9" }),
                            e(XAxis, {
                                dataKey: "shortDate",
                                stroke: "#64748b",
                                fontSize: 11.5,
                                tickLine: false
                            }),
                            e(YAxis, {
                                stroke: "#64748b",
                                fontSize: 11.5,
                                allowDecimals: false,
                                domain: [0, "dataMax + 1"]
                            }),
                            e(Tooltip, { content: e(CustomTimelineTooltip) }),
                            e(ReferenceLine, { y: 0, stroke: "#cbd5e1" }),
                            e(
                                Bar,
                                {
                                    dataKey: "appointmentCount",
                                    name: "Consultations",
                                    radius: [6, 6, 0, 0],
                                    barSize: 28,
                                    onClick: handleBarClick,
                                    cursor: "pointer"
                                },
                                timelineData.map((entry, index) => {
                                    let color = "#cbd5e1"; // empty day
                                    if (entry.appointmentCount > 0) {
                                        if (entry.dayIndex === 0) color = "#059669"; // Today
                                        else if (entry.dayIndex === 1) color = "#f59e0b"; // Tomorrow
                                        else color = "#0284c7"; // Upcoming
                                    }
                                    return e(Cell, { key: `cell-${index}`, fill: color });
                                })
                            ),
                            e(Line, {
                                type: "monotone",
                                dataKey: "urgencyScore",
                                name: "Urgency Timeline",
                                stroke: "#818cf8",
                                strokeWidth: 2,
                                strokeDasharray: "4 4",
                                dot: false,
                                yAxisId: 0,
                                hide: true
                            })
                        )
                    )
                ),
                // Timeline Legend & Guide
                e(
                    "div",
                    {
                        style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "10px",
                            marginTop: "8px",
                            paddingTop: "10px",
                            borderTop: "1px solid #f1f5f9",
                            fontSize: "11.5px",
                            color: "#64748b"
                        }
                    },
                    e(
                        "div",
                        { style: { display: "flex", gap: "14px", flexWrap: "wrap" } },
                        e(
                            "div",
                            { style: { display: "flex", alignItems: "center", gap: "5px" } },
                            e("span", { style: { width: 10, height: 10, borderRadius: 2, background: "#059669" } }),
                            e("span", null, "Today")
                        ),
                        e(
                            "div",
                            { style: { display: "flex", alignItems: "center", gap: "5px" } },
                            e("span", { width: 10, height: 10, borderRadius: 2, style: { width: 10, height: 10, borderRadius: 2, background: "#f59e0b" } }),
                            e("span", null, "Tomorrow (Due Reminder)")
                        ),
                        e(
                            "div",
                            { style: { display: "flex", alignItems: "center", gap: "5px" } },
                            e("span", { style: { width: 10, height: 10, borderRadius: 2, background: "#0284c7" } }),
                            e("span", null, "Upcoming Consultation")
                        ),
                        e(
                            "div",
                            { style: { display: "flex", alignItems: "center", gap: "5px" } },
                            e("span", { style: { width: 10, height: 10, borderRadius: 2, background: "#cbd5e1" } }),
                            e("span", null, "Free Slot")
                        )
                    ),
                    e("div", { style: { fontStyle: "italic", color: "#94a3b8" } }, "💡 Click any colored bar to inspect consultation details")
                )
            );
        }

        // 2. CALENDAR DISTRIBUTION VIEW
        if (viewMode === "calendar") {
            return e(
                "div",
                { style: { width: "100%" } },
                // Mini 14-day Calendar Strip
                e(
                    "div",
                    {
                        style: {
                            display: "grid",
                            gridTemplateColumns: "repeat(7, 1fr)",
                            gap: "8px",
                            marginBottom: "16px"
                        }
                    },
                    calendarDays.map((cd, idx) => {
                        let bg = "#f8fafc";
                        let border = "#e2e8f0";
                        let textColor = "#334155";
                        if (cd.isToday) {
                            border = "#059669";
                            bg = "#f0fdf4";
                        }
                        if (cd.hasAppt) {
                            border = "#0284c7";
                            bg = "#f0f9ff";
                        }
                        return e(
                            "div",
                            {
                                key: idx,
                                onClick: () => {
                                    if (cd.hasAppt && cd.appointments[0]) {
                                        showInspectorAppointment(cd.appointments[0]);
                                    }
                                },
                                style: {
                                    background: bg,
                                    border: `1.5px solid ${border}`,
                                    borderRadius: "8px",
                                    padding: "8px 6px",
                                    textAlign: "center",
                                    cursor: cd.hasAppt ? "pointer" : "default",
                                    transition: "all 0.15s ease",
                                    position: "relative"
                                }
                            },
                            e("div", { style: { fontSize: "11px", color: cd.isToday ? "#059669" : "#64748b", fontWeight: "600" } }, cd.dayName),
                            e("div", { style: { fontSize: "16px", fontWeight: "700", color: textColor, margin: "2px 0" } }, cd.dayNum),
                            cd.hasAppt
                                ? e(
                                      "div",
                                      {
                                          style: {
                                              background: "#0284c7",
                                              color: "#fff",
                                              fontSize: "10px",
                                              padding: "1px 4px",
                                              borderRadius: "4px",
                                              fontWeight: "600",
                                              whiteSpace: "nowrap",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis"
                                          }
                                      },
                                      cd.appointments[0].appointmentTime || "Appt"
                                  )
                                : e("div", { style: { fontSize: "10px", color: "#cbd5e1" } }, "—")
                        );
                    })
                ),
                // Recharts breakdown by appointment dates
                e(
                    "div",
                    { style: { height: 180, width: "100%" } },
                    e(
                        ResponsiveContainer,
                        { width: "100%", height: "100%" },
                        e(
                            BarChart,
                            {
                                data: timelineData.filter(d => d.appointmentCount > 0 || d.dayIndex <= 6),
                                margin: { top: 5, right: 10, left: -20, bottom: 5 }
                            },
                            e(CartesianGrid, { strokeDasharray: "2 2", stroke: "#f1f5f9" }),
                            e(XAxis, { dataKey: "shortDate", stroke: "#64748b", fontSize: 11 }),
                            e(YAxis, { allowDecimals: false, stroke: "#64748b", fontSize: 11 }),
                            e(Tooltip, { content: e(CustomTimelineTooltip) }),
                            e(
                                Bar,
                                {
                                    dataKey: "appointmentCount",
                                    fill: "#0284c7",
                                    radius: [4, 4, 0, 0],
                                    barSize: 22,
                                    onClick: handleBarClick,
                                    cursor: "pointer"
                                }
                            )
                        )
                    )
                )
            );
        }

        // 3. HOURLY SLOTS DISTRIBUTION
        return e(
            "div",
            { style: { width: "100%" } },
            e(
                "p",
                { style: { fontSize: "12.5px", color: "#64748b", margin: "0 0 12px 0" } },
                "Distribution of your upcoming consultations by clinic appointment time slots:"
            ),
            e(
                "div",
                { style: { height: 220, width: "100%" } },
                e(
                    ResponsiveContainer,
                    { width: "100%", height: "100%" },
                    e(
                        BarChart,
                        {
                            data: hourlyData,
                            margin: { top: 10, right: 15, left: -20, bottom: 5 }
                        },
                        e(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f1f5f9" }),
                        e(XAxis, { dataKey: "slot", stroke: "#64748b", fontSize: 11.5 }),
                        e(YAxis, { allowDecimals: false, stroke: "#64748b", fontSize: 11.5 }),
                        e(Tooltip, {
                            formatter: (val, name, item) => [
                                `${val} consultation${val > 1 ? "s" : ""}`,
                                "Booked at this time"
                            ]
                        }),
                        e(
                            Bar,
                            {
                                dataKey: "count",
                                fill: "#0d9488",
                                radius: [6, 6, 0, 0],
                                barSize: 32,
                                onClick: entry => {
                                    if (entry && entry.appointments && entry.appointments.length > 0) {
                                        showInspectorAppointment(entry.appointments[0]);
                                    }
                                },
                                cursor: "pointer"
                            },
                            hourlyData.map((entry, index) =>
                                e(Cell, {
                                    key: `cell-${index}`,
                                    fill: entry.count > 0 ? "#0284c7" : "#e2e8f0"
                                })
                            )
                        )
                    )
                )
            )
        );
    }

    /**
     * Updates top metrics banner (Next consultation countdown, reminder armed state, etc.)
     */
    function renderScheduleHighlights(appointments, reminders) {
        const row = document.getElementById("scheduleHighlightsRow");
        if (!row) return;

        const count = appointments.length;
        const now = new Date();

        let nextAppt = null;
        let nextApptDiffHours = 9999;

        appointments.forEach(a => {
            try {
                const parts = (a.appointmentTime || "").match(/(\d+):(\d+)\s*(AM|PM)?/i);
                let h = 9, m = 0;
                if (parts) {
                    h = parseInt(parts[1], 10);
                    m = parseInt(parts[2], 10);
                    const ampm = parts[3] ? parts[3].toUpperCase() : null;
                    if (ampm === "PM" && h < 12) h += 12;
                    if (ampm === "AM" && h === 12) h = 0;
                }
                const d = new Date(a.appointmentDate + "T" + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":00");
                const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
                if (diff >= 0 && diff < nextApptDiffHours) {
                    nextApptDiffHours = diff;
                    nextAppt = a;
                }
            } catch (_) {}
        });

        let nextApptText = "No upcoming visits";
        let nextApptSub = "Schedule a consultation";
        if (nextAppt) {
            if (nextApptDiffHours < 24) {
                nextApptText = "⚡ Today";
                nextApptSub = `${nextAppt.appointmentTime} (${nextAppt.doctorName})`;
            } else if (nextApptDiffHours < 48) {
                nextApptText = "🔔 Tomorrow";
                nextApptSub = `${nextAppt.appointmentTime} (${nextAppt.doctorName})`;
            } else {
                const days = Math.round(nextApptDiffHours / 24);
                nextApptText = `In ${days} days`;
                nextApptSub = `${formatShortDate(nextAppt.appointmentDate)} at ${nextAppt.appointmentTime}`;
            }
        }

        const remindersSentCount = appointments.filter(a => a.reminderSent).length;
        const remindersPendingCount = count - remindersSentCount;

        row.innerHTML = `
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 14px;">
                <div style="font-size: 11px; color: #0369a1; font-weight: 600; text-transform: uppercase;">Upcoming Consultations</div>
                <div style="font-size: 20px; font-weight: 700; color: #0c4a6e; margin-top: 2px;">${count}</div>
                <div style="font-size: 11px; color: #0284c7; margin-top: 2px;">Active in portal</div>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px;">
                <div style="font-size: 11px; color: #15803d; font-weight: 600; text-transform: uppercase;">Next Appointment</div>
                <div style="font-size: 17px; font-weight: 700; color: #166534; margin-top: 2px;">${nextApptText}</div>
                <div style="font-size: 11px; color: #15803d; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nextApptSub}</div>
            </div>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px;">
                <div style="font-size: 11px; color: #92400e; font-weight: 600; text-transform: uppercase;">Reminder Alerts</div>
                <div style="font-size: 17px; font-weight: 700; color: #78350f; margin-top: 2px;">${remindersSentCount} Sent / ${remindersPendingCount} Pending</div>
                <div style="font-size: 11px; color: #b45309; margin-top: 2px;">SMS & Email Armed</div>
            </div>
            <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 10px 14px;">
                <div style="font-size: 11px; color: #7e22ce; font-weight: 600; text-transform: uppercase;">Schedule Horizon</div>
                <div style="font-size: 17px; font-weight: 700; color: #581c87; margin-top: 2px;">14 Days</div>
                <div style="font-size: 11px; color: #9333ea; margin-top: 2px;">Active calendar sync</div>
            </div>
        `;
    }

    /**
     * Shows detailed inspector box when user clicks an appointment in the Recharts chart
     */
    function showInspectorAppointment(appt) {
        selectedAppointment = appt;
        const box = document.getElementById("timelineSelectedApptInspector");
        if (!box) return;

        box.style.display = "flex";
        box.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 260px;">
                <div style="width: 38px; height: 38px; border-radius: 8px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                    📅
                </div>
                <div>
                    <div style="font-weight: 700; color: #0f172a; font-size: 14px;">
                        ${escapeHtml(appt.doctorName)} — <span style="font-weight: 500; color: #64748b; font-size: 12.5px;">${escapeHtml(appt.department)}</span>
                    </div>
                    <div style="font-size: 12.5px; color: #334155; margin-top: 2px;">
                        <b>${escapeHtml(appt.appointmentDate)}</b> at <b>${escapeHtml(appt.appointmentTime)}</b> • Reason: <i>${escapeHtml(appt.reason)}</i>
                    </div>
                    <div style="font-size: 11.5px; margin-top: 3px; color: ${appt.reminderSent ? '#16a34a' : '#d97706'}; font-weight: 600;">
                        ${appt.reminderSent ? '✅ Reminder has been dispatched to your phone & email' : '⏳ Auto-reminder scheduled (dispatches 24-48h prior)'}
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 8px; flex-shrink: 0; align-items: center;">
                <button type="button" class="btn-small success" style="background: #059669; color: white; font-size: 11.5px; padding: 6px 12px;" onclick="sendAppointmentReminder('${appt.appointmentId}')">
                    🔔 Dispatch Reminder Now
                </button>
                <button type="button" class="btn-small secondary" style="font-size: 11.5px; padding: 6px 10px;" onclick="document.getElementById('timelineSelectedApptInspector').style.display='none'">
                    ✕ Close
                </button>
            </div>
        `;
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Mounts or updates the React + Recharts timeline tree
     */
    function renderReactRecharts() {
        const rootEl = document.getElementById("appointmentTimelineRoot");
        if (!rootEl) return;

        if (!window.React || !window.ReactDOM || !window.Recharts) {
            // Script fallback / graceful loading UI
            rootEl.innerHTML = `
                <div style="text-align: center; padding: 32px 16px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
                    <div style="font-size: 24px; margin-bottom: 6px;">📊</div>
                    <div style="font-weight: 600; color: #1e293b; font-size: 13.5px;">Initializing Recharts Schedule View...</div>
                    <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Preparing interactive upcoming schedule timeline.</p>
                </div>
            `;
            return;
        }

        const element = React.createElement(ScheduleTimelineComponent, {
            appointments: currentAppointments,
            viewMode: activeViewMode
        });

        try {
            if (window.ReactDOM.createRoot) {
                if (!reactRoot) {
                    reactRoot = window.ReactDOM.createRoot(rootEl);
                }
                reactRoot.render(element);
            } else if (window.ReactDOM.render) {
                window.ReactDOM.render(element, rootEl);
            }
        } catch (err) {
            console.warn("Recharts render notice:", err.message);
        }
    }

    /**
     * Public API called by app.js whenever appointments are loaded or modified
     */
    window.renderAppointmentScheduleVisualization = function (appointments, reminders) {
        currentAppointments = appointments || [];
        currentReminders = reminders || [];

        renderScheduleHighlights(currentAppointments, currentReminders);
        renderReactRecharts();

        // If inspector was showing an appointment, refresh its state
        if (selectedAppointment) {
            const fresh = currentAppointments.find(a => a.appointmentId === selectedAppointment.appointmentId);
            if (fresh) showInspectorAppointment(fresh);
        }
    };

    /**
     * Switches view mode between 'timeline', 'calendar', and 'weekly'
     */
    window.switchScheduleView = function (mode) {
        activeViewMode = mode;

        const tabs = [
            { id: "tabViewTimeline", mode: "timeline" },
            { id: "tabViewCalendar", mode: "calendar" },
            { id: "tabViewWeekly", mode: "weekly" }
        ];

        tabs.forEach(t => {
            const btn = document.getElementById(t.id);
            if (!btn) return;
            if (t.mode === mode) {
                btn.style.background = "#ffffff";
                btn.style.color = "#0284c7";
                btn.style.boxShadow = "0 1px 2px rgba(0,0,0,0.06)";
            } else {
                btn.style.background = "transparent";
                btn.style.color = "#64748b";
                btn.style.boxShadow = "none";
            }
        });

        renderReactRecharts();
    };

    window.showInspectorAppointment = showInspectorAppointment;

    window.addEventListener("languageChanged", function () {
        if (currentAppointments && currentAppointments.length > 0) {
            window.renderAppointmentScheduleVisualization(currentAppointments, currentReminders);
        }
    });
})();
