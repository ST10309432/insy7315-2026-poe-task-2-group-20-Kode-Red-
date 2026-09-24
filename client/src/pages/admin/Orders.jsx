import { useState } from 'react';
import { ClipboardCheck, Clock } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { Skeletons, ErrorState, EmptyState, ButtonSpinner } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { rand, time, METHOD_LABEL } from '../../utils/format';

// The next action for each status (prototype: Accept -> Mark ready -> Collected)
const NEXT = {
  PLACED: { status: 'ACCEPTED', label: 'Accept', cls: 'btn-primary' },
  ACCEPTED: { status: 'READY', label: 'Mark ready', cls: 'btn-yellow' },
  PREPARING: { status: 'READY', label: 'Mark ready', cls: 'btn-yellow' },
  READY: { status: 'COLLECTED', label: 'Collected', cls: 'btn-dark' },
};

export default function Orders() {
  const [scope, setScope] = useState('active');
  const { data: orders, error, loading, reload, setData } = useApi(`/orders?scope=${scope}`, { poll: 5000 });
  const [busy, setBusy] = useState(null);
  const toast = useToast();

  async function move(order, status) {
    setBusy(order.orderNumber + status);
    try {
      const updated = await api.patch(`/orders/${order.orderNumber}/status`, { status });
      setData(list => list.map(o => o.orderNumber === updated.orderNumber ? updated : o)
        .filter(o => scope !== 'active' || !['COLLECTED', 'CANCELLED'].includes(o.status)));
      toast.success(`${order.orderNumber}: ${status.toLowerCase()}`);
    } catch (err) { toast.error(err.message); reload(true); } finally { setBusy(null); }
  }

  return (
    <div>
      <PageHeader title="Order queue"><p className="small muted mt-0">Updates every 5 seconds</p></PageHeader>
      <div className="chips" role="group" aria-label="Show">
        <button className="chip" aria-pressed={scope === 'active'} onClick={() => setScope('active')}>Active</button>
        <button className="chip" aria-pressed={scope === 'today'} onClick={() => setScope('today')}>All today</button>
      </div>
      <div style={{ marginTop: 12 }}>
        {loading && <Skeletons count={4} height={120} />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {orders?.length === 0 && <EmptyState icon={ClipboardCheck} title="All caught up">No orders waiting. New orders appear here automatically.</EmptyState>}
        <div className="grid grid-2">
          {orders?.map(o => {
            const next = NEXT[o.status];
            return (
              <article key={o.orderNumber} className={`card queue-card status-${o.status}`} aria-label={`Order ${o.orderNumber}`}>
                <div className="row-between">
                  <h2 style={{ margin: 0 }}>{o.orderNumber}</h2>
                  <StatusBadge status={o.status} />
                </div>
                <div className="small"><strong>{o.customerName}</strong> · {METHOD_LABEL[o.paymentMethod]} · {rand(o.total)}</div>
                <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                  {o.items.map((it, i) => <li key={i}><strong>{it.quantity}×</strong> {it.name}{it.extras.length > 0 && <span className="muted"> + {it.extras.map(e => e.name).join(', ')}</span>}</li>)}
                </ul>
                <div className="row-between">
                  <span className="xs muted row" style={{ gap: 4 }}><Clock size={14} aria-hidden="true" /> Collect {time(o.collectionTime)}</span>
                  <div className="row" style={{ gap: 8 }}>
                    {o.status === 'PLACED' && (
                      <button className="btn btn-sm btn-danger" disabled={!!busy} onClick={() => move(o, 'CANCELLED')}>Decline</button>
                    )}
                    {next && (
                      <button className={`btn btn-sm ${next.cls}`} disabled={!!busy} onClick={() => move(o, next.status)}>
                        {busy === o.orderNumber + next.status && <ButtonSpinner />} {next.label}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
