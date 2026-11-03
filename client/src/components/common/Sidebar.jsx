import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, GraduationCap } from 'lucide-react';
import { setLoggedInUser } from '../../utils/auth';

const Sidebar = ({ links, closeSidebar }) => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    if (closeSidebar) closeSidebar();

    setLoggedInUser(null);

    navigate("/");
  };

  return (
    <aside className="w-64 bg-navy-950 text-slate-300 h-screen sticky top-0 flex flex-col border-r border-navy-900/80 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 bg-navy-950 border-b border-navy-900/90">
        <div className="p-2 rounded-lg bg-navy-900 border border-navy-800 text-white shadow-2xs">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight leading-tight">APIIT FYPMS</h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">Management Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3.5 space-y-1 overflow-y-auto">
        {links.map((link, idx) => (
          <NavLink
            key={idx}
            to={link.path}
            onClick={() => closeSidebar && closeSidebar()}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950 ${isActive
                ? 'bg-navy-900 text-white border-navy-800 shadow-2xs font-semibold'
                : 'border-transparent text-slate-400 hover:bg-navy-900/70 hover:text-slate-100'
              }`
            }
          >
            <link.icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout footer */}
      <div className="p-3.5 border-t border-navy-900/90 bg-navy-950">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-navy-900 hover:text-slate-200 border border-transparent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
        >
          <LogOut className="h-4 w-4 shrink-0 text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
