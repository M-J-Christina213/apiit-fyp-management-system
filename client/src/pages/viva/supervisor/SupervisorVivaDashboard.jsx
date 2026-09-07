import React, { useEffect, useState } from "react";
import {
  CalendarDays, Clock, MapPin, Video, CheckCircle2, AlertCircle,
  ExternalLink, FileText, Edit3, MessageSquare, Check, X, Layers,
  Lock, RefreshCw, Send, AlertTriangle
} from "lucide-react";
import "../viva-styles.css";

export default function SupervisorVivaDashboard() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Review Availability Modal State
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [reviewAction, setReviewAction] = useState("CONFIRM"); // "CONFIRM" or "REQUEST_CHANGE"
  const [confirmMode, setConfirmMode] = useState("PHYSICAL");
  const [confirmComment, setConfirmComment] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [altDate, setAltDate] = useState("");
  const [altTime, setAltTime] = useState("");
  const [altMode, setAltMode] = useState("PHYSICAL");

  // Private Notes Drawer State
  const [notesSchedule, setNotesSchedule] = useState(null);
  const [notesText, setNotesText] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("fyp_current_user") || "{}");
  const email = currentUser?.email || "kavin@apiit.lk";

  const headers = {
    "Content-Type": "application/json",
    "x-user-role": "supervisor",
    "x-user-email": email
  };

  const fetchAssignedSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/viva/my-assigned-schedules", { headers });
      if (!res.ok) throw new Error("Failed to fetch assigned schedules");
      const data = await res.json();
      // Filter strictly for supervisor role
      const mySupervisedSchedules = (data.schedules || []).filter(s => s.isSupervisor);
      setSchedules(mySupervisedSchedules);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedSchedules();
  }, [email]);

  // Handle Review Submission
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedSchedule) return;
    setActionLoading(true);

    try {
      const payload = {
        action: reviewAction,
        attendance_mode: reviewAction === "CONFIRM" ? confirmMode : altMode,
        comment: confirmComment,
        reason: changeReason,
        proposed_date: altDate,
        proposed_time: altTime
      };

      const res = await fetch(`/api/viva/schedules/${selectedSchedule.id}/review-availability`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit availability review.");

      setToast({ type: "success", text: data.message });
      setSelectedSchedule(null);
      fetchAssignedSchedules();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Notes Drawer & Load Notes
  const handleOpenNotes = async (sch) => {
    setNotesSchedule(sch);
    setNotesText("");
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/viva/schedules/${sch.id}/notes?role=SUPERVISOR`, { headers });
      if (res.ok) {
        const notes = await res.json();
        const myNote = notes.find(n => n.role === "SUPERVISOR");
        if (myNote) setNotesText(myNote.note);
      }
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setNotesLoading(false);
    }
  };

  // Save Notes
  const handleSaveNotes = async () => {
    if (!notesSchedule) return;
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/viva/schedules/${notesSchedule.id}/notes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ note: notesText, role: "SUPERVISOR" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save notes");
      setToast({ type: "success", text: "Supervisor Viva notes saved." });
      setNotesSchedule(null);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setNotesLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-8">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium bg-emerald-50 text-emerald-800 border-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-auto text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
          <CalendarDays className="w-4 h-4" />
          <span>Faculty Portal • Supervisor Viva Dashboard</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">My Supervised Viva Sessions</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Review initial Viva schedules assigned to your students, confirm your availability, and access preparation notes and student reports.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading your assigned Viva schedules...</span>
        </div>
      ) : error ? (
        <div className="mt-6 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm">
          <strong>Error:</strong> {error}
        </div>
      ) : schedules.length === 0 ? (
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">No Viva Schedules Assigned</h3>
          <p className="text-xs text-slate-500 mt-1">
            There are currently no active Viva periods with scheduled sessions for your students.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {schedules.map((sch) => {
              const isFinalized = sch.status === "FINALIZED";
              const myConf = sch.myConfirmation;
              const isConfirmed = myConf?.status === "CONFIRMED";
              const isChangeRequested = myConf?.status === "CHANGE_REQUESTED";

              const dateStr = sch.date ? new Date(sch.date).toLocaleDateString() : "Date TBA";
              const startTimeStr = sch.start_time
                ? new Date(sch.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "TBA";
              const endTimeStr = sch.end_time
                ? new Date(sch.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "TBA";
              const mode = sch.attendance_mode || sch.mode || "PHYSICAL";

              return (
                <div
                  key={sch.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                    isFinalized ? "border-emerald-200" : isConfirmed ? "border-indigo-200" : "border-slate-200"
                  }`}
                >
                  <div>
                    {/* Period & Status Header */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
                      <span className="text-xs font-bold text-indigo-700 font-mono">
                        {sch.batch_code || "FYP"}
                      </span>
                      {isFinalized ? (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Finalized
                        </span>
                      ) : isConfirmed ? (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                          ✓ Confirmed
                        </span>
                      ) : isChangeRequested ? (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                          Change Requested
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          Pending Review
                        </span>
                      )}
                    </div>

                    {/* Student Info */}
                    <h3 className="text-base font-bold text-slate-900">{sch.students?.student_name}</h3>
                    <p className="text-xs font-mono text-slate-500 mb-4">{sch.students?.cb_no}</p>

                    {/* Slot Meta Details */}
                    <div className="space-y-2 text-xs text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-100 mb-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-800">{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{startTimeStr} - {endTimeStr} ({sch.duration_mins || 30} mins)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {mode === "ONLINE" ? (
                          <Video className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <MapPin className="w-4 h-4 text-blue-600" />
                        )}
                        <span>
                          <strong>Mode:</strong> {mode} • <strong>Venue:</strong> {sch.venue || "TBA"}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200/60 text-[11px]">
                        <span><strong>Assessor:</strong> {sch.assessors?.name || "To be allocated"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {!isFinalized ? (
                      /* Pre-Finalization: Availability Review */
                      <button
                        onClick={() => {
                          setSelectedSchedule(sch);
                          setReviewAction("CONFIRM");
                          setConfirmMode(sch.attendance_mode || "PHYSICAL");
                          setConfirmComment("");
                          setChangeReason("");
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Review Availability</span>
                      </button>
                    ) : (
                      /* Post-Finalization: Open Report, Notes, Join Teams */
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {sch.report_link ? (
                            <a
                              href={sch.report_link}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 rounded-xl transition-colors shadow-sm"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Open Report</span>
                            </a>
                          ) : (
                            <button disabled className="bg-slate-100 text-slate-400 text-xs font-medium py-2 rounded-xl cursor-not-allowed">
                              No Report Link
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenNotes(sch)}
                            className="flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold py-2 rounded-xl transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Viva Notes</span>
                          </button>
                        </div>

                        {sch.teams_join_url && mode === "ONLINE" && (
                          <a
                            href={sch.teams_join_url}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2.5 rounded-xl shadow transition-colors"
                          >
                            <Video className="w-4 h-4" />
                            <span>Join Microsoft Teams</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: REVIEW AVAILABILITY */}
      {selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Review Viva Availability</h3>
                <p className="text-xs text-slate-500">Student: {selectedSchedule.students?.student_name} ({selectedSchedule.students?.cb_no})</p>
              </div>
              <button onClick={() => setSelectedSchedule(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs mb-4 space-y-1">
              <p><strong>Proposed Date:</strong> {selectedSchedule.date ? new Date(selectedSchedule.date).toLocaleDateString() : "TBA"}</p>
              <p><strong>Proposed Time:</strong> {selectedSchedule.start_time ? new Date(selectedSchedule.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "TBA"}</p>
              <p><strong>Initial Mode:</strong> {selectedSchedule.attendance_mode || "Physical"}</p>
            </div>

            <p className="text-xs font-bold text-slate-800 mb-3">Are you available to attend this Viva?</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setReviewAction("CONFIRM")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  reviewAction === "CONFIRM"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Confirm Availability
              </button>
              <button
                type="button"
                onClick={() => setReviewAction("REQUEST_CHANGE")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  reviewAction === "REQUEST_CHANGE"
                    ? "bg-rose-600 text-white border-rose-600 shadow"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Request Change
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-3.5 text-xs">
              {reviewAction === "CONFIRM" ? (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Attendance Mode</label>
                    <select
                      value={confirmMode}
                      onChange={(e) => setConfirmMode(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="PHYSICAL">Physical Attendance</option>
                      <option value="ONLINE">Online Attendance (Teams)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Optional Comment / Note to Admin</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Will attend in person at L4CR2"
                      value={confirmComment}
                      onChange={(e) => setConfirmComment(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Reason for Unavailability *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. Unavailable due to another scheduled academic activity / faculty meeting."
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Alternative Date</label>
                      <input
                        type="date"
                        value={altDate}
                        onChange={(e) => setAltDate(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Alternative Time</label>
                      <input
                        type="time"
                        value={altTime}
                        onChange={(e) => setAltTime(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Preferred Mode</label>
                    <select
                      value={altMode}
                      onChange={(e) => setAltMode(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="PHYSICAL">Physical</option>
                      <option value="ONLINE">Online</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSchedule(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2 rounded-xl text-white font-bold shadow ${
                    reviewAction === "CONFIRM" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {reviewAction === "CONFIRM" ? "Submit Confirmation" : "Submit Change Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRIVATE VIVA PREPARATION NOTES */}
      {notesSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Supervisor Viva Preparation Notes</h3>
                <p className="text-xs text-slate-500">Student: {notesSchedule.students?.student_name} ({notesSchedule.students?.cb_no})</p>
              </div>
              <button onClick={() => setNotesSchedule(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              🔒 <strong>Confidential:</strong> These notes are stored privately for your preparation. They are completely hidden from students and separated from assessor notes.
            </p>

            {notesLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading note...</div>
            ) : (
              <textarea
                rows={8}
                placeholder="Write your questions, areas requiring clarification, report observations, technical questions, or presentation concerns..."
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-xs font-sans focus:ring-2 focus:ring-indigo-500"
              />
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
              <span className="text-[11px] text-slate-400">Autosaves on submit</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNotesSchedule(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={notesLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
