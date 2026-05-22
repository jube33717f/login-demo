import { useEffect, useState } from 'react';

import { getMe, logout, UnauthorizedError } from './api/client';
import styles from './App.module.css';
import { AuthPanel } from './components/AuthPanel';
import { ProtectedDataPanel } from './components/ProtectedDataPanel';
import type { UserInfo } from './types/api';

type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: UserInfo }
  | { status: 'error'; message: string };

export function App() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    void loadUser();
  }, []);

  async function loadUser() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'error') {
      setAuth({ status: 'error', message: 'Login failed. Please try again.' });
      return;
    }

    try {
      const user = await getMe();
      setAuth({ status: 'authenticated', user });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        setAuth({ status: 'anonymous' });
        return;
      }

      setAuth({
        status: 'error',
        message: 'Unable to check your current session.',
      });
    }
  }

  async function handleLogout() {
    await logout();
    setAuth({ status: 'anonymous' });
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <AuthPanel
          status={auth.status}
          user={auth.status === 'authenticated' ? auth.user : undefined}
          message={auth.status === 'error' ? auth.message : undefined}
          onLogout={handleLogout}
        />
        <ProtectedDataPanel
          enabled={auth.status === 'authenticated'}
          onUnauthorized={() => setAuth({ status: 'anonymous' })}
        />
      </div>
    </main>
  );
}
