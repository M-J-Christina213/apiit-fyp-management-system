import React, { useState, useEffect } from 'react';
import { getStudentMilestoneProgressByCb } from '../../services/api';
import { formatColomboDate } from '../../utils/dateUtils';
import {
    CalendarDays,
    Loader2,
    CheckCircle2,
    Clock,
    AlertCircle,
    Target,
    ExternalLink,
    FileText,
    Award,
    HelpCircle,
    Info,
    ChevronDown,
    ChevronUp,
    Layers,
    BookOpen
} from 'lucide-react';

const StudentMilestones = ({ studentId }) => {
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeRubricModal, setActiveRubricModal] = useState(null);
    const [expandedMilestone, setExpandedMilestone] = useState(null);

    useEffect(() => {
        if (studentId) {
            fetchProgress();
        } else {
            setLoading(false);
        }
    }, [studentId]);

    const fetchProgress = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getStudentMilestoneProgressByCb(studentId);
            setProgress(res.data);
        } catch (err) {
            console.error("Failed to load milestone progress:", err);
            if (err.response?.status === 404) {
                setProgress({ timeline: [], semesters: [] });
            } else {
                setError("Failed to load your milestone progress.");
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (m) => {
        if (m.derived_status === "Graded" || m.derived_status === "Submitted") {
            return {
                label: m.derived_status,
                color: "bg-emerald-50 text-emerald-700 border-emerald-200",
                icon: CheckCircle2
            };
        }
        if (m.is_date_tbc) {
            return {
                label: "Date TBC",
                color: "bg-amber-50 text-amber-700 border-amber-200",
                icon: Clock
            };
        }
        if (m.derived_status === "Overdue") {
            return {
                label: "Overdue",
                color: "bg-rose-50 text-rose-700 border-rose-300 font-bold",
                icon: AlertCircle
            };
        }
        if (m.derived_status === "Due Today") {
            return {
                label: "Due Today",
                color: "bg-rose-50 text-rose-700 border-rose-200 animate-pulse",
                icon: AlertCircle
            };
        }
        if (m.derived_status === "Due Soon") {
            return {
                label: "Due Soon",
                color: "bg-amber-50 text-amber-700 border-amber-200",
                icon: Clock
            };
        }
        return {
            label: "Upcoming",
            color: "bg-slate-50 text-slate-600 border-slate-200",
            icon: CalendarDays
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading your FYP timeline...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-semibold">{error}</p>
            </div>
        );
    }

    const timeline = progress?.timeline || [];
    const semesters = progress?.semesters || [];
    const nextDeadline = progress?.nextDeadline || progress?.currentMilestone;
    const totals = progress?.componentTotals;

    if (!progress || timeline.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-3">
                <div className="mx-auto w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                    <CalendarDays className="h-7 w-7" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-800">No Published Milestones</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Your project schedule has not been published yet. Once the Project Manager or Admin releases your batch timeline, all milestone deadlines, instructions, and rubrics will appear here.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-slate-900">FYP Milestones & Assessment</h1>
                        {progress.batch && (
                            <span className="px-2.5 py-0.5 bg-navy-50 text-navy-800 border border-navy-200 rounded-full text-xs font-bold">
                                {progress.batch.code || progress.batch.name}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        All deadlines are in Sri Lanka Standard Time (Asia/Colombo, UTC+05:30)
                    </p>
                </div>
            </div>

            {/* Next Deadline Hero Card */}
            {nextDeadline && (
                <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-slate-900 rounded-2xl shadow-lg p-6 sm:p-7 text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-xl">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-[11px] font-bold text-blue-200 uppercase tracking-wider">
                                    Next Action Required
                                </span>
                                {nextDeadline.semester && (
                                    <span className="text-xs text-slate-300 font-medium">
                                        • {nextDeadline.semester}
                                    </span>
                                )}
                            </div>
                            
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                                {nextDeadline.name}
                            </h2>

                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300">
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-blue-300" />
                                    {nextDeadline.is_tbc ? (
                                        <span className="text-amber-300 font-semibold">Date to be confirmed</span>
                                    ) : (
                                        <span>Submission Deadline: <strong className="text-white">{formatColomboDate(nextDeadline.submission_deadline || nextDeadline.deadline)}</strong></span>
                                    )}
                                </span>
                                {nextDeadline.daysRemaining !== undefined && !nextDeadline.is_tbc && (
                                    <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                        nextDeadline.daysRemaining < 0
                                            ? 'bg-rose-500/30 text-rose-200'
                                            : nextDeadline.daysRemaining <= 2
                                            ? 'bg-amber-500/30 text-amber-200'
                                            : 'bg-emerald-500/30 text-emerald-200'
                                    }`}>
                                        {nextDeadline.daysRemaining < 0
                                            ? `${Math.abs(nextDeadline.daysRemaining)} days overdue`
                                            : nextDeadline.daysRemaining === 0
                                            ? 'Due today'
                                            : `${nextDeadline.daysRemaining} days left`}
                                    </span>
                                )}
                            </div>

                            {nextDeadline.instructions && (
                                <p className="text-xs text-slate-300 line-clamp-2 pt-1 border-t border-white/10">
                                    {nextDeadline.instructions}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2.5 shrink-0 w-full md:w-auto">
                            {nextDeadline.submission_link && (
                                <a
                                    href={nextDeadline.submission_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    <ExternalLink className="h-4 w-4" /> Open LMS Submission
                                </a>
                            )}
                            {nextDeadline.rubric && (
                                <button
                                    type="button"
                                    onClick={() => setActiveRubricModal(nextDeadline)}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                                >
                                    <FileText className="h-4 w-4" /> View Rubric Criteria
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Academic Component Summary Cards */}
            {totals && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Award className="h-4 w-4 text-slate-400" /> Academic Component Breakdown (100 Marks Total)
                        </h3>
                        {totals.overall.isProvisional && (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                Incomplete / Provisional
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Proposal */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Proposal Component</span>
                            <div className="flex items-baseline justify-between">
                                <span className="text-xl font-bold text-slate-800">
                                    {totals.proposal.earned !== null ? totals.proposal.earned : '—'}
                                </span>
                                <span className="text-xs text-slate-400 font-semibold">/ {totals.proposal.max}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                                Final Proposal (5) + Midpoint (15)
                            </div>
                        </div>

                        {/* Report */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Report Component</span>
                            <div className="flex items-baseline justify-between">
                                <span className="text-xl font-bold text-slate-800">
                                    {totals.report.earned !== null ? totals.report.earned : '—'}
                                </span>
                                <span className="text-xs text-slate-400 font-semibold">/ {totals.report.max}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                                LR (5) + PoC (10) + Final (45)
                            </div>
                        </div>

                        {/* Viva */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Viva Component</span>
                            <div className="flex items-baseline justify-between">
                                <span className="text-xl font-bold text-slate-800">
                                    {totals.viva.earned !== null ? totals.viva.earned : '—'}
                                </span>
                                <span className="text-xs text-slate-400 font-semibold">/ {totals.viva.max}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                                Demo Day (10) + Final Viva (10)
                            </div>
                        </div>

                        {/* Overall */}
                        <div className="bg-navy-900 text-white rounded-xl p-4 shadow-sm space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">Total Overall Mark</span>
                            <div className="flex items-baseline justify-between">
                                <span className="text-xl font-bold text-white">
                                    {totals.overall.earned !== null ? totals.overall.earned : '—'}
                                </span>
                                <span className="text-xs text-blue-300 font-semibold">/ 100</span>
                            </div>
                            <div className="text-[10px] text-blue-200 font-medium">
                                {totals.overall.isComplete ? "Completed" : "Provisional aggregate"}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3-Semester Grouped Timeline */}
            <div className="space-y-6">
                {semesters.map((semGroup) => {
                    const isPrep = semGroup.semester === "Preparation";
                    return (
                        <div key={semGroup.semester} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-navy-800" />
                                    <h3 className="font-bold text-slate-800 text-base">{semGroup.semester}</h3>
                                </div>
                                <span className="text-xs text-slate-500 font-semibold">
                                    {semGroup.milestones.length} {semGroup.milestones.length === 1 ? 'Milestone' : 'Milestones'}
                                </span>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {semGroup.milestones.map((m) => {
                                    const badge = getStatusBadge(m);
                                    const BadgeIcon = badge.icon;
                                    const isExpanded = expandedMilestone === m.id;

                                    return (
                                        <div key={m.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                <div className="space-y-1.5 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className="font-bold text-slate-900 text-base">
                                                            {m.name}
                                                        </h4>
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-bold">
                                                            {m.weight_percentage ? `${m.weight_percentage} Marks` : 'Unmarked'}
                                                        </span>
                                                        {m.assessment_component && (
                                                            <span className="text-[11px] font-semibold text-slate-500">
                                                                • {m.assessment_component}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Dates */}
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                        {m.is_date_tbc ? (
                                                            <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                                                                Dates to be confirmed by PM
                                                            </span>
                                                        ) : (
                                                            <>
                                                                {m.opening_date && (
                                                                    <span>Opens: <strong className="text-slate-700">{formatColomboDate(m.opening_date)}</strong></span>
                                                                )}
                                                                {m.deadline && (
                                                                    <span>Deadline: <strong className="text-slate-700">{formatColomboDate(m.deadline)}</strong></span>
                                                                )}
                                                                {m.assessment_start && (
                                                                    <span>Assessment: <strong className="text-slate-700">{formatColomboDate(m.assessment_start)}</strong></span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                                                        <BadgeIcon className="h-3.5 w-3.5" />
                                                        {badge.label}
                                                    </span>

                                                    {m.rubric && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveRubricModal(m)}
                                                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                                                            title="View grading criteria"
                                                        >
                                                            <FileText className="h-3.5 w-3.5" /> Rubric
                                                        </button>
                                                    )}

                                                    {m.submission_link && (
                                                        <a
                                                            href={m.submission_link}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-3 py-1 bg-navy-900 hover:bg-navy-950 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                                                        >
                                                            LMS <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedMilestone(isExpanded ? null : m.id)}
                                                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                                                        aria-label="Toggle details"
                                                    >
                                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expandable details */}
                                            {isExpanded && (
                                                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 text-xs text-slate-600 bg-slate-50/50 -mx-5 -mb-5 p-5 rounded-b-xl">
                                                    {m.instructions && (
                                                        <div>
                                                            <span className="font-bold text-slate-700 block mb-1">Student Instructions:</span>
                                                            <p className="whitespace-pre-line text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                                                                {m.instructions}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {m.finalGrade && (
                                                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-900 space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold">Agreed Grade:</span>
                                                                <span className="text-base font-bold">
                                                                    {m.finalGrade.score} / {m.weight_percentage} Marks
                                                                </span>
                                                            </div>
                                                            {m.finalGrade.feedback && (
                                                                <p className="text-xs text-emerald-800 pt-1 border-t border-emerald-200">
                                                                    <strong className="block">Feedback from Assessors:</strong>
                                                                    {m.finalGrade.feedback}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Rubric Criteria Modal */}
            {activeRubricModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 bg-navy-900 text-white flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                                    Approved Marking Rubric
                                </span>
                                <h3 className="text-base font-bold text-white">
                                    {activeRubricModal.name} ({activeRubricModal.weight_percentage || 0} Marks)
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveRubricModal(null)}
                                className="text-slate-300 hover:text-white text-lg font-bold p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                                <Info className="h-4 w-4 shrink-0 text-blue-700" />
                                <span>
                                    This assessment is evaluated against {activeRubricModal.rubric?.criteria?.length || 0} criteria. Assessors award individual marks up to the criterion maximum.
                                </span>
                            </div>

                            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                                {activeRubricModal.rubric?.criteria?.map((crit, idx) => (
                                    <div key={crit.criterion_id || idx} className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-slate-50/50">
                                        <div className="space-y-0.5">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase">
                                                Criterion {idx + 1}
                                            </span>
                                            <h4 className="text-sm font-bold text-slate-800">
                                                {crit.criterion_name}
                                            </h4>
                                        </div>
                                        <span className="px-3 py-1 bg-navy-50 text-navy-900 font-bold text-xs rounded-lg border border-navy-200 shrink-0">
                                            Max {crit.max_score} {crit.max_score === 1 ? 'Mark' : 'Marks'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setActiveRubricModal(null)}
                                className="px-5 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded-xl text-xs font-bold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentMilestones;
