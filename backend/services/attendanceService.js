const eventRepository = require('../repositories/eventRepository');

class AttendanceService {
  async checkIn({ eventUid, participantId, performedBy }) {
    const role = (performedBy?.role || '').toLowerCase();
    if (role !== 'staff' && role !== 'admin') {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }

    // Delegate to repository which enforces event state and transactional updates
    return eventRepository.checkInParticipant(eventUid, participantId, performedBy.user_id);
  }

  async patchAttendance({ eventUid, participantId, newStatus, performedBy, reason = null }) {
    const role = (performedBy?.role || '').toLowerCase();
    if (role !== 'staff' && role !== 'admin') {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }

    // Additional business logic (e.g. requiring override reason if event ended) can be added here
    return eventRepository.patchAttendance(eventUid, participantId, newStatus, performedBy.user_id, reason);
  }

  async autoFlagAbsences(eventUid) {
    return eventRepository.autoFlagAbsences(eventUid);
  }
}

module.exports = new AttendanceService();
