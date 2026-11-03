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
                    const filtered = res.data.filter(s => {
                        if (!user) return false;
                        const normUserEmail = (user.email || '').trim().toLowerCase();
                        const normUserName = (user.name || '').trim().toLowerCase();
                        const normAssessorEmail = (s.assessorEmail || '').trim().toLowerCase();
                        const normAssessorName = (s.assessor || '').trim().toLowerCase();

                        return (
                            (normAssessorEmail && normAssessorEmail === normUserEmail) ||
                            (normAssessorName && normUserName && (normAssessorName.includes(normUserName) || normUserName.includes(normAssessorName))) ||
                            (s.assessorId && user.id && s.assessorId === user.id)
                        );
                    });
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
                <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                    Assigned for Assessment
                </span>
            )
        },
        {
            header: 'Evaluation & Viva',
            render: (row) => (
                <Link
                    to={`/assessor/review/${row.studentId || row.dbId || row.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 text-white hover:bg-purple-800 text-xs font-semibold rounded-lg shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                    <FileText size={13} />
                    Review Workspace
                </Link>
            )
        }
    ];

    return (
        <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Assessor Evaluation Portal</h1>
                    <p className="text-sm text-slate-500 mt-1">Review assigned student projects, viva schedules, and evaluation metrics.</p>
                </div>
                <Link
                    to="/assessor/viva"
                    className="bg-navy-900 hover:bg-navy-950 text-white px-4 py-2.5 rounded-lg font-semibold shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900/30"
                >
                    <CalendarDays size={16} /> Manage Viva Availability & Schedule
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-700 rounded-xl border border-purple-100/80">
                        <Award size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Students</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">{assessedStudents.length}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100/80">
                        <CalendarDays size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Viva Schedule Status</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">Active</h3>
                    </div>
                </div>

                <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100/80">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role Type</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">Independent Assessor</h3>
                    </div>
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden p-6 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Users className="h-5 w-5 text-purple-700" /> Assigned Students for Evaluation ({assessedStudents.length})
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">Students allocated to you for independent final project assessment.</p>
                    </div>
                </div>
                <DataTable columns={columns} data={assessedStudents} />
            </div>
        </div>
    );
};

export default AssessorDashboard;
