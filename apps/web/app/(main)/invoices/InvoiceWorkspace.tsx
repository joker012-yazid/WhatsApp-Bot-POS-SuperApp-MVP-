'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Dictionary, Lang } from '../../lib/i18n';
import type { Invoice, InvoicePayment, InvoiceStatus, PaymentMethod } from './data';

type InvoiceFormLine = {
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
  taxCode: string;
};

type InvoiceFormState = {
  branch: string;
  customer: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  items: InvoiceFormLine[];
};

type PaymentFormState = {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
};

type Props = {
  initialInvoices: Invoice[];
  dict: Dictionary;
  lang: Lang;
};

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

const calculateTotals = (lines: InvoiceFormLine[]) => {
  const itemsTotal = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
  const discountTotal = lines.reduce((sum, line) => sum + line.discount, 0);
  const taxableSubtotal = Math.max(itemsTotal - discountTotal, 0);
  const sst = roundCurrency(taxableSubtotal * 0.06);
  const grandTotal = roundCurrency(taxableSubtotal + sst);
  return { itemsTotal: roundCurrency(itemsTotal), discountTotal: roundCurrency(discountTotal), taxableSubtotal: roundCurrency(taxableSubtotal), sst, grandTotal };
};

const formatCurrency = (value: number, lang: Lang) =>
  value.toLocaleString(lang === 'en' ? 'en-MY' : 'ms-MY', { style: 'currency', currency: 'MYR' });

const translateStatus = (status: InvoiceStatus, dict: Dictionary) => {
  switch (status) {
    case 'DRAFT':
      return dict.invoiceStatusDraft;
    case 'SENT':
      return dict.invoiceStatusSent;
    case 'PARTIALLY_PAID':
      return dict.invoiceStatusPartiallyPaid;
    case 'PAID':
      return dict.invoiceStatusPaid;
    case 'VOID':
      return dict.invoiceStatusVoid;
    default:
      return status;
  }
};

const randomSequence = () => Math.floor(100 + Math.random() * 900).toString();

const buildInvoiceNumber = (branch: string) => {
  const today = new Date();
  const y = today.getFullYear();
  const m = `${today.getMonth() + 1}`.padStart(2, '0');
  const d = `${today.getDate()}`.padStart(2, '0');
  return `INV${branch}-${y}${m}${d}-${randomSequence()}`;
};

