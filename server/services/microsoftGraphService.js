const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { parseMicrosoftError } = require("../utils/msErrorHelper");

class MicrosoftGraphService {
    static getCredentials() {
        return {
            clientId: process.env.AZURE_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID || "",
            clientSecret: process.env.AZURE_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET || "",
            tenantId: process.env.AZURE_TENANT_ID || process.env.MICROSOFT_TENANT_ID || "common",
            redirectUri: process.env.MICROSOFT_REDIRECT_URI || "http://localhost:5000/api/viva/microsoft/callback",
            prompt: process.env.MICROSOFT_PROMPT || "consent"
        };
    }

    static isConfigured() {
        const { clientId, clientSecret } = this.getCredentials();
        return Boolean(clientId && clientSecret);
    }

    /**
     * Generate OAuth 2.0 authorization URL for Delegated Microsoft Graph permissions
     */
    static getAuthUrl(userId, state = "viva_auth") {
        const { clientId, tenantId, redirectUri, prompt } = this.getCredentials();
        if (!clientId) {
            console.error("[MS-AUTH] Missing credentials: AZURE_CLIENT_ID is not configured.");
            throw new Error("Microsoft OAuth credentials are not configured in environment variables (AZURE_CLIENT_ID / MICROSOFT_CLIENT_ID).");
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

        console.log(`[OUTLOOK-INTEGRATION] Connect request initiated for user ID: ${userId}`);
        console.log(`[MS-AUTH] Authentication flow started (Authorization Code Flow)`);
        console.log(`[MS-AUTH] Configuration: Tenant=${tenantId ? tenantId.slice(0, 8) + "..." : "MISSING"} | ClientID=${clientId ? clientId.slice(0, 8) + "..." : "MISSING"} | RedirectURI=${redirectUri}`);
        console.log(`[MS-AUTH] Requested Delegated Scopes: ${scopes}`);
        console.log(`[MS-AUTH] OAuth prompt parameter: ${prompt}`);

        const combinedState = JSON.stringify({ userId, state });
        const authEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
        const params = new URLSearchParams({
            client_id: clientId,
            response_type: "code",
            redirect_uri: redirectUri,
            response_mode: "query",
            scope: scopes,
            state: combinedState,
            prompt: prompt
        });

        const fullAuthUrl = `${authEndpoint}?${params.toString()}`;
        console.log(`[MS-AUTH] Authorization URL generated successfully`);
        return fullAuthUrl;
    }

    /**
     * Exchange authorization code for access and refresh tokens for a specific user
     */
    static async handleAuthCallback(code, userId) {
        const { clientId, clientSecret, tenantId, redirectUri } = this.getCredentials();

        console.log(`[MS-AUTH] Handling auth callback: initiating token exchange for user ID ${userId}`);
        console.log(`[MS-AUTH] Token Endpoint: https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`);
        console.log(`[MS-AUTH] Redirect URI verification: ${redirectUri}`);

        if (!this.isConfigured()) {
            console.error("[MS-AUTH] Token acquisition failed: Microsoft OAuth credentials are missing from environment.");
            throw new Error("Microsoft OAuth credentials are missing. Real Microsoft connection required.");
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
        const correlationId = tokenRes.headers.get("client-request-id") || tokenData.correlation_id || "N/A";

        if (!tokenRes.ok || tokenData.error) {
            const parsedError = parseMicrosoftError(tokenData.error, tokenData.error_description, correlationId);
            console.error(`[MS-AUTH] Token acquisition failed: HTTP ${tokenRes.status}`);
            console.error(`[MS-AUTH] Microsoft Error Code: ${parsedError.errorCode}`);
            console.error(`[MS-AUTH] Error Summary: ${parsedError.summary}`);
            console.error(`[MS-AUTH] Correlation ID: ${correlationId}`);
            console.error(`[MS-AUTH] Recommended Action: ${parsedError.recommendation}`);
            const err = new Error(parsedError.summary);
            err.errorCode = parsedError.errorCode;
            err.correlationId = correlationId;
            err.details = parsedError;
            throw err;
        }

        console.log(`[MS-AUTH] Token acquisition successful (expires in ${tokenData.expires_in || 3600}s, refresh token present: ${Boolean(tokenData.refresh_token)})`);

        // Get user profile details from Graph API
        console.log(`[MS-GRAPH] Requesting user profile: GET https://graph.microsoft.com/v1.0/me`);
        const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const meData = await meRes.json();
        
        if (!meRes.ok || meData.error) {
            console.error(`[MS-GRAPH] Profile request failed: HTTP ${meRes.status} | Code: ${meData.error?.code} | Message: ${meData.error?.message}`);
        } else {
            console.log(`[MS-GRAPH] Profile retrieved successfully (Account domain: ${meData.userPrincipalName ? meData.userPrincipalName.split("@")[1] : "N/A"})`);
        }

        const msEmail = meData.mail || meData.userPrincipalName || null;

        // Verify if account has an available Outlook / Exchange Calendar
        console.log(`[MS-GRAPH] Verifying calendar availability: GET https://graph.microsoft.com/v1.0/me/calendar`);
        let hasCalendar = false;
        let calendarName = "Outlook Calendar";
        try {
            const calRes = await fetch("https://graph.microsoft.com/v1.0/me/calendar", {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            const calData = await calRes.json();
            if (calRes.ok && calData.id) {
                hasCalendar = true;
                calendarName = calData.name || "Outlook Calendar";
                console.log(`[MS-GRAPH] Calendar verified successfully: "${calendarName}"`);
            } else {
                console.warn(`[MS-GRAPH] Calendar verification returned HTTP ${calRes.status}: ${calData.error?.code || "No calendar"} - ${calData.error?.message || "Unavailable"}`);
            }
        } catch (calErr) {
            console.warn(`[MS-GRAPH] Calendar check warning: ${calErr.message}`);
        }

        const expiryDate = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

        const integration = await prisma.microsoft_integrations.upsert({
            where: { user_id: Number(userId) },
            update: {
                microsoft_email: msEmail,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || null,
                token_expiry: expiryDate,
                calendar_name: calendarName,
                is_connected: true
            },
            create: {
                user_id: Number(userId),
                microsoft_email: msEmail,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || null,
                token_expiry: expiryDate,
                calendar_name: calendarName,
                is_connected: true
            }
        });

        console.log(`[OUTLOOK-INTEGRATION] Microsoft integration record updated in database for user #${userId}. Has Outlook Calendar: ${hasCalendar}`);

        return {
            success: true,
            hasCalendar,
            message: hasCalendar
                ? "Microsoft account and Outlook Calendar connected successfully."
                : "Microsoft account connected, but this account does not have an available Outlook/Exchange calendar.",
            integration: {
                userId: integration.user_id,
                email: integration.microsoft_email,
                calendarName: integration.calendar_name,
                isConnected: integration.is_connected
            }
        };
    }

    /**
     * Get valid access token for a specific user ID
     */
    static async getValidAccessToken(userId) {
        if (!userId) return null;

        const integration = await prisma.microsoft_integrations.findUnique({
            where: { user_id: Number(userId) }
        });

        if (!integration || !integration.is_connected || !integration.access_token) {
            return null;
        }

        // Check token expiry (with 5 min buffer)
        const isExpiring = integration.token_expiry && (new Date(integration.token_expiry).getTime() - Date.now() < 300000);

        if (!isExpiring) {
            return { token: integration.access_token, email: integration.microsoft_email };
        }

        // Token expired: attempt refresh
        const { clientId, clientSecret, tenantId } = this.getCredentials();
        if (!integration.refresh_token || !clientId || !clientSecret) {
            return { token: integration.access_token, email: integration.microsoft_email };
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
                return { token: refreshedData.access_token, email: integration.microsoft_email };
            }
        } catch (refreshErr) {
            console.error("Failed to refresh Microsoft token:", refreshErr.message);
        }

        return { token: integration.access_token, email: integration.microsoft_email };
    }

    /**
     * Get integration status for a specific user ID
     */
    static async getIntegrationStatus(userId) {
        const configured = this.isConfigured();
        if (!userId) {
            return { configured, isConnected: false, hasOutlookCalendar: false };
        }

        const integration = await prisma.microsoft_integrations.findUnique({
            where: { user_id: Number(userId) }
        });

        if (!integration || !integration.is_connected) {
            return { configured, isConnected: false, hasOutlookCalendar: false };
        }

        let hasOutlookCalendar = false;
        try {
            const auth = await this.getValidAccessToken(userId);
            if (auth?.token) {
                const calRes = await fetch("https://graph.microsoft.com/v1.0/me/calendar", {
                    headers: { Authorization: `Bearer ${auth.token}` }
                });
                if (calRes.ok) {
                    hasOutlookCalendar = true;
                }
            }
        } catch (e) {
            hasOutlookCalendar = false;
        }

        return {
            configured,
            isConnected: Boolean(integration?.is_connected),
            hasOutlookCalendar,
            microsoftEmail: integration?.microsoft_email || null,
            calendarName: integration?.calendar_name || "Outlook Calendar",
            updatedAt: integration?.updated_at || null
        };
    }

    /**
     * Disconnect integration for a specific user ID
     */
    static async disconnect(userId) {
        if (!userId) return { success: false };
        await prisma.microsoft_integrations.deleteMany({
            where: { user_id: Number(userId) }
        });
        return { success: true };
    }

    /**
     * Synchronize a finalized Viva schedule to a user's Outlook calendar
     */
    static async syncScheduleToUserCalendar(userId, schedule, period, targetRole) {
        const auth = await this.getValidAccessToken(userId);
        if (!auth) {
            return {
                success: false,
                skipped: true,
                error: `User #${userId} (${targetRole}) has not connected a Microsoft account.`
            };
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

        const startDateTime = `${dateStr}T${startTimeStr}`;
        const endDateTime = `${dateStr}T${endTimeStr}`;

        // Format subject & description based on recipient role
        let subject = `FYP Viva - ${student?.student_name || "Student"} - ${student?.cb_no || "CB"}`;
        let description = "";

        if (targetRole === "STUDENT") {
            subject = "FYP Viva";
            description = `
FYP Viva

Supervisor: ${supervisor?.name || "Unassigned"}
Assessor: ${assessor?.name || "Unassigned"}
Batch: ${schedule.batch_code || "N/A"}
CB No: ${student?.cb_no || "N/A"}
Date: ${dateStr}
Time: ${startTimeStr.slice(0, 5)}
Venue: ${venue}
${schedule.teams_join_url ? `Microsoft Teams: ${schedule.teams_join_url}` : ""}
            `.trim();
        } else {
            description = `
FYP Viva Assessment

Student: ${student?.student_name || "N/A"}
CB No: ${student?.cb_no || "N/A"}
Batch: ${schedule.batch_code || "N/A"}
Supervisor: ${supervisor?.name || "N/A"}
Assessor: ${assessor?.name || "N/A"}
Date: ${dateStr}
Time: ${startTimeStr.slice(0, 5)}
Mode: ${mode}
Venue: ${venue}
${schedule.teams_join_url ? `Microsoft Teams: ${schedule.teams_join_url}` : ""}
            `.trim();
        }

        // Check if an Outlook event already exists in DB for this schedule + user
        const existingRecord = await prisma.viva_outlook_events.findUnique({
            where: {
                viva_schedule_id_user_id: {
                    viva_schedule_id: schedule.id,
                    user_id: Number(userId)
                }
            }
        });

        const isOnline = mode === "ONLINE";
        const payload = {
            subject: subject,
            body: { contentType: "Text", content: description },
            start: { dateTime: startDateTime, timeZone: "UTC" },
            end: { dateTime: endDateTime, timeZone: "UTC" },
            location: { displayName: venue },
            isOnlineMeeting: isOnline,
            onlineMeetingProvider: isOnline ? "teamsForBusiness" : "unknown"
        };

        console.log(`[OUTLOOK-INTEGRATION] Sync schedule #${schedule.id} to Outlook calendar for user #${userId} (${targetRole})`);
        console.log(`[MS-GRAPH] Event details: subject="${subject}", date=${dateStr}, time=${startTimeStr}-${endTimeStr}, mode=${mode}`);

        try {
            if (existingRecord?.outlook_event_id) {
                // UPDATE existing Outlook event
                const updateUrl = `https://graph.microsoft.com/v1.0/me/events/${existingRecord.outlook_event_id}`;
                console.log(`[MS-GRAPH] Updating existing event: PATCH ${updateUrl}`);
                const graphRes = await fetch(updateUrl, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${auth.token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                const data = await graphRes.json();

                if (!graphRes.ok || data.error) {
                    console.error(`[MS-GRAPH] Calendar API update failed: HTTP ${graphRes.status} | Code: ${data.error?.code} | Message: ${data.error?.message}`);
                    await prisma.viva_outlook_events.update({
                        where: { id: existingRecord.id },
                        data: { sync_status: "FAILED", sync_error: data.error?.message || "Failed to update Outlook event" }
                    });
                    return { success: false, error: data.error?.message || "Update failed." };
                }

                console.log(`[MS-GRAPH] Calendar event updated successfully (Event ID: ${existingRecord.outlook_event_id})`);
                await prisma.viva_outlook_events.update({
                    where: { id: existingRecord.id },
                    data: { sync_status: "SYNCED", sync_error: null }
                });

                return { success: true, eventId: existingRecord.outlook_event_id, updated: true };
            } else {
                // CREATE new Outlook event
                const createUrl = "https://graph.microsoft.com/v1.0/me/events";
                console.log(`[MS-GRAPH] Creating new calendar event: POST ${createUrl}`);
                const graphRes = await fetch(createUrl, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${auth.token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                const data = await graphRes.json();

                if (!graphRes.ok || data.error) {
                    console.error(`[MS-GRAPH] Calendar API event creation failed: HTTP ${graphRes.status} | Code: ${data.error?.code} | Message: ${data.error?.message}`);
                    return { success: false, error: data.error?.message || "Failed to create Outlook event." };
                }

                const eventId = data.id;
                console.log(`[MS-GRAPH] Calendar event created successfully (Event ID: ${eventId})`);
                await prisma.viva_outlook_events.upsert({
                    where: {
                        viva_schedule_id_user_id: {
                            viva_schedule_id: schedule.id,
                            user_id: Number(userId)
                        }
                    },
                    update: { outlook_event_id: eventId, sync_status: "SYNCED", sync_error: null },
                    create: {
                        viva_schedule_id: schedule.id,
                        user_id: Number(userId),
                        outlook_event_id: eventId,
                        sync_status: "SYNCED"
                    }
                });

                return { success: true, eventId: eventId, created: true };
            }
        } catch (err) {
            console.error(`[MS-GRAPH] Calendar API request failed for user ${userId}:`, err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Create Microsoft Teams meeting directly via Graph API
     */
    static async createTeamsMeeting(userId, schedule) {
        const auth = await this.getValidAccessToken(userId);
        if (!auth) {
            console.warn(`[OUTLOOK-INTEGRATION] Teams meeting creation skipped: user #${userId} not connected.`);
            return { success: false, error: "Microsoft account not connected." };
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

            console.log(`[MS-GRAPH] Creating Teams meeting: POST https://graph.microsoft.com/v1.0/me/onlineMeetings`);
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
                console.error(`[MS-GRAPH] Teams meeting creation failed: HTTP ${res.status} | Code: ${data.error?.code} | Message: ${data.error?.message}`);
                return { success: false, error: data.error?.message || "Failed to create Teams meeting." };
            }

            console.log(`[MS-GRAPH] Teams meeting created successfully: meetingId=${data.id}`);
            return {
                success: true,
                meetingId: data.id,
                joinWebUrl: data.joinWebUrl
            };
        } catch (err) {
            console.error(`[MS-GRAPH] Teams meeting creation exception:`, err.message);
            return { success: false, error: err.message };
        }
    }
    /**
     * Helper method to create calendar event across users if M365 is configured
     */
    static async createCalendarEvent(schedule, period) {
        if (!this.isConfigured()) {
            return { success: false, error: "Microsoft Graph credentials NOT_CONFIGURED." };
        }
        return { success: false, error: "Microsoft Graph authentication pending tenant admin consent." };
    }

    /**
     * Helper method to update an existing calendar event
     */
    static async updateCalendarEvent(eventId, schedule, period) {
        if (!this.isConfigured() || !eventId) {
            return { success: false, error: "Microsoft Graph credentials NOT_CONFIGURED." };
        }
        return { success: false, error: "Microsoft Graph authentication pending tenant admin consent." };
    }

    /**
     * Helper method to delete/cancel a calendar event
     */
    static async deleteCalendarEvent(eventId) {
        if (!this.isConfigured() || !eventId) {
            return { success: false };
        }
        return { success: false };
    }
}

module.exports = MicrosoftGraphService;
