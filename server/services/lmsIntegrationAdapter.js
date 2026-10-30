/**
 * Integration Adapter for APIIT LMS (Moodle / Turnitin Direct V2)
 *
 * Current State:
 * APIIT LMS uses Turnitin Direct V2 assignments (e.g. /mod/turnitintooltwo/view.php?id=248585).
 * Because standard Moodle mod_assign web services cannot automatically fetch Turnitin Direct V2
 * submission binaries or individual student Turnitin parts without specific institutional Turnitin API
 * credentials or a custom local plugin, this adapter cleanly abstracts:
 * 1. Configured LMS activity links.
 * 2. Status reporting ("LMS not connected", "Sync failed", "No submission", etc.).
 * 3. Verified institutional identity mapping (cb_no / email).
 * 4. Pluggable remote sync contract for future approved server-to-server connection.
 */

class LmsIntegrationAdapter {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || process.env.LMS_BASE_URL || "https://lms.apiit.lk";
        this.apiToken = config.apiToken || process.env.LMS_WEBSERVICE_TOKEN || null;
        this.isConnected = Boolean(this.apiToken && process.env.LMS_INTEGRATION_ENABLED === "true");
    }

    /**
     * Determine integration health & connectivity
     */
    getConnectionStatus() {
        if (!this.isConnected) {
            return {
                connected: false,
                code: "LMS_NOT_CONNECTED",
                message: "LMS direct synchronization is not yet configured with institutional APIIT credentials. Assignment activity links and manual review copy fallback are active.",
                baseUrl: this.baseUrl
            };
        }
        return {
            connected: true,
            code: "LMS_CONNECTED",
            message: "Connected to APIIT LMS web services.",
            baseUrl: this.baseUrl
        };
    }

    /**
     * Resolve assignment activity link for a batch and stage
     */
    formatActivityUrl(activityId, activityType = "turnitintooltwo") {
        if (!activityId) return null;
        if (activityType === "turnitintooltwo") {
            return `${this.baseUrl}/mod/turnitintooltwo/view.php?id=${encodeURIComponent(activityId)}`;
        }
        return `${this.baseUrl}/mod/assign/view.php?id=${encodeURIComponent(activityId)}`;
    }

    /**
     * Attempt sync for a student submission in a given stage
     * When not connected or when web service functions are awaiting IT enablement,
     * returns honest structured sync status rather than mock data.
     */
    async syncStudentSubmission({ studentId, cbNo, studentEmail, batchId, stage, courseMapping }) {
        if (!this.isConnected) {
            return {
                success: false,
                code: "LMS_NOT_CONNECTED",
                message: "LMS web service token not configured.",
                submission: null,
                activityUrl: courseMapping?.lms_activity_url || (courseMapping?.lms_activity_id ? this.formatActivityUrl(courseMapping.lms_activity_id, courseMapping.lms_activity_type) : null)
            };
        }

        // Future Live Connector Hook:
        // When authorized credentials are provided by APIIT IT, this method will query
        // the approved Moodle web service (e.g. custom local_apiit_turnitin or approved Turnitin API).
        // For now, return honest unconfigured state.
        return {
            success: false,
            code: "SYNC_FAILED",
            message: "Live Moodle/Turnitin sync adapter awaiting institutionally approved web service contract.",
            submission: null
        };
    }
}

module.exports = new LmsIntegrationAdapter();