export function InvoiceWorkspace({ initialInvoices, dict, lang }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [filter, setFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceFormState>(() => ({
    branch: initialInvoices[0]?.branch ?? 'BR-HQ',
    customer: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    notes: '',
    items: [
      {
        description: '',
        qty: 1,
        unitPrice: 0,
        discount: 0,
        taxCode: 'SR'
      }
    ]
  }));
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(() => ({
    invoiceId: initialInvoices[0]?.id ?? '',
    amount: 0,
    method: 'CASH',
    reference: ''
  }));

  const filteredInvoices = useMemo(() => {
    if (filter === 'ALL') {
      return invoices;
    }
    return invoices.filter((invoice) => invoice.status === filter);
  }, [filter, invoices]);

  const handleLineChange = (index: number, key: keyof InvoiceFormLine, value: string) => {
    setForm((prev) => {
      const updated = [...prev.items];
      const line = { ...updated[index] };
      if (key === 'qty' || key === 'unitPrice' || key === 'discount') {
        line[key] = Number(value) || 0;
      } else {
        line[key] = value;
      }
      updated[index] = line;
      return { ...prev, items: updated };
    });
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', qty: 1, unitPrice: 0, discount: 0, taxCode: 'SR' }]
    }));
  };

  const handleFormChange = (key: keyof Omit<InvoiceFormState, 'items'>, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitInvoice = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validLines = form.items.filter((line) => line.description.trim() && line.qty > 0);
    if (!form.customer.trim() || validLines.length === 0) {
      setToast(dict.toastInvoiceVoid);
      return;
    }
    const totals = calculateTotals(validLines);
    const id = `inv-${Date.now()}`;
    const invoice: Invoice = {
      id,
      invoiceNo: buildInvoiceNumber(form.branch),
      branch: form.branch,
      customer: form.customer,
      status: 'DRAFT',
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      notes: form.notes,
      totals: {
        ...totals,
        paidTotal: 0,
        balanceDue: totals.grandTotal
      },
      items: validLines.map((line, index) => ({
        id: `${id}-${index}`,
        description: line.description,
        qty: line.qty,
        unitPrice: line.unitPrice,
        discount: line.discount,
        taxCode: line.taxCode,
        lineTotal: roundCurrency(line.qty * line.unitPrice - line.discount)
      })),
      payments: [],
      einvoice: {
        status: 'PENDING'
      }
    };
    setInvoices((prev) => [invoice, ...prev]);
    setForm({
      branch: form.branch,
      customer: '',
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      notes: '',
      items: [{ description: '', qty: 1, unitPrice: 0, discount: 0, taxCode: 'SR' }]
    });
    setToast(dict.toastInvoiceCreated);
  };

  const updateInvoice = (invoiceId: string, updater: (invoice: Invoice) => Invoice) => {
    setInvoices((prev) => prev.map((invoice) => (invoice.id === invoiceId ? updater(invoice) : invoice)));
  };

  const sendInvoice = (invoiceId: string) => {
    updateInvoice(invoiceId, (invoice) => ({ ...invoice, status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status }));
    setToast(dict.toastInvoiceSent);
  };

  const voidInvoice = (invoiceId: string) => {
    updateInvoice(invoiceId, (invoice) => ({ ...invoice, status: 'VOID' }));
    setToast(dict.toastInvoiceVoid);
  };

  const scheduleEinvoice = (invoiceId: string) => {
    updateInvoice(invoiceId, (invoice) => ({
      ...invoice,
      einvoice: {
        submissionId: invoice.einvoice?.submissionId ?? `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'SENT',
        lastPolledAt: new Date().toISOString()
      }
    }));
    setToast(dict.toastInvoiceEinvoiceSubmitted);
  };

  const linkPosSale = (invoiceId: string) => {
    updateInvoice(invoiceId, (invoice) => ({
      ...invoice,
      posSaleId: invoice.posSaleId ? undefined : `pos-${Math.floor(Math.random() * 9999)}`
    }));
  };

  const recordPayment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentForm.invoiceId) {
      return;
    }
    const amount = roundCurrency(paymentForm.amount);
    if (amount <= 0) {
      return;
    }
    updateInvoice(paymentForm.invoiceId, (invoice) => {
      const payment: InvoicePayment = {
        id: `pay-${Date.now()}`,
        method: paymentForm.method,
        amount,
        reference: paymentForm.reference || undefined,
        paidAt: new Date().toISOString()
      };
      const payments = [payment, ...invoice.payments];
      const paidTotal = roundCurrency(payments.reduce((sum, item) => sum + item.amount, 0));
      const balanceDue = Math.max(roundCurrency(invoice.totals.grandTotal - paidTotal), 0);
      const status = balanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
      return {
        ...invoice,
        payments,
        totals: {
          ...invoice.totals,
          paidTotal,
          balanceDue
        },
        status
      };
    });
    setToast(dict.toastInvoicePaymentRecorded);
    setPaymentForm((prev) => ({ ...prev, amount: 0, reference: '' }));
  };

  return (
    <div className="stack gap-lg">
      {toast && <div className="toast">{toast}</div>}
      <section className="stack gap-md">
        <h2 className="section-heading">{dict.invoicesTitle}</h2>
        <p className="section-subheading">{dict.invoicesSubtitle}</p>
      </section>

      <section className="panel">
        <h3>{dict.invoicesCreateTitle}</h3>
        <p className="section-subheading">{dict.invoicesCreateDescription}</p>
        <form className="form-grid" onSubmit={submitInvoice}>
          <div className="form-row">
            <label>
              {dict.formBranchLabel}
              <input value={form.branch} onChange={(event) => handleFormChange('branch', event.target.value)} required />
            </label>
            <label>
              {dict.formCustomerLabel}
              <input value={form.customer} onChange={(event) => handleFormChange('customer', event.target.value)} required />
            </label>
            <label>
              {dict.formIssueDateLabel}
              <input type="date" value={form.issueDate} onChange={(event) => handleFormChange('issueDate', event.target.value)} required />
            </label>
            <label>
              {dict.formDueDateLabel}
              <input type="date" value={form.dueDate} onChange={(event) => handleFormChange('dueDate', event.target.value)} required />
            </label>
          </div>
          <label className="form-full">
            {dict.formNotesLabel}
            <textarea value={form.notes} onChange={(event) => handleFormChange('notes', event.target.value)} rows={3} />
          </label>
          <div className="form-lines">
            <div className="form-lines__header">{dict.formItemsHeader}</div>
            {form.items.map((line, index) => (
              <div key={index} className="form-lines__row">
                <input
                  placeholder={dict.formLineDescription}
                  value={line.description}
                  onChange={(event) => handleLineChange(index, 'description', event.target.value)}
                  required
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.qty}
                  onChange={(event) => handleLineChange(index, 'qty', event.target.value)}
                  required
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.unitPrice}
                  onChange={(event) => handleLineChange(index, 'unitPrice', event.target.value)}
                  required
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={line.discount}
                  onChange={(event) => handleLineChange(index, 'discount', event.target.value)}
                />
                <input value={line.taxCode} onChange={(event) => handleLineChange(index, 'taxCode', event.target.value)} />
              </div>
            ))}
            <button type="button" className="secondary" onClick={addLine}>
              {dict.formAddLine}
            </button>
          </div>
          <div className="form-summary">
            {(() => {
              const totals = calculateTotals(form.items);
              return (
                <ul>
                  <li>
                    {dict.quoteDetailTotalsItems}: {formatCurrency(totals.itemsTotal, lang)}
                  </li>
                  <li>
                    {dict.quoteDetailTotalsDiscount}: {formatCurrency(totals.discountTotal, lang)}
                  </li>
                  <li>
                    {dict.quoteDetailTotalsTaxable}: {formatCurrency(totals.taxableSubtotal, lang)}
                  </li>
                  <li>
                    {dict.quoteDetailTotalsSst}: {formatCurrency(totals.sst, lang)}
                  </li>
                  <li>
                    {dict.quoteDetailTotalsGrand}: {formatCurrency(totals.grandTotal, lang)}
                  </li>
                </ul>
              );
            })()}
          </div>
          <button type="submit" className="primary">
            {dict.formSubmitInvoice}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="table-actions">
          <label>
            {dict.commonFilterStatus}
            <select value={filter} onChange={(event) => setFilter(event.target.value as InvoiceStatus | 'ALL')}>
              <option value="ALL">{dict.commonFilterAll}</option>
              <option value="DRAFT">{dict.invoiceStatusDraft}</option>
              <option value="SENT">{dict.invoiceStatusSent}</option>
              <option value="PARTIALLY_PAID">{dict.invoiceStatusPartiallyPaid}</option>
              <option value="PAID">{dict.invoiceStatusPaid}</option>
              <option value="VOID">{dict.invoiceStatusVoid}</option>
            </select>
          </label>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>{dict.tableInvoiceNumber}</th>
              <th>{dict.tableCustomer}</th>
              <th>{dict.tableStatus}</th>
              <th>{dict.tableGrandTotal}</th>
              <th>{dict.tableInvoicePaid}</th>
              <th>{dict.tableInvoiceBalance}</th>
              <th>{dict.tableActions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={7}>{dict.invoicesTableEmpty}</td>
              </tr>
            )}
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoiceNo}</td>
                <td>{invoice.customer}</td>
                <td>{translateStatus(invoice.status, dict)}</td>
                <td>{formatCurrency(invoice.totals.grandTotal, lang)}</td>
                <td>{formatCurrency(invoice.totals.paidTotal, lang)}</td>
                <td>{formatCurrency(invoice.totals.balanceDue, lang)}</td>
                <td className="actions">
                  <Link href={`/invoices/${invoice.id}?lang=${lang}`} className="link">
                    {dict.actionView}
                  </Link>
                  <button type="button" onClick={() => sendInvoice(invoice.id)} disabled={invoice.status === 'VOID'}>
                    {dict.actionSend}
                  </button>
                  <button type="button" onClick={() => scheduleEinvoice(invoice.id)}>
                    {dict.actionGenerateEinvoice}
                  </button>
                  <button type="button" onClick={() => linkPosSale(invoice.id)}>
                    {dict.actionLinkPos}
                  </button>
                  <button type="button" onClick={() => voidInvoice(invoice.id)} disabled={invoice.status === 'VOID'}>
                    {dict.actionVoid}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>{dict.invoicesPaymentsHeading}</h3>
        <form className="form-grid" onSubmit={recordPayment}>
          <div className="form-row">
            <label>
              {dict.tableInvoiceNumber}
              <select
                value={paymentForm.invoiceId}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, invoiceId: event.target.value }))}
                required
              >
                <option value="" disabled>
                  --
                </option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {dict.invoicePaymentAmount}
              <input
                type="number"
                min={0}
                step={0.01}
                value={paymentForm.amount}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: Number(event.target.value) }))}
                required
              />
            </label>
            <label>
              {dict.invoicePaymentMethod}
              <select
                value={paymentForm.method}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, method: event.target.value as PaymentMethod }))}
              >
                <option value="CASH">{dict.paymentMethodCash}</option>
                <option value="CARD">{dict.paymentMethodCard}</option>
                <option value="EWALLET">{dict.paymentMethodEwallet}</option>
                <option value="BANK">{dict.paymentMethodBank}</option>
              </select>
            </label>
            <label>
              {dict.invoicePaymentReference}
              <input
                value={paymentForm.reference}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, reference: event.target.value }))}
              />
            </label>
          </div>
          <button type="submit" className="primary">
            {dict.invoicePaymentRecord}
          </button>
        </form>
      </section>
    </div>
  );
}
