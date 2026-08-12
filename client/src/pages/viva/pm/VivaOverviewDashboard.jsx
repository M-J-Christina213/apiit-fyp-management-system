import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  CalendarDays, 
  BookOpen, 
  CheckCircle2,
  Users
} from 'lucide-react';

const VivaOverviewDashboard = () => {
  const [stats, setStats] = useState({
    activePeriods: 0,
    totalSchedules: 0,
    totalAvailabilities: 0
  });

  const [stages, setStages] = useState([]);
  const [expandedPeriodId, setExpandedPeriodId] = useState(null);
  const [periodSchedules, setPeriodSchedules] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Headers for pm requests (read-only)
  const pmHeaders = { 
    'Content-Type': 'application/json',
    'x-user-role': 'pm'
  };

  const fetchDashboardData = async () => {
    try {
      const statsRes = await fetch('/api/viva/dashboard', { headers: pmHeaders });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      const stagesRes = await fetch('/api/viva/periods', { headers: pmHeaders });
      if (stagesRes.ok) {
        const stagesData = await stagesRes.json();
        setStages(stagesData);
      }
    } catch (error) {
      console.error("Failed to fetch PM dashboard data", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleViewSchedules = async (periodId) => {
      if (expandedPeriodId === periodId) {
          setExpandedPeriodId(null);
          return;
      }
      try {
          const res = await fetch(`/api/viva/periods/${periodId}/schedules`, { headers: pmHeaders });
          if (res.ok) {
              const data = await res.json();
              setPeriodSchedules(data);
              setExpandedPeriodId(periodId);
          }
      } catch (error) {
          console.error("Failed to load schedules", error);
      }
  };

  const handleExport = (periodId) => {
      window.open(`/api/viva/periods/${periodId}/export`, '_blank');
  };

  const filteredSchedules = periodSchedules.filter(sch => 
    sch.students?.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    sch.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sch.venue?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <BookOpen className="text-blue-600" size={32} />
            Viva Overview
          </h1>
          <p className="text-gray-500 mt-2">Read-only project management dashboard for viva scheduling progress.</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<CalendarDays />} title="Active Periods" value={stats.activePeriods} color="text-blue-600" bg="bg-blue-100" />
        <StatCard icon={<CheckCircle2 />} title="Total Generated Schedules" value={stats.totalSchedules} color="text-green-600" bg="bg-green-100" />
        <StatCard icon={<Users />} title="Total Availabilities Submitted" value={stats.totalAvailabilities} color="text-purple-600" bg="bg-purple-100" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Viva Periods</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {stages.map((item, index) => (
              <React.Fragment key={item.id}>
              <div className="flex flex-col md:flex-row items-center justify-between p-5 border border-gray-200 rounded-xl hover:shadow-md transition-shadow bg-white">
                <div className="mb-4 md:mb-0">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    {item.type}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        Status: {item.status}
                    </span>
                  </h3>
                  <div className="text-sm text-gray-600 mt-2">
                      <p className="mb-1"><span className="font-medium">Availability Window:</span> {new Date(item.availability_start).toLocaleDateString()} - {new Date(item.availability_end).toLocaleDateString()}</p>
                      <p><span className="font-medium">Viva Window:</span> {new Date(item.viva_start).toLocaleDateString()} - {new Date(item.viva_end).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => handleViewSchedules(item.id)} className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-5 py-2.5 text-sm rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2">
                        {expandedPeriodId === item.id ? 'Hide Schedules' : 'View Schedules'}
                    </button>
                    {expandedPeriodId === item.id && (
                        <button onClick={() => handleExport(item.id)} className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-4 py-2.5 text-sm rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2">
                            <Download size={16} /> Export
                        </button>
                    )}
                </div>
              </div>
              
              {expandedPeriodId === item.id && (
                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-inner mt-4">
                      <div className="flex justify-between items-center mb-6">
                          <h4 className="font-bold text-gray-800 text-lg">Schedule Details</h4>
                          
                          <div className="flex items-center gap-3">
                              <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                  <input 
                                      type="text" 
                                      placeholder="Search student or status..."
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-64"
                                  />
                              </div>
                              <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                                  <Filter size={16} /> Filter
                              </button>
                          </div>
                      </div>
                      
                      {filteredSchedules.length === 0 ? (
                          <div className="py-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
                              <p className="text-gray-500 font-medium">No schedules found matching criteria.</p>
                          </div>
                      ) : (
                          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                              <table className="w-full text-left text-sm whitespace-nowrap">
                                  <thead className="bg-gray-100 text-gray-700 uppercase text-xs tracking-wider font-semibold border-b border-gray-200">
                                      <tr>
                                          <th className="px-6 py-4">Student</th>
                                          <th className="px-6 py-4">Date & Time</th>
                                          <th className="px-6 py-4">Venue & Mode</th>
                                          <th className="px-6 py-4">Status</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {filteredSchedules.map((sch) => (
                                          <tr key={sch.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                              <td className="px-6 py-4">
                                                  <div className="font-medium text-gray-900">{sch.students?.student_name || `ID: ${sch.student_id}`}</div>
                                                  <div className="text-gray-500 text-xs mt-1">ID: {sch.students?.cb_no || 'N/A'}</div>
                                              </td>
                                              <td className="px-6 py-4">
                                                  <span className="font-medium text-gray-800">{new Date(sch.date).toLocaleDateString()}</span> <br/>
                                                  <span className="text-gray-500">{new Date(sch.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(sch.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                              </td>
                                              <td className="px-6 py-4">
                                                  <span className="block font-medium text-gray-800">{sch.venue || 'TBD'}</span>
                                                  <span className="text-gray-500 text-xs mt-1 block">Mode: {sch.mode || 'Physical'}</span>
                                              </td>
                                              <td className="px-6 py-4">
                                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${sch.status === 'Published' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                                                      {sch.status}
                                                  </span>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      )}
                  </div>
              )}
              </React.Fragment>
            ))}
            {stages.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No active periods found.</p>
                </div>
            )}
          </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color, bg }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 transition-transform hover:-translate-y-1">
    <div className={`p-4 rounded-xl ${bg} ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
    </div>
  </div>
);

export default VivaOverviewDashboard;
