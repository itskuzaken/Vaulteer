import React from 'react';

export default function BulkActionsBar({ selectedCount, onMarkPresent, onMarkAbsent, onMarkLate, onClear }) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-gray-50 dark:bg-gray-900">
      <div className="text-sm">{selectedCount} selected</div>
      <div className="flex gap-2 ml-auto">
        <button className="btn btn-sm" onClick={onMarkPresent}>Mark Present</button>
        <button className="btn btn-sm" onClick={onMarkLate}>Mark Late</button>
        <button className="btn btn-sm" onClick={onMarkAbsent}>Mark Absent</button>
        <button className="btn btn-ghost btn-sm" onClick={onClear}>Clear</button>
      </div>
    </div>
  );
}