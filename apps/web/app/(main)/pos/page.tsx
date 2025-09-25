'use client';

import { FormEvent, useMemo, useState } from 'react';

type PaymentMethod = 'CASH' | 'CARD' | 'EWALLET';

type OrderItem = {
  description: string;
  qty: number;
  unitPrice: number;
};

type Order = {
  receipt: string;
  customer: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
};

const initialOrders: Order[] = [
  {
    receipt: 'BRHQ-20240423-0001',
    customer: 'Aina',
    subtotal: 5000,
    discount: 250,
    tax: 285,
    total: 5035,
    paymentMethod: 'EWALLET',
    items: [
      { description: 'Tealive Brown Sugar Pearl Milk Tea', qty: 2, unitPrice: 1200 },
      { description: 'Sanitised Straw Set', qty: 2, unitPrice: 50 },
      { description: 'Reusable Cup Deposit', qty: 2, unitPrice: 100 }
    ]
  },
  {
    receipt: 'BRHQ-20240423-0002',
    customer: 'Daniel',
    subtotal: 12000,
    discount: 0,
    tax: 720,
    total: 12720,
    paymentMethod: 'CASH',
    items: [
      { description: 'Lunch Set A', qty: 3, unitPrice: 3200 },
      { description: 'Lunch Set B', qty: 1, unitPrice: 2400 }
    ]
  }
];

const paymentMethods: PaymentMethod[] = ['CASH', 'CARD', 'EWALLET'];

const formatCurrency = (cents: number) => `RM ${(cents / 100).toFixed(2)}`;

function calculateSst(amountCents: number) {
  return Math.round((amountCents * 6) / 100);
}

