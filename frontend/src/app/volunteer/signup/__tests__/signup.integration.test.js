import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SignupPage from '../page';

// Mock application settings fetch to avoid loading spinner during tests
jest.mock('@/services', () => ({
  getApplicationSettings: jest.fn(() => Promise.resolve({ success: true, data: { is_open: true, deadline: null } })),
}));

describe('volunteer signup page', () => {
  test('gender other requires alpha input', async () => {
    render(<SignupPage />);
    // Proceed to the gender step; this depends on how the wizard is implemented - assume fields are visible
    const genderSelect = screen.getByLabelText(/Gender/i);
    fireEvent.change(genderSelect, { target: { value: 'Other' } });
    const genderOtherInput = screen.getByLabelText(/Please specify/i);
    fireEvent.change(genderOtherInput, { target: { value: '1234' } });
    fireEvent.blur(genderOtherInput);
    const error = await screen.findByText(/Letters only/i);
    expect(error).toBeInTheDocument();
  });

  test('mobile input normalizes starting with 63 to 09', async () => {
    render(<SignupPage />);
    const mobileInput = screen.getByPlaceholderText('09XXXXXXXXX');
    fireEvent.change(mobileInput, { target: { value: '63' } });
    expect(mobileInput.value).toBe('0');
    fireEvent.change(mobileInput, { target: { value: '639123456789' } });
    expect(mobileInput.value).toBe('09123456789');
    fireEvent.change(mobileInput, { target: { value: '9123456789' } });
    expect(mobileInput.value).toBe('09123456789');
  });
});
