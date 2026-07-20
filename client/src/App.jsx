import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import Login from './pages/auth/Login.jsx';
import DashboardLayout from './components/layouts/DashboardLayout.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard.jsx';
import PMDashboard from './pages/pm/PMDashboard.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AssessorDashboard from './pages/assessor/AssessorDashboard.jsx';
import ExternalSupervisorRegister from './pages/auth/ExternalSupervisorRegister.jsx';
import AzureCallback from './pages/auth/AzureCallback.jsx';

import VivaAdminDashboard from './pages/viva/admin/VivaAdminDashboard.jsx';
import SupervisorVivaDashboard from './pages/viva/supervisor/SupervisorVivaDashboard.jsx';
import AssessorVivaDashboard from './pages/viva/assessor/AssessorVivaDashboard.jsx';
import StudentVivaDashboard from './pages/viva/student/StudentVivaDashboard.jsx';
import PMVivaDashboard from './pages/viva/pm/PMVivaDashboard.jsx';

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
  FileCheck,
  CalendarDays
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
  { path: '/student/viva', label: 'Viva Schedule', icon: CalendarDays },
  { path: '/student/notifications', label: 'Notifications', icon: Bell },
];

const supervisorLinks = [
  { path: '/supervisor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/supervisor/requests', label: 'Proposal Requests', icon: FileText },
  { path: '/supervisor/students', label: 'My Students', icon: Users },
  { path: '/supervisor/logsheets', label: 'Logsheets', icon: FileText },
  { path: '/supervisor/viva', label: 'Viva Schedule', icon: CalendarDays },
  { path: '/supervisor/profile', label: 'Profile', icon: Settings },
  { path: '/supervisor/notifications', label: 'Notifications', icon: Bell },
];

const assessorLinks = [
  { path: '/assessor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/assessor/viva', label: 'Viva Schedule', icon: CalendarDays },
  { path: '/assessor/notifications', label: 'Notifications', icon: Bell },
];

const pmLinks = [
  { path: '/pm/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pm/batches', label: 'Batches', icon: Layers },
  { path: '/pm/students', label: 'Students', icon: Users },
  { path: '/pm/supervisors', label: 'Supervisors', icon: UserCheck },
  { path: '/pm/allocation', label: 'Supervisor Allocation', icon: Shield },
  { path: '/pm/assessors', label: 'Assessor Allocation', icon: FileCheck },
  { path: '/pm/templates', label: 'Templates', icon: Layers },
  { path: '/pm/reports', label: 'Reports', icon: FileText },
  { path: '/pm/viva', label: 'Viva Schedules', icon: CalendarDays },
];

const adminLinks = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/external-supervisor-requests', label: 'External Supervisor Requests', icon: UserCheck },
  { path: '/admin/roles', label: 'Roles', icon: Shield },
  { path: '/admin/viva', label: 'Viva Management', icon: CalendarDays },
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

  // Normalize user role to lowercase to handle database inconsistencies (e.g., 'Student' vs 'student')
  const normalizedUserRole = user.role.toLowerCase();
  
  // External supervisors use the supervisor dashboard layout
  const effectiveRole = normalizedUserRole === 'external_supervisor' ? 'supervisor' : normalizedUserRole;

  if (effectiveRole !== allowedRole.toLowerCase()) {
    switch (effectiveRole) {
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      case 'supervisor':
        return <Navigate to="/supervisor/dashboard" replace />;
      case 'assessor':
        return <Navigate to="/assessor/dashboard" replace />;
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
    const effectiveRole = user.role.toLowerCase() === 'external_supervisor' ? 'supervisor' : user.role.toLowerCase();
    
    switch (effectiveRole) {
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      case 'supervisor':
        return <Navigate to="/supervisor/dashboard" replace />;
      case 'assessor':
        return <Navigate to="/assessor/dashboard" replace />;
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
        <Route path="/azure-callback" element={<AzureCallback />} />

        <Route
          path="/external-supervisor/register"
          element={<ExternalSupervisorRegister />}
        />

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
            <Route path="/student/proposal/new" element={<StudentDashboard />} />
            <Route path="/student/templates" element={<StudentDashboard />} />
            <Route path="/student/logsheets" element={<StudentDashboard />} />
            <Route path="/student/viva" element={<StudentVivaDashboard />} />
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
            <Route path="/supervisor/logsheets" element={<SupervisorDashboard />} />
            <Route path="/supervisor/viva" element={<SupervisorVivaDashboard />} />
            <Route path="/supervisor/profile" element={<SupervisorDashboard />} />
            <Route path="/supervisor/notifications" element={<SupervisorDashboard />} />
            <Route path="/supervisor/*" element={<Navigate to="/supervisor/dashboard" replace />} />
          </Route>
        </Route>

        {/* Assessor */}
        <Route element={<ProtectedRoute allowedRole="assessor" />}>
          <Route
            element={
              <DashboardLayout
                links={assessorLinks}
                title="Assessor Portal"
              />
            }
          >
            <Route path="/assessor/dashboard" element={<AssessorDashboard />} />
            <Route path="/assessor/viva" element={<AssessorVivaDashboard />} />
            <Route path="/assessor/*" element={<Navigate to="/assessor/dashboard" replace />} />
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
            <Route path="/pm/templates" element={<PMDashboard />} />
            <Route path="/pm/reports" element={<PMDashboard />} />
            <Route path="/pm/viva" element={<PMVivaDashboard />} />
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
            <Route
              path="/admin/external-supervisor-requests"
              element={<AdminDashboard />}
            />
            <Route path="/admin/viva" element={<VivaAdminDashboard />} />
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