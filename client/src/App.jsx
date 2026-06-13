import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/layouts/DashboardLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import PMDashboard from './pages/pm/PMDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import { getLoggedInUser } from '../../server/data/mockData';
import {
  LayoutDashboard,
  Users,
  FileText,
  Bell,
  Settings,
  Layers,
  UserCheck,
  Shield
} from 'lucide-react';

const studentLinks = [
  { path: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/student/supervisors', label: 'Supervisors', icon: Users },
  { path: '/student/proposal', label: 'Proposal Submission', icon: FileText },
  { path: '/student/templates', label: 'Templates', icon: Layers },
  { path: '/student/notifications', label: 'Notifications', icon: Bell },
];

const supervisorLinks = [
  { path: '/supervisor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/supervisor/requests', label: 'Proposal Requests', icon: FileText },
  { path: '/supervisor/students', label: 'My Students', icon: Users },
  { path: '/supervisor/profile', label: 'Profile', icon: Settings },
  { path: '/supervisor/notifications', label: 'Notifications', icon: Bell },
];

const pmLinks = [
  { path: '/pm/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pm/batches', label: 'Batches', icon: Layers },
  { path: '/pm/students', label: 'Students', icon: Users },
  { path: '/pm/supervisors', label: 'Supervisors', icon: UserCheck },
  { path: '/pm/allocation', label: 'Supervisor Allocation', icon: Shield },
  { path: '/pm/reports', label: 'Reports', icon: FileText },
];

const adminLinks = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/roles', label: 'Roles', icon: Shield },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

// Route guards
const ProtectedRoute = ({ allowedRole }) => {
  const user = getLoggedInUser();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (user.role !== allowedRole) {
    if (user.role === 'Student') return <Navigate to="/student/dashboard" replace />;
    if (user.role === 'Supervisor') return <Navigate to="/supervisor/dashboard" replace />;
    if (user.role === 'Project Manager') return <Navigate to="/pm/dashboard" replace />;
    if (user.role === 'Admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

const LoginRoute = () => {
  const user = getLoggedInUser();
  if (user) {
    if (user.role === 'Student') return <Navigate to="/student/dashboard" replace />;
    if (user.role === 'Supervisor') return <Navigate to="/supervisor/dashboard" replace />;
    if (user.role === 'Project Manager') return <Navigate to="/pm/dashboard" replace />;
    if (user.role === 'Admin') return <Navigate to="/admin/dashboard" replace />;
  }
  return <Login />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginRoute />} />

        {/* Student Routes */}
        <Route element={<ProtectedRoute allowedRole="Student" />}>
          <Route element={<DashboardLayout links={studentLinks} title="Student Portal" />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/supervisors" element={<StudentDashboard />} />
            <Route path="/student/proposal" element={<StudentDashboard />} />
            <Route path="/student/templates" element={<StudentDashboard />} />
            <Route path="/student/notifications" element={<StudentDashboard />} />
            <Route path="/student/*" element={<Navigate to="/student/dashboard" replace />} />
          </Route>
        </Route>

        {/* Supervisor Routes */}
        <Route element={<ProtectedRoute allowedRole="Supervisor" />}>
          <Route element={<DashboardLayout links={supervisorLinks} title="Supervisor Portal" />}>
            <Route path="/supervisor/dashboard" element={<SupervisorDashboard />} />
            <Route path="/supervisor/requests" element={<SupervisorDashboard />} />
            <Route path="/supervisor/students" element={<SupervisorDashboard />} />
            <Route path="/supervisor/profile" element={<SupervisorDashboard />} />
            <Route path="/supervisor/notifications" element={<SupervisorDashboard />} />
            <Route path="/supervisor/*" element={<Navigate to="/supervisor/dashboard" replace />} />
          </Route>
        </Route>

        {/* PM Routes */}
        <Route element={<ProtectedRoute allowedRole="Project Manager" />}>
          <Route element={<DashboardLayout links={pmLinks} title="Project Manager Portal" />}>
            <Route path="/pm/dashboard" element={<PMDashboard />} />
            <Route path="/pm/batches" element={<PMDashboard />} />
            <Route path="/pm/students" element={<PMDashboard />} />
            <Route path="/pm/supervisors" element={<PMDashboard />} />
            <Route path="/pm/allocation" element={<PMDashboard />} />
            <Route path="/pm/reports" element={<PMDashboard />} />
            <Route path="/pm/*" element={<Navigate to="/pm/dashboard" replace />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRole="Admin" />}>
          <Route element={<DashboardLayout links={adminLinks} title="Admin Portal" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminDashboard />} />
            <Route path="/admin/roles" element={<AdminDashboard />} />
            <Route path="/admin/settings" element={<AdminDashboard />} />
            <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;