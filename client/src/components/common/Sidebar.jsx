import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, GraduationCap } from 'lucide-react';
import { setLoggedInUser } from '../../../../server/data/mockData';

const Sidebar = ({ links, closeSidebar }) => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    if (closeSidebar) closeSidebar();
    setLoggedInUser(null);
    navigate('/');
  };

  return (
    <aside className="w-64 bg-navy-900 text-slate-300 h-screen sticky top-0 flex flex-col border-r border-navy-950 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 bg-navy-950 border-b border-navy-800">
        <div className="p-1 rounded bg-navy-800">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-lg font-bold text-white tracking-tight">APIIT FYPMS</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
        {links.map((link, idx) => (
          <NavLink
            key={idx}
            to={link.path}
            onClick={() => closeSidebar && closeSidebar()}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded transition-all text-sm font-medium border ${isActive
                ? 'bg-navy-850 text-white border-navy-700 shadow-sm'
                : 'border-transparent hover:bg-navy-800 hover:text-white'
              }`
            }
          >
            <link.icon className="h-5 w-5 text-slate-400 group-hover:text-white" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout footer */}
      <div className="p-4 border-t border-navy-800 bg-navy-950">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium text-slate-400 hover:bg-navy-800 hover:text-white border border-transparent transition-colors text-left"
        >
          <LogOut className="h-5 w-5 text-slate-400" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
