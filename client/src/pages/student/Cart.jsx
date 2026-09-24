import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import ItemIcon from '../../components/ItemIcon';
import { EmptyState } from '../../components/States';
import { useCart } from '../../context/CartContext';
import { rand } from '../../utils/format';

const SERVICE_FEE = 2;

/** Next few half-hour slots, plus ASAP. */
function slots() {
  const out = [];
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  for (let i = 0; i < 4; i++) { out.push(new Date(d)); d.setMinutes(d.getMinutes() + 30); }
  return out;
}

export default function Cart() {
  const { lines, setQuantity, subtotal, count, collectionTime, setCollectionTime, clear } = useCart();
  const navigate = useNavigate();

  if (count === 0) {
    return (
      <>
        <PageHeader title="Your order" back="/app" />
        <EmptyState icon={ShoppingCart} title="Your cart is empty" action={<Link to="/app/menu" className="btn btn-primary">Browse the menu</Link>}>
          Add a kota or two and they will show up here.
        </EmptyState>
      </>
    );
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', alignItems: 'start' }}>
      <div>
        <PageHeader title="Your order" back action={<button className="btn btn-sm btn-danger" onClick={clear}><Trash2 size={16} aria-hidden="true" /> Clear</button>} />
        <ul className="card" style={{ listStyle: 'none', margin: 0, padding: '4px 16px' }}>
          {lines.map(l => (
            <li key={l.key} className="line-item">
              <ItemIcon category={l.category} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{l.name}</strong>
                <div className="xs muted">{rand(l.unitPrice)} each{l.extras.length > 0 && ` · ${l.extras.map(e => e.name).join(', ')}`}</div>
                <div className="qty" style={{ gap: 8, marginTop: 6 }}>
                  <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setQuantity(l.key, l.quantity - 1)} aria-label={`Remove one ${l.name}`}><Minus size={16} /></button>
                  <output style={{ fontSize: '1rem' }} aria-label={`${l.name} quantity`}>{l.quantity}</output>
                  <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setQuantity(l.key, l.quantity + 1)} aria-label={`Add one ${l.name}`}><Plus size={16} /></button>
                </div>
              </div>
              <strong>{rand(l.unitPrice * l.quantity)}</strong>
            </li>
          ))}
        </ul>
      </div>
      <div className="stack" style={{ marginTop: 0 }}>
        <div className="card totals">
          <div><span>Subtotal</span><span>{rand(subtotal)}</span></div>
          <div><span>Service fee</span><span>{rand(SERVICE_FEE)}</span></div>
          <div className="grand"><span>Total</span><span>{rand(subtotal + SERVICE_FEE)}</span></div>
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ textTransform: 'uppercase', marginBottom: 8 }}>Collection time</legend>
          <div className="chips">
            <button className="chip" aria-pressed={collectionTime === 'ASAP'} onClick={() => setCollectionTime('ASAP')}>ASAP · ~12 min</button>
            {slots().map(s => (
              <button key={s.toISOString()} className="chip" aria-pressed={collectionTime === s.toISOString()} onClick={() => setCollectionTime(s.toISOString())}>
                {s.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
              </button>
            ))}
          </div>
        </fieldset>
        <button className="btn btn-primary btn-block" onClick={() => navigate('/app/checkout')}>Go to payment</button>
      </div>
    </div>
  );
}
