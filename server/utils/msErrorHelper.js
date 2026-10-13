/**
 * Microsoft Entra ID & Microsoft Graph API Error Diagnostic Helper
 * Sanitizes and parses Microsoft OAuth 2.0 / Graph errors, extracting known AADSTS codes
 * and providing safe, structured diagnostic messages.
 */

const KNOWN_AADSTS_ERRORS = {
    AADSTS65001: {
        category: "ADMIN_CONSENT_REQUIRED",
        title: "Admin Consent or User Authorization Required",
        summary: "The application requires permissions that have not been granted by a tenant administrator, or user consent is restricted by tenant policy.",
        recommendation: "Request the IT Team to open Microsoft Entra ID > Enterprise applications > [FYPMS App] > Permissions, and click 'Grant admin consent for <Tenant>'. If prompt=consent was used, remove prompt=consent as standard users cannot consent."
    },
    AADSTS90094: {
        category: "ADMIN_CONSENT_REQUIRED",
        title: "Administrator Approval Required",
        summary: "An administrator of the tenant has set up a policy that requires you to obtain approval to access this application.",
        recommendation: "Ask the IT Team to either grant tenant-wide admin consent for the requested Graph delegated permissions (Calendars.ReadWrite, User.Read) or configure the Admin Consent Workflow."
    },
    AADSTS50011: {
        category: "REDIRECT_URI_MISMATCH",
        title: "Redirect URI Mismatch",
        summary: "The redirect URL specified in the request does not match the reply URLs configured for the application registration in Azure.",
        recommendation: "Verify that the exact callback URL (e.g. http://localhost:5000/api/viva/microsoft/callback or http://localhost:5173) is listed under 'Redirect URIs' in the Azure App Registration."
    },
    AADSTS90002: {
        category: "TENANT_CONFIGURATION_ERROR",
        title: "Tenant Not Found",
        summary: "The specified tenant identifier was not found in Microsoft Entra ID. This usually indicates an incorrect AZURE_TENANT_ID.",
        recommendation: "Verify the AZURE_TENANT_ID environment variable matches the Directory (tenant) ID in the Azure Portal."
    },
    AADSTS700016: {
        category: "APP_REGISTRATION_NOT_FOUND",
        title: "Application Registration Not Found",
        summary: "The application registration with the specified Client ID was not found in the directory tenant.",
        recommendation: "Verify the AZURE_CLIENT_ID matches the Application (client) ID in the Azure Portal for the specified tenant."
    },
    AADSTS50020: {
        category: "ACCOUNT_NOT_IN_TENANT",
        title: "User Account Not in Tenant",
        summary: "The user account used to sign in does not belong to the configured Microsoft Entra ID tenant.",
        recommendation: "Ensure you sign in using your official institutional email (e.g., @apiit.lk or @students.apiit.lk) belonging to the university tenant."
    },
    AADSTS53003: {
        category: "CONDITIONAL_ACCESS_BLOCKED",
        title: "Blocked by Conditional Access",
        summary: "Access has been blocked by organization Conditional Access policies (e.g. compliant device or location requirement).",
        recommendation: "Consult the IT Team to check whether Conditional Access policies restrict authentication from localhost or non-domain-joined devices."
    },
    AADSTS7000215: {
        category: "INVALID_CLIENT_SECRET",
        title: "Invalid Client Secret",
        summary: "The client secret provided by the backend application is invalid or expired.",
        recommendation: "Generate a new client secret in the Azure Portal App Registration and update AZURE_CLIENT_SECRET in the server .env file."
    },
    invalid_grant: {
        category: "AUTHORIZATION_GRANT_ERROR",
        title: "Invalid Authorization Grant",
        summary: "The authorization code is invalid, expired, or was already redeemed.",
        recommendation: "Restart the connection process. Authorization codes expire within 10 minutes and can only be exchanged once."
    },
    access_denied: {
        category: "ACCESS_DENIED",
        title: "Access Denied by User or Policy",
        summary: "The user cancelled the authorization request or tenant policy denied consent.",
        recommendation: "Complete the Microsoft sign-in and approve the permission prompt when requested."
    }
};

/**
 * Safely decode URL-encoded string
 */
function safeDecode(val) {
    if (!val || typeof val !== "string") return "";
    try {
        return decodeURIComponent(val.replace(/\+/g, " "));
    } catch (e) {
        return val;
    }
}

/**
 * Redact sensitive patterns like tokens, secrets, or long hexadecimal hashes
 */
function sanitizeString(str) {
    if (!str || typeof str !== "string") return "";
    const decoded = safeDecode(str);
    return decoded
        .replace(/client_secret=[^&]+/gi, "client_secret=[REDACTED]")
        .replace(/access_token=[^&]+/gi, "access_token=[REDACTED]")
        .replace(/refresh_token=[^&]+/gi, "refresh_token=[REDACTED]")
        .replace(/code=[^&]+/gi, "code=[REDACTED]")
        .replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, "Bearer [REDACTED]");
}

/**
 * Parse a Microsoft OAuth or Graph error into structured safe diagnostics
 */
