const msal = require("@azure/msal-node");

// MSAL configuration - should be moved to .env in production
const msalConfig = {
    auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID || "placeholder_client_id",
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "placeholder_tenant"}`,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "placeholder_secret"
    }
};

let cca;
try {
    cca = new msal.ConfidentialClientApplication(msalConfig);
} catch (e) {
    console.error("MSAL Setup failed", e);
}

// Function to acquire token
const getToken = async () => {
    try {
        if (!cca) return null;
        const clientCredentialRequest = {
            scopes: ["https://graph.microsoft.com/.default"],
        };
        const response = await cca.acquireTokenByClientCredential(clientCredentialRequest);
        return response.accessToken;
    } catch (error) {
        console.error("Error acquiring MSAL token:", error);
        return null;
    }
};

exports.checkCalendarAvailability = async (email, startTime, endTime) => {
    // This is a placeholder for actual MS Graph API logic
    // Using `https://graph.microsoft.com/v1.0/users/${email}/calendar/getSchedule`
    try {
        const token = await getToken();
        if (!token) {
            console.log("No token, skipping MS Graph check, returning available by default.");
            return true; // Bypass if not configured
        }
        
        // Example Graph API Call
        /*
        const response = await fetch(`https://graph.microsoft.com/v1.0/users/${email}/calendar/getSchedule`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Prefer': 'outlook.timezone="UTC"'
            },
            body: JSON.stringify({
                schedules: [email],
                startTime: {
                    dateTime: startTime.toISOString(),
                    timeZone: "UTC"
                },
                endTime: {
                    dateTime: endTime.toISOString(),
                    timeZone: "UTC"
                },
                availabilityViewInterval: 60
            })
        });
        const data = await response.json();
        // parse data and return boolean
        */
        return true; 
    } catch (error) {
        console.error("Graph API Error:", error);
        return true; 
    }
};

exports.createCalendarEvent = async (attendeesList, subject, startTime, endTime) => {
    try {
        const token = await getToken();
        if (!token) {
            console.log("No token, skipping Event Creation.");
            return {
                id: "mock_event_id_" + Math.random(),
                joinUrl: "https://teams.microsoft.com/l/meetup-join/mock"
            };
        }

        // Example Graph API call to create event with Teams meeting
        /*
        const attendees = attendeesList.map(email => ({
            emailAddress: { address: email },
            type: "required"
        }));

        const event = {
            subject: subject,
            start: { dateTime: startTime.toISOString(), timeZone: "UTC" },
            end: { dateTime: endTime.toISOString(), timeZone: "UTC" },
            attendees: attendees,
            isOnlineMeeting: true,
            onlineMeetingProvider: "teamsForBusiness"
        };

        const response = await fetch(`https://graph.microsoft.com/v1.0/users/${process.env.ADMIN_EMAIL}/events`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });
        const data = await response.json();
        return {
            id: data.id,
            joinUrl: data.onlineMeeting?.joinUrl
        };
        */
       
        return {
            id: "mock_event_id_" + Math.random(),
            joinUrl: "https://teams.microsoft.com/l/meetup-join/mock"
        };
    } catch (error) {
        console.error("Graph API Error:", error);
        return null;
    }
};
