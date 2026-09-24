import { Link } from 'react-router-dom';
import { Sandwich } from 'lucide-react';

export default function Brand({ to = '/', sub = 'Kasi kotas' }) {
  return (
    <Link to={to} className="brand" aria-label="Thabang Phala home">
      <span className="brand-mark"><Sandwich size={22} strokeWidth={2.4} aria-hidden="true" /></span>
      <span><strong>PHALA</strong><small>{sub}</small></span>
    </Link>
  );
}
