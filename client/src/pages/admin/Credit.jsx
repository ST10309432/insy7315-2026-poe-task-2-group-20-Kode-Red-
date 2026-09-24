import { useState } from 'react';
import { Users } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { Skeletons, ErrorState, EmptyState, ButtonSpinner } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { rand } from '../../utils/format';

export default function Credit() {
  const { data: students, error, loading, reload } = useApi('/admin/students');
  const { data: settings, setData: setSettings } = useApi('/admin/settings');
  const [limit, setLimit] = useState(null);
  const [busy, setBusy] = useState(null);
  const toast = useToast();

  async function run(key, fn, msg) {
    setBusy(key);
    try { await fn(); toast.success(msg); } catch (err) { toast.error(err.message); } finally { setBusy(null); }
  }

  const saveDefault = () => run('default', async () => {
    setSettings(await api.patch('/admin/settings', { defaultCreditLimit: Number(limit) })); setLimit(null);
  }, 'Default credit limit updated for new students');

  const totalOwed = (students || []).reduce((s, x) => s + (x.outstanding || 0), 0);

  return (
    <div className="stack">
      <PageHeader title="Student credit" />
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
      <p className="small muted mt-0">Total outstanding: <strong>{rand(totalOwed)}</strong>. Only verified students can buy on credit.</p>

      {loading && <Skeletons count={4} height={70} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {students?.length === 0 && <EmptyState icon={Users} title="No students yet">Students appear here when they register with a student number.</EmptyState>}
      <ul className="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {students?.map(s => <StudentRow key={s.id} s={s} busy={busy} run={run} reload={reload} />)}
      </ul>
    </div>
  );
}

function StudentRow({ s, busy, run, reload }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(s.creditLimit ?? 0));
  const pct = s.creditLimit ? Math.min(100, (s.outstanding / s.creditLimit) * 100) : 0;
  return (
    <li className="card row wrap">
      <span className="avatar" aria-hidden="true">{s.fullName[0]}</span>
      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
        <strong>{s.fullName}</strong>
        <div className="xs muted">{s.studentNumber} · {s.verified ? `${rand(s.outstanding)} / ${rand(s.creditLimit)}` : 'Pending verification'}{s.creditStatus && s.creditStatus !== 'ACTIVE' && ` · ${s.creditStatus}`}</div>
        {s.verified && <div className="meter light" style={{ marginTop: 6, maxWidth: 220 }} role="meter" aria-valuenow={s.outstanding} aria-valuemin={0} aria-valuemax={s.creditLimit} aria-label={`${s.fullName} credit used`}><span style={{ width: `${pct}%` }} /></div>}
      </div>
      {editing ? (
        <div className="row">
          <input className="input" style={{ width: 110 }} type="number" min="0" value={value} onChange={e => setValue(e.target.value)} aria-label={`Credit limit for ${s.fullName}`} />
          <button className="btn btn-sm btn-yellow" disabled={busy === `l${s.id}`} onClick={() => run(`l${s.id}`, async () => { await api.patch(`/admin/students/${s.id}/credit-limit`, { creditLimit: Number(value) }); setEditing(false); reload(true); }, `Limit for ${s.fullName} updated`)}>Save</button>
        </div>
      ) : (
        <div className="row">
          {s.verified && <button className="btn btn-sm" onClick={() => setEditing(true)}>Limit</button>}
          {s.verified
            ? <span className="badge badge-green">Verified</span>
            : <button className="btn btn-sm btn-primary" disabled={busy === `v${s.id}`} onClick={() => run(`v${s.id}`, async () => { await api.patch(`/admin/students/${s.id}/verify`, { verified: true }); reload(true); }, `${s.fullName} verified`)}>
                {busy === `v${s.id}` && <ButtonSpinner />} Verify
              </button>}
        </div>
      )}
    </li>
  );
}
