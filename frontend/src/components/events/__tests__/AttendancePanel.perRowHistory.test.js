import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttendancePanel from '../AttendancePanel';

jest.mock('@/services/eventService', () => ({
  getAttendance: jest.fn(),
  getAttendanceAudit: jest.fn(),
}));

jest.mock('@/components/ui/NotificationProvider', () => ({ useNotify: () => ({ push: jest.fn() }) }));

describe('AttendancePanel per-row History', () => {
  const { getAttendance, getAttendanceAudit } = require('@/services/eventService');

  test('clicking per-row History opens AuditModal scoped to participant', async () => {
    getAttendance.mockResolvedValue({ success: true, data: { participants: [ { participant_id: 1, name: 'Alice', email: 'a@example.com', attendance_status: 'present' } ], checkin_window_mins: 15, attendance_grace_mins: 10, attendance_enabled: true } });
    getAttendanceAudit.mockResolvedValue({ success: true, data: [{ id: 5, action: 'mark_present', performed_at: new Date().toISOString() }] });

    render(<AttendancePanel eventUid="evt-1" />);

    await waitFor(() => expect(screen.getByText(/Alice/)).toBeInTheDocument());

    // Click per-row History for Alice
    const aliceRow = screen.getByText(/Alice/).closest('tr');
    const historyBtn = require('@testing-library/react').within(aliceRow).getByRole('button', { name: /History/i });
    fireEvent.click(historyBtn);

    await waitFor(() => expect(getAttendanceAudit).toHaveBeenCalledWith('evt-1', expect.objectContaining({ participantId: 1, limit: 50 })));

    expect(screen.getByText(/Action: mark_present/)).toBeInTheDocument();
  });
});