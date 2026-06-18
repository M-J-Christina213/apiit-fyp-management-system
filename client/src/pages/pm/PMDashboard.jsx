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
  FileText,
  Upload
} from 'lucide-react';

import {
  getStudents,
  getSupervisors,
  getProposalRequests,
  getBatches,
  createBatch,
  updateBatchStage,
  uploadSupervisors
} from "../../services/api";

import * as XLSX from 'xlsx';

const PMDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const [students, setStudents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [batches, setBatches] = useState([]);

  const [proposals, setProposals] = useState([]);
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

  const [selectedBatch, setSelectedBatch] = useState(null);

  const [batchStudentsText, setBatchStudentsText] = useState('');
  const [batchFile, setBatchFile] = useState(null);
  const [registryBatchFilter, setRegistryBatchFilter] = useState('All');



  const getNextStage = (current) => {
    switch (current) {
      case "Proposal":
        return "Midpoint";
      case "Midpoint":
        return "Final";
      case "Final":
        return "Completed";
      default:
        return "Completed";
    }
  };

  const [stats, setStats] = useState({
    totalStudents: 0,
    availableSupervisors: 0,
    unassignedStudents: 0,
    pendingProposals: 0
  });

  const advanceBatchStage = async (batchId) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    const nextStage = getNextStage(batch.stage);

    try {
      await updateBatchStage(batchId, nextStage);
      const updated = batches.map(b =>
        b.id === batchId
          ? { ...b, stage: nextStage }
          : b
      );
      setBatches(updated);
    } catch (error) {
      console.error("Failed to advance stage:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {

        const [stuRes, supRes, propRes, batchRes] =
          await Promise.all([
            getStudents(),
            getSupervisors(),
            getProposalRequests(),
            getBatches()
          ]);

        setStudents(stuRes.data);
        setSupervisors(supRes.data);
        setBatches(batchRes.data);
        setProposals(propRes.data);

      } catch (error) {
        console.error("Failed to load PM dashboard data:", error);
      }
    };

    loadData();
  }, [path]);

  // Quick Action: Import Students
  const handleImportStudents = () => {
    const imported = [
      { id: 'CB008', name: 'Gary Neville', batch: '2024-Sep', status: 'Unassigned', email: 'cb008@students.apiit.lk', topic: 'Predictive Cybersecurity', supervisor: null },
      { id: 'CB009', name: 'Harry Kane', batch: '2024-Feb', status: 'Unassigned', email: 'cb009@students.apiit.lk', topic: 'Automated Code Review Systems', supervisor: null }
    ];

    const updatedStudents = [...students, ...imported];
    setStudents(updatedStudents);

    setShowImport(false);

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

    setSupervisors(updatedSupervisors);

    setAllocSuccess(true);
    setAllocStudentId('');
    setAllocSupervisorId('');

    // Refresh page data
    setTimeout(() => {
      setStudents(getStudents());
      setSupervisors(getSupervisors());

      setAllocSuccess(false);
    }, 1500);
  };

  const handleAddBatchSubmit = async (e) => {
    e.preventDefault();

    try {
      let parsedStudents = [];

      // TEXT INPUT
      if (batchStudentsText.trim()) {
        parsedStudents = batchStudentsText
          .split("\n")
          .map(line => {
            const [studentNo, name] = line.split(",").map(s => s.trim());
            if (!studentNo || !name) return null;
            return { studentNo, name, topic: "", supervisor: "", assessor: "" };
          })
          .filter(Boolean);
      }

      // EXCEL INPUT
      if (batchFile) {
        const data = await batchFile.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        parsedStudents = json.map(row => ({
          studentNo: row.studentNo || row.StudentNo || row.ID,
          name: row.name || row.Name,
          topic: "",
          supervisor: "",
          assessor: ""
        }));
      }

      const response = await createBatch({
        id: "B" + String(batches.length + 1).padStart(3, "0"),
        intake: newBatchName,
        startDate: newBatchDate,
        stage: "Proposal",
        studentCount: newBatchCount,
        students: parsedStudents
      });

      setBatches([...batches, response.data]);

      setShowAddBatch(false);
      setNewBatchName('');
      setNewBatchDate('');
      setNewBatchCount('');
      setBatchStudentsText('');
      setBatchFile(null);

      alert("Batch created successfully with students!");

    } catch (error) {
      console.error(error);
    }
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
        <span className={`font-semibold ${row.availableSlots > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {row.availableSlots}
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
        { header: "Batch ID", accessor: "id" },
        { header: "Intake", accessor: "intake" },
        { header: "Start Date", accessor: "startDate" },
        { header: "Students", accessor: "studentCount" },

        {
          header: "Stage",
          render: (row) => {
            const colors = {
              Proposal: "bg-blue-50 text-blue-700 border-blue-200",
              Midpoint: "bg-orange-50 text-orange-700 border-orange-200",
              Final: "bg-purple-50 text-purple-700 border-purple-200",
              Completed: "bg-green-50 text-green-700 border-green-200"
            };
            const colorClass = colors[row.stage] || "bg-slate-50 text-slate-700 border-slate-200";
            return (
              <span className={`px-2.5 py-1 text-xs rounded-full border font-bold ${colorClass}`}>
                {row.stage}
              </span>
            );
          }
        },

        {
          header: "Actions",
          render: (row) => (
            <div className="flex gap-2">

              {/* SINGLE STAGE BUTTON */}
              <button
                onClick={() => advanceBatchStage(row.id)}
                disabled={row.stage === 'Completed'}
                className="px-3 py-1.5 text-xs bg-navy-900 text-white rounded hover:bg-navy-950 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Advance Stage
              </button>

              {/* VIEW STUDENTS */}
              <button
                onClick={() => setSelectedBatch(row)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 transition-colors font-medium text-slate-700 shadow-sm"
              >
                View Students
              </button>

            </div>
          )
        }
      ];

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-800">Academic Batches</h1>
              <p className="text-sm text-slate-500">Manage intake groups and student assignment cycles</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddBatch(true)}
                className="flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded font-bold text-sm shadow-md transition-all hover:shadow-lg"
              >
                <Plus className="h-4 w-4" /> Add Batch
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <DataTable columns={batchColumns} data={batches} />
          </div>

          {selectedBatch && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded shadow-sm border border-slate-200">
                    <Users className="h-5 w-5 text-navy-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">
                      Students in {selectedBatch.intake} ({selectedBatch.id})
                    </h3>
                    <p className="text-xs text-slate-500">Currently in {selectedBatch.stage} stage</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedBatch(null)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-0">
                {selectedBatch.students && selectedBatch.students.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3 font-semibold">No</th>
                        <th className="px-6 py-3 font-semibold">Name</th>
                        <th className="px-6 py-3 font-semibold">Student Number</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedBatch.students.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-sm">
                          <td className="px-6 py-3 text-slate-500 font-medium">{idx + 1}</td>
                          <td className="px-6 py-3 font-semibold text-slate-800">{s.name}</td>
                          <td className="px-6 py-3 font-mono text-slate-600">{s.studentNo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                      <Users className="h-5 w-5 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No students found in this batch.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // ---------------- STUDENTS LIST TAB ----------------
    if (path === '/pm/students') {
      const allAllocationRecords = batches.flatMap(b => 
        (b.students || []).map(s => ({
          batchIntake: b.intake,
          batchCode: b.id,
          name: s.name,
          studentNo: s.studentNo,
          topic: s.topic || "",
          supervisor: s.supervisor || "",
          assessor: s.assessor || ""
        }))
      );

      const filteredRecords = registryBatchFilter === 'All' 
        ? allAllocationRecords 
        : allAllocationRecords.filter(r => r.batchIntake === registryBatchFilter);

      const uniqueBatches = [...new Set(batches.map(b => b.intake))];

      const allocationColumns = [
        { header: 'Batch Intake', accessor: 'batchIntake' },
        { header: 'Batch Code', render: (row) => row.batchCode || '-' },
        { header: 'Student Name', accessor: 'name' },
        { header: 'Student Number', accessor: 'studentNo' },
        { header: 'Tentative Topic', render: (row) => row.topic || '-' },
        { header: 'Supervisor', render: (row) => row.supervisor || '-' },
        { header: 'Assessor', render: (row) => row.assessor || '-' }
      ];

      const handleExportAllocationRegistry = () => {
        const wb = XLSX.utils.book_new();
        const exportData = filteredRecords.map(r => ({
          "Batch Intake": r.batchIntake,
          "Batch Code": r.batchCode || '-',
          "Student Name": r.name,
          "Student Number": r.studentNo,
          "Tentative Topic": r.topic || '-',
          "Supervisor": r.supervisor || '-',
          "Assessor": r.assessor || '-'
        }));
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Allocation Registry");
        XLSX.writeFile(wb, "fyp_student_allocation_registry.xlsx");
      };

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-800">FYP Student Allocation Registry</h1>
              <p className="text-sm text-slate-500">Monitor student projects, supervisor assignments and assessor allocations across all batches.</p>
            </div>
            <button 
              onClick={handleExportAllocationRegistry}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-100 transition-colors text-sm font-bold shadow-sm whitespace-nowrap"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" /> Export Allocation Registry
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700">Filter by Batch:</span>
                <select
                  value={registryBatchFilter}
                  onChange={(e) => setRegistryBatchFilter(e.target.value)}
                  className="p-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-navy-900"
                >
                  <option value="All">All Batches</option>
                  {uniqueBatches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                Total Records: {filteredRecords.length}
              </div>
            </div>
            <div className="p-0">
              <DataTable columns={allocationColumns} data={filteredRecords} />
            </div>
          </div>
        </div>
      );
    }

    // ---------------- SUPERVISORS POOL TAB ----------------
    if (path === '/pm/supervisors') {
      const supervisorPoolPageColumns = [
        { header: 'Title', accessor: 'title' },
        { header: 'Name', accessor: 'name' },
        { header: 'Email', accessor: 'email' },
        {
          header: 'Areas of Expertise',
          render: (row) => {
            if (!row.expertise) return <span className="text-xs text-slate-400 italic">Not Updated</span>;
            return (
              <div className="flex flex-wrap gap-1">
                {row.expertise.split(',').map((exp, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100">
                    {exp.trim()}
                  </span>
                ))}
              </div>
            );
          }
        },
        {
          header: 'Research Interests',
          render: (row) => {
            if (!row.interests) return <span className="text-xs text-slate-400 italic">Not Updated</span>;
            return (
              <div className="flex flex-wrap gap-1">
                {row.interests.split(',').map((int, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs border border-purple-100">
                    {int.trim()}
                  </span>
                ))}
              </div>
            );
          }
        },
        {
          header: 'Preferred Supervision Slots',
          render: (row) => (
            <span className="font-semibold text-slate-700 text-sm">
              {row.preferredSlots !== undefined ? row.preferredSlots : 3}
            </span>
          )
        },
        {
          header: 'Additional Information',
          render: (row) => (
            <span className="text-xs text-slate-600">
              {row.additionalInfo || '-'}
            </span>
          )
        },
        {
          header: 'Status',
          render: (row) => {
            const slots = row.preferredSlots !== undefined ? row.preferredSlots : 3;
            if (slots > 0) {
              return (
                <span className="px-2 py-0.5 rounded text-xs font-bold border bg-green-50 text-green-700 border-green-200">
                  Available
                </span>
              );
            }
            return (
              <span className="px-2 py-0.5 rounded text-xs font-bold border bg-red-50 text-red-700 border-red-200">
                Unavailable
              </span>
            );
          }
        }
      ];

      const handleSupervisorUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);

          // Map to supervisor records
          const newSupervisors = json.map((row, index) => ({
            id: `S${String(index + 1).padStart(3, '0')}`,
            title: row.Title || '',
            name: row.Name || '',
            email: row.Email || '',
            expertise: '',
            interests: '',
            preferredSlots: 3,
            allocatedSlots: 0,
            availableSlots: 3,
            status: 'Available',
            additionalInfo: ''
          }));

          // Replace old imported list
          await uploadSupervisors(newSupervisors);
          
          // Re-fetch to auto synchronize
          const res = await getSupervisors();
          setSupervisors(res.data);
          
          alert(`Successfully imported ${newSupervisors.length} supervisors.`);
          e.target.value = null; // reset input
        } catch (error) {
          console.error("Error importing supervisors:", error);
          alert("Failed to import supervisors. Please check file format.");
        }
      };

      const handleExportSupervisorPool = () => {
        // Build export data
        const exportData = supervisors.map(s => ({
          Title: s.title,
          Name: s.name,
          Email: s.email,
          "Areas of Expertise": s.expertise || 'Not Updated',
          "Research Interests": s.interests || 'Not Updated',
          "Preferred Supervision Slots": s.preferredSlots !== undefined ? s.preferredSlots : 3,
          "Additional Information": s.additionalInfo || '-',
          Status: (s.preferredSlots !== undefined ? s.preferredSlots : 3) > 0 ? 'Available' : 'Unavailable'
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Supervisor Pool");
        XLSX.writeFile(wb, "supervisor_pool_export.xlsx");
      };

      return (
        <div className="space-y-6">
          {/* Section 1 - Upload Supervisor List */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="space-y-2 max-w-xl">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Upload className="h-5 w-5 text-navy-700" />
                Supervisor List Upload
              </h2>
              <p className="text-sm text-slate-500">
                Upload the latest supervisor list provided by the faculty administration. Accepted formats: .xlsx, .xls, .csv.
                Expected columns: Title, Name, Email.
              </p>
              <div className="text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded inline-block mt-2">
                Supervisors Imported: {supervisors.length} | Last Uploaded: {new Date().toLocaleDateString()}
              </div>
            </div>
            <div className="shrink-0 relative group">
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleSupervisorUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <button className="px-4 py-2 bg-navy-900 text-white rounded font-bold text-sm shadow-md transition-all hover:bg-navy-950 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Choose Excel File
              </button>
            </div>
          </div>

          {/* Section 2 - Supervisor Pool Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-slate-800">Faculty Supervisor Pool</h1>
                <p className="text-sm text-slate-500">View available supervisors and their supervision capacities.</p>
              </div>
              
              {/* Section 4 - Export Supervisor Pool */}
              <button 
                onClick={handleExportSupervisorPool}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-100 transition-colors text-sm font-bold shadow-sm"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" /> Export Supervisor Pool
              </button>
            </div>

            <div className="p-0">
              <DataTable columns={supervisorPoolPageColumns} data={supervisors} />
            </div>
          </div>
          
          {/* Future: Assessor Pool */}
          {/* Future: Assessor Allocation */}
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
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-navy-50 rounded-lg text-navy-700">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Create New Batch</h3>
                  <p className="text-xs text-slate-500">Set up a new student intake</p>
                </div>
              </div>
              <button onClick={() => setShowAddBatch(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <form id="add-batch-form" onSubmit={handleAddBatchSubmit} className="space-y-6">

                {/* Batch Details Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batch Details</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Batch Intake *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 2025-Sep"
                        value={newBatchName}
                        onChange={(e) => setNewBatchName(e.target.value)}
                        className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Start Date *</label>
                      <input
                        type="date"
                        required
                        value={newBatchDate}
                        onChange={(e) => setNewBatchDate(e.target.value)}
                        className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Student Count *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="e.g. 120"
                      value={newBatchCount}
                      onChange={(e) => setNewBatchCount(e.target.value)}
                      className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                    />
                  </div>
                </div>

                {/* Import Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-end">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Import Students</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Optional</span>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    {/* Option 1 */}
                    <div className="space-y-2 relative">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" /> Option 1: Paste Text
                      </label>
                      <textarea
                        placeholder="Format: CB001, John Doe&#10;CB002, Jane Smith"
                        value={batchStudentsText}
                        onChange={(e) => setBatchStudentsText(e.target.value)}
                        className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-600 placeholder-slate-400 focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white resize-none"
                      />
                    </div>

                    {/* Divider */}
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-400">OR</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    {/* Option 2 */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-slate-400" /> Option 2: Excel Upload
                      </label>
                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 bg-slate-50 text-center hover:bg-slate-100 transition-colors cursor-pointer relative group">
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={(e) => setBatchFile(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="h-6 w-6 text-slate-400 mx-auto mb-2 group-hover:text-navy-600 transition-colors" />
                        <p className="text-sm font-medium text-slate-700">
                          {batchFile ? batchFile.name : "Click or drag .xlsx file here"}
                        </p>
                        {!batchFile && <p className="text-xs text-slate-500 mt-1">Headers: StudentNo, Name</p>}
                      </div>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddBatch(false)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-700 transition-all shadow-sm hover:shadow"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-batch-form"
                className="px-5 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Create Batch
              </button>
            </div>
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
