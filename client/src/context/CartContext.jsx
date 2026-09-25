import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Cart lines: { key, itemId, name, category, unitPrice, quantity, extras: [{id,name,price}] }
const CartContext = createContext(null);
const KEY = 'tp_cart';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

export function CartProvider({ children }) {
  const [lines, setLines] = useState(load);
  const [collectionTime, setCollectionTime] = useState('ASAP');

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* ignore */ } }, [lines]);

  const value = useMemo(() => {
    const add = (item, quantity, extras) => {
      const key = `${item.id}:${extras.map(e => e.id).sort().join(',')}`;
      const unitPrice = (item.salePrice ?? item.price) + extras.reduce((s, e) => s + e.price, 0);
      setLines(ls => {
        const existing = ls.find(l => l.key === key);
        if (existing) return ls.map(l => l.key === key ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l);
        return [...ls, { key, itemId: item.id, name: item.name, category: item.category, imageUrl: item.imageUrl, unitPrice, quantity, extras }];
      });
    };
    const setQuantity = (key, q) => setLines(ls => q <= 0 ? ls.filter(l => l.key !== key) : ls.map(l => l.key === key ? { ...l, quantity: Math.min(20, q) } : l));
    const clear = () => setLines([]);
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = Math.round(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100) / 100;
    return { lines, add, setQuantity, clear, count, subtotal, collectionTime, setCollectionTime };
  }, [lines, collectionTime]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
