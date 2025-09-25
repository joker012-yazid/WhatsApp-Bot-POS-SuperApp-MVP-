'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Dictionary, Lang } from '../../../lib/i18n';
import type { Invoice, InvoicePayment, InvoiceStatus, PaymentMethod } from '../data';

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

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

type Props = {
  initialInvoice: Invoice;
  dict: Dictionary;
  lang: Lang;
};

type PaymentForm = {
  amount: number;
  method: PaymentMethod;
  reference: string;
};

export function InvoiceDetailClient({ initialInvoice, dict, lang }: Props) {
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
  const [toast, setToast] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({ amount: 0, method: 'CASH', reference: '' });

  const updateInvoice = (updater: (invoice: Invoice) => Invoice) => {
    setInvoice((prev) => updater(prev));
  };

  const sendInvoice = () => {
    updateInvoice((prev) => ({ ...prev, status: prev.status === 'DRAFT' ? 'SENT' : prev.status }));
    setToast(dict.toastInvoiceSent);
  };

  const recordPayment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (paymentForm.amount <= 0) {
      return;
    }
    updateInvoice((prev) => {
      const payment: InvoicePayment = {
        id: `pay-${Date.now()}`,
        amount: roundCurrency(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        paidAt: new Date().toISOString()
      };
      const payments = [payment, ...prev.payments];
      const paidTotal = roundCurrency(payments.reduce((sum, item) => sum + item.amount, 0));
      const balanceDue = Math.max(roundCurrency(prev.totals.grandTotal - paidTotal), 0);
      const status: InvoiceStatus = prev.status === 'VOID' ? 'VOID' : balanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
      return {
        ...prev,
        payments,
        totals: {
          ...prev.totals,
          paidTotal,
          balanceDue
        },
        status
      };
    });
    setPaymentForm({ amount: 0, method: 'CASH', reference: '' });
    setToast(dict.toastInvoicePaymentRecorded);
  };

  const voidInvoice = () => {
    updateInvoice((prev) => ({ ...prev, status: 'VOID' }));
    setToast(dict.toastInvoiceVoid);
  };

  const togglePosLink = () => {
    updateInvoice((prev) => ({ ...prev, posSaleId: prev.posSaleId ? undefined : `pos-${Math.floor(Math.random() * 9999)}` }));
  };

  const refreshEinvoice = () => {
    updateInvoice((prev) => ({
      ...prev,
      einvoice: {
        submissionId: prev.einvoice?.submissionId ?? `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
        status: prev.einvoice?.status === 'ACCEPTED' ? 'ACCEPTED' : 'SENT',
        lastPolledAt: new Date().toISOString(),
        lastError: prev.einvoice?.lastError
      }
    }));
    setToast(dict.toastInvoiceEinvoiceSubmitted);
  };

  return (
    <div className="stack gap-lg">
      {toast && <div className="toast">{toast}</div>}
      <Link href={`/invoices?lang=${lang}`} className="link">
        ← {dict.invoiceDetailBack}
      </Link>
      <header className="detail-header">
        <div>
          <h2 className="section-heading">{dict.invoiceDetailHeading}</h2>
          <p className="section-subheading">{dict.invoicesSubtitle}</p>
        </div>
        <div className="status-pill">{translateStatus(invoice.status, dict)}</div>
      </header>
      <section className="panel">
        <h3>{dict.invoiceDetailTotals}</h3>
        <ul>
          <li>
            {dict.quoteDetailTotalsItems}: {formatCurrency(invoice.totals.itemsTotal, lang)}
          </li>
          <li>
            {dict.quoteDetailTotalsDiscount}: {formatCurrency(invoice.totals.discountTotal, lang)}
          </li>
          <li>
            {dict.quoteDetailTotalsTaxable}: {formatCurrency(invoice.totals.taxableSubtotal, lang)}
          </li>
          <li>
            {dict.quoteDetailTotalsSst}: {formatCurrency(invoice.totals.sst, lang)}
          </li>
          <li>
            {dict.quoteDetailTotalsGrand}: {formatCurrency(invoice.totals.grandTotal, lang)}
          </li>
          <li>
            {dict.tableInvoicePaid}: {formatCurrency(invoice.totals.paidTotal, lang)}
          </li>
          <li>
            {dict.tableInvoiceBalance}: {formatCurrency(invoice.totals.balanceDue, lang)}
          </li>
        </ul>
      </section>
      <section className="panel">
        <h3>{dict.invoiceDetailItems}</h3>
        <table className="table">
          <thead>
            <tr>
              <th>{dict.formLineDescription}</th>
              <th>{dict.formLineQty}</th>
              <th>{dict.formLineUnitPrice}</th>
              <th>{dict.formLineDiscount}</th>
              <th>{dict.formLineTaxCode}</th>
              <th>{dict.quoteDetailTotalsGrand}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((line) => (
              <tr key={line.id}>
                <td>{line.description}</td>
                <td>{line.qty}</td>
                <td>{formatCurrency(line.unitPrice, lang)}</td>
                <td>{formatCurrency(line.discount, lang)}</td>
                <td>{line.taxCode}</td>
                <td>{formatCurrency(line.lineTotal, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>{dict.invoiceDetailPayments}</h3>
        {invoice.payments.length === 0 ? (
          <p>{dict.invoicesPaymentHistoryEmpty}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{dict.invoicePaymentAmount}</th>
                <th>{dict.invoicePaymentMethod}</th>
                <th>{dict.invoicePaymentReference}</th>
                <th>Paid At</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatCurrency(payment.amount, lang)}</td>
                  <td>
                    {payment.method === 'CASH'
                      ? dict.paymentMethodCash
                      : payment.method === 'CARD'
                      ? dict.paymentMethodCard
                      : payment.method === 'EWALLET'
                      ? dict.paymentMethodEwallet
                      : dict.paymentMethodBank}
                  </td>
                  <td>{payment.reference ?? '—'}</td>
                  <td>{new Date(payment.paidAt).toLocaleString(lang === 'en' ? 'en-MY' : 'ms-MY')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <form className="form-grid" onSubmit={recordPayment}>
          <div className="form-row">
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
      <section className="panel">
        <h3>{dict.invoiceDetailEinvoice}</h3>
        <ul>
          <li>
            {dict.invoiceEinvoiceStatusLabel}: {invoice.einvoice?.status ?? '—'}
          </li>
          <li>
            {dict.invoiceEinvoiceLastErrorLabel}: {invoice.einvoice?.lastError ?? '—'}
          </li>
          <li>
            {dict.invoiceEinvoiceLastPolledLabel}: {invoice.einvoice?.lastPolledAt ?? '—'}
          </li>
        </ul>
        <div className="action-grid">
          <button type="button" onClick={refreshEinvoice}>
            {dict.actionGenerateEinvoice}
          </button>
          <button type="button" onClick={togglePosLink}>
            {invoice.posSaleId ? dict.invoiceDetailUnlinkPos : dict.invoiceDetailLinkPos}
          </button>
          <button type="button" onClick={sendInvoice}>
            {dict.actionSend}
          </button>
          <button type="button" onClick={voidInvoice} disabled={invoice.status === 'VOID'}>
            {dict.actionVoid}
          </button>
        </div>
      </section>
      {invoice.linkedQuoteId && (
        <section className="panel">
          <h3>{dict.tableLinkedInvoice}</h3>
          <p>
            <Link href={`/quotes/${invoice.linkedQuoteId}?lang=${lang}`} className="link">
              {invoice.linkedQuoteId}
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
