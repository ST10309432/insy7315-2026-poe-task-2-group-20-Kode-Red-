import { STATUS } from '../utils/format';

export default function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, badge: '' };
  return <span className={`badge ${s.badge}`}>{s.label}</span>;
}
