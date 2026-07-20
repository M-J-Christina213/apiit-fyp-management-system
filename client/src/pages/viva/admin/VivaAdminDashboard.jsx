import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CalendarDays, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  CalendarCheck,
  ChevronRight,
  Play
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
    totalStudents: 120,
    scheduledVivas: 110,
    pendingAvailability: 10,
    unscheduledStudents: 10,
    conflicts: 2,
    completedVivas: 80
  });

  const timelineData = [
    { stage: 'Proposal Viva', status: 'Completed', color: 'bg-green-500' },
    { stage: 'Midpoint Viva', status: 'Scheduling', color: 'bg-blue-500' },
    { stage: 'Final Viva', status: 'Draft', color: 'bg-gray-300' }
  ];

  const progressData = [
    { name: 'Scheduled', value: 110, color: '#3b82f6' },
    { name: 'Pending', value: 10, color: '#f59e0b' }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Viva Scheduling Management</h1>
          <p className="text-gray-500 mt-1">Manage and automate university viva schedules</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2">
          <Play size={18} />
          Trigger Auto Scheduling
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={<Users />} title="Total Students" value={stats.totalStudents} color="text-blue-600" bg="bg-blue-100" />
        <StatCard icon={<CalendarCheck />} title="Scheduled Vivas" value={stats.scheduledVivas} color="text-green-600" bg="bg-green-100" />
        <StatCard icon={<Clock />} title="Pending Availability" value={stats.pendingAvailability} color="text-amber-600" bg="bg-amber-100" />
        <StatCard icon={<CalendarDays />} title="Unscheduled Students" value={stats.unscheduledStudents} color="text-purple-600" bg="bg-purple-100" />
        <StatCard icon={<AlertTriangle />} title="Detected Conflicts" value={stats.conflicts} color="text-red-600" bg="bg-red-100" alert />
        <StatCard icon={<CheckCircle2 />} title="Completed Vivas" value={stats.completedVivas} color="text-teal-600" bg="bg-teal-100" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Timeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Viva Timeline</h2>
          <div className="space-y-6">
            {timelineData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-3 h-3 rounded-full ${item.color} mr-4`}></div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{item.stage}</h3>
                </div>
                <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                  {item.status}
                </div>
              </div>
            ))}
          </div>
          
          {/* Detailed Stages Stepper (Microsoft 365 Style) */}
          <div className="mt-10 border-t pt-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">Current Stage: Midpoint Viva</h3>
            <div className="flex justify-between items-center relative">
              <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
              
              <Step label="Draft" completed />
              <Step label="Availability" completed />
              <Step label="Auto Scheduling" active />
              <Step label="Confirmed" />
              <Step label="Completed" />
            </div>
          </div>
        </div>

        {/* Scheduling Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Scheduling Progress</h2>
          <p className="text-gray-500 text-sm mb-6">Current period: Midpoint Viva</p>
          
          <div className="flex-1 flex items-center justify-center min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={progressData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {progressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Students</span>
              <span className="font-semibold text-gray-900">120</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Availability Submitted</span>
              <span className="font-semibold text-gray-900">115</span>
            </div>
          </div>
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

const Step = ({ label, completed, active }) => (
  <div className="flex flex-col items-center bg-white px-2">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300
      ${completed ? 'bg-blue-600 border-blue-600 text-white' : 
        active ? 'bg-white border-blue-600 text-blue-600 ring-4 ring-blue-100' : 
        'bg-white border-gray-300 text-gray-400'}
    `}>
      {completed ? <CheckCircle2 size={16} /> : <span className="text-xs"></span>}
    </div>
    <span className={`mt-3 text-xs font-medium text-center max-w-[80px]
      ${completed || active ? 'text-gray-900' : 'text-gray-400'}
    `}>
      {label}
    </span>
  </div>
);

export default VivaAdminDashboard;
