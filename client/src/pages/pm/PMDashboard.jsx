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
} from 'lucide-react';

import * as XLSX from "xlsx";

import {
  getStudents,
  getSupervisors,
  getProposalRequests,
  getBatches,
  createBatch
} from "../../services/api";

const PMDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const [students, setStudents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState({});
  const [proposals, setProposals] = useState([]);

  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDate, setNewBatchDate] = useState('');
  const [newBatchCount, setNewBatchCount] = useState('');

  // NEW: student input options
  const [batchStudentsText, setBatchStudentsText] = useState('');
  const [batchFile, setBatchFile] = useState(null);

  const [allocStudentId, setAllocStudentId] = useState('');
  const [allocSupervisorId, setAllocSupervisorId] = useState('');
  const [allocSuccess, setAllocSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [stuRes, supRes, propRes, batchRes] = await Promise.all([
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

  // -----------------------------
  // IMPORT DEMO STUDENTS
  // -----------------------------
  const handleImportStudents = () => {
    const imported = [
      {
        id: 'CB008',
        name: 'Gary Neville',
        batch: '2024-Sep',
        status: 'Unassigned',
        email: 'cb008@students.lk',
        topic: 'Cybersecurity AI',
        supervisor: null
      },
      {
        id: 'CB009',
        name: 'Harry Kane',
        batch: '2024-Feb',
        status: 'Unassigned',
        email: 'cb009@students.lk',
        topic: 'Code Analysis AI',
        supervisor: null
      }
    ];

    const updated = [...students, ...imported];
    setStudents(updated);

    setShowImport(false);
    alert("Demo students imported successfully");
  };

  // -----------------------------
  // EXPORT / REPORT
  // -----------------------------
  const handleExportExcel = () => {
    alert("Exporting Excel...");
  };

  const handleGenerateReport = () => {
    alert("Generating report...");
  };

  // -----------------------------
  // ALLOCATION
  // -----------------------------
  const handleAllocateSubmit = (e) => {
    e.preventDefault();

    const student = students.find(s => s.id === allocStudentId);
    const supervisor = supervisors.find(s => s.id === allocSupervisorId);

    if (!student || !supervisor) return;

    const updatedStudents = students.map(s =>
      s.id === student.id
        ? { ...s, supervisor: supervisor.name, status: 'Assigned' }
        : s
    );

    const updatedSupervisors = supervisors.map(s =>
      s.id === supervisor.id
        ? { ...s, slots: Math.max(0, s.slots - 1) }
        : s
    );

    setStudents(updatedStudents);
    setSupervisors(updatedSupervisors);

    setAllocSuccess(true);
    setAllocStudentId('');
    setAllocSupervisorId('');

    setTimeout(() => setAllocSuccess(false), 1500);
  };

  // -----------------------------
  // FIXED: CREATE BATCH (WITH STUDENTS)
  // -----------------------------
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
            return { studentNo, name };
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
          name: row.name || row.Name
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

      // reset
      setShowAddBatch(false);
      setNewBatchName('');
      setNewBatchDate('');
      setNewBatchCount('');
      setBatchStudentsText('');
      setBatchFile(null);

      alert("Batch created successfully with students!");

    } catch (error) {
      console.error("Batch creation failed:", error);
    }
  };

  // -----------------------------
  // NEW: UPDATE BATCH STAGE
  // -----------------------------
  const updateBatchStage = (batchId, newStage) => {
    const updated = batches.map(b =>
      b.id === batchId ? { ...b, stage: newStage } : b
    );
    setBatches(updated);
  };

  // -----------------------------
  // TABLES
  // -----------------------------
  const supervisorPoolColumns = [
    { header: 'Title', accessor: 'title' },
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Expertise', accessor: 'expertise' },
    {
      header: 'Slots',
      render: (row) => (
        <span className={row.slots > 0 ? 'text-green-600' : 'text-red-500'}>
          {row.slots}
        </span>
      )
    }
  ];

  const studentColumns = [
    { header: 'Batch', accessor: 'batch' },
    { header: 'Student', accessor: 'name' },
    { header: 'ID', accessor: 'id' },
    { header: 'Supervisor', render: (r) => r.supervisor || '-' }
  ];

  const batchColumns = [
    { header: 'ID', accessor: 'id' },
    { header: 'Intake', accessor: 'intake' },
    { header: 'Start Date', accessor: 'startDate' },
    { header: 'Students', accessor: 'studentCount' },
    { header: 'Stage', accessor: 'stage' },
    {
      header: 'Actions',
      render: (batch) => (
        <div className="flex gap-2">
          <button onClick={() => updateBatchStage(batch.id, "Proposal")}>Proposal</button>
          <button onClick={() => updateBatchStage(batch.id, "Midpoint")}>Mid</button>
          <button onClick={() => updateBatchStage(batch.id, "Final")}>Final</button>
          <button onClick={() => updateBatchStage(batch.id, "Completed")}>Done</button>
        </div>
      )
    }
  ];

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <>
      <div className="p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between">
          <h1 className="text-xl font-bold">PM Dashboard</h1>

          <div className="flex gap-2">
            <button onClick={() => setShowAddBatch(true)}>Add Batch</button>
            <button onClick={() => setShowImport(true)}>Import Students</button>
          </div>
        </div>

        {/* BATCH TABLE */}
        <div className="bg-white p-4 rounded border">
          <DataTable columns={batchColumns} data={batches} />
        </div>

        {/* STUDENTS */}
        <div className="bg-white p-4 rounded border">
          <DataTable columns={studentColumns} data={students} />
        </div>
      </div>

      {/* ---------------- MODAL: ADD BATCH ---------------- */}
      {showAddBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <form onSubmit={handleAddBatchSubmit} className="bg-white p-6 rounded w-[500px] space-y-3">

            <input placeholder="Intake"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)} />

            <input type="date"
              value={newBatchDate}
              onChange={(e) => setNewBatchDate(e.target.value)} />

            <input type="number"
              placeholder="Student Count"
              value={newBatchCount}
              onChange={(e) => setNewBatchCount(e.target.value)} />

            {/* TEXT INPUT */}
            <textarea
              placeholder="CB001, John"
              value={batchStudentsText}
              onChange={(e) => setBatchStudentsText(e.target.value)}
            />

            {/* FILE INPUT */}
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setBatchFile(e.target.files[0])}
            />

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddBatch(false)}>Cancel</button>
              <button type="submit">Create</button>
            </div>

          </form>
        </div>
      )}

      {/* ---------------- IMPORT MODAL ---------------- */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded">
            <p>Import demo students?</p>

            <button onClick={handleImportStudents}>Import</button>
            <button onClick={() => setShowImport(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};

export default PMDashboard;