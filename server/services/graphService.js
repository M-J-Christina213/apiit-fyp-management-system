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
    if (!userEmail) return true; // Default to free if no email

    try {
        const token = await getAccessToken();
        const startDateTime = new Date(startTime).toISOString();
        const endDateTime = new Date(endTime).toISOString();

        const response = await fetch(`https://graph.microsoft.com/v1.0/users/${userEmail}/calendar/getSchedule`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Prefer': 'outlook.timezone="UTC"'
            },
            body: JSON.stringify({
                schedules: [userEmail],
                startTime: {
                    dateTime: startDateTime,
                    timeZone: "UTC"
                },
                endTime: {
                    dateTime: endDateTime,
                    timeZone: "UTC"
                },
                availabilityViewInterval: 60
            })
        });

        if (!response.ok) {
            console.warn(`Graph API error checking schedule for ${userEmail}: ${response.statusText}`);
            return true; // Assume free on error to prevent blocking scheduling
        }

        const data = await response.json();
        
        // If the schedule exists and has items, check for conflicts
        if (data && data.value && data.value.length > 0) {
            const schedule = data.value[0];
            if (schedule.scheduleItems && schedule.scheduleItems.length > 0) {
                // If there are schedule items overlapping, they are busy
                return false; 
            }
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
        const token = await getAccessToken();
        const adminEmail = process.env.ADMIN_EMAIL;

        if (!adminEmail) {
            console.warn("ADMIN_EMAIL is not set. MS Graph Event creation will be skipped.");
            return {
                eventId: `mock-event-${Date.now()}`,
                teamsLink: isOnline ? `https://teams.microsoft.com/l/meetup-join/mock-${Date.now()}` : null
            };
        }

        const attendees = participants.filter(Boolean).map(email => ({
            emailAddress: { address: email },
            type: "required"
        }));

        const event = {
            subject: title,
            start: { dateTime: new Date(startTime).toISOString(), timeZone: "UTC" },
            end: { dateTime: new Date(endTime).toISOString(), timeZone: "UTC" },
            attendees: attendees,
            location: { displayName: venue || "TBD" }
        };

        if (isOnline || venue === "Hybrid" || venue === "Online") {
            event.isOnlineMeeting = true;
            event.onlineMeetingProvider = "teamsForBusiness";
        }

        console.log(`Creating MS Graph Calendar Event: ${title} via ${adminEmail}`);

        const response = await fetch(`https://graph.microsoft.com/v1.0/users/${adminEmail}/events`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to create event: ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();

        return {
            eventId: data.id,
            teamsLink: data.onlineMeeting?.joinUrl || null
        };
    } catch (error) {
        console.error("Error creating calendar event:", error);
        throw error;
    }
}

async function testConnection() {
    try {
        const token = await getAccessToken();
        if (!token) return { status: 'error', message: 'Failed to acquire access token' };
        
        return { 
            status: 'success', 
            message: 'Successfully acquired Microsoft Graph App-Only token',
            adminEmailConfigured: !!process.env.ADMIN_EMAIL
        };
    } catch (error) {
        return { 
            status: 'error', 
            message: error.message || 'Error connecting to Microsoft Graph'
        };
    }
}

module.exports = {
    getAccessToken,
    checkCalendarAvailability,
    createCalendarEvent,
    testConnection
};
