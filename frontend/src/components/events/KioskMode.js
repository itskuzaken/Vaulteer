import React, { useState } from 'react';
import Modal from '@/components/modals/ModalShell';
import { checkInParticipant } from '@/services/eventService';

export default function KioskMode({ open, onClose, eventUid, onSuccess }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCheckIn() {
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      // Query might be participant id or user uid/email - try participant id first
      let participantId = parseInt(query, 10);
      if (Number.isNaN(participantId)) participantId = null;

      const res = await checkInParticipant(eventUid, participantId || query);
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