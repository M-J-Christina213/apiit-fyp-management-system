import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';
import { setLoggedInUser } from '../../../server/data/mockData';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleDemoClick = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('demo123');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      setIsLoading(false);
      const emailLower = email.toLowerCase();

      let userObj = null;
      let targetPath = '';

      if (emailLower.includes('admin')) {
        userObj = { name: 'Admin User', role: 'Admin', email: 'admin@apiit.lk' };
        targetPath = '/admin/dashboard';
      } else if (emailLower.includes('pm') || emailLower.includes('manager')) {
        userObj = { name: 'PM Manager', role: 'Project Manager', email: 'pm@apiit.lk' };
        targetPath = '/pm/dashboard';
      } else if (emailLower.includes('supervisor')) {
        userObj = { name: 'Dr. Alan Smith', role: 'Supervisor', email: 'supervisor@apiit.lk' };
        targetPath = '/supervisor/dashboard';
      } else if (emailLower.includes('student') || emailLower.includes('cb')) {
        userObj = { name: 'John Doe', role: 'Student', email: 'student@apiit.lk' };
        targetPath = '/student/dashboard';
      } else {
        // Fallback for user ease
        userObj = { name: 'John Doe', role: 'Student', email: emailLower };
        targetPath = '/student/dashboard';
      }

      setLoggedInUser(userObj);
      navigate(targetPath);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 font-sans selection:bg-navy-200">

      {/* Left Side - Branding & Info (Solid Navy Blue, clean university branding) */}
      <div className="hidden lg:flex w-1/2 relative bg-navy-900 overflow-hidden border-r border-navy-950">

        {/* Background Image with dimming opacity */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 mix-blend-overlay"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop")' }}
        />

        <div className="relative z-10 flex flex-col justify-between w-full h-full p-16 xl:p-24 text-white">
          {/* Header Branding */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded bg-navy-800 flex items-center justify-center border border-navy-700 shadow-sm">
                <GraduationCap className="h-7 w-7 text-navy-200" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">APIIT Sri Lanka</h2>
                <p className="text-sm text-navy-200 font-medium tracking-wide">Staffordshire University UK Partner</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-white leading-tight">
                Final Year Project <br />
                <span className="text-navy-300">Management System</span>
              </h1>
              <p className="text-base text-slate-300 max-w-xl leading-relaxed">
                A secure, centralized portal designed to streamline academic milestone tracking, proposal evaluations, batches allocation, and student-supervisor interactions.
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-6 pt-8 border-t border-navy-800">
              {[
                { icon: LayoutDashboard, title: "Role-Based Dashboards", desc: "Custom workspaces optimized for Students, Supervisors, Coordinators, and Administrators." },
                { icon: Users, title: "Supervisor Allocations", desc: "Track availability, research interests, and coordinate project slots." },
                { icon: ShieldCheck, title: "Milestone Tracking", desc: "Coordinate proposals, feedback, and student progression status in real-time." }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="mt-1 p-2 rounded bg-navy-800 border border-navy-700 text-navy-300">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{feature.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-slate-400 flex justify-between items-center">
            <p>© {new Date().getFullYear()} APIIT Sri Lanka. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Portal Help</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form (Crisp, clean, professional) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
        <div className="w-full max-w-md space-y-8">

          {/* Mobile Header Branding */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded bg-navy-900 flex items-center justify-center shadow">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">APIIT FYPMS</h2>
              <p className="text-xs text-slate-500 font-medium">University Portal</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">University Login</h2>
            <p className="text-slate-500">Sign in with your registered credentials to access your dashboard.</p>
          </div>

          {/* Microsoft Login - University Portal Theme */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-navy-800 transition-colors"
          >
            <svg viewBox="0 0 21 21" className="w-5 h-5">
              <path fill="#f25022" d="M1 1h9v9H1z" />
              <path fill="#00a4ef" d="M1 11h9v9H1z" />
              <path fill="#7fba00" d="M11 1h9v9h-9z" />
              <path fill="#ffb900" d="M11 11h9v9h-9z" />
            </svg>
            Continue with University Email
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-400 text-xs uppercase font-bold tracking-wider">
                Or enter login details
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@apiit.lk"
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900 transition-all sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Password</label>
                  <a href="#" className="text-sm font-semibold text-navy-800 hover:text-navy-950 transition-colors">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900 transition-all sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3 px-4 rounded text-sm font-semibold text-white bg-navy-900 hover:bg-navy-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-800 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign in to FYPMS
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Box (Flat styling, no glassmorphism, no gradients) */}
          <div className="p-5 rounded border border-slate-200 bg-slate-50">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-navy-800">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="space-y-2.5 w-full">
                <h4 className="text-sm font-bold text-navy-900">Demo Credentials</h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => handleDemoClick('student@apiit.lk')}
                    className="flex flex-col items-start p-2 border border-slate-200 bg-white hover:border-navy-400 text-left rounded transition-colors"
                  >
                    <span className="font-bold text-slate-800">Student Portal</span>
                    <span className="text-slate-500 font-mono text-[10px]">student@apiit.lk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoClick('supervisor@apiit.lk')}
                    className="flex flex-col items-start p-2 border border-slate-200 bg-white hover:border-navy-400 text-left rounded transition-colors"
                  >
                    <span className="font-bold text-slate-800">Supervisor Portal</span>
                    <span className="text-slate-500 font-mono text-[10px]">supervisor@apiit.lk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoClick('pm@apiit.lk')}
                    className="flex flex-col items-start p-2 border border-slate-200 bg-white hover:border-navy-400 text-left rounded transition-colors"
                  >
                    <span className="font-bold text-slate-800">Project Manager</span>
                    <span className="text-slate-500 font-mono text-[10px]">pm@apiit.lk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoClick('admin@apiit.lk')}
                    className="flex flex-col items-start p-2 border border-slate-200 bg-white hover:border-navy-400 text-left rounded transition-colors"
                  >
                    <span className="font-bold text-slate-800">Admin Control</span>
                    <span className="text-slate-500 font-mono text-[10px]">admin@apiit.lk</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 border-t border-slate-200 pt-2 flex justify-between">
                  <span>Pass: <strong className="font-semibold text-slate-700">demo123</strong></span>
                  <span className="text-slate-400">Click a portal to pre-fill</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Login;
