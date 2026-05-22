import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from './App';
import { getMe, logout, UnauthorizedError } from './api/client';

jest.mock('./api/client', () => ({
  UnauthorizedError: class UnauthorizedError extends Error {},
  getMe: jest.fn(),
  logout: jest.fn(),
}));

const mockedGetMe = jest.mocked(getMe);
const mockedLogout = jest.mocked(logout);

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('renders the anonymous login state when /me returns 401', async () => {
    mockedGetMe.mockRejectedValue(new UnauthorizedError());

    render(<App />);

    await expect(screen.findByRole('link', { name: 'Login' })).resolves.toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('renders authenticated user details', async () => {
    mockedGetMe.mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
    });

    render(<App />);

    await expect(screen.findByText('Test User')).resolves.toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('logs out authenticated users', async () => {
    mockedGetMe.mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
    });
    mockedLogout.mockResolvedValue();

    render(<App />);
    await screen.findByText('Test User');

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => {
      expect(mockedLogout).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
  });
});
