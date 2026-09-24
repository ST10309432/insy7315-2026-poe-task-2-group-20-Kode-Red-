import { Sandwich, Popcorn, CupSoda, Package, Flame } from 'lucide-react';

const ICONS = { KOTA: Sandwich, CHIPS: Popcorn, DRINK: CupSoda, COMBO: Package, DEALS: Flame };

/** Category illustration tile (no stock photos yet — swap for real food photos later). */
export default function ItemIcon({ category, size = 48, className = '' }) {
  const Icon = ICONS[category] || Package;
  return (
    <span className={`item-icon tone-${category} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.2} />
    </span>
  );
}
