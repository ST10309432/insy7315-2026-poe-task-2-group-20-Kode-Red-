import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dateTime } from '../utils/format';

/** Bell with unread count. Polls every 20s; pops a toast when something new arrives (FR-14, FR-27). */
export default function NotificationBell() {
  const { user } = useAuth();
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const seen = useRef(null);
  const wrap = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    const load = async () => {
      try {
        const d = await api.get('/notifications');
        if (!alive) return;
        if (seen.current !== null) {
          d.items.filter(n => !n.isRead && n.id > seen.current).slice(0, 2).forEach(n => toast.info(n.title));
        }
        seen.current = Math.max(seen.current ?? 0, ...d.items.map(n => n.id), 0);
        setData(d);
      } catch { /* offline or logged out — try again next tick */ }
    };
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 20000);
    return () => { alive = false; clearInterval(id); };
  }, [user, toast]);

  useEffect(() => {
    if (!open) return undefined;
    const close = e => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const esc = e => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!user) return null;

  async function openItem(n) {
    setOpen(false);
    if (!n.isRead) {
      setData(d => ({ items: d.items.map(x => x.id === n.id ? { ...x, isRead: true } : x), unread: Math.max(0, d.unread - 1) }));
      api.patch(`/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.link) navigate(n.link);
  }
  async function readAll() {
    setData(d => ({ items: d.items.map(x => ({ ...x, isRead: true })), unread: 0 }));
    api.patch('/notifications/read-all').catch(() => {});
  }

  return (
    <div className="notif-wrap" ref={wrap}>
      <button className="icon-btn" style={{ position: 'relative' }} onClick={() => setOpen(o => !o)} aria-expanded={open}
        aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ''}`}>
        <Bell size={20} aria-hidden="true" />
        {data.unread > 0 && <span className="count-dot">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>
      {open && (
        <div className="notif-panel card" role="dialog" aria-label="Notifications">
          <div className="row-between" style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Notifications</h2>
            {data.unread > 0 && <button className="btn btn-sm" onClick={readAll}><CheckCheck size={16} aria-hidden="true" /> Mark all read</button>}
          </div>
          {data.items.length === 0 && <p className="muted small" style={{ margin: '12px 0' }}>Nothing yet. Order updates will show up here.</p>}
          <ul className="notif-list">
            {data.items.map(n => (
              <li key={n.id}>
                <button className={`notif-item ${n.isRead ? '' : 'unread'}`} onClick={() => openItem(n)}>
                  <span className="notif-dot" aria-hidden="true" />
                  <span>
                    <strong>{n.title}</strong>
                    {n.body && <span className="xs muted" style={{ display: 'block' }}>{n.body}</span>}
                    <span className="xs muted">{dateTime(n.createdAt)}{!n.isRead && <span className="sr-only"> (unread)</span>}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
