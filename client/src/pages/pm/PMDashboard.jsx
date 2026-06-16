import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardCard from '../../components/common/DashboardCard';
import DataTable from '../../components/common/DataTable';

import {
  Users,
  GraduationCap,
  FileCheck,
  Layers,
  Plus,
  Download,
  FileSpreadsheet,
  X,
  CheckCircle,
  FileText
} from 'lucide-react';

const PMDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const [students, setStudents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState({});

  // Modals state
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Form states
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDate, setNewBatchDate] = useState('');
  const [newBatchCount, setNewBatchCount] = useState('');

  // Allocation state
  const [allocStudentId, setAllocStudentId] = useState('');
  const [allocSupervisorId, setAllocSupervisorId] = useState('');
  const [allocSuccess, setAllocSuccess] = useState(false);

  useEffect(() => {
    setStudents(getStudents());
    setSupervisors(getSupervisors());
    setBatches(getBatches());
    setStats(getStats());
  }, [path]);

  // Quick Action: Add Batch
  const handleAddBatchSubmit = (e) => {
    e.preventDefault();
    if (!newBatchName || !newBatchDate || !newBatchCount) return;

    const newBatch = {
      id: 'B' + String(batches.length + 1).padStart(3, '0'),
      name: newBatchName,
      startDate: newBatchDate,
      studentCount: parseInt(newBatchCount) || 0,
      status: 'Upcoming'
    };

    const updatedBatches = [...batches, newBatch];
    saveBatches(updatedBatches);
    setBatches(updatedBatches);

    // Clear forms
    setNewBatchName('');
    setNewBatchDate('');
    setNewBatchCount('');
    setShowAddBatch(false);

    // Update stats
    setStats(getStats());
    alert(`Batch "${newBatch.name}" added successfully.`);
  };

  // Quick Action: Import Students
  const handleImportStudents = () => {
    const imported = [
      { id: 'CB008', name: 'Gary Neville', batch: '2024-Sep', status: 'Unassigned', email: 'cb008@students.apiit.lk', topic: 'Predictive Cybersecurity', supervisor: null },
      { id: 'CB009', name: 'Harry Kane', batch: '2024-Feb', status: 'Unassigned', email: 'cb009@students.apiit.lk', topic: 'Automated Code Review Systems', supervisor: null }
    ];

    const updatedStudents = [...students, ...imported];
    saveStudents(updatedStudents);
    setStudents(updatedStudents);

    setShowImport(false);
    setStats(getStats());
    alert("Imported 2 new students successfully: Gary Neville (CB008), Harry Kane (CB009).");
  };

  // Quick Action: Export Excel
  const handleExportExcel = () => {
    alert("Exporting student allocation records to fyp_allocations_export.xlsx...");
  };

  // Quick Action: Generate Report
  const handleGenerateReport = () => {
    alert("Generating FYP Supervisor Allocation Status Report (PDF)...");
  };

  // Interactive Allocation
  const handleAllocateSubmit = (e) => {
    e.preventDefault();
    if (!allocStudentId || !allocSupervisorId) {
      alert("Please select both a student and a supervisor.");
      return;
    }

    const student = students.find(s => s.id === allocStudentId);
    const supervisor = supervisors.find(s => s.id === allocSupervisorId);

    if (!student || !supervisor) return;

    // Update student
    const updatedStudents = students.map(s =>
      s.id === student.id
        ? { ...s, supervisor: `${supervisor.title} ${supervisor.name}`, status: 'Assigned' }
        : s
    );
    saveStudents(updatedStudents);
    setStudents(updatedStudents);

    // Update supervisor slots
    const updatedSupervisors = supervisors.map(s =>
      s.id === supervisor.id
        ? { ...s, slots: Math.max(0, s.slots - 1), status: Math.max(0, s.slots - 1) === 0 ? 'Full' : 'Available' }
        : s
    );
    saveSupervisors(updatedSupervisors);
    setSupervisors(updatedSupervisors);

    setAllocSuccess(true);
    setAllocStudentId('');
    setAllocSupervisorId('');

    // Refresh page data
    setTimeout(() => {
      setStudents(getStudents());
      setSupervisors(getSupervisors());
      setStats(getStats());
      setAllocSuccess(false);
    }, 1500);
  };

  // Columns Definitions
  const supervisorPoolColumns = [
    { header: 'Title', accessor: 'title' },
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Expertise Areas', accessor: 'expertise' },
    { header: 'Research Interests', accessor: 'interests' },
    {
      header: 'Available Slots',
      render: (row) => (
        <span className={`font-semibold ${row.slots > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {row.slots}
        </span>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${row.status === 'Available' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
          {row.status}
        </span>
      )
    },
  ];

  const studentAllocationColumns = [
    { header: 'Batch', accessor: 'batch' },
    { header: 'Student Name', accessor: 'name' },
    { header: 'Student Number', accessor: 'id' },
    { header: 'Tentative Topic', render: (row) => row.topic || '-' },
    { header: 'Assigned Supervisor', render: (row) => row.supervisor || '-' },
    {
      header: 'Allocation Status',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${row.supervisor ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
          {row.supervisor ? 'Assigned' : 'Unassigned'}
        </span>
      )
    },
  ];

  const renderContent = () => {
    // ---------------- PM DASHBOARD TAB ----------------
    if (path === '/pm/dashboard' || path === '/pm') {
      return (
        <div className="space-y-6">
          {/* Quick Actions Header */}
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-800">Project Manager Workspace</h1>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setShowAddBatch(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors text-xs font-bold select-none"
              >
                <Plus className="h-4 w-4 text-slate-500" /> Add Batch
              </button>

              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors text-xs font-bold select-none"
              >
                <Download className="h-4 w-4 text-slate-500" /> Import Students
              </button>

              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors text-xs font-bold select-none"
              >
                <FileSpreadsheet className="h-4 w-4 text-slate-500" /> Export Excel
              </button>

              <button
                onClick={handleGenerateReport}
                className="flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded hover:bg-navy-950 transition-colors text-xs font-bold shadow-sm select-none"
              >
                <FileCheck className="h-4 w-4" /> Generate Report
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <DashboardCard title="Total Students" value={stats.totalStudents || 0} icon={GraduationCap} />
            <DashboardCard title="Available Supervisors" value={stats.availableSupervisors || 0} icon={Users} />
            <DashboardCard title="Unassigned Students" value={stats.unassignedStudents || 0} icon={Layers} />
            <DashboardCard title="Pending Proposals" value={stats.pendingProposals || 0} icon={FileCheck} />
          </div>

          <div className="space-y-6">
            {/* Table 1: Supervisor Pool */}
            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-[#0C2340]">Supervisor Pool</h3>
                <button onClick={() => navigate('/pm/supervisors')} className="text-xs font-bold text-navy-600 hover:text-navy-800">View All Supervisors</button>
              </div>
              <DataTable columns={supervisorPoolColumns} data={supervisors} />
            </div>

            {/* Table 2: Student Allocation Status */}
            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-[#0C2340]">Student Allocation Status</h3>
                <button onClick={() => navigate('/pm/students')} className="text-xs font-bold text-navy-600 hover:text-navy-800">View All Students</button>
              </div>
              <DataTable columns={studentAllocationColumns} data={students} />
            </div>
          </div>
        </div>
      );
    }

    // ---------------- BATCHES TAB ----------------
    if (path === '/pm/batches') {
      const batchColumns = [
        { header: 'Batch ID', accessor: 'id' },
        { header: 'Batch Name', accessor: 'name' },
        { header: 'Start Date', accessor: 'startDate' },
        { header: 'Student Count', accessor: 'studentCount' },
        {
          header: 'Status',
          render: (row) => (
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${row.status === 'Completed' ? 'bg-slate-100 text-slate-700 border-slate-200' :
              row.status === 'Ongoing' ? 'bg-green-50 text-green-700 border-green-200' :
                'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
              {row.status}
            </span>
          )
        }
      ];

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-800">Academic Batches</h1>
              <p className="text-sm text-slate-500">View and manage final year batches cohorts.</p>
            </div>
            <button
              onClick={() => setShowAddBatch(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-navy-900 text-white hover:bg-navy-950 font-bold rounded text-xs transition-colors select-none"
            >
              <Plus className="h-4 w-4" /> Add Academic Batch
            </button>
          </div>

          <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
            <DataTable columns={batchColumns} data={batches} />
          </div>
        </div>
      );
    }

    // ---------------- STUDENTS LIST TAB ----------------
    if (path === '/pm/students') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Final Year Students List</h1>
            <p className="text-sm text-slate-500">Track and filter overall FYP milestones and supervisor matches.</p>
          </div>

          <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
            <DataTable columns={studentAllocationColumns} data={students} />
          </div>
        </div>
      );
    }

    // ---------------- SUPERVISORS POOL TAB ----------------
    if (path === '/pm/supervisors') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Faculty Supervisor Pool</h1>
            <p className="text-sm text-slate-500">Monitor active supervisor capacities and expertise fields.</p>
          </div>

          <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
            <DataTable columns={supervisorPoolColumns} data={supervisors} />
          </div>
        </div>
      );
    }

    // ---------------- SUPERVISOR ALLOCATION WORKSPACE TAB ----------------
    if (path === '/pm/allocation') {
      const unassignedStudents = students.filter(s => s.supervisor === null);
      const availableSupervisors = supervisors.filter(s => s.slots > 0);

      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Supervisor Allocation Workspace</h1>
            <p className="text-sm text-slate-500">Manually match unassigned final year students with available faculty supervisors.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded border border-slate-200 shadow-sm">
              {allocSuccess ? (
                <div className="text-center p-6 space-y-3">
                  <div className="mx-auto h-12 w-12 rounded bg-green-50 flex items-center justify-center text-green-600 border border-green-100">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-slate-800">Allocation Confirmed</h3>
                  <p className="text-sm text-slate-500">Student and Supervisor record updated successfully. Syncing statistics...</p>
                </div>
              ) : (
                <form onSubmit={handleAllocateSubmit} className="space-y-5">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Manual Assignment Form</h3>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Select Unassigned Student *</label>
                    <select
                      required
                      value={allocStudentId}
                      onChange={(e) => setAllocStudentId(e.target.value)}
                      className="block w-full p-2.5 bg-white border border-slate-200 rounded text-slate-700 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                    >
                      <option value="">-- Choose unassigned student --</option>
                      {unassignedStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.id}) - {s.topic || 'No topic proposed'}
                        </option>
                      ))}
                      {unassignedStudents.length === 0 && (
                        <option disabled>All students allocated</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Select Available Supervisor *</label>
                    <select
                      required
                      value={allocSupervisorId}
                      onChange={(e) => setAllocSupervisorId(e.target.value)}
                      className="block w-full p-2.5 bg-white border border-slate-200 rounded text-slate-700 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                    >
                      <option value="">-- Choose available supervisor --</option>
                      {availableSupervisors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} {s.name} ({s.slots} slots available) - {s.expertise.split(',')[0]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={unassignedStudents.length === 0}
                      className="px-5 py-2.5 bg-navy-900 hover:bg-navy-950 text-white rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Allocate Supervisor
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Unassigned Students quick panel */}
            <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unassigned Students Pool ({unassignedStudents.length})</h3>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {unassignedStudents.map((s) => (
                  <div key={s.id} className="py-2.5 flex justify-between items-start text-xs font-medium">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800">{s.name}</p>
                      <p className="text-slate-400 font-mono">{s.id}</p>
                    </div>
                    <button
                      onClick={() => setAllocStudentId(s.id)}
                      className="text-navy-600 hover:text-navy-950 underline font-bold"
                    >
                      Select
                    </button>
                  </div>
                ))}
                {unassignedStudents.length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center">All students assigned to supervisor!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ---------------- REPORTS TAB ----------------
    if (path === '/pm/reports') {
      const reports = [
        { title: "FYP Student Supervisor Allocation Audit Log", format: "Excel Spreadsheet", size: "320 KB", date: "2026-06-13" },
        { title: "Active Supervisor Capacity & Slot Distribution Analysis", format: "PDF Document", size: "1.4 MB", date: "2026-06-10" },
        { title: "Interim Milestone Proposal Status Progression Report", format: "PDF Document", size: "890 KB", date: "2026-06-05" },
      ];

      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Management Reports</h1>
            <p className="text-sm text-slate-500">Download system audit audits and capacity logs.</p>
          </div>

          <div className="bg-white rounded border border-slate-200 shadow-sm divide-y divide-slate-200">
            {reports.map((rep, idx) => (
              <div key={idx} className="p-4 md:p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">{rep.title}</h4>
                  <div className="flex gap-4 text-xs text-slate-500 font-medium">
                    <span>Format: {rep.format}</span>
                    <span>•</span>
                    <span>Size: {rep.size}</span>
                    <span>•</span>
                    <span>Generated: {rep.date}</span>
                  </div>
                </div>
                <button
                  onClick={() => alert(`Downloading: ${rep.title}`)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 hover:border-navy-900 rounded text-xs font-bold bg-white"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
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

      {/* Add Batch Modal */}
      {showAddBatch && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Add Academic Batch</h3>
              <button onClick={() => setShowAddBatch(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddBatchSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Batch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2024-Sep"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="block w-full p-2.5 border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Start Date *</label>
                <input
                  type="date"
                  required
                  value={newBatchDate}
                  onChange={(e) => setNewBatchDate(e.target.value)}
                  className="block w-full p-2.5 border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Estimated Student Count *</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="e.g. 120"
                  value={newBatchCount}
                  onChange={(e) => setNewBatchCount(e.target.value)}
                  className="block w-full p-2.5 border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddBatch(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded text-sm font-semibold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded text-sm font-semibold transition-colors"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Students Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Import Student Pool</h3>
              <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1 text-center py-4 border border-dashed border-slate-200 rounded">
                <FileSpreadsheet className="h-10 w-10 mx-auto text-slate-400" />
                <p className="text-xs text-slate-600 font-bold mt-2">Select Student List CSV/XLSX</p>
                <p className="text-[10px] text-slate-400">Must include: ID, Name, Batch, Email, Tentative Topic</p>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Clicking "Import Demo Records" will automatically inject 2 unassigned students (Gary Neville, Harry Kane) into the system for mock allocation demonstrations.
              </p>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowImport(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded text-sm font-semibold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportStudents}
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded text-sm font-semibold transition-colors"
                >
                  Import Demo Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PMDashboard;
