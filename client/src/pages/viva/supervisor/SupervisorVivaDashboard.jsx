import React, { useEffect, useState } from 'react';
import AvailabilityCalendar from '../AvailabilityCalendar';
import '../viva-styles.css';

const SupervisorVivaDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [savingPeriodId, setSavingPeriodId] = useState(null);
    const [saveMessage, setSaveMessage] = useState({});

    const currentUser = JSON.parse(localStorage.getItem('fyp_current_user') || 'null');
    const email = currentUser?.email || '';

    const headers = {
        'Content-Type': 'application/json',
        'x-user-role': 'academic',
        'x-user-email': email
    };

    const fetchDashboard = async () => {
        if (!email) { setError('Not logged in.'); setLoading(false); return; }
        try {
            setLoading(true);
            const res = await fetch('/api/viva/my-periods', { headers });
            if (!res.ok) { const b = await res.json(); throw new Error(b.error || 'Failed to load'); }
            setDashboardData(await res.json());
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDashboard(); }, [email]);

    const handleSaveAvailability = async (periodId, selectedSlots, roleType) => {
        const pId = roleType === 'supervisor' ? dashboardData.supervisorId : dashboardData.assessorId;
        if (!pId) {
            alert(`Could not identify your ${roleType} record. Please contact an administrator.`);
            return;
        }
        
        setSavingPeriodId(periodId);
        try {
            const bodyPayload = { slots: selectedSlots };
            if (roleType === 'supervisor') bodyPayload.supervisor_id = pId;
            else bodyPayload.assessor_id = pId;

            const res = await fetch(`/api/viva/periods/${periodId}/availability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });
            
            if (res.ok) {
                setSaveMessage(prev => ({ ...prev, [periodId]: `✓ Availability saved as ${roleType} — ${selectedSlots.length} slot(s)` }));
                fetchDashboard();
            } else {
                const b = await res.json();
                setSaveMessage(prev => ({ ...prev, [periodId]: `Error: ${b.error || 'Failed'}` }));
            }
        } catch (err) {
            setSaveMessage(prev => ({ ...prev, [periodId]: `Error: ${err.message}` }));
        } finally { setSavingPeriodId(null); }
    };

    if (loading) return <div className="viva-container"><p style={{ color: '#6b7280' }}>Loading…</p></div>;
    if (error) return <div className="viva-container"><div style={{ background: '#fef2f2', color: '#991b1b', padding: '1.5rem', borderRadius: 12, border: '1px solid #f87171' }}><strong>Error:</strong> {error}</div></div>;

    const { periods = [], availabilities = [], schedules = [] } = dashboardData || {};

    return (
        <div className="viva-container">
            <div className="viva-header">
                <div>
                    <h1 className="viva-title">Viva Availability</h1>
                    <p className="viva-subtitle">Submit your available time slots for Viva sessions with your assigned students.</p>
                </div>
            </div>

            {schedules.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                    <h2 className="viva-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Confirmed Viva Sessions</h2>
                    {schedules.map(sch => (
                        <div key={sch.id} className="viva-card" style={{ borderLeft: '4px solid #10b981' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                    <h3 style={{ fontWeight: 700 }}>{sch.viva_periods?.type}</h3>
                                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                        Student: <strong>{sch.students?.student_name}</strong> ({sch.students?.cb_no})
                                    </p>
                                    <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                        {sch.date ? new Date(sch.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : 'TBD'}
                                        {sch.start_time && ` • ${new Date(sch.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(sch.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                    </p>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        {sch.supervisor_id === dashboardData.supervisorId && <span style={{ marginRight: '0.5rem', padding: '0.2rem 0.5rem', background: '#e0e7ff', color: '#3730a3', fontSize: '0.75rem', borderRadius: 4 }}>As Supervisor</span>}
                                        {sch.assessor_id === dashboardData.assessorId && <span style={{ padding: '0.2rem 0.5rem', background: '#fef3c7', color: '#92400e', fontSize: '0.75rem', borderRadius: 4 }}>As Assessor</span>}
                                    </div>
                                </div>
                                <span className="viva-badge finalized">Confirmed</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <h2 className="viva-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Upcoming Viva Periods</h2>
            {periods.length === 0 ? (
                <div className="viva-card" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📅</div>
                    <p style={{ fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>No active Viva periods</p>
                    <p style={{ fontSize: '0.875rem' }}>No Viva periods have been published for your assigned students.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {periods.map(period => {
                        const batchCodes = period.viva_period_batches?.map(vpb => vpb.batches?.batch_code).filter(Boolean).join(', ') || '';
                        const myAvailabilities = availabilities.filter(a => a.viva_period_id === period.id);
                        
                        // Default to displaying as supervisor if they are a supervisor, else assessor
                        const roleType = period.isSupervisor ? 'supervisor' : 'assessor';
                        const activeId = roleType === 'supervisor' ? dashboardData.supervisorId : dashboardData.assessorId;
                        
                        return (
                            <div key={period.id}>
                                <div className="viva-card" style={{ marginBottom: '1rem', borderLeft: period.isSupervisor ? '4px solid #7c3aed' : '4px solid #f59e0b' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{period.type}</h3>
                                                {period.isSupervisor && <span style={{ padding: '0.1rem 0.4rem', background: '#e0e7ff', color: '#3730a3', fontSize: '0.7rem', borderRadius: 4 }}>Supervisor</span>}
                                                {period.isAssessor && <span style={{ padding: '0.1rem 0.4rem', background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', borderRadius: 4 }}>Assessor</span>}
                                            </div>
                                            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>{period.intake} • {batchCodes}</p>
                                            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                                {new Date(period.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} → {new Date(period.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                                    userId={activeId}
                                    userRole={roleType}
                                    existingAvailabilities={myAvailabilities}
                                    onSave={(slots) => handleSaveAvailability(period.id, slots, roleType)}
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

export default SupervisorVivaDashboard;
