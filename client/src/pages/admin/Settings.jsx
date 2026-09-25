import { useEffect, useState } from 'react';
import { Award, Percent, GraduationCap } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Field from '../../components/Field';
import { Loading, ErrorState, ButtonSpinner } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { rand } from '../../utils/format';

/** Business settings: fees, student credit default and loyalty programme (FR-19, FR-23). */
export default function Settings() {
  const { data, error, loading, reload } = useApi('/admin/settings');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => { if (data) setForm(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))); }, [data]);

  if (loading || (!form && !error)) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  async function save(e) {
    e.preventDefault(); setBusy(true); setErrors({});
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)]));
      await api.patch('/admin/settings', body);
      toast.success('Settings saved');
      reload(true);
    } catch (err) { setErrors(err.fieldErrors); toast.error(err.message); } finally { setBusy(false); }
  }

  const pts = Number(form.randsPerPoint) || 1;
  const value = Number(form.pointValue) || 0;
  return (
    <form onSubmit={save} className="stack" style={{ maxWidth: 640, margin: '0 auto' }} noValidate>
      <PageHeader title="Settings" />
      <section className="card stack" aria-labelledby="s-orders">
        <h2 id="s-orders" className="row"><Percent size={20} aria-hidden="true" /> Orders</h2>
        <Field label="Service fee per order (R)" type="number" min="0" step="0.5" value={form.serviceFee} onChange={set('serviceFee')} error={errors.serviceFee} />
      </section>
      <section className="card stack" aria-labelledby="s-credit">
        <h2 id="s-credit" className="row"><GraduationCap size={20} aria-hidden="true" /> Student credit</h2>
        <Field label="Default credit limit for new students (R)" type="number" min="0" step="10" value={form.defaultCreditLimit} onChange={set('defaultCreditLimit')} error={errors.defaultCreditLimit}
          hint="Existing students keep their own limit; change those on the Credit page." />
      </section>
      <section className="card stack" aria-labelledby="s-loyalty">
        <h2 id="s-loyalty" className="row"><Award size={20} aria-hidden="true" /> Loyalty programme</h2>
        <div className="grid grid-2">
          <Field label="Rand spent per point" type="number" min="1" value={form.randsPerPoint} onChange={set('randsPerPoint')} error={errors.randsPerPoint} />
          <Field label="Value of 1 point (R)" type="number" min="0.01" step="0.05" value={form.pointValue} onChange={set('pointValue')} error={errors.pointValue} />
          <Field label="Free meal every … orders" type="number" min="1" value={form.freeMealEvery} onChange={set('freeMealEvery')} error={errors.freeMealEvery} />
          <Field label="Free meal worth up to (R)" type="number" min="1" value={form.freeMealCap} onChange={set('freeMealCap')} error={errors.freeMealCap} />
        </div>
        <p className="notice small" style={{ margin: 0 }}>
          Students earn 1 point per {rand(pts)} spent, so they get back {((value / pts) * 100).toFixed(1)}% as points.
          Every {form.freeMealEvery || '…'} orders earns a free meal worth up to {rand(form.freeMealCap)}.
        </p>
      </section>
      <button className="btn btn-primary btn-block" disabled={busy}>{busy && <ButtonSpinner />} Save settings</button>
    </form>
  );
}
