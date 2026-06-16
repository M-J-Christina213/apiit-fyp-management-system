import React, { useState } from 'react';
import { Search, Bell, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLoggedInUser, setLoggedInUser } from '../../utils/auth';

const Header = ({ title, onMenuToggle }) => {
  const user =
    getLoggedInUser() || {
      name: 'Guest User',
      role: 'Guest',
      email: 'guest@apiit.lk'
    };

  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSignOut = () => {
    setLoggedInUser(null);
    navigate('/');
  };

  const mockNotifications = [
    {
      id: 1,
      text: 'New proposal submission draft by Jane Roe',
      time: '2 hours ago'
    },
    {
      id: 2,
      text: 'Dr. Kalasuriya approved ML topic proposal',
      time: '1 day ago'
    },
    {
      id: 3,
      text: 'Reminder: Batch 2024-Feb report due next week',
      time: '3 days ago'
    }
  ];

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
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-slate-500 hover:text-navy-900 transition-colors p-1"
          >
            <Bell className="h-5 w-5" />

            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
              3
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded shadow-lg z-50 py-2">
              <div className="px-4 py-2 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wider">
                Notifications
              </div>

              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {mockNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <p className="text-xs text-slate-700 font-medium">
                      {notif.text}
                    </p>

                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {notif.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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