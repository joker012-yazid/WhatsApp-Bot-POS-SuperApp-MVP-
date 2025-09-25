'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Dictionary, Lang } from '../../lib/i18n';
import type { Quote, QuoteLine, QuoteStatus } from './data';

type QuoteFormLine = {
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
  taxCode: string;
};

type QuoteFormState = {
  branch: string;
  customer: string;
  validUntil: string;
  notes: string;
  items: QuoteFormLine[];
};

type GeneratedInvoice = {
  quoteId: string;
  invoiceNo: string;
  grandTotal: number;
  createdAt: string;
};

type Props = {
  initialQuotes: Quote[];
  dict: Dictionary;
  lang: Lang;
};

const roundCurrency = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const calculateTotals = (lines: QuoteFormLine[]) => {
  const itemsTotal = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
  const discountTotal = lines.reduce((sum, line) => sum + line.discount, 0);
  const taxableSubtotal = Math.max(itemsTotal - discountTotal, 0);
  const sst = roundCurrency(taxableSubtotal * 0.06);
  const grandTotal = roundCurrency(taxableSubtotal + sst);
  return { itemsTotal: roundCurrency(itemsTotal), discountTotal: roundCurrency(discountTotal), taxableSubtotal: roundCurrency(taxableSubtotal), sst, grandTotal };
};

const formatCurrency = (value: number) => value.toLocaleString('ms-MY', { style: 'currency', currency: 'MYR' });

const statusTranslation = (status: QuoteStatus, dict: Dictionary): string => {
  switch (status) {
    case 'DRAFT':
      return dict.quoteStatusDraft;
    case 'SENT':
      return dict.quoteStatusSent;
    case 'ACCEPTED':
      return dict.quoteStatusAccepted;
    case 'EXPIRED':
      return dict.quoteStatusExpired;
    case 'CANCELLED':
      return dict.quoteStatusCancelled;
    default:
      return status;
  }
};

const randomSequence = () => Math.floor(100 + Math.random() * 900).toString();

const buildQuoteNumber = (branch: string) => {
  const today = new Date();
  const y = today.getFullYear();
  const m = `${today.getMonth() + 1}`.padStart(2, '0');
  const d = `${today.getDate()}`.padStart(2, '0');
  return `Q${branch}-${y}${m}${d}-${randomSequence()}`;
};

