import React, { useEffect, useState } from "react";
import AvailabilityCalendar from "../AvailabilityCalendar";
import '../viva-styles.css';

const StudentVivaDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const userId = 1; // Assuming 1 for testing purposes; in reality would come from auth context

    const fetchDashboard = async () => {
        try {
            const res = await fetch(`/api/viva/my-dashboard/student/${userId}`);
            if (res.ok) setDashboardData(await res.json());
        } catch (error) { console.error(error); }
    };

    useEffect(() => { fetchDashboard(); }, []);

    const handleSaveAvailability = async (periodId, selectedSlots) => {
        try {
            const res = await fetch(`/api/viva/periods/${periodId}/availability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: userId, slots: selectedSlots })
            });
            if (res.ok) {
                alert("Availability saved!");
                fetchDashboard();
            } else {
                alert("Failed to save availability");
            }
        } catch (error) { console.error(error); }
    };

    if (!dashboardData) return <div className="viva-container">Loading...</div>;

    const { periods, availabilities, schedules } = dashboardData;

    return (
        <div className="viva-container">
            <div className="viva-header">
                <div>
                    <h1 className="viva-title">My Viva Schedules</h1>
                    <p className="viva-subtitle">Manage your Viva availability and view confirmed schedules.</p>
                </div>
            </div>

            {schedules.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                    <h2 className="viva-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Confirmed Schedules</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {schedules.map(sch => (
                            <div key={sch.id} className="viva-card" style={{ borderLeft: '4px solid #4f46e5' }}>
                                <h3 className="viva-title" style={{ fontSize: '1.25rem' }}>{sch.viva_periods.type}</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                                    <div>
                                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Date</p>
                                        <p style={{ fontWeight: 500 }}>{new Date(sch.date).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Time</p>
                                        <p style={{ fontWeight: 500 }}>{new Date(sch.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(sch.end_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Supervisor</p>
                                        <p style={{ fontWeight: 500 }}>{sch.supervisors?.name}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Assessor</p>
                                        <p style={{ fontWeight: 500 }}>{sch.assessors?.name || 'TBD'}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Venue</p>
                                        <p style={{ fontWeight: 500 }}>{sch.venue}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Mode</p>
                                        <p style={{ fontWeight: 500 }}>{sch.mode}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <h2 className="viva-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Upcoming Viva Periods</h2>
                {periods.length === 0 ? (
                    <p style={{ color: '#6b7280' }}>No active Viva periods for your batch.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {periods.map(period => (
                            <AvailabilityCalendar 
                                key={period.id} 
                                period={period} 
                                userId={userId} 
                                userRole="student"
                                existingAvailabilities={availabilities.filter(a => a.viva_period_id === period.id)}
                                onSave={(slots) => handleSaveAvailability(period.id, slots)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentVivaDashboard;
