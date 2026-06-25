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
  Shield,
  Upload,
  Trash2,
  Edit,
  AlertTriangle
} from 'lucide-react';

import {
  getStudents,
  getSupervisors,
  getProposalRequests,
  getBatches,
  createBatch,
  updateBatchStage,
  uploadSupervisors,
  clearAllSupervisors,
  updateSupervisor,
  deleteSupervisor,
  updateBatch,
  deleteBatch
} from "../../services/api";

import * as XLSX from 'xlsx';

const PMDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const [students, setStudents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [batches, setBatches] = useState([]);

  const [proposals, setProposals] = useState([]);
  // Modals state
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Form states
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDate, setNewBatchDate] = useState('');
  const [newBatchCount, setNewBatchCount] = useState('');

  // Edit Batch states
  const [showEditBatch, setShowEditBatch] = useState(false);
  const [editBatchId, setEditBatchId] = useState(null);
  const [editBatchName, setEditBatchName] = useState('');
  const [editBatchDate, setEditBatchDate] = useState('');
  const [editBatchCode, setEditBatchCode] = useState('');
  const [editBatchStage, setEditBatchStage] = useState('');

  // Edit Supervisor states
  const [showEditSupervisor, setShowEditSupervisor] = useState(false);
  const [editSupervisorId, setEditSupervisorId] = useState(null);
  const [editSupervisorTitle, setEditSupervisorTitle] = useState('');
  const [editSupervisorName, setEditSupervisorName] = useState('');
  const [editSupervisorEmail, setEditSupervisorEmail] = useState('');
  const [editSupervisorExpertise, setEditSupervisorExpertise] = useState('');
  const [editSupervisorResearchInterests, setEditSupervisorResearchInterests] = useState('');
  const [editSupervisorAdditionalInformation, setEditSupervisorAdditionalInformation] = useState('');
  const [editSupervisorPreferredSupervisionSlots, setEditSupervisorPreferredSupervisionSlots] = useState(3);

  // Allocation state
  const [allocStudentId, setAllocStudentId] = useState('');
  const [allocSupervisorId, setAllocSupervisorId] = useState('');
  const [allocAssessorId, setAllocAssessorId] = useState('');
  const [allocSuccess, setAllocSuccess] = useState(false);
  const [assessorAllocSuccess, setAssessorAllocSuccess] = useState(false);

  const [selectedBatch, setSelectedBatch] = useState(null);

  const [batchStudentsText, setBatchStudentsText] = useState('');
  const [batchFile, setBatchFile] = useState(null);

  // Filtering states
  const [selectedIntake, setSelectedIntake] = useState('All');
  const [selectedBatchCode, setSelectedBatchCode] = useState('All');
  const [searchName, setSearchName] = useState('');
  const [searchCbNo, setSearchCbNo] = useState('');
  const [searchSupervisor, setSearchSupervisor] = useState('');
  const [searchAssessor, setSearchAssessor] = useState('');
  const [searchStatus, setSearchStatus] = useState('All');



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
    pendingProposals: 0,
    confirmedSupervisors: 0,
    pmAssignedStudents: 0
  });

  useEffect(() => {
    setStats(prev => ({
      ...prev,
      totalStudents: students.length,
      availableSupervisors: supervisors.filter(s => (s.slots !== undefined ? s.slots : 3) > 0).length,
      unassignedStudents: students.filter(s => s.supervisorConfirmationStatus === "Pending").length,
      confirmedSupervisors: students.filter(s => s.supervisorConfirmationStatus === "Confirmed").length,
      pmAssignedStudents: students.filter(s => s.supervisorAssignedBy === "PM").length
    }));
  }, [students, supervisors]);

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

  const handleDeleteBatch = async (batchId) => {
    if (window.confirm("Are you sure you want to delete this batch? All associated students will also be removed.")) {
      try {
        await deleteBatch(batchId);
        setBatches(batches.filter(b => b.id !== batchId));
        setStudents(students.filter(s => s.batchId !== batchId));
        if (selectedBatch && selectedBatch.id === batchId) setSelectedBatch(null);
      } catch (error) {
        console.error("Failed to delete batch", error);
        alert("Failed to delete batch");
      }
    }
  };

  const handleEditBatch = (batch) => {
    setEditBatchId(batch.id);
    setEditBatchName(batch.intake);
    setEditBatchDate(batch.startDate || '');
    setEditBatchCode(batch.batchCode || '');
    setEditBatchStage(batch.stage || 'Proposal');
    setShowEditBatch(true);
  };

  const handleEditBatchSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await updateBatch(editBatchId, {
        batchCode: editBatchCode,
        intake: editBatchName,
        startDate: editBatchDate,
        stage: editBatchStage
      });
      setBatches(batches.map(b => b.id === editBatchId ? { ...b, ...response.data } : b));
      setShowEditBatch(false);
      alert("Batch updated successfully!");
    } catch (error) {
      console.error("Failed to update batch", error);
      alert("Failed to update batch");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        let studentParams = {};
        if (path === '/pm/students') {
          studentParams = {
            name: searchName || 'All',
            cbNo: searchCbNo || 'All',
            batchIntake: selectedIntake,
            batchCode: selectedBatchCode,
            supervisorName: searchSupervisor || 'All',
            allocationStatus: searchStatus,
            assessorName: searchAssessor || 'All'
          };
        } else if (path === '/pm/allocation') {
          studentParams = { allocationStatus: 'Pending' };
        } else if (path === '/pm/assessors') {
          studentParams = { allocationStatus: 'Confirmed' };
        }

        const [stuRes, supRes, propRes, batchRes] =
          await Promise.all([
            getStudents(studentParams),
            getSupervisors(),
            getProposalRequests(),
            getBatches()
          ]);

        const mappedStudents = stuRes.data.map(s => {
          return {
            ...s,
            supervisorConfirmationStatus: s.supervisorConfirmationStatus || "Pending",
            supervisorAssignedBy: "",
            assessorAssigned: !!s.assessor
          };
        });
        setStudents(mappedStudents);
        setSupervisors(supRes.data);
        setBatches(batchRes.data);
        setProposals(propRes.data);

      } catch (error) {
        console.error("Failed to load PM dashboard data:", error);
      }
    };

    loadData();
  }, [path, selectedIntake, selectedBatchCode, searchName, searchCbNo, searchSupervisor, searchAssessor, searchStatus]);

  // Quick Action: Import Students
  const handleImportStudents = () => {
    alert("Please use the Batch Upload feature to add students.");
    setShowImport(false);
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
        ? {
          ...s,
          supervisor: `${supervisor.title || ''} ${supervisor.name}`.trim(),
          supervisorConfirmationStatus: "Confirmed",
          supervisorAssignedBy: "PM"
        }
        : s
    );

    setStudents(updatedStudents);

    // Update supervisor slots
    const updatedSupervisors = supervisors.map(s =>
      s.id === supervisor.id
        ? { ...s, slots: Math.max(0, (s.slots !== undefined ? s.slots : s.availableSlots || 0) - 1) }
        : s
    );

    setSupervisors(updatedSupervisors);

    setAllocSuccess(true);

    setTimeout(() => {
      setAllocSuccess(false);
      setAllocStudentId('');
      setAllocSupervisorId('');
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
            const parts = line.split(",").map(s => s.trim());
            if (parts.length < 3) return null;
            // Format: BatchCode, StudentNo, Name
            return {
              batchCode: parts[0],
              studentNo: parts[1],
              name: parts[2],
              intake: newBatchName,
              topic: "",
              supervisor: "",
              assessor: ""
            };
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
          studentNo: row.studentNo || row.StudentNo || row["Student No"] || row.ID,
          name: row.name || row.Name || row["Student Name"],
          batchCode: row.batchCode || row.BatchCode || row["Batch Code"],
          intake: row.intake || row.Intake || row["Batch Intake"] || newBatchName,
          topic: "",
          supervisor: "",
          assessor: ""
        }));
      }

      const response = await createBatch({
        batchCode: newBatchName, // Fallback if no parsed students
        intake: newBatchName,
        startDate: newBatchDate,
        stage: "Proposal",
        studentCount: newBatchCount,
        students: parsedStudents
      });

      const createdBatches = Array.isArray(response.data) ? response.data : [response.data];

      const normalizedStudents = parsedStudents.map(s => {
        const matchingBatch = createdBatches.find(b => b.batchCode === (s.batchCode || newBatchName)) || createdBatches[0];
        return {
          id: s.studentNo,
          name: s.name ? s.name.trim() : "",
          batchCode: matchingBatch.batchCode,
          intake: newBatchName,
          batchId: matchingBatch.id,
          topic: "",
          supervisor: "",
          assessor: "",
          supervisorConfirmationStatus: "Pending",
          assessorAssigned: false
        };
      });

      // 1. Update batches
      setBatches(prev => [
        ...prev,
        ...createdBatches.map(b => ({
          ...b,
          studentIds: normalizedStudents.filter(s => s.batchId === b.id).map(s => s.id)
        }))
      ]);

      // 2. Update global student registry
      setStudents(prev => {
        const existingIds = new Set(prev.map(x => x.id));
        const merged = [...prev];

        normalizedStudents.forEach(s => {
          if (!existingIds.has(s.id)) merged.push(s);
        });

        return merged;
      });

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

  const getStudentsByBatch = (batchId) => students.filter(s => s.batchId === batchId);

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
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-6">
            <DashboardCard title="Awaiting Supervisor Confirmation" value={stats.unassignedStudents || 0} icon={Users} />
            <DashboardCard title="Confirmed Supervisors" value={stats.confirmedSupervisors || 0} icon={CheckCircle} />
            <DashboardCard title="Manually Assigned By PM" value={stats.pmAssignedStudents || 0} icon={Shield} />
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
      const intakeSummaries = batches.map(b => {
        const intakeStudents = getStudentsByBatch(b.id);
        const dynamicCodes = [...new Set(intakeStudents.map(s => s.batchCode).filter(c => c && c !== '-'))];
        return {
          ...b,
          actualStudentCount: intakeStudents.length,
          batchCodes: dynamicCodes.length > 0 ? dynamicCodes : (b.batchCode ? [b.batchCode] : [])
        };
      });

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
                <Plus className="h-4 w-4" /> Add Intake
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {intakeSummaries.map((summary, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-navy-900">{summary.intake}</h3>
                    <p className="text-sm text-slate-500">Started: {summary.startDate || 'N/A'}</p>
                  </div>
                  {(() => {
                    const stage = summary.stage || 'Proposal';
                    const colors = {
                      Proposal: "bg-blue-50 text-blue-700 border-blue-200",
                      Midpoint: "bg-orange-50 text-orange-700 border-orange-200",
                      Final: "bg-purple-50 text-purple-700 border-purple-200",
                      Completed: "bg-green-50 text-green-700 border-green-200"
                    };
                    return (
                      <span className={`px-2.5 py-1 text-xs rounded-full border font-bold ${colors[stage] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {stage}
                      </span>
                    );
                  })()}
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">Students:</span>
                  <span className="text-base font-bold text-slate-800">{summary.actualStudentCount > 0 ? summary.actualStudentCount : summary.studentCount}</span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batch Codes</span>
                  {summary.batchCodes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {summary.batchCodes.map(code => (
                        <span key={code} className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-bold">
                          {code}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No batch codes found</p>
                  )}
                </div>

                <div className="pt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => advanceBatchStage(summary.id)}
                    disabled={summary.stage === 'Completed'}
                    className="flex-1 px-3 py-1.5 text-xs bg-navy-900 text-white rounded hover:bg-navy-950 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm min-w-[100px]"
                  >
                    Advance Stage
                  </button>
                  <button
                    onClick={() => setSelectedBatch(summary)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 transition-colors font-medium text-slate-700 shadow-sm min-w-[100px]"
                  >
                    View Students
                  </button>
                  <button
                    onClick={() => handleEditBatch(summary)}
                    className="flex-1 px-3 py-1.5 text-xs border border-blue-300 rounded hover:bg-blue-50 transition-colors font-medium text-blue-700 shadow-sm min-w-[80px]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBatch(summary.id)}
                    className="flex-1 px-3 py-1.5 text-xs border border-red-300 rounded hover:bg-red-50 transition-colors font-medium text-red-700 shadow-sm min-w-[80px]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {selectedBatch && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 mt-6">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded shadow-sm border border-slate-200">
                    <Users className="h-5 w-5 text-navy-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">
                      Students in {selectedBatch.intake}
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
                {(() => {
                  const batchStudents = getStudentsByBatch(selectedBatch.id);
                  if (batchStudents.length > 0) {
                    return (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                            <th className="px-6 py-3 font-semibold">No</th>
                            <th className="px-6 py-3 font-semibold">Batch Code</th>
                            <th className="px-6 py-3 font-semibold">Name</th>
                            <th className="px-6 py-3 font-semibold">Student Number</th>
                            <th className="px-6 py-3 font-semibold">Supervisor</th>
                            <th className="px-6 py-3 font-semibold">Assessor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {batchStudents.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-sm">
                              <td className="px-6 py-3 text-slate-500 font-medium">{idx + 1}</td>
                              <td className="px-6 py-3 font-semibold text-slate-800">{s.batchCode || '-'}</td>
                              <td className="px-6 py-3 font-semibold text-slate-800">{s.name}</td>
                              <td className="px-6 py-3 font-mono text-slate-600">{s.id || s.studentNo}</td>
                              <td className="px-6 py-3 text-slate-600">{s.supervisor || '-'}</td>
                              <td className="px-6 py-3 text-slate-600">{s.assessor || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  } else {
                    return (
                      <div className="p-8 text-center space-y-3">
                        <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                          <Users className="h-5 w-5 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">No students found in this batch.</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}
        </div>
      );
    }




    // ---------------- COMMON FILTERING LOGIC ----------------
    // Get intake directly from batches joined on batchId
    const getStudentIntake = (s) => batches.find(b => b.id === s.batchId)?.intake || s.intake || s.batch;

    const uniqueIntakes = [...new Set(students.map(getStudentIntake).filter(Boolean))];
    const dynamicBatchCodes = selectedIntake === 'All'
      ? [...new Set(students.map(s => s.batchCode).filter(Boolean))]
      : [...new Set(students.filter(s => getStudentIntake(s) === selectedIntake).map(s => s.batchCode).filter(Boolean))];

    const FilterControls = () => (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Intake:</span>
            <select
              value={selectedIntake}
              onChange={(e) => {
                setSelectedIntake(e.target.value);
                setSelectedBatchCode('All'); // Reset batch code when intake changes
              }}
              className="p-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="All">All Intakes</option>
              {uniqueIntakes.map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Batch Code:</span>
            <select
              value={selectedBatchCode}
              onChange={(e) => setSelectedBatchCode(e.target.value)}
              className="p-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-navy-900"
              disabled={selectedIntake !== 'All' && dynamicBatchCodes.length === 0}
            >
              <option value="All">All Batch Codes</option>
              {dynamicBatchCodes.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Status:</span>
            <select
              value={searchStatus}
              onChange={(e) => setSearchStatus(e.target.value)}
              className="p-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="All">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <input type="text" placeholder="Student Name" value={searchName} onChange={e => setSearchName(e.target.value)} className="p-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-navy-900" />
          <input type="text" placeholder="CB Number" value={searchCbNo} onChange={e => setSearchCbNo(e.target.value)} className="p-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-navy-900" />
          <input type="text" placeholder="Supervisor Name" value={searchSupervisor} onChange={e => setSearchSupervisor(e.target.value)} className="p-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-navy-900" />
          <input type="text" placeholder="Assessor Name" value={searchAssessor} onChange={e => setSearchAssessor(e.target.value)} className="p-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-navy-900" />
        </div>
      </div>
    );

    const applyFilters = (record) => {
      // Backend is handling all filtering via API, so we just return true.
      return true;
    };

    // ---------------- STUDENTS LIST TAB ----------------
    if (path === '/pm/students') {
      const allAllocationRecords = students.map(s => ({
        intake: getStudentIntake(s) || '-',
        batchId: s.batchId,
        batchCode: s.batchCode || '-',
        name: s.name,
        studentNo: s.id || s.studentNo,
        topic: s.topic || "",
        supervisor: s.supervisor || "",
        supervisorConfirmationStatus: s.supervisorConfirmationStatus || "Pending",
        assessor: s.assessor || ""
      }));

      const filteredRecords = allAllocationRecords.filter(applyFilters);

      const allocationColumns = [
        { header: 'Batch Intake', accessor: 'intake' },
        { header: 'Batch Code', accessor: 'batchCode' },
        { header: 'Student Name', accessor: 'name' },
        { header: 'Student Number', accessor: 'studentNo' },
        { header: 'Tentative Topic', render: (row) => row.topic || '-' },
        { header: 'Supervisor', render: (row) => row.supervisor || '-' },
        {
          header: 'Supervisor Confirmation Status',
          render: (row) => (
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${row.supervisorConfirmationStatus === 'Confirmed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {row.supervisorConfirmationStatus}
            </span>
          )
        },
        { header: 'Assessor', render: (row) => row.assessor || '-' }
      ];

      const handleExportAllocationRegistry = () => {
        const wb = XLSX.utils.book_new();
        const exportData = filteredRecords.map(r => ({
          "Batch Intake": r.intake,
          "Batch Code": r.batchCode,
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
              {FilterControls()}
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
            if (!row.research_interests) return <span className="text-xs text-slate-400 italic">Not Updated</span>;
            return (
              <span className="text-xs text-slate-600 line-clamp-2" title={row.research_interests}>
                {row.research_interests}
              </span>
            );
          }
        },
        {
          header: 'Preferred Supervision Slots',
          render: (row) => (
            <span className="font-semibold text-slate-700 text-sm">
              {row.preferred_supervision_slots !== undefined ? row.preferred_supervision_slots : 3}
            </span>
          )
        },
        {
          header: 'Additional Information',
          render: (row) => (
            <span className="text-xs text-slate-600">
              {row.additional_information || '-'}
            </span>
          )
        },
        {
          header: 'Status',
          render: (row) => {
            const slots = row.preferred_supervision_slots !== undefined ? row.preferred_supervision_slots : 3;
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
        },
        {
          header: 'Actions',
          render: (row) => (
            <div className="flex gap-2">
              <button
                onClick={() => openEditSupervisorModal(row)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit Supervisor"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteSupervisor(row.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete Supervisor"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
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

          // Map to supervisor records safely checking multiple header variations
          const newSupervisors = json.map((row) => {
            // Normalize keys to lowercase, trimming spaces
            const normalizedRow = {};
            for (const key in row) {
              const normalKey = key.trim().toLowerCase();
              normalizedRow[normalKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
            }
            
            return {
              title: normalizedRow['title'] || '',
              name: normalizedRow['name'] || '',
              email: normalizedRow['email'] || '',
              expertise: normalizedRow['areas of expertise'] || '',
              research_interests: normalizedRow['research interests'] || '',
              additional_information: normalizedRow['additional information'] || '',
              preferred_supervision_slots: Number(normalizedRow['preferred supervision slots']) || 3,
              // Fields needed for frontend table immediately
              allocatedSlots: 0,
              availableSlots: 3,
              status: 'Available'
            };
          });

          // Upload list (backend will upsert based on email)
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

      const handleClearAllSupervisors = async () => {
        if (!window.confirm("Are you sure you want to completely clear the Supervisor Pool? This action cannot be undone.")) return;
        try {
          await clearAllSupervisors();
          const res = await getSupervisors();
          setSupervisors(res.data);
          alert("All supervisors have been cleared.");
        } catch (error) {
          console.error("Failed to clear supervisors:", error);
          alert("Failed to clear supervisors.");
        }
      };

      const handleDeleteSupervisor = async (id) => {
        if (!window.confirm("Are you sure you want to delete this supervisor?")) return;
        try {
          await deleteSupervisor(id);
          const res = await getSupervisors();
          setSupervisors(res.data);
        } catch (error) {
          console.error("Failed to delete supervisor:", error);
          alert("Failed to delete supervisor.");
        }
      };

      const openEditSupervisorModal = (row) => {
        setEditSupervisorId(row.id);
        setEditSupervisorTitle(row.title || '');
        setEditSupervisorName(row.name || '');
        setEditSupervisorEmail(row.email || '');
        setEditSupervisorExpertise(row.expertise || '');
        setEditSupervisorResearchInterests(row.research_interests || '');
        setEditSupervisorAdditionalInformation(row.additional_information || '');
        setEditSupervisorPreferredSupervisionSlots(row.preferred_supervision_slots !== undefined ? row.preferred_supervision_slots : 3);
        setShowEditSupervisor(true);
      };

      const handleEditSupervisorSave = async () => {
        try {
          await updateSupervisor(editSupervisorId, {
            title: editSupervisorTitle,
            name: editSupervisorName,
            email: editSupervisorEmail,
            expertise: editSupervisorExpertise,
            research_interests: editSupervisorResearchInterests,
            additional_information: editSupervisorAdditionalInformation,
            preferred_supervision_slots: editSupervisorPreferredSupervisionSlots
          });
          const res = await getSupervisors();
          setSupervisors(res.data);
          setShowEditSupervisor(false);
        } catch (error) {
          console.error("Failed to update supervisor:", error);
          alert("Failed to update supervisor.");
        }
      };

      const handleExportSupervisorPool = () => {
        // Build export data
        const exportData = supervisors.map(s => ({
          Title: s.title,
          Name: s.name,
          Email: s.email,
          "Areas of Expertise": s.expertise || 'Not Updated',
          "Research Interests": s.research_interests || 'Not Updated',
          "Preferred Supervision Slots": s.preferred_supervision_slots !== undefined ? s.preferred_supervision_slots : 3,
          "Additional Information": s.additional_information || '-',
          Status: (s.preferred_supervision_slots !== undefined ? s.preferred_supervision_slots : 3) > 0 ? 'Available' : 'Unavailable'
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
            <div className="shrink-0 flex items-center gap-3">
              <button
                onClick={handleClearAllSupervisors}
                className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors text-sm font-bold shadow-sm flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" /> Clear All
              </button>
              <div className="relative group">
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

    // ---------------- SUPERVISOR ALLOCATION WORKSPACE TAB (Unresolved Cases) ----------------
    if (path === '/pm/allocation') {
      const unresolvedStudents = students; // Backend already filters for Pending
      const availableSupervisors = supervisors.filter(s => (s.slots !== undefined ? s.slots : s.availableSlots || 0) > 0);

      const allocationColumns = [
        { header: 'Batch Intake', render: (row) => batches.find(b => b.id === row.batchId)?.intake || row.intake || row.batch || '-' },
        { header: 'Batch Code', accessor: 'batchCode' },
        { header: 'Student Name', accessor: 'name' },
        { header: 'Student Number', accessor: 'id' },
        { header: 'Project Topic', render: (row) => row.topic || '-' },
        {
          header: 'Supervisor Status',
          render: (row) => (
            <span className="px-2 py-0.5 rounded text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
              Pending
            </span>
          )
        },
        {
          header: 'Action',
          render: (row) => (
            <button
              onClick={() => setAllocStudentId(row.id)}
              className="px-3 py-1.5 text-xs bg-navy-900 text-white rounded hover:bg-navy-950 transition-colors font-medium shadow-sm"
            >
              Resolve
            </button>
          )
        }
      ];

      const selectedStudent = allocStudentId ? students.find(s => s.id === allocStudentId) : null;

      const mockReason = selectedStudent?.rejectionReason || "Awaiting Review";

      // Simple recommendation engine
      const getRecommendations = (topic) => {
        if (!topic) return availableSupervisors.slice(0, 3);
        const lowerTopic = topic.toLowerCase();
        const scored = availableSupervisors.map(s => {
          let score = 0;
          if (s.expertise && s.expertise.toLowerCase().split(',').some(kw => lowerTopic.includes(kw.trim()))) score += 2;
          if (s.interests && s.interests.toLowerCase().split(',').some(kw => lowerTopic.includes(kw.trim()))) score += 1;
          return { supervisor: s, score };
        });
        scored.sort((a, b) => b.score - a.score);
        return scored.map(s => s.supervisor).slice(0, 3);
      };

      const recommendedSupervisors = selectedStudent ? getRecommendations(selectedStudent.topic) : [];

      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Unresolved Supervisor Allocations</h1>
            <p className="text-sm text-slate-500">Manage students who do not have a confirmed supervisor yet.</p>
          </div>

          {!selectedStudent ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-bold text-slate-800">Pending Supervisor Cases ({unresolvedStudents.length})</h3>
                {FilterControls()}
              </div>
              <div className="p-0">
                <DataTable columns={allocationColumns} data={unresolvedStudents} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Resolve Panel */}
              <div className="lg:col-span-2 bg-white p-6 rounded border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Resolve Case: {selectedStudent.name}</h3>
                    <p className="text-sm text-slate-500">{selectedStudent.id} • {selectedStudent.batch}</p>
                  </div>
                  <button onClick={() => setAllocStudentId('')} className="text-sm font-bold text-navy-600 hover:text-navy-900">
                    Back to List
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Project Topic</span>
                    <p className="text-sm font-medium text-slate-800">{selectedStudent.topic || 'No topic proposed'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Current Status</span>
                      <p className="text-sm font-medium text-slate-800">{selectedStudent.supervisorConfirmationStatus || 'Pending'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Reason Still Pending</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold border bg-red-50 text-red-700 border-red-200 inline-block">
                        {mockReason}
                      </span>
                    </div>
                  </div>
                </div>

                {allocSuccess ? (
                  <div className="text-center p-6 space-y-3 border border-green-200 bg-green-50 rounded-lg">
                    <div className="mx-auto h-12 w-12 rounded bg-green-100 flex items-center justify-center text-green-600 border border-green-200">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-green-800">Allocation Confirmed</h3>
                    <p className="text-sm text-green-700">Student is now locked with PM Assignment. Returning to list...</p>
                  </div>
                ) : (
                  <form onSubmit={handleAllocateSubmit} className="space-y-5 border-t border-slate-100 pt-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Manual Assignment *</label>
                      <select
                        required
                        value={allocSupervisorId}
                        onChange={(e) => setAllocSupervisorId(e.target.value)}
                        className="block w-full p-2.5 bg-white border border-slate-200 rounded text-slate-700 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                      >
                        <option value="">-- Choose supervisor to resolve case --</option>
                        {availableSupervisors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title} {s.name} ({(s.slots !== undefined ? s.slots : s.availableSlots || 0)} slots) - {s.expertise ? s.expertise.split(',')[0] : 'No expertise'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-navy-900 hover:bg-navy-950 text-white rounded text-sm font-semibold transition-colors shadow-md"
                      >
                        Force Allocate Supervisor
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Recommendations Panel */}
              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-4 h-fit">
                <h3 className="text-sm font-bold text-slate-800">Recommended Supervisors</h3>
                <p className="text-xs text-slate-500">Based on research interests & expertise</p>
                <div className="space-y-3">
                  {recommendedSupervisors.map((s) => (
                    <div key={s.id} className="p-3 border border-slate-200 rounded bg-slate-50 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{s.title} {s.name}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[140px]">{s.expertise || s.interests || 'General'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAllocSupervisorId(s.id)}
                        className="text-xs font-bold text-navy-600 hover:text-navy-900"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                  {recommendedSupervisors.length === 0 && (
                    <p className="text-xs text-slate-400">No specific recommendations.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ---------------- ASSESSOR ALLOCATION WORKSPACE TAB ----------------
    if (path === '/pm/assessors') {
      const assessorEligibleStudents = students.filter(s => !s.assessorAssigned); // Backend filters for Confirmed status

      const assessorTableColumns = [
        { header: 'Batch Intake', render: (row) => batches.find(b => b.id === row.batchId)?.intake || row.intake || row.batch || '-' },
        { header: 'Batch Code', accessor: 'batchCode' },
        { header: 'Student Name', accessor: 'name' },
        { header: 'Student Number', accessor: 'id' },
        { header: 'Project Topic', render: (row) => row.topic || '-' },
        { header: 'Confirmed Supervisor', render: (row) => row.supervisor || '-' },
        { header: 'Assigned Assessor', render: (row) => row.assessor || '-' },
        {
          header: 'Action',
          render: (row) => (
            <button
              onClick={() => setAllocStudentId(row.id)}
              className="px-3 py-1.5 text-xs bg-navy-900 text-white rounded hover:bg-navy-950 transition-colors font-medium shadow-sm"
            >
              Assign Assessor
            </button>
          )
        }
      ];

      const selectedStudentForAssessor = allocStudentId ? students.find(s => s.id === allocStudentId) : null;

      const handleAssessorAllocateSubmit = (e) => {
        e.preventDefault();
        if (!allocStudentId || !allocAssessorId) return;

        const student = students.find(s => s.id === allocStudentId);
        const assessor = assessors.find(a => a.id === allocAssessorId);

        if (!student || !assessor) return;

        const updatedStudents = students.map(s =>
          s.id === student.id
            ? {
              ...s,
              assessor: `${assessor.Title || ''} ${assessor.Name}`.trim(),
              assessorAssigned: true
            }
            : s
        );

        setStudents(updatedStudents);
        setAssessorAllocSuccess(true);

        setTimeout(() => {
          setAssessorAllocSuccess(false);
          setAllocStudentId('');
          setAllocAssessorId('');
        }, 1500);
      };

      const handleAssessorUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);

          const newAssessors = json.map((row, index) => ({
            title: row.Title || '',
            Name: row.Name || '',
            Email: row.Email || ''
          }));

          setAssessors(newAssessors);
          alert(`Successfully imported ${newAssessors.length} assessors.`);
          e.target.value = null;
        } catch (error) {
          console.error("Error importing assessors:", error);
          alert("Failed to import assessors. Please check file format.");
        }
      };

      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Assessor Allocation</h1>
            <p className="text-sm text-slate-500">Assign assessors to students with confirmed supervisors.</p>
          </div>

          {/* Assessor Upload Section */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="space-y-2 max-w-xl">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Upload className="h-5 w-5 text-navy-700" />
                Assessor Pool Upload
              </h2>
              <p className="text-sm text-slate-500">
                Upload the assessor list. Expected columns: Title, Name, Email.
              </p>
              <div className="text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded inline-block mt-2">
                Assessors Imported: {assessors.length}
              </div>
            </div>
            <div className="shrink-0 relative group">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleAssessorUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <button className="px-4 py-2 bg-navy-900 text-white rounded font-bold text-sm shadow-md transition-all hover:bg-navy-950 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Choose Excel File
              </button>
            </div>
          </div>

          {!selectedStudentForAssessor ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-bold text-slate-800">Eligible Students ({assessorEligibleStudents.length})</h3>
                {FilterControls()}
              </div>
              <div className="p-0">
                <DataTable columns={assessorTableColumns} data={assessorEligibleStudents} />
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 max-w-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Assign Assessor for: {selectedStudentForAssessor.name}</h3>
                  <p className="text-sm text-slate-500">{selectedStudentForAssessor.id} • {selectedStudentForAssessor.topic}</p>
                </div>
                <button onClick={() => setAllocStudentId('')} className="text-sm font-bold text-navy-600 hover:text-navy-900">
                  Cancel
                </button>
              </div>

              {assessorAllocSuccess ? (
                <div className="text-center p-6 space-y-3 border border-green-200 bg-green-50 rounded-lg">
                  <div className="mx-auto h-12 w-12 rounded bg-green-100 flex items-center justify-center text-green-600 border border-green-200">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-green-800">Assessor Assigned</h3>
                </div>
              ) : (
                <form onSubmit={handleAssessorAllocateSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Select Assessor *</label>
                    <select
                      required
                      value={allocAssessorId}
                      onChange={(e) => setAllocAssessorId(e.target.value)}
                      className="block w-full p-2.5 bg-white border border-slate-200 rounded text-slate-700 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                    >
                      <option value="">-- Choose assessor --</option>
                      {assessors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.Title} {a.Name}
                        </option>
                      ))}
                      {assessors.length === 0 && (
                        <option disabled>Please upload assessors first</option>
                      )}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={assessors.length === 0}
                    className="px-5 py-2.5 bg-navy-900 hover:bg-navy-950 text-white rounded text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    Confirm Assignment
                  </button>
                </form>
              )}
            </div>
          )}
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
                        placeholder="Format: SENG 2421, CB001, John Doe&#10; COM 2421, CB002, Jane Smith"
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

      {/* Edit Batch Modal */}
      {showEditBatch && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-700">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Edit Batch</h3>
                  <p className="text-xs text-slate-500">Update batch details</p>
                </div>
              </div>
              <button onClick={() => setShowEditBatch(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <form id="edit-batch-form" onSubmit={handleEditBatchSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Batch Code</label>
                  <input
                    type="text"
                    required
                    value={editBatchCode}
                    onChange={(e) => setEditBatchCode(e.target.value)}
                    className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Batch Intake</label>
                  <input
                    type="text"
                    required
                    value={editBatchName}
                    onChange={(e) => setEditBatchName(e.target.value)}
                    className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editBatchDate}
                    onChange={(e) => setEditBatchDate(e.target.value)}
                    className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Stage</label>
                  <select
                    value={editBatchStage}
                    onChange={(e) => setEditBatchStage(e.target.value)}
                    className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                  >
                    <option value="Proposal">Proposal</option>
                    <option value="Midpoint">Midpoint</option>
                    <option value="Final">Final</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEditBatch(false)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-700 transition-all shadow-sm hover:shadow"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-batch-form"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supervisor Modal */}
      {showEditSupervisor && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-700">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Edit Supervisor</h3>
                  <p className="text-xs text-slate-500">Update supervisor details</p>
                </div>
              </div>
              <button onClick={() => setShowEditSupervisor(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <form id="edit-supervisor-form" onSubmit={(e) => { e.preventDefault(); handleEditSupervisorSave(); }} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Title</label>
                  <input
                    type="text"
                    value={editSupervisorTitle}
                    onChange={(e) => setEditSupervisorTitle(e.target.value)}
                    className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Name</label>
                  <input
                    type="text"
                    required
                    value={editSupervisorName}
                    onChange={(e) => setEditSupervisorName(e.target.value)}
                    className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    value={editSupervisorEmail}
                    onChange={(e) => setEditSupervisorEmail(e.target.value)}
                    className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Expertise</label>
                  <input
                    type="text"
                    value={editSupervisorExpertise}
                    onChange={(e) => setEditSupervisorExpertise(e.target.value)}
                    placeholder="Comma separated"
                    className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Research Interests</label>
                  <input
                    type="text"
                    value={editSupervisorResearchInterests}
                    onChange={(e) => setEditSupervisorResearchInterests(e.target.value)}
                    placeholder="Comma separated"
                    className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Additional Information</label>
                  <input
                    type="text"
                    value={editSupervisorAdditionalInformation}
                    onChange={(e) => setEditSupervisorAdditionalInformation(e.target.value)}
                    className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Preferred Slots</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editSupervisorPreferredSupervisionSlots}
                    onChange={(e) => setEditSupervisorPreferredSupervisionSlots(parseInt(e.target.value, 10))}
                    className="block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 transition-all focus:bg-white"
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEditSupervisor(false)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-700 transition-all shadow-sm hover:shadow"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-supervisor-form"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Save Changes
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
