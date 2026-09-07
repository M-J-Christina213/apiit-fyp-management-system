import React, { useEffect, useState } from "react";
import {
  CalendarDays, Clock, MapPin, Video, CheckCircle2, AlertCircle,
  FileText, ExternalLink, RefreshCw, Sparkles, User, Award, Shield
} from "lucide-react";
import "../viva-styles.css";

export default function StudentVivaDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem("fyp_current_user") || "{}");
  const email = currentUser?.email || "cb001@students.apiit.lk";

  const headers = {
    "Content-Type": "application/json",
    "x-user-role": "student",
    "x-user-email": email
  };

  const fetchStudentViva = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/viva/my-student-viva", { headers });
      if (!res.ok) throw new Error("Failed to load your Viva schedule.");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentViva();
  }, [email]);

  const schedule = data?.schedule;
  const student = data?.student;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
          <Award className="w-4 h-4" />
          <span>Student Viva Portal</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">My FYP Viva</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Official Final Year Project Viva defense schedule and details.
        </p>
      </div>

      <div className="max-w-4xl mx-auto mt-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
            <span>Loading your Viva details...</span>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm">
            <strong>Error:</strong> {error}
          </div>
        ) : !schedule ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <Clock className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">Viva Schedule Pending Finalization</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
              {student?.name ? `${student.name} (${student.cb_no}): ` : ""}Your Viva defense schedule is currently being finalized by the FYP Administration and supervisors/assessors. You will be notified as soon as your official slot is published.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-4 py-2 rounded-xl">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>Status: Scheduling / Awaiting Finalization</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Top Color Banner */}
            <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 p-8 text-white relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white font-bold">
                  {schedule.viva_periods?.name || schedule.viva_periods?.type || "Final FYP Defense"}
                </span>
                <span className="text-xs font-bold bg-emerald-400 text-emerald-950 px-3 py-1 rounded-full">
                  ✓ FINALIZED & PUBLISHED
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold mt-4">
                {student?.name || "Student Defense"}
              </h2>
              <p className="text-sm text-indigo-100 font-mono mt-1">
                Student ID: {student?.cb_no} • Batch: {student?.batch || schedule.batch_code || "General"}
              </p>
            </div>

            {/* Main Schedule Content */}
            <div className="p-8 space-y-8">
              {/* Date, Time & Venue Highlight Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Viva Date</p>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">
                      {schedule.date ? new Date(schedule.date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "long", day: "numeric" }) : "TBA"}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled Time</p>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">
                      {schedule.start_time ? new Date(schedule.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "TBA"}
                      {" - "}
                      {schedule.end_time ? new Date(schedule.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "TBA"}
                    </p>
                    <p className="text-[11px] text-slate-500">Duration: {schedule.duration_mins || 30} minutes</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    {schedule.attendance_mode === "ONLINE" ? <Video className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance & Venue</p>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">
                      {schedule.attendance_mode || "Physical"}
                    </p>
                    <p className="text-[11px] text-slate-600 font-semibold">
                      Location: {schedule.venue || "TBA"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Online Teams Joining Option */}
              {schedule.attendance_mode === "ONLINE" && schedule.teams_join_url && (
                <div className="p-6 bg-purple-50 border border-purple-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-purple-900 text-base flex items-center gap-2">
                      <Video className="w-5 h-5 text-purple-600" />
                      <span>Microsoft Teams Online Defense Session</span>
                    </h4>
                    <p className="text-xs text-purple-700 mt-1">
                      Please join 5 minutes prior to your allocated time. Ensure your webcam, microphone, and presentation slides are ready.
                    </p>
                  </div>

                  <a
                    href={schedule.teams_join_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg transition-all"
                  >
                    <span>Join Microsoft Teams</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Assigned Viva Panel */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Assigned Viva Panel</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      Sup
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">SUPERVISOR</p>
                      <p className="font-bold text-slate-900 text-sm">{schedule.supervisors?.name || "Assigned Supervisor"}</p>
                      <p className="text-xs text-slate-500">{schedule.supervisors?.email || ""}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      Ass
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">ASSESSOR</p>
                      <p className="font-bold text-slate-900 text-sm">{schedule.assessors?.name || "Assigned Assessor"}</p>
                      <p className="text-xs text-slate-500">{schedule.assessors?.email || ""}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Defense Guidelines */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1.5">
                <p className="font-bold text-slate-800">Important Viva Instructions:</p>
                <p>• Bring your student identification card and a copy of your approved FYP project report.</p>
                <p>• Presentations must strictly adhere to the allocated {schedule.duration_mins || 30}-minute duration window.</p>
                <p>• For queries regarding room changes or technical support, please contact the FYP Project Management Office.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
