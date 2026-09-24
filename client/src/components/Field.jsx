import { useId } from 'react';

/** Labelled input with hint and error message wired up for screen readers. */
export default function Field({ label, error, hint, as = 'input', children, ...props }) {
  const id = useId();
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  const Tag = as;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children || <Tag id={id} className={as === 'select' ? 'select' : 'input'} aria-invalid={!!error} aria-describedby={describedBy} {...props} />}
      {hint && !error && <span id={`${id}-hint`} className="hint">{hint}</span>}
      {error && <span id={`${id}-err`} className="field-error">{error}</span>}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} aria-label={label} />
      <span aria-hidden="true" />
    </label>
  );
}
