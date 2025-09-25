'use client';

import { useMemo, useState } from 'react';
import type { Dictionary } from '../../lib/i18n';

type CartItem = {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  discount: number;
};

type POSCartProps = {
  initialItems: CartItem[];
  dict: Dictionary;
};

function roundHalfUp(value: number) {
  return Math.round(value * 100 + Number.EPSILON) / 100;
}

function formatCurrency(value: number) {
  return `RM ${value.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}`;
}

export function POSCart({ initialItems, dict }: POSCartProps) {
  const [items, setItems] = useState<CartItem[]>(initialItems);

  const summary = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = items.reduce((sum, item) => sum + item.discount * item.quantity, 0);
    const net = subtotal - discount;
    const tax = roundHalfUp(net * 0.06);
    const total = roundHalfUp(net + tax);
    return { subtotal, discount, tax, total };
  }, [items]);

  const updateQuantity = (id: string, delta: number) => {
    setItems((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const addItem = () => {
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      name: 'Add-on Service',
      sku: `AD-${Math.floor(Math.random() * 999)}`,
      price: 35,
      quantity: 1,
      discount: 0
    };
    setItems((current) => [...current, newItem]);
  };

  return (
    <div className="pos-cart">
      <div className="pos-cart__items">
        {items.length === 0 && <p>{dict.posEmpty}</p>}
        {items.map((item) => (
          <div key={item.id} className="pos-cart__item">
            <div>
              <strong>{item.name}</strong>
              <small>
                {item.sku} · {formatCurrency(item.price)}
              </small>
            </div>
            <div className="language-group">
              <button type="button" className="theme-toggle" onClick={() => updateQuantity(item.id, -1)}>
                −
              </button>
              <span className="theme-toggle" aria-live="polite">
                {item.quantity}
              </span>
              <button type="button" className="theme-toggle" onClick={() => updateQuantity(item.id, 1)}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pos-cart__summary">
        <div className="flex space-between">
          <span>{dict.subtotal}</span>
          <strong>{formatCurrency(summary.subtotal)}</strong>
        </div>
        <div className="flex space-between">
          <span>{dict.discount}</span>
          <strong>-{formatCurrency(summary.discount)}</strong>
        </div>
        <div className="flex space-between">
          <span>{dict.tax}</span>
          <strong>{formatCurrency(summary.tax)}</strong>
        </div>
        <div className="flex space-between">
          <span>{dict.total}</span>
          <strong>{formatCurrency(summary.total)}</strong>
        </div>
        <button type="button" className="button-primary">
          {dict.checkout}
        </button>
        <button type="button" className="theme-toggle" onClick={addItem}>
          {dict.addItem}
        </button>
      </div>
    </div>
  );
}
