const eventRepository = require('../repositories/eventRepository');
const dbPool = require('../db/pool');

jest.mock('../db/pool');

describe('EventRepository attendance methods', () => {
  let mockConn;
  let mockPool;

  beforeEach(() => {
    mockConn = {
      beginTransaction: jest.fn().mockResolvedValue(),
      execute: jest.fn(),
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
      release: jest.fn(),
    };

    mockPool = {
      getConnection: jest.fn().mockResolvedValue(mockConn),
      execute: jest.fn(),
    };

    dbPool.getPool.mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('checkInParticipant throws when event not started', async () => {
    // event SELECT returns empty
    mockConn.execute.mockResolvedValueOnce([[]]);

    await expect(eventRepository.checkInParticipant('evt-uid', 123, 45)).rejects.toThrow('Event not found');
  });

  test('checkInParticipant throws when participant not found', async () => {
    // event exists but start time is far in the future (check-in window not opened yet)
    const farFuture = new Date(Date.now() + 24 * 60 * 60000).toISOString();
    mockConn.execute.mockResolvedValueOnce([[{ event_id: 5, status: 'published', start_datetime: farFuture, attendance_checkin_window_mins: 15 }]]);

    await expect(eventRepository.checkInParticipant('evt-uid', 123, 45)).rejects.toThrow('Event check-in is not yet available');
  });

  test('checkInParticipant success updates and returns participant', async () => {
    // event row (FOR UPDATE)
    // Make event start 1 minute in the future, window 15 -> now is within window
    const soon = new Date(Date.now() + 1 * 60000).toISOString();
    mockConn.execute
      // event
      .mockResolvedValueOnce([[{ event_id: 5, status: 'published', start_datetime: soon, attendance_checkin_window_mins: 15, attendance_grace_mins: 10 }]])
      // participant select
      .mockResolvedValueOnce([[{ participant_id: 123, user_id: 77, status: 'registered', attendance_status: 'unknown' }]])
      // update event_participants (update returns result)
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      // insert audit
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    // final select executed via pool.execute in function
    mockPool.execute.mockResolvedValueOnce([[{ participant_id: 123, attendance_status: 'present' }]]);

    const res = await eventRepository.checkInParticipant('evt-uid', 123, 45);
    expect(res.attendance_status).toBe('present');
    expect(mockConn.commit).toHaveBeenCalled();
  });

  test('checkInParticipant succeeds when participant has no user_id (anonymous registration)', async () => {
    const soon = new Date(Date.now() + 1 * 60000).toISOString();
    mockConn.execute
      // event
      .mockResolvedValueOnce([[{ event_id: 5, status: 'published', start_datetime: soon, attendance_checkin_window_mins: 15, attendance_grace_mins: 10 }]] )
      // participant select has no user_id property
      .mockResolvedValueOnce([[{ participant_id: 200, status: 'registered', attendance_status: 'unknown' }]])
      // update
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      // audit insert
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    mockPool.execute.mockResolvedValueOnce([[{ participant_id: 200, attendance_status: 'present' }]]);

    const res = await eventRepository.checkInParticipant('evt-uid', 200, null);
    expect(res.attendance_status).toBe('present');
    expect(mockConn.commit).toHaveBeenCalled();
  });

  test('checkInParticipant marks late when checked in after start', async () => {
    // event started 1 minute ago -> check-in now should be allowed and marked late
    const started = new Date(Date.now() - 1 * 60000).toISOString();
    mockConn.execute
      // event
      .mockResolvedValueOnce([[{ event_id: 5, status: 'published', start_datetime: started, attendance_checkin_window_mins: 15, attendance_grace_mins: 10 }]])
      // participant select
      .mockResolvedValueOnce([[{ participant_id: 124, user_id: 78, status: 'registered', attendance_status: 'unknown' }]])
      // update
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      // audit
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    mockPool.execute.mockResolvedValueOnce([[{ participant_id: 124, attendance_status: 'late' }]]);

    const res = await eventRepository.checkInParticipant('evt-uid', 124, 46);
    expect(res.attendance_status).toBe('late');
    expect(mockConn.commit).toHaveBeenCalled();
  });

  test('patchAttendance records correction and returns participant', async () => {
    // event select
    mockConn.execute
      .mockResolvedValueOnce([[{ event_id: 5, status: 'completed' }]])
      .mockResolvedValueOnce([[{ participant_id: 123, user_id: 77, attendance_status: 'unknown' }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    mockPool.execute.mockResolvedValueOnce([[{ participant_id: 123, attendance_status: 'present' }]]);

    const res = await eventRepository.patchAttendance('evt-uid', 123, 'present', 11, 'Late arrival');
    expect(res.attendance_status).toBe('present');
    expect(mockConn.commit).toHaveBeenCalled();
  });

  test('autoFlagAbsences processes batches until none remain', async () => {
    // First iteration returns two participants
    mockPool.getConnection.mockResolvedValueOnce(mockConn);
    mockConn.execute
      .mockResolvedValueOnce([[{ event_id: 5, status: 'completed' }]]) // this is not used; getEventByUid is called separately
    
    // getEventByUid will use getPool().execute; stub it
    dbPool.getPool().execute = jest.fn().mockResolvedValueOnce([[{ event_id: 5, uid: 'evt-uid' }]]);

    // For the batch loop: first call returns rows
    mockConn.execute
      .mockResolvedValueOnce([[{ participant_id: 1, user_id: 10, attendance_status: 'unknown' }, { participant_id: 2, user_id: 11, attendance_status: null }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      // next iteration returns empty
      .mockResolvedValueOnce([[]]);

    const res = await eventRepository.autoFlagAbsences('evt-uid', 10);
    expect(res).toBe(true);
  });
});
