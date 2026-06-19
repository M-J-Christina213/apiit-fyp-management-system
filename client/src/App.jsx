import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import Login from './pages/Login';
import DashboardLayout from './components/layouts/DashboardLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import PMDashboard from './pages/pm/PMDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

import { getLoggedInUser } from './utils/auth';

import {
  LayoutDashboard,
  Users,
  FileText,
  Bell,
  Settings,
  Layers,
  UserCheck,
  Shield,
  FileCheck
} from 'lucide-react';

/* ===========================
   Sidebar Links
=========================== */

const studentLinks = [
  { path: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/student/supervisors', label: 'Supervisors', icon: Users },
  { path: '/student/proposal', label: 'Proposal Submission', icon: FileText },
  { path: '/student/templates', label: 'Templates', icon: Layers },
  { path: '/student/logsheets', label: 'Logsheets', icon: FileText },
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
  { path: '/pm/assessors', label: 'Assessor Allocation', icon: FileCheck },
  { path: '/pm/reports', label: 'Reports', icon: FileText },
];

const adminLinks = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/roles', label: 'Roles', icon: Shield },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

/* ===========================
   Protected Route
=========================== */

const ProtectedRoute = ({ allowedRole }) => {
  const user = getLoggedInUser();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== allowedRole) {
    switch (user.role) {
      case 'student':
        return <Navigate to="/student/dashboard" replace />;

      case 'supervisor':
        return <Navigate to="/supervisor/dashboard" replace />;

      case 'pm':
        return <Navigate to="/pm/dashboard" replace />;

      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;

      default:
        return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

/* ===========================
   Login Route
=========================== */

const LoginRoute = () => {
  const user = getLoggedInUser();

  if (user) {
    switch (user.role) {
      case 'student':
        return <Navigate to="/student/dashboard" replace />;

      case 'supervisor':
        return <Navigate to="/supervisor/dashboard" replace />;

      case 'pm':
        return <Navigate to="/pm/dashboard" replace />;

      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;

      default:
        break;
    }
  }

  return <Login />;
};

/* ===========================
   App
=========================== */

function App() {
  return (
    <Router>
      <Routes>

        {/* Login */}
        <Route path="/" element={<LoginRoute />} />

        {/* Student */}
        <Route element={<ProtectedRoute allowedRole="student" />}>
          <Route
            element={
              <DashboardLayout
                links={studentLinks}
                title="Student Portal"
              />
            }
          >
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/supervisors" element={<StudentDashboard />} />
            <Route path="/student/proposal" element={<StudentDashboard />} />
            <Route path="/student/templates" element={<StudentDashboard />} />
            <Route path="/student/logsheets" element={<StudentDashboard />} />
            <Route path="/student/notifications" element={<StudentDashboard />} />
            <Route path="/student/*" element={<Navigate to="/student/dashboard" replace />} />
          </Route>
        </Route>

        {/* Supervisor */}
        <Route element={<ProtectedRoute allowedRole="supervisor" />}>
          <Route
            element={
              <DashboardLayout
                links={supervisorLinks}
                title="Supervisor Portal"
              />
            }
          >
            <Route path="/supervisor/dashboard" element={<SupervisorDashboard />} />
            <Route path="/supervisor/requests" element={<SupervisorDashboard />} />
            <Route path="/supervisor/students" element={<SupervisorDashboard />} />
            <Route path="/supervisor/profile" element={<SupervisorDashboard />} />
            <Route path="/supervisor/notifications" element={<SupervisorDashboard />} />
            <Route path="/supervisor/*" element={<Navigate to="/supervisor/dashboard" replace />} />
          </Route>
        </Route>

        {/* Project Manager */}
        <Route element={<ProtectedRoute allowedRole="pm" />}>
          <Route
            element={
              <DashboardLayout
                links={pmLinks}
                title="Project Manager Portal"
              />
            }
          >
            <Route path="/pm/dashboard" element={<PMDashboard />} />
            <Route path="/pm/batches" element={<PMDashboard />} />
            <Route path="/pm/students" element={<PMDashboard />} />
            <Route path="/pm/supervisors" element={<PMDashboard />} />
            <Route path="/pm/allocation" element={<PMDashboard />} />
            <Route path="/pm/assessors" element={<PMDashboard />} />
            <Route path="/pm/reports" element={<PMDashboard />} />
            <Route path="/pm/*" element={<Navigate to="/pm/dashboard" replace />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute allowedRole="admin" />}>
          <Route
            element={
              <DashboardLayout
                links={adminLinks}
                title="Admin Portal"
              />
            }
          >
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