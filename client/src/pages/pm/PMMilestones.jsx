import React, { useState, useEffect } from 'react';
import { getMilestonesByBatch, createMilestone, updateMilestone, deleteMilestone } from '../../services/api';
import { CalendarDays, Plus, Edit2, Trash2, Loader2, Target, CheckCircle2, AlertCircle } from 'lucide-react';

const PMMilestones = ({ batches }) => {
    const [selectedBatchId, setSelectedBatchId] = useState(
        batches.length > 0 ? String(batches[0].id) : ''
    );
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form state
    const [name, setName] = useState('');
    const [type, setType] = useState('FORMATIVE');
    const [deadline, setDeadline] = useState('');
    const [orderIndex, setOrderIndex] = useState(0);
    const [description, setDescription] = useState('');

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
            setMilestones(res.data);
        } catch (error) {
            console.error("Failed to load milestones:", error);
            setMilestones([]);
        } finally {
            setLoading(false);
        }
    };


    const handleOpenModal = (m = null) => {
        if (m) {
            setEditingId(m.id);
            setName(m.name);
            setType(m.type);
            // Convert to datetime-local format (YYYY-MM-DDTHH:mm)
            const d = new Date(m.deadline);
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            setDeadline(d.toISOString().slice(0, 16));
            setOrderIndex(m.order_index);
            setDescription(m.description || '');
        } else {
            setEditingId(null);
            setName('');
            setType('FORMATIVE');
            setDeadline('');
            setOrderIndex(milestones.length);
            setDescription('');
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateMilestone(editingId, { name, type, deadline, order_index: orderIndex, description });
            } else {
                await createMilestone({ batch_id: selectedBatchId, name, type, deadline, order_index: orderIndex, description });
            }
            setShowModal(false);
            fetchMilestones();
        } catch (error) {
            console.error("Failed to save milestone:", error);
            alert("Failed to save milestone.");
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

    const formatDateTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + 
               ' at ' + 
               d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-800">FYP Milestone Tracker</h1>
                    <p className="text-sm text-slate-500">Configure timelines and deadlines for specific batches</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    disabled={!selectedBatchId}
                    className="flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded-lg font-bold text-sm shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                >
                    <Plus className="h-4 w-4" /> Add Milestone
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="max-w-xs">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Select Batch Context</label>
                    <select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-900"
                    >
                        {batches.map(b => (
                            <option key={b.id} value={b.id}>{b.intake} {b.batchCode ? `(${b.batchCode})` : ''}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading timeline...
                </div>
            ) : milestones.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center space-y-3">
                    <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                        <CalendarDays className="h-6 w-6 text-slate-300" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-700">No Milestones Configured</h3>
                        <p className="text-xs text-slate-500 mt-1">Add milestones to track student progress for this batch.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {milestones.map((m, idx) => (
                        <div key={m.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                    {idx + 1}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-base font-bold text-slate-800">{m.name}</h3>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                                            m.type === 'SUMMATIVE' 
                                                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            {m.type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4" /> Due: {formatDateTime(m.deadline)}
                                    </p>
                                    {m.description && <p className="text-xs text-slate-400 mt-1">{m.description}</p>}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleOpenModal(m)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDelete(m.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Milestone' : 'Create Milestone'}</h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Milestone Name *</label>
                                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" placeholder="e.g. SRS Submission" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Type *</label>
                                <select value={type} onChange={e => setType(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm">
                                    <option value="FORMATIVE">Formative (Progress Check)</option>
                                    <option value="SUMMATIVE">Summative (Graded Assessment)</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Deadline (Date & Time) *</label>
                                <input required type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Order/Sequence *</label>
                                <input required type="number" value={orderIndex} onChange={e => setOrderIndex(Number(e.target.value))} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Description</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm h-20 resize-none" placeholder="Optional instructions..."></textarea>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-navy-900 text-white rounded-lg text-sm font-semibold hover:bg-navy-950">Save Milestone</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PMMilestones;
