import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardCard from '../../components/common/DashboardCard';
import DataTable from '../../components/common/DataTable';
import {
  getUsers,
  saveUsers,
  getStats,
  getStudents,
  getSupervisors
} from '../../../../server/data/mockData';
import {
  Users,
  GraduationCap,
  UserCheck,
  Settings,
  Clock,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  X,
  CheckCircle,
  Save
} from 'lucide-react';

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [students, setStudents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);

  // Modal states
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Student');

  // Portal setting states
  const [maintMode, setMaintMode] = useState(false);
  const [ssoMandatory, setSsoMandatory] = useState(true);
  const [maxSlots, setMaxSlots] = useState(6);
  const [proposalRequired, setProposalRequired] = useState(true);

  // Role permissions mock data
  const [rolePermissions, setRolePermissions] = useState({
    Student: { viewSupervisors: true, submitProposal: true, manageUsers: false, allocateSupervisors: false },
    Supervisor: { viewSupervisors: true, submitProposal: false, evaluateProposal: true, allocateSupervisors: false },
    'Project Manager': { viewSupervisors: true, submitProposal: false, evaluateProposal: true, allocateSupervisors: true },
    Admin: { viewSupervisors: true, submitProposal: true, evaluateProposal: true, allocateSupervisors: true, manageSystem: true }
  });

  useEffect(() => {
    setUsers(getUsers());
    setStudents(getStudents());
    setSupervisors(getSupervisors());
    setStats(getStats());

    // Load settings from localStorage
    const savedMaint = localStorage.getItem('setting_maint');
    if (savedMaint) setMaintMode(JSON.parse(savedMaint));
    const savedSso = localStorage.getItem('setting_sso');
    if (savedSso) setSsoMandatory(JSON.parse(savedSso));
    const savedSlots = localStorage.getItem('setting_slots');
    if (savedSlots) setMaxSlots(JSON.parse(savedSlots));
    const savedProp = localStorage.getItem('setting_proposal');
    if (savedProp) setProposalRequired(JSON.parse(savedProp));
  }, [path]);

  // Action: Add User
  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    const newUser = {
      id: 'U' + String(users.length + 1).padStart(3, '0'),
      name: newUserName,
      role: newUserRole,
      email: newUserEmail.toLowerCase(),
      status: 'Active'
    };

    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers);
    setUsers(updatedUsers);

    // Clear forms
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('Student');
    setShowAddUser(false);
    setStats(getStats());

    alert(`Account for ${newUser.name} created successfully.`);
  };

  // Action: Toggle Status
  const handleToggleStatus = (userId) => {
    const updatedUsers = users.map(u =>
      u.id === userId
        ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' }
        : u
    );
    saveUsers(updatedUsers);
    setUsers(updatedUsers);
    alert("User status updated.");
  };

  // Action: Delete User
  const handleScaleDeleteUser = (userId) => {
    if (window.confirm("Are you sure you want to permanently delete this user account?")) {
      const updatedUsers = users.filter(u => u.id !== userId);
      saveUsers(updatedUsers);
      setUsers(updatedUsers);
      setStats(getStats());
    }
  };

  // Action: Save Portal Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('setting_maint', JSON.stringify(maintMode));
    localStorage.setItem('setting_sso', JSON.stringify(ssoMandatory));
    localStorage.setItem('setting_slots', JSON.stringify(maxSlots));
    localStorage.setItem('setting_proposal', JSON.stringify(proposalRequired));
    alert("Portal system settings updated and saved.");
  };

  // Toggle role permission checks
  const handlePermissionToggle = (role, permission) => {
    const updated = { ...rolePermissions };
    updated[role][permission] = !updated[role][permission];
    setRolePermissions(updated);
  };

  // Columns definition
  const userManagementColumns = [
    { header: 'ID', accessor: 'id' },
    { header: 'Full Name', accessor: 'name' },
    { header: 'Email Address', accessor: 'email' },
    {
      header: 'Role',
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${row.role === 'Admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
            row.role === 'Supervisor' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
              row.role === 'Project Manager' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-slate-50 text-slate-700 border border-slate-200'
          }`}>
          {row.role}
        </span>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${row.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
          {row.status}
        </span>
      )
    },
    {
      header: 'Operations',
      render: (row) => (
        <div className="flex gap-3">
          <button
            onClick={() => handleToggleStatus(row.id)}
            title="Toggle Status (Active/Inactive)"
            className="text-slate-500 hover:text-navy-900 transition-colors p-1"
          >
            {row.status === 'Active' ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
          </button>
          <button
            onClick={() => handleScaleDeleteUser(row.id)}
            title="Delete Account"
            className="text-slate-400 hover:text-red-600 transition-colors p-1"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  const renderContent = () => {
    // ---------------- ADMIN DASHBOARD TAB ----------------
    if (path === '/admin/dashboard' || path === '/admin') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800">System Administration</h1>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-navy-900 text-white hover:bg-navy-950 font-bold rounded text-xs transition-colors select-none"
            >
              <Plus className="h-4 w-4" /> Add System User
            </button>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <DashboardCard title="Total Users" value={stats.totalUsers || 0} icon={Users} />
            <DashboardCard title="Students Registered" value={stats.studentsCount || 0} icon={GraduationCap} />
            <DashboardCard title="Supervisors Pool" value={stats.supervisorsCount || 0} icon={UserCheck} />
            <DashboardCard title="Project Managers" value={stats.pmsCount || 0} icon={Settings} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* User Management List */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-[#0C2340]">Recent User Registrations</h3>
                  <button onClick={() => navigate('/admin/users')} className="text-xs font-bold text-navy-600 hover:text-navy-800">Manage All Users</button>
                </div>
                <DataTable columns={userManagementColumns.slice(0, 5)} data={users.slice(0, 4)} />
              </div>
            </div>

            {/* System Log Activity */}
            <div className="space-y-6">
              <div className="bg-white p-5 rounded border border-slate-200 shadow-sm h-full">
                <h3 className="text-base font-bold text-[#0C2340] mb-4">System Activity Audit</h3>
                <div className="space-y-4">
                  {[
                    { action: 'Portal backup generated successfully', time: '1 hour ago' },
                    { action: 'Completed supervisor capacity sync', time: '4 hours ago' },
                    { action: 'Updated security configurations', time: '1 day ago' },
                    { action: 'Imported batch 2024-Sep student roster', time: '2 days ago' }
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

    // ---------------- USERS TAB ----------------
    if (path === '/admin/users') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-800">User Management System</h1>
              <p className="text-sm text-slate-500">Configure account profiles, verify email registrations, and adjust credentials.</p>
            </div>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-navy-900 text-white hover:bg-navy-950 font-bold rounded text-xs transition-colors select-none"
            >
              <Plus className="h-4 w-4" /> Register New Account
            </button>
          </div>

          <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
            <DataTable columns={userManagementColumns} data={users} />
          </div>
        </div>
      );
    }

    // ---------------- ROLES PERMISSIONS TAB ----------------
    if (path === '/admin/roles') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Role Permissions Roster</h1>
            <p className="text-sm text-slate-500">Enable or disable system feature access across each user role group.</p>
          </div>

          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full border-collapse text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 border-r border-slate-200">System Role</th>
                  <th className="px-6 py-4 border-r border-slate-200 text-center">View Supervisors</th>
                  <th className="px-6 py-4 border-r border-slate-200 text-center">Submit Proposal</th>
                  <th className="px-6 py-4 border-r border-slate-200 text-center">Evaluate Proposal</th>
                  <th className="px-6 py-4 border-r border-slate-200 text-center">Allocate Supervisor</th>
                  <th className="px-6 py-4 text-center">System Configs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {Object.keys(rolePermissions).map((role) => (
                  <tr key={role} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold border-r border-slate-200 text-slate-800 bg-slate-50/50">{role}</td>

                    <td className="px-6 py-4 border-r border-slate-200 text-center">
                      <input
                        type="checkbox"
                        checked={rolePermissions[role].viewSupervisors || false}
                        onChange={() => handlePermissionToggle(role, 'viewSupervisors')}
                        className="h-4.5 w-4.5 accent-navy-900"
                      />
                    </td>

                    <td className="px-6 py-4 border-r border-slate-200 text-center">
                      <input
                        type="checkbox"
                        checked={rolePermissions[role].submitProposal || false}
                        onChange={() => handlePermissionToggle(role, 'submitProposal')}
                        className="h-4.5 w-4.5 accent-navy-900"
                      />
                    </td>

                    <td className="px-6 py-4 border-r border-slate-200 text-center">
                      <input
                        type="checkbox"
                        checked={rolePermissions[role].evaluateProposal || false}
                        disabled={role === 'Student'}
                        onChange={() => handlePermissionToggle(role, 'evaluateProposal')}
                        className="h-4.5 w-4.5 accent-navy-900 disabled:opacity-30"
                      />
                    </td>

                    <td className="px-6 py-4 border-r border-slate-200 text-center">
                      <input
                        type="checkbox"
                        checked={rolePermissions[role].allocateSupervisors || false}
                        disabled={role === 'Student' || role === 'Supervisor'}
                        onChange={() => handlePermissionToggle(role, 'allocateSupervisors')}
                        className="h-4.5 w-4.5 accent-navy-900 disabled:opacity-30"
                      />
                    </td>

                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={rolePermissions[role].manageSystem || false}
                        disabled={role !== 'Admin'}
                        onChange={() => handlePermissionToggle(role, 'manageSystem')}
                        className="h-4.5 w-4.5 accent-navy-900 disabled:opacity-30"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => alert("Role matrix permissions updated and saved.")}
                className="flex items-center gap-1.5 px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded text-xs font-bold transition-colors"
              >
                <Save className="h-4 w-4" /> Save Permission matrix
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ---------------- PORTAL SETTINGS TAB ----------------
    if (path === '/admin/settings') {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>
            <p className="text-sm text-slate-500">Configure global matching rules, SSO parameters, and security policies for FYPMS.</p>
          </div>

          <div className="bg-white p-6 rounded border border-slate-200 shadow-sm max-w-2xl">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded bg-slate-50/50">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-slate-800">Maintenance Mode</label>
                    <p className="text-xs text-slate-500">Restrict access to coordinators and admins only during database checks.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={maintMode}
                    onChange={(e) => setMaintMode(e.target.checked)}
                    className="h-5 w-5 accent-navy-900"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-slate-200 rounded bg-slate-50/50">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-slate-800">Mandatory Microsoft SSO Login</label>
                    <p className="text-xs text-slate-500">Block standard email logins and enforce Active Directory credentials.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={ssoMandatory}
                    onChange={(e) => setSsoMandatory(e.target.checked)}
                    className="h-5 w-5 accent-navy-900"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-slate-200 rounded bg-slate-50/50">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-slate-800">Mandatory Proposal PDF Upload</label>
                    <p className="text-xs text-slate-500">Students must attach a draft research outline when registering a topic.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={proposalRequired}
                    onChange={(e) => setProposalRequired(e.target.checked)}
                    className="h-5 w-5 accent-navy-900"
                  />
                </div>

                <div className="space-y-1.5 p-3 border border-slate-200 rounded bg-slate-50/50">
                  <label className="text-sm font-bold text-slate-800 block">Maximum Supervisor Match Capacity</label>
                  <p className="text-xs text-slate-500 mb-2">Configure standard student matching cap per supervisor.</p>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={maxSlots}
                    onChange={(e) => setMaxSlots(parseInt(e.target.value) || maxSlots)}
                    className="w-32 p-2 bg-white border border-slate-200 rounded text-sm text-slate-800 font-semibold focus:outline-none focus:border-navy-900"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-navy-900 hover:bg-navy-950 text-white rounded text-sm font-bold transition-colors"
                >
                  Save System Configurations
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderContent()}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Create Portal Account</h3>
              <button onClick={() => setShowAddUser(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frank Lampard"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="block w-full p-2.5 border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">University Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. flampard@apiit.lk"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="block w-full p-2.5 border border-slate-200 rounded text-slate-900 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Assigned Portal Role *</label>
                <select
                  required
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="block w-full p-2.5 border border-slate-200 bg-white rounded text-slate-700 text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900"
                >
                  <option value="Student">Student</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="Admin">Administrator</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded text-sm font-semibold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-950 text-white rounded text-sm font-semibold transition-colors"
                >
                  Register Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
