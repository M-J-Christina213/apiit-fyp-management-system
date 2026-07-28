import React, { useState, useEffect } from 'react';
import { Award, CalendarDays, Users, FileText, CheckCircle2 } from 'lucide-react';
import { getStudents, getLoggedInUser } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { Link } from 'react-router-dom';

const AssessorDashboard = () => {
    const [assessedStudents, setAssessedStudents] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const user = getLoggedInUser();
        if (user) setCurrentUser(user);

        const loadAssessorData = async () => {
            try {
                const res = await getStudents();
                if (res.data) {
                    const filtered = res.data.filter(s => 
                        s.assessor === user?.name || 
                        s.assessor?.toLowerCase().includes((user?.name || '').toLowerCase())
                    );
                    setAssessedStudents(filtered);
                }
            } catch (err) {
                console.error("Failed to load assessor students:", err);
            }
        };

        loadAssessorData();
    }, []);

    const columns = [
        { header: 'Student ID', accessor: 'id' },
        { header: 'Student Name', accessor: 'name' },
        { header: 'Batch Intake', render: (row) => row.intake || row.batch || '-' },
        { header: 'Project Topic', render: (row) => row.topic || 'Tentative Topic' },
        { header: 'Supervisor', render: (row) => row.supervisor || 'Unassigned' },
        { 
            header: 'Assessment Status', 
            render: (row) => (
                <span className="px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                    Assigned for Assessment
                </span>
            )
        }
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Assessor Evaluation Portal</h1>
                    <p className="text-slate-500 mt-1">Review assigned student projects, viva schedules, and evaluation metrics.</p>
                </div>
                <Link
                    to="/assessor/viva"
                    className="bg-navy-900 hover:bg-navy-950 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2 text-sm"
                >
                    <CalendarDays size={16} /> Manage Viva Availability & Schedule
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Students</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{assessedStudents.length}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                        <CalendarDays size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Viva Schedule Status</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-0.5">Active</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role Type</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-0.5">Independent Assessor</h3>
                    </div>
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Users className="h-5 w-5 text-purple-700" /> Assigned Students for Evaluation ({assessedStudents.length})
                        </h2>
                        <p className="text-xs text-slate-500">Students allocated to you for independent final project assessment.</p>
                    </div>
                </div>
                <DataTable columns={columns} data={assessedStudents} />
            </div>
        </div>
    );
};

export default AssessorDashboard;
