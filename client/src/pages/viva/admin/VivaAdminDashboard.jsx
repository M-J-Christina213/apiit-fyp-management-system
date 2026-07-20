import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CalendarDays, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  CalendarCheck,
  Play,
  Plus
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

const VivaAdminDashboard = () => {
  const [stats, setStats] = useState({
    activePeriods: 0,
    totalSchedules: 0,
    totalAvailabilities: 0
  });

  const [stages, setStages] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Proposal Viva',
    availability_start: '',
    availability_end: '',
    viva_start: '',
    viva_end: ''
  });

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch('/api/viva/dashboard');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      const stagesRes = await fetch('/api/viva/stages');
      if (stagesRes.ok) {
        const stagesData = await stagesRes.json();
        setStages(stagesData);
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
      const res = await fetch('/api/viva/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleTriggerScheduling = async (periodId) => {
    try {
      const res = await fetch('/api/viva/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId })
      });
      if (res.ok) {
        alert("Scheduling triggered successfully!");
        fetchDashboardData();
      } else {
        alert("Scheduling failed");
      }
    } catch (error) {
      console.error(error);
      alert("Error triggering schedule");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Viva Scheduling Management</h1>
          <p className="text-gray-500 mt-1">Manage and automate university viva schedules</p>
        </div>
        <div className="flex gap-4">
            <button 
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2">
                <Plus size={18} />
                Create Viva Period
            </button>
        </div>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreatePeriod} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-2 gap-4">
            <div className="col-span-2">
                <h3 className="text-lg font-semibold mb-4">Create New Viva Period</h3>
            </div>
            <div>
                <label className="block text-sm mb-1 text-gray-600">Stage</label>
                <select className="w-full border p-2 rounded" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option>Proposal Viva</option>
                    <option>Midpoint Viva</option>
                    <option>Final Viva</option>
                </select>
            </div>
            <div></div>
            <div>
                <label className="block text-sm mb-1 text-gray-600">Availability Start</label>
                <input type="date" required className="w-full border p-2 rounded" value={formData.availability_start} onChange={e => setFormData({...formData, availability_start: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm mb-1 text-gray-600">Availability End</label>
                <input type="date" required className="w-full border p-2 rounded" value={formData.availability_end} onChange={e => setFormData({...formData, availability_end: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm mb-1 text-gray-600">Viva Start</label>
                <input type="date" required className="w-full border p-2 rounded" value={formData.viva_start} onChange={e => setFormData({...formData, viva_start: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm mb-1 text-gray-600">Viva End</label>
                <input type="date" required className="w-full border p-2 rounded" value={formData.viva_end} onChange={e => setFormData({...formData, viva_end: e.target.value})} />
            </div>
            <div className="col-span-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Create Period</button>
            </div>
        </form>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<CalendarCheck />} title="Active Periods" value={stats.activePeriods} color="text-green-600" bg="bg-green-100" />
        <StatCard icon={<Users />} title="Total Availabilities Submitted" value={stats.totalAvailabilities} color="text-blue-600" bg="bg-blue-100" />
        <StatCard icon={<Clock />} title="Total Generated Schedules" value={stats.totalSchedules} color="text-amber-600" bg="bg-amber-100" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Active Viva Periods</h2>
          <div className="space-y-6">
            {stages.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{item.type}</h3>
                  <p className="text-sm text-gray-500">
                      Viva: {new Date(item.viva_start).toLocaleDateString()} to {new Date(item.viva_end).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-4 items-center">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                        {item.status}
                    </span>
                    <button onClick={() => handleTriggerScheduling(item.id)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm rounded-lg flex items-center gap-2">
                        <Play size={14} /> Schedule
                    </button>
                </div>
              </div>
            ))}
            {stages.length === 0 && <p className="text-gray-500">No active periods.</p>}
          </div>
      </div>
    </div>
  );
};

// Sub-components
const StatCard = ({ icon, title, value, color, bg, alert }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 cursor-default ${alert ? 'ring-1 ring-red-400' : ''}`}>
    <div className={`p-4 rounded-xl ${bg} ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
    </div>
  </div>
);

export default VivaAdminDashboard;
