import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);
  const show = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t.slice(-2), { id, message, type }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const api = useMemo(() => ({ success: m => show(m, 'success'), error: m => show(m, 'error'), info: m => show(m, 'info') }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <Icon size={20} aria-hidden="true" />
              <span>{t.message}</span>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss message"><X size={18} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
