import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

// Import and stub service methods
import * as svc from '../../../services/eventService';
svc.getAttendance = jest.fn();
svc.checkInParticipant = jest.fn();

// Delay importing component to allow hooks to be mocked in tests
let AttendancePanel;

jest.mock('@/components/ui/NotificationProvider', () => ({ useNotify: () => ({ push: jest.fn() }) }));

describe('AttendancePanel', () => {
  beforeAll(() => {
    // jsdom doesn't implement matchMedia; stub it for theme hook
    if (typeof window !== 'undefined') {
      window.matchMedia = jest.fn().mockImplementation(query => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
    }
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('selection-driven check-in flow (single participant) works', async () => {
    // Mock theme hook to avoid matchMedia issues
    jest.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));
    const mod = await import('../AttendancePanel');
    AttendancePanel = mod.default;

    svc.getAttendance.mockResolvedValue({ success: true, data: { participants: [{ participant_id: 101, user_id: 201, name: 'Alice', attendance_status: 'absent' }], checkin_window_mins: 15, attendance_grace_mins: 10, attendance_enabled: true } });
    svc.checkInParticipant.mockResolvedValue({ success: true, data: { participant_id: 101, attendance_status: 'present' } });

    render(<AttendancePanel eventUid="evt-1" />);

    await waitFor(() => expect(svc.getAttendance).toHaveBeenCalledWith('evt-1'));
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    // Select the participant (second checkbox is row checkbox)
    const checkboxes = screen.getAllByRole('checkbox');
    const checkbox = checkboxes[1];
    fireEvent.click(checkbox);

    // Footer should show Check In (1)
    const checkInBtn = await screen.findByRole('button', { name: /Check In \(1\)/i });
    expect(checkInBtn).toBeInTheDocument();

    // Open modal
    fireEvent.click(checkInBtn);

    const confirmBtn = await screen.findByRole('button', { name: /Confirm \(1\)/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(svc.checkInParticipant).toHaveBeenCalledWith('evt-1', 101));

    // After success, selection should be cleared for that participant
    expect(checkbox).not.toBeChecked();

    // Participant should show present status
    await waitFor(() => expect(screen.getByText(/Present/i)).toBeInTheDocument());
  });

  test('selection-driven check-in displays late when server returns late', async () => {
    jest.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));
    const mod = await import('../AttendancePanel');
    AttendancePanel = mod.default;

    svc.getAttendance.mockResolvedValue({ success: true, data: { participants: [{ participant_id: 102, user_id: 202, name: 'Bob', attendance_status: 'absent' }], checkin_window_mins: 15, attendance_grace_mins: 10, attendance_enabled: true } });
    svc.checkInParticipant.mockResolvedValue({ success: true, data: { participant_id: 102, attendance_status: 'late' } });

    render(<AttendancePanel eventUid="evt-1" />);

    await waitFor(() => expect(svc.getAttendance).toHaveBeenCalledWith('evt-1'));
    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument());

    // Select the participant
    const checkboxes = screen.getAllByRole('checkbox');
    const checkbox = checkboxes[1];
    fireEvent.click(checkbox);

    const checkInBtn = await screen.findByRole('button', { name: /Check In \(1\)/i });
    fireEvent.click(checkInBtn);

    const confirmBtn = await screen.findByRole('button', { name: /Confirm \(1\)/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(svc.checkInParticipant).toHaveBeenCalledWith('evt-1', 102));

    // Participant should show late status
    await waitFor(() => expect(screen.getByText(/Late/i)).toBeInTheDocument());
  });

  test('Check In button is disabled when attendance is not enabled', async () => {
    jest.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));
    const mod = await import('../AttendancePanel');
    AttendancePanel = mod.default;

    svc.getAttendance.mockResolvedValue({ success: true, data: { participants: [{ participant_id: 105, user_id: 205, name: 'Charlie', attendance_status: 'absent' }], checkin_window_mins: 15, attendance_grace_mins: 10, attendance_enabled: false } });
    svc.checkInParticipant.mockResolvedValue({ success: true, data: { participant_id: 105, attendance_status: 'present' } });

    render(<AttendancePanel eventUid="evt-1" />);

    await waitFor(() => expect(svc.getAttendance).toHaveBeenCalledWith('evt-1'));
    await waitFor(() => expect(screen.getByText('Charlie')).toBeInTheDocument());

    const checkboxes = screen.getAllByRole('checkbox');
    const checkbox = checkboxes[1];
    fireEvent.click(checkbox);

    const checkInBtn = await screen.findByRole('button', { name: /Check In \(1\)/i });
    expect(checkInBtn).toBeDisabled();
  });
});
