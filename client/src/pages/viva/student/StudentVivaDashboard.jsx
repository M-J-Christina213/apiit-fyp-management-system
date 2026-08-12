import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  BookOpen,
  MapPin,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const StudentVivaDashboard = () => {
  // Test User
  const studentId = 1; 

  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  const [activePeriod, setActivePeriod] = useState(null);
  const [submittedSlots, setSubmittedSlots] = useState([]);
  const [finalSchedule, setFinalSchedule] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`/api/viva/my-dashboard/student/${studentId}`);
      if (res.ok) {
        const data = await res.json();
        const availablePeriod = data.periods.find(p => p.status === 'Availability Collection' || p.status === 'Scheduling');
        setActivePeriod(availablePeriod || data.periods[0]);
        
        setSubmittedSlots(data.availabilities);
        
        const schedule = data.schedules.find(s => s.status === 'FINALIZED' || s.status === 'PUBLISHED' || s.status === 'CONFIRMED' || s.status === 'AUTO_SCHEDULED');
        setFinalSchedule(schedule);
      }
    } catch (err) {
      console.error(err);
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
          student_id: studentId,
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen font-sans">
      
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Viva Schedule</h1>
        <p className="text-gray-500 mt-1">Submit your availability and view your confirmed schedule</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Availability Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
          <h2 className="text-xl font-bold text-gray-900 mb-6">1. Submit Availability</h2>
          
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 flex gap-3">
            <AlertCircle className="text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              Please provide all available dates and times. The system will automatically schedule your viva based on supervisor and assessor availability.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Date</label>
              <input 
                type="date" 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input 
                  type="time" 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input 
                  type="time" 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            
            <button onClick={handleSubmit} className="w-full bg-gray-900 hover:bg-gray-800 text-white p-3 rounded-lg font-medium transition-colors">
              Submit Time Slot
            </button>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Submitted Slots ({activePeriod?.type || 'No Active Period'})</h3>
            <ul className="space-y-2">
              {submittedSlots.map(slot => (
                <li key={slot.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-700 text-sm">
                    <CalendarIcon size={14} /> {new Date(slot.date).toLocaleDateString()}
                    <Clock size={14} className="ml-2" /> {new Date(slot.start_time).toLocaleTimeString()} - {new Date(slot.end_time).toLocaleTimeString()}
                  </div>
                  <span className="text-green-600 text-xs font-semibold flex items-center gap-1"><CheckCircle size={12}/> Saved</span>
                </li>
              ))}
              {submittedSlots.length === 0 && <p className="text-sm text-gray-500">No availability submitted yet.</p>}
            </ul>
          </div>
        </div>

        {/* Final Schedule Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            2. Confirmed Schedule
            {finalSchedule && <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-bold tracking-wide">{finalSchedule.status}</span>}
          </h2>

          {finalSchedule ? (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">{finalSchedule.viva_periods?.type}</h3>
              <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                <BookOpen size={14} /> {finalSchedule.students?.student_name}'s Viva
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex gap-6">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Date</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-2"><CalendarIcon size={16} className="text-blue-500"/> {new Date(finalSchedule.date).toLocaleDateString()}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Time</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-2"><Clock size={16} className="text-blue-500"/> {new Date(finalSchedule.start_time).toLocaleTimeString()} - {new Date(finalSchedule.end_time).toLocaleTimeString()}</p>
                </div>
              </div>
              
              <div className="flex gap-6">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Supervisor</p>
                  <p className="font-semibold text-gray-900">{finalSchedule.supervisors?.name || 'N/A'}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Assessor</p>
                  <p className="font-semibold text-gray-900">{finalSchedule.assessors?.name || 'N/A'}</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <MapPin className="text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">{finalSchedule.mode || 'TBD'} Attendance</p>
                    <p className="text-blue-700 text-sm mt-0.5">Venue: {finalSchedule.venue || 'TBD'}</p>
                  </div>
                </div>
                {finalSchedule.teams_link && (
                    <a href={finalSchedule.teams_link} target="_blank" rel="noopener noreferrer" className="ml-8 text-blue-600 font-medium hover:underline">
                        Join Microsoft Teams Meeting
                    </a>
                )}
                {finalSchedule.outlook_event_id && (
                    <p className="ml-8 text-xs text-gray-500 mt-2">Mock Outlook ID: {finalSchedule.outlook_event_id.substring(0,20)}...</p>
                )}
              </div>
              
            </div>
          </div>
          ) : (
            <p className="text-gray-500">Your schedule has not been finalized yet.</p>
          )}
          
        </div>

      </div>
    </div>
  );
};

export default StudentVivaDashboard;
