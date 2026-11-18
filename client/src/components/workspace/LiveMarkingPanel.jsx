import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  getMarkingWorkspace,
  saveEvaluationDraft,
  submitEvaluation,
  proposeAgreedMark,
  confirmAgreedMark,
  getStudentMilestoneProgress
} from "../../services/api";
import {
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
  Send,
  Loader2,
  RefreshCw,
  ShieldCheck,
  EyeOff,
  UserCheck,
  AlertTriangle,
  FileText,
  Info,
  Check,
  Lock,
  ChevronDown
} from "lucide-react";

export default function LiveMarkingPanel({
  studentId,
  initialMilestoneId,
  vivaScheduleId,
  onEvaluationSubmitted
}) {
  const [milestones, setMilestones] = useState([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(initialMilestoneId || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Workspace Data
  const [workspace, setWorkspace] = useState(null);
  const [criteriaScores, setCriteriaScores] = useState({});
  const [feedback, setFeedback] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [version, setVersion] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Autosave status: 'saved' | 'saving' | 'unsaved' | 'error' | 'conflict'
  const [saveStatus, setSaveStatus] = useState("saved");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [conflictMessage, setConflictMessage] = useState(null);

  // Submission & Reconciliation
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Agreement Proposal
  const [proposedScore, setProposedScore] = useState("");
  const [proposedRationale, setProposedRationale] = useState("");
  const [proposing, setProposing] = useState(false);
  const [confirmingProposalId, setConfirmingProposalId] = useState(null);

  const debounceTimerRef = useRef(null);
  const isFirstMountRef = useRef(true);

  // Load milestone list for student if not provided
  useEffect(() => {
    let isMounted = true;
    async function loadMilestoneList() {
      if (!studentId) return;
      try {
        const res = await getStudentMilestoneProgress(studentId);
        if (isMounted && res.data?.timeline) {
          // Filter out unmarked milestone if desired, or keep all
          const list = res.data.timeline.filter(m => (m.weight_percentage || 0) > 0);
          setMilestones(list);
          if (!selectedMilestoneId && list.length > 0) {
            setSelectedMilestoneId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load student milestone list:", err);
      }
    }
    loadMilestoneList();
    return () => { isMounted = false; };
  }, [studentId]);

  // Load Marking Workspace when milestone is selected
  const fetchWorkspace = useCallback(async (milestoneId) => {
    if (!studentId || !milestoneId) return;
    setLoading(true);
    setError(null);
    setConflictMessage(null);
    try {
      const res = await getMarkingWorkspace(studentId, milestoneId, vivaScheduleId);
      const data = res.data;
      setWorkspace(data);

      const myEval = data.myEvaluation || {};
      const savedScores = (myEval.criteria_scores && typeof myEval.criteria_scores === "object")
        ? myEval.criteria_scores
        : {};
      setCriteriaScores(savedScores);
      setFeedback(myEval.feedback || "");
      setPrivateNotes(myEval.private_notes || "");
      setVersion(myEval.version || 1);
      setIsSubmitted(myEval.status === "submitted");
      setSaveStatus("saved");
      setLastSavedAt(myEval.updated_at ? new Date(myEval.updated_at) : null);
    } catch (err) {
      console.error("Failed to load marking workspace:", err);
      setError(err.response?.data?.error || "Failed to load marking rubric workspace.");
    } finally {
      setLoading(false);
      isFirstMountRef.current = false;
    }
  }, [studentId, vivaScheduleId]);

  useEffect(() => {
    if (selectedMilestoneId) {
      fetchWorkspace(selectedMilestoneId);
    }
  }, [selectedMilestoneId, fetchWorkspace]);

  // Autosave trigger
  const triggerAutosave = useCallback(async (scoresToSave, feedbackText, notesText, currentVersion) => {
    if (isSubmitted || !selectedMilestoneId || !studentId) return;
    setSaveStatus("saving");
    try {
      const res = await saveEvaluationDraft({
        student_id: parseInt(studentId, 10),
        milestone_id: parseInt(selectedMilestoneId, 10),
        viva_schedule_id: vivaScheduleId ? parseInt(vivaScheduleId, 10) : undefined,
        criteria_scores: scoresToSave,
        feedback: feedbackText,
        private_notes: notesText,
        version: currentVersion
      });
      if (res.data?.success) {
        setVersion(res.data.version);
        setSaveStatus("saved");
        setLastSavedAt(new Date(res.data.saved_at || Date.now()));
        setConflictMessage(null);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setSaveStatus("conflict");
        setConflictMessage(
          err.response?.data?.error || "A newer draft was saved in another session. Please reload to review."
        );
      } else {
        setSaveStatus("error");
      }
    }
  }, [isSubmitted, selectedMilestoneId, studentId, vivaScheduleId]);

  // Handle score change for a criterion
  const handleScoreChange = (criterionId, maxScore, rawValue) => {
    if (isSubmitted) return;

    let numVal = rawValue === "" ? 0 : parseFloat(rawValue);
    if (isNaN(numVal)) numVal = 0;
    if (numVal < 0) numVal = 0;
    if (numVal > maxScore) numVal = maxScore;

    const newScores = { ...criteriaScores, [criterionId]: numVal };
    setCriteriaScores(newScores);
    setSaveStatus("unsaved");

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      triggerAutosave(newScores, feedback, privateNotes, version);
    }, 900);
  };

  // Handle feedback change
  const handleFeedbackChange = (text) => {
    if (isSubmitted) return;
    setFeedback(text);
    setSaveStatus("unsaved");

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      triggerAutosave(criteriaScores, text, privateNotes, version);
    }, 1000);
  };

  // Handle submit evaluation
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitEvaluation({
        student_id: parseInt(studentId, 10),
        milestone_id: parseInt(selectedMilestoneId, 10),
        viva_schedule_id: vivaScheduleId ? parseInt(vivaScheduleId, 10) : undefined,
        criteria_scores: criteriaScores,
        feedback,
        private_notes: privateNotes,
        version
      });
      if (res.data?.success) {
        setIsSubmitted(true);
        setShowSubmitConfirm(false);
        // Refresh workspace to get co-evaluation status or reconciliation
        await fetchWorkspace(selectedMilestoneId);
        if (onEvaluationSubmitted) onEvaluationSubmitted(res.data);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.error || "Failed to submit evaluation. Check required criteria.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle proposing agreed mark
  const handleProposeAgreedMark = async (e) => {
    e.preventDefault();
    if (!proposedScore || !proposedRationale.trim()) return;
    setProposing(true);
    try {
      await proposeAgreedMark({
        reconciliation_id: workspace?.reconciliation?.id,
        proposed_score: parseFloat(proposedScore),
        rationale: proposedRationale.trim()
      });
      setProposedScore("");
      setProposedRationale("");
      await fetchWorkspace(selectedMilestoneId);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to submit agreed score proposal.");
    } finally {
      setProposing(false);
    }
  };

  // Handle confirming agreed mark
  const handleConfirmProposal = async (proposalId) => {
    setConfirmingProposalId(proposalId);
    try {
      await confirmAgreedMark({
        proposal_id: proposalId
      });
      await fetchWorkspace(selectedMilestoneId);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to confirm agreed score.");
    } finally {
      setConfirmingProposalId(null);
    }
  };

  // Calculate current total
  const criteriaList = workspace?.rubricTemplate?.criteria || [];
  const currentTotal = criteriaList.reduce((acc, c) => {
    const val = criteriaScores[c.criterion_id];
    return acc + (typeof val === "number" ? val : 0);
  }, 0);
  const maxTotal = workspace?.milestone?.weight_percentage || 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
        <Loader2 className="h-7 w-7 animate-spin text-navy-800" />
        <span className="text-xs font-semibold">Loading marking rubric workspace…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl space-y-3 text-red-700 m-4">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertCircle className="h-5 w-5" /> Marking Workspace Error
        </div>
        <p className="text-xs">{error}</p>
        <button
          onClick={() => fetchWorkspace(selectedMilestoneId)}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const { milestone, myEvaluation, coEvaluation, reconciliation, proposals, blindActive } = workspace || {};

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 text-xs">
      {/* Top Header: Milestone Selector & Save Status */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Award className="h-5 w-5 text-navy-900 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Concurrent Marking Workspace
              </span>
              {milestones.length > 1 ? (
                <div className="relative mt-0.5 inline-block w-full max-w-sm">
                  <select
                    value={selectedMilestoneId}
                    onChange={(e) => setSelectedMilestoneId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-1 px-2.5 text-xs font-bold text-slate-800 appearance-none focus:outline-navy-800 pr-8"
                  >
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.weight_percentage} Marks • {m.assessment_component})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                </div>
              ) : (
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {milestone?.name} ({milestone?.weight_percentage} Marks)
                </h3>
              )}
            </div>
          </div>

          {/* Save Status Indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            {saveStatus === "saving" && (
              <span className="text-blue-600 flex items-center gap-1 font-semibold text-[11px]">
                <Loader2 size={12} className="animate-spin" /> Autosaving…
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-emerald-700 flex items-center gap-1 font-semibold text-[11px]" title={lastSavedAt ? `Saved at ${lastSavedAt.toLocaleTimeString()}` : 'Saved'}>
                <Check size={13} className="text-emerald-600" />
                {isSubmitted ? "Submitted & Locked" : "Autosaved"}
              </span>
            )}
            {saveStatus === "unsaved" && (
              <span className="text-amber-600 flex items-center gap-1 font-semibold text-[11px]">
                • Unsaved edits
              </span>
            )}
            {saveStatus === "conflict" && (
              <button
                onClick={() => fetchWorkspace(selectedMilestoneId)}
                className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1"
                title={conflictMessage}
              >
                <RefreshCw size={11} /> Conflict: Click to reload
              </button>
            )}
          </div>
        </div>

        {/* Examiner Role & Co-Examiner Live Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-navy-100 text-navy-900 rounded font-bold text-[10px] uppercase">
              My Role: {myEvaluation?.role || "Examiner"}
            </span>
            {isSubmitted ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] flex items-center gap-1">
                <Lock size={10} /> Evaluation Submitted
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                Drafting
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-semibold">Co-Examiner ({coEvaluation?.role || "Assessor"}):</span>
            {coEvaluation?.submitted ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 size={12} /> Submitted
              </span>
            ) : (
              <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {coEvaluation?.status === "draft" ? "Marking in progress" : "Awaiting draft"}
              </span>
            )}
          </div>
        </div>

        {/* Independent Blind Marking Notice */}
        {blindActive && (
          <div className="p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-indigo-900 flex items-start gap-2">
            <EyeOff className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight">
              <strong>Independent Blind Marking Active:</strong> Your individual marks remain strictly confidential until both examiners have formally submitted.
            </div>
          </div>
        )}
      </div>

      {/* Main Rubric Form & Reconciliation Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Rubric Criteria Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-500" /> Assessment Criteria
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">
              Sum of marks matches milestone weight ({maxTotal})
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-200">
            {criteriaList.map((criterion, idx) => {
              const currentScore = criteriaScores[criterion.criterion_id] !== undefined
                ? criteriaScores[criterion.criterion_id]
                : "";
              const isValid = currentScore !== "" && currentScore >= 0 && currentScore <= criterion.max_score;

              return (
                <div key={criterion.criterion_id || idx} className="p-3 bg-white hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <h5 className="font-bold text-slate-800 text-xs">
                        {criterion.criterion_name}
                      </h5>
                    </div>
                    {criterion.description && (
                      <p className="text-[11px] text-slate-500 pl-7 leading-relaxed">
                        {criterion.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-7 sm:pl-0">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Max: {criterion.max_score}
                    </span>
                    <div className="relative w-24">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max={criterion.max_score}
                        disabled={isSubmitted}
                        value={currentScore}
                        onChange={(e) => handleScoreChange(criterion.criterion_id, criterion.max_score, e.target.value)}
                        placeholder="0.00"
                        className={`w-full text-right font-bold text-xs py-1.5 px-2 rounded-lg border focus:outline-none transition-colors ${
                          isSubmitted
                            ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed"
                            : isValid
                            ? "bg-white text-navy-950 border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                            : "bg-red-50 text-red-700 border-red-300 focus:border-red-500"
                        }`}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-400 w-3 text-center">
                      {isValid ? <Check size={14} className="text-emerald-600" /> : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Total Score Card */}
        <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider block">
              Calculated Total Score
            </span>
            <span className="text-xs text-slate-300">
              Component: {milestone?.assessment_component}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-white">
              {currentTotal.toFixed(2)}
            </span>
            <span className="text-sm font-bold text-slate-400"> / {maxTotal.toFixed(2)} Marks</span>
          </div>
        </div>

        {/* Examiner Shared Feedback / Rationale */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-800 text-xs flex items-center justify-between">
            <span>Feedback & Assessment Justification:</span>
            <span className="text-[10px] font-normal text-slate-400">
              (Visible to student upon moderation release)
            </span>
          </label>
          <textarea
            disabled={isSubmitted}
            rows={3}
            value={feedback}
            onChange={(e) => handleFeedbackChange(e.target.value)}
            placeholder="Provide qualitative commentary on the student's methodology, strengths, and areas for improvement..."
            className={`w-full text-xs p-3 rounded-xl border focus:outline-none transition-colors ${
              isSubmitted
                ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed"
                : "bg-white text-slate-800 border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
            }`}
          />
        </div>

        {/* Final Submission Card */}
        {!isSubmitted ? (
          <div className="pt-2 border-t border-slate-200 space-y-3">
            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {!showSubmitConfirm ? (
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                className="w-full py-2.5 bg-navy-900 hover:bg-navy-950 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" /> Submit Final Evaluation ({currentTotal.toFixed(2)} / {maxTotal} Marks)
              </button>
            ) : (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3 text-amber-900">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> Confirm Submission
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Are you ready to submit your evaluation of <strong>{currentTotal.toFixed(2)} marks</strong>? Once submitted, your scores are locked and will be compared with the co-examiner for reconciliation.
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirm(false)}
                    className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleFinalSubmit}
                    className="px-4 py-1.5 bg-navy-900 hover:bg-navy-950 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirm & Lock Marks
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" /> Evaluation Submitted
            </div>
            <p className="text-[11px] text-emerald-800">
              Your evaluation of <strong>{myEvaluation?.score} Marks</strong> was formally recorded.
            </p>
          </div>
        )}

        {/* ── RECONCILIATION & AGREEMENT SECTION ── */}
        {reconciliation && (
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-navy-800" /> Examiner Reconciliation & Agreement
            </h4>

            {/* Reconciliation Comparison Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Supervisor</span>
                  <span className="text-base font-bold text-slate-800">
                    {reconciliation.supervisor_score !== null ? `${reconciliation.supervisor_score} Marks` : "Pending"}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Assessor</span>
                  <span className="text-base font-bold text-slate-800">
                    {reconciliation.assessor_score !== null ? `${reconciliation.assessor_score} Marks` : "Pending"}
                  </span>
                </div>
                <div className="p-2 bg-navy-900 text-white rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-blue-200 block">Agreed Score</span>
                  <span className="text-base font-bold">
                    {reconciliation.agreed_final_score !== null ? `${reconciliation.agreed_final_score} Marks` : "In Discussion"}
                  </span>
                </div>
              </div>

              {/* Status Notice */}
              {reconciliation.status === "agreed" ? (
                <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-lg text-emerald-900 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>
                    Agreement reached! Final confirmed score: <strong>{reconciliation.agreed_final_score} / {maxTotal} Marks</strong>.
                  </span>
                </div>
              ) : reconciliation.requires_third_marker ? (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="h-4 w-4 text-rose-600" /> Referred to Head of Computing
                  </div>
                  <p>
                    Examiners did not reach consensus within the 5-day reconciliation window. A nominated Third Marker has been requested by the Head of Computing to review and determine the final score.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Clock className="h-4 w-4 text-amber-600" /> Discrepancy Reconciliation Active
                  </div>
                  <p>
                    Examiner scores differ by more than 5 marks. Please confer and propose an agreed final score.
                  </p>
                </div>
              )}
            </div>

            {/* Pending Proposals */}
            {proposals && proposals.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-bold text-slate-700 text-[11px]">Proposed Agreed Scores:</h5>
                <div className="space-y-2">
                  {proposals.map((prop) => (
                    <div key={prop.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {prop.proposer?.name || "Examiner"} proposed: <strong className="text-navy-950 text-xs">{prop.proposed_score} Marks</strong>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          prop.status === "accepted" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {prop.status}
                        </span>
                      </div>
                      <p className="text-slate-600 italic">"{prop.rationale}"</p>

                      {prop.status === "pending" && reconciliation.status !== "agreed" && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            disabled={confirmingProposalId === prop.id}
                            onClick={() => handleConfirmProposal(prop.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
                          >
                            {confirmingProposalId === prop.id && <Loader2 className="h-3 w-3 animate-spin" />}
                            Accept & Confirm Agreed Score
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Propose New Agreed Mark Form */}
            {reconciliation.status !== "agreed" && !reconciliation.requires_third_marker && (
              <form onSubmit={handleProposeAgreedMark} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h5 className="font-bold text-slate-800 text-xs">Propose Agreed Final Score</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Agreed Score (Max {maxTotal}):</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max={maxTotal}
                      required
                      value={proposedScore}
                      onChange={(e) => setProposedScore(e.target.value)}
                      placeholder="e.g. 8.50"
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-navy-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Agreed Rationale:</label>
                    <input
                      type="text"
                      required
                      value={proposedRationale}
                      onChange={(e) => setProposedRationale(e.target.value)}
                      placeholder="e.g. Discussed and agreed midpoint based on viva defense."
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-navy-900"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={proposing}
                    className="px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    {proposing && <Loader2 className="h-3 w-3 animate-spin" />}
                    Submit Agreement Proposal
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
