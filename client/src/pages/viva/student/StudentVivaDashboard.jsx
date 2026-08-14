import React, { useEffect, useState } from 'react';
import AvailabilityCalendar from '../AvailabilityCalendar';
import '../viva-styles.css';

const StudentVivaDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [savingPeriodId, setSavingPeriodId] = useState(null);
    const [saveMessage, setSaveMessage] = useState({});

    // Read logged-in user from localStorage (set by Login.jsx)
    const currentUser = JSON.parse(localStorage.getItem('fyp_current_user') || 'null');
    const email = currentUser?.email || '';

    const headers = {
        'Content-Type': 'application/json',
        'x-user-role': 'student',
        'x-user-email': email
    };

    const fetchDashboard = async () => {
        if (!email) {
            setError('Not logged in.');
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const res = await fetch('/api/viva/my-periods', { headers });
            if (!res.ok) {
                const body = await res.json();
                throw new Error(body.error || 'Failed to load Viva data');
            }
            setDashboardData(await res.json());
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboard(); }, [email]);

    const handleSaveAvailability = async (periodId, selectedSlots) => {
        if (!dashboardData?.participantId) {
            alert('Could not identify your student record. Please contact an administrator.');
            return;
        }
        setSavingPeriodId(periodId);
        try {
            const res = await fetch(`/api/viva/periods/${periodId}/availability`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ student_id: dashboardData.participantId, slots: selectedSlots })
            });
            if (res.ok) {
                setSaveMessage(prev => ({ ...prev, [periodId]: `✓ Availability saved — ${selectedSlots.length} slot(s) selected` }));
                fetchDashboard();
            } else {
                const body = await res.json();
                setSaveMessage(prev => ({ ...prev, [periodId]: `Error: ${body.error || 'Failed to save'}` }));
            }
        } catch (err) {
            setSaveMessage(prev => ({ ...prev, [periodId]: `Error: ${err.message}` }));
        } finally {
            setSavingPeriodId(null);
        }
    };

    if (loading) return (
        <div className="viva-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
                <p style={{ color: '#6b7280' }}>Loading your Viva schedule…</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="viva-container">
            <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1.5rem', borderRadius: 12, border: '1px solid #f87171' }}>
                <strong>Error:</strong> {error}
            </div>
        </div>
    );

    const { periods = [], availabilities = [], schedules = [] } = dashboardData || {};

    return (
        <div className="viva-container">
            <div className="viva-header">
                <div>
                    <h1 className="viva-title">Viva Availability</h1>
                    <p className="viva-subtitle">Select your available time slots for each upcoming Viva period.</p>
                </div>
            </div>

            {/* Finalized Schedules */}
            {schedules.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                    <h2 className="viva-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Your Confirmed Viva</h2>
                    {schedules.map(sch => (
                        <div key={sch.id} className="viva-card" style={{ borderLeft: '4px solid #10b981' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{sch.viva_periods?.type}</h3>
                                    <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                        {sch.date ? new Date(sch.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}
                                        {sch.start_time && ` • ${new Date(sch.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(sch.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                    </p>
                                </div>
                                <span className="viva-badge finalized">Confirmed</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                                <div><p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Supervisor</p><p style={{ fontWeight: 600 }}>{sch.supervisors?.name || '—'}</p></div>
                                <div><p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Assessor</p><p style={{ fontWeight: 600 }}>{sch.assessors?.name || 'TBD'}</p></div>
                                <div><p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Venue</p><p style={{ fontWeight: 600 }}>{sch.venue || '—'}</p></div>
                                <div><p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Mode</p><p style={{ fontWeight: 600 }}>{sch.mode || '—'}</p></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upcoming Periods */}
            <h2 className="viva-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Upcoming Viva Periods</h2>
            {periods.length === 0 ? (
                <div className="viva-card" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📅</div>
                    <p style={{ fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>No active Viva periods for your batch</p>
                    <p style={{ fontSize: '0.875rem' }}>Your Viva period has not been published yet. Check back later.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {periods.map(period => {
                        const batchCodes = period.viva_period_batches?.map(vpb => vpb.batches?.batch_code).filter(Boolean).join(', ') || '';
                        const myAvailabilities = availabilities.filter(a => a.viva_period_id === period.id);
                        return (
                            <div key={period.id}>
                                <div className="viva-card" style={{ marginBottom: '1rem', borderLeft: '4px solid #4f46e5' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{period.type}</h3>
                                            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                                {period.intake} • {batchCodes}
                                            </p>
                                            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                                {new Date(period.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} → {new Date(period.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                                {period.daily_start_time} – {period.daily_end_time} • {period.slot_duration}-minute slots
                                            </p>
                                        </div>
                                        <span className={`viva-badge ${period.status.toLowerCase().replace('_', '-')}`}>{period.status.replace('_', ' ')}</span>
                                    </div>
                                    {myAvailabilities.length > 0 && (
                                        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#ecfdf5', borderRadius: 8, fontSize: '0.85rem', color: '#065f46' }}>
                                            ✓ {myAvailabilities.length} slot(s) already submitted
                                        </div>
                                    )}
                                </div>
                                {saveMessage[period.id] && (
                                    <div style={{ padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', background: saveMessage[period.id].startsWith('Error') ? '#fef2f2' : '#ecfdf5', color: saveMessage[period.id].startsWith('Error') ? '#991b1b' : '#065f46', fontSize: '0.875rem' }}>
                                        {saveMessage[period.id]}
                                    </div>
                                )}
                                <AvailabilityCalendar
                                    key={period.id}
                                    period={period}
                                    userId={dashboardData.participantId}
                                    userRole="student"
                                    existingAvailabilities={myAvailabilities}
                                    onSave={(slots) => handleSaveAvailability(period.id, slots)}
                                    saving={savingPeriodId === period.id}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentVivaDashboard;
