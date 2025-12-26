import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KioskMode from '../KioskMode';

jest.mock('@/services/eventService', () => ({
  getEventParticipants: jest.fn(),
  checkInParticipant: jest.fn()
}));

describe('KioskMode', () => {
  const { getEventParticipants, checkInParticipant } = require('@/services/eventService');

  test('resolves email to participant_id and performs check-in', async () => {
    getEventParticipants.mockResolvedValue({ data: [{ participant_id: 12, email: 'a@b.com', user_uid: 'u-1', name: 'Alice' }] });
    checkInParticipant.mockResolvedValue({ success: true, data: { participant_id: 12, attendance_status: 'present' } });

    const onSuccess = jest.fn();

    render(<KioskMode open={true} eventUid="evt-1" onClose={() => {}} onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText(/Participant ID or email/i);
    fireEvent.change(input, { target: { value: 'a@b.com' } });

    const btn = screen.getByRole('button', { name: /Check in/i });
    fireEvent.click(btn);

    await waitFor(() => expect(checkInParticipant).toHaveBeenCalledWith('evt-1', 12));
    expect(onSuccess).toHaveBeenCalled();
  });

  test('shows error when no participant matched', async () => {
    getEventParticipants.mockResolvedValue({ data: [] });
    render(<KioskMode open={true} eventUid="evt-1" onClose={() => {}} onSuccess={() => {}} />);

    const input = screen.getByPlaceholderText(/Participant ID or email/i);
    fireEvent.change(input, { target: { value: 'nomatch@example.com' } });

    const btn = screen.getByRole('button', { name: /Check in/i });
    fireEvent.click(btn);

    await waitFor(() => expect(screen.getByText(/No participant found for input/i)).toBeInTheDocument());
  });
});