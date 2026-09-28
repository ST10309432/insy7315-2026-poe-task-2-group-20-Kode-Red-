import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Wallet, GraduationCap, CreditCard, Check, Award, Gift } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { Switch } from '../../components/Field';
import { Loading, ButtonSpinner } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { useSettings } from '../../hooks/useSettings';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { rand, date } from '../../utils/format';

const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

export default function Checkout() {
  const { user, isStudent, refresh } = useAuth();
  const { lines, subtotal, count, collectionTime, clear } = useCart();
  const settings = useSettings();
  const { data: account, loading } = useApi('/wallet', { skip: !isStudent });
  const [chosen, setMethod] = useState(null);
  const [useFreeMeal, setUseFreeMeal] = useState(false);
  const [pointsInput, setPointsInput] = useState(0);
  const [placed, setPlaced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  if (count === 0 && !placed) return <Navigate to="/app/cart" replace />;
  if (isStudent && loading) return <Loading label="Loading your wallet…" />;

  // Same rules as the API (services/loyaltyService.js) so the total shown matches what is charged
  const freeMeals = user?.freeMeals || 0;
  const points = user?.loyaltyPoints || 0;
  const freeMealDiscount = useFreeMeal && freeMeals > 0 && lines.length
    ? round2(Math.min(Math.max(...lines.map(l => l.unitPrice)), settings.freeMealCap)) : 0;
  const maxPoints = Math.max(0, Math.min(points, Math.floor((subtotal - freeMealDiscount) / settings.pointValue + 1e-9)));
  const usePoints = Math.min(Math.max(0, Math.floor(Number(pointsInput) || 0)), maxPoints);
  const discount = round2(freeMealDiscount + usePoints * settings.pointValue);
  const total = round2(Math.max(0, subtotal + settings.serviceFee - discount));

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
        paymentMethod: method, collectionTime, usePoints, useFreeMeal: freeMealDiscount > 0,
      });
      setPlaced(true);
      clear();
      refresh().catch(() => {}); // update loyalty points
      toast.success(`Order ${order.orderNumber} placed!`);
      navigate(`/app/orders/${order.orderNumber}`, { replace: true, state: { justPlaced: true, pointsEarned: order.pointsEarned, freeMealEarned: order.freeMealEarned } });
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
        {(points > 0 || freeMeals > 0) && (
          <section className="card loyalty-box stack" aria-labelledby="rewards-title">
            <h2 id="rewards-title" className="row" style={{ marginBottom: 0 }}><Award size={20} aria-hidden="true" /> Use your rewards</h2>
            {freeMeals > 0 && (
              <div className="row-between">
                <div className="row"><Gift size={18} aria-hidden="true" />
                  <div><strong>Free meal</strong> <span className="xs muted">({freeMeals} available)</span>
                    <div className="xs muted">Takes your most expensive item off, up to {rand(settings.freeMealCap)}</div></div></div>
                <Switch checked={useFreeMeal} label="Use a free meal" onChange={setUseFreeMeal} />
              </div>
            )}
            {points > 0 && (
              <div className="row-between wrap">
                <div><strong>Points</strong> <span className="xs muted">({points} available · 1 point = {rand(settings.pointValue)})</span></div>
                <div className="stepper">
                  <label className="sr-only" htmlFor="points">Points to use</label>
                  <input id="points" className="input" type="number" min="0" max={maxPoints} inputMode="numeric"
                    value={pointsInput} onChange={e => setPointsInput(e.target.value)} />
                  <button type="button" className="btn btn-sm" onClick={() => setPointsInput(maxPoints)} disabled={maxPoints === 0}>Max</button>
                </div>
              </div>
            )}
            {Number(pointsInput) > maxPoints && <p className="xs muted" style={{ margin: 0 }}>You can use up to {maxPoints} points on this order.</p>}
          </section>
        )}

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

        <div className="card totals small">
          <div><span>Subtotal</span><span>{rand(subtotal)}</span></div>
          <div><span>Service fee</span><span>{rand(settings.serviceFee)}</span></div>
          {freeMealDiscount > 0 && <div><span>Free meal</span><span className="amt-pos">−{rand(freeMealDiscount)}</span></div>}
          {usePoints > 0 && <div><span>{usePoints} points</span><span className="amt-pos">−{rand(usePoints * settings.pointValue)}</span></div>}
          <div className="grand"><span>To pay</span><span className="price">{rand(total)}</span></div>
        </div>

        {method === 'CREDIT' && credit && total > 0 && (
          <p className="notice small">
            <GraduationCap size={16} style={{ display: 'inline', verticalAlign: '-3px' }} aria-hidden="true" /> Paying on credit adds {rand(total)} to your
            student credit · new balance {rand(credit.outstanding + total)}{credit.dueDate && ` · due ${date(credit.dueDate)}`}
          </p>
        )}
        <p className="xs muted" style={{ margin: 0 }}>You'll earn {Math.floor(total / settings.randsPerPoint)} points on this order.</p>
        {error && <div className="notice notice-error" role="alert">{error}</div>}

        <button className="btn btn-primary btn-block" disabled={busy} onClick={placeOrder}>
          {busy && <ButtonSpinner />} Confirm &amp; place order · {rand(total)}
        </button>
      </div>
    </div>
  );
}
