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
            prompt: process.env.MICROSOFT_PROMPT !== undefined ? process.env.MICROSOFT_PROMPT : "select_account"
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

        // Required Delegated Scopes for Viva Outlook Calendar synchronization:
        // - openid, profile, email: standard identity
        // - offline_access: long-lived refresh tokens for background calendar sync
        // - Calendars.ReadWrite: create, read, update viva calendar events with embedded Teams meetings
        // - User.Read: identify the user's Microsoft 365 profile
        // Note: OnlineMeetings.ReadWrite is not required because Teams meetings embedded in calendar
        // events are automatically provisioned by Graph API via Calendars.ReadWrite.
        const defaultScopes = [
            "openid",
            "profile",
            "email",
            "offline_access",
            "Calendars.ReadWrite",
            ...(process.env.VIVA_ORGANIZER_ACCESS === "shared" ? ["Calendars.ReadWrite.Shared"] : []),
            "User.Read"
        ];

        const scopes = process.env.MICROSOFT_SCOPES
            ? process.env.MICROSOFT_SCOPES.split(",").map(s => s.trim()).join(" ")
            : defaultScopes.join(" ");

        console.log(`[OUTLOOK-INTEGRATION] Connect request initiated for user ID: ${userId}`);
        console.log(`[MS-AUTH] Authentication flow started (Authorization Code Flow)`);
        console.log(`[MS-AUTH] Configuration: Tenant=${tenantId ? tenantId.slice(0, 8) + "..." : "MISSING"} | ClientID=${clientId ? clientId.slice(0, 8) + "..." : "MISSING"} | RedirectURI=${redirectUri}`);
        console.log(`[MS-AUTH] Requested Delegated Scopes: ${scopes}`);
        console.log(`[MS-AUTH] OAuth prompt parameter: ${prompt || "[OMITTED]"}`);

        const combinedState = JSON.stringify({ userId, state });
        const authEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
        const params = new URLSearchParams({
            client_id: clientId,
            response_type: "code",
            redirect_uri: redirectUri,
            response_mode: "query",
            scope: scopes,
            state: combinedState
        });

        // Only append prompt if explicitly set to a non-empty, non-unset value
        if (prompt && prompt !== "none" && prompt !== "unset" && prompt.trim() !== "") {
            params.set("prompt", prompt.trim());
        }

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
        const { clientId, tenantId, redirectUri } = this.getCredentials();
        const adminConsentUrl = clientId && tenantId
            ? `https://login.microsoftonline.com/${tenantId}/v2.0/adminconsent?client_id=${clientId}&scope=https://graph.microsoft.com/Calendars.ReadWrite+https://graph.microsoft.com/User.Read+openid+profile+email+offline_access&redirect_uri=${encodeURIComponent(redirectUri)}`
            : null;

        const diagnostics = {
            tenantId: tenantId || null,
            clientId: clientId || null,
            redirectUri: redirectUri || null,
            requiredScopes: ["Calendars.ReadWrite", "User.Read", "offline_access", "openid", "profile", "email"],
            permissionType: "Delegated",
            adminConsentUrl
        };

        if (!userId) {
            return { configured, isConnected: false, hasOutlookCalendar: false, diagnostics };
        }

        const integration = await prisma.microsoft_integrations.findUnique({
            where: { user_id: Number(userId) }
        });

        if (!integration || !integration.is_connected) {
            return { configured, isConnected: false, hasOutlookCalendar: false, diagnostics };
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
            updatedAt: integration?.updated_at || null,
            diagnostics
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

}

module.exports = MicrosoftGraphService;
