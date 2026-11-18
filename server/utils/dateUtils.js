/**
 * Asia/Colombo (UTC+05:30) Timezone Handling Utilities
 */

const TIMEZONE = "Asia/Colombo";

/**
 * Parse an input date string (e.g. "2026-10-31T23:59" or "2026-10-31") as Asia/Colombo time
 * and return a JavaScript Date object in UTC.
 */
function parseColomboDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;

    const trimmed = String(dateStr).trim();
    if (!trimmed) return null;

    // If ISO with explicit offset/Z, parse directly
    if (trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
        const d = new Date(trimmed);
        return isNaN(d.getTime()) ? null : d;
    }

    // Datetime-local format: "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
    if (trimmed.includes("T")) {
        const parts = trimmed.split("T");
        const datePart = parts[0];
        let timePart = parts[1];
        if (timePart.length === 5) timePart += ":00";
        // Append +05:30 offset
        const colomboIso = `${datePart}T${timePart}+05:30`;
        const d = new Date(colomboIso);
        return isNaN(d.getTime()) ? null : d;
    }

    // Date-only format: "YYYY-MM-DD" -> default to end of day 23:59:59 Colombo time
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const colomboIso = `${trimmed}T23:59:59+05:30`;
        const d = new Date(colomboIso);
        return isNaN(d.getTime()) ? null : d;
    }

    const fallback = new Date(trimmed);
    return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Format a Date object or UTC ISO string into Asia/Colombo display string
 */
function formatColomboDate(dateInput, options = {}) {
    if (!dateInput) return "Date to be confirmed";
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "Date to be confirmed";

    const defaultOptions = {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        ...options
    };

    return new Intl.DateTimeFormat("en-GB", defaultOptions).format(d);
}

/**
 * Format a Date object into HTML input datetime-local value representing Asia/Colombo time
 * (YYYY-MM-DDTHH:mm)
 */
function toColomboInputString(dateInput) {
    if (!dateInput) return "";
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "";

    // Convert UTC to Colombo time components
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });

    const parts = formatter.formatToParts(d);
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });

    let hour = map.hour;
    if (hour === "24") hour = "00";

    return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
}

module.exports = {
    TIMEZONE,
    parseColomboDate,
    formatColomboDate,
    toColomboInputString
};
