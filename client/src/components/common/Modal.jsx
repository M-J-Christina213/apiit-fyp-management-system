import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, subtitle, icon: Icon, children, footer, iconBgColor = 'bg-blue-50', iconTextColor = 'text-blue-700' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`p-2 rounded-lg ${iconBgColor} ${iconTextColor}`}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-800">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
