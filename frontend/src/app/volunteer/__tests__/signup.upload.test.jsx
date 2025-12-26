import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VolunteerSignupPage from '../signup/page';

jest.mock('../../../utils/apiUtils', () => ({ apiCall: jest.fn() }));

// Mock firebase auth to immediately provide a signed-in user so the form renders
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth, cb) => { cb({ uid: 'test', displayName: 'Test User', email: 'test@example.com' }); return () => {}; },
  signInWithPopup: jest.fn(),
}));

// Mock application settings to avoid network fetch and keep tests deterministic
jest.mock('../../../services', () => ({
  getApplicationSettings: jest.fn().mockResolvedValue({ success: true, data: { is_open: true, deadline: '2099-01-01' } }),
}));

// Mock firebase auth bindings used by the page (auth.currentUser + getIdToken)
jest.mock('../../../services/firebase', () => ({
  auth: { currentUser: { uid: 'test', displayName: 'Test User', email: 'test@example.com', getIdToken: jest.fn().mockResolvedValue('fake-token') } },
  googleProvider: {},
  getIdToken: jest.fn().mockResolvedValue('fake-token')
}));

describe('Volunteer signup upload flow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // mock auth state and localStorage usage
    Object.defineProperty(window, 'localStorage', { value: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } });
    // Spy on console.warn so we can assert we use it for handled failures
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Spy on console.error so we can suppress noisy logs and assert submit errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('attaches file in memory when training selected', async () => {
    const { apiCall } = require('../../../utils/apiUtils');
    // Ensure no presign is called on selection
    apiCall.mockResolvedValue({});

    global.fetch = jest.fn();

    render(<VolunteerSignupPage />);

    // Navigate to Volunteer Profile (step 7)
    fireEvent.click(screen.getByLabelText('I Agree'));
    fireEvent.click(screen.getByText('Next'));
    // Step 2
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Dela Cruz' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Nickname/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Birthdate/i), { target: { value: '1990-01-01' } });
    fireEvent.click(screen.getByLabelText(/^Male$/i));
    fireEvent.click(screen.getByText(/Next/i));
    // Step 3
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '09171234567' } });
    fireEvent.change(screen.getByLabelText(/Current City/i), { target: { value: 'Bacolod City' } });
    fireEvent.click(screen.getByText(/Next/i));
    // Step 4
    fireEvent.click(screen.getByLabelText(/Not Applicable/i));
    fireEvent.click(screen.getByText(/Next/i));

    // Now select the HIV Testing checkbox
    const checkbox = screen.getByLabelText('HIV Testing');
    fireEvent.click(checkbox);

    // File input should appear
    const input = await screen.findByTestId('upload-hiv-testing');
    const file = new File(['dummy'], 'cert.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    // UI should show Selected: filename
    await waitFor(() => expect(screen.getByText(/Selected: cert.pdf/)).toBeInTheDocument());

    // No presign/upload network calls should have been made yet
    expect(apiCall).not.toHaveBeenCalledWith(expect.stringContaining('/s3/presign'), expect.any(Object));
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/s3/upload'), expect.any(Object));
  });

  test('submits form with attached certificate as multipart/form-data', async () => {
    // Mock backend response for applicants POST
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    render(<VolunteerSignupPage />);

    // Step 1: agree consent
    fireEvent.click(screen.getByLabelText('I Agree'));
    fireEvent.click(screen.getByText('Next'));

    // Step 2: personal info
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Dela Cruz' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Nickname/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Birthdate/i), { target: { value: '1990-01-01' } });
    fireEvent.click(screen.getByLabelText(/^Male$/i));
    fireEvent.click(screen.getByText(/Next/i));

    // Step 3: contact
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '09171234567' } });
    fireEvent.change(screen.getByLabelText(/Current City/i), { target: { value: 'Bacolod City' } });
    fireEvent.click(screen.getByText(/Next/i));

    // Step 4: Not Applicable -> Next
    fireEvent.click(screen.getByLabelText(/Not Applicable/i));
    fireEvent.click(screen.getByText(/Next/i));

    // Step 7: Volunteer Profile - select training and attach file
    fireEvent.click(screen.getByLabelText('HIV Testing'));
    const input = await screen.findByTestId('upload-hiv-testing');
    const file = new File(['dummy'], 'cert.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    // fill required volunteer profile fields, select a role and proceed
    fireEvent.click(screen.getByLabelText('Events & Sponsorships'));
    fireEvent.click(screen.getByLabelText('Monday'));
    fireEvent.click(screen.getByLabelText(/Often/i));
    fireEvent.change(screen.getByPlaceholderText('Your answer...'), { target: { value: 'I want to help. I want to learn. I want to contribute. I want to grow. I want to support.' } });
    fireEvent.click(screen.getByText('Next'));

    // Step 8: agree declaration
    fireEvent.click(screen.getByLabelText('I Agree'));

    // Submit
    fireEvent.click(screen.getByText('Submit'));

    // Expect a POST to /api/applicants
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/applicants'), expect.objectContaining({ method: 'POST' })));
  });

  test('shows detailed error when upload fails', async () => {
    const { apiCall } = require('../../../utils/apiUtils');
    apiCall.mockResolvedValue({ uploadUrl: 'https://example.com/upload', s3Key: 'vol-cert/42/test.pdf' });

    // Simulate fetch failure
    global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

    render(<VolunteerSignupPage />);

    // Navigate to Volunteer Profile (step 7)
    fireEvent.click(screen.getByLabelText('I Agree'));
    fireEvent.click(screen.getByText('Next'));
    // Step 2
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Dela Cruz' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Nickname/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Birthdate/i), { target: { value: '1990-01-01' } });
    fireEvent.click(screen.getByLabelText(/^Male$/i));
    fireEvent.click(screen.getByText(/Next/i));
    // Step 3
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '09171234567' } });
    fireEvent.change(screen.getByLabelText(/Current City/i), { target: { value: 'Bacolod City' } });
    fireEvent.click(screen.getByText(/Next/i));
    // Step 4
    fireEvent.click(screen.getByLabelText(/Not Applicable/i));
    fireEvent.click(screen.getByText(/Next/i));

    const checkbox = screen.getByLabelText('HIV Testing');
    fireEvent.click(checkbox);

    const input = await screen.findByTestId('upload-hiv-testing');
    const file = new File(['dummy'], 'cert.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    // select a volunteer role and fill required volunteer profile fields
    fireEvent.click(screen.getByLabelText('Events & Sponsorships'));
    fireEvent.click(screen.getByLabelText('Monday'));
    fireEvent.click(screen.getByLabelText(/Often/i));
    fireEvent.change(screen.getByPlaceholderText('Your answer...'), { target: { value: 'I want to help. I want to learn. I want to contribute. I want to grow. I want to support.' } });
    fireEvent.click(screen.getByText('Next'));

    // Proceed to declaration and submit to observe handled submission/network failure
    fireEvent.click(screen.getByLabelText('I Agree'));
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(screen.getByText(/Failed to submit application: Failed to fetch/)).toBeInTheDocument());

    // We should log a submit error
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error submitting application:'), expect.any(Error));
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
    fireEvent.click(getByLabelText(/^Male$/i));
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

    // Expect validation message about missing certificate (attached required)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Please attach certificates for: HIV Testing/));
  });

  test('accepts a certificate when training name differs only by punctuation/hyphen', async () => {
    // Simulate saved draft with a selected training "Community-Based HIV Screening" but certificate labeled without hyphen
    const savedForm = {
      lastName: 'Dela Cruz',
      firstName: 'Juan',
      nickname: 'Juan',
      birthdate: '1990-01-01',
      gender: 'Male',
      consent: 'agree',
      mobileNumber: '09171234567',
      city: 'Bacolod City',
      currentStatus: 'Not Applicable',
      declarationCommitment: 'agree',
      volunteerReason: 'I want to help. I want to learn. I want to contribute. I want to grow. I want to support.',
      volunteerFrequency: 'Often',
      volunteerTrainings: ['Community-Based HIV Screening'],
      trainingCertificates: [{ trainingName: 'Community Based HIV Screening', filename: 'cert.pdf', mime: 'application/pdf', size: 123, file: {} }]
    };
    window.localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(savedForm));

    render(<VolunteerSignupPage />);

    // Navigate to the volunteer profile step (component will load saved form)
    fireEvent.click(screen.getByLabelText('I Agree'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    // At the Volunteer Profile step, click Next to trigger validation
    fireEvent.click(screen.getByText('Next'));

    // Since the certificate name differs only by punctuation/hyphen, validation should pass (no missing cert error)
    await waitFor(() => expect(screen.queryByText(/Please attach certificates for/)).toBeNull());
  });
});
