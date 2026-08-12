import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle,
  Video,
  MapPin,
  Plus
} from 'lucide-react';

const AssessorVivaDashboard = () => {
  // Test User
  const assessorId = 1;

  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  
  const [activePeriod, setActivePeriod] = useState(null);
  const [upcomingVivas, setUpcomingVivas] = useState([]);
  const [submittedSlots, setSubmittedSlots] = useState([]);

  const fetchDashboardData = async () => {
      try {
          const res = await fetch(`/api/viva/my-dashboard/assessor/${assessorId}`);
          if (res.ok) {
              const data = await res.json();
              const active = data.periods.find(p => p.status === 'Availability Collection' || p.status === 'Scheduling');
              if (active) {
                  setActivePeriod(active);
                  const startDateStr = new Date(active.availability_start).toISOString().split('T')[0];
                  setSelectedDate(startDateStr);
              }
              setSubmittedSlots(data.availabilities);
              
              const finalized = data.schedules.filter(s => s.status === 'FINALIZED' || s.status === 'PUBLISHED' || s.status === 'CONFIRMED' || s.status === 'AUTO_SCHEDULED');
              setUpcomingVivas(finalized);
          }
      } catch (error) {
          console.error("Failed to fetch dashboard data", error);
      }
  };

  useEffect(() => {
      fetchDashboardData();
  }, []);

  const handleSubmit = async () => {
    if (!activePeriod || !selectedDate || !startTime || !endTime) return alert("Please fill all fields");
    try {
      const res = await fetch(`/api/viva/periods/${activePeriod.id}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessor_id: assessorId,
          date: selectedDate,
          start_time: startTime,
          end_time: endTime
        })
      });
      if (res.ok) {
        alert("Availability submitted successfully");
        fetchDashboardData();
      } else {
        const err = await res.json();
        alert("Failed to submit: " + (err.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const minDate = activePeriod ? new Date(activePeriod.availability_start).toISOString().split('T')[0] : '';
  const maxDate = activePeriod ? new Date(activePeriod.availability_end).toISOString().split('T')[0] : '';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen font-sans">
      
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Assessor Schedule & Availability</h1>
        <p className="text-gray-500 mt-1">Submit available time slots for your assessing duties</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
          <div className="flex items-center gap-2 mb-6">
            <CalendarIcon className="text-purple-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Submit Availability</h2>
          </div>
          
          {activePeriod ? (
              <div className="mb-4 p-3 bg-purple-50 border border-purple-100 rounded-lg">
                  <p className="text-sm text-purple-800 font-medium">{activePeriod.type} Availability</p>
                  <p className="text-xs text-purple-600 mt-1">Please select dates between {new Date(activePeriod.availability_start).toLocaleDateString()} and {new Date(activePeriod.availability_end).toLocaleDateString()}</p>
              </div>
          ) : (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">No active Viva period for availability collection at this time.</p>
              </div>
          )}
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Date</label>
              <input 
                type="date" 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400"
                value={selectedDate}
                min={minDate}
                max={maxDate}
                disabled={!activePeriod}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input 
                  type="time" 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400"
                  value={startTime}
                  disabled={!activePeriod}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input 
                  type="time" 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400"
                  value={endTime}
                  disabled={!activePeriod}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <button 
                onClick={handleSubmit}
                disabled={!activePeriod}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2">
              <Plus size={18} />
              Add Assessor Time Slot
            </button>
            
            <div className="pt-4 mt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Submitted Slots ({activePeriod?.type || 'No active period'})</h4>
              <ul className="space-y-2">
                {submittedSlots.map(slot => (
                  <li key={slot.id} className="text-sm bg-gray-50 p-2 rounded border border-gray-100 flex justify-between">
                    <span>{new Date(slot.date).toLocaleDateString()} {new Date(slot.start_time).toLocaleTimeString()} - {new Date(slot.end_time).toLocaleTimeString()}</span>
                  </li>
                ))}
                {submittedSlots.length === 0 && <span className="text-xs text-gray-500">None submitted</span>}
              </ul>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-4">
                <CheckCircle size={14} className="text-green-500"/>
                Automatically synced with your Outlook Calendar
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Assigned Vivas</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Student</th>
                    <th className="pb-3 font-semibold">Date & Time</th>
                    <th className="pb-3 font-semibold">Mode / Venue</th>
                    <th className="pb-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {upcomingVivas.map((viva) => (
                    <tr key={viva.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4">
                        <p className="font-semibold text-gray-900">{viva.students?.student_name}</p>
                        <p className="text-sm text-gray-500">{viva.students?.cb_no} • {viva.viva_periods?.type}</p>
                      </td>
                      <td className="py-4">
                        <p className="text-gray-900 flex items-center gap-1.5"><CalendarIcon size={14}/> {new Date(viva.date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5"><Clock size={14}/> {new Date(viva.start_time).toLocaleTimeString()} - {new Date(viva.end_time).toLocaleTimeString()}</p>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          {viva.mode === 'Online' || viva.mode === 'Hybrid' ? <Video size={16} className="text-blue-500"/> : <MapPin size={16} className="text-green-500"/>}
                          <span className={`text-sm font-medium ${viva.mode === 'Online' || viva.mode === 'Hybrid' ? 'text-blue-600' : 'text-green-600'}`}>
                            {viva.mode || 'TBD'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{viva.venue || 'TBD'}</p>
                      </td>
                      <td className="py-4">
                        {viva.teams_link && (
                           <a href={viva.teams_link} target="_blank" rel="noopener noreferrer" className="text-sm bg-purple-50 text-purple-600 hover:bg-purple-100 px-3 py-1.5 rounded-md font-medium transition-colors">
                             Join Teams
                           </a>
                        )}
                        {viva.outlook_event_id && (
                            <p className="text-xs text-gray-500 mt-2">Outlook integration: Mock mode ({viva.outlook_event_id.substring(0,8)})</p>
                        )}
                      </td>
                    </tr>
                  ))}
                  {upcomingVivas.length === 0 && (
                      <tr>
                          <td colSpan="4" className="text-center py-6 text-gray-500">No scheduled vivas found.</td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AssessorVivaDashboard;
