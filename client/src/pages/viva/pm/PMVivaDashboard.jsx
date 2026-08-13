import React, { useEffect, useState } from "react";
import '../viva-styles.css';

const PMVivaDashboard = () => {
    const [schedules, setSchedules] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState("");

    const pmHeaders = { "Content-Type": "application/json", "x-user-role": "pm" };

    const fetchPeriods = async () => {
        try {
            const res = await fetch("/api/viva/periods", { headers: pmHeaders });
            if (res.ok) setPeriods(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchSchedules = async (periodId) => {
        if (!periodId) {
            setSchedules([]);
            return;
        }
        try {
            const res = await fetch(`/api/viva/periods/${periodId}/schedules`, { headers: pmHeaders });
            if (res.ok) {
                const data = await res.json();
                // PM only sees finalized schedules
                setSchedules(data.filter(sch => sch.status === "FINALIZED"));
            }
        } catch (error) { console.error(error); }
    };

    useEffect(() => { fetchPeriods(); }, []);

    useEffect(() => {
        fetchSchedules(selectedPeriod);
    }, [selectedPeriod]);

    return (
        <div className="viva-container">
            <div className="viva-header">
                <div>
                    <h1 className="viva-title">Viva Schedules (PM View)</h1>
                    <p className="viva-subtitle">View finalized university Viva schedules.</p>
                </div>
            </div>

            <div className="viva-card" style={{ marginBottom: '2rem' }}>
                <div className="viva-form-group">
                    <label className="viva-form-label">Filter by Viva Period</label>
                    <select className="viva-form-select" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
                        <option value="">Select a Viva Period...</option>
                        {periods.map(p => (
                            <option key={p.id} value={p.id}>{p.type} ({p.intake} Intake) - {new Date(p.start_date).toLocaleDateString()}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedPeriod && (
                <div className="viva-card">
                    <h3 className="viva-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Finalized Schedules</h3>
                    {schedules.length === 0 ? (
                        <p style={{ color: '#6b7280' }}>No finalized schedules found for this period.</p>
                    ) : (
                        <div className="viva-table-container">
                            <table className="viva-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Supervisor</th>
                                        <th>Assessor</th>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Venue & Mode</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedules.map(sch => (
                                        <tr key={sch.id}>
                                            <td>{sch.students?.student_name} <br/><small style={{color: '#6b7280'}}>{sch.students?.batches?.batch_code}</small></td>
                                            <td>{sch.supervisors?.name}</td>
                                            <td>{sch.assessors?.name || 'TBD'}</td>
                                            <td>{sch.date ? new Date(sch.date).toLocaleDateString() : 'TBD'}</td>
                                            <td>{sch.start_time ? new Date(sch.start_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : 'TBD'}</td>
                                            <td>{sch.venue} ({sch.mode})</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PMVivaDashboard;
