import React from 'react';

const DashboardCard = ({ title, value, icon: Icon, subtitle }) => {
  return (
    <div className="bg-white p-5 rounded border border-slate-200 shadow-sm flex items-start justify-between select-none">
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      <div className="p-2.5 bg-navy-50 text-navy-900 rounded border border-navy-100 flex items-center justify-center">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
};

export default DashboardCard;
