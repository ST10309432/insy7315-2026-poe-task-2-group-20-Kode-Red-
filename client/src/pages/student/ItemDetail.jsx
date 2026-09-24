import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, Star, Clock } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import ItemIcon from '../../components/ItemIcon';
import { Loading, ErrorState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { rand } from '../../utils/format';

export default function ItemDetail() {
  const { id } = useParams();
  const { data: item, error, loading, reload } = useApi(`/menu/${id}`);
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState([]);
  const { add } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const extras = item.extras.filter(e => selected.includes(e.id));
  const unit = (item.salePrice ?? item.price) + extras.reduce((s, e) => s + e.price, 0);
  const toggle = extraId => setSelected(s => s.includes(extraId) ? s.filter(x => x !== extraId) : [...s, extraId]);

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', alignItems: 'start' }}>
      <div>
        <PageHeader title="" back />
        <div className={`card tone-${item.category}`} style={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
          <ItemIcon category={item.category} size={120} />
        </div>
      </div>
      <div className="card stack">
        <div>
          <h1>{item.name}</h1>
          <p className="muted mt-0">{item.description}</p>
          <div className="row small">
            <span className="rating"><Star size={11} aria-hidden="true" /> {item.rating}</span>
            <span className="row muted" style={{ gap: 4 }}><Clock size={14} aria-hidden="true" /> {item.prepMinutes} min</span>
            <span className="muted">· R2 service fee</span>
          </div>
        </div>
        {item.extras.length > 0 && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="label" style={{ textTransform: 'uppercase', marginBottom: 4 }}>Add extras</legend>
            {item.extras.map(e => (
              <label key={e.id} className="checkbox-row">
                <span style={{ flex: 1, fontWeight: 600 }}>{e.name} <span className="muted">(+{rand(e.price)})</span></span>
                <input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggle(e.id)} />
              </label>
            ))}
          </fieldset>
        )}
        <div className="row" style={{ justifyContent: 'center' }}>
          <div className="qty">
            <button className="icon-btn" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={qty <= 1}><Minus size={18} /></button>
            <output aria-live="polite" aria-label="Quantity">{qty}</output>
            <button className="icon-btn" onClick={() => setQty(q => Math.min(20, q + 1))} aria-label="Increase quantity"><Plus size={18} /></button>
          </div>
        </div>
        <button className="btn btn-primary btn-block" disabled={!item.available}
          onClick={() => { add(item, qty, extras); toast.success(`${qty} × ${item.name} added to cart`); navigate('/app/menu'); }}>
          {item.available ? `Add to cart · ${rand(unit * qty)}` : 'Sold out today'}
        </button>
      </div>
    </div>
  );
}
