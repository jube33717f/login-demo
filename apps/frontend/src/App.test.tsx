import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from './App';
import { getMe, UnauthorizedError } from './api/client';

jest.mock('./api/client', () => ({
  UnauthorizedError: class UnauthorizedError extends Error {},
  getMe: jest.fn(),
}));

const mockedGetMe = jest.mocked(getMe);

describe('App', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: jest.fn() },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
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

  it('starts browser logout for authenticated users', async () => {
    mockedGetMe.mockResolvedValue({
      sub: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
    });

    render(<App />);
    await screen.findByText('Test User');

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(window.location.assign).toHaveBeenCalledWith('/logout');
  });
});
