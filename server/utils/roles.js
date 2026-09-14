/**
 * Centralized Role Definition / Enumeration
 */
const ROLES = {
    ADMIN: "ADMIN",
    PM: "PM",
    SUPERVISOR: "SUPERVISOR",
    ASSESSOR: "ASSESSOR",
    STUDENT: "STUDENT"
};

/**
 * Normalizes any role input string to its canonical UPPERCASE role name.
 * e.g., "supervisor", "Supervisor", "SUPERVISOR" -> "SUPERVISOR"
 * "Project Manager", "pm", "PM" -> "PM"
 * "academic" -> "SUPERVISOR" (or fallback)
 */
function normalizeRole(roleStr) {
    if (!roleStr) return ROLES.STUDENT;
    const clean = String(roleStr).trim().toUpperCase();

    if (clean === "ADMIN" || clean === "ADMINISTRATOR") return ROLES.ADMIN;
    if (clean === "PM" || clean === "PROJECT MANAGER" || clean === "PROJECT_MANAGER") return ROLES.PM;
    if (clean === "SUPERVISOR" || clean === "EXTERNAL_SUPERVISOR") return ROLES.SUPERVISOR;
    if (clean === "ASSESSOR" || clean === "ACADEMIC") return ROLES.ASSESSOR;
    if (clean === "STUDENT") return ROLES.STUDENT;

    return clean;
}

/**
 * Normalizes email address to lowercase and trimmed string.
 */
function normalizeEmail(emailStr) {
    if (!emailStr) return "";
    return String(emailStr).trim().toLowerCase();
}

module.exports = {
    ROLES,
    normalizeRole,
    normalizeEmail
};
