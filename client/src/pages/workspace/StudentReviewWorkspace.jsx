import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  FileText,
  Download,
  ExternalLink,
  Save,
  Send,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  HelpCircle,
  FileUp,
  FolderOpen,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Check,
  Eye,
  Info
} from "lucide-react";
import {
  getReviewWorkspace,
  uploadManualReviewCopy,
  getSubmissionFileUrl,
  saveReviewerNotes,
  releaseFeedback,
  syncWithLms,
  getLoggedInUser
} from "../../services/api";

export default function StudentReviewWorkspace() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Selected stage: Proposal, Midpoint, Final
  const [selectedStage, setSelectedStage] = useState("Proposal");
  const [workspaceData, setWorkspaceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected submission file for viewing
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Notes & Viva questions state
  const [activeRightTab, setActiveRightTab] = useState("notes"); // 'notes', 'questions', 'feedback'
  const [privateNotes, setPrivateNotes] = useState("");
  const [vivaQuestions, setVivaQuestions] = useState([]);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [draftFeedback, setDraftFeedback] = useState("");
  const [releasedFeedback, setReleasedFeedback] = useState("");
  const [pageReference, setPageReference] = useState("");

  // Saving states & concurrency
  const [noteVersion, setNoteVersion] = useState(1);
  const [saveStatus, setSaveStatus] = useState("saved"); // 'saved', 'saving', 'unsaved', 'error', 'conflict'
  const [saveMessage, setSaveMessage] = useState("");
  const [releasingFeedback, setReleasingFeedback] = useState(false);
  const [feedbackSuccessMessage, setFeedbackSuccessMessage] = useState("");

  // Manual copy upload modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // LMS Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState(null);

  // Responsive active panel for small screens
  const [mobilePanel, setMobilePanel] = useState("document"); // 'submissions', 'document', 'notes'

  const user = getLoggedInUser();

  // Load workspace data when studentId or selectedStage changes
  useEffect(() => {
    if (!studentId) return;
    loadWorkspace(selectedStage);
  }, [studentId, selectedStage]);

  const loadWorkspace = async (stage) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReviewWorkspace(studentId, stage);
      const data = res.data;
      setWorkspaceData(data);

      // Notes & Questions state
      const noteData = data.notes || {};
      setPrivateNotes(noteData.private_notes || "");
      setVivaQuestions(Array.isArray(noteData.viva_questions) ? noteData.viva_questions : []);
      setDraftFeedback(noteData.draft_feedback || "");
      setReleasedFeedback(noteData.released_feedback || "");
      setPageReference(noteData.page_reference || "");
      setNoteVersion(noteData.version || 1);
      setSaveStatus("saved");

      // Auto-select latest submission if available
      if (data.submissions && data.submissions.length > 0) {
        setSelectedSubmission(data.submissions[0]);
      } else {
        setSelectedSubmission(null);
      }
    } catch (err) {
      console.error("Failed to load review workspace:", err);
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to load review workspace.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-save debounce tracker
  const debounceTimer = useRef(null);

  const handleNotesChange = (value) => {
    setPrivateNotes(value);
    setSaveStatus("unsaved");
  };

  const handleDraftFeedbackChange = (value) => {
    setDraftFeedback(value);
    setSaveStatus("unsaved");
  };

  const handlePageRefChange = (value) => {
    setPageReference(value);
    setSaveStatus("unsaved");
  };

  // Add viva question
  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    const newQ = {
      id: Date.now(),
      question: newQuestionText.trim(),
      is_asked: false,
      created_at: new Date().toISOString()
    };
    const updated = [...vivaQuestions, newQ];
    setVivaQuestions(updated);
    setNewQuestionText("");
    setSaveStatus("unsaved");
    saveNotesPayload({ viva_questions: updated });
  };

  // Toggle question asked/not-asked
  const handleToggleQuestion = (id) => {
    const updated = vivaQuestions.map(q => q.id === id ? { ...q, is_asked: !q.is_asked } : q);
    setVivaQuestions(updated);
    setSaveStatus("unsaved");
    saveNotesPayload({ viva_questions: updated });
  };

  // Delete question
  const handleDeleteQuestion = (id) => {
    const updated = vivaQuestions.filter(q => q.id !== id);
    setVivaQuestions(updated);
    setSaveStatus("unsaved");
    saveNotesPayload({ viva_questions: updated });
  };

  // Save Reviewer Notes (Private Notes, Questions, Draft Feedback)
  const saveNotesPayload = async (overrides = {}) => {
    setSaveStatus("saving");
    setSaveMessage("");
    try {
      const payload = {
        student_id: parseInt(studentId),
        stage: selectedStage,
        private_notes: overrides.private_notes !== undefined ? overrides.private_notes : privateNotes,
        viva_questions: overrides.viva_questions !== undefined ? overrides.viva_questions : vivaQuestions,
        draft_feedback: overrides.draft_feedback !== undefined ? overrides.draft_feedback : draftFeedback,
        submission_id: selectedSubmission ? selectedSubmission.id : null,
        submission_version: selectedSubmission ? selectedSubmission.version_number : null,
        page_reference: overrides.page_reference !== undefined ? overrides.page_reference : pageReference,
        client_version: noteVersion
      };

      const res = await saveReviewerNotes(payload);
      if (res.data?.note) {
        setNoteVersion(res.data.note.version);
      }
      setSaveStatus("saved");
      setSaveMessage("All changes saved");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Save note error:", err);
      if (err.response?.status === 409) {
        setSaveStatus("conflict");
        setSaveMessage("Conflict: Changes made elsewhere. Please reload stage.");
      } else {
        setSaveStatus("error");
        setSaveMessage(err.response?.data?.error || "Error saving changes");
      }
    }
  };

  // Release Feedback to Student
  const handleReleaseFeedback = async () => {
    if (!draftFeedback.trim()) {
      alert("Please enter draft feedback first before releasing.");
      return;
    }
    if (!window.confirm("Are you sure you want to release this feedback to the student? Once released, the student will be able to see it.")) {
      return;
    }

    setReleasingFeedback(true);
    setFeedbackSuccessMessage("");
    try {
      const res = await releaseFeedback({
        student_id: parseInt(studentId),
        stage: selectedStage,
        feedback_content: draftFeedback
      });
      setReleasedFeedback(res.data.released_feedback);
      setFeedbackSuccessMessage("Feedback released to student successfully.");
      setTimeout(() => setFeedbackSuccessMessage(""), 5000);
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || "Failed to release feedback.");
    } finally {
      setReleasingFeedback(false);
    }
  };

  // Handle Manual Review Copy Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please select a PDF or DOC document to upload.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("student_id", studentId);
      formData.append("stage", selectedStage);
      formData.append("title", uploadTitle || uploadFile.name);
      formData.append("file", uploadFile);

      await uploadManualReviewCopy(formData);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadTitle("");
      // Reload submissions
      await loadWorkspace(selectedStage);
    } catch (err) {
      setUploadError(err.response?.data?.message || err.response?.data?.error || "Failed to upload review copy.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Trigger LMS Sync
  const handleSyncLms = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const res = await syncWithLms({
        student_id: parseInt(studentId),
        stage: selectedStage
      });
      setSyncNotice(res.data);
    } catch (err) {
      setSyncNotice({
        success: false,
        code: "SYNC_ERROR",
        message: err.response?.data?.message || err.response?.data?.error || "LMS Sync failed."
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading && !workspaceData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-navy-700" />
        <p className="text-sm font-medium">Loading Student Submission Review Workspace…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4 text-red-800">
          <ShieldAlert className="w-8 h-8 flex-shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-2">
            <h2 className="text-lg font-bold">Access Denied or Record Unavailable</h2>
            <p className="text-sm text-red-700">{error}</p>
            <p className="text-xs text-red-600">
              Only designated supervisors, assessors, and FYP administrators can access student review workspaces.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition shadow-sm"
              >
                <ArrowLeft size={16} /> Return to previous page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { student, reviewerContext, submissions = [], lmsIntegration } = workspaceData;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[1920px] mx-auto bg-slate-50 overflow-hidden font-sans">
      {/* ── TOP HEADER: Student Meta & Stage Selector ── */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Student Info & Relationship */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {student.student_name}
                </h1>
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-semibold">
                  {student.cb_no}
                </span>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold">
                  {student.batch_intake || student.batch_code}
                </span>
                {/* Reviewer Relationship Badge */}
                <span className="px-3 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                  Your Role: {reviewerContext?.relationship || "Reviewer"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 truncate max-w-2xl">
                <span className="font-semibold text-slate-600">Project:</span> {student.project_title}
              </p>
            </div>
          </div>

          {/* Assessment Stage Selector & Quick Actions */}
          <div className="flex items-center gap-3 self-end lg:self-center">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {["Proposal", "Midpoint", "Final"].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStage(st)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedStage === st
                      ? "bg-white text-navy-900 shadow-sm border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {st} Stage
                </button>
              ))}
            </div>

            {/* Responsive tab switchers for mobile/tablet */}
            <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setMobilePanel("submissions")}
                className={`px-3 py-1.5 rounded-lg ${mobilePanel === "submissions" ? "bg-white shadow-xs font-bold" : "text-slate-600"}`}
              >
                Files ({submissions.length})
              </button>
              <button
                onClick={() => setMobilePanel("document")}
                className={`px-3 py-1.5 rounded-lg ${mobilePanel === "document" ? "bg-white shadow-xs font-bold" : "text-slate-600"}`}
              >
                Viewer
              </button>
              <button
                onClick={() => setMobilePanel("notes")}
                className={`px-3 py-1.5 rounded-lg ${mobilePanel === "notes" ? "bg-white shadow-xs font-bold" : "text-slate-600"}`}
              >
                Notes & Viva
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── WORKSPACE 3-PANE LAYOUT ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── PANE 1: Submissions & LMS Panel (Left) ── */}
        <aside
          className={`w-full lg:w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col ${
            mobilePanel === "submissions" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen size={18} className="text-navy-700" />
              <h2 className="text-sm font-bold text-slate-800">
                {selectedStage} Submissions
              </h2>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-navy-800 bg-navy-50 hover:bg-navy-100 border border-navy-200 rounded-lg transition"
              title="Upload manual review copy fallback"
            >
              <FileUp size={14} /> Upload Copy
            </button>
          </div>

          {/* LMS Status Box */}
          <div className="p-3 m-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${lmsIntegration?.connected ? "bg-emerald-500" : "bg-amber-400"}`} />
                APIIT LMS Sync
              </span>
              <button
                onClick={handleSyncLms}
                disabled={isSyncing}
                className="text-[11px] text-navy-700 hover:text-navy-900 font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw size={11} className={isSyncing ? "animate-spin" : ""} />
                Check Sync
              </button>
            </div>

            <div className="text-[11px] text-slate-600">
              {lmsIntegration?.connected ? (
                <span className="text-emerald-700 font-medium">LMS Web Service Connected</span>
              ) : (
                <span className="text-amber-700 font-medium">LMS Not Connected (Direct API)</span>
              )}
            </div>

            {/* Direct Activity Link */}
            {lmsIntegration?.activityUrl && (
              <a
                href={lmsIntegration.activityUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md border border-purple-200 w-full justify-center transition"
              >
                <ExternalLink size={12} />
                Open Assignment in LMS ({lmsIntegration.activityType === "turnitintooltwo" ? "Turnitin V2" : "Moodle"})
              </a>
            )}

            {syncNotice && (
              <div className={`p-2 rounded text-[11px] border ${syncNotice.success ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
                <div className="font-semibold">{syncNotice.code}</div>
                <div>{syncNotice.message}</div>
              </div>
            )}
          </div>

          {/* Submissions List */}
          <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-4">
            {submissions.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-3">
                <FileText className="w-10 h-10 mx-auto text-slate-300" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-600">No submission files recorded</p>
                  <p className="text-[11px] text-slate-500">
                    LMS sync is unconfigured for automated extraction. You can upload an authorized review copy or inspect the LMS activity link above.
                  </p>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-navy-800 bg-navy-50 hover:bg-navy-100 border border-navy-200 rounded-lg transition"
                >
                  <FileUp size={14} /> Upload Review Copy
                </button>
              </div>
            ) : (
              submissions.map((sub) => {
                const isSelected = selectedSubmission?.id === sub.id;
                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubmission(sub);
                      if (mobilePanel === "submissions") setMobilePanel("document");
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-navy-50/70 border-navy-300 shadow-xs ring-1 ring-navy-400/30"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-slate-800 truncate" title={sub.title}>
                        {sub.title || sub.file_name}
                      </div>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                        v{sub.version_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                      <span className="truncate">{sub.file_name}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(sub.submission_date).toLocaleDateString()}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded font-semibold ${
                        sub.source === "LMS" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {sub.source === "LMS" ? "LMS Sync" : "Review Copy"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── PANE 2: Document Viewing Area (Center) ── */}
        <main
          className={`flex-1 flex flex-col bg-slate-100 overflow-hidden ${
            mobilePanel === "document" ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedSubmission ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Document Toolbar */}
              <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-navy-700" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 truncate max-w-md">
                      {selectedSubmission.file_name}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Version {selectedSubmission.version_number} • Submitted on {new Date(selectedSubmission.submission_date).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={getSubmissionFileUrl(selectedSubmission.id, true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition"
                    title="Download original file"
                  >
                    <Download size={13} /> Download
                  </a>
                  <a
                    href={getSubmissionFileUrl(selectedSubmission.id, false)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-navy-800 bg-navy-50 hover:bg-navy-100 border border-navy-200 rounded-lg shadow-2xs transition"
                    title="Open full page preview"
                  >
                    <ExternalLink size={13} /> Full Window
                  </a>
                </div>
              </div>

              {/* Document Viewer Frame */}
              <div className="flex-1 bg-slate-200/80 p-2 overflow-hidden flex flex-col">
                {selectedSubmission.file_name.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={getSubmissionFileUrl(selectedSubmission.id, false)}
                    title="Document Preview"
                    className="w-full h-full bg-white rounded-lg shadow-inner border border-slate-300"
                  />
                ) : (
                  <div className="m-auto max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{selectedSubmission.file_name}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Inline browser preview is natively supported for PDF documents. Word files (.doc, .docx) can be securely downloaded to your device for review.
                      </p>
                    </div>
                    <a
                      href={getSubmissionFileUrl(selectedSubmission.id, true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-navy-950 transition"
                    >
                      <Download size={14} /> Download Document for Review
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-3">
              <FileText className="w-12 h-12 text-slate-300" />
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700">No document selected</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Choose a submission from the left panel to preview it alongside your viva preparation notes.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* ── PANE 3: Notes, Viva Questions & Feedback (Right) ── */}
        <aside
          className={`w-full lg:w-96 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col ${
            mobilePanel === "notes" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Tabs: Private Notes | Viva Questions | Draft Feedback */}
          <div className="border-b border-slate-200 px-4 pt-3 flex items-center justify-between flex-shrink-0 bg-slate-50/50">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveRightTab("notes")}
                className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all ${
                  activeRightTab === "notes"
                    ? "border-navy-900 text-navy-950"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Private Notes
              </button>
              <button
                onClick={() => setActiveRightTab("questions")}
                className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all ${
                  activeRightTab === "questions"
                    ? "border-navy-900 text-navy-950"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Viva Questions ({vivaQuestions.length})
              </button>
              <button
                onClick={() => setActiveRightTab("feedback")}
                className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all ${
                  activeRightTab === "feedback"
                    ? "border-navy-900 text-navy-950"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Student Feedback
              </button>
            </div>

            {/* Save Status Indicator */}
            <div className="pb-2.5 flex items-center gap-1 text-[11px]">
              {saveStatus === "saving" && (
                <span className="text-slate-500 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> Saving…
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-emerald-700 flex items-center gap-1 font-medium">
                  <Check size={12} /> Saved
                </span>
              )}
              {saveStatus === "unsaved" && (
                <span className="text-amber-600 flex items-center gap-1 font-medium">
                  • Unsaved
                </span>
              )}
              {saveStatus === "conflict" && (
                <span className="text-red-600 flex items-center gap-1 font-bold" title={saveMessage}>
                  <AlertCircle size={12} /> Conflict
                </span>
              )}
            </div>
          </div>

          {/* TAB CONTENT */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            {/* ── TAB 1: PRIVATE REVIEWER NOTES ── */}
            {activeRightTab === "notes" && (
              <div className="flex-1 flex flex-col space-y-3">
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    🔒 Strictly Private & Confidential
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    These notes are exclusively visible to you. They are never revealed to students or shared with other reviewers.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-700">Page Reference:</label>
                  <input
                    type="text"
                    value={pageReference}
                    onChange={(e) => handlePageRefChange(e.target.value)}
                    placeholder="e.g. Page 14, Section 3.2"
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-navy-700 bg-white"
                  />
                </div>

                <div className="flex-1 flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Review Notes ({selectedStage} Stage):</label>
                  <textarea
                    value={privateNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Record your observations on student methodology, architectural decisions, citations, and critical questions..."
                    className="flex-1 w-full p-3 text-xs text-slate-800 border border-slate-200 rounded-xl focus:outline-navy-700 focus:ring-1 focus:ring-navy-700 bg-white resize-none leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-[11px] text-slate-400">
                    Version #{noteVersion} • Auto-saved locally
                  </span>
                  <button
                    onClick={() => saveNotesPayload()}
                    disabled={saveStatus === "saving"}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-900 text-white rounded-lg text-xs font-bold hover:bg-navy-950 transition shadow-xs disabled:opacity-50"
                  >
                    <Save size={14} /> Save Notes
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB 2: VIVA PREPARATION QUESTIONS ── */}
            {activeRightTab === "questions" && (
              <div className="flex-1 flex flex-col space-y-3">
                <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3 text-[11px] text-purple-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    🎯 Viva Defense Question Checklist
                  </div>
                  <p className="text-purple-800 leading-relaxed">
                    Formulate targeted questions to challenge student findings during the viva defense. Mark items as asked in real-time.
                  </p>
                </div>

                {/* Add Question Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddQuestion()}
                    placeholder="Enter candidate viva question..."
                    className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-navy-700 bg-white"
                  />
                  <button
                    onClick={handleAddQuestion}
                    className="p-2 bg-navy-900 text-white rounded-xl hover:bg-navy-950 transition"
                    title="Add Question"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Question Items List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {vivaQuestions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-medium">No viva defense questions added yet.</p>
                      <p className="text-[11px] text-slate-400">Add questions above to prepare for your viva assessment session.</p>
                    </div>
                  ) : (
                    vivaQuestions.map((q) => (
                      <div
                        key={q.id}
                        className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                          q.is_asked
                            ? "bg-slate-50 border-slate-200 opacity-60 line-through"
                            : "bg-white border-slate-200 shadow-2xs"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={q.is_asked}
                          onChange={() => handleToggleQuestion(q.id)}
                          className="mt-0.5 rounded border-slate-300 text-navy-800 focus:ring-navy-800 cursor-pointer"
                        />
                        <div className="flex-1 text-xs text-slate-800 font-medium leading-relaxed select-text">
                          {q.question}
                        </div>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="text-slate-400 hover:text-red-600 transition"
                          title="Delete question"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 3: DRAFT & RELEASED FEEDBACK ── */}
            {activeRightTab === "feedback" && (
              <div className="flex-1 flex flex-col space-y-3">
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-[11px] text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    📢 Student Feedback Workflow
                  </div>
                  <p className="text-blue-800 leading-relaxed">
                    Draft feedback remains private to you until you explicitly choose to release it. Released feedback will be directly visible to the student.
                  </p>
                </div>

                {/* Draft feedback textarea */}
                <div className="flex-1 flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Draft Feedback ({selectedStage}):</label>
                    <span className="text-[10px] text-slate-400 font-medium">Not visible to student</span>
                  </div>
                  <textarea
                    value={draftFeedback}
                    onChange={(e) => handleDraftFeedbackChange(e.target.value)}
                    placeholder="Provide constructive feedback, required revisions, and technical recommendations for the student..."
                    className="flex-1 w-full p-3 text-xs text-slate-800 border border-slate-200 rounded-xl focus:outline-navy-700 bg-white resize-none leading-relaxed"
                  />
                </div>

                {/* Feedback release button */}
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => saveNotesPayload()}
                      disabled={saveStatus === "saving"}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                    >
                      Save Draft
                    </button>
                    <button
                      onClick={handleReleaseFeedback}
                      disabled={releasingFeedback || !draftFeedback.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition shadow-xs disabled:opacity-50"
                    >
                      {releasingFeedback ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Release to Student
                    </button>
                  </div>

                  {feedbackSuccessMessage && (
                    <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      {feedbackSuccessMessage}
                    </div>
                  )}
                </div>

                {/* Released feedback preview */}
                {releasedFeedback && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>Currently Released Feedback:</span>
                      <span className="text-emerald-700 font-semibold">Active for Student</span>
                    </div>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {releasedFeedback}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── MODAL: UPLOAD MANUAL REVIEW COPY ── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileUp className="h-5 w-5 text-navy-800" /> Upload Review Copy Fallback
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Upload an authorized copy of the student's submission document (PDF or Word) for the <strong>{selectedStage}</strong> stage.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Title (Optional):
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Final Dissertation Chapter 1-5"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-navy-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select File (.pdf, .doc, .docx):
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-navy-700"
                  required
                />
              </div>

              {uploadError && (
                <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
                  {uploadError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-navy-900 text-white rounded-lg text-xs font-bold hover:bg-navy-950 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUploading ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />}
                  Upload Copy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
