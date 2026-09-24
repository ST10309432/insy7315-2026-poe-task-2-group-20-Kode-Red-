export const rand = n => `R${Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const randShort = n => `R${Number(n || 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
export const time = d => new Date(d).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
export const dateTime = d => new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const date = d => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
export const itemPrice = item => item.salePrice ?? item.price;

export const CATEGORIES = [
  { key: 'KOTA', label: 'Kotas' },
  { key: 'CHIPS', label: 'Chips' },
  { key: 'DRINK', label: 'Cooldrinks' },
  { key: 'COMBO', label: 'Combos' },
];

export const STATUS = {
  PLACED: { label: 'New', badge: 'badge-orange' },
  ACCEPTED: { label: 'Accepted', badge: 'badge-yellow' },
  PREPARING: { label: 'Preparing', badge: 'badge-yellow' },
  READY: { label: 'Ready', badge: 'badge-green' },
  COLLECTED: { label: 'Collected', badge: 'badge-grey' },
  CANCELLED: { label: 'Cancelled', badge: 'badge-red' },
};

export const METHOD_LABEL = { WALLET: 'Wallet', CREDIT: 'Student Credit', CARD: 'Card' };
