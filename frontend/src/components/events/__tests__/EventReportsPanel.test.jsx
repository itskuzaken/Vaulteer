import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import EventReportsPanel from '../EventReportsPanel';

jest.mock('@/services/eventService', () => ({
  listEventReports: jest.fn(),
  generateEventReport: jest.fn(),
  getEventReportDownloadUrl: jest.fn(),
}));

const mockNotify = { push: jest.fn() };
jest.mock('@/components/ui/NotificationProvider', () => ({
  useNotify: () => mockNotify,
}));

const { listEventReports } = require('@/services/eventService');

describe('EventReportsPanel', () => {
  beforeEach(() => jest.resetAllMocks());

  test('shows error and retry button when listEventReports fails and retries successfully', async () => {
    // First call fails
    listEventReports.mockRejectedValueOnce(new Error('Network error'));
    // Second call succeeds
    listEventReports.mockResolvedValueOnce({ data: [{ report_id: 1, report_type: 'attendance', file_format: 'csv', generated_at: '2025-01-01 00:00:00', s3_key: 'r1.csv' }] });

    render(<EventReportsPanel eventUid="evt-1" currentUser={{ role: 'admin' }} />);

    // Wait for error UI to appear
    await waitFor(() => expect(screen.getByText(/Failed to load reports/i)).toBeInTheDocument());

    // Retry button should be present
    const retry = screen.getByRole('button', { name: /Retry/i });
    expect(retry).toBeInTheDocument();

    // Click retry
    fireEvent.click(retry);

    // After retry, the report should be rendered (check generated date and Download button)
    await waitFor(() => expect(screen.getByText(/Generated:\s*2025-01-01 00:00:00/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
  });

  test('shows notification when generateEventReport fails and re-enables button', async () => {
    listEventReports.mockResolvedValueOnce({ data: [] });
    const { generateEventReport } = require('@/services/eventService');
    generateEventReport.mockRejectedValueOnce(new Error('Queue failed'));

    render(<EventReportsPanel eventUid="evt-1" currentUser={{ role: 'admin' }} />);

    // Wait for initial load
    await waitFor(() => expect(screen.getByText(/No reports available/i)).toBeInTheDocument());

    const gen = screen.getByRole('button', { name: /Generate Report/i });
    fireEvent.click(gen);

    // Should call notify on failure
    await waitFor(() => expect(mockNotify.push).toHaveBeenCalledWith('Failed to queue report', 'error'));

    // Button should be enabled again
    expect(gen).not.toBeDisabled();
  });

  test('shows notification when download presigner fails', async () => {
    listEventReports.mockResolvedValueOnce({ data: [{ report_id: 1, report_type: 'attendance', file_format: 'csv', generated_at: '2025-01-01 00:00:00', s3_key: 'r1.csv' }] });
    const { getEventReportDownloadUrl } = require('@/services/eventService');
    getEventReportDownloadUrl.mockRejectedValueOnce(new Error('Presigner failed'));

    // Spy on window.open to ensure it is not called
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<EventReportsPanel eventUid="evt-1" currentUser={{ role: 'admin' }} />);

    // Wait for report to render
    await waitFor(() => expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument());

    const dl = screen.getByRole('button', { name: /Download/i });
    fireEvent.click(dl);

    // Should notify failure and not open window
    await waitFor(() => expect(mockNotify.push).toHaveBeenCalledWith('Failed to get download URL', 'error'));
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
