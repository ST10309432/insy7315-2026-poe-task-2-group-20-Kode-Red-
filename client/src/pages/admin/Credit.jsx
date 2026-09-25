import { useMemo, useState } from 'react';
import { Users, Search, Download } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { Skeletons, ErrorState, EmptyState, ButtonSpinner } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { api, download } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { rand, date } from '../../utils/format';

const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'pending', label: 'To verify', test: s => !s.verified },
  { key: 'owing', label: 'Owing', test: s => s.outstanding > 0 },
  { key: 'overdue', label: 'Overdue', test: s => s.creditStatus === 'OVERDUE' },
  { key: 'suspended', label: 'Suspended', test: s => s.creditStatus === 'SUSPENDED' },
];

/** Student credit & customer records (FR-17, FR-19, FR-24, FR-28). */
export default function Credit() {
  const { data: students, error, loading, reload } = useApi('/admin/students');
  const { data: settings, setData: setSettings } = useApi('/admin/settings');
  const [limit, setLimit] = useState(null);
  const [busy, setBusy] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const toast = useToast();

  async function run(key, fn, msg) {
    setBusy(key);
    try { await fn(); toast.success(msg); } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  }

  const saveDefault = () => run('default', async () => {
    setSettings(await api.patch('/admin/settings', { defaultCreditLimit: Number(limit) })); setLimit(null);
  }, 'Default credit limit updated for new students');

  const visible = useMemo(() => {
    const f = FILTERS.find(x => x.key === filter).test;
    const term = q.trim().toLowerCase();
    return (students || []).filter(s => f(s) && (!term || `${s.fullName} ${s.studentNumber} ${s.email}`.toLowerCase().includes(term)));
  }, [students, filter, q]);
  const totalOwed = (students || []).reduce((s, x) => s + (x.outstanding || 0), 0);
  const counts = Object.fromEntries(FILTERS.map(f => [f.key, (students || []).filter(f.test).length]));

  return (
    <div className="stack">
      <PageHeader title="Students & credit" action={
        <button className="btn btn-sm" disabled={busy === 'csv'} onClick={() => run('csv', () => download('/admin/students/export.csv', 'customers.csv'), 'Customer list downloaded')}>
          {busy === 'csv' ? <ButtonSpinner /> : <Download size={16} aria-hidden="true" />} Export CSV
        </button>} />
      <div className="card card-dark row-between wrap">
        <div>
          <div className="small muted">Default credit limit</div>
          {limit === null
            ? <div className="value" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: 'var(--yellow)' }}>{settings ? rand(settings.defaultCreditLimit) : '…'}</div>
            : <input className="input" style={{ maxWidth: 160, marginTop: 4 }} type="number" min="0" max="5000" value={limit} onChange={e => setLimit(e.target.value)} aria-label="Default credit limit in Rand" autoFocus />}
        </div>
        {limit === null
          ? <button className="btn btn-primary btn-sm" onClick={() => setLimit(String(settings?.defaultCreditLimit ?? 200))}>Adjust</button>
          : <div className="row"><button className="btn btn-sm" onClick={() => setLimit(null)}>Cancel</button><button className="btn btn-yellow btn-sm" disabled={busy === 'default'} onClick={saveDefault}>{busy === 'default' && <ButtonSpinner />} Save</button></div>}
      </div>
      <p className="small muted mt-0">Total outstanding: <strong>{rand(totalOwed)}</strong>. Only verified students with an active account can buy on credit. Accounts go overdue automatically after the due date.</p>

      <label className="input-group">
        <Search size={20} aria-hidden="true" />
        <span className="sr-only">Search students</span>
        <input className="input" type="search" placeholder="Search by name, student number or email" value={q} onChange={e => setQ(e.target.value)} />
      </label>
      <div className="chips" role="group" aria-label="Filter students">
        {FILTERS.map(f => <button key={f.key} className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label} ({counts[f.key]})</button>)}
      </div>

      {loading && <Skeletons count={4} height={70} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {students && visible.length === 0 && <EmptyState icon={Users} title="No students match">Try another search or filter.</EmptyState>}
      <ul className="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {visible.map(s => <StudentRow key={s.id} s={s} busy={busy} run={run} reload={reload} />)}
      </ul>
    </div>
  );
}

const STATUS_BADGE = { ACTIVE: 'badge-green', OVERDUE: 'badge-red', SUSPENDED: 'badge-grey' };

function StudentRow({ s, busy, run, reload }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(s.creditLimit ?? 0));
  const pct = s.creditLimit ? Math.min(100, (s.outstanding / s.creditLimit) * 100) : 0;
  const suspended = s.creditStatus === 'SUSPENDED';
  return (
    <li className="card row wrap">
      <span className="avatar" aria-hidden="true">{s.fullName[0]}</span>
      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <div className="row" style={{ gap: 8 }}><strong>{s.fullName}</strong>
          {s.verified && s.creditStatus && <span className={`badge ${STATUS_BADGE[s.creditStatus]}`}>{s.creditStatus.toLowerCase()}</span>}</div>
        <div className="xs muted">{s.studentNumber} · {s.email}</div>
        <div className="xs muted">{s.verified ? `Owes ${rand(s.outstanding)} of ${rand(s.creditLimit)}${s.outstanding > 0 && s.dueDate ? ` · due ${date(s.dueDate)}` : ''} · wallet ${rand(s.walletBalance)} · ${s.loyaltyPoints} pts` : 'Pending verification'}</div>
        {s.verified && <div className="meter light" style={{ marginTop: 6, maxWidth: 220 }} role="meter" aria-valuenow={s.outstanding} aria-valuemin={0} aria-valuemax={s.creditLimit} aria-label={`${s.fullName} credit used`}><span style={{ width: `${pct}%` }} /></div>}
      </div>
      {editing ? (
        <div className="row">
          <input className="input" style={{ width: 110 }} type="number" min="0" value={value} onChange={e => setValue(e.target.value)} aria-label={`Credit limit for ${s.fullName}`} />
          <button className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn btn-sm btn-yellow" disabled={busy === `l${s.id}`} onClick={() => run(`l${s.id}`, async () => { await api.patch(`/admin/students/${s.id}/credit-limit`, { creditLimit: Number(value) }); setEditing(false); reload(true); }, `Limit for ${s.fullName} updated`)}>Save</button>
        </div>
      ) : (
        <div className="row wrap" style={{ gap: 8 }}>
          {s.verified && <button className="btn btn-sm" onClick={() => setEditing(true)}>Limit</button>}
          {s.verified && (
            <button className={`btn btn-sm ${suspended ? '' : 'btn-danger'}`} disabled={busy === `s${s.id}`}
              onClick={() => run(`s${s.id}`, async () => { await api.patch(`/admin/students/${s.id}/credit-status`, { status: suspended ? 'ACTIVE' : 'SUSPENDED' }); reload(true); },
                suspended ? `Credit re-activated for ${s.fullName}` : `Credit suspended for ${s.fullName}`)}>
              {suspended ? 'Re-activate' : 'Suspend'}
            </button>
          )}
          {!s.verified && (
            <button className="btn btn-sm btn-primary" disabled={busy === `v${s.id}`} onClick={() => run(`v${s.id}`, async () => { await api.patch(`/admin/students/${s.id}/verify`, { verified: true }); reload(true); }, `${s.fullName} verified`)}>
              {busy === `v${s.id}` && <ButtonSpinner />} Verify
            </button>
          )}
        </div>
      )}
    </li>
  );
}
