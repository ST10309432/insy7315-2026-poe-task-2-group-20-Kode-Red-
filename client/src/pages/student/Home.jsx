import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Search, GraduationCap, Clock, Plus } from 'lucide-react';
import ItemIcon from '../../components/ItemIcon';
import { Skeletons, ErrorState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { rand, CATEGORIES } from '../../utils/format';

export default function Home() {
  const { data: menu, error, loading, reload } = useApi('/menu');
  const { data: truck } = useApi('/truck');
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const featured = (menu || []).filter(m => m.available).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 4);
  const deals = (menu || []).filter(m => m.salePrice && m.available);

  return (
    <div className="stack">
      <div>
        <p className="muted small mt-0" style={{ marginBottom: 2 }}>{user ? `Sawubona, ${user.fullName.split(' ')[0]}` : 'Sawubona!'}</p>
        <h1>What are we eating?</h1>
      </div>

      {truck && (
        <div className="card-flat row" style={{ padding: 12 }}>
          <MapPin size={20} aria-hidden="true" />
          <div style={{ flex: 1 }}><strong>{truck.locationName}</strong><div className="xs muted">{truck.hours}</div></div>
          <span className={`badge ${truck.isOpen ? 'badge-green' : 'badge-red'}`}>{truck.isOpen ? 'Open' : 'Closed'}</span>
          {truck.latitude && <a className="btn btn-sm" href={`https://www.openstreetmap.org/?mlat=${truck.latitude}&mlon=${truck.longitude}#map=18/${truck.latitude}/${truck.longitude}`} target="_blank" rel="noreferrer" aria-label="Open the truck's location on a map">Map</a>}
        </div>
      )}

      <form role="search" onSubmit={e => { e.preventDefault(); navigate(`/app/menu?q=${encodeURIComponent(q)}`); }}>
        <label className="input-group">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">Search the menu</span>
          <input className="input" type="search" placeholder="Search kotas, chips, combos…" value={q} onChange={e => setQ(e.target.value)} />
        </label>
      </form>

      <nav className="cat-tiles" aria-label="Categories">
        <Link to="/app/menu?deals=1" className="cat-tile"><span className="tile tone-DEALS"><ItemIcon category="DEALS" size={34} className="" /></span>Hot Deals</Link>
        {CATEGORIES.map(c => (
          <Link key={c.key} to={`/app/menu?category=${c.key}`} className="cat-tile">
            <span className={`tile tone-${c.key}`}><ItemIcon category={c.key} size={34} /></span>{c.label}
          </Link>
        ))}
      </nav>

      <section className="card promo" aria-labelledby="promo-title">
        <span className="badge badge-orange new">New</span>
        <p className="xs bold row mt-0" style={{ gap: 6, marginBottom: 6 }}><GraduationCap size={16} aria-hidden="true" /> STUDENT CREDIT</p>
        <h2 id="promo-title">Eat now,<br />pay month-end</h2>
        <Link to={user ? '/app/wallet' : '/register'} className="btn btn-dark btn-sm">Activate credit</Link>
      </section>

      {deals.length > 0 && (
        <div className="card-flat row" style={{ background: 'var(--red-soft)' }}>
          <strong>On special:</strong>
          <span>{deals.map(d => `${d.name} ${rand(d.salePrice)}`).join(' · ')}</span>
        </div>
      )}

      <section aria-labelledby="featured-title">
        <div className="row-between"><h2 id="featured-title">Fuel up for lunch</h2><Link to="/app/menu" className="small">Menu ›</Link></div>
        {loading && <Skeletons count={2} height={180} />}
        {error && <ErrorState error={error} onRetry={reload} />}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(46%, 220px), 1fr))' }}>
          {featured.map(item => <FeatureCard key={item.id} item={item} />)}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ item }) {
  const { add } = useCart();
  const toast = useToast();
  return (
    <div className="card feature-card">
      <Link to={`/app/item/${item.id}`} className={`top tone-${item.category}`} aria-label={`${item.name}, view details`}>
        <ItemIcon category={item.category} size={56} />
        <span className="time-pill"><Clock size={12} aria-hidden="true" /> {item.prepMinutes} min</span>
      </Link>
      <div className="bottom row-between">
        <div>
          <span className="price">{rand(item.salePrice ?? item.price)}</span>
          <div className="small bold">{item.name}</div>
        </div>
        <button className="add-btn" aria-label={`Add ${item.name} to cart`} onClick={() => { add(item, 1, []); toast.success(`${item.name} added to cart`); }}>
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
