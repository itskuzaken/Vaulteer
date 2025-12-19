"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  IoCheckmarkCircleOutline, 
  IoTimeOutline, 
  IoCloseCircleOutline, 
  IoQrCodeOutline, 
  IoListOutline, 
  IoSearchOutline,
  IoInformationCircleOutline,
  IoStatsChartOutline,
  IoPeopleOutline
} from 'react-icons/io5';
import Button from '@/components/ui/Button';
import Modal from '@/components/modals/ModalShell';
import { useNotify } from '@/components/ui/NotificationProvider';
import { getAttendance, checkInParticipant, patchAttendance } from '@/services/eventService';
import AuditModal from './AuditModal';
import KioskMode from './KioskMode';

const StatusBadge = ({ status }) => {
  const styles = {
    present: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    late: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    registered: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
    unknown: "bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-500 border-gray-200 dark:border-gray-800"
  };
  const normalized = (status || 'unknown').toLowerCase();
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[normalized] || styles.unknown} capitalize`}>{status || 'Unknown'}</span>;
};

export default function AttendancePanel({ eventUid }) {
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditParticipant, setAuditParticipant] = useState(null);
  const [kioskOpen, setKioskOpen] = useState(false);
  const [attendanceEnabled, setAttendanceEnabled] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinProcessing, setCheckinProcessing] = useState(false);
  const [checkinWindowMins, setCheckinWindowMins] = useState(15);
  const [graceMins, setGraceMins] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAttendance(eventUid);
      if (!res || !res.success) throw new Error(res?.message || 'Failed to load');
      setParticipants(res.data.participants || []);
      if (res.data) {
        setCheckinWindowMins(res.data.checkin_window_mins ?? 15);
        setGraceMins(res.data.attendance_grace_mins ?? 10);
        setAttendanceEnabled(Boolean(res.data.attendance_enabled));
      }
    } catch (e) {
      notify?.push("Failed to load list", "error");
    } finally {
      setLoading(false);
    }
  }, [eventUid, notify]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (participantId) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(participantId)) s.delete(participantId); else s.add(participantId);
      return s;
    });
  };

  const filteredParticipants = useMemo(() => {
    if (!searchQuery) return participants;
    const lower = searchQuery.toLowerCase();
    return participants.filter(p => (p.name && p.name.toLowerCase().includes(lower)) || (p.email && p.email.toLowerCase().includes(lower)));
  }, [participants, searchQuery]);

  const selectAll = () => {
    if (selected.size === filteredParticipants.length) setSelected(new Set());
    else setSelected(new Set(filteredParticipants.map((p) => p.participant_id)));
  };

  const clearSelection = () => setSelected(new Set());

  // Check-in flow: open modal, confirm, call checkInParticipant for each selected user that is not already present
  const openCheckinModal = () => setShowCheckinModal(true);
  const closeCheckinModal = () => setShowCheckinModal(false);

  const confirmCheckIn = async () => {
    if (!selected.size) return;
    setCheckinProcessing(true);
    const selectedIds = Array.from(selected);
    // Only attempt to check-in users who are not already present
    const toProcess = selectedIds.filter(id => {
      const p = participants.find(x => x.participant_id === id);
      return p && p.attendance_status !== 'present';
    });

    const previousParticipants = [...participants];
    const successes = [];
    const failures = [];

    try {
      const results = await Promise.allSettled(toProcess.map(pid => checkInParticipant(eventUid, pid)));
      results.forEach((r, idx) => {
        const pid = toProcess[idx];
        if (r.status === 'fulfilled') {
          const res = r.value;
          if (res && res.success && res.data) {
            // Update the participant in-place
            setParticipants(prev => prev.map(p => p.participant_id === pid ? { ...p, ...res.data } : p));
            successes.push(pid);
          } else {
            failures.push({ pid, error: r.value && r.value.error ? r.value.error : 'Unknown error' });
          }
        } else {
          failures.push({ pid, error: r.reason?.message || String(r.reason) });
        }
      });

      // Clear selection for successful ones
      if (successes.length) {
        setSelected(prev => {
          const s = new Set(prev);
          successes.forEach(id => s.delete(id));
          return s;
        });
        notify?.push(`Checked in ${successes.length} participant${successes.length === 1 ? '' : 's'}`, 'success');
      }

      if (failures.length) {
        notify?.push(`${failures.length} check-in(s) failed`, 'error');
        // revert any optimistic updates by reloading list
        await load();
      }
    } catch (e) {
      console.error('Check-in batch failed', e);
      notify?.push('Check-in failed', 'error');
      setParticipants(previousParticipants);
    } finally {
      setCheckinProcessing(false);
      setShowCheckinModal(false);
    }
  };



  const stats = useMemo(() => {
    const present = participants.filter(p => p.attendance_status === 'present').length;
    return { present, total: participants.length, percent: participants.length ? Math.round((present / participants.length) * 100) : 0 };
  }, [participants]);

  if (loading && participants.length === 0) return <div className="h-64 animate-pulse bg-gray-50 dark:bg-gray-900 rounded-xl" />;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 relative overflow-hidden">
      
      {/* 1. Header */}
      <div className="flex-none p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 z-10">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><IoListOutline /> Attendance</h3>
          <p className="text-xs text-gray-500">{stats.present}/{stats.total} present ({stats.percent}%)</p>
        </div>
        <div className="flex gap-2">
           <Button variant="ghost" size="small" icon={IoStatsChartOutline} onClick={() => setAuditOpen(true)}>History</Button>
           <Button variant="primary" size="small" icon={IoQrCodeOutline} onClick={() => setKioskOpen(true)}>Kiosk</Button>
        </div>
      </div>

      {/* 2. Info Bar */}
      <div className="flex-none bg-blue-50 dark:bg-blue-900/20 px-4 py-2 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-2 text-xs text-blue-800 dark:text-blue-200">
        <IoInformationCircleOutline />
        <span>Check-in window: <strong>{checkinWindowMins}m before start</strong> · Late threshold: <strong>{graceMins}m after start</strong></span>
      </div>

      {/* 3. Search Toolbar (Always Visible) */}
      <div className="flex-none p-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex gap-3">
        <div className="relative flex-1">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <button onClick={selectAll} className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white px-2">
          {selected.size === filteredParticipants.length && filteredParticipants.length > 0 ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* 4. List */}
      <div className="flex-1 overflow-y-auto pb-20"> {/* pb-20 adds space for footer */}
        {filteredParticipants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500"><IoPeopleOutline className="text-3xl mb-2 opacity-30" /><p>No participants</p></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 sticky top-0 z-0">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input type="checkbox" checked={selected.size > 0 && selected.size === filteredParticipants.length} onChange={selectAll} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                </th>
                <th className="p-3">Participant</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredParticipants.map((p) => {
                const isSelected = selected.has(p.participant_id);
                return (
                  <tr key={p.participant_id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.participant_id)} className="rounded border-gray-300 cursor-pointer" />
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{p.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{p.email}</div>
                    </td>
                    <td className="p-3"><StatusBadge status={p.attendance_status} /></td>
                    <td className="p-3 text-right">
                      {/* Intentionally no per-row actions - selection & footer action drive check-ins */}
                      <span className="text-xs text-gray-400">{p.attendance_status === 'present' ? 'Present' : ''}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer-based Check-in action (selection-driven). Visible when there are selected participants. */}
      {selected.size > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-30">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200">
            <div className="flex items-center gap-2 px-2">
              <span className="bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">{selected.size}</span>
              <span className="text-sm font-medium">selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="small" variant="ghost" onClick={clearSelection}>Cancel</Button>
              <Button size="small" variant="primary" onClick={openCheckinModal} disabled={!attendanceEnabled}>
                Check In {`(${selected.size})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AuditModal open={auditOpen} onClose={() => setAuditOpen(false)} eventUid={eventUid} participantId={auditParticipant} />
      <KioskMode open={kioskOpen} onClose={() => setKioskOpen(false)} eventUid={eventUid} onSuccess={() => { notify?.push("Check-in success", "success"); load(); }} />
      {/* Check-in Confirmation Modal */}
      <Modal isOpen={showCheckinModal} onClose={closeCheckinModal} title={`Check In (${selected.size})`} description={`Confirm checking in ${selected.size} participant${selected.size === 1 ? '' : 's'}`} size="sm">
        <div className="p-4">
          <p className="mb-4 text-sm text-gray-600">This will mark selected participants as <strong>Present</strong> if they check in at or before the event start plus <strong>{graceMins} minutes</strong>; otherwise they will be marked <strong>Late</strong>. Participants remain in the list.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeCheckinModal} disabled={checkinProcessing}>Cancel</Button>
            <Button variant="primary" onClick={confirmCheckIn} disabled={checkinProcessing}>{checkinProcessing ? 'Checking in…' : `Confirm (${selected.size})`}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}