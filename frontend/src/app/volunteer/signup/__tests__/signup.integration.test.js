import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SignupPage from '../page';

// Mock application settings fetch to avoid loading spinner during tests
jest.mock('@/services', () => ({
  getApplicationSettings: jest.fn(() => Promise.resolve({ success: true, data: { is_open: true, deadline: null } })),
}));

// Mock firebase auth to prevent the loading spinner and provide an authenticated user
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth, cb) => { cb({ uid: 'test', displayName: 'Test User', email: 'test@example.com' }); return () => {}; },
  signInWithPopup: jest.fn(),
}));

describe('volunteer signup page', () => {
  test('gender other requires alpha input', async () => {
    render(<SignupPage />);
    // Accept data privacy notice and advance to the main form
    const agreeRadio = screen.getByLabelText(/I Agree/i);
    fireEvent.click(agreeRadio);
    const nextBtn = screen.getByText(/Next/i);
    fireEvent.click(nextBtn);

    // Now the gender field should be visible — select the 'Other' option
    const otherRadio = screen.getByLabelText(/Other/i);
    fireEvent.click(otherRadio);
    const genderOtherInput = screen.getByPlaceholderText(/Please specify/i);
    fireEvent.change(genderOtherInput, { target: { value: '1234' } });
    fireEvent.blur(genderOtherInput);
    const error = await screen.findByText(/use only letters/i);
    expect(error).toBeInTheDocument();
  });

  test('mobile input normalizes starting with 63 to 09', async () => {
    render(<SignupPage />);
    // Accept and advance to phone input (advance two steps)
    const agreeRadio = screen.getByLabelText(/I Agree/i);
    fireEvent.click(agreeRadio);
    const nextBtn = screen.getByText(/Next/i);
    fireEvent.click(nextBtn);
    // fill required personal info to allow navigation to contact step
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Nickname/i), { target: { value: 'JD' } });
    fireEvent.change(screen.getByLabelText(/Birthdate/i), { target: { value: '2000-01-01' } });
    // Make sure gender is set (required) so the wizard can advance
    // select the male radio by its value attribute
    fireEvent.click(screen.getByDisplayValue('Male'));

    const continueBtn = screen.getByText(/Next/i);
    fireEvent.click(continueBtn);

    const mobileInput = screen.getByPlaceholderText('09XXXXXXXXX');
    fireEvent.change(mobileInput, { target: { value: '63' } });
    expect(mobileInput.value).toBe('0');
    fireEvent.change(mobileInput, { target: { value: '639123456789' } });
    expect(mobileInput.value).toBe('09123456789');
    fireEvent.change(mobileInput, { target: { value: '9123456789' } });
    expect(mobileInput.value).toBe('09123456789');
  });
});
