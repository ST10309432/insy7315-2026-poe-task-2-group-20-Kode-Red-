import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import ItemIcon from '../../components/ItemIcon';
import { Switch } from '../../components/Field';
import { Skeletons, ErrorState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { rand } from '../../utils/format';

export default function ManageMenu() {
  const { data: items, error, loading, reload, setData } = useApi('/menu');
  const { isAdmin } = useAuth();
  const [busy, setBusy] = useState(null);
  const toast = useToast();

  async function toggle(item, available) {
    setBusy(item.id);
    setData(list => list.map(i => i.id === item.id ? { ...i, available } : i)); // optimistic
    try {
      await api.patch(`/menu/${item.id}/availability`, { available });
      toast.success(`${item.name} ${available ? 'is available' : 'marked sold out'}`);
    } catch (err) {
      setData(list => list.map(i => i.id === item.id ? { ...i, available: !available } : i));
      toast.error(err.message);
    } finally { setBusy(null); }
  }

  return (
    <div>
      <PageHeader title="Manage menu" action={isAdmin && <Link to="/admin/menu/new" className="btn btn-dark"><Plus size={18} aria-hidden="true" /> Add item</Link>} />
      {!isAdmin && <p className="notice small">Vendors can mark items as sold out. Only the admin can change prices.</p>}
      {loading && <Skeletons count={5} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      <ul className="grid grid-2" style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
        {items?.map(item => (
          <li key={item.id} className="card menu-card">
            <ItemIcon category={item.category} size={48} />
            <div className="info">
              <h3>{item.name}</h3>
              <div className="row" style={{ gap: 8 }}>
                <span className="price">{rand(item.salePrice ?? item.price)}</span>
                {item.salePrice && <span className="badge badge-red">On sale</span>}
              </div>
            </div>
            <div style={{ display: 'grid', justifyItems: 'center', gap: 2 }}>
              <span className={`xs bold`} style={{ color: item.available ? 'var(--green)' : 'var(--muted)' }}>{item.available ? 'Available' : 'Sold out'}</span>
              <Switch checked={item.available} disabled={busy === item.id} label={`${item.name} available today`} onChange={v => toggle(item, v)} />
            </div>
            {isAdmin && <Link to={`/admin/menu/${item.id}`} className="icon-btn" aria-label={`Edit ${item.name}`}><Pencil size={18} aria-hidden="true" /></Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}
