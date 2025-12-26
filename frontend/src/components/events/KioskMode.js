import React, { useState } from 'react';
import Modal from '@/components/modals/ModalShell';
import { checkInParticipant, getEventParticipants } from '@/services/eventService';

export default function KioskMode({ open, onClose, eventUid, onSuccess }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCheckIn() {
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      // Try as numeric participant_id first
      let participantId = parseInt(query, 10);
      if (Number.isNaN(participantId)) {
        participantId = null;
      }

      if (participantId === null) {
        // Resolve by email/user_uid/name by fetching event participants
        const pRes = await getEventParticipants(eventUid);
        const participants = (pRes && pRes.data) || pRes || [];
        const q = query.trim().toLowerCase();
        const match = participants.find(p => String(p.participant_id) === query || (p.email && p.email.toLowerCase() === q) || (p.user_uid && p.user_uid.toLowerCase() === q) || (p.name && p.name.toLowerCase() === q));
        if (!match) {
          setError('No participant found for input');
          return;
        }
        participantId = match.participant_id;
      }

      const res = await checkInParticipant(eventUid, participantId);
      if (!res || !res.success) throw new Error(res?.message || 'Check-in failed');
      setQuery('');
      onSuccess && onSuccess(res.data);
    } catch (e) {
      setError(e.message || 'Failed to check-in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={!!open} onClose={onClose} title="Kiosk Mode - Quick Check-in">
      <div className="p-4 space-y-3">
        <div className="text-sm text-gray-600">Scan participant barcode or enter participant ID / email</div>
        <input className="input w-full" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Participant ID or email" />
        {error && <div className="text-red-600">{error}</div>}
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={loading} onClick={handleCheckIn}>{loading ? 'Checking…' : 'Check in'}</button>
          <button className="btn btn-ghost" onClick={() => { setQuery(''); setError(null); }}>Clear</button>
        </div>
      </div>
    </Modal>
  );
}