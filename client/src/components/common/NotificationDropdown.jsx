import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash } from 'lucide-react';
import { getLoggedInUser } from '../../utils/auth';

const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return 'Just now';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  
  const user = getLoggedInUser();
  const userId = user?.id;

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/notifications/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (userId) {
      setLoading(true);
      fetchNotifications().finally(() => setLoading(false));
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://localhost:5000/api/notifications/read/${id}`, {
        method: 'PUT'
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/notifications/read-all/${userId}`, {
        method: 'PUT'
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://localhost:5000/api/notifications/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-slate-500 hover:text-navy-950 transition-colors p-1.5 rounded-full hover:bg-slate-100 focus:outline-none"
        title="Notifications"
      >
        <Bell className="h-5 w-5 text-slate-500 hover:text-navy-900" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden transform origin-top-right transition-all">
          {/* Header */}
          <div className="px-4 py-3 bg-[#0C2340] text-white flex items-center justify-between border-b border-navy-950">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-slate-300 hover:text-white transition-colors flex items-center gap-1 font-medium"
              >
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {loading ? (
              <div className="py-8 flex items-center justify-center text-slate-400 text-xs">
                <div className="h-4 w-4 border-2 border-navy-800 border-t-transparent rounded-full animate-spin mr-2" />
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-slate-400 text-center px-4">
                <Bell className="h-7 w-7 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">All caught up!</p>
                <p className="text-[10px] text-slate-400 mt-1">No notifications found.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 flex items-start gap-2.5 transition-colors hover:bg-slate-50/80 ${
                    !notif.is_read ? 'bg-blue-50/30 border-l-2 border-navy-800' : 'border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className={`text-[11px] sm:text-xs font-bold leading-tight ${!notif.is_read ? 'text-navy-950 font-bold' : 'text-slate-700'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[9px] text-slate-400 whitespace-nowrap">
                        {getRelativeTime(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-normal">{notif.message}</p>
                    <div className="flex items-center gap-3 pt-1">
                      {!notif.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="text-[9px] text-navy-800 hover:text-navy-950 font-bold transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(notif.id, e)}
                        className="text-[9px] text-slate-400 hover:text-red-600 transition-colors flex items-center gap-0.5 font-medium"
                      >
                        <Trash className="h-2.5 w-2.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
