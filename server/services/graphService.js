const { ConfidentialClientApplication } = require('@azure/msal-node');

const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
        clientSecret: process.env.AZURE_CLIENT_SECRET
    }
};

const cca = new ConfidentialClientApplication(msalConfig);

async function getAccessToken() {
    const tokenRequest = {
        scopes: ['https://graph.microsoft.com/.default'],
    };

    try {
        const response = await cca.acquireTokenByClientCredential(tokenRequest);
        return response.accessToken;
    } catch (error) {
        console.error("Error acquiring MS Graph token:", error);
        throw error;
    }
}

/**
 * Checks Microsoft Outlook Calendar availability for a user.
 * Mocked implementation to represent MS Graph Calendar API check.
 * In a real scenario, this would call `GET /users/{email}/calendar/schedule`
 */
async function checkCalendarAvailability(userEmail, date, startTime, endTime) {
    try {
        // const token = await getAccessToken();
        // Call MS Graph API: https://graph.microsoft.com/v1.0/users/${userEmail}/calendar/getSchedule
        
        // MOCK LOGIC for development:
        console.log(`Checking MS Graph availability for ${userEmail} on ${date} between ${startTime} and ${endTime}`);
        
        if (userEmail && userEmail.includes("busy")) {
            return false; // Slot is occupied
        }
        
        return true; // Slot is free
    } catch (error) {
        console.error(`Error checking calendar availability for ${userEmail}:`, error);
        return true; 
    }
}

/**
 * Creates an Outlook calendar event and a Teams meeting.
 */
async function createCalendarEvent(eventDetails) {
    const { title, date, startTime, endTime, participants, isOnline, venue } = eventDetails;
    try {
        // const token = await getAccessToken();
        // Call MS Graph API: POST https://graph.microsoft.com/v1.0/users/{adminEmail}/calendar/events
        
        console.log(`Creating MS Graph Calendar Event: ${title}`);
        
        let teamsLink = null;
        if (isOnline || venue === "Hybrid" || venue === "Online") {
            // In MS Graph, setting isOnlineMeeting to true generates a Teams link.
            teamsLink = `https://teams.microsoft.com/l/meetup-join/mock-meeting-${Date.now()}`;
        }

        return {
            eventId: `ms-graph-event-${Date.now()}`,
            teamsLink: teamsLink
        };
    } catch (error) {
        console.error("Error creating calendar event:", error);
        throw error;
    }
}

module.exports = {
    getAccessToken,
    checkCalendarAvailability,
    createCalendarEvent
};
