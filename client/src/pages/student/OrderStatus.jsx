import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Check, GraduationCap, X } from 'lucide-react';
import { Loading, ErrorState, ButtonSpinner } from '../../components/States';
import StatusBadge from '../../components/StatusBadge';
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
        <div className="totals small"><div className="grand"><span>Total</span><span>{rand(order.total)}</span></div></div>
      </div>

      {order.status === 'PLACED' && (
        <button className="btn btn-danger btn-block" onClick={cancel} disabled={cancelling}>{cancelling && <ButtonSpinner />} Cancel order</button>
      )}
      {isStudent && <Link to="/app/wallet" className="btn btn-block">View wallet &amp; credit</Link>}
      <Link to="/app" className="btn btn-dark btn-block">Back to home</Link>
    </div>
  );
}
