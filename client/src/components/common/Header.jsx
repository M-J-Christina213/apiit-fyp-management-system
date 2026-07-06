import React, { useState } from 'react';
import { Search, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLoggedInUser, setLoggedInUser } from '../../utils/auth';
import NotificationDropdown from './NotificationDropdown';

const Header = ({ title, onMenuToggle }) => {
  const user =
    getLoggedInUser() || {
      name: 'Guest User',
      role: 'Guest',
      email: 'guest@apiit.lk'
    };

  const navigate = useNavigate();

  const handleSignOut = () => {
    setLoggedInUser(null);
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-[#0C2340] select-none whitespace-nowrap">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            placeholder="Search portal..."
            className="pl-10 pr-4 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-navy-900 focus:ring-1 focus:ring-navy-900 w-64 transition-colors"
          />
        </div>

        {/* Notifications */}
        <NotificationDropdown />

        {/* User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 pl-4 sm:pl-6">
          <div className="h-8 w-8 sm:h-9 sm:w-9 bg-navy-100 text-navy-900 border border-navy-200 rounded-full flex items-center justify-center font-bold text-sm select-none">
            {user?.name?.charAt(0) || 'G'}
          </div>

          <div className="hidden sm:block text-xs sm:text-sm">
            <p className="font-semibold text-slate-800 leading-tight">
              {user?.name}
            </p>

            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
              {user?.role}
            </p>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded hover:bg-slate-50"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;