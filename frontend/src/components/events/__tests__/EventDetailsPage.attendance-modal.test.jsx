import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import EventDetailsPage from '../EventDetailsPage';

jest.mock('next/navigation', () => ({ useRouter: () => ({ back: jest.fn() }) }));

jest.mock('@/components/events/AttendancePanel', () => ({
  __esModule: true,
  default: () => <div data-testid="attendance-panel-mock">Attendance Panel Mock</div>
}));

jest.mock('@/services/eventService', () => ({
  getEventDetails: jest.fn().mockResolvedValue({
    data: {
      uid: 'evt-1',
      title: 'Test Event',
      start_datetime: new Date(Date.now() + 5 * 60000).toISOString(),
      attendance_checkin_window_mins: 15,
      status: 'published',
      participant_count: 2,
      max_participants: 50
    }
  }),
  getEventParticipants: jest.fn().mockResolvedValue({ data: [] }),
  listEventReports: jest.fn().mockResolvedValue({ data: [] }),
  generateEventReport: jest.fn().mockResolvedValue({ data: { queued: true } }),
  getEventReportDownloadUrl: jest.fn().mockResolvedValue({ data: { downloadUrl: 'https://example.com/report.csv' } })
}));

jest.mock('@/components/ui/NotificationProvider', () => ({ useNotify: () => ({ push: jest.fn() }) }));

describe('EventDetailsPage attendance modal workflow', () => {
  test('shows Take Attendance button and opens modal with AttendancePanel when clicked', async () => {
    render(<EventDetailsPage eventUid="evt-1" currentUser={{ role: 'staff', user_id: 1 }} />);

    // Wait for tabs to render
    await waitFor(() => expect(screen.getByText(/Registered/i)).toBeInTheDocument());

    const takeBtn = screen.getByRole('button', { name: /Take Attendance/i });
    expect(takeBtn).toBeInTheDocument();

    fireEvent.click(takeBtn);

    await waitFor(() => expect(screen.getByTestId('attendance-panel-mock')).toBeInTheDocument());
  });
});
