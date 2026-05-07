"use client";

import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  mobileLabel?: string; // Custom label for mobile cards
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id: string | number }>({ data, columns, onRowClick }: DataTableProps<T>) {
  // Filter out columns that shouldn't show on mobile
  const mobileColumns = columns.filter(col => col.header !== 'Actions');
  const hasActions = columns.some(col => col.header === 'Actions');

  return (
    <div className="bg-card-bg rounded-xl border border-slate-100 shadow-soft overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              {columns.map((column, index) => (
                <th 
                  key={index} 
                  className={`px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item) => (
              <tr 
                key={item.id} 
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-50/50' : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column, index) => (
                  <td key={index} className={`px-6 py-4 text-sm ${column.className || ''}`}>
                    {typeof column.accessor === 'function' 
                      ? column.accessor(item) 
                      : (item[column.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden px-4 pb-4">
        <div className="space-y-3">
          {data.map((item) => (
            <div 
              key={item.id} 
              className="bg-slate-50 rounded-lg p-4 border border-slate-100"
            >
              {/* Primary info (first column) */}
              <div className="mb-3">
                {typeof columns[0].accessor === 'function' 
                  ? columns[0].accessor(item) 
                  : (item[columns[0].accessor] as React.ReactNode)}
              </div>
              
              {/* Secondary info */}
              <div className="space-y-2">
                {mobileColumns.slice(1).map((column, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <span className="text-xs text-text-muted font-medium">
                      {column.mobileLabel || column.header}:
                    </span>
                    <div className="text-right text-sm text-text-main">
                      {typeof column.accessor === 'function' 
                        ? column.accessor(item) 
                        : (item[column.accessor] as React.ReactNode)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {hasActions && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  {(() => {
                    const actionsColumn = columns[columns.length - 1];
                    return typeof actionsColumn.accessor === 'function' 
                      ? actionsColumn.accessor(item) 
                      : (item[actionsColumn.accessor as keyof T] as React.ReactNode);
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
