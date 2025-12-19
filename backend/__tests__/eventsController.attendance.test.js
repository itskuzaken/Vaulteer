const eventsController = require('../controllers/eventsController');
const eventRepository = require('../repositories/eventRepository');
const attendanceService = require('../services/attendanceService');

jest.mock('../repositories/eventRepository');
jest.mock('../services/attendanceService');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('EventsController attendance endpoints', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getAttendance returns participants and enabled flag', async () => {
    const req = { params: { uid: 'evt-uid' } };
    const res = mockRes();

    // Simulate event starting in 5 minutes and a 15 minute window -> attendance should be enabled now
    const futureStart = new Date(Date.now() + 5 * 60000).toISOString();
    eventRepository.getEventByUid.mockResolvedValue({ event_id: 5, status: 'published', start_datetime: futureStart, attendance_checkin_window_mins: 15, attendance_grace_mins: 10 });
    eventRepository.getEventParticipants.mockResolvedValue([{ participant_id: 1 }]);

    await eventsController.getAttendance(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(res.json.mock.calls[0][0].data.attendance_enabled).toBe(true);
  });

  test('getAttendance is enabled when current time is within grace period after start', async () => {
    const req = { params: { uid: 'evt-uid' } };
    const res = mockRes();

    // Simulate event started 5 minutes ago and grace is 10 -> still enabled
    const pastStart = new Date(Date.now() - 5 * 60000).toISOString();
    eventRepository.getEventByUid.mockResolvedValue({ event_id: 5, status: 'started', start_datetime: pastStart, attendance_checkin_window_mins: 15, attendance_grace_mins: 10 });
    eventRepository.getEventParticipants.mockResolvedValue([{ participant_id: 1 }] );

    await eventsController.getAttendance(req, res);

    expect(res.json.mock.calls[0][0].data.attendance_enabled).toBe(true);
  });

  test('getAttendance remains enabled when beyond grace period but event status is started', async () => {
    const req = { params: { uid: 'evt-uid' } };
    const res = mockRes();

    // Simulate event started 20 minutes ago and grace is 10 -> still enabled while status is 'started'
    const pastStart = new Date(Date.now() - 20 * 60000).toISOString();
    eventRepository.getEventByUid.mockResolvedValue({ event_id: 5, status: 'started', start_datetime: pastStart, attendance_checkin_window_mins: 15, attendance_grace_mins: 10 });
    eventRepository.getEventParticipants.mockResolvedValue([{ participant_id: 1 }] );

    await eventsController.getAttendance(req, res);

    expect(res.json.mock.calls[0][0].data.attendance_enabled).toBe(true);
  });

  test('getAttendance is disabled when event status is completed', async () => {
    const req = { params: { uid: 'evt-uid' } };
    const res = mockRes();

    // Event started recently but status is completed -> disabled
    const pastStart = new Date(Date.now() - 5 * 60000).toISOString();
    eventRepository.getEventByUid.mockResolvedValue({ event_id: 5, status: 'completed', start_datetime: pastStart, attendance_checkin_window_mins: 15, attendance_grace_mins: 10 });
    eventRepository.getEventParticipants.mockResolvedValue([{ participant_id: 1 }] );

    await eventsController.getAttendance(req, res);

    expect(res.json.mock.calls[0][0].data.attendance_enabled).toBe(false);
  });

  test('checkInParticipant validates body and calls service', async () => {
    const req = { params: { uid: 'evt-uid' }, body: { participantId: 1 }, authenticatedUser: { user_id: 3, role: 'staff' } };
    const res = mockRes();

    attendanceService.checkIn.mockResolvedValue({ participant_id: 1, user_id: 10, attendance_status: 'present' });
    eventRepository.getEventByUid.mockResolvedValue({ event_id: 5, status: 'started' });

    await eventsController.checkInParticipant(req, res);

    expect(attendanceService.checkIn).toHaveBeenCalledWith({ eventUid: 'evt-uid', participantId: 1, performedBy: req.authenticatedUser });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('checkInParticipant returns 400 for invalid participantId', async () => {
    const req = { params: { uid: 'evt-uid' }, body: { participantId: 'not-a-number' }, authenticatedUser: { user_id: 3, role: 'staff' } };
    const res = mockRes();

    await eventsController.checkInParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('patchAttendance validates body and calls service', async () => {
    const req = { params: { uid: 'evt-uid', participantId: '1' }, body: { newStatus: 'present', reason: 'late' }, authenticatedUser: { user_id: 3, role: 'staff' } };
    const res = mockRes();

    attendanceService.patchAttendance.mockResolvedValue({ participant_id: 1, attendance_status: 'present' });

    await eventsController.patchAttendance(req, res);

    expect(attendanceService.patchAttendance).toHaveBeenCalledWith({ eventUid: 'evt-uid', participantId: 1, newStatus: 'present', performedBy: req.authenticatedUser, reason: 'late' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('getAttendanceAudit returns audit entries', async () => {
    const req = { params: { uid: 'evt-uid' }, query: { participantId: '1', limit: '10' } };
    const res = mockRes();

    eventRepository.getAttendanceAudit.mockResolvedValue([{ id: 1, action: 'check_in' }]);

    await eventsController.getAttendanceAudit(req, res);

    expect(eventRepository.getAttendanceAudit).toHaveBeenCalledWith('evt-uid', 1, 10, null);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
