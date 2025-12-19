import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VolunteerSignupPage from '../signup/page';

jest.mock('../../../utils/apiUtils', () => ({ apiCall: jest.fn() }));

// Mock firebase auth to immediately provide a signed-in user so the form renders
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth, cb) => { cb({ uid: 'test', displayName: 'Test User', email: 'test@example.com' }); return () => {}; },
  signInWithPopup: jest.fn(),
}));

describe('Volunteer signup upload flow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // mock auth state and localStorage usage
    Object.defineProperty(window, 'localStorage', { value: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } });
    // Spy on console.warn so we can assert we use it for handled failures
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  test('shows file input when training selected and uploads file', async () => {
    const { apiCall } = require('../../../utils/apiUtils');
    apiCall.mockResolvedValue({ uploadUrl: 'https://example.com/upload', s3Key: 'vol-cert/42/test.pdf' });

    // Mock global fetch for the PUT to presigned URL
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const { container } = render(<VolunteerSignupPage />);

    // Select the HIV Testing checkbox
    const checkbox = screen.getByLabelText('HIV Testing');
    fireEvent.click(checkbox);

    // File input should appear
    const input = await screen.findByTestId('upload-hiv-testing');
    const file = new File(['dummy'], 'cert.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for upload to finish and UI to show Uploaded
    await waitFor(() => expect(screen.getByText('Uploaded')).toBeInTheDocument());

    expect(apiCall).toHaveBeenCalledWith(expect.stringContaining('/s3/presign'), expect.any(Object));
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/upload', expect.objectContaining({ method: 'PUT' }));
  });

  test('shows detailed error when upload fails', async () => {
    const { apiCall } = require('../../../utils/apiUtils');
    apiCall.mockResolvedValue({ uploadUrl: 'https://example.com/upload', s3Key: 'vol-cert/42/test.pdf' });

    // Simulate fetch failure
    global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

    render(<VolunteerSignupPage />);

    const checkbox = screen.getByLabelText('HIV Testing');
    fireEvent.click(checkbox);

    const input = await screen.findByTestId('upload-hiv-testing');
    const file = new File(['dummy'], 'cert.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    // Inline detailed message should appear
    await waitFor(() => expect(screen.getByText(/Upload failed: Failed to fetch/)).toBeInTheDocument());

    // Global alert should show the training failure message
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Upload failed for HIV Testing: Failed to fetch/));

    // We should log a warning (not an error) for handled upload failures
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Upload error for'), 'HIV Testing', expect.any(Error));
  });

  test('prevents proceeding when selected trainings have missing certificates', async () => {
    // We don't mock presign here because user will not upload
    const { getByLabelText, getByText } = screen;

    render(<VolunteerSignupPage />);

    // Step 1: agree consent
    fireEvent.click(getByLabelText('I Agree'));
    fireEvent.click(getByText('Next'));

    // Step 2: fill minimal personal info
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Dela Cruz' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Nickname/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Birthdate/i), { target: { value: '1990-01-01' } });
    fireEvent.click(getByLabelText(/Male/i));
    fireEvent.click(getByText(/Next/i));

    // Step 3: contact
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '09171234567' } });
    fireEvent.change(screen.getByLabelText(/Current City/i), { target: { value: 'Bacolod City' } });
    fireEvent.click(getByText(/Next/i));

    // Step 4: select Not Applicable and proceed to volunteer profile
    fireEvent.click(getByLabelText(/Not Applicable/i));
    fireEvent.click(getByText(/Next/i));

    // Now in Volunteer Profile step: select HIV Testing (required) but do not upload
    const checkbox = screen.getByLabelText('HIV Testing');
    fireEvent.click(checkbox);

    // Click Next to trigger validation
    fireEvent.click(getByText('Next'));

    // Expect validation message about missing certificate
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Please upload certificates for: HIV Testing/));
  });
});
