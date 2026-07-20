import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  BookOpen,
  MapPin,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const StudentVivaDashboard = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  const [submittedSlots, setSubmittedSlots] = useState([
    { id: 1, date: '2026-07-25', start: '10:00 AM', end: '12:00 PM' }
  ]);

  const finalSchedule = {
    date: '2026-07-25',
    time: '10:30 AM',
    supervisor: 'Dr. Silva',
    assessor: 'Mr. Fernando',
    venue: 'APIIT Lab 3',
    mode: 'Physical',
    type: 'Proposal Viva'
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
            
            <button className="w-full bg-gray-900 hover:bg-gray-800 text-white p-3 rounded-lg font-medium transition-colors">
              Submit Time Slot
            </button>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Submitted Slots</h3>
            <ul className="space-y-2">
              {submittedSlots.map(slot => (
                <li key={slot.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 text-gray-700 text-sm">
                    <CalendarIcon size={14} /> {slot.date}
                    <Clock size={14} className="ml-2" /> {slot.start} - {slot.end}
                  </div>
                  <span className="text-green-600 text-xs font-semibold flex items-center gap-1"><CheckCircle size={12}/> Saved</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Final Schedule Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            2. Confirmed Schedule
            <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-bold tracking-wide">CONFIRMED</span>
          </h2>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900">{finalSchedule.type}</h3>
              <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                <BookOpen size={14} /> Machine Learning Flood Prediction System
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex gap-6">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Date</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-2"><CalendarIcon size={16} className="text-blue-500"/> {finalSchedule.date}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Time</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-2"><Clock size={16} className="text-blue-500"/> {finalSchedule.time}</p>
                </div>
              </div>
              
              <div className="flex gap-6">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Supervisor</p>
                  <p className="font-semibold text-gray-900">{finalSchedule.supervisor}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Assessor</p>
                  <p className="font-semibold text-gray-900">{finalSchedule.assessor}</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                <MapPin className="text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">{finalSchedule.mode} Attendance</p>
                  <p className="text-blue-700 text-sm mt-0.5">Venue: {finalSchedule.venue}</p>
                </div>
              </div>
              
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
};

export default StudentVivaDashboard;
