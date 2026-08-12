/**
 * Generates available time slots for a given day based on start/end times and slot duration.
 * 
 * @param {string} dailyStartTime - e.g. "08:00"
 * @param {string} dailyEndTime - e.g. "19:00"
 * @param {number} slotDuration - e.g. 30
 * @returns {Array<{startTime: string, endTime: string}>}
 */
const generateTimeSlots = (dailyStartTime, dailyEndTime, slotDuration) => {
    const slots = [];
    
    if (!dailyStartTime || !dailyEndTime || !slotDuration) return slots;

    const [startHour, startMin] = dailyStartTime.split(":").map(Number);
    const [endHour, endMin] = dailyEndTime.split(":").map(Number);
    
    let currentMins = startHour * 60 + startMin;
    const finalMins = endHour * 60 + endMin;

    while (currentMins + slotDuration <= finalMins) {
        const startH = Math.floor(currentMins / 60);
        const startM = currentMins % 60;
        
        const nextMins = currentMins + slotDuration;
        const endH = Math.floor(nextMins / 60);
        const endM = nextMins % 60;

        const formatTime = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        
        slots.push({
            startTime: formatTime(startH, startM),
            endTime: formatTime(endH, endM)
        });

        currentMins = nextMins;
    }

    return slots;
};

module.exports = {
    generateTimeSlots
};
