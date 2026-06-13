import React from 'react';

const DataTable = ({ columns, data, keyField = 'id' }) => {
  return (
    <div className="overflow-x-auto bg-white rounded border border-slate-200 shadow-sm">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b border-slate-200 font-bold select-none">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} scope="col" className="px-6 py-3.5 border-r border-slate-200 last:border-r-0">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-slate-700">
          {data && data.length > 0 ? (
            data.map((row, rIdx) => (
              <tr 
                key={row[keyField] || rIdx} 
                className="hover:bg-slate-50 transition-colors"
              >
                {columns.map((col, cIdx) => (
                  <td 
                    key={cIdx} 
                    className="px-6 py-3.5 border-r border-slate-200 last:border-r-0 text-xs md:text-sm whitespace-nowrap"
                  >
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 font-medium bg-white">
                No records found in database
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
