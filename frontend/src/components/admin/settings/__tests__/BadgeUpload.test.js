import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Mock service BEFORE importing the component so module-level imports are replaced
jest.mock('../../../../services/achievementService');
import BadgeUpload from '../BadgeUpload';
import * as achSvc from '../../../../services/achievementService';

describe('BadgeUpload', () => {
  beforeEach(() => jest.resetAllMocks());

  test('shows preview when currentKey is present', async () => {
    achSvc.getBadgePreviewUrl.mockResolvedValue({ url: 'https://example.com/p.png' });
    render(<BadgeUpload achievementId={1} tier="bronze" currentKey="achievement_badges/early_bird/bronze.png" onUpdated={() => {}} />);
    const img = await screen.findByAltText('bronze badge');
    expect(img).toBeTruthy();
    expect(img).toHaveAttribute('src', 'https://example.com/p.png');
  });

  test('uploads a file and validates then shows new preview', async () => {
    achSvc.presignBadgeUpload.mockResolvedValue({ uploadUrl: 'https://s3.example.com/presign', s3Key: 'achievement_badges/1/new.png' });
    achSvc.validateBadgeUpload.mockResolvedValue({ achievement_id: 1, badge_s3_key: 'achievement_badges/1/new.png' });
    achSvc.getBadgePreviewUrl.mockResolvedValue({ url: 'https://example.com/new.png' });

    // mock fetch PUT to presign URL
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const { container } = render(<BadgeUpload achievementId={1} tier="single" currentKey={null} onUpdated={() => {}} />);
    const input = container.querySelector('input[type="file"]');
    const file = new File(['dummy'], 'badge.png', { type: 'image/png' });

    await waitFor(() => expect(input).toBeTruthy());

    // Simulate file selection
    userEvent.upload(input, file);

    await waitFor(() => expect(achSvc.validateBadgeUpload).toHaveBeenCalledWith(1, 'achievement_badges/1/new.png', 'single'));

    const img = await screen.findByAltText('badge preview');
    expect(img).toHaveAttribute('src', 'https://example.com/new.png');

    // restore fetch
    global.fetch.mockRestore && global.fetch.mockRestore();
  });

  test('delete calls service and confirm button is removed', async () => {
    achSvc.getBadgePreviewUrl.mockResolvedValue({ url: 'https://example.com/p.png' });
    achSvc.deleteBadge.mockResolvedValue(true);

    render(<BadgeUpload achievementId={1} tier="bronze" currentKey={'achievement_badges/x.png'} onUpdated={() => {}} />);

    // Confirm should not be present anymore
    expect(screen.queryByText('Confirm')).toBeNull();

    const deleteBtn = await screen.findByText('Delete');
    fireEvent.click(deleteBtn);
    await waitFor(() => expect(achSvc.deleteBadge).toHaveBeenCalledWith(1, 'bronze'));

  });
});