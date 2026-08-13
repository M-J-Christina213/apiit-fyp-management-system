import React, { useState, useEffect } from 'react';
import './viva-styles.css';

const AvailabilityCalendar = ({ period, userId, userRole, existingAvailabilities, onSave }) => {
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlots, setSelectedSlots] = useState([]);
    
    // Convert dates
    const startDate = new Date(period.start_date);
    const endDate = new Date(period.end_date);
    
    // Ensure selected date is set to start date initially
    useEffect(() => {
        if (!selectedDate && startDate) {
            setSelectedDate(startDate.toISOString().split('T')[0]);
        }
    }, [startDate]);

    // Parse existing availabilities into selected slots structure
    useEffect(() => {
        if (existingAvailabilities && existingAvailabilities.length > 0) {
            const formatted = existingAvailabilities.map(a => ({
                date: new Date(a.date).toISOString().split('T')[0],
                start_time: new Date(a.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),
                end_time: new Date(a.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),
                submitted: true
            }));
            setSelectedSlots(formatted);
        }
    }, [existingAvailabilities]);

    const generateDates = () => {
        const dates = [];
        let current = new Date(startDate);
        while (current <= endDate) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
        return dates;
    };

    const generateTimeSlots = () => {
        const slots = [];
        const [startHour, startMin] = period.daily_start_time.split(':').map(Number);
        const [endHour, endMin] = period.daily_end_time.split(':').map(Number);
        const duration = period.slot_duration;
        
        let currentMins = startHour * 60 + startMin;
        const endMins = endHour * 60 + endMin;

        while (currentMins + duration <= endMins) {
            const h = Math.floor(currentMins / 60);
            const m = currentMins % 60;
            const eh = Math.floor((currentMins + duration) / 60);
            const em = (currentMins + duration) % 60;
            
            slots.push({
                start_time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
                end_time: `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`
            });
            currentMins += duration;
        }
        return slots;
    };

    const toggleSlot = (timeSlot) => {
        if (!selectedDate) return;
        
        const existingIdx = selectedSlots.findIndex(s => s.date === selectedDate && s.start_time === timeSlot.start_time);
        
        if (existingIdx >= 0) {
            // Remove
            const updated = [...selectedSlots];
            updated.splice(existingIdx, 1);
            setSelectedSlots(updated);
        } else {
            // Add
            setSelectedSlots([...selectedSlots, {
                date: selectedDate,
                start_time: timeSlot.start_time,
                end_time: timeSlot.end_time,
                submitted: false
            }]);
        }
    };

    const handleSave = () => {
        onSave(selectedSlots);
    };

    const isSlotSelected = (timeSlot) => {
        return selectedSlots.some(s => s.date === selectedDate && s.start_time === timeSlot.start_time && !s.submitted);
    };

    const isSlotSubmitted = (timeSlot) => {
        return selectedSlots.some(s => s.date === selectedDate && s.start_time === timeSlot.start_time && s.submitted);
    };

    const dates = generateDates();
    const timeSlots = generateTimeSlots();

    return (
        <div className="viva-card">
            <h3 className="viva-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Select Your Availability</h3>
            <p className="viva-subtitle" style={{ marginBottom: '2rem' }}>
                {period.type} &bull; {new Date(period.start_date).toLocaleDateString()} to {new Date(period.end_date).toLocaleDateString()}
            </p>

            <div className="viva-calendar-container">
                {/* Left: Date Selection */}
                <div className="viva-calendar-left">
                    <h4 className="viva-form-label">Available Dates</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {dates.map(date => (
                            <button
                                key={date}
                                onClick={() => setSelectedDate(date)}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    backgroundColor: selectedDate === date ? '#4f46e5' : 'white',
                                    color: selectedDate === date ? 'white' : '#374151',
                                    textAlign: 'left',
                                    fontWeight: selectedDate === date ? '600' : '500',
                                    cursor: 'pointer'
                                }}
                            >
                                {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Time Slots */}
                <div className="viva-calendar-right">
                    {selectedDate ? (
                        <>
                            <h4 className="viva-form-label">Time Slots for {new Date(selectedDate).toLocaleDateString()}</h4>
                            <div className="viva-time-grid">
                                {timeSlots.map(slot => {
                                    const selected = isSlotSelected(slot);
                                    const submitted = isSlotSubmitted(slot);
                                    return (
                                        <div
                                            key={slot.start_time}
                                            className={`viva-time-slot ${selected ? 'selected' : ''} ${submitted ? 'submitted' : ''}`}
                                            onClick={() => toggleSlot(slot)}
                                        >
                                            {slot.start_time}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div style={{ color: '#6b7280', padding: '2rem', textAlign: 'center' }}>
                            Select a date to view available time slots.
                        </div>
                    )}
                </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
                <span style={{ alignSelf: 'center', color: '#6b7280', fontSize: '0.875rem', marginRight: 'auto' }}>
                    {selectedSlots.length} slot(s) selected
                </span>
                <button className="viva-btn-primary" onClick={handleSave}>
                    Save Availability
                </button>
            </div>
        </div>
    );
};

export default AvailabilityCalendar;
