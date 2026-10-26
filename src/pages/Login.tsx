import { useState, type FormEvent } from 'react';
import logo from '../assets/logo.jpeg';
import { request } from '../api';

export function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // A 401 here means wrong credentials, not an expired session.
    const r = await request<{ token: string }>('POST', '/admin/auth/login', { email, password }, { skipAuthRedirect: true });
    if ((r.success || r.status) && r.data?.token) onLogin(r.data.token);
    else setError(r.message || 'Invalid credentials');
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo"><img src={logo} alt="Thabayehkom" /></div>
        <div className="login-title">Admin Panel</div>
        <div className="login-subtitle">Sign in to your account</div>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-control" type="email" required autoComplete="username"
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@thabayehkom.app"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-control" type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
