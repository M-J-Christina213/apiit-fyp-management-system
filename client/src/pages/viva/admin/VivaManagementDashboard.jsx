import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CalendarDays, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  CalendarCheck,
  Play,
  Plus,
  Edit,
  UploadCloud,
  Send
} from 'lucide-react';

const VivaManagementDashboard = () => {
  const [stats, setStats] = useState({
    activePeriods: 0,
    totalSchedules: 0,
    totalAvailabilities: 0
  });

  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [stages, setStages] = useState([]);
  const [expandedPeriodId, setExpandedPeriodId] = useState(null);
  const [periodSchedules, setPeriodSchedules] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Proposal Viva',
    availability_start: '',
    availability_end: '',
    viva_start: '',
    viva_end: ''
  });
  
  // Headers for admin requests
  const adminHeaders = { 
    'Content-Type': 'application/json',
    'x-user-role': 'admin'
  };

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch('/api/viva/dashboard', { headers: adminHeaders });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      const stagesRes = await fetch('/api/viva/periods', { headers: adminHeaders });
      if (stagesRes.ok) {
        const stagesData = await stagesRes.json();
        setStages(stagesData);
      }
      
      const integrationRes = await fetch('/api/viva/integration-status', { headers: adminHeaders });
      if (integrationRes.ok) {
          const integrationData = await integrationRes.json();
          setIntegrationStatus(integrationData);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/viva/periods', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert("Viva period created successfully!");
        setShowCreateForm(false);
        fetchDashboardData();
      } else {
        alert("Failed to create period");
      }
    } catch (error) {
      console.error(error);
      alert("Error creating period");
    }
  };
  
  const handlePublishPeriod = async (periodId) => {
    try {
      const res = await fetch(`/api/viva/periods/${periodId}/publish`, {
        method: 'PUT',
        headers: adminHeaders
      });
      if (res.ok) {
        alert("Viva period published! Availability collection has started.");
        fetchDashboardData();
      } else {
        alert("Failed to publish period");
      }
    } catch (error) {
      console.error(error);
      alert("Error publishing period");
    }
  };

  const handleTriggerScheduling = async (periodId) => {
    try {
      const res = await fetch(`/api/viva/periods/${periodId}/generate`, {
        method: 'POST',
        headers: adminHeaders
      });
      if (res.ok) {
        alert("Scheduling triggered successfully!");
        fetchDashboardData();
        if (expandedPeriodId === periodId) handleViewSchedules(periodId);
      } else {
        const err = await res.json();
        alert("Scheduling failed: " + err.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error triggering schedule");
    }
  };

  const handleViewSchedules = async (periodId) => {
      if (expandedPeriodId === periodId) {
          setExpandedPeriodId(null);
          return;
      }
      try {
          const res = await fetch(`/api/viva/periods/${periodId}/schedules`, { headers: adminHeaders });
          if (res.ok) {
              const data = await res.json();
              setPeriodSchedules(data);
              setExpandedPeriodId(periodId);
          }
      } catch (error) {
          console.error("Failed to load schedules", error);
      }
  };
  
  const handlePublishSchedules = async (periodId) => {
    try {
      const res = await fetch(`/api/viva/periods/${periodId}/schedules/publish`, {
        method: 'PUT',
        headers: adminHeaders
      });
      if (res.ok) {
        alert("Schedules published! Notifications sent.");
        fetchDashboardData();
        handleViewSchedules(periodId);
      } else {
        alert("Failed to publish schedules");
      }
    } catch (error) {
      console.error(error);
      alert("Error publishing schedules");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Viva Management (Admin)</h1>
          <p className="text-gray-500 mt-1">Manage, automate, and review university viva schedules</p>
        </div>
        <div className="flex gap-4">
            <button 
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2">
                <Plus size={18} />
                Create Viva Period
            </button>
        </div>
      </div>

      {/* Integration Status Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <div>
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <CalendarDays size={20} className="text-blue-600" />
                  Microsoft Graph Integration Status
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                  {integrationStatus ? integrationStatus.message : "Checking status..."}
              </p>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Status:</span>
              {integrationStatus?.status === 'success' ? (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircle2 size={16} /> Ready for Integration
                  </span>
              ) : (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                      <AlertTriangle size={16} /> Disconnected
                  </span>
              )}
          </div>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreatePeriod} className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 grid grid-cols-2 gap-4 transition-all">
            <div className="col-span-2">
                <h3 className="text-lg font-semibold mb-4 text-indigo-900 border-b pb-2">Create New Viva Period</h3>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Stage</label>
                <select className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option>Proposal Viva</option>
                    <option>Midpoint Viva</option>
                    <option>Final Viva</option>
                </select>
            </div>
            <div></div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Availability Start</label>
                <input type="date" required className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500" value={formData.availability_start} onChange={e => setFormData({...formData, availability_start: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Availability End</label>
                <input type="date" required className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500" value={formData.availability_end} onChange={e => setFormData({...formData, availability_end: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Viva Start</label>
                <input type="date" required className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500" value={formData.viva_start} onChange={e => setFormData({...formData, viva_start: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Viva End</label>
                <input type="date" required className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500" value={formData.viva_end} onChange={e => setFormData({...formData, viva_end: e.target.value})} />
            </div>
            <div className="col-span-2 pt-4 flex justify-end">
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 transition-colors text-white px-6 py-2 rounded-lg font-medium shadow-md">Create Period</button>
            </div>
        </form>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<CalendarCheck />} title="Active Periods" value={stats.activePeriods} color="text-indigo-600" bg="bg-indigo-100" />
        <StatCard icon={<Users />} title="Total Availabilities Submitted" value={stats.totalAvailabilities} color="text-emerald-600" bg="bg-emerald-100" />
        <StatCard icon={<Clock />} title="Total Generated Schedules" value={stats.totalSchedules} color="text-orange-600" bg="bg-orange-100" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Active Viva Periods</h2>
          <div className="space-y-6">
            {stages.map((item, index) => (
              <React.Fragment key={index}>
              <div className="flex flex-col md:flex-row items-center justify-between p-5 border border-gray-200 rounded-xl hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50">
                <div className="mb-4 md:mb-0">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    {item.type}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 uppercase tracking-wider">
                        {item.status}
                    </span>
                  </h3>
                  <div className="text-sm text-gray-600 mt-2 grid grid-cols-2 gap-x-8 gap-y-1">
                      <p><span className="font-medium text-gray-400">Availability:</span> {new Date(item.availability_start).toLocaleDateString()} - {new Date(item.availability_end).toLocaleDateString()}</p>
                      <p><span className="font-medium text-gray-400">Viva Dates:</span> {new Date(item.viva_start).toLocaleDateString()} - {new Date(item.viva_end).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap justify-end">
                    {item.status === 'Draft' && (
                        <button onClick={() => handlePublishPeriod(item.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm rounded-lg font-medium transition-colors shadow-sm flex items-center gap-1">
                            <UploadCloud size={16} /> Publish Period
                        </button>
                    )}
                    {(item.status === 'Availability Collection' || item.status === 'Scheduling') && (
                        <button onClick={() => handleTriggerScheduling(item.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-lg font-medium transition-colors shadow-sm flex items-center gap-1">
                            <Play size={16} /> Auto-Schedule
                        </button>
                    )}
                    
                    <button onClick={() => handleViewSchedules(item.id)} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 text-sm rounded-lg font-medium transition-colors shadow-sm">
                        {expandedPeriodId === item.id ? 'Hide Schedules' : 'View Schedules'}
                    </button>
                    
                    {(item.status === 'Scheduling' || item.status === 'Scheduled') && periodSchedules.length > 0 && (
                        <button onClick={() => handlePublishSchedules(item.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm rounded-lg font-medium transition-colors shadow-sm flex items-center gap-1">
                            <Send size={16} /> Publish Schedules
                        </button>
                    )}
                </div>
              </div>
              
              {expandedPeriodId === item.id && (
                  <div className="p-5 bg-white border-x border-b border-gray-200 rounded-b-xl shadow-inner overflow-x-auto -mt-2">
                      <h4 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
                          <span>Generated Schedules ({periodSchedules.length})</span>
                      </h4>
                      {periodSchedules.length === 0 ? (
                          <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                              <p className="text-gray-500 font-medium">No schedules generated yet.</p>
                              <p className="text-sm text-gray-400 mt-1">Trigger auto-scheduling when availability collection is complete.</p>
                          </div>
                      ) : (
                          <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-gray-100 text-gray-700 uppercase text-xs tracking-wider font-semibold">
                                  <tr>
                                      <th className="p-4 rounded-tl-lg">Student</th>
                                      <th className="p-4">Date & Time</th>
                                      <th className="p-4">Venue & Mode</th>
                                      <th className="p-4">Status</th>
                                      <th className="p-4 rounded-tr-lg">Actions</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {periodSchedules.map((sch, i) => (
                                      <tr key={sch.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                          <td className="p-4 font-medium text-gray-900">{sch.students?.student_name || `ID: ${sch.student_id}`}</td>
                                          <td className="p-4">
                                              <span className="font-medium">{new Date(sch.date).toLocaleDateString()}</span> <br/>
                                              <span className="text-gray-500">{new Date(sch.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(sch.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                          </td>
                                          <td className="p-4">
                                              <span className="block font-medium text-gray-800">{sch.venue || 'TBD'}</span>
                                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${sch.mode === 'Online' ? 'bg-blue-100 text-blue-700' : sch.mode === 'Hybrid' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-700'}`}>{sch.mode || 'Physical'}</span>
                                          </td>
                                          <td className="p-4">
                                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sch.status === 'Published' ? 'bg-green-100 text-green-700' : sch.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                  {sch.status}
                                              </span>
                                          </td>
                                          <td className="p-4">
                                              {/* Simple edit stub - in full implementation this would open a modal */}
                                              <button className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors" title="Edit Schedule">
                                                  <Edit size={16} />
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      )}
                  </div>
              )}
              </React.Fragment>
            ))}
            {stages.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <CalendarCheck size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">No active periods</h3>
                    <p className="text-gray-500 max-w-md mx-auto mt-2">Create a new Viva Period to start collecting availability and generating schedules.</p>
                </div>
            )}
          </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color, bg }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between transition-transform hover:-translate-y-1 cursor-default relative overflow-hidden">
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${bg} opacity-50 blur-2xl`}></div>
    <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${bg} ${color}`}>
          {icon}
        </div>
    </div>
    <div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm font-medium text-gray-500">{title}</p>
    </div>
  </div>
);

export default VivaManagementDashboard;
