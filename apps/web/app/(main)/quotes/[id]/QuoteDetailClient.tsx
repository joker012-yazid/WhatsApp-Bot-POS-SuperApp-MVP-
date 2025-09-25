'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Dictionary, Lang } from '../../../lib/i18n';
import type { Quote, QuoteStatus } from '../data';

const formatCurrency = (value: number, lang: Lang) =>
  value.toLocaleString(lang === 'en' ? 'en-MY' : 'ms-MY', { style: 'currency', currency: 'MYR' });

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

type Props = {
  initialQuote: Quote;
  dict: Dictionary;
  lang: Lang;
};

export function QuoteDetailClient({ initialQuote, dict, lang }: Props) {
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [toast, setToast] = useState<string | null>(null);

  const appendHistory = (messageMs: string, messageEn: string) => {
    setQuote((prev) => ({
      ...prev,
      history: [
        ...prev.history,
        {
          at: new Date().toISOString(),
          message: lang === 'en' ? messageEn : messageMs
        }
      ]
    }));
  };

  const updateStatus = (status: QuoteStatus) => {
    setQuote((prev) => ({ ...prev, status }));
    switch (status) {
      case 'SENT':
        appendHistory('Sebutharga dihantar kepada pelanggan.', 'Quotation sent to customer.');
        setToast(dict.toastQuoteSent);
        break;
      case 'ACCEPTED':
        appendHistory('Sebutharga diterima oleh pelanggan.', 'Quotation accepted by customer.');
        setToast(dict.toastQuoteAccepted);
        break;
      case 'CANCELLED':
        appendHistory('Sebutharga dibatalkan.', 'Quotation cancelled.');
        setToast(dict.toastQuoteCancelled);
        break;
      case 'EXPIRED':
        appendHistory('Sebutharga tamat tempoh.', 'Quotation expired.');
        setToast(dict.toastQuoteCancelled);
        break;
      default:
        break;
    }
  };

  const handleAccept = () => {
    const invoiceNo = `INV${quote.branch}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    setQuote((prev) => ({
      ...prev,
      status: 'ACCEPTED',
      linkedInvoiceId: invoiceNo,
      history: [
        ...prev.history,
        {
          at: new Date().toISOString(),
          message:
            lang === 'en'
              ? `Quotation accepted and invoice ${invoiceNo} generated.`
              : `Sebutharga diterima dan invois ${invoiceNo} dijana.`
        }
      ]
    }));
    setToast(dict.toastQuoteAccepted);
  };

  const handlePdf = () => {
    setToast(lang === 'en' ? 'Quotation PDF download simulated.' : 'Muat turun PDF sebutharga (simulasi).');
  };

  return (
    <div className="stack gap-lg">
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      <Link href={`/quotes?lang=${lang}`} className="link">
        ← {dict.quoteDetailBack}
      </Link>
      <header className="detail-header">
        <div>
          <h2 className="section-heading">{dict.quoteDetailHeading}</h2>
          <p className="section-subheading">{dict.quoteDetailAutoInvoiceNote}</p>
        </div>
        <div className="status-pill">{statusTranslation(quote.status, dict)}</div>
      </header>
      <section className="panel">
        <h3>{dict.quoteDetailTotals}</h3>
        <ul>
          <li>
            {dict.quoteDetailTotalsItems}: {formatCurrency(quote.totals.itemsTotal, lang)}
          </li>
          <li>
            {dict.quoteDetailTotalsDiscount}: {formatCurrency(quote.totals.discountTotal, lang)}
          </li>
          <li>
            {dict.quoteDetailTotalsTaxable}: {formatCurrency(quote.totals.taxableSubtotal, lang)}
          </li>
          <li>
            {dict.quoteDetailTotalsSst}: {formatCurrency(quote.totals.sst, lang)}
          </li>
          <li>
            {dict.quoteDetailTotalsGrand}: {formatCurrency(quote.totals.grandTotal, lang)}
          </li>
        </ul>
      </section>
      <section className="panel">
        <h3>{dict.quoteDetailItems}</h3>
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
            {quote.items.map((line) => (
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
        <h3>{dict.quoteDetailHistory}</h3>
        <ul className="timeline">
          {quote.history.length === 0 && <li>{dict.quoteDetailHistoryPlaceholder}</li>}
          {quote.history.map((entry, index) => (
            <li key={`${entry.at}-${index}`}>
              <span>{new Date(entry.at).toLocaleString(lang === 'en' ? 'en-MY' : 'ms-MY')}</span>
              <span>{entry.message}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel actions">
        <h3>{dict.quoteDetailActions}</h3>
        <div className="action-grid">
          <button type="button" onClick={() => updateStatus('SENT')} disabled={quote.status === 'CANCELLED' || quote.status === 'ACCEPTED'}>
            {dict.actionSend}
          </button>
          <button type="button" onClick={handleAccept} disabled={quote.status === 'ACCEPTED' || quote.status === 'CANCELLED'}>
            {dict.quoteDetailCreateInvoice}
          </button>
          <button type="button" onClick={() => updateStatus('EXPIRED')} disabled={quote.status !== 'SENT'}>
            {dict.quoteDetailMarkExpired}
          </button>
          <button type="button" onClick={() => updateStatus('CANCELLED')} disabled={quote.status === 'CANCELLED'}>
            {dict.actionCancel}
          </button>
          <button type="button" onClick={handlePdf}>{dict.quoteDetailPdf}</button>
        </div>
        {quote.linkedInvoiceId && (
          <p>
            {dict.tableLinkedInvoice}:{' '}
            <Link href={`/invoices/${quote.linkedInvoiceId}?lang=${lang}`} className="link">
              {quote.linkedInvoiceId}
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
