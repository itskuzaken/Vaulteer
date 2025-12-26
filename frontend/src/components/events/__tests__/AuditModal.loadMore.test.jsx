import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuditModal from '../AuditModal';

jest.mock('@/services/eventService', () => ({
  getAttendanceAudit: jest.fn(),
}));

describe('AuditModal pagination', () => {
  const { getAttendanceAudit } = require('@/services/eventService');

  test('loads more entries when Load more is clicked', async () => {
    // create 50 mock entries
    const firstBatch = Array.from({ length: 50 }).map((_, i) => ({ id: i + 1, action: 'a', performed_at: new Date(Date.now() - i * 1000).toISOString() }));
    const secondBatch = Array.from({ length: 10 }).map((_, i) => ({ id: 100 + i + 1, action: 'b', performed_at: new Date(Date.now() - (50 + i) * 1000).toISOString() }));

    getAttendanceAudit.mockResolvedValueOnce({ success: true, data: firstBatch });
    getAttendanceAudit.mockResolvedValueOnce({ success: true, data: secondBatch });

    render(<AuditModal open={true} eventUid="evt-1" onClose={() => {}} />);

    // Wait for initial load and presence of Load more button
    await waitFor(() => expect(getAttendanceAudit).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Load more/i)).toBeInTheDocument();

    const lastEntry = firstBatch[firstBatch.length - 1];

    fireEvent.click(screen.getByText(/Load more/i));

    await waitFor(() => expect(getAttendanceAudit).toHaveBeenCalledTimes(2));
    // Last call should include 'before' param equal to lastEntry.performed_at
    expect(getAttendanceAudit.mock.calls[1][1]).toMatchObject(expect.objectContaining({ before: lastEntry.performed_at }));

    // Now entries should include entries from second batch (at least one 'Action: b')
    await waitFor(() => expect(screen.getAllByText(/Action: b/).length).toBeGreaterThan(0));
  });
});