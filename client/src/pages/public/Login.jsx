import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Brand from '../../components/Brand';
import Field from '../../components/Field';
import { ButtonSpinner } from '../../components/States';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const DEMO = [
  ['Student', 'lerato@vcconnect.edu.za'],
  ['Admin (Thabang)', 'admin@thabangphala.co.za'],
  ['Vendor', 'vendor@thabangphala.co.za'],
];

export default function Login({ mode: initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', studentNumber: '', campus: 'Varsity College Sandton' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const from = useLocation().state?.from;

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setErrors({}); setFormError(''); setBusy(true);
    try {
      const user = mode === 'login'
        ? await login({ email: form.email, password: form.password })
        : await register({ fullName: form.fullName, email: form.email, password: form.password,
            studentNumber: form.studentNumber || undefined, campus: form.studentNumber ? form.campus : undefined });
      toast.success(mode === 'login' ? `Welcome back, ${user.fullName.split(' ')[0]}!` : 'Account created. Welcome!');
      const staff = ['ADMIN', 'VENDOR'].includes(user.role);
      navigate(staff ? '/admin' : from || '/app', { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-wrap">
      <div className="auth-card stack">
        <div className="center" style={{ display: 'grid', justifyItems: 'center' }}><Brand /></div>
        <div className="card stack">
          <div className="tabs" role="tablist" aria-label="Account">
            <button role="tab" aria-selected={mode === 'login'} onClick={() => setMode('login')}>Log in</button>
            <button role="tab" aria-selected={mode === 'register'} onClick={() => setMode('register')}>Register</button>
          </div>
          <form className="stack" onSubmit={submit} noValidate>
            <h1 style={{ fontSize: '1.5rem' }}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
            {formError && <div className="notice notice-error" role="alert">{formError}</div>}
            {mode === 'register' && (
              <Field label="Full name" autoComplete="name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} required />
            )}
            <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} required />
            <Field label="Password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={form.password} onChange={set('password')} error={errors.password} required
              hint={mode === 'register' ? 'At least 8 characters with a letter and a number' : undefined} />
            {mode === 'register' && (
              <>
                <Field label="Varsity College student number (optional)" placeholder="ST10309432" value={form.studentNumber}
                  onChange={set('studentNumber')} error={errors.studentNumber}
                  hint="Students get a wallet and can apply for Student Credit. Leave blank to order as a guest." />
                {form.studentNumber && <Field label="Campus" value={form.campus} onChange={set('campus')} error={errors.campus} />}
              </>
            )}
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy && <ButtonSpinner />} {mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
          {mode === 'login' && (
            <div className="demo-accounts muted">
              <strong>Demo accounts</strong> (password <code>Password123!</code>):{' '}
              {DEMO.map(([label, email], i) => (
                <span key={email}>{i > 0 && ' · '}<button type="button" onClick={() => setForm(f => ({ ...f, email, password: 'Password123!' }))}>{label}</button></span>
              ))}
            </div>
          )}
        </div>
        <p className="center small"><Link to="/app">Browse the menu without logging in</Link></p>
      </div>
    </main>
  );
}
