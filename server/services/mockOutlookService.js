/**
 * mockOutlookService.js
 * 
 * Mock implementation of Microsoft Graph Outlook Calendar Service.
 * Used for Viva Scheduling System testing without requiring real Azure AD authentication.
 */

/**
 * Mock checking calendar availability.
 * Assumes the user is always free since the internal scheduling algorithm 
 * handles database-level conflicts based on provided availability.
 */
async function checkCalendarAvailability(userEmail, date, startTime, endTime) {
    // In a real implementation, this would call Microsoft Graph API.
    // For now, we return true to indicate the slot is free in the external calendar.
    console.log(`[MockOutlookService] Checking availability for ${userEmail} on ${date} between ${startTime} and ${endTime} -> FREE`);
    return true;
}

/**
 * Mock creating an Outlook calendar event and a Teams meeting.
 */
async function createCalendarEvent(eventDetails) {
    const { title, date, startTime, endTime, participants, isOnline, venue } = eventDetails;
    
    console.log(`[MockOutlookService] Creating Mock Event: ${title}`);
    console.log(`[MockOutlookService] Participants: ${participants.join(', ')}`);
    console.log(`[MockOutlookService] Mode: ${isOnline ? 'Online/Hybrid' : 'Physical'}, Venue: ${venue}`);

    // Generate mock IDs
    const mockEventId = `MOCK-OUTLOOK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Generate mock Teams link if online or hybrid
    let mockTeamsLink = null;
    if (isOnline || venue === "Hybrid" || venue === "Online") {
        mockTeamsLink = `https://teams.microsoft.com/l/meetup-join/mock-meeting-${Date.now()}`;
        console.log(`[MockOutlookService] Generated Mock Teams Link: ${mockTeamsLink}`);
    }

    return {
        eventId: mockEventId,
        teamsLink: mockTeamsLink
    };
}

/**
 * Mock connection test
 */
async function testConnection() {
    console.log("[MockOutlookService] Testing connection -> SUCCESS");
    return { 
        status: 'success', 
        message: 'Successfully connected to Mock Outlook Service',
        adminEmailConfigured: true
    };
}

module.exports = {
    checkCalendarAvailability,
    createCalendarEvent,
    testConnection
};
