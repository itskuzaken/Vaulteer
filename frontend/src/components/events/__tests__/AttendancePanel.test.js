import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

// Import and stub service methods
import * as svc from '../../../services/eventService';
svc.getAttendance = jest.fn();
svc.checkInParticipant = jest.fn();
svc.markAttendance = jest.fn();
svc.patchAttendance = jest.fn();

import AttendancePanel from '../AttendancePanel';

describe('AttendancePanel', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('renders participants and allows marking present (single)', async () => {
    // Mock global fetch which is used by fetchWithAuth/getAttendance
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { participants: [{ participant_id: 101, user_id: 201, name: 'Alice', attendance_status: 'absent' }], checkin_window_mins: 15, attendance_grace_mins: 10 } })
    });

    const { default: AttendancePanel } = await import('../AttendancePanel');
    expect(typeof AttendancePanel).toBe('function');
    // For check-in, mock the fetch POST used by checkInParticipant
    const checkInResponse = { ok: true, status: 200, text: async () => JSON.stringify({ success: true }) };
    global.fetch.mockImplementationOnce(() => Promise.resolve(checkInResponse));

    await act(async () => {
      render(<AttendancePanel eventUid="evt-1" />);
      // wait for initial load (fetch used under the hood)
      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/events/evt-1/attendance'), expect.any(Object)));
      await waitFor(() => screen.getByText('Alice'));
    });

    const btn = screen.getByRole('button', { name: /mark present/i });
    fireEvent.click(btn);

    await waitFor(() => expect(svcMock.checkInParticipant).toHaveBeenCalledWith('evt-1', 101));
    // After check-in we expect the panel to reload attendance
    expect(svcMock.getAttendance).toHaveBeenCalled();
  });
});
