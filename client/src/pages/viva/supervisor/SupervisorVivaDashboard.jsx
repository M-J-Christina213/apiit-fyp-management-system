import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  CheckCircle,
  Video,
  MapPin,
  Save,
  Plus
} from 'lucide-react';

const SupervisorVivaDashboard = () => {
  const [selectedDate, setSelectedDate] = useState('2026-07-25');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');

  const upcomingVivas = [
    { id: 1, student: 'John Perera', cb: 'CB00123', type: 'Proposal Viva', date: '2026-07-25', time: '10:00 AM', mode: 'Online', venue: 'Microsoft Teams' },
    { id: 2, student: 'Kamal Silva', cb: 'CB00124', type: 'Proposal Viva', date: '2026-07-25', time: '11:00 AM', mode: 'Physical', venue: 'APIIT Lab 3' }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen font-sans">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Viva Schedule & Availability</h1>
        <p className="text-gray-500 mt-1">Manage your availability for upcoming vivas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Availability Collection Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
          <div className="flex items-center gap-2 mb-6">
            <CalendarIcon className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Submit Availability</h2>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Date</label>
              <input 
                type="date" 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input 
                  type="time" 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input 
                  type="time" 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2">
              <Plus size={18} />
              Add Time Slot
            </button>
            
            <div className="pt-4 mt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <CheckCircle size={14} className="text-green-500"/>
                Automatically synced with your Outlook Calendar
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Vivas Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Upcoming Scheduled Vivas</h2>
            
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
                        <p className="font-semibold text-gray-900">{viva.student}</p>
                        <p className="text-sm text-gray-500">{viva.cb} • {viva.type}</p>
                      </td>
                      <td className="py-4">
                        <p className="text-gray-900 flex items-center gap-1.5"><CalendarIcon size={14}/> {viva.date}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5"><Clock size={14}/> {viva.time}</p>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          {viva.mode === 'Online' ? <Video size={16} className="text-blue-500"/> : <MapPin size={16} className="text-green-500"/>}
                          <span className={`text-sm font-medium ${viva.mode === 'Online' ? 'text-blue-600' : 'text-green-600'}`}>
                            {viva.mode}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{viva.venue}</p>
                      </td>
                      <td className="py-4">
                        {viva.mode === 'Online' && (
                           <button className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-md font-medium transition-colors">
                             Join Teams
                           </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SupervisorVivaDashboard;
