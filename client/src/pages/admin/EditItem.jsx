import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, Trash2, X, ImagePlus } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Field, { Switch } from '../../components/Field';
import { Loading, ErrorState, ButtonSpinner } from '../../components/States';
import { api, API_ORIGIN } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { CATEGORIES } from '../../utils/format';
import { resizeImage } from '../../utils/image';
import ItemIcon from '../../components/ItemIcon';

const EMPTY = { name: '', description: '', category: 'KOTA', price: 50, salePrice: null, available: true, prepMinutes: 10, extras: [] };

function PhotoCard({ item, onChange }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const blob = await resizeImage(file);
      const updated = await api.upload(`/menu/${item.id}/image`, blob);
      onChange(updated.imageUrl);
      toast.success(`Photo saved (${Math.round(blob.size / 1024)} KB)`);
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { await api.del(`/menu/${item.id}/image`); onChange(null); toast.success('Photo removed'); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }
  return (
    <div className="card stack">
      <h2>Photo</h2>
      <div className="row wrap" style={{ alignItems: 'flex-start' }}>
        <div className={`tone-${item.category}`} style={{ width: 140, aspectRatio: '4 / 3', border: 'var(--line)', borderRadius: 12, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
          {item.imageUrl ? <img src={API_ORIGIN + item.imageUrl} alt={`Current photo of ${item.name}`} className="item-hero" /> : <ItemIcon category={item.category} size={56} />}
        </div>
        <div className="stack" style={{ flex: '1 1 200px', marginTop: 0 }}>
          <p className="xs muted" style={{ margin: 0 }}>A clear photo of the real food helps students choose. JPEG, PNG or WebP; it is resized automatically.</p>
          <div className="row wrap">
            <label className={`btn btn-sm btn-yellow ${busy ? 'disabled' : ''}`} style={{ cursor: busy ? 'wait' : 'pointer' }}>
              {busy ? <ButtonSpinner /> : <ImagePlus size={16} aria-hidden="true" />} {item.imageUrl ? 'Replace photo' : 'Upload photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={pick} disabled={busy} className="sr-only" />
            </label>
            {item.imageUrl && <button type="button" className="btn btn-sm btn-danger" onClick={remove} disabled={busy}>Remove</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

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
      ['id', 'rating', 'ratingCount', 'imageUrl', 'soldOutToday'].forEach(k => delete body[k]);
      const saved = await (isNew ? api.post('/menu', body) : api.put(`/menu/${id}`, body));
      if (isNew) { toast.success('Item added. Now add a photo.'); navigate(`/admin/menu/${saved.id}`, { replace: true }); }
      else { toast.success('Changes saved'); navigate('/admin/menu'); }
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

      {!isNew && <PhotoCard item={form} onChange={imageUrl => setForm(f => ({ ...f, imageUrl }))} />}
      {isNew && <p className="notice small">You can add a photo after saving the item.</p>}

      <div className="card-flat row-between"><div><strong>Available</strong>
        <div className="xs muted">Off = hidden from ordering until you turn it back on. For "sold out today", use the switch on the menu list.</div></div>
        <Switch checked={form.available} label="Available" onChange={v => set('available', v)} /></div>
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
