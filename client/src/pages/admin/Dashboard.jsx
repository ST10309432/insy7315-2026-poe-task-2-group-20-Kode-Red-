import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, ClipboardList, Hourglass, GraduationCap, UtensilsCrossed, BarChart3, MapPin, Settings, LocateFixed } from 'lucide-react';
import { Skeletons, ErrorState, ButtonSpinner } from '../../components/States';
import { Switch } from '../../components/Field';
import Field from '../../components/Field';
import TruckMap from '../../components/TruckMap';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { rand, dateTime } from '../../utils/format';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { data, error, loading, reload } = useApi('/admin/dashboard', { poll: 15000 });

  const stats = data && [
    { label: 'Sales today', value: rand(data.salesToday), icon: Banknote, bg: 'var(--green-soft)' },
    { label: 'Orders today', value: data.ordersToday, icon: ClipboardList, bg: 'var(--yellow)' },
    { label: 'In the queue', value: data.inQueue, icon: Hourglass, bg: 'var(--orange)' },
    { label: 'Credit owed', value: rand(data.creditOwed), icon: GraduationCap, bg: 'var(--red-soft)' },
  ];
  const actions = [
    { to: '/admin/menu', title: 'Manage menu', sub: 'Prices & specials', icon: UtensilsCrossed },
    { to: '/admin/orders', title: 'Order queue', sub: 'Accept & prepare', icon: ClipboardList },
    { to: '/admin/credit', title: 'Student credit', sub: data?.pendingVerifications ? `${data.pendingVerifications} to verify` : 'Limits & verify', icon: GraduationCap, admin: true },
    { to: '/admin/reports', title: 'Reports', sub: 'Sales & credit', icon: BarChart3, admin: true },
    { to: '/admin/settings', title: 'Settings', sub: 'Fees & loyalty', icon: Settings, admin: true },
  ].filter(a => !a.admin || isAdmin);

  return (
    <div className="stack">
      <div>
        <h1>Sawubona, {user.fullName.split(' ')[0]}</h1>
        <p className="muted mt-0">Here's today at the truck.</p>
      </div>
      {loading && <Skeletons count={2} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {stats && (
        <div className="grid grid-stats">
          {stats.map(s => (
            <div key={s.label} className="card stat">
              <span className="ico" style={{ background: s.bg }}><s.icon size={22} aria-hidden="true" /></span>
              <div><div className="value">{s.value}</div><div className="xs muted">{s.label}</div></div>
            </div>
          ))}
        </div>
      )}
      <h2 className="small" style={{ textTransform: 'uppercase' }}>Quick actions</h2>
      <div className="grid grid-3" style={{ marginTop: 8 }}>
        {actions.map(a => (
          <Link key={a.to} to={a.to} className="card card-link row">
            <a.icon size={24} aria-hidden="true" /><div><strong>{a.title}</strong><div className="xs muted">{a.sub}</div></div>
          </Link>
        ))}
      </div>
      <TruckStatus />
    </div>
  );
}

function TruckStatus() {
  const { data: truck, setData } = useApi('/truck');
  const [location, setLocation] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  if (!truck) return null;

  function pinMyLocation() {
    if (!navigator.geolocation) { toast.error('This device cannot share its location'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      pos => update({ latitude: Number(pos.coords.latitude.toFixed(6)), longitude: Number(pos.coords.longitude.toFixed(6)) }, 'Map pin moved to your current location'),
      () => { setBusy(false); toast.error('Location permission was denied'); },
      { enableHighAccuracy: true, timeout: 10000 });
  }

  async function update(patch, message) {
    setBusy(true);
    try { setData(await api.patch('/truck', patch)); toast.success(message); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  return (
    <section className="card stack" aria-labelledby="truck-title">
      <div className="row-between">
        <h2 id="truck-title" className="row"><MapPin size={20} aria-hidden="true" /> Truck status</h2>
        <div className="row">
          <span className={`badge ${truck.isOpen ? 'badge-green' : 'badge-red'}`}>{truck.isOpen ? 'Open' : 'Closed'}</span>
          <Switch checked={truck.isOpen} disabled={busy} label="Truck open for orders" onChange={v => update({ isOpen: v }, v ? 'Truck marked open' : 'Truck marked closed')} />
        </div>
      </div>
      <form className="row wrap" style={{ alignItems: 'flex-end' }} onSubmit={e => { e.preventDefault(); update({ locationName: location }, 'Location updated'); setLocation(null); }}>
        <div style={{ flex: '1 1 240px' }}>
          <Field label="Current location" value={location ?? truck.locationName} onChange={e => setLocation(e.target.value)} hint={`Last updated ${dateTime(truck.updatedAt)}`} />
        </div>
        <button className="btn" disabled={busy || location === null || location.trim().length < 2}>{busy && <ButtonSpinner />} Update</button>
      </form>
      <TruckMap truck={truck} height={220} />
      <button type="button" className="btn btn-dark" style={{ justifySelf: 'start' }} onClick={pinMyLocation} disabled={busy}>
        <LocateFixed size={18} aria-hidden="true" /> Pin the truck at my current location
      </button>
    </section>
  );
}
