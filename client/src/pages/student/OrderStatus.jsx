import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Check, GraduationCap, X } from 'lucide-react';
import { Loading, ErrorState, ButtonSpinner } from '../../components/States';
import StatusBadge from '../../components/StatusBadge';
import { StarPicker, Stars } from '../../components/Stars';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { rand, time, METHOD_LABEL } from '../../utils/format';

const STEPS = [
  { key: 'PLACED', label: 'Order placed' },
  { key: 'PREPARING', label: 'Being prepared', includes: ['ACCEPTED', 'PREPARING'] },
  { key: 'READY', label: 'Ready for collection' },
  { key: 'COLLECTED', label: 'Collected' },
];
const stepIndex = status => STEPS.findIndex(s => s.key === status || s.includes?.includes(status));

function ReviewBox({ order, onSaved }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toast = useToast();

  if (order.review) {
    return (
      <div className="card small">
        <strong>Your review</strong> <Stars value={order.review.rating} />
        {order.review.comment && <p className="muted" style={{ margin: '6px 0 0' }}>“{order.review.comment}”</p>}
      </div>
    );
  }
  async function submit(e) {
    e.preventDefault();
    if (!rating) { setErr('Choose a star rating first'); return; }
    setBusy(true); setErr('');
    try { onSaved(await api.post(`/orders/${order.orderNumber}/review`, { rating, comment })); toast.success('Thanks for your review!'); }
    catch (error) { setErr(error.fieldErrors.comment || error.message); } finally { setBusy(false); }
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <h2 style={{ marginBottom: 0 }}>How was your order?</h2>
      <StarPicker value={rating} onChange={v => { setRating(v); setErr(''); }} />
      <label className="field">
        <span className="label">Comment (optional)</span>
        <textarea className="textarea" rows={3} maxLength={300} value={comment} onChange={e => setComment(e.target.value)} placeholder="Tell Thabang what you liked or what to improve" />
      </label>
      {err && <span className="field-error" role="alert">{err}</span>}
      <button className="btn btn-primary" disabled={busy}>{busy && <ButtonSpinner />} Submit review</button>
    </form>
  );
}

export default function OrderStatus() {
  const { orderNumber } = useParams();
  const { state } = useLocation();
  const { isStudent } = useAuth();
  const { data: order, error, loading, reload, setData } = useApi(`/orders/${orderNumber}`, { poll: 5000 });
  const [cancelling, setCancelling] = useState(false);
  const toast = useToast();

  if (loading) return <Loading label="Loading your order…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const current = stepIndex(order.status);
  const cancelled = order.status === 'CANCELLED';

  async function cancel() {
    setCancelling(true);
    try {
      setData(await api.patch(`/orders/${orderNumber}/status`, { status: 'CANCELLED' }));
      toast.success(order.paymentMethod === 'CARD' ? 'Order cancelled.' : 'Order cancelled and refunded.');
    } catch (err) { toast.error(err.message); } finally { setCancelling(false); }
  }

  return (
    <div className="stack" style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="center stack">
        <div className="success-icon" style={cancelled ? { background: 'var(--red)' } : undefined}>
          {cancelled ? <X size={40} aria-hidden="true" /> : <Check size={40} aria-hidden="true" />}
        </div>
        <div>
          <p className="small muted mt-0" style={{ marginBottom: 0 }}>{cancelled ? 'Order cancelled' : `Order placed · ${METHOD_LABEL[order.paymentMethod]}`}</p>
          <div className="order-number" aria-label={`Collection number ${order.orderNumber}`}>{order.orderNumber}</div>
          <p className="small muted mt-0">Show this number at the truck · collect around {time(order.collectionTime)}</p>
        </div>
      </div>

      {order.paymentMethod === 'CREDIT' && !cancelled && (
        <div className="card-flat card-yellow small row"><GraduationCap size={18} aria-hidden="true" /> {rand(order.total)} added to your student credit.</div>
      )}
      {state?.pointsEarned > 0 && <div className="notice notice-ok small">You earned {state.pointsEarned} loyalty points with this order.</div>}
      {state?.freeMealEarned && <div className="notice notice-ok small">That was a milestone order: you've earned a free meal for next time!</div>}
      {order.status === 'COLLECTED' && <ReviewBox order={order} onSaved={review => setData(o => ({ ...o, review }))} />}

      {!cancelled && (
        <div className="card">
          <h2 className="sr-only">Order progress</h2>
          <ol className="tracker" aria-live="polite">
            {STEPS.map((s, i) => (
              <li key={s.key} className={i < current || order.status === 'COLLECTED' ? 'done' : i === current ? 'current' : ''}>
                <span className="dot">{(i < current || order.status === 'COLLECTED') && <Check size={14} aria-hidden="true" />}</span>
                {s.label}
                {i === current && <span className="sr-only"> (current step)</span>}
              </li>
            ))}
          </ol>
          <p className="xs muted" style={{ marginTop: 12, marginBottom: 0 }}>This page updates automatically.</p>
        </div>
      )}

      <div className="card">
        <div className="row-between"><h2 style={{ marginBottom: 0 }}>Items</h2><StatusBadge status={order.status} /></div>
        {order.items.map((it, i) => (
          <div key={i} className="line-item small">
            <span style={{ flex: 1 }}>{it.quantity}× {it.name}{it.extras.length > 0 && <span className="muted"> · {it.extras.map(e => e.name).join(', ')}</span>}</span>
            <strong>{rand(it.lineTotal)}</strong>
          </div>
        ))}
        <div className="totals small">
          {order.discount > 0 && <>
            <div><span>Subtotal + service fee</span><span>{rand(order.subtotal + order.serviceFee)}</span></div>
            <div><span>Rewards{order.freeMealUsed ? ' (free meal' : ''}{order.pointsRedeemed ? `${order.freeMealUsed ? ' + ' : ' ('}${order.pointsRedeemed} points` : ''})</span><span className="amt-pos">−{rand(order.discount)}</span></div>
          </>}
          <div className="grand"><span>Total paid</span><span>{rand(order.total)}</span></div>
        </div>
      </div>

      {order.status === 'PLACED' && (
        <button className="btn btn-danger btn-block" onClick={cancel} disabled={cancelling}>{cancelling && <ButtonSpinner />} Cancel order</button>
      )}
      {isStudent && <Link to="/app/wallet" className="btn btn-block">View wallet &amp; credit</Link>}
      <Link to="/app" className="btn btn-dark btn-block">Back to home</Link>
    </div>
  );
}
