import { useState } from 'react';
import { Plus, HandCoins, GraduationCap, ReceiptText } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Field from '../../components/Field';
import { Loading, ErrorState, EmptyState, ButtonSpinner } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { rand, dateTime, date } from '../../utils/format';

export default function Wallet() {
  const { data, error, loading, reload } = useApi('/wallet');
  const { user } = useAuth();
  const [panel, setPanel] = useState(null); // 'topup' | 'repay'

  if (loading) return <Loading label="Loading wallet…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const { wallet, credit, transactions } = data;
  const used = credit ? Math.min(100, (credit.outstanding / (credit.limit || 1)) * 100) : 0;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }} className="stack">
      <PageHeader title="Wallet & Credit" back="/app" />

      <section className="card wallet-card" aria-label="Balances">
        <p className="small mt-0" style={{ opacity: .8, marginBottom: 2 }}>Wallet balance</p>
        <p className="amount">{rand(wallet.balance)}</p>
        {credit && (
          <div style={{ marginTop: 14 }}>
            <div className="row-between small"><span>Student credit owed</span><span className="bold">{rand(credit.outstanding)} / {rand(credit.limit)}</span></div>
            <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={credit.limit} aria-valuenow={credit.outstanding} aria-label="Student credit used" style={{ marginTop: 6 }}>
              <span style={{ width: `${used}%` }} />
            </div>
            <p className="xs" style={{ marginTop: 6, opacity: .85, marginBottom: 0 }}>
              {rand(credit.available)} available{credit.dueDate && ` · settle by ${date(credit.dueDate)}`}
              {credit.status !== 'ACTIVE' && ` · ${credit.status}`}
            </p>
          </div>
        )}
      </section>

      {!user?.verified && (
        <div className="notice small row"><GraduationCap size={18} aria-hidden="true" /> Your student number is waiting for Thabang to verify it. Student Credit unlocks once you are approved.</div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <button className="btn btn-primary" aria-expanded={panel === 'topup'} onClick={() => setPanel(p => p === 'topup' ? null : 'topup')}><Plus size={18} aria-hidden="true" /> Top up</button>
        <button className="btn" aria-expanded={panel === 'repay'} disabled={!credit || credit.outstanding <= 0} onClick={() => setPanel(p => p === 'repay' ? null : 'repay')}><HandCoins size={18} aria-hidden="true" /> Repay credit</button>
      </div>

      {panel === 'topup' && <TopUpForm onDone={() => { setPanel(null); reload(true); }} />}
      {panel === 'repay' && <RepayForm credit={credit} wallet={wallet} onDone={() => { setPanel(null); reload(true); }} />}

      <section className="card" aria-labelledby="activity">
        <h2 id="activity">Recent activity</h2>
        {transactions.length === 0 && <EmptyState icon={ReceiptText} title="No activity yet">Top up or place an order to get started.</EmptyState>}
        {transactions.map(t => (
          <div key={t.id} className="tx">
            <div><strong className="small">{t.description}</strong><div className="xs muted">{dateTime(t.createdAt)}</div></div>
            <span className={t.amount >= 0 ? 'amt-pos' : 'amt-neg'}>{t.amount >= 0 ? '+' : '−'}{rand(Math.abs(t.amount))}</span>
          </div>
        ))}
        <p className="notice xs" style={{ marginTop: 12, marginBottom: 0 }}>Credit is added the moment you order on credit and is capped at your limit. Overdue accounts pause new credit until settled.</p>
      </section>
    </div>
  );
}

function TopUpForm({ onDone }) {
  const [amount, setAmount] = useState('100');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState();
  const toast = useToast();
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr();
    try {
      const r = await api.post('/wallet/top-up', { amount: Number(amount) });
      toast.success(`Wallet topped up. New balance ${rand(r.balance)}`); onDone();
    } catch (error) { setErr(error.fieldErrors.amount || error.message); } finally { setBusy(false); }
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <h2>Top up wallet</h2>
      <div className="chips">{[50, 100, 200].map(a => <button type="button" key={a} className="chip" aria-pressed={amount === String(a)} onClick={() => setAmount(String(a))}>R{a}</button>)}</div>
      <Field label="Amount (R)" type="number" inputMode="decimal" min="10" max="2000" step="1" value={amount} onChange={e => setAmount(e.target.value)} error={err} hint="Between R10 and R2000. Card payment is simulated in this demo." />
      <button className="btn btn-primary" disabled={busy}>{busy && <ButtonSpinner />} Pay {amount ? rand(amount) : ''} by card</button>
    </form>
  );
}

function RepayForm({ credit, wallet, onDone }) {
  const [amount, setAmount] = useState(String(credit.outstanding));
  const [source, setSource] = useState('CARD');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState();
  const toast = useToast();
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr();
    try {
      const r = await api.post('/wallet/repay', { amount: Number(amount), source });
      toast.success(r.outstanding === 0 ? 'Credit fully repaid. Thank you!' : `Repaid. You now owe ${rand(r.outstanding)}`); onDone();
    } catch (error) { setErr(error.fieldErrors.amount || error.message); } finally { setBusy(false); }
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <h2>Repay student credit</h2>
      <Field label="Amount (R)" type="number" inputMode="decimal" min="1" max={credit.outstanding} value={amount} onChange={e => setAmount(e.target.value)} error={err} hint={`You owe ${rand(credit.outstanding)}`} />
      <div className="chips" role="radiogroup" aria-label="Pay from">
        <button type="button" role="radio" className="chip" aria-checked={source === 'CARD'} aria-pressed={source === 'CARD'} onClick={() => setSource('CARD')}>Card</button>
        <button type="button" role="radio" className="chip" aria-checked={source === 'WALLET'} aria-pressed={source === 'WALLET'} onClick={() => setSource('WALLET')}>Wallet ({rand(wallet.balance)})</button>
      </div>
      <button className="btn btn-primary" disabled={busy}>{busy && <ButtonSpinner />} Repay {amount ? rand(amount) : ''}</button>
    </form>
  );
}
