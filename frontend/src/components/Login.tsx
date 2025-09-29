import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './Login.css';

interface LoginProps {
  onLogin: (user: { username: string }, token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'X-Client-Timezone-Offset': new Date().getTimezoneOffset().toString(),
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        onLogin(data.user, data.token);
      } else {
        setError(data.message || t('login_failed'));
      }
    } catch (err) {
      setError(t('network_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>{t('dashboard_login')}</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">{t('username')}</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading} className="login-button">
            {loading ? t('logging_in') : t('login')}
          </button>
        </form>
        <div className="demo-credentials">
          <h3>{t('demo_credentials')}</h3>
          <p><strong>admin</strong> / password123</p>
          <p><strong>user</strong> / userpass</p>
          <p><strong>demo</strong> / demo123</p>
        </div>
      </div>
    </div>
  );
}