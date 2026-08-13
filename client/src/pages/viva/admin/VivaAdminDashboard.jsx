import React, { useEffect, useState } from "react";
import { Plus, X, Calendar as CalendarIcon, Clock, Users, Play, Send, Settings, Check } from "lucide-react";
import '../viva-styles.css';

const VivaAdminDashboard = () => {
  const [stats, setStats] = useState({ activePeriods: 0, totalAvailabilities: 0, totalSchedules: 0, pendingPeriods: 0 });
  const [periods, setPeriods] = useState([]);
  const [batches, setBatches] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  
  const [formData, setFormData] = useState({
    type: "Proposal Viva", intake: "", batches: [], start_date: "", end_date: "", daily_start_time: "08:00", daily_end_time: "19:00", slot_duration: "30"
  });

  const adminHeaders = { "Content-Type": "application/json", "x-user-role": "admin" };

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch("/api/viva/dashboard", { headers: adminHeaders });
      if (statsRes.ok) setStats(await statsRes.json());
      const periodsRes = await fetch("/api/viva/periods", { headers: adminHeaders });
      if (periodsRes.ok) setPeriods(await periodsRes.json());
      const batchesRes = await fetch("/api/batches", { headers: adminHeaders });
      if (batchesRes.ok) setBatches(await batchesRes.json());
    } catch (error) { console.error("Failed to load viva dashboard:", error); }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const intakes = [...new Set(batches.map(b => b.batch_intake))];
  const filteredBatches = batches.filter(b => b.batch_intake === formData.intake);

  const toggleBatch = (id) => {
    setFormData(prev => ({
      ...prev,
      batches: prev.batches.includes(id) ? prev.batches.filter(b => b !== id) : [...prev.batches, id]
    }));
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    if (!formData.intake || formData.batches.length === 0) return alert("Select an intake and at least one batch.");
    if (formData.start_date > formData.end_date) return alert("End date cannot be before start date.");
    
    try {
      const res = await fetch("/api/viva/periods", { method: "POST", headers: adminHeaders, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create Viva period.");
      alert("Viva period created successfully.");
      setShowCreateModal(false);
      setFormData({ type: "Proposal Viva", intake: "", batches: [], start_date: "", end_date: "", daily_start_time: "08:00", daily_end_time: "19:00", slot_duration: "30" });
      fetchDashboardData();
    } catch (error) { alert(error.message); }
  };

  const handlePublishPeriod = async (periodId) => {
    try {
      const res = await fetch(`/api/viva/periods/${periodId}/publish`, { method: "PUT", headers: adminHeaders });
      if (!res.ok) throw new Error();
      alert("Viva period published. Participants can now submit availability.");
      fetchDashboardData();
    } catch (error) { alert("Error publishing Viva period."); }
  };

  const handleAutoSchedule = async (periodId) => {
    try {
      const res = await fetch(`/api/viva/periods/${periodId}/generate`, { method: "POST", headers: adminHeaders });
      if (!res.ok) throw new Error((await res.json()).error || "Scheduling failed.");
      alert("Viva schedules generated successfully.");
      fetchDashboardData();
      if (expandedPeriod === periodId) loadSchedules(periodId);
    } catch (error) { alert(error.message); }
  };

  const loadAvailabilityStatus = async (periodId) => {
    try {
      const res = await fetch(`/api/viva/periods/${periodId}/availability-status`, { headers: adminHeaders });
      if (res.ok) setAvailabilityStatus(await res.json());
    } catch (error) { console.error(error); }
  };

  const loadSchedules = async (periodId) => {
    if (expandedPeriod === periodId) { setExpandedPeriod(null); return; }
    try {
      setExpandedPeriod(periodId);
      loadAvailabilityStatus(periodId);
      const res = await fetch(`/api/viva/periods/${periodId}/schedules`, { headers: adminHeaders });
      if (res.ok) setSchedules(await res.json());
    } catch (error) { console.error(error); }
  };

  const handleFinalizeSchedule = async (scheduleId) => {
    if (!window.confirm("Finalizing this schedule will make it visible to students, supervisors, assessors and PM. Continue?")) return;
    try {
      const res = await fetch(`/api/viva/schedules/${scheduleId}/finalize`, { method: "PUT", headers: adminHeaders });
      if (res.ok) loadSchedules(expandedPeriod);
    } catch (error) { alert("Error finalizing schedule"); }
  };

  return (
    <div className="viva-container">
      <div className="viva-header">
        <div>
          <h1 className="viva-title">Viva Scheduling</h1>
          <p className="viva-subtitle">Create and manage university Viva periods and schedules.</p>
        </div>
        <button className="viva-btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={20} /> Create Viva Period
        </button>
      </div>

      <div className="viva-stat-grid">
        <div className="viva-stat-card">
          <span className="viva-stat-title">Active Viva Periods</span>
          <span className="viva-stat-value">{stats.activePeriods}</span>
        </div>
        <div className="viva-stat-card">
          <span className="viva-stat-title">Availability Responses</span>
          <span className="viva-stat-value">{stats.totalAvailabilities}</span>
        </div>
        <div className="viva-stat-card">
          <span className="viva-stat-title">Schedules Generated</span>
          <span className="viva-stat-value">{stats.totalSchedules}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {periods.map(period => (
          <div key={period.id} className="viva-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 className="viva-title" style={{ fontSize: '1.25rem' }}>{period.type}</h3>
                <p className="viva-subtitle">{period.intake} Intake &bull; {period.viva_period_batches.map(b => b.batches.batch_code).join(', ')}</p>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', color: '#4b5563', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CalendarIcon size={16}/> {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16}/> {period.daily_start_time} - {period.daily_end_time} ({period.slot_duration}m slots)</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                <span className={`viva-badge ${period.status.toLowerCase().replace('_', '-')}`}>{period.status.replace('_', ' ')}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {period.status === "Draft" && <button className="viva-btn-secondary" onClick={() => handlePublishPeriod(period.id)}><Send size={16} /> Publish Period</button>}
                  {period.status === "AVAILABILITY_OPEN" && <button className="viva-btn-primary" onClick={() => handleAutoSchedule(period.id)}><Play size={16} /> Generate Schedule</button>}
                  <button className="viva-btn-secondary" onClick={() => loadSchedules(period.id)}>View Details</button>
                </div>
              </div>
            </div>

            {expandedPeriod === period.id && (
              <div style={{ marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '2rem' }}>
                {availabilityStatus && (
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Availability Overview</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      {['Students', 'Supervisors', 'Assessors'].map(type => {
                        const data = availabilityStatus[type.toLowerCase()];
                        const percent = data.total > 0 ? (data.submitted / data.total) * 100 : 0;
                        return (
                          <div key={type} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                              <span style={{ fontWeight: 500 }}>{type}</span>
                              <span>{data.submitted}/{data.total}</span>
                            </div>
                            <div className="viva-progress-bar">
                              <div className="viva-progress-fill" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Generated Viva Schedule</h4>
                {schedules.length === 0 ? (
                  <p style={{ color: '#6b7280' }}>No schedules generated yet.</p>
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
                          <th>Status</th>
                          <th>Actions</th>
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
                            <td><span className={`viva-badge ${sch.status.toLowerCase()}`}>{sch.status}</span></td>
                            <td>
                              {sch.status !== 'FINALIZED' && (
                                <button className="viva-btn-secondary" onClick={() => handleFinalizeSchedule(sch.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                  Finalize
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="viva-modal-overlay">
          <div className="viva-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="viva-title" style={{ fontSize: '1.5rem' }}>Create Viva Period</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#6b7280" /></button>
            </div>

            <form onSubmit={handleCreatePeriod}>
              <div className="viva-form-group">
                <label className="viva-form-label">Viva Type</label>
                <select className="viva-form-select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option>Proposal Viva</option>
                  <option>Midpoint Viva</option>
                  <option>Final Viva</option>
                </select>
              </div>

              <div className="viva-form-group">
                <label className="viva-form-label">Intake</label>
                <select className="viva-form-select" value={formData.intake} onChange={e => setFormData({...formData, intake: e.target.value, batches: []})}>
                  <option value="">Select Intake</option>
                  {intakes.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              {formData.intake && (
                <div className="viva-form-group">
                  <label className="viva-form-label">Batches</label>
                  <div className="viva-checkbox-group">
                    {filteredBatches.map(b => (
                      <label key={b.id} className="viva-checkbox-label">
                        <input type="checkbox" checked={formData.batches.includes(b.id)} onChange={() => toggleBatch(b.id)} />
                        {b.batch_code}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="viva-form-group">
                  <label className="viva-form-label">Start Date</label>
                  <input type="date" className="viva-form-input" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} required />
                </div>
                <div className="viva-form-group">
                  <label className="viva-form-label">End Date</label>
                  <input type="date" className="viva-form-input" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="viva-form-group">
                  <label className="viva-form-label">Available From</label>
                  <input type="time" className="viva-form-input" value={formData.daily_start_time} onChange={e => setFormData({...formData, daily_start_time: e.target.value})} required />
                </div>
                <div className="viva-form-group">
                  <label className="viva-form-label">Available Until</label>
                  <input type="time" className="viva-form-input" value={formData.daily_end_time} onChange={e => setFormData({...formData, daily_end_time: e.target.value})} required />
                </div>
              </div>

              <div className="viva-form-group">
                <label className="viva-form-label">Slot Duration</label>
                <select className="viva-form-select" value={formData.slot_duration} onChange={e => setFormData({...formData, slot_duration: e.target.value})}>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="viva-btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="viva-btn-primary">Create Viva Period</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VivaAdminDashboard;