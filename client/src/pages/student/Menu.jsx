import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Clock, SearchX } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { ItemThumb } from '../../components/ItemIcon';
import { Skeletons, ErrorState, EmptyState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { RatingChip } from '../../components/Stars';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { rand, CATEGORIES } from '../../utils/format';

export default function Menu() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category');
  const deals = params.get('deals') === '1';
  const q = (params.get('q') || '').toLowerCase();
  const { data, error, loading, reload } = useApi('/menu');
  const { add } = useCart();
  const toast = useToast();

  const items = useMemo(() => (data || []).filter(m =>
    (!category || m.category === category) && (!deals || m.salePrice) &&
    (!q || `${m.name} ${m.description}`.toLowerCase().includes(q))), [data, category, deals, q]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams();
    if (key === 'category' && value) next.set('category', value);
    if (key === 'deals') next.set('deals', '1');
    setParams(next);
  };

  return (
    <div>
      <PageHeader title="The Menu">{q && <p className="small muted mt-0">Results for “{q}”</p>}</PageHeader>
      <div className="chips" role="group" aria-label="Filter by category">
        <button className="chip" aria-pressed={!category && !deals} onClick={() => setFilter('category', null)}>All</button>
        <button className="chip" aria-pressed={deals} onClick={() => setFilter('deals')}>Specials</button>
        {CATEGORIES.map(c => (
          <button key={c.key} className="chip" aria-pressed={category === c.key} onClick={() => setFilter('category', c.key)}>{c.label}</button>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        {loading && <Skeletons count={5} />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && items.length === 0 && (
          <EmptyState icon={SearchX} title="Nothing matches" action={<button className="btn" onClick={() => setParams({})}>Show everything</button>}>
            Try another category or search term.
          </EmptyState>
        )}
        <ul className="list grid-2 grid" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map(item => (
            <li key={item.id} className={`card menu-card ${item.available ? '' : 'soldout'}`}>
              <ItemThumb item={item} size={56} />
              <Link to={`/app/item/${item.id}`} className="info" style={{ color: 'inherit', textDecoration: 'none' }}>
                <h3>{item.name}</h3>
                <p className="xs muted" style={{ margin: '2px 0 4px' }}>{item.description}</p>
                <div className="row" style={{ gap: 8 }}>
                  <span className="price">{rand(item.salePrice ?? item.price)}</span>
                  {item.salePrice && <span className="price-old">{rand(item.price)}</span>}
                  <RatingChip rating={item.rating} count={item.ratingCount} />
                  <span className="xs muted row" style={{ gap: 3 }}><Clock size={12} aria-hidden="true" />{item.prepMinutes}m</span>
                </div>
                {!item.available && <span className="badge badge-grey" style={{ marginTop: 6 }}>{item.soldOutToday ? 'Sold out today' : 'Unavailable'}</span>}
              </Link>
              <button className="add-btn" disabled={!item.available} aria-label={item.available ? `Add ${item.name} to cart` : `${item.name} is sold out`}
                onClick={() => { add(item, 1, []); toast.success(`${item.name} added to cart`); }}>
                <Plus size={20} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
