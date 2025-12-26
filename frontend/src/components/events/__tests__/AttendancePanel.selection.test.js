import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AttendancePanel from '../AttendancePanel';

jest.mock('@/services/eventService', () => ({
  getAttendance: jest.fn(),
  getEventParticipants: jest.fn(),
  checkInParticipant: jest.fn(),
}));

jest.mock('@/components/ui/NotificationProvider', () => ({ useNotify: () => ({ push: jest.fn() }) }));

describe('AttendancePanel selection reconciliation', () => {
  const { getAttendance, getEventParticipants, checkInParticipant } = require('@/services/eventService');

  test('prunes stale selected ids when participants reload via onSuccess/load', async () => {
    // Initial attendance: participants 1 and 2
    getAttendance.mockResolvedValueOnce({ success: true, data: { participants: [
      { participant_id: 1, name: 'Alice', email: 'a@example.com', attendance_status: 'unknown' },
      { participant_id: 2, name: 'Bob', email: 'b@example.com', attendance_status: 'unknown' }
    ], checkin_window_mins: 15, attendance_grace_mins: 10, attendance_enabled: true } });

    render(<AttendancePanel eventUid="evt-1" />);

    // Wait for initial render
    await waitFor(() => expect(screen.getByText(/Alice/)).toBeInTheDocument());

    // Select both participants (checkboxes: header, row1, row2)
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // select Alice
    fireEvent.click(checkboxes[2]); // select Bob

    // Sanity: footer should show 2 selected
    await waitFor(() => {
      const footer = screen.getByText(/selected/i).parentElement;
      expect(require('@testing-library/react').within(footer).getByText('2')).toBeInTheDocument();
    });

    // Now prepare next load: only Bob remains
    getAttendance.mockResolvedValueOnce({ success: true, data: { participants: [
      { participant_id: 2, name: 'Bob', email: 'b@example.com', attendance_status: 'unknown' }
    ], checkin_window_mins: 15, attendance_grace_mins: 10, attendance_enabled: true } });

    // Kiosk route: mock participants and check-in for Bob
    getEventParticipants.mockResolvedValue({ data: [ { participant_id: 2, name: 'Bob', email: 'b@example.com' } ] });
    checkInParticipant.mockResolvedValue({ success: true, data: { participant_id: 2, attendance_status: 'present' } });

    // Open Kiosk modal and perform a check-in that triggers load()
    const kioskBtn = screen.getByRole('button', { name: /Kiosk/i });
    fireEvent.click(kioskBtn);

    // Kiosk modal input
    const kioskInput = await screen.findByPlaceholderText(/Participant ID or email/i);
    fireEvent.change(kioskInput, { target: { value: 'b@example.com' } });
    const kioskContainer = screen.getByText(/Scan participant barcode or enter participant ID \/ email/i).parentElement;
    const kioskCheckBtn = within(kioskContainer).getByRole('button', { name: /Check in/i });
    fireEvent.click(kioskCheckBtn);

    // After onSuccess, load runs and participants are reloaded to only Bob, selection should prune to 1
    await waitFor(() => {
      const footer = screen.getByText(/selected/i).parentElement;
      expect(require('@testing-library/react').within(footer).getByText('1')).toBeInTheDocument();
    });
  });
});