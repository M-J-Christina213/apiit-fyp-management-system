import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardCard from '../../components/common/DashboardCard';
import DataTable from '../../components/common/DataTable';
import {
  getStudents,
  saveStudents,
  getSupervisors,
  saveSupervisors,
  getProposalRequests,
  saveProposalRequests,
  getLoggedInUser,
  getStats
} from '../../../../server/data/mockData';
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
  Edit2
} from 'lucide-react';

const SupervisorDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const [students, setStudents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);

  // Profile edit states
  const [expertise, setExpertise] = useState('');
  const [interests, setInterests] = useState('');
  const [slots, setSlots] = useState(0);

  useEffect(() => {
    const activeUser = getLoggedInUser();
    if (activeUser) {
      setCurrentUser(activeUser);
    }

    setStudents(getStudents());
    setSupervisors(getSupervisors());
    setProposals(getProposalRequests());
  }, [path]);

  // Retrieve Dr Alan Smith profile record
  const supervisorRecord = supervisors.find(s => s.id === 'S001') || {
    id: 'S001',
    title: 'Dr.',
    name: 'Alan Smith',
    email: 'asmith@apiit.lk',
    expertise: 'Artificial Intelligence, Machine Learning',
    interests: 'Deep Learning, NLP',
    slots: 2,
    status: 'Available'
  };

  useEffect(() => {
    if (supervisorRecord) {
      setExpertise(supervisorRecord.expertise);
      setInterests(supervisorRecord.interests);
      setSlots(supervisorRecord.slots);
    }
  }, [supervisors]);

  // Filter current supervisor's students
  const myStudents = students.filter(s => s.supervisor && s.supervisor.includes(supervisorRecord.name));

  // Proposal request evaluation actions
  const handleProposalAction = (proposalId, status) => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    // Update proposal status
    const updatedProposals = proposals.map(p =>
      p.id === proposalId ? { ...p, status } : p
    );
    saveProposalRequests(updatedProposals);
    setProposals(updatedProposals);

    // If approved, assign supervisor and decrease their slots
    if (status === 'Approved') {
      const updatedStudents = students.map(s =>
        s.id === proposal.studentNumber
          ? { ...s, status: 'Assigned', supervisor: `${supervisorRecord.title} ${supervisorRecord.name}`, topic: proposal.topic }
          : s
      );
      saveStudents(updatedStudents);
      setStudents(updatedStudents);

      const updatedSupervisors = supervisors.map(s =>
        s.id === supervisorRecord.id
          ? { ...s, slots: Math.max(0, s.slots - 1), status: Math.max(0, s.slots - 1) === 0 ? 'Full' : 'Available' }
          : s
      );
      saveSupervisors(updatedSupervisors);
      setSupervisors(updatedSupervisors);
    } else if (status === 'Rejected') {
      const updatedStudents = students.map(s =>
        s.id === proposal.studentNumber
          ? { ...s, status: 'Unassigned', supervisor: null }
          : s
      );
      saveStudents(updatedStudents);
      setStudents(updatedStudents);
    }
  };

  // Profile Save
  const handleProfileSave = (e) => {
    e.preventDefault();
    const updatedSupervisors = supervisors.map(s =>
      s.id === supervisorRecord.id
        ? { ...s, expertise, interests, slots: parseInt(slots) || 0, status: (parseInt(slots) || 0) === 0 ? 'Full' : 'Available' }
        : s
    );
    saveSupervisors(updatedSupervisors);
    setSupervisors(updatedSupervisors);
    setEditingProfile(false);
    alert("Profile configurations saved successfully.");
  };

  // Columns definition
  const proposalColumns = [
    { header: 'Student Name', accessor: 'studentName' },
    { header: 'Student Number', accessor: 'studentNumber' },
    { header: 'Tentative Topic', accessor: 'topic' },
    { header: 'Submission Date', accessor: 'date' },
    {
      header: 'Status',
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${row.status === 'Approved' ? 'bg-green-50 text-green-700 border border-green-200' :
            row.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
              'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
          {row.status}
        </span>
      )
    },
    {
      header: 'Evaluation Actions',
      render: (row) => (
        row.status === 'Pending' ? (
          <div className="flex gap-2">
            <button
              onClick={() => handleProposalAction(row.id, 'Approved')}
              className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors"
            >
              <Check className="h-3 w-3" /> Approve
            </button>
            <button
              onClick={() => handleProposalAction(row.id, 'Rejected')}
              className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors"
            >
              <X className="h-3 w-3" /> Reject
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-semibold italic">Processed</span>
        )
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
        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-navy-50 text-navy-800 border border-navy-100">
          {row.status}
        </span>
      )
    }
  ];

  const renderContent = () => {
    // ---------------- SUPERVISOR DASHBOARD TAB ----------------
    if (path === '/supervisor/dashboard' || path === '/supervisor') {
      const pendingProposalsCount = proposals.filter(p => p.status === 'Pending').length;
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800">Supervisor Dashboard</h1>
            <span className="text-sm text-slate-500 font-medium">{supervisorRecord.title} {supervisorRecord.name}</span>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <DashboardCard
              title="Current Supervisees"
              value={myStudents.length}
              subtitle="Active academic match"
              icon={Users}
            />
            <DashboardCard
              title="Available Slots"
              value={supervisorRecord.slots}
              subtitle="Remaining match capacity"
              icon={UserPlus}
            />
            <DashboardCard
              title="Pending Proposals"
              value={pendingProposalsCount}
              subtitle="Awaiting topic review"
              icon={FileSignature}
            />
            <DashboardCard
              title="Active Batches"
              value="2"
              subtitle="2024-Feb, 2024-Sep"
              icon={Layers}
            />
          </div>

          <div className="space-y-6">
            {/* Proposal Requests */}
            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-[#0C2340]">Proposal Requests</h3>
                <button
                  onClick={() => navigate('/supervisor/requests')}
                  className="text-xs font-bold text-navy-600 hover:text-navy-800"
                >
                  View All Requests
                </button>
              </div>
              <DataTable columns={proposalColumns} data={proposals} />
            </div>

            {/* My Students Overview */}
            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-[#0C2340]">My Assigned Supervisees</h3>
                <button
                  onClick={() => navigate('/supervisor/students')}
                  className="text-xs font-bold text-navy-600 hover:text-navy-800"
                >
                  View Student Records
                </button>
              </div>
              <DataTable columns={studentOverviewColumns} data={myStudents} />
            </div>
          </div>
        </div>
      );
    }

    // ---------------- PROPOSAL REQUESTS TAB ----------------
    if (path === '/supervisor/requests') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Proposal Evaluation Queue</h1>
            <p className="text-sm text-slate-500">Review student-submitted fyp proposal documents, topic abstracts, and approve or decline allocations.</p>
          </div>

          <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
            <DataTable columns={proposalColumns} data={proposals} />
          </div>
        </div>
      );
    }

    // ---------------- MY STUDENTS TAB ----------------
    if (path === '/supervisor/students') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">My Supervisees</h1>
            <p className="text-sm text-slate-500">List of students currently assigned to you for fyp project guidance.</p>
          </div>

          <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
            <DataTable columns={studentOverviewColumns} data={myStudents} />
          </div>
        </div>
      );
    }

    // ---------------- PROFILE CONFIG TAB ----------------
    if (path === '/supervisor/profile') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Supervisor Profile Configuration</h1>
            <p className="text-sm text-slate-500">Manage your research interests, areas of expertise, and available project allocation slots.</p>
          </div>

          <div className="bg-white p-6 rounded border border-slate-200 shadow-sm max-w-3xl">
            <div className="flex flex-col sm:flex-row gap-6 items-start pb-6 border-b border-slate-200 mb-6">
              <div className="h-20 w-20 bg-navy-50 text-navy-900 border border-navy-100 rounded flex items-center justify-center font-bold text-3xl">
                {supervisorRecord.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-800">{supervisorRecord.title} {supervisorRecord.name}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 font-medium"><Mail className="h-4 w-4 text-slate-400" /> {supervisorRecord.email}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 font-medium"><Award className="h-4 w-4 text-slate-400" /> Academic Supervisor (APIIT School of Computing)</p>
              </div>
            </div>

            {editingProfile ? (
              <form onSubmit={handleProfileSave} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Expertise Areas (separated by comma)</label>
                  <input
                    type="text"
                    required
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    className="block w-full p-2.5 bg-white border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Research Interests (separated by comma)</label>
                  <input
                    type="text"
                    required
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    className="block w-full p-2.5 bg-white border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Available FYP Match Slots</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={12}
                    value={slots}
                    onChange={(e) => setSlots(e.target.value)}
                    className="block w-32 p-2.5 bg-white border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded text-sm font-semibold transition-colors"
                  >
                    Save Profile Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExpertise(supervisorRecord.expertise);
                      setInterests(supervisorRecord.interests);
                      setSlots(supervisorRecord.slots);
                      setEditingProfile(false);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Expertise Areas</h4>
                    <p className="text-sm text-slate-700 font-semibold">{supervisorRecord.expertise}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Research Interests</h4>
                    <p className="text-sm text-slate-700 font-semibold">{supervisorRecord.interests}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Available Slots</h4>
                    <p className="text-sm text-slate-700 font-bold">{supervisorRecord.slots} remaining / Cap: 6</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${supervisorRecord.status === 'Available' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                      {supervisorRecord.status}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:border-navy-900 text-slate-700 hover:text-navy-900 rounded text-sm font-bold transition-colors bg-white"
                  >
                    <Edit2 className="h-4 w-4" /> Edit Profile Details
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ---------------- NOTIFICATIONS TAB ----------------
    if (path === '/supervisor/notifications') {
      const activeNotifications = [
        { id: 1, type: 'Proposal', title: 'New Proposal Assigned', message: `Student Fiona Gallagher has submitted a research proposal draft on "Distributed Ledger Databases" nominating you as supervisor.`, date: '2026-06-12' },
        { id: 2, type: 'Milestone', title: 'Batch 2024-Feb Update', message: 'Evaluation Rubric v2.1 has been published. Please align progress report grading accordingly.', date: '2026-06-10' }
      ];

      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Inbox Notifications</h1>
            <p className="text-sm text-slate-500">Track student submissions, milestone allocations, and updates from the fyp coordinator.</p>
          </div>

          <div className="space-y-4">
            {activeNotifications.map((n) => (
              <div key={n.id} className="bg-white p-5 rounded border border-slate-200 shadow-sm flex items-start gap-4">
                <div className="p-2.5 bg-navy-50 text-navy-900 rounded">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">{n.title}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{n.type}</span>
                  </div>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{n.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return renderContent();
};

export default SupervisorDashboard;
