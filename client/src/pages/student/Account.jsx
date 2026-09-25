import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, LogOut, ReceiptText, ChevronRight, Gift, GraduationCap } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Field from '../../components/Field';
import StatusBadge from '../../components/StatusBadge';
import { Skeletons, ErrorState, EmptyState, ButtonSpinner } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { useSettings } from '../../hooks/useSettings';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { rand, dateTime } from '../../utils/format';

function BecomeStudent() {
  const { becomeStudent } = useAuth();
  const [form, setForm] = useState({ studentNumber: '', campus: 'Varsity College Sandton' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErrors({});
    try { await becomeStudent(form); toast.success('Student number added. Thabang will verify it soon.'); }
    catch (err) { setErrors({ ...err.fieldErrors, form: err.message }); } finally { setBusy(false); }
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <h2 className="row"><GraduationCap size={20} aria-hidden="true" /> Are you a Varsity College student?</h2>
      <p className="small muted mt-0">Add your student number to get a wallet and apply for Student Credit.</p>
      <Field label="Student number" placeholder="ST10309432" value={form.studentNumber} onChange={e => setForm(f => ({ ...f, studentNumber: e.target.value }))} error={errors.studentNumber} />
      <Field label="Campus" value={form.campus} onChange={e => setForm(f => ({ ...f, campus: e.target.value }))} error={errors.campus} />
      {errors.form && !errors.studentNumber && <div className="notice notice-error small" role="alert">{errors.form}</div>}
      <button className="btn btn-primary" disabled={busy}>{busy && <ButtonSpinner />} Add student number</button>
    </form>
  );
}

export default function Account() {
  const { user, setUser, logout } = useAuth();
  const { data: orders, error, loading, reload } = useApi('/orders/mine');
  const [form, setForm] = useState({ fullName: user.fullName, phone: user.phone || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  async function save(e) {
    e.preventDefault(); setBusy(true); setErrors({});
    try {
      setUser(await api.patch('/auth/me', { fullName: form.fullName, ...(form.phone ? { phone: form.phone } : {}) }));
      toast.success('Details updated');
    } catch (err) { setErrors(err.fieldErrors); toast.error(err.message); } finally { setBusy(false); }
  }

  const settings = useSettings();
  const every = settings.freeMealEvery;
  const inCycle = (user.ordersCount || 0) % every;

  return (
    <div className="stack">
      <PageHeader title="Your account" action={<button className="btn btn-sm" onClick={() => { logout(); navigate('/'); }}><LogOut size={16} aria-hidden="true" /> Log out</button>} />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="stack" style={{ marginTop: 0 }}>
          <section className="card card-yellow stack" aria-labelledby="loyalty-title">
            <div className="row">
              <Award size={36} aria-hidden="true" />
              <div>
                <h2 id="loyalty-title" className="sr-only">Loyalty rewards</h2>
                <div className="stat"><span className="value">{user.loyaltyPoints} points</span></div>
                <div className="small">Worth {rand(user.loyaltyPoints * settings.pointValue)} off · earn 1 point per R{settings.randsPerPoint}</div>
              </div>
            </div>
            {user.freeMeals > 0 && (
              <div className="card-flat row small"><Gift size={20} aria-hidden="true" /><strong>{user.freeMeals} free meal{user.freeMeals > 1 ? 's' : ''} ready</strong> — use it at checkout</div>
            )}
            <div>
              <div className="small bold" style={{ marginBottom: 6 }}>{every - inCycle} more order{every - inCycle === 1 ? '' : 's'} until your next free meal</div>
              <div className="progress-dots" role="img" aria-label={`${inCycle} of ${every} orders towards a free meal`}>
                {Array.from({ length: every }, (_, i) => <span key={i} className={i < inCycle ? 'on' : ''} />)}
              </div>
            </div>
          </section>
          {user.role === 'GUEST' && <BecomeStudent />}
          <form className="card stack" onSubmit={save}>
            <h2>Your details</h2>
            <p className="small muted mt-0">{user.email} · {user.role === 'STUDENT' ? `Student ${user.studentNumber}${user.verified ? ' (verified)' : ' (pending verification)'}` : 'Guest account'}</p>
            <Field label="Full name" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} error={errors.fullName} />
            <Field label="Phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} error={errors.phone} placeholder="+27 71 000 0000" />
            <button className="btn btn-primary" disabled={busy}>{busy && <ButtonSpinner />} Save changes</button>
          </form>
        </div>
        <section className="card" aria-labelledby="history">
          <h2 id="history">Order history</h2>
          {loading && <Skeletons count={3} height={56} />}
          {error && <ErrorState error={error} onRetry={reload} />}
          {orders?.length === 0 && <EmptyState icon={ReceiptText} title="No orders yet" action={<Link to="/app/menu" className="btn btn-primary">Order now</Link>} />}
          {orders?.map(o => (
            <Link key={o.orderNumber} to={`/app/orders/${o.orderNumber}`} className="tx" style={{ color: 'inherit', textDecoration: 'none' }}>
              <div><strong>{o.orderNumber}</strong> <StatusBadge status={o.status} /><div className="xs muted">{dateTime(o.createdAt)} · {o.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}</div></div>
              <span className="row" style={{ gap: 4 }}><strong>{rand(o.total)}</strong><ChevronRight size={18} aria-hidden="true" /></span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
