import { Sandwich, Popcorn, CupSoda, Package, Flame } from 'lucide-react';
import { API_ORIGIN } from '../api/client';

const ICONS = { KOTA: Sandwich, CHIPS: Popcorn, DRINK: CupSoda, COMBO: Package, DEALS: Flame };

/** Category illustration tile (no stock photos yet — swap for real food photos later). */
/** Real food photo when the item has one (FR-02), otherwise the category illustration. */
export function ItemThumb({ item, size = 48, className = '' }) {
  if (item?.imageUrl) {
    return <img src={API_ORIGIN + item.imageUrl} alt="" loading="lazy" className={`item-photo ${className}`} style={{ width: size, height: size }} />;
  }
  return <ItemIcon category={item?.category} size={size} className={className} />;
}

/** Full-width photo for cards and the item page. */
export function ItemHero({ item, iconSize = 56 }) {
  if (item?.imageUrl) return <img src={API_ORIGIN + item.imageUrl} alt={item.name} className="item-hero" loading="lazy" />;
  return <ItemIcon category={item?.category} size={iconSize} />;
}

export default function ItemIcon({ category, size = 48, className = '' }) {
  const Icon = ICONS[category] || Package;
  return (
    <span className={`item-icon tone-${category} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.2} />
    </span>
  );
}
