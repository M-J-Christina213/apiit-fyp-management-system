import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import DashboardCard from '../../components/common/DashboardCard';
import DataTable from '../../components/common/DataTable';
import {
  getSupervisors,
  getStudents,
  getProposalRequests,
  saveProposalRequests,
  saveStudents,
  getLoggedInUser
} from '../../../../server/data/mockData';
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
  Bell
} from 'lucide-react';

const StudentDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const [supervisors, setSupervisors] = useState([]);
  const [students, setStudents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Proposal form state
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [topic, setTopic] = useState('');
  const [abstract, setAbstract] = useState('');
  const [fileName, setFileName] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSupervisors(getSupervisors());
    setStudents(getStudents());
    setProposals(getProposalRequests());

    const loggedIn = getLoggedInUser();
    if (loggedIn) {
      setCurrentUser(loggedIn);
    }
  }, [path]);

  // Find current student record
  const currentStudent = students.find(s => s.email === currentUser?.email) || students[0] || {
    id: 'CB001',
    name: 'John Doe',
    batch: '2024-Feb',
    status: 'Proposal Pending',
    topic: 'AI in Healthcare',
    supervisor: 'Dr. Alan Smith'
  };

  // Find student's proposal request
  const myProposalRequest = proposals.find(p => p.studentNumber === currentStudent.id);

  // Proposal Submission Handler
  const handleProposalSubmit = (e) => {
    e.preventDefault();
    if (!selectedSupervisorId || !topic || !abstract) {
      alert("Please fill in all required fields.");
      return;
    }

    const selectedSupervisor = supervisors.find(s => s.id === selectedSupervisorId);

    // Create new request
    const newRequest = {
      id: 'PR' + String(proposals.length + 1).padStart(3, '0'),
      studentName: currentStudent.name,
      studentNumber: currentStudent.id,
      topic: topic,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      supervisorName: selectedSupervisor ? selectedSupervisor.name : 'Unknown'
    };

    const updatedProposals = [...proposals, newRequest];
    saveProposalRequests(updatedProposals);
    setProposals(updatedProposals);

    // Update student topic & status
    const updatedStudents = students.map(s =>
      s.id === currentStudent.id
        ? { ...s, topic: topic, status: 'Proposal Pending', supervisor: selectedSupervisor ? `${selectedSupervisor.title} ${selectedSupervisor.name}` : null }
        : s
    );
    saveStudents(updatedStudents);
    setStudents(updatedStudents);

    setFormSubmitted(true);
    setTopic('');
    setAbstract('');
    setFileName('');
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
    { header: 'Research Interests', accessor: 'interests' },
    {
      header: 'Available Slots',
      render: (row) => (
        <span className={`font-semibold ${row.slots > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {row.slots} {row.slots === 1 ? 'slot' : 'slots'}
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
          disabled={row.slots === 0}
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
            <h1 className="text-2xl font-bold text-slate-800">Student Portal</h1>
            <span className="text-sm text-slate-500 font-medium">Batch: {currentStudent.batch}</span>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <DashboardCard
              title="Current Stage"
              value={currentStudent.status === 'Assigned' ? 'Milestone 1: Progress' : 'Milestone 0: Proposal'}
              subtitle="Stage 1 of 4"
              icon={Target}
            />
            <DashboardCard
              title="Assigned Supervisor"
              value={currentStudent.supervisor || 'Pending'}
              subtitle={currentStudent.supervisor ? 'Allocation Confirmed' : 'Awaiting Supervisor Match'}
              icon={UserCheck}
            />
            <DashboardCard
              title="Proposal Status"
              value={myProposalRequest ? myProposalRequest.status : (currentStudent.status === 'Assigned' ? 'Approved' : 'Draft')}
              subtitle={myProposalRequest ? `Submitted on ${myProposalRequest.date}` : 'Not submitted yet'}
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
                        <option key={s.id} value={s.id} disabled={s.slots === 0}>
                          {s.title} {s.name} ({s.slots} {s.slots === 1 ? 'slot' : 'slots'} available) - {s.expertise.split(',')[0]}
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
      const templates = [
        { name: "Final Year Project Proposal Template", type: "Word Document (DOCX)", size: "240 KB", version: "v1.2", date: "2026-01-15" },
        { name: "Interim Research Progress Report Format", type: "Word Document (DOCX)", size: "190 KB", version: "v1.0", date: "2025-11-20" },
        { name: "Staffordshire University Final Thesis Template", type: "Word Document (DOCX)", size: "1.2 MB", version: "v2.4", date: "2026-02-10" },
        { name: "Ethics Application and Clearance Form", type: "PDF Document", size: "380 KB", version: "v3.1", date: "2026-03-01" },
        { name: "Turnitin Assessment Plagiarism Checklist", type: "PDF Document", size: "150 KB", version: "v1.1", date: "2025-08-05" },
      ];

      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Academic Guides & Templates</h1>
            <p className="text-sm text-slate-500">Download authorized templates, guidelines, and evaluation rubrics provided by the FYP committee.</p>
          </div>

          <div className="bg-white rounded border border-slate-200 shadow-sm divide-y divide-slate-200">
            {templates.map((tmpl, idx) => (
              <div key={idx} className="p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">{tmpl.name}</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                    <span>Format: {tmpl.type}</span>
                    <span>•</span>
                    <span>Size: {tmpl.size}</span>
                    <span>•</span>
                    <span>Version: {tmpl.version}</span>
                    <span>•</span>
                    <span>Released: {tmpl.date}</span>
                  </div>
                </div>
                <button
                  onClick={() => alert(`Downloading file: ${tmpl.name}`)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:border-navy-900 text-slate-700 hover:text-navy-900 rounded text-xs font-bold transition-colors bg-white select-none whitespace-nowrap self-stretch sm:self-auto justify-center"
                >
                  <Download className="h-4 w-4" /> Download File
                </button>
              </div>
            ))}
          </div>
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

    return null;
  };

  return renderContent();
};

export default StudentDashboard;
