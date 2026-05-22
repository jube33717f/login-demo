import { useState } from 'react';

import { getProtectedData, UnauthorizedError } from '../api/client';
import type { ProtectedData } from '../types/api';
import styles from './ProtectedDataPanel.module.css';

type Props = {
  enabled: boolean;
  onUnauthorized: () => void;
};

export function ProtectedDataPanel({ enabled, onUnauthorized }: Props) {
  const [data, setData] = useState<ProtectedData | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  async function loadData() {
    setStatus('loading');
    setMessage('');

    try {
      setData(await getProtectedData());
      setStatus('idle');
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        onUnauthorized();
        return;
      }

      setMessage('Protected data could not be loaded.');
      setStatus('error');
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h2>Protected API</h2>
          <p>GET /api/data requires an authenticated session.</p>
        </div>
        <button
          className={styles.button}
          disabled={!enabled || status === 'loading'}
          onClick={loadData}
        >
          {status === 'loading' ? 'Loading' : 'Load data'}
        </button>
      </div>

      {message ? <p className={styles.error}>{message}</p> : null}

      {data ? (
        <ul className={styles.list}>
          {data.items.map((item) => (
            <li key={item.id} className={styles.item}>
              <span>{item.title}</span>
              <strong data-status={item.status}>{item.status}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No protected data loaded yet.</p>
      )}
    </section>
  );
}
