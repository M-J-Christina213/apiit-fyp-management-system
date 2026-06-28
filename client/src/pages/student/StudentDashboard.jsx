import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import DashboardCard from '../../components/common/DashboardCard';
import DataTable from '../../components/common/DataTable';

import {
  Target,
  UserCheck,
  FileText,
  AlertCircle,
  Clock,
  Search,
  Upload,
  Download,
  CheckCircle,
  ChevronRight,
  Bell,
  Plus,
  X,
  Eye
} from 'lucide-react';

import {
  getSupervisors,
  getStudents,
  getProposalRequests,
  getLoggedInUser,
  getTemplates,
  downloadTemplate
} from "../../services/api.js";

const StudentDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const [supervisors, setSupervisors] = useState([]);
  const [students, setStudents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState(null);

  // Proposal form state
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [topic, setTopic] = useState('');
  const [abstract, setAbstract] = useState('');
  const [fileName, setFileName] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Logsheets state
  const [logsheets, setLogsheets] = useState([]);
  const [showLogsheetModal, setShowLogsheetModal] = useState(false);
  const [logDate, setLogDate] = useState('');
  const [logType, setLogType] = useState('Physical');
  const [logSummary, setLogSummary] = useState('');
  const [logProgress, setLogProgress] = useState('');
  const [logAction, setLogAction] = useState('');
  const [showLogsheetAlert, setShowLogsheetAlert] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [supRes, stuRes, propRes] = await Promise.all([
          getSupervisors(),
          getStudents(),
          getProposalRequests()
        ]);

        setSupervisors(supRes.data);
        setStudents(stuRes.data);
        setProposals(propRes.data);

        const loggedIn = getLoggedInUser();
        if (loggedIn) {
          setCurrentUser(loggedIn);
        }

        // Mock logsheets
        const initialLogsheets = [
          {
            id: 'L001',
            studentId: 'CB014416',
            semester: 1,
            meetingDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 40 days ago
            meetingType: 'Physical',
            summary: 'Discussed initial project scope and feasibility',
            progressUpdate: 'Completed literature review phase 1',
            nextAction: 'Draft chapter 1 introduction',
            status: 'Approved',
          }
        ];
        setLogsheets(initialLogsheets);

        const studentId = loggedIn?.email ? loggedIn.email.split('@')[0].toUpperCase() : 'CB014416';
        const myLogsheets = initialLogsheets.filter(l => l.studentId === studentId);

        if (myLogsheets.length > 0) {
          const sorted = myLogsheets.sort((a, b) => new Date(b.meetingDate) - new Date(a.meetingDate));
          const lastDate = new Date(sorted[0].meetingDate);
          const daysSince = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
          if (daysSince > 30) {
            setShowLogsheetAlert(true);
          }
        } else {
          setShowLogsheetAlert(true);
        }

      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };

    loadData();
  }, [path]);

  // Fetch templates when navigating to /student/templates
  useEffect(() => {
    if (path === '/student/templates') {
      setTemplatesLoading(true);
      setTemplatesError(null);
      getTemplates()
        .then(res => {
          setTemplates(res.data || []);
          setTemplatesLoading(false);
        })
        .catch(err => {
          console.error('Failed to load templates:', err);
          setTemplatesError('Unable to load templates. Please try again later.');
          setTemplatesLoading(false);
        });
    }
  }, [path]);

  useEffect(() => {

    if (path === "/student/templates") {
      fetchTemplates();
    }

  }, [path]);



  // Find current student record
  const currentStudent = students?.find(
    s => s.email === currentUser?.email
  ) || {
    id: 'CB014416',
    name: 'Christina Wanigasekara',
    email: 'CB014416@students.apiit.lk',
    batch: '2024-Feb',
    status: 'Proposal Pending',
    topic: 'AI Powered FYP Management System',
    supervisor: 'Mr. Kavin Kumar'
  };

  // Find student's proposal request
  const myProposalRequest = proposals.find(
    p => p.studentId === currentStudent.id
  );

  const handleProposalSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSupervisorId || !topic || !abstract) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const selectedSupervisor = supervisors.find(
        s => s.id === selectedSupervisorId
      );

      await createProposal({
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        supervisor: selectedSupervisor?.name,
        topic,
        status: "Pending",
        submittedDate: new Date().toISOString().split("T")[0]
      });

      setFormSubmitted(true);

      setTopic("");
      setAbstract("");
      setFileName("");

    } catch (error) {
      console.error(error);
      alert("Failed to submit proposal");
    }
  };

  const handleViewTemplate = (id) => {
    window.open(
      `http://localhost:5000/api/templates/view/${id}`,
      "_blank"
    );
  };

  const handleStudentDownload = (id) => {
    window.open(
      `http://localhost:5000/api/templates/download/${id}`,
      "_self"
    );
  };

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      setTemplatesError(null);

      const res = await fetch("http://localhost:5000/api/templates");

      if (!res.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await res.json();

      setTemplates(data);
    } catch (err) {
      console.error(err);
      setTemplatesError("Unable to load templates.");
    } finally {
      setTemplatesLoading(false);
    }
  };



  const handleLogsheetSubmit = (e) => {
    e.preventDefault();
    if (!logDate || !logType || !logSummary || !logProgress || !logAction) {
      alert("Please fill in all required fields.");
      return;
    }

    const newLog = {
      id: `L00${logsheets.length + 1}`,
      studentId: currentStudent.id,
      semester: 1,
      meetingDate: logDate,
      meetingType: logType,
      summary: logSummary,
      progressUpdate: logProgress,
      nextAction: logAction,
      status: 'Submitted',
      createdAt: new Date().toISOString()
    };

    setLogsheets([...logsheets, newLog]);
    setShowLogsheetModal(false);
    setShowLogsheetAlert(false);

    setLogDate('');
    setLogType('Physical');
    setLogSummary('');
    setLogProgress('');
    setLogAction('');

    alert("Logsheet submitted successfully!");
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    }
  };

  // Available supervisors table columns
  const supervisorColumns = [
    {
      header: 'Supervisor Name',
      render: (row) => `${row.title} ${row.name}`
    },
    { header: 'Expertise Areas', accessor: 'expertise' },
    { header: 'Research Interests', accessor: 'research_interests' },
    {
      header: 'Available Slots',
      render: (row) => (
        <span className={`font-semibold ${row.availableSlots > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {row.availableSlots} {row.availableSlots === 1 ? 'slot' : 'slots'}
        </span>
      )
    },
    {
      header: 'Action',
      render: (row) => (
        <button
          onClick={() => {
            setSelectedSupervisorId(row.id);
            navigate('/student/proposal');
          }}
          disabled={row.availableSlots === 0}
          className="px-3 py-1 bg-navy-900 hover:bg-navy-950 text-white text-xs font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Select for Proposal
        </button>
      )
    }
  ];

  // Render view depending on URL sub-path
  const renderContent = () => {
    // ---------------- STUDENT DASHBOARD TAB ----------------
    if (path === '/student/dashboard' || path === '/student') {
      // Pending actions counter
      let pendingActionsCount = 0;
      let pendingActionsText = [];
      if (currentStudent.status === 'Unassigned' && !myProposalRequest) {
        pendingActionsCount++;
        pendingActionsText.push("Submit a proposal request");
      }
      if (!currentStudent.topic) {
        pendingActionsCount++;
        pendingActionsText.push("Define tentative fyp topic");
      }
      if (pendingActionsCount === 0) {
        pendingActionsCount = 0;
        pendingActionsText.push("No urgent actions pending");
      }

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Welcome, Christina Wanigasekara
              </h1>

              <p className="text-sm text-slate-500">
                Student ID: CB014416
              </p>
            </div>
          </div>

          {showLogsheetAlert && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md shadow-sm mb-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-800">Logsheet Reminder</h3>
                <p className="text-sm text-amber-700 mt-1">
                  You haven't submitted a supervisor meeting logsheet in the last month. Please ensure you record your recent meeting to stay on track with FYP requirements.
                </p>
              </div>
            </div>
          )}

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
            <DashboardCard
              title="Supervisor Meetings"
              value={`${logsheets.filter(l => l.studentId === currentStudent.id).length}/12`}
              subtitle={`Semester 1 progress`}
              icon={Clock}
            />
            <DashboardCard
              title="Current Stage"
              value={currentStudent.status === 'Assigned' ? 'Milestone 1: Progress' : 'Milestone 0: Proposal'}
              subtitle="Stage 1 of 4"
              icon={Target}
            />
            <DashboardCard
              title="Assigned Supervisor"
              value={currentStudent.supervisor || 'Pending'}
              subtitle={currentStudent.supervisorConfirmationStatus === 'Allocated' ? 'Assigned by PM' : currentStudent.supervisor ? 'Allocation Confirmed' : 'Awaiting Supervisor Match'}
              icon={UserCheck}
            />
            <DashboardCard
              title="Proposal Status"
              value={myProposalRequest ? myProposalRequest.status : (currentStudent.status === 'Assigned' ? 'Approved' : 'Draft')}
              subtitle={
                myProposalRequest
                  ? `Submitted on ${myProposalRequest.submittedDate}`
                  : 'Not submitted yet'
              }
              icon={FileText}
            />
            <DashboardCard
              title="Pending Actions"
              value={pendingActionsCount}
              subtitle={pendingActionsText.join(", ")}
              icon={AlertCircle}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Main Content Area - Available Supervisors */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-[#0C2340]">Available Supervisors</h3>
                  <Link to="/student/supervisors" className="text-xs font-semibold text-navy-600 hover:text-navy-800 flex items-center gap-0.5">
                    View Full Pool <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <DataTable columns={supervisorColumns.slice(0, 4)} data={supervisors.slice(0, 3)} />
              </div>
            </div>

            {/* Right Panel - Recent Activity */}
            <div className="space-y-6">
              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-[#0C2340] mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {[
                    { action: myProposalRequest ? `Submitted proposal: "${myProposalRequest.topic}"` : 'Updated project details', time: 'Recently' },
                    { action: 'Viewed available supervisor listings', time: '1 day ago' },
                    { action: 'Logged into APIIT FYPMS Portal', time: '2 days ago' }
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="mt-0.5 p-1.5 bg-slate-100 text-slate-500 rounded">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs md:text-sm font-semibold text-slate-700">{activity.action}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ---------------- SUPERVISORS TAB ----------------
    if (path === '/student/supervisors') {
      const filteredSupervisors = supervisors.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.expertise.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.interests.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Faculty Supervisors Pool</h1>
            <p className="text-sm text-slate-500">Explore supervisor availability, research fields, and areas of expertise to match your project ideas.</p>
          </div>

          <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-4">
            <div className="relative w-full max-w-md">
              <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name, expertise, interests..."
                className="pl-10 pr-4 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900 w-full transition-colors"
              />
            </div>

            <DataTable columns={supervisorColumns} data={filteredSupervisors} />
          </div>
        </div>
      );
    }

    // ---------------- PROPOSAL SUBMISSION TAB ----------------
    if (path === '/student/proposal') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Submit Project Proposal</h1>
            <p className="text-sm text-slate-500">Submit your tentative project topic and outline document for review and supervisor matching.</p>
          </div>

          {formSubmitted ? (
            <div className="bg-white p-8 rounded border border-slate-200 shadow-sm text-center max-w-xl mx-auto space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Proposal Request Submitted</h3>
              <p className="text-sm text-slate-600">
                Your proposal has been successfully registered. The selected supervisor has been notified, and your dashboard status has updated to <strong>Proposal Pending</strong>.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setFormSubmitted(false);
                    navigate('/student/dashboard');
                  }}
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded text-sm font-semibold transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded border border-slate-200 shadow-sm">
                <form onSubmit={handleProposalSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Project Student Details</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        disabled
                        value={currentStudent.name}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-500 text-sm cursor-not-allowed"
                      />
                      <input
                        type="text"
                        disabled
                        value={currentStudent.id}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-500 text-sm cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Target Supervisor *</label>
                    <select
                      required
                      value={selectedSupervisorId}
                      onChange={(e) => setSelectedSupervisorId(e.target.value)}
                      className="block w-full p-2.5 bg-white border border-slate-200 rounded text-slate-700 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                    >
                      <option value="">-- Choose an available supervisor --</option>
                      {supervisors.map((s) => (
                        <option
                          key={s.id}
                          value={s.id}
                          disabled={s.availableSlots === 0}
                        >
                          {s.title} {s.name} ({s.availableSlots} {s.availableSlots === 1 ? 'slot' : 'slots'} available) - {s.expertise.split(',')[0]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Tentative Topic *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AI-driven Clinical Prognostics and Patient Monitoring"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="block w-full p-2.5 bg-white border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Brief Abstract / Project Overview *</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Provide a 150-250 word summary covering the problem statement, objectives, and proposed methodology..."
                      value={abstract}
                      onChange={(e) => setAbstract(e.target.value)}
                      className="block w-full p-2.5 bg-white border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Upload Project Proposal Document (PDF) *</label>
                    <div className="border border-dashed border-slate-300 rounded p-6 text-center space-y-2">
                      <div className="flex justify-center text-slate-400">
                        <Upload className="h-8 w-8" />
                      </div>
                      <div className="text-xs text-slate-500">
                        <label className="cursor-pointer font-bold text-navy-800 hover:text-navy-950 underline">
                          Choose a PDF file
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <span> or drag and drop</span>
                      </div>
                      <p className="text-[10px] text-slate-400">PDF only. Maximum size 10MB.</p>
                      {fileName && (
                        <div className="p-2 bg-slate-50 border border-slate-200 text-xs text-slate-700 inline-block rounded font-medium">
                          Selected: {fileName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-navy-900 hover:bg-navy-950 text-white rounded text-sm font-semibold transition-colors"
                    >
                      Submit Proposal Request
                    </button>
                  </div>
                </form>
              </div>

              {/* Guidelines panel */}
              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-4 h-fit">
                <h3 className="text-sm font-bold text-[#0C2340] uppercase tracking-wider">Proposal Guidelines</h3>
                <ul className="text-xs text-slate-600 space-y-2.5 list-disc pl-4">
                  <li>Ensure your fyp proposal describes a clear research problem appropriate for academic levels.</li>
                  <li>Verify that your tentative supervisor has available slots before submitting.</li>
                  <li>The proposal PDF document must include:
                    <ul className="list-circle pl-4 mt-1 space-y-1">
                      <li>Introduction & Objectives</li>
                      <li>Literature Review Outline</li>
                      <li>Research Methodology</li>
                      <li>Project Plan (Gantt Chart)</li>
                    </ul>
                  </li>
                  <li>Evaluations normally take 5-7 working days. You will receive an email and notification upon approval.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ---------------- TEMPLATES TAB ----------------
    if (path === '/student/templates') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Academic Templates
                </h1>

                <p className="text-sm text-slate-500">
                  View and download the latest FYP templates.
                </p>
              </div>

              <div className="bg-slate-100 px-3 py-2 rounded-lg text-center">
                <p className="text-xs text-slate-500">
                  Available
                </p>

                <p className="text-lg font-bold text-navy-900">
                  {templates.length}
                </p>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {templatesLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-10 w-10 border-4 border-slate-200 border-t-navy-900 rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-medium text-slate-500">Loading templates...</p>
            </div>
          )}

          {/* Error State */}
          {templatesError && !templatesLoading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="h-10 w-10 mx-auto text-red-400 mb-3" />
              <p className="text-sm font-semibold text-red-700">{templatesError}</p>
              <button
                onClick={fetchTemplates}
                className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-bold transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!templatesLoading && !templatesError && templates.length === 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm text-center py-16 px-6">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No templates have been uploaded yet.</p>
              <p className="text-xs text-slate-400 mt-1">Your project manager will upload templates here when they are available.</p>
            </div>
          )}

          {/* Templates List */}
          {!templatesLoading && !templatesError && templates.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm divide-y divide-slate-200">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0 mt-0.5">
                      {tmpl.file_type === ".pdf" ? (
                        <FileText className="h-5 w-5 text-red-600" />
                      ) : tmpl.file_type === ".docx" ? (
                        <FileText className="h-5 w-5 text-blue-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 truncate">{tmpl.title}</h4>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-bold uppercase text-[10px]">
                            {(tmpl.file_type || '').replace('.', '') || '?'}
                          </span>
                          {tmpl.file_name || '-'}
                        </span>
                        {tmpl.file_size && (
                          <>
                            <span>•</span>
                            <span>{tmpl.file_size}</span>
                          </>
                        )}
                        {tmpl.uploaded_at && (
                          <>
                            <span>•</span>
                            <span>Uploaded: {new Date(tmpl.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-stretch sm:self-auto">
                    <button
                      onClick={() => handleViewTemplate(tmpl.id)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-600 rounded text-xs font-bold transition-colors bg-white select-none whitespace-nowrap justify-center flex-1 sm:flex-none"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                    <button
                      onClick={() => handleStudentDownload(tmpl.id)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:border-navy-900 text-slate-700 hover:text-navy-900 rounded text-xs font-bold transition-colors bg-white select-none whitespace-nowrap justify-center flex-1 sm:flex-none"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ---------------- NOTIFICATIONS TAB ----------------
    if (path === '/student/notifications') {
      const allNotifications = [
        { id: 1, type: 'System', title: 'Portal Maintenance Notice', message: 'The FYPMS portal will undergo scheduled database maintenance on Sunday from 02:00 AM to 04:00 AM. Access may be temporarily interrupted.', date: '2026-06-12', time: '10:00 AM' },
        { id: 2, type: 'Proposal', title: 'Proposal Status Updated', message: 'Your supervisor assignment status has changed. If you submitted a proposal, it is now awaiting review by the designated faculty supervisor.', date: '2026-06-11', time: '04:30 PM' },
        { id: 3, type: 'Academic', title: 'FYP Guideline Updates Released', message: 'Staffordshire University has released updated guidelines for ethics clearances. Please make sure to download the latest v3.1 Ethics Application from the Templates tab.', date: '2026-06-08', time: '09:15 AM' },
      ];

      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Inbox Notifications</h1>
            <p className="text-sm text-slate-500">Track milestones, updates from supervisors, and notices from the Project Management office.</p>
          </div>

          <div className="space-y-4">
            {allNotifications.map((notif) => (
              <div key={notif.id} className="bg-white p-5 rounded border border-slate-200 shadow-sm flex items-start gap-4">
                <div className="p-2.5 bg-navy-50 text-navy-900 rounded">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-800">{notif.title}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{notif.type}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{notif.message}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{notif.date} at {notif.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ---------------- LOGSHEETS TAB ----------------
    if (path === '/student/logsheets') {
      const myLogsheets = logsheets.filter(l => l.studentId === currentStudent.id);

      const logsheetColumns = [
        { header: 'Meeting Date', render: (row) => new Date(row.meetingDate).toLocaleDateString() },
        {
          header: 'Type', render: (row) => (
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${row.meetingType === 'Online' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              {row.meetingType}
            </span>
          )
        },
        { header: 'Discussion Summary', render: (row) => <span className="line-clamp-2" title={row.summary}>{row.summary}</span> },
        {
          header: 'Status', render: (row) => (
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${row.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {row.status}
            </span>
          )
        }
      ];

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-800">Supervisor Meeting Logsheets</h1>
              <p className="text-sm text-slate-500">Record and track your mandatory supervisor meetings to ensure academic compliance.</p>
            </div>
            <button
              onClick={() => setShowLogsheetModal(true)}
              className="px-4 py-2 bg-navy-900 text-white rounded font-bold text-sm shadow-md transition-all hover:bg-navy-950 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Submit Logsheet
            </button>
          </div>

          {/* Templates Section inside Logsheets */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Logsheet Templates</h3>
              <p className="text-sm text-slate-600 mt-1">Download the approved logsheet format before your meeting, fill it offline, and upload it when submitting.</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded font-bold text-sm shadow-sm transition-all hover:bg-slate-100 flex items-center gap-2">
                <Download className="h-4 w-4" /> Example Template
              </button>
              <button className="px-4 py-2 bg-white border border-slate-300 text-navy-700 rounded font-bold text-sm shadow-sm transition-all hover:bg-slate-100 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Official Format (Word)
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800">Submitted Logsheets</h3>
            </div>
            <div className="p-0">
              {myLogsheets.length > 0 ? (
                <DataTable columns={logsheetColumns} data={myLogsheets} />
              ) : (
                <div className="p-12 text-center">
                  <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 mb-4">
                    <FileText className="h-6 w-6 text-slate-300" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No logsheets submitted</h3>
                  <p className="text-xs text-slate-500 mt-1">Submit your first supervisor meeting logsheet to track progress.</p>
                </div>
              )}
            </div>
          </div>

          {/* Modal */}
          {showLogsheetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-navy-700" />
                    Submit Logsheet
                  </h2>
                  <button onClick={() => setShowLogsheetModal(false)} className="text-slate-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto">
                  <form id="logsheet-form" onSubmit={handleLogsheetSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Meeting Date *</label>
                        <input
                          type="date"
                          required
                          value={logDate}
                          onChange={(e) => setLogDate(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-900 bg-slate-50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Meeting Type *</label>
                        <select
                          required
                          value={logType}
                          onChange={(e) => setLogType(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-900 bg-slate-50"
                        >
                          <option value="Physical">Physical (On-campus)</option>
                          <option value="Online">Online (Teams/Zoom)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Discussion Summary *</label>
                      <textarea
                        required
                        value={logSummary}
                        onChange={(e) => setLogSummary(e.target.value)}
                        placeholder="Briefly describe what was discussed..."
                        className="w-full p-3 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-900 bg-slate-50 h-24 resize-none"
                      ></textarea>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Progress Updates *</label>
                      <textarea
                        required
                        value={logProgress}
                        onChange={(e) => setLogProgress(e.target.value)}
                        placeholder="What have you completed since the last meeting?"
                        className="w-full p-3 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-900 bg-slate-50 h-24 resize-none"
                      ></textarea>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Next Action Points *</label>
                      <textarea
                        required
                        value={logAction}
                        onChange={(e) => setLogAction(e.target.value)}
                        placeholder="What are you supposed to do before the next meeting?"
                        className="w-full p-3 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-900 bg-slate-50 h-20 resize-none"
                      ></textarea>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Upload Supporting Logsheet (Optional)</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setLogFile(e.target.files[0])}
                        className="w-full p-2 border border-slate-300 rounded text-sm bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100 transition-all cursor-pointer"
                      />
                      <p className="text-xs text-slate-500 mt-1">Attach the signed logsheet document if required by your supervisor.</p>
                    </div>
                  </form>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowLogsheetModal(false)}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="logsheet-form"
                    className="px-6 py-2 bg-navy-900 hover:bg-navy-950 text-white text-sm font-bold rounded transition-colors shadow-md"
                  >
                    Submit Logsheet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return renderContent();
};

export default StudentDashboard;