export default function PosPage() {
  const [orders, setOrders] = useState(initialOrders);
  const [sequence, setSequence] = useState(initialOrders.length);
  const [printedReceipt, setPrintedReceipt] = useState('');
  const [invoiceDraft, setInvoiceDraft] = useState<
    | {
        customer: string;
        items: OrderItem[];
        sourceReceipt: string;
      }
    | null
  >(null);
  const [invoiceDraftMessage, setInvoiceDraftMessage] = useState('');
  const [linkTarget, setLinkTarget] = useState<
    | {
        receipt: string;
        customer: string;
        invoiceNo: string;
      }
    | null
  >(null);
  const [linkMessage, setLinkMessage] = useState('');
  const [form, setForm] = useState({
    customer: '',
    subtotal: '0',
    discount: '0',
    paymentMethod: 'CASH' as PaymentMethod
  });

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.sales += order.total;
        return acc;
      },
      { sales: 0 }
    );
  }, [orders]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subtotalFloat = parseFloat(form.subtotal || '0');
    const discountFloat = parseFloat(form.discount || '0');
    if (Number.isNaN(subtotalFloat) || subtotalFloat <= 0 || !form.customer.trim()) {
      return;
    }
    const subtotalCents = Math.round(subtotalFloat * 100);
    const discountCents = Math.round(Math.min(discountFloat, subtotalFloat) * 100);
    const discounted = subtotalCents - discountCents;
    const tax = calculateSst(discounted);
    const total = discounted + tax;
    const nextSequence = sequence + 1;
    const now = new Date();
    const receipt = `BRHQ-${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${nextSequence
      .toString()
      .padStart(4, '0')}`;

    const order: Order = {
      receipt,
      customer: form.customer.trim(),
      subtotal: subtotalCents,
      discount: discountCents,
      tax,
      total,
      paymentMethod: form.paymentMethod,
      items: [
        {
          description: 'POS Custom Sale Item',
          qty: 1,
          unitPrice: discounted
        }
      ]
    };

    setOrders((current) => [order, ...current]);
    setSequence(nextSequence);
    setForm({ customer: '', subtotal: '0', discount: '0', paymentMethod: 'CASH' });
  };

  const handlePrint = (receipt: string) => {
    setPrintedReceipt(receipt);
  };

  const handleInvoiceDraft = (order: Order) => {
    setInvoiceDraft({ customer: order.customer, items: order.items, sourceReceipt: order.receipt });
    setInvoiceDraftMessage('');
  };

  const handleInvoiceDraftConfirm = () => {
    if (!invoiceDraft) {
      return;
    }
    setInvoiceDraftMessage(
      `Invoice draft for ${invoiceDraft.customer} prepared from receipt ${invoiceDraft.sourceReceipt}.`
    );
    setInvoiceDraft(null);
  };

  const handleLinkInvoice = (order: Order) => {
    setLinkTarget({ receipt: order.receipt, customer: order.customer, invoiceNo: '' });
    setLinkMessage('');
  };

  const handleLinkSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!linkTarget || !linkTarget.invoiceNo.trim()) {
      return;
    }
    setLinkMessage(`Receipt ${linkTarget.receipt} linked to invoice ${linkTarget.invoiceNo.trim()}.`);
    setLinkTarget(null);
  };

  return (
    <div className="stats-grid" style={{ gap: '1.5rem' }}>
      <section>
        <h2 className="heading">Point of Sale</h2>
        <p className="subheading">
          Discounts applied before SST (6%) with half-up rounding, followed by tax computation.
        </p>
      </section>

      <section className="stat-card">
        <h3 className="heading">Create Sale</h3>
        <form
          className="stats-grid"
          style={{ gap: '0.75rem' }}
          onSubmit={handleSubmit}
          data-testid="pos-form"
        >
          <label className="label">
            Customer
            <input
              className="input"
              name="customer"
              value={form.customer}
              onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))}
              data-testid="pos-customer"
            />
          </label>
          <label className="label">
            Subtotal (RM)
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              name="subtotal"
              value={form.subtotal}
              onChange={(event) => setForm((current) => ({ ...current, subtotal: event.target.value }))}
              data-testid="pos-subtotal"
            />
          </label>
          <label className="label">
            Discount (RM)
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              name="discount"
              value={form.discount}
              onChange={(event) => setForm((current) => ({ ...current, discount: event.target.value }))}
              data-testid="pos-discount"
            />
          </label>
          <label className="label">
            Payment Method
            <select
              className="input"
              name="paymentMethod"
              value={form.paymentMethod}
              onChange={(event) =>
                setForm((current) => ({ ...current, paymentMethod: event.target.value as PaymentMethod }))
              }
              data-testid="pos-payment"
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="button-primary" data-testid="pos-submit">
            Create Sale
          </button>
        </form>
        {printedReceipt ? (
          <p className="subheading">PDF print queued for {printedReceipt}.</p>
        ) : null}
        {invoiceDraftMessage ? <p className="subheading">{invoiceDraftMessage}</p> : null}
        {linkMessage ? <p className="subheading">{linkMessage}</p> : null}
        <p className="subheading">Total sales today: {formatCurrency(totals.sales)}</p>
      </section>

      {invoiceDraft ? (
        <section className="stat-card">
          <h3 className="heading">Create Invoice from Sale</h3>
          <p className="subheading">
            Customer {invoiceDraft.customer} from receipt {invoiceDraft.sourceReceipt} will be pre-filled.
          </p>
          <table className="table" style={{ marginBottom: '1rem' }}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {invoiceDraft.items.map((item, index) => (
                <tr key={`${item.description}-${index}`}>
                  <td>{item.description}</td>
                  <td>{item.qty}</td>
                  <td>{formatCurrency(item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="button-row">
            <button type="button" className="button-primary" onClick={handleInvoiceDraftConfirm}>
              Save Invoice Draft
            </button>
            <button type="button" className="button-secondary" onClick={() => setInvoiceDraft(null)}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {linkTarget ? (
        <section className="stat-card">
          <h3 className="heading">Link Sale to Existing Invoice</h3>
          <p className="subheading">Customer {linkTarget.customer} selected from receipt {linkTarget.receipt}.</p>
          <form className="stats-grid" style={{ gap: '0.75rem' }} onSubmit={handleLinkSubmit}>
            <label className="label">
              Invoice Number
              <input
                className="input"
                value={linkTarget.invoiceNo}
                onChange={(event) =>
                  setLinkTarget((current) =>
                    current ? { ...current, invoiceNo: event.target.value.toUpperCase() } : null
                  )
                }
                placeholder="INVBRHQ-20240423-0001"
              />
            </label>
            <div className="button-row">
              <button type="submit" className="button-primary">
                Link Invoice
              </button>
              <button type="button" className="button-secondary" onClick={() => setLinkTarget(null)}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section>
        <table className="table" data-testid="pos-table">
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Customer</th>
              <th>Payment</th>
              <th>Subtotal</th>
              <th>Discount</th>
              <th>SST (6%)</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.receipt}>
                <td>{order.receipt}</td>
                <td>{order.customer}</td>
                <td>{order.paymentMethod}</td>
                <td>{formatCurrency(order.subtotal)}</td>
                <td>{formatCurrency(order.discount)}</td>
                <td>{formatCurrency(order.tax)}</td>
                <td>{formatCurrency(order.total)}</td>
                <td>
                  <div className="button-column" style={{ gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => handlePrint(order.receipt)}
                      data-testid={`print-${order.receipt}`}
                    >
                      Print PDF
                    </button>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => handleInvoiceDraft(order)}
                    >
                      Create Invoice from Sale
                    </button>
                    <button type="button" className="button-secondary" onClick={() => handleLinkInvoice(order)}>
                      Link to Existing Invoice
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
