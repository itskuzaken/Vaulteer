import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AuditModal from '../AuditModal';

jest.mock('@/services/eventService', () => ({
  getAttendanceAudit: jest.fn(),
}));

describe('AuditModal global fetch', () => {
  const { getAttendanceAudit } = require('@/services/eventService');

  test('loads global audit entries when opened without participantId', async () => {
    getAttendanceAudit.mockResolvedValue({ success: true, data: [{ id: 1, action: 'checkin', performed_at: new Date().toISOString() }] });

    render(<AuditModal open={true} eventUid="evt-1" onClose={() => {}} />);

    await waitFor(() => expect(getAttendanceAudit).toHaveBeenCalledWith('evt-1', expect.objectContaining({ limit: 50 })));
    expect(screen.getByText(/Action: checkin/)).toBeInTheDocument();
  });
});