export function QuoteWorkspace({ initialQuotes, dict, lang }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [filter, setFilter] = useState<QuoteStatus | 'ALL'>('ALL');
  const [toast, setToast] = useState<string | null>(null);
  const [generatedInvoices, setGeneratedInvoices] = useState<GeneratedInvoice[]>([]);
  const [form, setForm] = useState<QuoteFormState>(() => ({
    branch: initialQuotes[0]?.branch ?? 'BR-HQ',
    customer: '',
    validUntil: new Date().toISOString().slice(0, 10),
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

  const filteredQuotes = useMemo(() => {
    if (filter === 'ALL') {
      return quotes;
    }
    return quotes.filter((quote) => quote.status === filter);
  }, [filter, quotes]);

  const handleLineChange = (index: number, key: keyof QuoteFormLine, value: string) => {
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
      items: [
        ...prev.items,
        { description: '', qty: 1, unitPrice: 0, discount: 0, taxCode: 'SR' }
      ]
    }));
  };

  const handleFormChange = (key: keyof Omit<QuoteFormState, 'items'>, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitQuote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validLines = form.items.filter((line) => line.description.trim() && line.qty > 0);
    if (!form.customer.trim() || validLines.length === 0) {
      setToast(dict.toastQuoteCancelled);
      return;
    }
    const totals = calculateTotals(validLines);
    const newQuote: Quote = {
      id: `qt-${Date.now()}`,
      quoteNo: buildQuoteNumber(form.branch),
      branch: form.branch,
      customer: form.customer,
      status: 'DRAFT',
      validUntil: form.validUntil,
      notes: form.notes,
      totals,
      items: validLines.map((line, index) => ({
        id: `qt-${Date.now()}-${index}`,
        description: line.description,
        qty: line.qty,
        unitPrice: line.unitPrice,
        discount: line.discount,
        taxCode: line.taxCode,
        lineTotal: roundCurrency(line.qty * line.unitPrice - line.discount)
      })),
      history: [
        {
          at: new Date().toISOString(),
          message: `${lang === 'en' ? 'Quotation created via web UI.' : 'Sebutharga dicipta melalui antaramuka web.'}`
        }
      ]
    };
    setQuotes((prev) => [newQuote, ...prev]);
    setForm({
      branch: form.branch,
      customer: '',
      validUntil: form.validUntil,
      notes: '',
      items: [{ description: '', qty: 1, unitPrice: 0, discount: 0, taxCode: 'SR' }]
    });
    setToast(dict.toastQuoteCreated);
  };

  const updateStatus = (quoteId: string, status: QuoteStatus) => {
    setQuotes((prev) =>
      prev.map((quote) =>
        quote.id === quoteId
          ? {
              ...quote,
              status,
              history: [
                ...quote.history,
                {
                  at: new Date().toISOString(),
                  message:
                    status === 'SENT'
                      ? lang === 'en'
                        ? 'Quotation sent to customer.'
                        : 'Sebutharga dihantar kepada pelanggan.'
                      : status === 'ACCEPTED'
                      ? lang === 'en'
                        ? 'Quotation accepted.'
                        : 'Sebutharga diterima.'
                      : status === 'CANCELLED'
                      ? lang === 'en'
                        ? 'Quotation cancelled.'
                        : 'Sebutharga dibatalkan.'
                      : lang === 'en'
                      ? 'Quotation updated.'
                      : 'Sebutharga dikemas kini.'
                }
              ]
            }
          : quote
      )
    );
  };

  const handleSend = (quoteId: string) => {
    updateStatus(quoteId, 'SENT');
    setToast(dict.toastQuoteSent);
  };

  const handleCancel = (quoteId: string) => {
    updateStatus(quoteId, 'CANCELLED');
    setToast(dict.toastQuoteCancelled);
  };

  const handleAccept = (quote: Quote) => {
    updateStatus(quote.id, 'ACCEPTED');
    const invoiceNo = `INV${quote.branch}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomSequence()}`;
    setGeneratedInvoices((prev) => [
      {
        quoteId: quote.id,
        invoiceNo,
        grandTotal: quote.totals.grandTotal,
        createdAt: new Date().toISOString()
      },
      ...prev
    ]);
    setQuotes((prev) =>
      prev.map((item) =>
        item.id === quote.id
          ? {
              ...item,
              status: 'ACCEPTED',
              linkedInvoiceId: invoiceNo,
              history: [
                ...item.history,
                {
                  at: new Date().toISOString(),
                  message:
                    lang === 'en'
                      ? `Invoice ${invoiceNo} generated.`
                      : `Invois ${invoiceNo} dijana.`
                }
              ]
            }
          : item
      )
    );
    setToast(dict.toastQuoteAccepted);
  };

  return (
    <div className="stack gap-lg">
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      <section className="stack gap-md">
        <h2 className="section-heading">{dict.quotesTitle}</h2>
        <p className="section-subheading">{dict.quotesSubtitle}</p>
      </section>

      <section className="panel">
        <h3>{dict.quotesCreateTitle}</h3>
        <p className="section-subheading">{dict.quotesCreateDescription}</p>
        <form className="form-grid" onSubmit={submitQuote}>
          <div className="form-row">
            <label>
              {dict.formBranchLabel}
              <input
                value={form.branch}
                onChange={(event) => handleFormChange('branch', event.target.value)}
                required
              />
            </label>
            <label>
              {dict.formCustomerLabel}
              <input
                value={form.customer}
                onChange={(event) => handleFormChange('customer', event.target.value)}
                required
              />
            </label>
            <label>
              {dict.formValidUntilLabel}
              <input
                type="date"
                value={form.validUntil}
                onChange={(event) => handleFormChange('validUntil', event.target.value)}
                required
              />
            </label>
          </div>
          <label className="form-full">
            {dict.formNotesLabel}
            <textarea
              value={form.notes}
              onChange={(event) => handleFormChange('notes', event.target.value)}
              rows={3}
            />
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
                <input
                  value={line.taxCode}
                  onChange={(event) => handleLineChange(index, 'taxCode', event.target.value)}
                />
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
                    {dict.quoteDetailTotalsItems}: {formatCurrency(totals.itemsTotal)}
                  </li>
                  <li>
                    {dict.quoteDetailTotalsDiscount}: {formatCurrency(totals.discountTotal)}
                  </li>
                  <li>
                    {dict.quoteDetailTotalsTaxable}: {formatCurrency(totals.taxableSubtotal)}
                  </li>
                  <li>
                    {dict.quoteDetailTotalsSst}: {formatCurrency(totals.sst)}
                  </li>
                  <li>
                    {dict.quoteDetailTotalsGrand}: {formatCurrency(totals.grandTotal)}
                  </li>
                </ul>
              );
            })()}
          </div>
          <button type="submit" className="primary">
            {dict.formSubmitQuote}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="table-actions">
          <label>
            {dict.commonFilterStatus}
            <select value={filter} onChange={(event) => setFilter(event.target.value as QuoteStatus | 'ALL')}>
              <option value="ALL">{dict.commonFilterAll}</option>
              <option value="DRAFT">{dict.quoteStatusDraft}</option>
              <option value="SENT">{dict.quoteStatusSent}</option>
              <option value="ACCEPTED">{dict.quoteStatusAccepted}</option>
              <option value="EXPIRED">{dict.quoteStatusExpired}</option>
              <option value="CANCELLED">{dict.quoteStatusCancelled}</option>
            </select>
          </label>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>{dict.tableQuoteNumber}</th>
              <th>{dict.tableCustomer}</th>
              <th>{dict.tableStatus}</th>
              <th>{dict.tableValidUntil}</th>
              <th>{dict.tableGrandTotal}</th>
              <th>{dict.tableActions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.length === 0 && (
              <tr>
                <td colSpan={6}>{dict.quotesTableEmpty}</td>
              </tr>
            )}
            {filteredQuotes.map((quote) => (
              <tr key={quote.id}>
                <td>{quote.quoteNo}</td>
                <td>{quote.customer}</td>
                <td>{statusTranslation(quote.status, dict)}</td>
                <td>{quote.validUntil}</td>
                <td>{formatCurrency(quote.totals.grandTotal)}</td>
                <td className="actions">
                  <Link href={`/quotes/${quote.id}?lang=${lang}`} className="link">
                    {dict.actionView}
                  </Link>
                  <button type="button" onClick={() => handleSend(quote.id)} disabled={quote.status !== 'DRAFT' && quote.status !== 'SENT'}>
                    {dict.actionSend}
                  </button>
                  <button type="button" onClick={() => handleAccept(quote)} disabled={quote.status === 'ACCEPTED' || quote.status === 'CANCELLED'}>
                    {dict.actionAccept}
                  </button>
                  <button type="button" onClick={() => handleCancel(quote.id)} disabled={quote.status === 'CANCELLED' || quote.status === 'ACCEPTED'}>
                    {dict.actionCancel}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>{dict.quotesGeneratedInvoicesTitle}</h3>
        {generatedInvoices.length === 0 ? (
          <p>{dict.quotesGeneratedInvoicesEmpty}</p>
        ) : (
          <ul className="generated-list">
            {generatedInvoices.map((item) => (
              <li key={item.invoiceNo}>
                <span>{item.invoiceNo}</span>
                <span>{formatCurrency(item.grandTotal)}</span>
                <span>{new Date(item.createdAt).toLocaleString(lang === 'en' ? 'en-MY' : 'ms-MY')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
