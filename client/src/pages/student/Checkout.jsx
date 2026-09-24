import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Wallet, GraduationCap, CreditCard, Check } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { Loading, ButtonSpinner } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { rand, date } from '../../utils/format';

const SERVICE_FEE = 2;

export default function Checkout() {
  const { user, isStudent, refresh } = useAuth();
  const { lines, subtotal, count, collectionTime, clear } = useCart();
  const { data: account, loading } = useApi('/wallet', { skip: !isStudent });
  const [chosen, setMethod] = useState(null);
  const placed = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  if (count === 0 && !placed.current) return <Navigate to="/app/cart" replace />;
  if (isStudent && loading) return <Loading label="Loading your wallet…" />;

  const total = subtotal + SERVICE_FEE;
  const wallet = account?.wallet;
  const credit = account?.credit;
  const walletShort = wallet && wallet.balance < total;
  const creditBlocked = !user?.verified ? 'Awaiting student verification'
    : credit?.status !== 'ACTIVE' ? `Account ${credit?.status?.toLowerCase()}`
    : credit.available < total ? `Only ${rand(credit.available)} available` : null;

  const options = [
    { key: 'WALLET', icon: Wallet, title: 'Student Wallet', studentOnly: true,
      sub: wallet ? `Balance: ${rand(wallet.balance)}` : 'Students only', blocked: walletShort && 'Not enough balance' },
    { key: 'CREDIT', icon: GraduationCap, title: 'Student Credit', studentOnly: true,
      sub: credit ? `${rand(credit.available)} of ${rand(credit.limit)} available · pay month-end` : 'Verified students only', blocked: creditBlocked },
    { key: 'CARD', icon: CreditCard, title: 'Card', sub: 'Visa · Mastercard (demo payment)' },
  ];
  const usable = o => !(o.studentOnly && !isStudent) && !o.blocked;
  // Default to the first method the student can actually use
  const method = chosen && usable(options.find(o => o.key === chosen)) ? chosen : options.find(usable).key;

  async function placeOrder() {
    setBusy(true); setError(null);
    try {
      const order = await api.post('/orders', {
        items: lines.map(l => ({ itemId: l.itemId, quantity: l.quantity, extraIds: l.extras.map(e => e.id) })),
        paymentMethod: method, collectionTime,
      });
      placed.current = true;
      clear();
      refresh().catch(() => {}); // update loyalty points
      toast.success(`Order ${order.orderNumber} placed!`);
      navigate(`/app/orders/${order.orderNumber}`, { replace: true, state: { justPlaced: true, pointsEarned: order.pointsEarned } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <PageHeader title="Payment" back="/app/cart" />
      <div className="stack">
        <div role="radiogroup" aria-label="Payment method" className="list">
          {options.map(o => {
            const disabled = !usable(o);
            return (
              <button key={o.key} type="button" role="radio" aria-checked={method === o.key} className="pay-option"
                disabled={disabled} onClick={() => setMethod(o.key)}>
                <o.icon size={24} aria-hidden="true" />
                <span style={{ flex: 1 }}>
                  <strong>{o.title}</strong>
                  <span className="xs muted" style={{ display: 'block' }}>{o.blocked || o.sub}</span>
                </span>
                {method === o.key && <Check size={22} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {!isStudent && (
          <p className="notice small">Wallet and Student Credit are for registered Varsity College students. <Link to="/app/account">Add your student number</Link> to unlock them.</p>
        )}

        <div className="card row-between">
          <div><strong>To pay</strong><div className="xs muted">incl. {rand(SERVICE_FEE)} service fee</div></div>
          <span className="price" style={{ fontSize: '1.5rem' }}>{rand(total)}</span>
        </div>

        {method === 'CREDIT' && credit && (
          <p className="notice small">
            <GraduationCap size={16} style={{ display: 'inline', verticalAlign: '-3px' }} aria-hidden="true" /> Paying on credit adds {rand(total)} to your
            student credit · new balance {rand(credit.outstanding + total)}{credit.dueDate && ` · due ${date(credit.dueDate)}`}
          </p>
        )}
        {error && <div className="notice notice-error" role="alert">{error}</div>}

        <button className="btn btn-primary btn-block" disabled={busy} onClick={placeOrder}>
          {busy && <ButtonSpinner />} Confirm &amp; place order
        </button>
      </div>
    </div>
  );
}
