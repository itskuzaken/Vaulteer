import React, { useEffect, useState } from 'react';
import Modal from '@/components/modals/ModalShell';
import { getAttendanceAudit } from '@/services/eventService';

export default function AuditModal({ open, onClose, eventUid, participantId }) {
  const isOpen = !!open;
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !participantId) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getAttendanceAudit(eventUid, { participantId, limit: 200 });
        if (!mounted) return;
        if (!res || !res.success) throw new Error(res?.message || 'Failed to load audit');
        setEntries(res.data || []);
      } catch (e) {
        setError(e.message || 'Failed to load audit');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [open, participantId, eventUid]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Attendance Audit">
      <div className="p-4">
        {loading && <div>Loading…</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && entries.length === 0 && <div>No audit entries</div>}
        {!loading && entries.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-auto">
            {entries.map((e) => (
              <div key={e.id} className="border p-2 rounded bg-white dark:bg-gray-800">
                <div className="text-sm text-gray-500">{new Date(e.performed_at).toLocaleString()}</div>
                <div className="font-medium">Action: {e.action}</div>
                <div className="text-sm">From: {e.previous_status || '—'} → To: {e.new_status || '—'}</div>
                {e.reason && <div className="text-sm mt-1">Reason: {e.reason}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}