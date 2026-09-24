import { AlertTriangle, RefreshCw } from 'lucide-react';

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p className="muted small">{label}</p>
    </div>
  );
}

export function Skeletons({ count = 3, height = 76 }) {
  return (
    <div className="list" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <div key={i} className="skeleton" style={{ height }} />)}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state card" role="alert">
      <AlertTriangle size={32} aria-hidden="true" />
      <h3>Something went wrong</h3>
      <p className="muted">{error?.message || 'Please try again.'}</p>
      {onRetry && <button className="btn" onClick={() => onRetry()}><RefreshCw size={18} aria-hidden="true" /> Try again</button>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="state card">
      {Icon && <Icon size={36} aria-hidden="true" />}
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function ButtonSpinner() {
  return <span className="spinner spinner-sm" aria-hidden="true" />;
}
