import React, { useState } from 'react';
import { 
  Users, 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  CalendarCheck,
  Eye
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

const PMVivaDashboard = () => {
  const [stats] = useState({
    totalStudents: 120,
    scheduledVivas: 110,
    pendingAvailability: 10,
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
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Viva Progress Overview</h1>
          <p className="text-gray-500 mt-1">Monitor university viva schedules and progress</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
          <Eye size={16} />
          View-Only Access
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Users />} title="Total Students" value={stats.totalStudents} color="text-blue-600" bg="bg-blue-100" />
        <StatCard icon={<CalendarCheck />} title="Scheduled Vivas" value={stats.scheduledVivas} color="text-green-600" bg="bg-green-100" />
        <StatCard icon={<Clock />} title="Pending Availability" value={stats.pendingAvailability} color="text-amber-600" bg="bg-amber-100" />
        <StatCard icon={<CheckCircle2 />} title="Completed Vivas" value={stats.completedVivas} color="text-teal-600" bg="bg-teal-100" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Timeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Viva Lifecycle</h2>
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
        </div>

        {/* Scheduling Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Current Phase Progress</h2>
          <p className="text-gray-500 text-sm mb-6">Midpoint Viva</p>
          
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
        </div>
        
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color, bg }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1">
    <div className={`p-4 rounded-xl ${bg} ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
    </div>
  </div>
);

export default PMVivaDashboard;
