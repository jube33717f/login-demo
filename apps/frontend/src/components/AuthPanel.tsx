import type { UserInfo } from '../types/api';
import styles from './AuthPanel.module.css';

type Props = {
  status: 'loading' | 'anonymous' | 'authenticated' | 'error';
  user?: UserInfo;
  message?: string;
  onLogout: () => void;
};

export function AuthPanel({ status, user, message, onLogout }: Props) {
  if (status === 'loading') {
    return (
      <section className={styles.panel} aria-live="polite">
        <p className={styles.label}>Checking session</p>
        <h1 className={styles.title}>OAuth PKCE Demo</h1>
        <p className={styles.copy}>Loading your authentication state...</p>
      </section>
    );
  }

  if (status === 'authenticated' && user) {
    return (
      <section className={styles.panel}>
        <p className={styles.label}>Signed in</p>
        <h1 className={styles.title}>OAuth PKCE Demo</h1>
        <dl className={styles.userDetails}>
          <div>
            <dt>Name</dt>
            <dd>{user.name || 'Not provided'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email || 'Not provided'}</dd>
          </div>
          <div>
            <dt>Subject</dt>
            <dd>{user.sub}</dd>
          </div>
        </dl>
        <button className={styles.secondaryButton} onClick={onLogout}>
          Logout
        </button>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <p className={styles.label}>
        {status === 'error' ? 'Authentication issue' : 'Signed out'}
      </p>
      <h1 className={styles.title}>OAuth PKCE Demo</h1>
      <p className={styles.copy}>
        {message || 'Start the Authorization Code with PKCE flow.'}
      </p>
      <a className={styles.primaryButton} href="/login">
        Login
      </a>
    </section>
  );
}
