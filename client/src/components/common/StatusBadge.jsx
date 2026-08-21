import React from 'react';

const StatusBadge = ({ status, type = 'default' }) => {
  let colors = "bg-slate-50 text-slate-700 border-slate-200";

  if (type === 'stage') {
    switch (status) {
      case 'Proposal': colors = "bg-blue-50 text-blue-700 border-blue-200"; break;
      case 'Midpoint': colors = "bg-orange-50 text-orange-700 border-orange-200"; break;
      case 'Final': colors = "bg-purple-50 text-purple-700 border-purple-200"; break;
      case 'Completed': colors = "bg-green-50 text-green-700 border-green-200"; break;
      default: break;
    }
  } else if (type === 'progress') {
    switch (status) {
      case 'Pending': colors = "bg-amber-50 text-amber-700 border-amber-200"; break;
      case 'In Progress': colors = "bg-blue-50 text-blue-700 border-blue-200"; break;
      case 'Completed': colors = "bg-emerald-50 text-emerald-700 border-emerald-200"; break;
      case 'Approved': colors = "bg-green-50 text-green-700 border-green-200"; break;
      case 'Rejected': colors = "bg-red-50 text-red-700 border-red-200"; break;
      default: break;
    }
  }

  return (
    <span className={`px-2.5 py-1 text-xs rounded-full border font-bold ${colors}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
