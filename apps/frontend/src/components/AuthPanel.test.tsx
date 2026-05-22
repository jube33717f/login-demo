import { render, screen } from '@testing-library/react';

import { AuthPanel } from './AuthPanel';

describe('AuthPanel', () => {
  it('shows a login link for anonymous users', () => {
    render(<AuthPanel status="anonymous" onLogout={jest.fn()} />);

    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('shows user details for authenticated users', () => {
    render(
      <AuthPanel
        status="authenticated"
        user={{ sub: 'user-1', email: 'user@example.com', name: 'Test User' }}
        onLogout={jest.fn()}
      />,
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });
});
