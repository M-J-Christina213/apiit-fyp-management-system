import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardCard from '../../components/common/DashboardCard';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';

import {
  Users,
  UserPlus,
  FileSignature,
  Layers,
  Check,
  X,
  Clock,
  BookOpen,
  Mail,
  Bell,
  Award,
  Edit2,
  FileText,
  ChevronDown,
  ChevronUp,
  Upload,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  AlertTriangle
} from 'lucide-react';

import {
  getSupervisors,
  getStudents,
  getProposalRequests,
  getLoggedInUser,
  getSupervisorLogsheets,
  getSupervisorStudents,
  approveLogsheet,
  rejectLogsheet,
  uploadSignature
} from "../../services/api.js";

const SupervisorDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const [students, setStudents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [dbNotifications, setDbNotifications] = useState([]);

  // Profile edit states
  const [expertise, setExpertise] = useState('');
  const [interests, setInterests] = useState('');
  const [slots, setSlots] = useState(0);

  // Proposal states
  const [proposalRequests, setProposalRequests] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Logsheet states
  const [supervisorLogsheets, setSupervisorLogsheets] = useState([]);
  const [supervisorStudents, setSupervisorStudents] = useState([]);
  const [expandedStudents, setExpandedStudents] = useState({});
  const [logsheetLoading, setLogsheetLoading] = useState(false);
  const [selectedLogsheet, setSelectedLogsheet] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [logsheetRejectionReason, setLogsheetRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Signature states
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const signatureInputRef = useRef(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const activeUser = getLoggedInUser();
        if (activeUser) setCurrentUser(activeUser);

        const [stuRes, supRes] = await Promise.all([getStudents(), getSupervisors()]);
        setStudents(stuRes.data);
        setSupervisors(supRes.data);

        if (activeUser?.id) {
          try {
            const notifRes = await fetch(`http://localhost:5000/api/notifications/${activeUser.id}`);
            if (notifRes.ok) {
              const notifData = await notifRes.json();
              setDbNotifications(notifData);
            }
          } catch (notifErr) {
            console.error("Failed to load notifications:", notifErr);
          }
        }

        const supRecord = Array.isArray(supRes.data)
          ? supRes.data.find(s => s.email === activeUser?.email)
          : null;

        if (supRecord) {
          setSignatureUrl(supRecord.signature_url || null);
          const res = await axios.get(`http://localhost:5000/api/proposals/supervisor/${supRecord.id}`);
          setProposalRequests(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
  }, [path]);

  const supervisorRecord = Array.isArray(supervisors)
    ? supervisors.find(s => s.email === currentUser?.email)
    : null;

  const currentSupervisor = supervisorRecord || {
    id: null,
    title: "Mr.",
    name: "Supervisor",
    email: currentUser?.email || "",
    expertise: "",
    interests: "",
    slots: 0,
    status: "Available"
  };

  const supervisorId = currentSupervisor?.id;

  // Load logsheets when on logsheets or dashboard tab
  useEffect(() => {
    if ((path !== "/supervisor/logsheets" && path !== "/supervisor/dashboard" && path !== "/supervisor") || !supervisorId) return;
    loadLogsheets();
  }, [path, supervisorId]);

  const loadLogsheets = async () => {
    setLogsheetLoading(true);
    try {
      const [logsRes, studRes] = await Promise.all([
        getSupervisorLogsheets({ supervisorId }),
        getSupervisorStudents({ supervisorId })
      ]);
      setSupervisorLogsheets(logsRes.data);
      setSupervisorStudents(studRes.data);
    } catch (err) {
      console.error("Failed to load supervisor logsheets:", err);
    } finally {
      setLogsheetLoading(false);
    }
  };

  useEffect(() => {
    if (path !== "/supervisor/requests" || !supervisorId || isNaN(Number(supervisorId))) return;
    fetchProposalRequests();
  }, [path, supervisorId]);

  const fetchProposalRequests = async () => {
    if (!supervisorId || isNaN(Number(supervisorId))) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/proposals/supervisor/${supervisorId}`);
      setProposalRequests(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (supervisorRecord) {
      setExpertise(supervisorRecord.expertise || '');
      setInterests(supervisorRecord.interests || supervisorRecord.research_interests || '');
      setSlots(supervisorRecord.preferred_supervision_slots || supervisorRecord.slots || 0);
      setSignatureUrl(supervisorRecord.signature_url || null);
    }
  }, [supervisors]);

  const myStudents = students.filter(
    s => s.supervisor === `${supervisorRecord?.title || ''} ${supervisorRecord?.name || ''}`.trim() ||
         s.supervisor === supervisorRecord?.name ||
         s.supervisorId == supervisorRecord?.id
  );

  const pendingProposalsCount = proposals.filter(p => p.status === 'Pending').length;

  // ─── Proposal Actions ───────────────────────────────────────────────────────
  const handleViewProposal = (proposal) => {
    setSelectedProposal(proposal);
    setShowProposalModal(true);
  };

  const handleApproveProposal = async (id) => {
    if (!window.confirm("Approve this proposal?")) return;
    try {
      await axios.patch(`http://localhost:5000/api/proposals/${id}/approve`);
      fetchProposalRequests();
    } catch (err) {
      alert("Failed to approve proposal.");
    }
  };

  const handleRejectProposal = async () => {
    if (rejectionReason.trim() === "") return alert("Please enter a rejection reason.");
    try {
      await axios.patch(`http://localhost:5000/api/proposals/${selectedProposal.id}/reject`, { reason: rejectionReason });
      setShowProposalModal(false);
      setRejectionReason("");
      fetchProposalRequests();
    } catch (err) {
      alert("Failed to reject proposal.");
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/supervisors/${supervisorRecord.id}`, {
        expertise,
        research_interests: interests,
        preferred_supervision_slots: parseInt(slots) || 0
      });
      const supRes = await getSupervisors();
      setSupervisors(supRes.data);
      setEditingProfile(false);
      showToast("Profile saved successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile.");
    }
  };

  // ─── Logsheet Actions ───────────────────────────────────────────────────────
  const toggleStudentExpand = (studentId) => {
    setExpandedStudents(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const handleViewLogsheet = (log) => {
    setSelectedLogsheet(log);
    setShowViewModal(true);
  };

  const handleApproveLogsheet = async (log) => {
    if (!window.confirm(`Approve logsheet for ${log.student_name}?`)) return;
    setActionLoading(true);
    try {
      await approveLogsheet(log.id, { supervisorId });
      showToast("Logsheet approved successfully.");
      await loadLogsheets();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to approve logsheet.";
      showToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectLogsheetOpen = (log) => {
    setSelectedLogsheet(log);
    setLogsheetRejectionReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!logsheetRejectionReason.trim()) {
      showToast("Please provide a rejection reason.", "error");
      return;
    }
    setActionLoading(true);
    try {
      await rejectLogsheet(selectedLogsheet.id, { rejection_reason: logsheetRejectionReason });
      setShowRejectModal(false);
      setLogsheetRejectionReason("");
      showToast("Logsheet rejected. Student has been notified.");
      await loadLogsheets();
    } catch (err) {
      showToast("Failed to reject logsheet.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Signature Upload ────────────────────────────────────────────────────────
  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!supervisorId) {
      showToast("Supervisor record not found. Cannot upload signature.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("signature", file);
    formData.append("supervisorId", supervisorId);

    setSignatureUploading(true);
    try {
      const res = await uploadSignature(formData);
      setSignatureUrl(res.data.signature_url);
      const supRes = await getSupervisors();
      setSupervisors(supRes.data);
      showToast("Digital signature uploaded successfully.");
    } catch (err) {
      showToast("Failed to upload signature. Please try again.", "error");
    } finally {
      setSignatureUploading(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const map = {
      "Pending Review": "bg-amber-50 text-amber-700 border-amber-200",
      "Approved": "bg-emerald-50 text-emerald-700 border-emerald-200",
      "Rejected": "bg-red-50 text-red-700 border-red-200"
    };
    return map[status] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getSemesterStyle = (semester) => {
    if (semester === "Semester 1") return { header: "bg-blue-50 border-blue-200 text-blue-800", badge: "bg-blue-100 text-blue-700" };
    if (semester === "Semester 2") return { header: "bg-amber-50 border-amber-200 text-amber-800", badge: "bg-amber-100 text-amber-700" };
    return { header: "bg-emerald-50 border-emerald-200 text-emerald-800", badge: "bg-emerald-100 text-emerald-700" };
  };

  // ─── Column definitions ───────────────────────────────────────────────────────
  const proposalColumns = [
    {
      header: "Student",
      render: (row) => (
        <div>
          <p className="font-semibold">{row.students?.student_name || "N/A"}</p>
          <p className="text-xs text-slate-500">{row.students?.cb_no || "N/A"}</p>
        </div>
      )
    },
    { header: "Topic", accessor: "proposed_topic" },
    { header: "Submitted", render: (row) => new Date(row.submitted_at).toLocaleDateString() },
    {
      header: "Status",
      render: (row) => {
        const colors = {
          Pending: "bg-yellow-100 text-yellow-700",
          Approved: "bg-green-100 text-green-700",
          Rejected: "bg-red-100 text-red-700"
        };
        return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[row.status] || "bg-slate-100 text-slate-600"}`}>{row.status}</span>;
      }
    },
    {
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <button onClick={() => handleViewProposal(row)} className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-sm">View</button>
          {row.status === "Pending" && (
            <>
              <button onClick={() => handleApproveProposal(row.id)} className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-sm">Approve</button>
              <button onClick={() => { setSelectedProposal(row); setShowProposalModal(true); }} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm">Reject</button>
            </>
          )}
        </div>
      )
    }
  ];

  const studentOverviewColumns = [
    { header: 'Student Name', accessor: 'name' },
    { header: 'Student ID', accessor: 'id' },
    { header: 'Batch Group', accessor: 'batch' },
    { header: 'Assigned Project Topic', accessor: 'topic' },
    {
      header: 'Project Stage',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-navy-50 text-navy-800 border border-navy-100">{row.status}</span>
      )
    }
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────
  const renderContent = () => {

    // ── DASHBOARD TAB ──────────────────────────────────────────────────────────
    if (path === '/supervisor/dashboard' || path === '/supervisor') {
      const pCount = proposalRequests.filter(p => p.status === 'Pending').length;
      const pendingLogsCount = supervisorLogsheets.filter(l => l.status === 'Pending Review').length;
      const attentionRequiredCount = pCount + pendingLogsCount;

      // Enhanced supervisee columns with logsheet status
      const enhancedStudentColumns = [
        {
          header: 'Student',
          render: (row) => (
            <div>
              <p className="font-semibold text-slate-800">{row.name}</p>
              <p className="text-xs text-slate-500">{row.id}</p>
            </div>
          )
        },
        { header: 'Project Topic', render: (row) => row.topic || <span className="text-slate-400 italic">No topic defined</span> },
        { header: 'Intake / Batch', render: (row) => row.batch || '-' },
        {
          header: 'Project Stage',
          render: (row) => (
            <StatusBadge status={row.status || 'Proposal'} type="stage" />
          )
        },
        {
          header: 'Logsheets Info',
          render: (row) => {
            const studentLogs = supervisorLogsheets.filter(l => l.student_id === row.id);
            const pendingStudentLogs = studentLogs.filter(l => l.status === 'Pending Review').length;
            return (
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="text-slate-600">{studentLogs.length} total</span>
                {pendingStudentLogs > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded">
                    {pendingStudentLogs} pending
                  </span>
                )}
              </div>
            );
          }
        }
      ];

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Welcome back, {currentSupervisor.title} {currentSupervisor.name}</h1>
              <p className="text-sm text-slate-500 mt-1">Overview of your academic supervisees and pending actions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <DashboardCard title="Assigned Supervisees" value={myStudents.length} subtitle="Direct guidance" icon={Users} />
            <DashboardCard title="Available Slots" value={currentSupervisor.slots || currentSupervisor.preferred_supervision_slots || 0} subtitle="Remaining capacity" icon={UserPlus} />
            <DashboardCard title="Pending Proposals" value={pCount} subtitle="Topic reviews required" icon={FileSignature} />
            <DashboardCard title="Pending Logsheets" value={pendingLogsCount} subtitle="Awaiting approval signature" icon={Clock} />
          </div>

          {/* Attention Required Section */}
          {attentionRequiredCount > 0 && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-bold text-amber-800">Attention Required ({attentionRequiredCount})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pCount > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-amber-100 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-850">{pCount} Proposal Requests Pending</p>
                      <p className="text-xs text-slate-500 mt-0.5">Students awaiting supervisor confirmation</p>
                    </div>
                    <button
                      onClick={() => navigate('/supervisor/requests')}
                      className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700 transition"
                    >
                      Review
                    </button>
                  </div>
                )}
                {pendingLogsCount > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-amber-100 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-850">{pendingLogsCount} Meeting Logsheets Pending</p>
                      <p className="text-xs text-slate-500 mt-0.5">Logsheets awaiting review and signature approval</p>
                    </div>
                    <button
                      onClick={() => navigate('/supervisor/logsheets')}
                      className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700 transition"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* My Students Overview */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">My Supervised Students</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Live list of active students assigned to you</p>
                  </div>
                  <button 
                    onClick={() => navigate('/supervisor/students')} 
                    className="text-xs font-bold text-navy-600 hover:text-navy-800"
                  >
                    View All Students
                  </button>
                </div>
                <div className="p-0">
                  <DataTable columns={enhancedStudentColumns} data={myStudents} />
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-800">Quick Profile Actions</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Digital Signature Status</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{signatureUrl ? 'Active' : 'Missing Signature'}</p>
                    </div>
                    <button
                      onClick={() => navigate('/supervisor/profile')}
                      className={`text-xs px-2.5 py-1.5 rounded font-bold border ${signatureUrl ? 'border-slate-350 hover:bg-slate-100' : 'bg-[#0C2340] text-white'}`}
                    >
                      {signatureUrl ? 'Manage' : 'Upload'}
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Supervision Capacity</p>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">{currentSupervisor.preferred_supervision_slots ?? 0} slots</p>
                    </div>
                    <button
                      onClick={() => navigate('/supervisor/profile')}
                      className="text-xs px-2.5 py-1.5 border border-slate-350 hover:bg-slate-100 rounded font-bold"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── PROPOSAL REQUESTS TAB ────────────────────────────────────────────────
    if (path === "/supervisor/requests") {
      const pending = proposalRequests.filter(p => p.status === "Pending").length;
      const approved = proposalRequests.filter(p => p.status === "Approved").length;
      const rejected = proposalRequests.filter(p => p.status === "Rejected").length;
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Proposal Requests</h1>
            <p className="text-slate-500 mt-1">Review, evaluate and respond to Final Year Project proposals submitted by students.</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-yellow-50 border rounded-lg p-4"><p className="text-sm text-slate-500">Pending</p><p className="text-3xl font-bold text-yellow-600">{pending}</p></div>
            <div className="bg-green-50 border rounded-lg p-4"><p className="text-sm text-slate-500">Approved</p><p className="text-3xl font-bold text-green-600">{approved}</p></div>
            <div className="bg-red-50 border rounded-lg p-4"><p className="text-sm text-slate-500">Rejected</p><p className="text-3xl font-bold text-red-600">{rejected}</p></div>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <DataTable columns={proposalColumns} data={proposalRequests} />
          </div>
        </div>
      );
    }

    // ── MY STUDENTS TAB ──────────────────────────────────────────────────────
    if (path === '/supervisor/students') {
      const supervisedStudents = students.filter(s => s.supervisor === currentSupervisor.name || s.supervisor === `${currentSupervisor.title || ''} ${currentSupervisor.name}`.trim() || s.supervisorId == currentSupervisor.id);
      const assessedStudents = students.filter(s => s.assessor === currentSupervisor.name || s.assessor === `${currentSupervisor.title || ''} ${currentSupervisor.name}`.trim() || s.assessorId == currentSupervisor.id);

      const studentColumns = [
        { header: 'Student Number', accessor: 'id' },
        { header: 'Student Name', accessor: 'name' },
        { header: 'Batch Intake', render: (row) => row.intake || row.batch || '-' },
        { header: 'Project Topic', render: (row) => row.topic || 'Tentative Topic' },
        { header: 'Confirmation Status', render: (row) => (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            row.supervisorConfirmationStatus === 'Confirmed' || row.supervisorConfirmationStatus === 'Allocated'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {row.supervisorConfirmationStatus || 'Confirmed'}
          </span>
        )}
      ];

      return (
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">My Students Dashboard</h1>
            <p className="text-sm text-slate-500">Overview of students under your direct project supervision and assessment allocation.</p>
          </div>

          {/* Section 1: Supervised Students */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="h-5 w-5 text-navy-700" /> Section 1: Supervised Students ({supervisedStudents.length})
                </h2>
                <p className="text-xs text-slate-500">Students assigned to you for ongoing FYP project guidance and logsheet approvals.</p>
              </div>
            </div>
            <DataTable columns={studentColumns} data={supervisedStudents} />
          </div>

          {/* Section 2: Assessed Students */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-700" /> Section 2: Assessed Students ({assessedStudents.length})
                </h2>
                <p className="text-xs text-slate-500">Students assigned to you as an independent evaluator/assessor.</p>
              </div>
            </div>
            <DataTable columns={studentColumns} data={assessedStudents} />
          </div>
        </div>
      );
    }

    // ── LOGSHEETS TAB ─────────────────────────────────────────────────────────
    if (path === '/supervisor/logsheets') {
      // Group logsheets by student
      const logsByStudent = {};
      supervisorStudents.forEach(s => { logsByStudent[s.id] = { student: s, logsheets: [] }; });
      supervisorLogsheets.forEach(log => {
        if (logsByStudent[log.student_id]) {
          logsByStudent[log.student_id].logsheets.push(log);
        } else {
          logsByStudent[log.student_id] = {
            student: { id: log.student_id, student_name: log.student_name, cb_no: log.student_cb_no },
            logsheets: [log]
          };
        }
      });

      const groups = Object.values(logsByStudent);

      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Logsheet Review</h1>
            <p className="text-slate-500 mt-1">Review and approve meeting logsheets submitted by your supervised students.</p>
          </div>



          {logsheetLoading ? (
            <div className="flex justify-center items-center h-64 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading logsheets…
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No logsheets submitted by your students yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(({ student, logsheets }) => {
                const isExpanded = expandedStudents[student.id] !== false; // default expanded
                const pendingCount = logsheets.filter(l => l.status === "Pending Review").length;
                const approvedCount = logsheets.filter(l => l.status === "Approved").length;
                const rejectedCount = logsheets.filter(l => l.status === "Rejected").length;

                // Group by semester
                const bySemester = {};
                logsheets.forEach(l => {
                  const sem = l.semester || "Semester 1";
                  if (!bySemester[sem]) bySemester[sem] = [];
                  bySemester[sem].push(l);
                });

                return (
                  <div key={student.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Student header */}
                    <button
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
                      onClick={() => toggleStudentExpand(student.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-[#0C2340] text-white flex items-center justify-center font-bold text-sm">
                          {(student.student_name || "?").charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{student.student_name}</p>
                          <p className="text-xs text-slate-500">{student.cb_no || student.student_cb_no}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">{pendingCount} pending</span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">{approvedCount} approved</span>
                        {rejectedCount > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">{rejectedCount} rejected</span>}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </button>

                    {/* Logsheet tables */}
                    {isExpanded && (
                      <div className="border-t border-slate-100">
                        {logsheets.length === 0 ? (
                          <div className="px-6 py-8 text-center text-sm text-slate-400">No logsheets submitted yet.</div>
                        ) : (
                          Object.entries(bySemester).map(([semester, logs]) => {
                            const semStyle = getSemesterStyle(semester);
                            const stageLabel = semester === "Semester 1" ? "Proposal Stage" : semester === "Semester 2" ? "Midpoint Stage" : "Final Stage";
                            return (
                              <div key={semester}>
                                <div className={`px-6 py-2.5 border-b ${semStyle.header} flex items-center gap-3`}>
                                  <span className="text-xs font-bold uppercase tracking-wide">{semester}</span>
                                  <span className="text-xs opacity-70">— {stageLabel}</span>
                                </div>
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                                    <tr>
                                      <th className="text-left px-6 py-3">Meeting Date</th>
                                      <th className="text-left px-6 py-3">Venue</th>
                                      <th className="text-left px-6 py-3">Status</th>
                                      <th className="text-left px-6 py-3">File</th>
                                      <th className="text-left px-6 py-3">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {logs.map((log, idx) => (
                                      <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50 transition">
                                        <td className="px-6 py-3 text-slate-700">{new Date(log.meeting_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-3 text-slate-600">{log.venue || <span className="text-slate-400 italic">—</span>}</td>
                                        <td className="px-6 py-3">
                                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getStatusBadge(log.status)}`}>{log.status}</span>
                                        </td>
                                        <td className="px-6 py-3">
                                          <a
                                            href={`http://localhost:5000/uploads/logsheets/${log.signed_file_url || log.file_path}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                                          >
                                            <FileText className="h-3.5 w-3.5" />
                                            {log.file_name?.length > 20 ? log.file_name.slice(0, 20) + "…" : log.file_name}
                                          </a>
                                        </td>
                                        <td className="px-6 py-3">
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => handleViewLogsheet(log)}
                                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                            >
                                              <Eye className="h-3.5 w-3.5" /> View
                                            </button>
                                            {log.status === "Pending Review" && (
                                              <>
                                                <button
                                                  onClick={() => handleApproveLogsheet(log)}
                                                  disabled={actionLoading}
                                                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-60"
                                                >
                                                  <CheckCircle className="h-3.5 w-3.5" /> Approve
                                                </button>
                                                <button
                                                  onClick={() => handleRejectLogsheetOpen(log)}
                                                  disabled={actionLoading}
                                                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-60"
                                                >
                                                  <XCircle className="h-3.5 w-3.5" /> Reject
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // ── PROFILE CONFIG TAB ────────────────────────────────────────────────────
    if (path === '/supervisor/profile') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Supervisor Profile Configuration</h1>
            <p className="text-sm text-slate-500">Manage your research interests, areas of expertise, available slots and digital signature.</p>
          </div>

          <div className="bg-white p-6 rounded border border-slate-200 shadow-sm max-w-3xl">
            {/* Avatar + Name */}
            <div className="flex flex-col sm:flex-row gap-6 items-start pb-6 border-b border-slate-200 mb-6">
              <div className="h-20 w-20 bg-navy-50 text-navy-900 border border-navy-100 rounded flex items-center justify-center font-bold text-3xl">
                {currentSupervisor.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-800">{currentSupervisor.title} {currentSupervisor.name}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 font-medium"><Mail className="h-4 w-4 text-slate-400" /> {currentSupervisor.email}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 font-medium"><Award className="h-4 w-4 text-slate-400" /> Academic Supervisor (APIIT School of Computing)</p>
              </div>
            </div>

            {/* Digital Signature Section */}
            <div className="mb-6 pb-6 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-[#0C2340]" /> Digital Signature
              </h3>
              {signatureUrl ? (
                <div className="flex items-start gap-5">
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-3">
                    <img
                      src={`http://localhost:5000/uploads/signatures/${signatureUrl}`}
                      alt="Your Signature"
                      className="h-16 object-contain"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Signature uploaded</p>
                    <p className="text-xs text-slate-500">Your signature is saved in your profile.</p>
                    <button
                      onClick={() => signatureInputRef.current?.click()}
                      className="text-xs px-3 py-1.5 border border-slate-300 hover:border-[#0C2340] text-slate-600 rounded-lg transition"
                    >
                      Replace Signature
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-[#0C2340] transition-colors cursor-pointer" onClick={() => signatureInputRef.current?.click()}>
                  {signatureUploading ? (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-sm">Uploading signature…</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Upload className="h-8 w-8" />
                      <p className="text-sm font-medium text-slate-600">Click to upload digital signature</p>
                      <p className="text-xs">PNG or JPG, max 2MB. Required to approve logsheets.</p>
                    </div>
                  )}
                </div>
              )}
              <input
                ref={signatureInputRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={handleSignatureUpload}
              />
            </div>

            {/* Profile Form */}
            {editingProfile ? (
              <form onSubmit={handleProfileSave} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Expertise Areas (separated by comma)</label>
                  <input type="text" required value={expertise} onChange={(e) => setExpertise(e.target.value)} className="block w-full p-2.5 bg-white border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Research Interests (separated by comma)</label>
                  <input type="text" required value={interests} onChange={(e) => setInterests(e.target.value)} className="block w-full p-2.5 bg-white border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Preferred Supervision Slots (Min: 3)</label>
                  <input type="number" required min={3} max={20} value={slots} onChange={(e) => setSlots(Math.max(3, parseInt(e.target.value, 10) || 3))} className="block w-32 p-2.5 bg-white border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="px-4 py-2 bg-[#0C2340] hover:bg-navy-950 text-white rounded text-sm font-semibold transition-colors">Save Profile Changes</button>
                  <button type="button" onClick={() => setEditingProfile(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-semibold transition-colors">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Expertise Areas</h4>
                    <p className="text-sm text-slate-700 font-semibold">{currentSupervisor.expertise || "—"}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Research Interests</h4>
                    <p className="text-sm text-slate-700 font-semibold">{currentSupervisor.research_interests || currentSupervisor.interests || "—"}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Available Slots</h4>
                    <p className="text-sm text-slate-700 font-bold">{currentSupervisor.preferred_supervision_slots ?? currentSupervisor.slots ?? 0} remaining</p>
                  </div>
                </div>
                <div className="pt-2">
                  <button onClick={() => setEditingProfile(true)} className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:border-[#0C2340] text-slate-700 hover:text-[#0C2340] rounded text-sm font-bold transition-colors bg-white">
                    <Edit2 className="h-4 w-4" /> Edit Profile Details
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── NOTIFICATIONS TAB ─────────────────────────────────────────────────────
    if (path === '/supervisor/notifications') {
      const activeNotifications = dbNotifications;
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Inbox Notifications</h1>
            <p className="text-sm text-slate-500">Track student submissions, milestone allocations, and updates from the fyp coordinator.</p>
          </div>
          <div className="space-y-4">
            {activeNotifications.map((n) => (
              <div key={n.id} className="bg-white p-5 rounded border border-slate-200 shadow-sm flex items-start gap-4">
                <div className="p-2.5 bg-navy-50 text-navy-900 rounded"><Bell className="h-5 w-5" /></div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">{n.title}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{n.is_read ? "Read" : "New"}</span>
                  </div>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderContent()}

      {/* Proposal Modal */}
      <Modal
        isOpen={showProposalModal && !!selectedProposal}
        onClose={() => { setShowProposalModal(false); setRejectionReason(""); }}
        title="Proposal Details"
        icon={FileSignature}
        footer={
          selectedProposal?.status === "Pending" && (
            <div className="flex gap-3 w-full justify-end">
              <button
                onClick={() => handleApproveProposal(selectedProposal.id)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
              >
                Approve
              </button>
              <button
                onClick={handleRejectProposal}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
              >
                Reject
              </button>
            </div>
          )
        }
      >
        {selectedProposal && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Student</p>
              <p className="font-semibold text-slate-800 mt-0.5">{selectedProposal.students?.student_name || "N/A"}</p>
              <p className="text-xs text-slate-500">{selectedProposal.students?.cb_no || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Project Topic</p>
              <p className="font-semibold text-slate-800 mt-0.5">{selectedProposal.proposed_topic}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Proposal Document</p>
              <div className="mt-1">
                <a
                  href={`http://localhost:5000/uploads/${selectedProposal.proposal_pdf}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-650 hover:bg-slate-100 font-semibold transition"
                >
                  <FileText className="h-4 w-4 text-blue-600" /> Open Proposal PDF
                </a>
              </div>
            </div>
            {selectedProposal.status === "Pending" && (
              <div className="space-y-1.5 pt-2">
                <label className="text-sm font-semibold text-slate-700">Rejection Reason</label>
                <textarea
                  rows={3}
                  placeholder="Only required if rejecting..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-slate-750 focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Logsheet View Modal */}
      <Modal
        isOpen={showViewModal && !!selectedLogsheet}
        onClose={() => setShowViewModal(false)}
        title="Logsheet Details"
        icon={FileText}
        footer={
          <button
            onClick={() => setShowViewModal(false)}
            className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
          >
            Close
          </button>
        }
      >
        {selectedLogsheet && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Student</p>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedLogsheet.student_name}</p>
                <p className="text-xs text-slate-500">{selectedLogsheet.student_cb_no}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Meeting Date</p>
                <p className="font-semibold text-slate-800 mt-0.5">{new Date(selectedLogsheet.meeting_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Venue</p>
                <p className="text-sm font-semibold text-slate-705 mt-0.5">{selectedLogsheet.venue || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Semester</p>
                <p className="text-sm font-semibold text-slate-705 mt-0.5">{selectedLogsheet.semester}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Status</p>
                <div className="mt-1">
                  <StatusBadge status={selectedLogsheet.status} type="progress" />
                </div>
              </div>
            </div>
            {selectedLogsheet.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-bold text-red-700 mb-1">Rejection Reason</p>
                <p className="text-sm text-red-700 font-medium">{selectedLogsheet.rejection_reason}</p>
              </div>
            )}
            <div className="pt-2 border-t border-slate-100 flex justify-start">
              <a
                href={`http://localhost:5000/uploads/logsheets/${selectedLogsheet.signed_file_url || selectedLogsheet.file_path}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0C2340] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition"
              >
                <FileText className="h-4 w-4" /> Open Logsheet PDF
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Logsheet Modal */}
      <Modal
        isOpen={showRejectModal && !!selectedLogsheet}
        onClose={() => setShowRejectModal(false)}
        title="Reject Logsheet"
        icon={XCircle}
        iconBgColor="bg-red-50"
        iconTextColor="text-red-650"
        footer={
          <>
            <button
              onClick={() => setShowRejectModal(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReject}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-60 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Rejection
            </button>
          </>
        }
      >
        {selectedLogsheet && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              You are rejecting the logsheet from <span className="font-semibold text-slate-800">{selectedLogsheet.student_name}</span>. Please provide a reason so the student can resubmit.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Rejection Reason <span className="text-red-500">*</span></label>
              <textarea
                rows={4}
                placeholder="e.g. Meeting notes are incomplete, please include discussion points and outcomes…"
                value={logsheetRejectionReason}
                onChange={(e) => setLogsheetRejectionReason(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-slate-750 focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900 resize-none"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Toast notification ───────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-sm font-semibold animate-fade-in
          ${toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
          {toast.type === "error" ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}
    </>
  );
};

export default SupervisorDashboard;
