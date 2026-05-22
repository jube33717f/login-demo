import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getProtectedData } from '../api/client';
import { ProtectedDataPanel } from './ProtectedDataPanel';

jest.mock('../api/client', () => ({
  UnauthorizedError: class UnauthorizedError extends Error {},
  getProtectedData: jest.fn(),
}));

const mockedGetProtectedData = jest.mocked(getProtectedData);

describe('ProtectedDataPanel', () => {
  it('loads and renders protected data', async () => {
    mockedGetProtectedData.mockResolvedValue({
      items: [
        {
          id: 'task-1',
          title: 'Review OAuth login flow',
          status: 'completed',
        },
      ],
    });

    render(<ProtectedDataPanel enabled onUnauthorized={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Load data' }));

    await expect(
      screen.findByText('Review OAuth login flow'),
    ).resolves.toBeInTheDocument();
  });

  it('disables loading when unauthenticated', () => {
    render(<ProtectedDataPanel enabled={false} onUnauthorized={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Load data' })).toBeDisabled();
  });
});
