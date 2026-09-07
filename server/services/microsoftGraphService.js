const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class MicrosoftGraphService {
    static getCredentials() {
        return {
            clientId: process.env.MICROSOFT_CLIENT_ID || "",
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
            tenantId: process.env.MICROSOFT_TENANT_ID || "common",
            redirectUri: process.env.MICROSOFT_REDIRECT_URI || "http://localhost:5000/api/viva/microsoft/callback"
        };
    }

    static isConfigured() {
        const { clientId, clientSecret } = this.getCredentials();
        return Boolean(clientId && clientSecret);
    }

    /**
     * Generate OAuth 2.0 authorization URL for Delegated Microsoft Graph permissions
     */
    static getAuthUrl(state = "viva_auth") {
        const { clientId, tenantId, redirectUri } = this.getCredentials();
        if (!clientId) {
            // Return placeholder or local simulated URL if not configured
            return `/api/viva/microsoft/simulated-connect?state=${encodeURIComponent(state)}`;
        }

        const scopes = [
            "openid",
            "profile",
            "email",
            "offline_access",
            "Calendars.ReadWrite",
            "OnlineMeetings.ReadWrite",
            "User.Read"
        ].join(" ");

        const authEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
        const params = new URLSearchParams({
            client_id: clientId,
            response_type: "code",
            redirect_uri: redirectUri,
            response_mode: "query",
            scope: scopes,
            state: state,
            prompt: "consent"
        });

        return `${authEndpoint}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access and refresh tokens
     */
    static async handleAuthCallback(code) {
        const { clientId, clientSecret, tenantId, redirectUri } = this.getCredentials();

        if (!this.isConfigured()) {
            // Simulated connection for development if Azure app is not registered
            const simulatedEmail = "admin@apiit.lk";
            const integration = await prisma.microsoft_integrations.upsert({
                where: { admin_email: simulatedEmail },
                update: {
                    access_token: "simulated_access_token_" + Date.now(),
                    refresh_token: "simulated_refresh_token_" + Date.now(),
                    token_expiry: new Date(Date.now() + 3600 * 1000),
                    calendar_name: "FYP Viva Calendar (Simulated)",
                    is_connected: true
                },
                create: {
                    admin_email: simulatedEmail,
                    access_token: "simulated_access_token_" + Date.now(),
                    refresh_token: "simulated_refresh_token_" + Date.now(),
                    token_expiry: new Date(Date.now() + 3600 * 1000),
                    calendar_name: "FYP Viva Calendar (Simulated)",
                    is_connected: true
                }
            });
            return { success: true, integration, simulated: true };
        }

        const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        const bodyParams = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: redirectUri
        });

        const tokenRes = await fetch(tokenEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: bodyParams.toString()
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || tokenData.error) {
            throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange Microsoft code for token");
        }

        // Get user profile details
        const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const meData = await meRes.json();
        const adminEmail = meData.mail || meData.userPrincipalName || "admin@university.edu";

        const expiryDate = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

        const integration = await prisma.microsoft_integrations.upsert({
            where: { admin_email: adminEmail },
            update: {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || null,
                token_expiry: expiryDate,
                calendar_name: "Outlook Primary Calendar",
                is_connected: true
            },
            create: {
                admin_email: adminEmail,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || null,
                token_expiry: expiryDate,
                calendar_name: "Outlook Primary Calendar",
                is_connected: true
            }
        });

        return { success: true, integration, simulated: false };
    }

    /**
     * Get a valid active access token, refreshing if necessary
     */
    static async getValidAccessToken() {
        const integration = await prisma.microsoft_integrations.findFirst({
            where: { is_connected: true }
        });

        if (!integration || !integration.access_token) {
            return null;
        }

        // If simulated token
        if (integration.access_token.startsWith("simulated_")) {
            return { token: integration.access_token, simulated: true, email: integration.admin_email };
        }

        // Check expiry (with 5 min buffer)
        const isExpiring = integration.token_expiry && (new Date(integration.token_expiry).getTime() - Date.now() < 300000);

        if (!isExpiring) {
            return { token: integration.access_token, simulated: false, email: integration.admin_email };
        }

        // Token expired: attempt refresh
        const { clientId, clientSecret, tenantId } = this.getCredentials();
        if (!integration.refresh_token || !clientId || !clientSecret) {
            return { token: integration.access_token, simulated: false, email: integration.admin_email };
        }

        try {
            const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
            const bodyParams = new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "refresh_token",
                refresh_token: integration.refresh_token
            });

            const refreshRes = await fetch(tokenEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: bodyParams.toString()
            });

            const refreshedData = await refreshRes.json();
            if (refreshRes.ok && refreshedData.access_token) {
                const expiryDate = new Date(Date.now() + (refreshedData.expires_in || 3600) * 1000);
                await prisma.microsoft_integrations.update({
                    where: { id: integration.id },
                    data: {
                        access_token: refreshedData.access_token,
                        refresh_token: refreshedData.refresh_token || integration.refresh_token,
                        token_expiry: expiryDate
                    }
                });
                return { token: refreshedData.access_token, simulated: false, email: integration.admin_email };
            }
        } catch (refreshErr) {
            console.error("Failed to refresh Microsoft token:", refreshErr.message);
        }

        return { token: integration.access_token, simulated: false, email: integration.admin_email };
    }

    /**
     * Get integration status
     */
    static async getIntegrationStatus() {
        const configured = this.isConfigured();
        const integration = await prisma.microsoft_integrations.findFirst({
            where: { is_connected: true }
        });

        return {
            configured,
            isConnected: Boolean(integration?.is_connected),
            adminEmail: integration?.admin_email || null,
            calendarName: integration?.calendar_name || "Outlook Calendar",
            updatedAt: integration?.updated_at || null,
            isSimulated: Boolean(integration?.access_token?.startsWith("simulated_"))
        };
    }

    /**
     * Disconnect integration
     */
    static async disconnect() {
        await prisma.microsoft_integrations.deleteMany({});
        return { success: true };
    }

    /**
     * Create Outlook Calendar event for a finalized Viva schedule
     */
    static async createCalendarEvent(schedule, period) {
        const auth = await this.getValidAccessToken();
        if (!auth) {
            return {
                success: false,
                error: "Microsoft Account is not connected. Connect account in Microsoft 365 Settings to enable calendar sync."
            };
        }

        const student = schedule.students;
        const supervisor = schedule.supervisors;
        const assessor = schedule.assessors;

        const subject = `FYP Viva - ${student?.cb_no || "CB"} - ${student?.student_name || "Student"}`;
        const venue = schedule.venue || (schedule.attendance_mode === "ONLINE" ? "Microsoft Teams" : "TBA");
        const mode = schedule.attendance_mode || "PHYSICAL";

        const attendees = [];
        if (supervisor?.email) attendees.push({ emailAddress: { address: supervisor.email, name: supervisor.name }, type: "required" });
        if (assessor?.email) attendees.push({ emailAddress: { address: assessor.email, name: assessor.name }, type: "required" });

        // Calculate ISO date/time
        const dateStr = schedule.date ? schedule.date.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
        
        let startTimeStr = "09:00:00";
        let endTimeStr = "09:30:00";

        if (schedule.start_time) {
            const h = String(schedule.start_time.getUTCHours()).padStart(2, "0");
            const m = String(schedule.start_time.getUTCMinutes()).padStart(2, "0");
            startTimeStr = `${h}:${m}:00`;
        }
        if (schedule.end_time) {
            const h = String(schedule.end_time.getUTCHours()).padStart(2, "0");
            const m = String(schedule.end_time.getUTCMinutes()).padStart(2, "0");
            endTimeStr = `${h}:${m}:00`;
        }

        const startDateTime = `${dateStr}T${startTimeStr}`;
        const endDateTime = `${dateStr}T${endTimeStr}`;

        const description = `
FYP Viva Examination
---------------------------------------
Period: ${period?.name || period?.type || "Viva Examination"}
Student: ${student?.student_name || "N/A"}
CB Number: ${student?.cb_no || "N/A"}
Batch: ${schedule.batch_code || "N/A"}
Supervisor: ${supervisor?.name || "N/A"} (${supervisor?.email || "N/A"})
Assessor: ${assessor?.name || "N/A"} (${assessor?.email || "N/A"})
Mode: ${mode}
Location: ${venue}
${schedule.report_link ? `Student Report Link: ${schedule.report_link}` : ""}
${schedule.teams_join_url ? `Teams Meeting Link: ${schedule.teams_join_url}` : ""}
---------------------------------------
Managed via APIIT FYP Management System
        `.trim();

        // Simulated Mode
        if (auth.simulated) {
            const simulatedEventId = `sim_outlook_${Date.now()}_${schedule.id}`;
            let simulatedTeamsUrl = schedule.teams_join_url;
            let simulatedTeamsMeetingId = schedule.teams_meeting_id;
            if (mode === "ONLINE" && !simulatedTeamsUrl) {
                simulatedTeamsMeetingId = `teams_mtg_${Date.now()}`;
                simulatedTeamsUrl = `https://teams.microsoft.com/l/meetup-join/simulated-${schedule.id}`;
            }

            return {
                success: true,
                eventId: simulatedEventId,
                teamsMeetingId: simulatedTeamsMeetingId,
                teamsJoinUrl: simulatedTeamsUrl
            };
        }

        // Live Microsoft Graph API call
        try {
            const isOnline = mode === "ONLINE";
            const payload = {
                subject: subject,
                body: {
                    contentType: "Text",
                    content: description
                },
                start: {
                    dateTime: startDateTime,
                    timeZone: "UTC"
                },
                end: {
                    dateTime: endDateTime,
                    timeZone: "UTC"
                },
                location: {
                    displayName: venue
                },
                attendees: attendees,
                isOnlineMeeting: isOnline,
                onlineMeetingProvider: isOnline ? "teamsForBusiness" : "unknown"
            };

            const graphRes = await fetch("https://graph.microsoft.com/v1.0/me/events", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${auth.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await graphRes.json();
            if (!graphRes.ok || data.error) {
                return {
                    success: false,
                    error: data.error?.message || "Failed to create Outlook calendar event."
                };
            }

            const teamsJoinUrl = data.onlineMeeting?.joinUrl || schedule.teams_join_url || null;
            const teamsMeetingId = data.onlineMeeting?.meetingId || null;

            return {
                success: true,
                eventId: data.id,
                teamsMeetingId: teamsMeetingId,
                teamsJoinUrl: teamsJoinUrl
            };
        } catch (err) {
            console.error("Microsoft Graph createCalendarEvent Error:", err);
            return {
                success: false,
                error: err.message || "Network error while connecting to Microsoft Graph."
            };
        }
    }

    /**
     * Update existing Outlook Calendar event
     */
    static async updateCalendarEvent(eventId, schedule, period) {
        if (!eventId) {
            return this.createCalendarEvent(schedule, period);
        }

        const auth = await this.getValidAccessToken();
        if (!auth) {
            return { success: false, error: "Microsoft account not connected." };
        }

        if (auth.simulated || eventId.startsWith("sim_outlook_")) {
            return { success: true, eventId };
        }

        const student = schedule.students;
        const supervisor = schedule.supervisors;
        const assessor = schedule.assessors;
        const mode = schedule.attendance_mode || "PHYSICAL";
        const venue = schedule.venue || (mode === "ONLINE" ? "Microsoft Teams" : "TBA");

        const dateStr = schedule.date ? schedule.date.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
        let startTimeStr = "09:00:00";
        let endTimeStr = "09:30:00";
        if (schedule.start_time) {
            const h = String(schedule.start_time.getUTCHours()).padStart(2, "0");
            const m = String(schedule.start_time.getUTCMinutes()).padStart(2, "0");
            startTimeStr = `${h}:${m}:00`;
        }
        if (schedule.end_time) {
            const h = String(schedule.end_time.getUTCHours()).padStart(2, "0");
            const m = String(schedule.end_time.getUTCMinutes()).padStart(2, "0");
            endTimeStr = `${h}:${m}:00`;
        }

        const patchPayload = {
            subject: `FYP Viva - ${student?.cb_no || "CB"} - ${student?.student_name || "Student"}`,
            start: { dateTime: `${dateStr}T${startTimeStr}`, timeZone: "UTC" },
            end: { dateTime: `${dateStr}T${endTimeStr}`, timeZone: "UTC" },
            location: { displayName: venue },
            body: {
                contentType: "Text",
                content: `Updated FYP Viva Examination\nStudent: ${student?.student_name}\nMode: ${mode}\nVenue: ${venue}`
            }
        };

        try {
            const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${auth.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(patchPayload)
            });
            const data = await graphRes.json();
            if (!graphRes.ok || data.error) {
                return { success: false, error: data.error?.message || "Failed to update Outlook event" };
            }
            return { success: true, eventId: data.id };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Delete Outlook Calendar event
     */
    static async deleteCalendarEvent(eventId) {
        if (!eventId) return { success: true };
        const auth = await this.getValidAccessToken();
        if (!auth || auth.simulated || eventId.startsWith("sim_outlook_")) {
            return { success: true };
        }

        try {
            const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${auth.token}` }
            });
            return { success: graphRes.ok };
        } catch (err) {
            console.error("Delete Outlook Event Error:", err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Create Microsoft Teams meeting directly
     */
    static async createTeamsMeeting(schedule, period) {
        const auth = await this.getValidAccessToken();
        if (!auth) {
            return { success: false, error: "Microsoft account not connected." };
        }

        if (auth.simulated) {
            return {
                success: true,
                meetingId: `teams_mtg_${Date.now()}`,
                joinWebUrl: `https://teams.microsoft.com/l/meetup-join/simulated-${schedule.id}`
            };
        }

        const dateStr = schedule.date ? schedule.date.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
        let startTimeStr = "09:00:00";
        let endTimeStr = "09:30:00";
        if (schedule.start_time) {
            const h = String(schedule.start_time.getUTCHours()).padStart(2, "0");
            const m = String(schedule.start_time.getUTCMinutes()).padStart(2, "0");
            startTimeStr = `${h}:${m}:00`;
        }
        if (schedule.end_time) {
            const h = String(schedule.end_time.getUTCHours()).padStart(2, "0");
            const m = String(schedule.end_time.getUTCMinutes()).padStart(2, "0");
            endTimeStr = `${h}:${m}:00`;
        }

        try {
            const payload = {
                startDateTime: `${dateStr}T${startTimeStr}Z`,
                endDateTime: `${dateStr}T${endTimeStr}Z`,
                subject: `FYP Viva - ${schedule.students?.cb_no || "CB"} - ${schedule.students?.student_name || "Student"}`
            };

            const res = await fetch("https://graph.microsoft.com/v1.0/me/onlineMeetings", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${auth.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                return { success: false, error: data.error?.message || "Failed to create Teams meeting." };
            }

            return {
                success: true,
                meetingId: data.id,
                joinWebUrl: data.joinWebUrl
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
}

module.exports = MicrosoftGraphService;
