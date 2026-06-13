import React, { useState } from 'react';
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

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 font-sans selection:bg-blue-200">
      
      {/* Left Side - Branding & Info */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop")' }}
        />
        {/* Gradient Overlay for modern enterprise look */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/95 via-blue-900/90 to-slate-900/95 mix-blend-multiply" />
        
        {/* Abstract decorative shapes */}
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-cyan-500/20 blur-[120px]" />

        <div className="relative z-10 flex flex-col justify-between w-full h-full p-16 xl:p-24 text-white">
          {/* Header Branding */}
          <div className="space-y-4 animate-[fadeIn_1s_ease-out]">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                <GraduationCap className="h-7 w-7 text-blue-200" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">APIIT Sri Lanka</h2>
                <p className="text-sm text-blue-200 font-medium tracking-wide">In collaboration with Staffordshire University UK</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8 animate-[slideUp_1s_ease-out]">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Final Year Project <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  Management System
                </span>
              </h1>
              <p className="text-lg text-blue-100/80 max-w-xl leading-relaxed">
                Streamline your academic journey. An enterprise-grade platform designed to manage, track, and evaluate final year projects with unprecedented efficiency.
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-6 pt-8 border-t border-white/10">
              {[
                { icon: LayoutDashboard, title: "Centralized Dashboard", desc: "Track project milestones, submissions, and feedback in one place." },
                { icon: Users, title: "Seamless Collaboration", desc: "Connect effortlessly with supervisors, students, and coordinators." },
                { icon: ShieldCheck, title: "Enterprise Security", desc: "Bank-grade security compliant with university data protection policies." }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-4 group transition-all duration-300 hover:translate-x-2">
                  <div className="mt-1 p-2 rounded-lg bg-blue-500/10 border border-blue-400/20 text-blue-300 group-hover:bg-blue-500/20 group-hover:text-blue-200 transition-colors">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-blue-100 transition-colors">{feature.title}</h3>
                    <p className="text-sm text-blue-200/70 mt-1">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-blue-200/50 flex justify-between items-center">
            <p>© {new Date().getFullYear()} APIIT Sri Lanka. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
        {/* Subtle ambient light for right side */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[100px] opacity-60 pointer-events-none" />
        
        <div className="w-full max-w-md space-y-10 relative z-10">
          
          {/* Mobile Header Branding (visible only on small screens) */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">APIIT FYPMS</h2>
              <p className="text-xs text-slate-500 font-medium">Staffordshire University Partner</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-slate-500">Please enter your university credentials to sign in.</p>
          </div>

          {/* Microsoft SSO Button */}
          <button 
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98]"
          >
            {/* Microsoft Logo SVG */}
            <svg viewBox="0 0 21 21" className="w-5 h-5">
              <path fill="#f25022" d="M1 1h9v9H1z" />
              <path fill="#00a4ef" d="M1 11h9v9H1z" />
              <path fill="#7fba00" d="M11 1h9v9h-9z" />
              <path fill="#ffb900" d="M11 11h9v9h-9z" />
            </svg>
            Continue with Microsoft
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-400 text-xs uppercase font-semibold tracking-wider">
                Or sign in with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">University Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input 
                    type="email" 
                    required
                    placeholder="cb000000@apiit.lk"
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all sm:text-sm shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    Forgot password?
                  </a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    placeholder="••••••••"
                    className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all sm:text-sm shadow-sm"
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
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group overflow-hidden relative"
            >
              {/* Button inner gleam effect */}
              <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-[gleam_1.5s_ease-in-out_infinite]" />
              
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Demo Account Box - Glassmorphism */}
          <div className="mt-8 p-4 rounded-xl bg-blue-50/50 border border-blue-100/50 shadow-inner backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-blue-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-blue-900">Demo Access</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-800/80">
                  <div className="flex flex-col">
                    <span className="font-medium text-blue-900">Student:</span>
                    <span>student@apiit.lk</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-blue-900">Supervisor:</span>
                    <span>supervisor@apiit.lk</span>
                  </div>
                </div>
                <p className="text-xs text-blue-800/60 pt-2 border-t border-blue-200/50 mt-2">Password for all demo accounts: <strong>demo123</strong></p>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* CSS logic for custom animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gleam {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
};

export default Login;
