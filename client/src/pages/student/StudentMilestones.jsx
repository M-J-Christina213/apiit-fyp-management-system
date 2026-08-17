import React, { useState, useEffect } from 'react';
import { getStudentMilestoneProgressByCb } from '../../services/api';
import { CalendarDays, Loader2, CheckCircle2, Clock, AlertCircle, Target } from 'lucide-react';

const StudentMilestones = ({ studentId }) => {
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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
                setProgress({ timeline: [] });
            } else {
                setError("Failed to load your milestone progress.");
            }
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + 
               ' at ' + 
               d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case "Submitted":
            case "Graded":
                return { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 };
            case "Due Today":
                return { color: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertCircle };
            case "Due Soon":
                return { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock };
            case "Overdue":
                return { color: "bg-red-50 text-red-700 border-red-300 font-bold", icon: AlertCircle };
            case "Upcoming":
            default:
                return { color: "bg-slate-50 text-slate-600 border-slate-200", icon: CalendarDays };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading your FYP timeline...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" /> {error}
            </div>
        );
    }

    if (!progress || progress.timeline.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                    <CalendarDays className="h-6 w-6 text-slate-300" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-700">No Milestones Found</h3>
                    <p className="text-xs text-slate-500 mt-1">Your timeline has not been configured yet.</p>
                </div>
            </div>
        );
    }

    const { currentMilestone, timeline } = progress;

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">My FYP Timeline</h1>
                <p className="text-sm text-slate-500 mt-1">Track your project milestones and upcoming deadlines</p>
            </div>

            {currentMilestone && (
                <div className="bg-gradient-to-r from-navy-900 to-navy-800 rounded-xl shadow-md p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-lg">
                            <Target className="h-6 w-6 text-blue-300" />
                        </div>
                        <div>
                            <p className="text-xs text-blue-200 font-bold uppercase tracking-wider mb-1">Current Objective</p>
                            <h3 className="text-lg font-bold">{currentMilestone.name}</h3>
                            <p className="text-sm text-blue-100 mt-1 flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Due: {formatDateTime(currentMilestone.deadline)}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-bold text-blue-100">
                            {currentMilestone.type} Assessment
                        </span>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800">Complete Timeline</h3>
                </div>
                <div className="p-6">
                    <div className="relative border-l-2 border-slate-100 ml-4 space-y-8">
                        {timeline.map((m, idx) => {
                            const statusConf = getStatusConfig(m.derived_status);
                            const StatusIcon = statusConf.icon;
                            
                            return (
                                <div key={m.id} className="relative pl-8">
                                    <div className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full border-4 border-white flex items-center justify-center ${m.is_current ? 'bg-blue-600 shadow-md shadow-blue-200' : (m.derived_status === 'Submitted' || m.derived_status === 'Graded' ? 'bg-emerald-500' : 'bg-slate-200')}`}>
                                        {m.derived_status === 'Submitted' || m.derived_status === 'Graded' ? (
                                            <CheckCircle2 className="h-4 w-4 text-white" />
                                        ) : m.is_current ? (
                                            <Target className="h-4 w-4 text-white" />
                                        ) : (
                                            <span className="text-[10px] font-bold text-white">{idx + 1}</span>
                                        )}
                                    </div>
                                    
                                    <div className={`p-5 rounded-xl border ${m.is_current ? 'border-blue-200 bg-blue-50/50 shadow-sm' : 'border-slate-100 bg-white'}`}>
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                            <div>
                                                <h4 className={`text-base font-bold ${m.is_current ? 'text-blue-900' : 'text-slate-800'}`}>
                                                    {m.name}
                                                </h4>
                                                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                                                    <CalendarDays className="h-3.5 w-3.5" /> {formatDateTime(m.deadline)}
                                                </p>
                                                {m.description && <p className="text-xs text-slate-400 mt-2">{m.description}</p>}
                                            </div>
                                            
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <span className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] uppercase font-bold rounded-full border ${statusConf.color}`}>
                                                    <StatusIcon className="h-3.5 w-3.5" />
                                                    {m.derived_status}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase text-slate-400">
                                                    {m.type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentMilestones;
