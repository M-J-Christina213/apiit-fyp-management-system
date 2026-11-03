import React from 'react';

const DashboardCard = ({ title, value, icon: Icon, subtitle }) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow duration-150 flex items-start justify-between select-none">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="p-2.5 bg-navy-50 text-navy-900 rounded-xl border border-navy-100/80 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
};

export default DashboardCard;

