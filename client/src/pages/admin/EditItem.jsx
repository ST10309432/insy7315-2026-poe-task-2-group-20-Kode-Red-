import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Field, { Switch } from '../../components/Field';
import { Loading, ErrorState, ButtonSpinner } from '../../components/States';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { CATEGORIES } from '../../utils/format';

const EMPTY = { name: '', description: '', category: 'KOTA', price: 50, salePrice: null, available: true, prepMinutes: 10, extras: [] };

export default function EditItem() {
  const { id } = useParams();
  const isNew = !id;
  const [form, setForm] = useState(isNew ? EMPTY : null);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isNew) return;
    api.get(`/menu/${id}`).then(i => setForm({ ...i, extras: i.extras.map(({ name, price }) => ({ name, price })) })).catch(setLoadError);
  }, [id, isNew]);

  if (loadError) return <ErrorState error={loadError} />;
  if (!form) return <Loading />;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const onSale = form.salePrice != null;

  async function save(e) {
    e.preventDefault(); setBusy(true); setErrors({});
    try {
      const body = { ...form, price: Number(form.price), salePrice: onSale ? Number(form.salePrice) : null,
        prepMinutes: Number(form.prepMinutes), extras: form.extras.filter(x => x.name.trim()).map(x => ({ name: x.name, price: Number(x.price) || 0 })) };
      delete body.id; delete body.rating;
      await (isNew ? api.post('/menu', body) : api.put(`/menu/${id}`, body));
      toast.success(isNew ? 'Item added to the menu' : 'Changes saved');
      navigate('/admin/menu');
    } catch (err) { setErrors(err.fieldErrors); toast.error(err.message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm(`Delete ${form.name}? This cannot be undone.`)) return;
    try { await api.del(`/menu/${id}`); toast.success('Item deleted'); navigate('/admin/menu'); }
    catch (err) { toast.error(err.message); }
  }

  return (
    <form onSubmit={save} style={{ maxWidth: 620, margin: '0 auto' }} className="stack" noValidate>
      <PageHeader title={isNew ? 'Add item' : 'Edit item'} back="/admin/menu" />
      <div className="card stack">
        <Field label="Name" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} required />
        <Field label="Description" value={form.description} onChange={e => set('description', e.target.value)} error={errors.description} />
        <div className="field">
          <span className="label" id="price-label">Price (R)</span>
          <div className="row">
            <input className="input" aria-labelledby="price-label" type="number" min="1" step="0.5" value={form.price} onChange={e => set('price', e.target.value)} aria-invalid={!!errors.price} />
            <button type="button" className="icon-btn" aria-label="Decrease price by R5" onClick={() => set('price', Math.max(1, Number(form.price) - 5))}><Minus size={18} /></button>
            <button type="button" className="icon-btn" style={{ background: 'var(--orange-btn)', color: '#fff' }} aria-label="Increase price by R5" onClick={() => set('price', Number(form.price) + 5)}><Plus size={18} /></button>
          </div>
          {errors.price && <span className="field-error">{errors.price}</span>}
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ marginBottom: 6 }}>Category</legend>
          <div className="chips">{CATEGORIES.map(c => <button type="button" key={c.key} className="chip" aria-pressed={form.category === c.key} onClick={() => set('category', c.key)}>{c.label}</button>)}</div>
        </fieldset>
        <Field label="Prep time (minutes)" type="number" min="1" max="120" value={form.prepMinutes} onChange={e => set('prepMinutes', e.target.value)} error={errors.prepMinutes} />
      </div>

      <div className="card-flat row-between"><div><strong>Available today</strong><div className="xs muted">Show it to students</div></div>
        <Switch checked={form.available} label="Available today" onChange={v => set('available', v)} /></div>
      <div className="card-flat stack">
        <div className="row-between"><div><strong>On sale</strong><div className="xs muted">Apply a discounted price</div></div>
          <Switch checked={onSale} label="On sale" onChange={v => set('salePrice', v ? Math.max(1, Math.round(Number(form.price) * 0.8)) : null)} /></div>
        {onSale && <Field label="Sale price (R)" type="number" min="1" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} error={errors.salePrice} hint="Must be lower than the normal price" />}
      </div>

      <div className="card stack">
        <h2>Extras</h2>
        {form.extras.map((x, i) => (
          <div key={i} className="row">
            <input className="input" aria-label={`Extra ${i + 1} name`} value={x.name} placeholder="e.g. Cheese slice" onChange={e => set('extras', form.extras.map((y, j) => j === i ? { ...y, name: e.target.value } : y))} />
            <input className="input" style={{ maxWidth: 110 }} aria-label={`Extra ${i + 1} price`} type="number" min="0" value={x.price} onChange={e => set('extras', form.extras.map((y, j) => j === i ? { ...y, price: e.target.value } : y))} />
            <button type="button" className="icon-btn" aria-label={`Remove extra ${x.name || i + 1}`} onClick={() => set('extras', form.extras.filter((_, j) => j !== i))}><X size={18} /></button>
          </div>
        ))}
        <button type="button" className="btn btn-sm" style={{ justifySelf: 'start' }} onClick={() => set('extras', [...form.extras, { name: '', price: 0 }])}><Plus size={16} aria-hidden="true" /> Add extra</button>
      </div>

      <button className="btn btn-primary btn-block" disabled={busy}>{busy && <ButtonSpinner />} {isNew ? 'Add to menu' : 'Save changes'}</button>
      {!isNew && <button type="button" className="btn btn-danger btn-block" onClick={remove}><Trash2 size={18} aria-hidden="true" /> Delete item</button>}
    </form>
  );
}
