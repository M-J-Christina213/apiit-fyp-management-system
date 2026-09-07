import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarDays, Clock, Users, CheckCircle2, AlertCircle, AlertTriangle,
  RefreshCw, Plus, Upload, Download, FileText, Video, MapPin, ExternalLink,
  ChevronRight, Check, X, ShieldAlert, ArrowRight, Sparkles, Filter, Search,
  Edit3, Trash2, Calendar as CalendarIcon, Link as LinkIcon, MessageSquare,
  CheckCircle, HelpCircle, Layers, ArrowUpRight
} from "lucide-react";

const STATUS_COLORS = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SCHEDULING: "bg-amber-50 text-amber-700 border-amber-200",
  AWAITING_CONFIRMATIONS: "bg-blue-50 text-blue-700 border-blue-200",
  READY_TO_FINALIZE: "bg-purple-50 text-purple-700 border-purple-200",
  FINALIZED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-slate-100 text-slate-800 border-slate-300",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200"
};

const CONFIRMATION_BADGES = {
  PENDING: { label: "Pending", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  SUPERVISOR_CONFIRMED: { label: "Supervisor Confirmed", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  ASSESSOR_CONFIRMED: { label: "Assessor Confirmed", bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  READY: { label: "Fully Confirmed", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CHANGE_REQUESTED: { label: "Change Requested", bg: "bg-rose-50 text-rose-700 border-rose-200" },
  FINALIZED: { label: "Finalized", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" }
};

const MODE_ICONS = {
  PHYSICAL: <MapPin className="w-3.5 h-3.5 text-blue-600 inline mr-1" />,
  ONLINE: <Video className="w-3.5 h-3.5 text-indigo-600 inline mr-1" />,
  HYBRID: <Layers className="w-3.5 h-3.5 text-purple-600 inline mr-1" />
};

export default function VivaAdminDashboard() {
  const [activeTab, setActiveTab] = useState("schedules"); // schedules, calendar, changes, import, finalize, settings, audit
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [batches, setBatches] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [students, setStudents] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [checklist, setChecklist] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [msStatus, setMsStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");

  // Modals
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false);
  const [showManualScheduleModal, setShowManualScheduleModal] = useState(false);
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showSuggestAltModal, setShowSuggestAltModal] = useState(false);
  const [activeChangeReq, setActiveChangeReq] = useState(null);
  const [altDate, setAltDate] = useState("");
  const [altTime, setAltTime] = useState("");

  // Excel Upload State
  const [excelFile, setExcelFile] = useState(null);
  const [excelPreview, setExcelPreview] = useState(null);
  const [excelValidating, setExcelValidating] = useState(false);

  // New Period Form Data
  const [periodForm, setPeriodForm] = useState({
    name: "",
    academic_year: "2026",
    semester: "Semester 1",
    intake: "",
    batches: [],
    start_date: "",
    end_date: "",
    daily_start_time: "09:00",
    daily_end_time: "17:00",
    slot_duration: "30"
  });

  // Manual Schedule Form Data
  const [manualForm, setManualForm] = useState({
    student_id: "",
    supervisor_id: "",
    assessor_id: "",
    proposed_date: "",
    proposed_time: "09:00",
    duration_mins: "30",
    attendance_mode: "PHYSICAL",
    venue: "TBA",
    report_link: "",
    teams_link: ""
  });

  const adminHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    "x-user-role": "admin",
    "x-user-email": "admin@apiit.lk"
  }), []);

  // Fetch initial data
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [periodsRes, batchesRes, supRes, assRes, stdRes, msRes] = await Promise.all([
        fetch("/api/viva/periods", { headers: adminHeaders }).then(r => r.json()),
        fetch("/api/viva/batches-with-students", { headers: adminHeaders }).then(r => r.json()),
        fetch("/api/supervisors").then(r => r.json()),
        fetch("/api/assessors").then(r => r.json()),
        fetch("/api/students").then(r => r.json()),
        fetch("/api/viva/microsoft/status", { headers: adminHeaders }).then(r => r.json())
      ]);

      setPeriods(periodsRes || []);
      setBatches(batchesRes || []);
      setSupervisors(supRes || []);
      setAssessors(assRes || []);
      setStudents(stdRes || []);
      setMsStatus(msRes || null);

      if (periodsRes && periodsRes.length > 0) {
        setSelectedPeriodId(String(periodsRes[0].id));
      }
    } catch (err) {
      console.error("Failed to load initial Viva data:", err);
      setMessage({ type: "error", text: "Failed to load Viva system data. " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load period-specific data when selectedPeriodId changes
  const loadPeriodDetails = async (periodId) => {
    if (!periodId) return;
    try {
      const [schedulesRes, checklistRes, changesRes, auditRes] = await Promise.all([
        fetch(`/api/viva/periods/${periodId}/schedules`, { headers: adminHeaders }).then(r => r.json()),
        fetch(`/api/viva/periods/${periodId}/finalization-checklist`, { headers: adminHeaders }).then(r => r.json()),
        fetch(`/api/viva/change-requests?periodId=${periodId}`, { headers: adminHeaders }).then(r => r.json()),
        fetch(`/api/viva/periods/${periodId}/audit-logs`, { headers: adminHeaders }).then(r => r.json())
      ]);

      setSchedules(Array.isArray(schedulesRes) ? schedulesRes : []);
      setChecklist(checklistRes || null);
      setChangeRequests(Array.isArray(changesRes) ? changesRes : []);
      setAuditLogs(Array.isArray(auditRes) ? auditRes : []);
    } catch (err) {
      console.error("Failed to load period details:", err);
    }
  };

  useEffect(() => {
    if (selectedPeriodId) {
      loadPeriodDetails(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const selectedPeriod = useMemo(() => {
    return periods.find(p => String(p.id) === String(selectedPeriodId));
  }, [periods, selectedPeriodId]);

  // Statistics calculation for the current period
  const stats = useMemo(() => {
    const total = schedules.length;
    const confirmed = schedules.filter(s => s.overallStatus === "READY" || s.overallStatus === "FINALIZED").length;
    const pending = schedules.filter(s => s.overallStatus === "PENDING" || s.overallStatus === "SUPERVISOR_CONFIRMED" || s.overallStatus === "ASSESSOR_CONFIRMED").length;
    const changeReqs = schedules.filter(s => s.overallStatus === "CHANGE_REQUESTED").length;
    const finalized = schedules.filter(s => s.status === "FINALIZED").length;
    const conflicts = checklist?.schedulingConflicts || 0;

    return { total, confirmed, pending, changeReqs, conflicts, finalized };
  }, [schedules, checklist]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(sch => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        sch.students?.student_name?.toLowerCase().includes(q) ||
        sch.students?.cb_no?.toLowerCase().includes(q) ||
        sch.supervisors?.name?.toLowerCase().includes(q) ||
        sch.assessors?.name?.toLowerCase().includes(q) ||
        sch.venue?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || sch.overallStatus === statusFilter;
      const matchesMode = modeFilter === "ALL" || (sch.attendance_mode || sch.mode) === modeFilter;
      const matchesBatch = batchFilter === "ALL" || sch.batch_code === batchFilter;

      return matchesSearch && matchesStatus && matchesMode && matchesBatch;
    });
  }, [schedules, searchQuery, statusFilter, modeFilter, batchFilter]);

  // Unique batches in current schedules
  const availableBatches = useMemo(() => {
    const bSet = new Set(schedules.map(s => s.batch_code).filter(Boolean));
    return Array.from(bSet);
  }, [schedules]);

  // Handle status transition for period
  const handleTransitionPeriodStatus = async (newStatus) => {
    if (!selectedPeriodId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/viva/periods/${selectedPeriodId}/status`, {
        method: "PUT",
        headers: adminHeaders,
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status transition failed.");

      setMessage({ type: "success", text: data.message });
      // Refresh
      const updatedPeriods = await fetch("/api/viva/periods", { headers: adminHeaders }).then(r => r.json());
      setPeriods(updatedPeriods);
      loadPeriodDetails(selectedPeriodId);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Create Period Handler
  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    if (!periodForm.name || periodForm.batches.length === 0 || !periodForm.start_date || !periodForm.end_date) {
      alert("Please fill in Period Name, select at least one Batch, and specify Start/End dates.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/viva/periods", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify(periodForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create Viva Period.");

      setMessage({ type: "success", text: `Viva Period '${data.period.name}' created successfully.` });
      setShowCreatePeriodModal(false);
      const updatedPeriods = await fetch("/api/viva/periods", { headers: adminHeaders }).then(r => r.json());
      setPeriods(updatedPeriods);
      setSelectedPeriodId(String(data.period.id));
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Manual Schedule Creation Handler
  const handleCreateManualSchedule = async (e) => {
    e.preventDefault();
    if (!manualForm.student_id || !manualForm.supervisor_id || !manualForm.assessor_id || !manualForm.proposed_date || !manualForm.proposed_time) {
      alert("Please fill in all required fields (Student, Supervisor, Assessor, Date, Time).");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/viva/periods/${selectedPeriodId}/manual-schedule`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify(manualForm)
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || "Failed to create schedule.";
        if (data.conflicts?.length) msg += "\nConflicts: " + data.conflicts.join("; ");
        if (data.errors?.length) msg += "\nErrors: " + data.errors.join("; ");
        throw new Error(msg);
      }

      setMessage({ type: "success", text: "Viva slot successfully created." });
      setShowManualScheduleModal(false);
      loadPeriodDetails(selectedPeriodId);
      // Reset form
      setManualForm({
        student_id: "",
        supervisor_id: "",
        assessor_id: "",
        proposed_date: "",
        proposed_time: "09:00",
        duration_mins: "30",
        attendance_mode: "PHYSICAL",
        venue: "TBA",
        report_link: "",
        teams_link: ""
      });
    } catch (err) {
      alert("Validation Error:\n" + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Update Schedule (Edit Slot) Handler
  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    if (!editingSchedule) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/viva/schedules/${editingSchedule.id}`, {
        method: "PUT",
        headers: adminHeaders,
        body: JSON.stringify(editingSchedule)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update schedule.");

      setMessage({
        type: "success",
        text: `Schedule slot updated. ${data.confirmationReset ? "(Confirmations reset to Pending for re-verification)" : ""}`
      });
      setShowEditScheduleModal(false);
      loadPeriodDetails(selectedPeriodId);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Schedule
  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm("Are you sure you want to delete this Viva schedule slot?")) return;
    try {
      const res = await fetch(`/api/viva/schedules/${scheduleId}`, {
        method: "DELETE",
        headers: adminHeaders
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Schedule deleted successfully." });
        loadPeriodDetails(selectedPeriodId);
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete schedule.");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Excel File Upload & Validation Preview
  const handleValidateExcel = async () => {
    if (!excelFile || !selectedPeriodId) {
      alert("Please select an Excel file to upload.");
      return;
    }
    setExcelValidating(true);
    try {
      const formData = new FormData();
      formData.append("file", excelFile);

      const res = await fetch(`/api/viva/periods/${selectedPeriodId}/validate-excel`, {
        method: "POST",
        headers: { "x-user-role": "admin" },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Excel validation failed.");

      setExcelPreview(data);
    } catch (err) {
      alert("Validation Error: " + err.message);
    } finally {
      setExcelValidating(false);
    }
  };

  // Confirm Excel Import
  const handleConfirmExcelImport = async () => {
    if (!excelPreview || !excelPreview.preview) return;
    const validRows = excelPreview.preview.filter(r => r.isValid && r.parsedData);
    if (validRows.length === 0) {
      alert("No valid rows available to import.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/viva/periods/${selectedPeriodId}/import-excel`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ validatedRows: validRows })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed.");

      setMessage({ type: "success", text: data.message });
      setExcelFile(null);
      setExcelPreview(null);
      setActiveTab("schedules");
      loadPeriodDetails(selectedPeriodId);
      // Reload periods to reflect updated status
      const updatedPeriods = await fetch("/api/viva/periods", { headers: adminHeaders }).then(r => r.json());
      setPeriods(updatedPeriods);
    } catch (err) {
      alert("Import Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Change Request Actions
  const handleResolveChange = async (requestId, action, altD = null, altT = null) => {
    setActionLoading(true);
    try {
      const body = { action };
      if (action === "ACCEPT") {
        body.admin_response = "Accepted proposed alternative slot.";
      } else if (action === "REJECT") {
        const reason = prompt("Enter optional reason for rejection:", "Original schedule is maintained due to room scheduling constraints.");
        body.admin_response = reason || "Change request declined.";
      } else if (action === "SUGGEST_ALTERNATIVE") {
        body.alternative_date = altD;
        body.alternative_time = altT;
        body.admin_response = `Admin proposed alternative: ${altD} at ${altT}`;
      }

      const res = await fetch(`/api/viva/change-requests/${requestId}/resolve`, {
        method: "PUT",
        headers: adminHeaders,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve change request.");

      setMessage({ type: "success", text: data.message });
      setShowSuggestAltModal(false);
      loadPeriodDetails(selectedPeriodId);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Finalize Schedule Action
  const handleFinalizeSchedule = async () => {
    if (!selectedPeriodId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/viva/periods/${selectedPeriodId}/finalize`, {
        method: "POST",
        headers: adminHeaders
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Finalization failed.");

      setMessage({
        type: "success",
        text: `${data.message} (${data.syncSuccessCount} Outlook calendar events synced, ${data.syncFailedCount} failed)`
      });
      setShowFinalizeModal(false);
      loadPeriodDetails(selectedPeriodId);
      const updatedPeriods = await fetch("/api/viva/periods", { headers: adminHeaders }).then(r => r.json());
      setPeriods(updatedPeriods);
    } catch (err) {
      alert("Finalization Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Retry Outlook Sync
  const handleRetrySync = async (scheduleId = null) => {
    setActionLoading(true);
    try {
      const url = scheduleId
        ? `/api/viva/schedules/${scheduleId}/retry-sync`
        : `/api/viva/periods/${selectedPeriodId}/retry-sync`;
      const res = await fetch(url, { method: "POST", headers: adminHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync retry failed.");

      setMessage({ type: "success", text: data.message });
      loadPeriodDetails(selectedPeriodId);
    } catch (err) {
      alert("Sync Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Connect Microsoft Account
  const handleConnectMicrosoft = async () => {
    try {
      const res = await fetch("/api/viva/microsoft/auth-url", { headers: adminHeaders });
      const data = await res.json();
      if (data.authUrl) {
        // If simulated or live callback
        window.open(data.authUrl, "_blank", "width=600,height=700");
        // Simulate immediate connection check after short delay
        setTimeout(async () => {
          const s = await fetch("/api/viva/microsoft/status", { headers: adminHeaders }).then(r => r.json());
          setMsStatus(s);
        }, 3000);
      }
    } catch (err) {
      alert("Failed to initiate Microsoft connection: " + err.message);
    }
  };

  // Disconnect Microsoft Account
  const handleDisconnectMicrosoft = async () => {
    if (!confirm("Are you sure you want to disconnect the Microsoft 365 account?")) return;
    try {
      await fetch("/api/viva/microsoft/disconnect", { method: "POST", headers: adminHeaders });
      const s = await fetch("/api/viva/microsoft/status", { headers: adminHeaders }).then(r => r.json());
      setMsStatus(s);
      setMessage({ type: "success", text: "Microsoft 365 account disconnected." });
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!selectedPeriodId) return;
    window.open(`/api/viva/periods/${selectedPeriodId}/export`, "_blank");
  };

  // Download Sample Excel Template
  const handleDownloadSampleTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Batch Code,Name,CB No,Supervisor,Assessor,Proposed Date,Time,Attendance Mode,Venue,Report Link\n" +
      "SE24,Alice Student,CB001,Dr. Kavin,Dr. Xavier Assessor,2026-09-15,09:00,PHYSICAL,L4CR2,https://apiit.sharepoint.com/reports/CB001.pdf\n" +
      "SE24,Bob Student,CB002,Dr. Nirmala,Dr. Xavier Assessor,2026-09-15,09:30,ONLINE,Microsoft Teams,https://apiit.sharepoint.com/reports/CB002.pdf\n" +
      "CS24,Charlie Student,CB003,Dr. Kavin,Dr. Yasmin Assessor,2026-09-15,10:00,PHYSICAL,TBA,\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "FYP_Viva_Schedule_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-8">
      {/* Toast Notification */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Viva Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <Sparkles className="w-4 h-4" />
            <span>Academic Viva Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">Viva Examination Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Admin controls schedule generation, supervises confirmations, resolves exceptions, and synchronizes with Microsoft 365.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="appearance-none bg-white border border-slate-300 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name || p.type} ({p.status})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <ChevronRight className="w-4 h-4 rotate-90" />
            </div>
          </div>

          <button
            onClick={() => setShowCreatePeriodModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Viva Period</span>
          </button>
        </div>
      </div>

      {/* Period Meta Banner */}
      {selectedPeriod && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 font-bold text-lg">
              {selectedPeriod.academic_year?.slice(-2) || "26"}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">{selectedPeriod.name || selectedPeriod.type}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[selectedPeriod.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                  {selectedPeriod.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                <span><strong>Academic Year:</strong> {selectedPeriod.academic_year || "2026"}</span>
                <span>•</span>
                <span><strong>Semester:</strong> {selectedPeriod.semester || "Semester 1"}</span>
                <span>•</span>
                <span><strong>Duration:</strong> {new Date(selectedPeriod.start_date).toLocaleDateString()} to {new Date(selectedPeriod.end_date).toLocaleDateString()}</span>
                <span>•</span>
                <span><strong>Daily Window:</strong> {selectedPeriod.daily_start_time || "09:00"} - {selectedPeriod.daily_end_time || "17:00"} ({selectedPeriod.slot_duration || 30} mins)</span>
              </div>
            </div>
          </div>

          {/* Period Status Progression Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {selectedPeriod.status === "DRAFT" && (
              <button
                onClick={() => handleTransitionPeriodStatus("SCHEDULING")}
                disabled={actionLoading}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
              >
                <span>Open for Scheduling</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {selectedPeriod.status === "SCHEDULING" && (
              <button
                onClick={() => handleTransitionPeriodStatus("AWAITING_CONFIRMATIONS")}
                disabled={actionLoading}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <span>Notify Participants & Await Confirmations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {selectedPeriod.status === "AWAITING_CONFIRMATIONS" && (
              <button
                onClick={() => handleTransitionPeriodStatus("READY_TO_FINALIZE")}
                disabled={actionLoading}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              >
                <span>Mark Ready to Finalize</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {selectedPeriod.status === "READY_TO_FINALIZE" && (
              <button
                onClick={() => setShowFinalizeModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Review & Finalize Schedule</span>
              </button>
            )}

            {selectedPeriod.status === "FINALIZED" && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Published & Synced</span>
              </span>
            )}

            {selectedPeriod.status !== "CANCELLED" && selectedPeriod.status !== "COMPLETED" && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to cancel this Viva Period?")) {
                    handleTransitionPeriodStatus("CANCELLED");
                  }
                }}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Vivas</p>
            <p className="text-xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Confirmed</p>
            <p className="text-xl font-bold text-slate-900">{stats.confirmed}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Pending</p>
            <p className="text-xl font-bold text-slate-900">{stats.pending}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Change Reqs</p>
            <p className="text-xl font-bold text-slate-900">{stats.changeReqs}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Conflicts</p>
            <p className="text-xl font-bold text-slate-900">{stats.conflicts}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Finalized</p>
            <p className="text-xl font-bold text-slate-900">{stats.finalized}</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="mt-8 border-b border-slate-200 flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("schedules")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "schedules" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Viva Schedule Table</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{schedules.length}</span>
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "calendar" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Visual Calendar View</span>
          </button>

          <button
            onClick={() => setActiveTab("changes")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "changes" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Change Requests Center</span>
            {changeRequests.filter(c => c.status === "PENDING").length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                {changeRequests.filter(c => c.status === "PENDING").length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("import")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "import" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import / Create Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab("finalize")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "finalize" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Finalization Checklist</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "settings" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Microsoft 365 Settings</span>
            {msStatus?.isConnected && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "audit" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SCHEDULE MANAGEMENT TABLE */}
      {activeTab === "schedules" && (
        <div className="mt-6 space-y-4">
          {/* Controls Bar: Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by student, CB No, supervisor, assessor, venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white text-slate-700"
              >
                <option value="ALL">All Confirmation Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SUPERVISOR_CONFIRMED">Supervisor Confirmed</option>
                <option value="ASSESSOR_CONFIRMED">Assessor Confirmed</option>
                <option value="READY">Fully Confirmed</option>
                <option value="CHANGE_REQUESTED">Change Requested</option>
                <option value="FINALIZED">Finalized</option>
              </select>

              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white text-slate-700"
              >
                <option value="ALL">All Modes</option>
                <option value="PHYSICAL">Physical</option>
                <option value="ONLINE">Online</option>
                <option value="HYBRID">Hybrid</option>
              </select>

              {availableBatches.length > 0 && (
                <select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white text-slate-700"
                >
                  <option value="ALL">All Batches</option>
                  {availableBatches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowManualScheduleModal(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Individual Viva</span>
              </button>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="p-3.5">Batch</th>
                    <th className="p-3.5">Student & CB No</th>
                    <th className="p-3.5">Supervisor</th>
                    <th className="p-3.5">Assessor</th>
                    <th className="p-3.5">Proposed Slot</th>
                    <th className="p-3.5">Mode & Venue</th>
                    <th className="p-3.5">Confirmation</th>
                    <th className="p-3.5">Teams / Report</th>
                    <th className="p-3.5">Outlook Sync</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-slate-400">
                        No Viva schedule entries found matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((sch) => {
                      const confBadge = CONFIRMATION_BADGES[sch.overallStatus] || CONFIRMATION_BADGES.PENDING;
                      const dateStr = sch.date ? new Date(sch.date).toLocaleDateString() : "TBA";
                      const startTimeStr = sch.start_time ? new Date(sch.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
                      const endTimeStr = sch.end_time ? new Date(sch.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
                      const mode = sch.attendance_mode || sch.mode || "PHYSICAL";

                      return (
                        <tr key={sch.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 font-bold text-indigo-700 text-xs">{sch.batch_code || "General"}</td>
                          <td className="p-3.5">
                            <p className="font-semibold text-slate-900">{sch.students?.student_name}</p>
                            <p className="text-xs font-mono text-slate-500">{sch.students?.cb_no}</p>
                          </td>
                          <td className="p-3.5 font-medium text-slate-700">
                            {sch.supervisors?.name || <span className="text-slate-400 italic">Unassigned</span>}
                          </td>
                          <td className="p-3.5 font-medium text-slate-700">
                            {sch.assessors?.name || <span className="text-slate-400 italic">Unassigned</span>}
                          </td>
                          <td className="p-3.5">
                            <p className="font-semibold text-slate-800 text-xs">{dateStr}</p>
                            <p className="text-xs text-slate-500">{startTimeStr} - {endTimeStr}</p>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center text-xs font-medium text-slate-700">
                              {MODE_ICONS[mode]}
                              <span>{mode}</span>
                            </div>
                            <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded font-mono ${sch.venue === "TBA" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-700"}`}>
                              {sch.venue || "TBA"}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1 ${confBadge.bg}`}>
                              {confBadge.label}
                            </span>
                          </td>
                          <td className="p-3.5 space-y-1 text-xs">
                            {sch.report_link ? (
                              <a href={sch.report_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium">
                                <FileText className="w-3.5 h-3.5" />
                                <span>Report</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs italic">No Report</span>
                            )}

                            {sch.teams_join_url ? (
                              <a href={sch.teams_join_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-medium">
                                <Video className="w-3.5 h-3.5" />
                                <span>Teams Join</span>
                              </a>
                            ) : mode === "ONLINE" ? (
                              <span className="text-rose-500 text-xs font-medium">Missing Teams Link</span>
                            ) : null}
                          </td>
                          <td className="p-3.5">
                            {sch.outlook_sync_status === "SYNCED" ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <Check className="w-3 h-3" /> Synced
                              </span>
                            ) : sch.outlook_sync_status === "FAILED" ? (
                              <button
                                onClick={() => handleRetrySync(sch.id)}
                                title={sch.outlook_sync_error || "Sync Failed"}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 hover:bg-rose-100"
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> Retry
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">Not Synced</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1">
                            <button
                              onClick={() => {
                                setEditingSchedule({
                                  ...sch,
                                  date: sch.date ? sch.date.split("T")[0] : "",
                                  time: sch.start_time ? new Date(sch.start_time).toISOString().slice(11, 16) : "09:00"
                                });
                                setShowEditScheduleModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Viva Slot"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(sch.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Slot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VISUAL CALENDAR TIMELINE VIEW */}
      {activeTab === "calendar" && (
        <div className="mt-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Viva Examination Timeline Calendar</h3>
              <p className="text-xs text-slate-500">Visual mapping of student viva slots by date to spot overlapping times and venue allocations.</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Physical</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500 inline-block" /> Online</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Venue TBA</div>
            </div>
          </div>

          {/* Group schedules by date */}
          {(() => {
            const dateGroups = {};
            schedules.forEach(sch => {
              const d = sch.date ? new Date(sch.date).toISOString().split("T")[0] : "Undated";
              if (!dateGroups[d]) dateGroups[d] = [];
              dateGroups[d].push(sch);
            });

            const sortedDates = Object.keys(dateGroups).sort();

            if (sortedDates.length === 0) {
              return <p className="text-center text-slate-400 py-12">No scheduled Viva slots available in this period.</p>;
            }

            return (
              <div className="space-y-8">
                {sortedDates.map(dateKey => (
                  <div key={dateKey} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-indigo-600" />
                        <span className="font-bold text-slate-900 text-sm">{dateKey}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                          {dateGroups[dateKey].length} session(s)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dateGroups[dateKey].map(sch => {
                        const timeStr = sch.start_time
                          ? `${new Date(sch.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(sch.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : "Time TBA";
                        const isTBA = !sch.venue || sch.venue === "TBA";
                        const mode = sch.attendance_mode || sch.mode || "PHYSICAL";

                        return (
                          <div
                            key={sch.id}
                            className={`p-3.5 rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${
                              mode === "ONLINE" ? "border-indigo-200" : "border-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-bold text-indigo-600 font-mono">{timeStr}</span>
                              <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                                mode === "ONLINE" ? "bg-indigo-50 text-indigo-700" : "bg-blue-50 text-blue-700"
                              }`}>
                                {mode}
                              </span>
                            </div>

                            <p className="font-bold text-slate-900 text-sm">{sch.students?.student_name}</p>
                            <p className="text-xs font-mono text-slate-500 mb-2">{sch.students?.cb_no} • {sch.batch_code}</p>

                            <div className="text-xs text-slate-600 space-y-0.5 border-t border-slate-100 pt-2">
                              <p><strong>Sup:</strong> {sch.supervisors?.name || "N/A"}</p>
                              <p><strong>Ass:</strong> {sch.assessors?.name || "N/A"}</p>
                              <p className={`font-medium ${isTBA ? "text-amber-600 font-semibold" : "text-slate-700"}`}>
                                <strong>Venue:</strong> {sch.venue || "TBA"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: CHANGE REQUEST CENTER */}
      {activeTab === "changes" && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Viva Change Requests Center</h3>
              <p className="text-xs text-slate-500">Supervisors and assessors request changes when unavailable. Review their proposed alternative dates and times.</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200">
              {changeRequests.filter(c => c.status === "PENDING").length} Pending Review
            </span>
          </div>

          {changeRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p className="font-semibold text-slate-700">No Change Requests</p>
              <p className="text-xs text-slate-500">All supervisors and assessors have agreed to their assigned slots.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {changeRequests.map((cr) => {
                const sch = cr.viva_schedules;
                const isPending = cr.status === "PENDING";
                const origDateStr = cr.original_date ? new Date(cr.original_date).toLocaleDateString() : "TBA";
                const propDateStr = cr.proposed_date ? new Date(cr.proposed_date).toLocaleDateString() : "TBA";

                return (
                  <div key={cr.id} className={`p-5 rounded-xl border transition-all ${isPending ? "bg-rose-50/20 border-rose-200 shadow-sm" : "bg-white border-slate-200"}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            {cr.role} REQUEST
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            cr.status === "PENDING" ? "bg-amber-100 text-amber-800 border-amber-200" :
                            cr.status === "ACCEPTED" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                            cr.status === "REJECTED" ? "bg-rose-100 text-rose-800 border-rose-200" :
                            "bg-purple-100 text-purple-800 border-purple-200"
                          }`}>
                            {cr.status}
                          </span>
                          <span className="text-xs text-slate-400">Submitted {new Date(cr.created_at).toLocaleDateString()}</span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 mt-2">
                          Student: {sch?.students?.student_name} <span className="font-mono text-xs text-slate-500">({sch?.students?.cb_no})</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 bg-white p-3 rounded-lg border border-slate-100 text-xs">
                          <div>
                            <p className="text-slate-400 font-semibold">ORIGINAL SCHEDULE</p>
                            <p className="font-bold text-slate-800 mt-0.5">{origDateStr} at {cr.original_time || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-indigo-600 font-semibold">PROPOSED ALTERNATIVE</p>
                            <p className="font-bold text-indigo-900 mt-0.5">{propDateStr} at {cr.proposed_time || "N/A"} ({cr.attendance_mode || "Physical"})</p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 mt-2.5">
                          <strong className="text-slate-900">Reason for Unavailability:</strong> {cr.reason}
                        </p>

                        {cr.admin_response && (
                          <p className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded mt-2">
                            <strong>Admin Response:</strong> {cr.admin_response}
                          </p>
                        )}
                      </div>

                      {/* Admin Resolution Buttons */}
                      {isPending && (
                        <div className="flex flex-wrap md:flex-col items-stretch gap-2 shrink-0">
                          <button
                            onClick={() => handleResolveChange(cr.id, "ACCEPT")}
                            disabled={actionLoading}
                            className="flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept Alternative</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveChangeReq(cr);
                              setAltDate(cr.proposed_date ? cr.proposed_date.split("T")[0] : "");
                              setAltTime(cr.proposed_time || "10:00");
                              setShowSuggestAltModal(true);
                            }}
                            disabled={actionLoading}
                            className="flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                          >
                            <span>Suggest Alternative</span>
                          </button>

                          <button
                            onClick={() => handleResolveChange(cr.id, "REJECT")}
                            disabled={actionLoading}
                            className="flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline Request</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: IMPORT EXCEL & MANUAL SCHEDULE CREATION */}
      {activeTab === "import" && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Excel Spreadsheet Upload Flow */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-base">
                  <Upload className="w-5 h-5" />
                  <span>Bulk Excel Schedule Upload</span>
                </div>
                <button
                  onClick={handleDownloadSampleTemplate}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Download className="w-3 h-3" /> Template
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4">
                Upload a university schedule spreadsheet (.xlsx or .xls). Expected columns: <code>Batch Code</code>, <code>Name</code>, <code>CB No</code>, <code>Supervisor</code>, <code>Assessor</code>, <code>Proposed Date</code>, <code>Time</code>.
              </p>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setExcelFile(e.target.files[0]);
                      setExcelPreview(null);
                    }
                  }}
                  className="hidden"
                  id="viva-excel-upload"
                />
                <label
                  htmlFor="viva-excel-upload"
                  className="cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  {excelFile ? excelFile.name : "Choose Excel file to upload"}
                </label>
                <p className="text-xs text-slate-400 mt-1">Accepts standard Excel files (.xlsx, .xls) up to 10MB</p>
              </div>

              {excelFile && (
                <div className="mt-4 flex items-center justify-between bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                  <span className="text-xs font-semibold text-indigo-900 truncate">{excelFile.name}</span>
                  <button
                    onClick={handleValidateExcel}
                    disabled={excelValidating}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {excelValidating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Validate File</span>
                  </button>
                </div>
              )}

              {/* Validation Preview Results */}
              {excelPreview && (
                <div className="mt-5 border border-slate-200 rounded-xl p-4 bg-white">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-800">Validation Breakdown</span>
                    <span className="font-mono text-slate-500">{excelPreview.totalRows} Total Rows</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 my-3 text-center">
                    <div className="bg-emerald-50 text-emerald-800 p-2 rounded-lg text-xs font-bold">
                      {excelPreview.validRows} Valid
                    </div>
                    <div className="bg-amber-50 text-amber-800 p-2 rounded-lg text-xs font-bold">
                      {excelPreview.warningCount} Warnings
                    </div>
                    <div className="bg-rose-50 text-rose-800 p-2 rounded-lg text-xs font-bold">
                      {excelPreview.errorCount} Errors
                    </div>
                    <div className="bg-orange-50 text-orange-800 p-2 rounded-lg text-xs font-bold">
                      {excelPreview.conflictCount} Conflicts
                    </div>
                  </div>

                  {excelPreview.errorCount > 0 ? (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg space-y-1">
                      <p className="font-bold">Cannot import due to {excelPreview.errorCount} validation error(s):</p>
                      {excelPreview.preview.filter(r => !r.isValid).slice(0, 3).map((r, i) => (
                        <p key={i}>• Row {r.rowNumber}: {r.errors.join(", ")}</p>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg">
                      <p className="font-bold">✓ Excel validation passed with 0 critical errors.</p>
                      {excelPreview.warningCount > 0 && <p className="mt-1 text-slate-600">{excelPreview.warningCount} warning(s) noted.</p>}
                    </div>
                  )}

                  <button
                    onClick={handleConfirmExcelImport}
                    disabled={!excelPreview.canImport || actionLoading}
                    className={`w-full mt-4 flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded-xl transition-all ${
                      excelPreview.canImport ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Import Schedule ({excelPreview.validRows} Slots)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Manual Single Viva Creation */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-base pb-3 border-b border-slate-100 mb-4">
              <Plus className="w-5 h-5" />
              <span>Manual Individual Schedule Creation</span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Create an individual Viva session directly. Validates student eligibility, supervisor, assessor, date/time, and detects conflicts.
            </p>

            <form onSubmit={handleCreateManualSchedule} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Student *</label>
                <select
                  value={manualForm.student_id}
                  onChange={(e) => setManualForm(prev => ({ ...prev, student_id: e.target.value }))}
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.student_name} ({s.cb_no})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supervisor *</label>
                  <select
                    value={manualForm.supervisor_id}
                    onChange={(e) => setManualForm(prev => ({ ...prev, supervisor_id: e.target.value }))}
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800"
                  >
                    <option value="">-- Choose Supervisor --</option>
                    {supervisors.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assessor *</label>
                  <select
                    value={manualForm.assessor_id}
                    onChange={(e) => setManualForm(prev => ({ ...prev, assessor_id: e.target.value }))}
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800"
                  >
                    <option value="">-- Choose Assessor --</option>
                    {assessors.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Proposed Date *</label>
                  <input
                    type="date"
                    value={manualForm.proposed_date}
                    onChange={(e) => setManualForm(prev => ({ ...prev, proposed_date: e.target.value }))}
                    required
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Time (HH:mm) *</label>
                  <input
                    type="time"
                    value={manualForm.proposed_time}
                    onChange={(e) => setManualForm(prev => ({ ...prev, proposed_time: e.target.value }))}
                    required
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={manualForm.duration_mins}
                    onChange={(e) => setManualForm(prev => ({ ...prev, duration_mins: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Attendance Mode</label>
                  <select
                    value={manualForm.attendance_mode}
                    onChange={(e) => setManualForm(prev => ({
                      ...prev,
                      attendance_mode: e.target.value,
                      venue: e.target.value === "ONLINE" ? "Microsoft Teams" : "TBA"
                    }))}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="PHYSICAL">Physical</option>
                    <option value="ONLINE">Online</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Venue</label>
                  <input
                    type="text"
                    placeholder="e.g. L4CR2 or TBA"
                    value={manualForm.venue}
                    onChange={(e) => setManualForm(prev => ({ ...prev, venue: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student OneDrive Report Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://apiitlk-my.sharepoint.com/..."
                  value={manualForm.report_link}
                  onChange={(e) => setManualForm(prev => ({ ...prev, report_link: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow transition-colors flex items-center justify-center gap-2 mt-4 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Validate & Create Viva Slot</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: FINALIZATION CHECKLIST */}
      {activeTab === "finalize" && checklist && (
        <div className="mt-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto">
          <div className="pb-4 border-b border-slate-100 mb-6">
            <h3 className="text-xl font-bold text-slate-900">Pre-Finalization Readiness Checklist</h3>
            <p className="text-xs text-slate-500 mt-1">
              Verify all institutional requirements before locking the Viva Period. Finalization publishes the schedule, syncs Outlook events, and generates notifications.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <p className="text-xs text-slate-500 font-semibold">Total Students</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{checklist.totalStudents}</p>
            </div>
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <p className="text-xs text-emerald-700 font-semibold">Confirmed Slots</p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">{checklist.confirmed}</p>
            </div>
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <p className="text-xs text-amber-700 font-semibold">Pending Confirmations</p>
              <p className="text-2xl font-bold text-amber-800 mt-1">{checklist.pending}</p>
            </div>
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
              <p className="text-xs text-rose-700 font-semibold">Change Requests</p>
              <p className="text-2xl font-bold text-rose-800 mt-1">{checklist.changeRequests}</p>
            </div>
          </div>

          {/* Critical Blockers */}
          {checklist.blockers && checklist.blockers.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl mb-4">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>Critical Blockers (Must resolve before finalization)</span>
              </div>
              <ul className="list-disc list-inside text-xs text-rose-700 space-y-1 pl-2">
                {checklist.blockers.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings (Non-blocking) */}
          {checklist.warnings && checklist.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Advisory Warnings (Will not block finalization)</span>
              </div>
              <ul className="list-disc list-inside text-xs text-amber-700 space-y-1 pl-2">
                {checklist.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Note: Venues can remain <strong>TBA</strong> and will be editable by Administrator later.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Period Status: <strong>{checklist.status}</strong>
            </span>

            <button
              onClick={() => setShowFinalizeModal(true)}
              disabled={!checklist.isReadyToFinalize || actionLoading || checklist.status === "FINALIZED"}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow transition-all ${
                checklist.isReadyToFinalize && checklist.status !== "FINALIZED"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{checklist.status === "FINALIZED" ? "Already Finalized" : "Finalize Viva Schedule"}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: MICROSOFT 365 SETTINGS */}
      {activeTab === "settings" && (
        <div className="mt-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-3xl mx-auto">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              M365
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Microsoft 365 Integration</h3>
              <p className="text-xs text-slate-500">Delegated OAuth 2.0 calendar synchronization and Microsoft Teams online meeting generation.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Integration Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-3 h-3 rounded-full ${msStatus?.isConnected ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className="font-bold text-sm text-slate-800">
                    {msStatus?.isConnected ? (msStatus.isSimulated ? "Connected (Local Mode)" : "Connected (Microsoft Graph)") : "Not Connected"}
                  </span>
                </div>
                {msStatus?.adminEmail && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Account: {msStatus.adminEmail}</p>
                )}
              </div>

              {msStatus?.isConnected ? (
                <button
                  onClick={handleDisconnectMicrosoft}
                  className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnectMicrosoft}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors"
                >
                  <Video className="w-4 h-4" />
                  <span>Connect Microsoft Account</span>
                </button>
              )}
            </div>

            <div className="p-4 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-800">Required Microsoft Graph Delegated Permissions:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><code>Calendars.ReadWrite</code> - Creates and updates Viva examination slots on Outlook</li>
                <li><code>OnlineMeetings.ReadWrite</code> - Generates Microsoft Teams meeting links for online vivas</li>
                <li><code>User.Read</code> - Identifies the connected administrator profile</li>
                <li><code>offline_access</code> - Maintains persistent token refresh without repeated logins</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleRetrySync(null)}
                disabled={actionLoading}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Sync for All Finalized Schedules</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="mt-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-lg font-bold text-slate-900">Viva Examination Audit Trail</h3>
            <p className="text-xs text-slate-500">Immutable chronological log of all schedule changes, confirmations, and administrative overrides.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Performed By</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-slate-400">
                      No audit records found for this Viva Period.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="p-3 font-bold text-indigo-700">{log.action}</td>
                      <td className="p-3">{log.performed_by}</td>
                      <td className="p-3 uppercase font-semibold">{log.role}</td>
                      <td className="p-3 text-slate-600">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW VIVA PERIOD */}
      {showCreatePeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Create New Viva Period</h3>
              <button onClick={() => setShowCreatePeriodModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Viva Period Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Semester 1 Viva 2026"
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={periodForm.academic_year}
                    onChange={(e) => setPeriodForm(prev => ({ ...prev, academic_year: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                  <input
                    type="text"
                    value={periodForm.semester}
                    onChange={(e) => setPeriodForm(prev => ({ ...prev, semester: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Applicable Batches *</label>
                <div className="grid grid-cols-2 gap-2 border border-slate-200 p-2.5 rounded-xl max-h-32 overflow-y-auto bg-slate-50/50">
                  {batches.map(b => (
                    <label key={b.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={periodForm.batches.includes(b.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPeriodForm(prev => ({ ...prev, batches: [...prev.batches, b.id] }));
                          } else {
                            setPeriodForm(prev => ({ ...prev, batches: prev.batches.filter(id => id !== b.id) }));
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-semibold">{b.batch_code}</span> ({b.stage})
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={periodForm.start_date}
                    onChange={(e) => setPeriodForm(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={periodForm.end_date}
                    onChange={(e) => setPeriodForm(prev => ({ ...prev, end_date: e.target.value }))}
                    required
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Daily Start</label>
                  <input
                    type="time"
                    value={periodForm.daily_start_time}
                    onChange={(e) => setPeriodForm(prev => ({ ...prev, daily_start_time: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Daily End</label>
                  <input
                    type="time"
                    value={periodForm.daily_end_time}
                    onChange={(e) => setPeriodForm(prev => ({ ...prev, daily_end_time: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slot Duration</label>
                  <select
                    value={periodForm.slot_duration}
                    onChange={(e) => setPeriodForm(prev => ({ ...prev, slot_duration: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="15">15 mins</option>
                    <option value="30">30 mins</option>
                    <option value="45">45 mins</option>
                    <option value="60">60 mins</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePeriodModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow"
                >
                  Create Viva Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT VIVA SLOT */}
      {showEditScheduleModal && editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Viva Schedule Slot</h3>
                <p className="text-xs text-slate-500">{editingSchedule.students?.student_name} ({editingSchedule.students?.cb_no})</p>
              </div>
              <button onClick={() => setShowEditScheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSchedule} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingSchedule.date || ""}
                    onChange={(e) => setEditingSchedule(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editingSchedule.time || ""}
                    onChange={(e) => setEditingSchedule(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Attendance Mode</label>
                  <select
                    value={editingSchedule.attendance_mode || "PHYSICAL"}
                    onChange={(e) => setEditingSchedule(prev => ({ ...prev, attendance_mode: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="PHYSICAL">Physical</option>
                    <option value="ONLINE">Online</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Venue</label>
                  <input
                    type="text"
                    value={editingSchedule.venue || ""}
                    onChange={(e) => setEditingSchedule(prev => ({ ...prev, venue: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">OneDrive Student Report Link</label>
                <input
                  type="url"
                  placeholder="https://apiit.sharepoint.com/..."
                  value={editingSchedule.report_link || ""}
                  onChange={(e) => setEditingSchedule(prev => ({ ...prev, report_link: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Microsoft Teams Link</label>
                <input
                  type="url"
                  placeholder="https://teams.microsoft.com/..."
                  value={editingSchedule.teams_join_url || ""}
                  onChange={(e) => setEditingSchedule(prev => ({ ...prev, teams_join_url: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg">
                ⚠️ Modifying date, time, or venue will automatically reset supervisor & assessor confirmation status to <strong>Pending</strong> so they can re-verify.
              </p>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditScheduleModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM FINALIZATION */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4 text-emerald-600">
              <CheckCircle2 className="w-7 h-7" />
              <h3 className="text-lg font-bold text-slate-900">Confirm Finalization</h3>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <p>
                You are about to finalize <strong>{selectedPeriod?.name}</strong> containing <strong>{schedules.length}</strong> Viva sessions.
              </p>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5 font-medium">
                <p>✓ Outlook Calendar Events will be created/synchronized for all examiners and students.</p>
                <p>✓ Microsoft Teams meeting links will be attached to all online Viva sessions.</p>
                <p>✓ Finalized schedules will become visible to students, supervisors, assessors, and PM.</p>
                <p>✓ Schedule will be locked against unauthorized modifications.</p>
              </div>

              {checklist?.warnings?.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-1">
                  <p className="font-bold">Reminders before proceeding:</p>
                  {checklist.warnings.map((w, i) => (
                    <p key={i}>• {w}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-5 border-t border-slate-100 flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-semibold text-xs"
              >
                Go Back
              </button>
              <button
                onClick={handleFinalizeSchedule}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Finalize & Sync Outlook Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUGGEST ALTERNATIVE DATE/TIME */}
      {showSuggestAltModal && activeChangeReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Suggest Alternative Slot</h3>
            <p className="text-xs text-slate-500 mb-4">Propose another date and time to the participant.</p>

            <div className="space-y-3 text-xs">
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

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowSuggestAltModal(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleResolveChange(activeChangeReq.id, "SUGGEST_ALTERNATIVE", altDate, altTime)}
                disabled={!altDate || !altTime || actionLoading}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Send Alternative
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}