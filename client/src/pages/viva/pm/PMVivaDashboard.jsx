import React, { useEffect, useState } from "react";
import { CalendarDays, Search, Users, Clock3 } from "lucide-react";

const PMVivaDashboard = () => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const pmHeaders = { "Content-Type": "application/json", "x-user-role": "pm" };

    const fetchAllFinalizedSchedules = async () => {
        setLoading(true);
        try {
            const periodsRes = await fetch("/api/viva/periods", { headers: pmHeaders });
            if (!periodsRes.ok) throw new Error("Failed to fetch periods");
            const periods = await periodsRes.json();
            
            let allFinalized = [];
            for (const p of periods) {
                const schedRes = await fetch(`/api/viva/periods/${p.id}/schedules`, { headers: pmHeaders });
                if (schedRes.ok) {
                    const schedData = await schedRes.json();
                    allFinalized = [...allFinalized, ...schedData.filter(sch => sch.status === "FINALIZED")];
                }
            }
            
            // Sort by latest date first
            allFinalized.sort((a, b) => new Date(b.date) - new Date(a.date));
            setSchedules(allFinalized);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllFinalizedSchedules();
    }, []);

    // Filter by Search Query
    const filteredSchedules = schedules.filter(sch => {
        const query = searchQuery.toLowerCase();
        const studentName = sch.students?.student_name?.toLowerCase() || "";
        const cbNo = sch.students?.cb_no?.toLowerCase() || "";
        const batchCode = sch.students?.batches?.batch_code?.toLowerCase() || "";
        const supervisorName = sch.supervisors?.name?.toLowerCase() || "";
        const assessorName = sch.assessors?.name?.toLowerCase() || "";
        
        return studentName.includes(query) || cbNo.includes(query) || batchCode.includes(query) || supervisorName.includes(query) || assessorName.includes(query);
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return "TBD";
        return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return "TBD";
        return new Date(timeStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Viva Schedules</h1>
                    <p className="text-slate-500 mt-1">View and search finalized university Viva schedules across all periods.</p>
                </div>

                {/* Search Bar */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 mb-8 flex items-center shadow-sm">
                    <Search className="text-slate-400 mr-3" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search by CB Number, Student Name, Batch Code, Supervisor, Assessor..." 
                        className="w-full bg-transparent border-none outline-none text-slate-700 placeholder-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Content */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Finalized Schedules</h2>
                            <p className="text-sm text-slate-500 mt-1">Showing {filteredSchedules.length} schedules</p>
                        </div>
                    </div>
                    
                    {loading ? (
                        <div className="p-10 text-center text-slate-500">Loading schedules...</div>
                    ) : filteredSchedules.length === 0 ? (
                        <div className="p-10 text-center">
                            <CalendarDays className="mx-auto text-slate-300 mb-3" size={40} />
                            <p className="text-slate-600 font-medium">No schedules found matching your search.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Stage</th>
                                        <th className="px-6 py-4">Batch</th>
                                        <th className="px-6 py-4">CB Number</th>
                                        <th className="px-6 py-4">Student</th>
                                        <th className="px-6 py-4">Date & Time</th>
                                        <th className="px-6 py-4">Supervisor / Assessor</th>
                                        <th className="px-6 py-4">Venue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSchedules.map(sch => (
                                        <tr key={sch.id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold">
                                                    {sch.viva_periods?.type || "Viva"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {sch.students?.batches?.batch_code || "N/A"}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {sch.students?.cb_no || "N/A"}
                                            </td>
                                            <td className="px-6 py-4 text-slate-800 font-medium">
                                                {sch.students?.student_name || "Unknown"}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <CalendarDays size={14} className="text-slate-400"/>
                                                    <span>{formatDate(sch.date)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock3 size={14} className="text-slate-400"/>
                                                    <span>{formatTime(sch.start_time)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="mb-1"><span className="text-slate-400 text-xs uppercase font-semibold">Sup:</span> <span className="text-slate-700">{sch.supervisors?.name || 'TBD'}</span></div>
                                                <div><span className="text-slate-400 text-xs uppercase font-semibold">Ass:</span> <span className="text-slate-700">{sch.assessors?.name || 'TBD'}</span></div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-800 font-medium">{sch.venue || "TBD"}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{sch.mode || "Physical"}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PMVivaDashboard;
