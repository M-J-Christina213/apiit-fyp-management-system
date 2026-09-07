import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarDays, Search, Users, Clock, MapPin, Video,
  BarChart3, Download, RefreshCw, CheckCircle2, Shield
} from "lucide-react";

export default function PMVivaDashboard() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");

  const pmHeaders = {
    "Content-Type": "application/json",
    "x-user-role": "pm"
  };

  const fetchFinalizedSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/viva/pm-overview", { headers: pmHeaders });
      if (!res.ok) throw new Error("Failed to fetch PM overview");
      const periods = await res.json();
      
      let allFinalized = [];
      periods.forEach(p => {
        if (p.viva_schedules) {
          allFinalized = [...allFinalized, ...p.viva_schedules];
        }
      });
      setSchedules(allFinalized);
    } catch (err) {
      console.error("PM fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinalizedSchedules();
  }, []);

  // Compute analytics
  const analytics = useMemo(() => {
    const total = schedules.length;
    const batchMap = {};
    const supervisorMap = {};
    const assessorMap = {};
    const venueMap = {};
    let onlineCount = 0;
    let physicalCount = 0;

    schedules.forEach(sch => {
      const b = sch.batch_code || sch.students?.batches?.batch_code || "Unknown";
      batchMap[b] = (batchMap[b] || 0) + 1;

      const sup = sch.supervisors?.name || "Unassigned";
      supervisorMap[sup] = (supervisorMap[sup] || 0) + 1;

      const ass = sch.assessors?.name || "Unassigned";
      assessorMap[ass] = (assessorMap[ass] || 0) + 1;

      const ven = sch.venue || "TBA";
      venueMap[ven] = (venueMap[ven] || 0) + 1;

      const m = sch.attendance_mode || sch.mode || "PHYSICAL";
      if (m === "ONLINE") onlineCount++;
      else physicalCount++;
    });

    return {
      total,
      batchMap,
      supervisorMap,
      assessorMap,
      venueMap,
      onlineCount,
      physicalCount
    };
  }, [schedules]);

  // Filtered list
  const filtered = useMemo(() => {
    return schedules.filter(sch => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        sch.students?.student_name?.toLowerCase().includes(q) ||
        sch.students?.cb_no?.toLowerCase().includes(q) ||
        sch.supervisors?.name?.toLowerCase().includes(q) ||
        sch.assessors?.name?.toLowerCase().includes(q) ||
        sch.venue?.toLowerCase().includes(q);

      const b = sch.batch_code || sch.students?.batches?.batch_code;
      const matchesBatch = batchFilter === "ALL" || b === batchFilter;
      const m = sch.attendance_mode || sch.mode || "PHYSICAL";
      const matchesMode = modeFilter === "ALL" || m === modeFilter;

      return matchesSearch && matchesBatch && matchesMode;
    });
  }, [schedules, searchQuery, batchFilter, modeFilter]);

  const uniqueBatches = Object.keys(analytics.batchMap);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <Shield className="w-4 h-4" />
            <span>Project Management Office (PMO)</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">Finalized Viva Operations Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Read-only Viva monitoring, venue allocations, and supervisor/assessor distribution.
          </p>
        </div>

        <button
          onClick={fetchFinalizedSchedules}
          className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors self-start"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Aggregating finalized Viva records...</span>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Top High-level Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Finalized Students</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{analytics.total}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Physical Vivas</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{analytics.physicalCount}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Online Vivas (Teams)</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{analytics.onlineCount}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Active Batches</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{uniqueBatches.length}</p>
              </div>
            </div>
          </div>

          {/* Allocation Breakdown Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Batch Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>Batch Distribution</span>
                <span className="text-xs font-normal text-slate-400">{uniqueBatches.length} Batches</span>
              </h3>
              <div className="space-y-2 text-xs">
                {Object.entries(analytics.batchMap).map(([batch, count]) => (
                  <div key={batch} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="font-semibold text-slate-800">{batch}</span>
                    <span className="font-bold text-indigo-600 font-mono">{count} students</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supervisor Allocation */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>Supervisor Allocation</span>
                <span className="text-xs font-normal text-slate-400">{Object.keys(analytics.supervisorMap).length} Supervisors</span>
              </h3>
              <div className="space-y-2 text-xs max-h-48 overflow-y-auto pr-1">
                {Object.entries(analytics.supervisorMap).map(([sup, count]) => (
                  <div key={sup} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">{sup}</span>
                    <span className="font-bold text-indigo-600 font-mono">{count} vivas</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessor Allocation */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>Assessor Allocation</span>
                <span className="text-xs font-normal text-slate-400">{Object.keys(analytics.assessorMap).length} Assessors</span>
              </h3>
              <div className="space-y-2 text-xs max-h-48 overflow-y-auto pr-1">
                {Object.entries(analytics.assessorMap).map(([ass, count]) => (
                  <div key={ass} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">{ass}</span>
                    <span className="font-bold text-indigo-600 font-mono">{count} vivas</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Schedule Table (Read-Only) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h3 className="text-base font-bold text-slate-900">Finalized Viva Schedule</h3>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search schedules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {uniqueBatches.length > 0 && (
                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-700"
                  >
                    <option value="ALL">All Batches</option>
                    {uniqueBatches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                )}

                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-700"
                >
                  <option value="ALL">All Modes</option>
                  <option value="PHYSICAL">Physical</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase">
                    <th className="p-3">Batch</th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Supervisor</th>
                    <th className="p-3">Assessor</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Venue</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400">
                        No finalized Viva records match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(sch => (
                      <tr key={sch.id} className="hover:bg-slate-50/60">
                        <td className="p-3 font-bold text-indigo-700">{sch.batch_code || sch.students?.batches?.batch_code || "FYP"}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{sch.students?.student_name}</p>
                          <p className="font-mono text-slate-400 text-[11px]">{sch.students?.cb_no}</p>
                        </td>
                        <td className="p-3">{sch.supervisors?.name || "N/A"}</td>
                        <td className="p-3">{sch.assessors?.name || "N/A"}</td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">
                            {sch.date ? new Date(sch.date).toLocaleDateString() : "TBA"}
                          </p>
                          <p className="text-slate-500 text-[11px]">
                            {sch.start_time ? new Date(sch.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </td>
                        <td className="p-3 font-semibold">
                          {sch.attendance_mode || sch.mode || "PHYSICAL"}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-mono ${sch.venue === "TBA" ? "bg-amber-50 text-amber-700" : "bg-slate-100"}`}>
                            {sch.venue || "TBA"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-full text-emerald-800 bg-emerald-50 border border-emerald-200 font-semibold text-[11px]">
                            Finalized
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
