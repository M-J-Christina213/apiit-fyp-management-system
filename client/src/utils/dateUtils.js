/**
 * Client Asia/Colombo (UTC+05:30) Timezone Handling Utilities
 */

export const TIMEZONE = "Asia/Colombo";

/**
 * Format a Date or ISO string into Asia/Colombo display string
 */
export function formatColomboDate(dateInput, options = {}) {
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
 * Convert Date/ISO to datetime-local input string in Asia/Colombo time (YYYY-MM-DDTHH:mm)
 */
export function toColomboInputString(dateInput) {
    if (!dateInput) return "";
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "";

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

/**
 * Parse an input datetime-local value (YYYY-MM-DDTHH:mm) as Asia/Colombo time and return UTC ISO string
 */
export function colomboInputToUtcIso(inputStr) {
    if (!inputStr) return null;
    const trimmed = String(inputStr).trim();
    if (!trimmed) return null;

    if (trimmed.includes("T")) {
        const parts = trimmed.split("T");
        let timePart = parts[1];
        if (timePart.length === 5) timePart += ":00";
        const colomboIso = `${parts[0]}T${timePart}+05:30`;
        const d = new Date(colomboIso);
        return isNaN(d.getTime()) ? null : d.toISOString();
    }

    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString();
}
