import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import EventReportsPanel from '../EventReportsPanel';
import * as eventService from '@/services/eventService';

jest.mock('@/services/eventService');
jest.mock('@/components/ui/NotificationProvider', () => ({
  useNotify: () => ({ push: jest.fn() })
}));

describe('EventReportsPanel', () => {
  beforeEach(() => jest.resetAllMocks());

  test('shows no reports message when none exist', async () => {
    eventService.listEventReports.mockResolvedValue({ data: [] });
    render(<EventReportsPanel eventUid="evt-1" currentUser={{ role: 'admin' }} />);
    expect(screen.getByText(/Event Reports/i)).toBeInTheDocument();
    await waitFor(() => expect(eventService.listEventReports).toHaveBeenCalled());
    expect(screen.getByText(/No reports available/i)).toBeInTheDocument();
  });

  test('lists reports and downloads on click', async () => {
    const reports = [{ report_id: 5, report_type: 'attendance', file_format: 'csv', generated_at: '2025-12-01T12:00:00Z' }];
    eventService.listEventReports.mockResolvedValue({ data: reports });
    eventService.getEventReportDownloadUrl.mockResolvedValue({ data: { downloadUrl: 'https://example.com/file.csv' } });

    // stub window.open
    global.open = jest.fn();

    render(<EventReportsPanel eventUid="evt-1" currentUser={{ role: 'staff' }} />);

    await waitFor(() => expect(eventService.listEventReports).toHaveBeenCalled());
    expect(screen.getByText(/attendance/i)).toBeInTheDocument();

    const downloadBtn = screen.getByText(/Download/i);
    fireEvent.click(downloadBtn);

    await waitFor(() => expect(eventService.getEventReportDownloadUrl).toHaveBeenCalledWith('evt-1', 5));
    expect(global.open).toHaveBeenCalledWith('https://example.com/file.csv', '_blank');
  });
});
