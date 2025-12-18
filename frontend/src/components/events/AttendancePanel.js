import React, { useEffect, useState, useCallback } from 'react';
import KioskMode from './KioskMode';
import { getAttendance, checkInParticipant, markAttendance, patchAttendance } from '../../services/eventService';
import AuditModal from './AuditModal';
import BulkActionsBar from './BulkActionsBar';

export default function AttendancePanel({ eventUid }) {
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditParticipant, setAuditParticipant] = useState(null);
  const [checkinWindowMins, setCheckinWindowMins] = useState(15);
  const [graceMins, setGraceMins] = useState(10);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAttendance(eventUid);
      if (!res || !res.success) throw new Error(res?.message || 'Failed to load');
      setParticipants(res.data.participants || []);
      if (res.data) {
        setCheckinWindowMins(res.data.checkin_window_mins ?? 15);
        setGraceMins(res.data.attendance_grace_mins ?? 10);
      }
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, [eventUid]);

  useEffect(() => {
    // Debug: ensure component effect runs
    // console.debug('AttendancePanel effect for event', eventUid);
    load();
  }, [load]);

  const [kioskOpen, setKioskOpen] = useState(false);

  function toggleSelect(participantId) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(participantId)) s.delete(participantId); else s.add(participantId);
      return s;
    });
  }

  function selectAll() {
    setSelected(new Set(participants.map((p) => p.participant_id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function bulkUpdate(newStatus) {
    try {
      if (!selected.size) return;
      const participantIds = Array.from(selected).map((id) => id);
      // For marking present we need to call markAttendance which accepts user IDs
      if (newStatus === 'present') {
        const userIds = participantIds.map((pid) => participants.find((p) => p.participant_id === pid)?.user_id).filter(Boolean);
        if (userIds.length) await markAttendance(eventUid, userIds);
      } else {
        // patchAttendance uses participant_id
        await Promise.all(participantIds.map((pid) => patchAttendance(eventUid, pid, newStatus === 'late' ? 'late' : 'absent', 'Bulk update')));
      }
      clearSelection();
      await load();
    } catch (e) {
      setError(e.message || 'Bulk update failed');
    }
  }

  async function singleCheckIn(participantId) {
    try {
      const res = await checkInParticipant(eventUid, participantId);
      if (!res || !res.success) throw new Error(res?.message || 'Check-in failed');
      await load();
    } catch (e) {
      setError(e.message || 'Check-in error');
    }
  }

  return (
    <div className="attendance-panel">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Attendance</h3>
        <div className="flex gap-2">
          <div className="text-sm text-gray-500">Check-in opens {checkinWindowMins} minutes before the scheduled start. Grace period: {graceMins} minutes.</div>
          <button className="btn btn-outline btn-sm" onClick={selectAll}>Select all</button>
          <button className="btn btn-ghost btn-sm" onClick={clearSelection}>Clear</button>
        </div>
      </div>

      <BulkActionsBar
        selectedCount={selected.size}
        onMarkPresent={() => bulkUpdate('present')}
        onMarkLate={() => bulkUpdate('late')}
        onMarkAbsent={() => bulkUpdate('absent')}
        onClear={clearSelection}
      />

      {loading && <div>Loading attendance…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && participants.length === 0 && <div>No participants</div>}

      {!loading && participants.length > 0 && (
        <ul className="divide-y">
          {participants.map((p) => (
            <li key={p.participant_id} className="flex items-center justify-between py-2 px-2">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selected.has(p.participant_id)} onChange={() => toggleSelect(p.participant_id)} />
                <div>
                  <div className="font-medium">{p.name || p.email}</div>
                  <div className="text-sm text-gray-500">Status: {p.attendance_status || 'unknown'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="btn btn-sm" onClick={() => singleCheckIn(p.participant_id)}>Mark present</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setAuditParticipant(p.participant_id); setAuditOpen(true); }}>Audit</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AuditModal open={auditOpen} onClose={() => setAuditOpen(false)} eventUid={eventUid} participantId={auditParticipant} />
      <KioskMode open={kioskOpen} onClose={() => setKioskOpen(false)} eventUid={eventUid} onSuccess={() => { setKioskOpen(false); load(); }} />
    </div>
  );
}