function parseMicrosoftError(errorParam, descriptionParam, correlationIdParam = null) {
    const rawError = safeDecode(String(errorParam || "")).trim();
    const rawDesc = sanitizeString(String(descriptionParam || "").trim());

    // Extract AADSTS code if present in description or error
    const aadstsMatch = rawDesc.match(/AADSTS\d{5,6}/i) || rawError.match(/AADSTS\d{5,6}/i);
    const aadstsCode = aadstsMatch ? aadstsMatch[0].toUpperCase() : null;

    // Check known codes
    let matchedInfo = null;
    if (aadstsCode && KNOWN_AADSTS_ERRORS[aadstsCode]) {
        matchedInfo = KNOWN_AADSTS_ERRORS[aadstsCode];
    } else if (KNOWN_AADSTS_ERRORS[rawError]) {
        matchedInfo = KNOWN_AADSTS_ERRORS[rawError];
    }

    // Correlation ID extraction
    let correlationId = correlationIdParam;
    if (!correlationId) {
        const corrMatch = rawDesc.match(/Correlation ID:\s*([a-f0-9-]+)/i);
        if (corrMatch) correlationId = corrMatch[1];
    }

    // Clean description: take first sentence or up to 250 chars
    let cleanDesc = rawDesc;
    if (cleanDesc.length > 250) {
        cleanDesc = cleanDesc.slice(0, 250) + "...";
    }

    return {
        errorCode: aadstsCode || rawError || "UNKNOWN_MS_ERROR",
        category: matchedInfo ? matchedInfo.category : "GENERAL_AUTH_ERROR",
        title: matchedInfo ? matchedInfo.title : "Microsoft Authentication Issue",
        summary: matchedInfo ? matchedInfo.summary : (cleanDesc || "An unexpected error occurred during Microsoft authentication."),
        technicalDetail: cleanDesc,
        correlationId: correlationId || "N/A",
        recommendation: matchedInfo ? matchedInfo.recommendation : "Inspect backend terminal logs and verify Microsoft Entra ID App Registration permissions."
    };
}

/**
 * Generate a clean HTML response page for browser popups/redirects
 */
function generateCallbackHtml({ success, message, error = null, payload = null, targetOrigin = null }) {
    const safeTargetOrigin = targetOrigin || process.env.CLIENT_URL || "http://localhost:5173";
    const postData = JSON.stringify({
        type: "MS_AUTH_CALLBACK",
        success,
        message,
        error: error ? {
            errorCode: error.errorCode,
            category: error.category,
            title: error.title,
            summary: error.summary,
            technicalDetail: error.technicalDetail,
            correlationId: error.correlationId,
            recommendation: error.recommendation
        } : null,
        payload
    });

    const isSuccess = Boolean(success);
    const primaryColor = isSuccess ? "#059669" : "#dc2626";
    const statusTitle = isSuccess ? "Connection Successful" : "Connection Issue Detected";
    const statusDesc = isSuccess
        ? (message || "Your Microsoft Outlook account has been connected.")
        : (error ? `${error.title} (${error.errorCode})` : "Unable to complete connection.");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Microsoft 365 Authentication - FYPMS</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      margin: 0;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
      text-align: center;
    }
    .icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-bottom: 16px;
      background: ${isSuccess ? "#ecfdf5" : "#fef2f2"};
      color: ${primaryColor};
    }
    h2 { font-size: 20px; margin: 0 0 8px; color: #0f172a; }
    p { font-size: 14px; color: #64748b; line-height: 1.5; margin: 0 0 16px; }
    .diag-box {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      margin: 16px 0;
      color: #334155;
    }
    .diag-box strong { color: #0f172a; }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 8px;
      background: #0f172a;
      color: #ffffff;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      border: none;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isSuccess ? "✓" : "!"}</div>
    <h2>${statusTitle}</h2>
    <p>${statusDesc}</p>

    ${error ? `
      <div class="diag-box">
        <div><strong>Code:</strong> <code>${error.errorCode}</code></div>
        ${error.correlationId !== "N/A" ? `<div><strong>Correlation ID:</strong> <code>${error.correlationId}</code></div>` : ""}
        <div style="margin-top: 6px;"><strong>Summary:</strong> ${error.summary}</div>
        <div style="margin-top: 6px; color: #0369a1;"><strong>Action:</strong> ${error.recommendation}</div>
      </div>
    ` : ""}

    <button class="btn" onclick="handleClose()">Return to Dashboard</button>
  </div>

  <script>
    const eventData = ${postData};
    const targetOrigin = ${JSON.stringify(safeTargetOrigin)};
    if (window.opener) {
      try {
        window.opener.postMessage(eventData, targetOrigin);
      } catch (err) {
        console.error("Failed to postMessage to opener:", err);
      }
      setTimeout(() => {
        window.close();
      }, 2500);
    }

    function handleClose() {
      if (window.opener) {
        window.close();
      } else {
        window.location.href = "http://localhost:5173/admin/viva";
      }
    }
  </script>
</body>
</html>`;
}

module.exports = {
    KNOWN_AADSTS_ERRORS,
    sanitizeString,
    parseMicrosoftError,
    generateCallbackHtml
};
