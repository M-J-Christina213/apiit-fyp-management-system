import React, { useEffect, useState } from "react";
import {
  CalendarDays, Clock3, Users, CalendarCheck, Plus, Play,
  Eye, Send, X, ChevronDown, Edit, Trash2, MapPin
} from "lucide-react";

const StatCard = ({ icon, title, value, iconBg, iconColor }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  let bg = "bg-slate-100";
  let text = "text-slate-700";
  
  if (!status) return null;
  const s = status.toUpperCase();

  if (s === "DRAFT") { bg = "bg-slate-100"; text = "text-slate-700"; }
  else if (s === "AVAILABILITY_OPEN") { bg = "bg-emerald-50"; text = "text-emerald-700"; }
  else if (s === "SCHEDULING") { bg = "bg-amber-50"; text = "text-amber-700"; }
  else if (s === "SCHEDULE_GENERATED") { bg = "bg-blue-50"; text = "text-blue-700"; }
  else { bg = "bg-indigo-50"; text = "text-indigo-700"; }
  
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>{status.replace('_', ' ')}</span>
};

const VivaAdminDashboard = () => {
  const [stats, setStats] = useState({ activePeriods: 0, totalAvailabilities: 0, totalSchedules: 0 });
  const [periods, setPeriods] = useState([]);
  const [batches, setBatches] = useState([]);
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const [schedules, setSchedules] = useState([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState(null);
  
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const [formData, setFormData] = useState({
    type: "Proposal Viva",
    intake: "",
    batches: [],
    start_date: "",
    end_date: "",
    daily_start_time: "08:00",
    daily_end_time: "19:00",
    slot_duration: "30"
  });

  const [scheduleData, setScheduleData] = useState({
    venue: "",
    mode: "Physical"
  });

  const adminHeaders = { "Content-Type": "application/json", "x-user-role": "admin" };

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch("/api/viva/dashboard", { headers: adminHeaders });
      if (statsRes.ok) setStats(await statsRes.json());

      const periodsRes = await fetch("/api/viva/periods", { headers: adminHeaders });
      if (periodsRes.ok) setPeriods(await periodsRes.json());
      
      const batchesRes = await fetch("/api/viva/batches-with-students", { headers: adminHeaders });
      if (batchesRes.ok) setBatches(await batchesRes.json());
    } catch (error) {
      console.error(error);
    }
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

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setFormData({ type: "Proposal Viva", intake: "", batches: [], start_date: "", end_date: "", daily_start_time: "08:00", daily_end_time: "19:00", slot_duration: "30" });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (period) => {
    setIsEditMode(true);
    setEditingPeriodId(period.id);
    setFormData({
      type: period.type || "Proposal Viva",
      intake: period.intake || "",
      batches: period.viva_period_batches.map(vpb => vpb.batch_id),
      start_date: new Date(period.start_date).toISOString().split('T')[0],
      end_date: new Date(period.end_date).toISOString().split('T')[0],
      daily_start_time: period.daily_start_time || "08:00",
      daily_end_time: period.daily_end_time || "19:00",
      slot_duration: period.slot_duration.toString()
    });
    setShowCreateModal(true);
  };

  const handleDeletePeriod = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Viva Period? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/viva/periods/${id}`, { method: "DELETE", headers: adminHeaders });
      if (!res.ok) throw new Error("Failed to delete");
      alert("Deleted successfully");
      fetchDashboardData();
    } catch (e) { alert(e.message); }
  };

  const handleSavePeriod = async (e) => {
    e.preventDefault();
    if (!formData.intake || formData.batches.length === 0) return alert("Select an intake and at least one batch.");
    if (formData.start_date > formData.end_date) return alert("End date cannot be before start date.");

    try {
      const method = isEditMode ? "PUT" : "POST";
      const url = isEditMode ? `/api/viva/periods/${editingPeriodId}` : "/api/viva/periods";
      
      const res = await fetch(url, { method, headers: adminHeaders, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save period.");
      
      alert(`Viva period ${isEditMode ? 'updated' : 'created'} successfully.`);
      setShowCreateModal(false);
      fetchDashboardData();
    } catch (error) { alert(error.message); }
  };

  const handlePublishPeriod = async (periodId) => {
    try {
      const res = await fetch(`/api/viva/periods/${periodId}/publish`, { method: "PUT", headers: adminHeaders });
      if (!res.ok) throw new Error();
      alert("Viva period published.");
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

  const loadSchedules = async (periodId) => {
    if (expandedPeriod === periodId) { setExpandedPeriod(null); return; }
    try {
      const res = await fetch(`/api/viva/periods/${periodId}/schedules`, { headers: adminHeaders });
      if (res.ok) {
        setSchedules(await res.json());
        setExpandedPeriod(periodId);
      }
    } catch (error) { console.error(error); }
  };

  const handleFinalizeSchedule = async (scheduleId) => {
    if (!window.confirm("Finalizing this schedule will make it visible to participants. Continue?")) return;
    try {
      const res = await fetch(`/api/viva/schedules/${scheduleId}/finalize`, { method: "PUT", headers: adminHeaders });
      if (res.ok) loadSchedules(expandedPeriod);
    } catch (error) { alert("Error finalizing schedule"); }
  };

  const openEditSchedule = (sch) => {
    setEditingSchedule(sch);
    setScheduleData({ venue: sch.venue || "", mode: sch.mode || "Physical" });
    setShowEditScheduleModal(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/viva/schedules/${editingSchedule.id}`, { 
        method: "PUT", 
        headers: adminHeaders, 
        body: JSON.stringify(scheduleData) 
      });
      if (!res.ok) throw new Error("Failed to update schedule");
      setShowEditScheduleModal(false);
      loadSchedules(expandedPeriod);
    } catch (e) { alert(e.message); }
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatTime = (time) => {
    if (!time) return "—";
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(hours); date.setMinutes(minutes);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  // Group schedules by batch code
  const groupedSchedules = schedules.reduce((acc, sch) => {
    const batchCode = sch.students?.batches?.batch_code || "Unknown Batch";
    if (!acc[batchCode]) acc[batchCode] = [];
    acc[batchCode].push(sch);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Viva Scheduling</h1>
            <p className="text-slate-500 mt-1">Manage Viva periods, assign venues, and finalize schedules.</p>
          </div>
          <button onClick={handleOpenCreate} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-semibold transition">
            <Plus size={18} /> Create Viva Period
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <StatCard icon={<CalendarCheck size={22} />} title="Active Viva Periods" value={stats.activePeriods} iconBg="bg-indigo-100" iconColor="text-indigo-600" />
          <StatCard icon={<Users size={22} />} title="Availabilities Submitted" value={stats.totalAvailabilities} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
          <StatCard icon={<Clock3 size={22} />} title="Generated Schedules" value={stats.totalSchedules} iconBg="bg-amber-100" iconColor="text-amber-600" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="px-6 py-5 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Viva Periods</h2>
          </div>
          <div className="p-6">
            {periods.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-500">No Viva periods found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {periods.map((period) => (
                  <div key={period.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                          <CalendarDays size={22} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-lg text-slate-900">{period.type}</h3>
                            <StatusBadge status={period.status} />
                          </div>
                          <div className="flex gap-4 mt-2 text-sm text-slate-500">
                            <span>{period.intake} Intake</span>
                            <span>{formatDate(period.start_date)} - {formatDate(period.end_date)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {period.status === "Draft" && (
                          <button onClick={() => handlePublishPeriod(period.id)} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
                            <Send size={15} /> Publish
                          </button>
                        )}
                        {(period.status === "AVAILABILITY_OPEN" || period.status === "SCHEDULING") && (
                          <button onClick={() => handleAutoSchedule(period.id)} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
                            <Play size={15} /> Generate Schedule
                          </button>
                        )}
                        <button onClick={() => handleOpenEdit(period)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDeletePeriod(period.id)} className="p-2 border border-red-200 rounded-lg hover:bg-red-50 text-red-600 transition" title="Delete">
                          <Trash2 size={16} />
                        </button>
                        <button onClick={() => loadSchedules(period.id)} className="inline-flex items-center gap-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 transition px-4 py-2 rounded-lg text-sm font-medium text-slate-700">
                          <Eye size={15} /> Details <ChevronDown size={15} className={expandedPeriod === period.id ? "rotate-180 transition" : "transition"}/>
                        </button>
                      </div>
                    </div>

                    {expandedPeriod === period.id && (
                      <div className="border-t border-slate-200 bg-slate-50 p-5">
                        <h4 className="font-semibold text-slate-900 mb-4">Schedules Overview</h4>
                        {schedules.length === 0 ? (
                          <p className="text-slate-500">No schedules generated.</p>
                        ) : (
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-100 border-b border-slate-200">
                                <tr>
                                  <th className="px-5 py-3 text-slate-600">CB Number</th>
                                  <th className="px-5 py-3 text-slate-600">Student</th>
                                  <th className="px-5 py-3 text-slate-600">Supervisor / Assessor</th>
                                  <th className="px-5 py-3 text-slate-600">Date & Time</th>
                                  <th className="px-5 py-3 text-slate-600">Venue & Mode</th>
                                  <th className="px-5 py-3 text-slate-600">Status</th>
                                  <th className="px-5 py-3 text-slate-600">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(groupedSchedules).map(([batchCode, batchSchedules]) => (
                                  <React.Fragment key={batchCode}>
                                    <tr>
                                      <td colSpan="7" className="bg-indigo-50 font-bold text-indigo-900 px-5 py-3 border-y border-slate-200 text-sm uppercase tracking-wide">
                                        Batch Code: {batchCode}
                                      </td>
                                    </tr>
                                    {batchSchedules.map(sch => (
                                      <tr key={sch.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-5 py-3 text-slate-600">{sch.students?.cb_no}</td>
                                        <td className="px-5 py-3 font-medium text-slate-900">{sch.students?.student_name}</td>
                                        <td className="px-5 py-3">
                                          <div className="text-slate-800"><span className="text-slate-400 text-xs font-semibold mr-1">SUP:</span>{sch.supervisors?.name || 'TBD'}</div>
                                          <div className="text-slate-500 mt-1"><span className="text-slate-400 text-xs font-semibold mr-1">ASS:</span>{sch.assessors?.name || 'TBD'}</div>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600">
                                          <div>{sch.date ? new Date(sch.date).toLocaleDateString() : 'TBD'}</div>
                                          <div className="text-xs mt-1">{sch.start_time ? new Date(sch.start_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : 'TBD'}</div>
                                        </td>
                                        <td className="px-5 py-3">
                                          <div className="text-slate-800 font-medium">{sch.venue || 'TBD'}</div>
                                          <div className="text-slate-500 text-xs mt-1">{sch.mode || 'Physical'}</div>
                                        </td>
                                        <td className="px-5 py-3"><StatusBadge status={sch.status} /></td>
                                        <td className="px-5 py-3">
                                          <div className="flex gap-2">
                                            <button onClick={() => openEditSchedule(sch)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit Venue">
                                              <MapPin size={16} />
                                            </button>
                                            {sch.status !== 'FINALIZED' && (
                                              <button onClick={() => handleFinalizeSchedule(sch.id)} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-xs font-semibold hover:bg-indigo-200 transition">
                                                Finalize
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </React.Fragment>
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
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT PERIOD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
              <h2 className="text-xl font-bold text-slate-800">{isEditMode ? 'Edit' : 'Create'} Viva Period</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePeriod} className="space-y-5">
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Intake</label>
                  <select className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={formData.intake} onChange={e => setFormData({...formData, intake: e.target.value, batches: []})}>
                    <option value="">Select Intake</option>
                    {intakes.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              {formData.intake && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Batches</label>
                  <div className="border border-slate-200 rounded-xl p-4 max-h-40 overflow-y-auto bg-slate-50 space-y-2">
                    {filteredBatches.map(b => (
                      <label key={b.id} className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={formData.batches.includes(b.id)} onChange={() => toggleBatch(b.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-slate-700 group-hover:text-slate-900">{b.batch_code} ({b.stage})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-5">
                <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label><input type="date" required className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label><input type="date" required className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} /></div>
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Daily Start</label><input type="time" required className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={formData.daily_start_time} onChange={e => setFormData({...formData, daily_start_time: e.target.value})} /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Daily End</label><input type="time" required className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={formData.daily_end_time} onChange={e => setFormData({...formData, daily_end_time: e.target.value})} /></div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Slot Duration</label>
                  <select className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={formData.slot_duration} onChange={e => setFormData({...formData, slot_duration: e.target.value})}>
                    <option value="15">15 mins</option>
                    <option value="30">30 mins</option>
                    <option value="45">45 mins</option>
                    <option value="60">60 mins</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-sm">{isEditMode ? 'Save Changes' : 'Create Period'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SCHEDULE MODAL */}
      {showEditScheduleModal && editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowEditScheduleModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-xl font-bold text-slate-800">Edit Venue Details</h2>
              <button onClick={() => setShowEditScheduleModal(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
            </div>
            <div className="mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-sm text-slate-600 mb-1">Student: <strong className="text-slate-900">{editingSchedule.students?.student_name} ({editingSchedule.students?.cb_no})</strong></p>
              <p className="text-sm text-slate-600">Date: <span className="font-medium text-slate-900">{editingSchedule.date ? new Date(editingSchedule.date).toLocaleDateString() : 'TBD'}</span></p>
            </div>
            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Venue</label>
                <input type="text" className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={scheduleData.venue} onChange={e => setScheduleData({...scheduleData, venue: e.target.value})} placeholder="e.g. L4CR5 (City Campus)" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mode</label>
                <select className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" value={scheduleData.mode} onChange={e => setScheduleData({...scheduleData, mode: e.target.value})}>
                  <option value="Physical">Physical</option>
                  <option value="Online">Online</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setShowEditScheduleModal(false)} className="px-5 py-2.5 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-sm">Save Venue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VivaAdminDashboard;