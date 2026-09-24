import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, LogOut, ReceiptText, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Field from '../../components/Field';
import StatusBadge from '../../components/StatusBadge';
import { Skeletons, ErrorState, EmptyState, ButtonSpinner } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { rand, dateTime } from '../../utils/format';

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

  const toFreeMeal = Math.max(0, 10 - (orders?.filter(o => o.status !== 'CANCELLED').length || 0));

  return (
    <div className="stack">
      <PageHeader title="Your account" action={<button className="btn btn-sm" onClick={() => { logout(); navigate('/'); }}><LogOut size={16} aria-hidden="true" /> Log out</button>} />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="stack" style={{ marginTop: 0 }}>
          <div className="card row card-yellow">
            <Award size={36} aria-hidden="true" />
            <div>
              <div className="stat"><span className="value">{user.loyaltyPoints} points</span></div>
              <div className="small">{toFreeMeal > 0 ? `${toFreeMeal} more orders until a free meal` : 'You qualify for a free meal — ask at the truck!'}</div>
            </div>
          </div>
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
