import React, { useState, useEffect } from 'react';
import {
    getMilestonesByBatch,
    applyApprovedMilestoneTemplate,
    publishBatchMilestones,
    createMilestone,
    updateMilestone,
    deleteMilestone
} from '../../services/api';
import { formatColomboDate, toColomboInputString, colomboInputToUtcIso } from '../../utils/dateUtils';
import { RUBRIC_CATALOG } from '../../services/rubricCatalog';
import {
    CalendarDays, Plus, Edit2, Trash2, Loader2, Target, CheckCircle2,
    AlertCircle, Sparkles, Send, Eye, Clock, History, ExternalLink,
    ChevronDown, ChevronUp, BookOpen, Layers, ShieldCheck
} from 'lucide-react';

const PMMilestones = ({ batches = [] }) => {
    const [selectedBatchId, setSelectedBatchId] = useState(
        batches.length > 0 ? String(batches[0].id) : ''
    );
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState(null);

    // Preview state
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Audit logs drawer state
    const [selectedAuditLogs, setSelectedAuditLogs] = useState(null);

    // Form fields
    const [formCode, setFormCode] = useState('');
    const [formName, setFormName] = useState('');
    const [formType, setFormType] = useState('SUMMATIVE');
    const [formComponent, setFormComponent] = useState('Report');
    const [formSemester, setFormSemester] = useState('Semester 1');
    const [formMaxMarks, setFormMaxMarks] = useState(5.0);
    const [formRubricKey, setFormRubricKey] = useState('SEM1_LR');
    const [formOpeningDate, setFormOpeningDate] = useState('');
    const [formDeadline, setFormDeadline] = useState('');
    const [formAssessStart, setFormAssessStart] = useState('');
    const [formAssessEnd, setFormAssessEnd] = useState('');
    const [formIsTbc, setFormIsTbc] = useState(false);
    const [formInstructions, setFormInstructions] = useState('');
    const [formLmsUrl, setFormLmsUrl] = useState('');
    const [formStatus, setFormStatus] = useState('DRAFT');
    const [formOrderIndex, setFormOrderIndex] = useState(0);

    const currentUser = JSON.parse(localStorage.getItem('fyp_current_user') || '{}');
    const isStaff = ['pm', 'admin'].includes(currentUser?.role?.toLowerCase());

    useEffect(() => {
        if (batches.length > 0 && !selectedBatchId) {
            setSelectedBatchId(String(batches[0].id));
        }
    }, [batches]);

    useEffect(() => {
        if (selectedBatchId) {
            fetchMilestones();
        }
    }, [selectedBatchId]);

    const fetchMilestones = async () => {
        if (!selectedBatchId) return;
        setLoading(true);
        try {
            const res = await getMilestonesByBatch(selectedBatchId);
            setMilestones(res.data || []);
        } catch (error) {
            console.error("Failed to load milestones:", error);
            setMilestones([]);
        } finally {
            setLoading(false);
        }
    };

    // Apply Approved FYP Template
    const handleApplyTemplate = async () => {
        if (!selectedBatchId) return;
        const confirmMsg = "Apply the approved 8-Milestone FYP Template to this batch?\n\n• Missing milestones will be created in DRAFT state.\n• Any existing milestones and previously configured dates will be strictly preserved.\n• Students will not see drafts until you click 'Publish'.";
        if (!window.confirm(confirmMsg)) return;

        setActionLoading(true);
        try {
            const res = await applyApprovedMilestoneTemplate(selectedBatchId);
            alert(res.data.message || "Template applied successfully.");
            fetchMilestones();
        } catch (error) {
            console.error("Failed to apply template:", error);
            alert(error.response?.data?.error || "Failed to apply template.");
        } finally {
            setActionLoading(false);
        }
    };

    // Publish all drafts to batch
    const handlePublishAll = async () => {
        if (!selectedBatchId) return;
        const draftCount = milestones.filter(m => m.status === 'DRAFT').length;
        if (draftCount === 0) {
            alert("All milestones for this batch are already published.");
            return;
        }

        if (!window.confirm(`Publish ${draftCount} draft milestones to students in this batch? Students will immediately see these in their FYP Timeline.`)) {
            return;
        }

        setActionLoading(true);
        try {
            const res = await publishBatchMilestones(selectedBatchId);
            alert(res.data.message || "Milestones published to students successfully!");
            fetchMilestones();
        } catch (error) {
            console.error("Failed to publish milestones:", error);
            alert(error.response?.data?.error || "Failed to publish milestones.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenModal = (m = null) => {
        if (m) {
            setEditingMilestone(m);
            setFormCode(m.milestone_code || '');
            setFormName(m.name || '');
            setFormType(m.type || 'SUMMATIVE');
            setFormComponent(m.component || 'Report');
            setFormSemester(m.semester || 'Semester 1');
            setFormMaxMarks(m.max_marks !== null && m.max_marks !== undefined ? m.max_marks : 5.0);
            setFormRubricKey(m.rubric_key || 'SEM1_LR');
            setFormIsTbc(Boolean(m.is_date_tbc));
            setFormOpeningDate(m.colombo_input_opening || '');
            setFormDeadline(m.colombo_input_deadline || '');
            setFormAssessStart(m.colombo_input_assessment_start || '');
            setFormAssessEnd(m.colombo_input_assessment_end || '');
            setFormInstructions(m.student_instructions || '');
            setFormLmsUrl(m.lms_activity_url || '');
            setFormStatus(m.status || 'DRAFT');
            setFormOrderIndex(m.order_index || 0);
        } else {
            setEditingMilestone(null);
            setFormCode('');
            setFormName('');
            setFormType('SUMMATIVE');
            setFormComponent('Report');
            setFormSemester('Semester 1');
            setFormMaxMarks(5.0);
            setFormRubricKey('SEM1_LR');
            setFormIsTbc(false);
            setFormOpeningDate('');
            setFormDeadline('');
            setFormAssessStart('');
            setFormAssessEnd('');
            setFormInstructions('');
            setFormLmsUrl('');
            setFormStatus('DRAFT');
            setFormOrderIndex(milestones.length);
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                batch_id: selectedBatchId,
                milestone_code: formCode || null,
                name: formName,
                type: formType,
                component: formComponent,
                semester: formSemester,
                max_marks: parseFloat(formMaxMarks) || 0,
                rubric_key: formRubricKey || null,
                is_date_tbc: formIsTbc,
                opening_date: formIsTbc ? null : formOpeningDate,
                deadline: formIsTbc ? null : formDeadline,
                assessment_start_date: formIsTbc ? null : formAssessStart,
                assessment_end_date: formIsTbc ? null : formAssessEnd,
                student_instructions: formInstructions,
                lms_activity_url: formLmsUrl,
                status: formStatus,
                order_index: formOrderIndex
            };

            if (editingMilestone) {
                await updateMilestone(editingMilestone.id, payload);
            } else {
                await createMilestone(payload);
            }
            setShowModal(false);
            fetchMilestones();
        } catch (error) {
            console.error("Failed to save milestone:", error);
            alert(error.response?.data?.error || "Failed to save milestone.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this milestone?")) return;
        try {
            await deleteMilestone(id);
            fetchMilestones();
        } catch (error) {
            console.error("Failed to delete milestone:", error);
            alert(error.response?.data?.error || "Failed to delete milestone.");
        }
    };

    // Group milestones by semester
    const grouped = {
        Preparation: milestones.filter(m => m.semester === 'Preparation'),
        "Semester 1": milestones.filter(m => !m.semester || m.semester === 'Semester 1'),
        "Semester 2": milestones.filter(m => m.semester === 'Semester 2'),
        "Semester 3": milestones.filter(m => m.semester === 'Semester 3')
    };

    const draftCount = milestones.filter(m => m.status === 'DRAFT').length;
    const publishedCount = milestones.filter(m => m.status === 'PUBLISHED').length;

    return (
        <div className="space-y-6">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-slate-800">FYP Milestone Schedule</h1>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {currentUser?.role === 'admin' ? 'Administrator' : 'Project Manager'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Configure batch academic milestones, release dates in Sri Lanka Time (UTC+05:30), and manage student visibility.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setShowPreviewModal(true)}
                        disabled={milestones.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors border border-slate-300 disabled:opacity-50"
                    >
                        <Eye className="h-4 w-4" /> Preview Student View
                    </button>

                    <button
                        onClick={handleApplyTemplate}
                        disabled={!selectedBatchId || actionLoading}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs transition-colors disabled:opacity-50"
                        title="Generates 8 standard milestones preserving existing items"
                    >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Apply Approved FYP Template
                    </button>

                    {draftCount > 0 && (
                        <button
                            onClick={handlePublishAll}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" /> Publish All Drafts ({draftCount})
                        </button>
                    )}

                    <button
                        onClick={() => handleOpenModal()}
                        disabled={!selectedBatchId}
                        className="flex items-center gap-1.5 px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded-lg font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" /> Add Milestone
                    </button>
                </div>
            </div>

            {/* Batch Selector & Status Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Active Batch:</label>
                    <select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy-900"
                    >
                        {batches.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.batch_code} ({b.batch_intake || 'Intake'})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        Published: <strong>{publishedCount}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        Draft: <strong>{draftCount}</strong>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" /> All times: Sri Lanka Time (UTC+05:30)
                    </span>
                </div>
            </div>

            {/* Milestone List Grouped by 3 Semesters */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading milestone schedule...
                </div>
            ) : milestones.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">No Milestones Configured Yet</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                            This batch does not have a milestone schedule. Click below to automatically initialize the approved 8-Milestone academic structure.
                        </p>
                    </div>
                    <button
                        onClick={handleApplyTemplate}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow transition-all inline-flex items-center gap-2"
                    >
                        <Sparkles className="h-4 w-4" /> Apply Approved FYP Template
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([semName, semMilestones]) => {
                        if (semMilestones.length === 0) return null;
                        return (
                            <div key={semName} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-navy-900" />
                                        <h3 className="text-sm font-bold text-slate-800">{semName}</h3>
                                        <span className="text-[11px] font-semibold text-slate-400">({semMilestones.length} milestones)</span>
                                    </div>
                                    <span className="text-[11px] font-mono text-slate-500">
                                        Total Marks: {semMilestones.reduce((acc, m) => acc + (parseFloat(m.max_marks) || 0), 0)} pts
                                    </span>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {semMilestones.map((m) => (
                                        <div key={m.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1.5 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {m.milestone_code && (
                                                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                            {m.milestone_code}
                                                        </span>
                                                    )}
                                                    <h4 className="text-sm font-bold text-slate-800">{m.name}</h4>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        m.status === 'PUBLISHED'
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    }`}>
                                                        {m.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                                        {m.component || 'Report'}
                                                    </span>
                                                    {parseFloat(m.max_marks) > 0 && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                            {m.max_marks} marks
                                                        </span>
                                                    )}
                                                </div>

                                                {m.student_instructions && (
                                                    <p className="text-xs text-slate-600 line-clamp-1">{m.student_instructions}</p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                    <span>
                                                        <strong className="text-slate-600">Opens:</strong> {m.opening_date_formatted}
                                                    </span>
                                                    <span>
                                                        <strong className="text-slate-600">Deadline:</strong> {m.deadline_formatted}
                                                    </span>
                                                    {m.assessment_start_formatted && (
                                                        <span>
                                                            <strong className="text-slate-600">Assessment:</strong> {m.assessment_start_formatted}
                                                        </span>
                                                    )}
                                                    {m.lms_activity_url && (
                                                        <a
                                                            href={m.lms_activity_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                                                        >
                                                            <ExternalLink className="w-3 h-3" /> LMS Link
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end md:self-center">
                                                {m.date_audit_logs && m.date_audit_logs.length > 0 && (
                                                    <button
                                                        onClick={() => setSelectedAuditLogs(m)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="View Date Change History"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleOpenModal(m)}
                                                    className="p-1.5 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Edit Milestone & Dates"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(m.id)}
                                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Delete Milestone"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL: ADD / EDIT MILESTONE */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 my-8 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">
                                    {editingMilestone ? 'Edit Academic Milestone' : 'Add Academic Milestone'}
                                </h3>
                                <p className="text-xs text-slate-500">Configure schedule dates in Sri Lanka Time (Asia/Colombo UTC+05:30)</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Milestone Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900"
                                        placeholder="e.g. Literature Review Checkpoint"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Milestone Code (Optional)</label>
                                    <input
                                        type="text"
                                        value={formCode}
                                        onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-navy-900"
                                        placeholder="e.g. SEM1_LR"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Semester</label>
                                    <select
                                        value={formSemester}
                                        onChange={(e) => setFormSemester(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900"
                                    >
                                        <option value="Preparation">Preparation</option>
                                        <option value="Semester 1">Semester 1</option>
                                        <option value="Semester 2">Semester 2</option>
                                        <option value="Semester 3">Semester 3</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Component</label>
                                    <select
                                        value={formComponent}
                                        onChange={(e) => setFormComponent(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900"
                                    >
                                        <option value="Unmarked">Unmarked (0)</option>
                                        <option value="Proposal">Proposal (20 total)</option>
                                        <option value="Report">Report (60 total)</option>
                                        <option value="Viva Presentation">Viva Presentation (20 total)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Max Marks</label>
                                    <input
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        max="100"
                                        value={formMaxMarks}
                                        onChange={(e) => setFormMaxMarks(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-navy-900"
                                    />
                                </div>
                            </div>

                            {/* Date to be confirmed checkbox */}
                            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="isTbcCheckbox"
                                    checked={formIsTbc}
                                    onChange={(e) => setFormIsTbc(e.target.checked)}
                                    className="h-4 w-4 accent-navy-900 rounded"
                                />
                                <label htmlFor="isTbcCheckbox" className="font-semibold text-slate-700 cursor-pointer">
                                    Date to be confirmed (TBC) — Show pending date placeholder to students
                                </label>
                            </div>

                            {!formIsTbc && (
                                <div className="space-y-3 p-3 bg-slate-50/70 border border-slate-200 rounded-lg">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Opening Date (Colombo)</label>
                                            <input
                                                type="datetime-local"
                                                value={formOpeningDate}
                                                onChange={(e) => setFormOpeningDate(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Submission Deadline (Colombo) *</label>
                                            <input
                                                type="datetime-local"
                                                value={formDeadline}
                                                onChange={(e) => setFormDeadline(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Assessment Start (Optional)</label>
                                            <input
                                                type="datetime-local"
                                                value={formAssessStart}
                                                onChange={(e) => setFormAssessStart(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-1">Assessment End (Optional)</label>
                                            <input
                                                type="datetime-local"
                                                value={formAssessEnd}
                                                onChange={(e) => setFormAssessEnd(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Student Instructions / What to Prepare</label>
                                <textarea
                                    rows="2"
                                    value={formInstructions}
                                    onChange={(e) => setFormInstructions(e.target.value)}
                                    placeholder="Explain what students must produce, format requirements, and submission instructions."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Official LMS Submission Activity URL</label>
                                <input
                                    type="url"
                                    value={formLmsUrl}
                                    onChange={(e) => setFormLmsUrl(e.target.value)}
                                    placeholder="https://lms.apiit.lk/mod/turnitintooltwo/view.php?id=..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-navy-900"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Publication State</label>
                                    <select
                                        value={formStatus}
                                        onChange={(e) => setFormStatus(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-navy-900"
                                    >
                                        <option value="DRAFT">Draft (Staff Only)</option>
                                        <option value="PUBLISHED">Published (Visible to Students)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Display Order</label>
                                    <input
                                        type="number"
                                        value={formOrderIndex}
                                        onChange={(e) => setFormOrderIndex(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-navy-900 text-white rounded-lg hover:bg-navy-950 font-bold shadow"
                                >
                                    {editingMilestone ? 'Save Changes' : 'Create Milestone'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: PREVIEW STUDENT VIEW */}
            {showPreviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl p-6 my-8 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-indigo-600" /> Student View Preview
                                </h3>
                                <p className="text-xs text-slate-500">Previewing published milestone timeline for this batch</p>
                            </div>
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                            <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-xs text-indigo-800">
                                <strong>Official Submissions &amp; Grade Releases:</strong> Take place exclusively via <code>lms.apiit.lk</code>. The FYP portal displays milestone deadlines and feedback.
                            </div>

                            {Object.entries(grouped).map(([semName, semMilestones]) => {
                                const publishedOnly = semMilestones.filter(m => m.status === 'PUBLISHED');
                                if (publishedOnly.length === 0) return null;
                                return (
                                    <div key={semName} className="space-y-2">
                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{semName}</h4>
                                        <div className="space-y-2">
                                            {publishedOnly.map((m) => (
                                                <div key={m.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-slate-800 text-sm">{m.name}</span>
                                                        <span className="font-mono text-xs font-bold text-blue-700">
                                                            {parseFloat(m.max_marks) > 0 ? `${m.max_marks} marks` : 'Unmarked'}
                                                        </span>
                                                    </div>
                                                    <div className="text-slate-600">
                                                        <span><strong>Deadline:</strong> {m.deadline_formatted}</span>
                                                    </div>
                                                    {m.student_instructions && (
                                                        <p className="text-slate-500 italic">{m.student_instructions}</p>
                                                    )}
                                                    {m.lms_activity_url && (
                                                        <div className="pt-1">
                                                            <a
                                                                href={m.lms_activity_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800"
                                                            >
                                                                <ExternalLink className="w-3.5 h-3.5" /> Submit on LMS (lms.apiit.lk)
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: DATE CHANGE AUDIT LOGS */}
            {selectedAuditLogs && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                <History className="w-4 h-4 text-slate-600" /> Date Change Audit History
                            </h3>
                            <button
                                onClick={() => setSelectedAuditLogs(null)}
                                className="text-slate-400 hover:text-slate-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">Milestone: <strong>{selectedAuditLogs.name}</strong></p>

                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {selectedAuditLogs.date_audit_logs.map((log) => (
                                <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                                    <div className="flex items-center justify-between text-slate-500 text-[10px]">
                                        <span>By: <strong>{log.changed_by}</strong></span>
                                        <span>{new Date(log.changed_at).toLocaleString()}</span>
                                    </div>
                                    <div className="text-slate-700">
                                        <span className="font-semibold">{log.field_name}:</span> {log.old_value || 'None'} → <strong className="text-navy-900">{log.new_value}</strong>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PMMilestones;
