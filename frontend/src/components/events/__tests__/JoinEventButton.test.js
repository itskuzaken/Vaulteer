const React = require('react');
const { render, screen, fireEvent, waitFor } = require('@testing-library/react');

// Mock services and hooks
jest.mock('@/hooks/useDashboardUser', () => ({
  useDashboardUser: () => ({ user: { role: 'volunteer' } }),
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => 'light',
}));

const mockPush = jest.fn();
jest.mock('@/components/ui/NotificationProvider', () => ({
  useNotify: () => ({ push: mockPush }),
}));

const mockJoin = jest.fn();
const mockLeave = jest.fn();
jest.mock('@/services/eventService', () => ({
  joinEvent: (...args) => mockJoin(...args),
  leaveEvent: (...args) => mockLeave(...args),
}));

const { default: JoinEventButton } = require('../JoinEventButton');

describe('JoinEventButton', () => {
  beforeEach(() => jest.resetAllMocks());

  it('joins event successfully when clicking join button', async () => {
    mockJoin.mockResolvedValueOnce({ message: 'Successfully registered', data: { status: 'registered' } });

    const event = { uid: 'e1', participant_count: 0, max_participants: 10, start_datetime: new Date(Date.now() + 3600 * 1000).toISOString(), status: 'published' };

    render(React.createElement(JoinEventButton, { event, isRegistered: false, participationStatus: null, waitlistPosition: null, onStatusChange: () => {} }));

    // Click join directly
    fireEvent.click(screen.getByRole('button', { name: 'Join Event' }));

    await waitFor(() => expect(mockJoin).toHaveBeenCalledWith('e1'));
    expect(mockPush).toHaveBeenCalledWith('Successfully registered', 'success');

    // Button should now say Leave Event (component updates local state)
    await waitFor(() => expect(screen.getByRole('button', { name: /Leave Event/i })).toBeInTheDocument());
  });

  it('leaves event successfully when clicking leave button', async () => {
    mockLeave.mockResolvedValueOnce({ message: 'Successfully left the event' });

    const event = { uid: 'e2', participant_count: 5, max_participants: 10, start_datetime: new Date(Date.now() + 3600 * 1000).toISOString(), status: 'published' };

    render(React.createElement(JoinEventButton, { event, isRegistered: true, participationStatus: 'registered', waitlistPosition: null, onStatusChange: () => {} }));

    // Click leave directly
    fireEvent.click(screen.getByRole('button', { name: 'Leave Event' }));

    await waitFor(() => expect(mockLeave).toHaveBeenCalledWith('e2'));
    expect(mockPush).toHaveBeenCalledWith('Successfully left the event', 'success');

    // Button should now say Join Event
    await waitFor(() => expect(screen.getByRole('button', { name: /Join Event/i })).toBeInTheDocument());
  });
});
