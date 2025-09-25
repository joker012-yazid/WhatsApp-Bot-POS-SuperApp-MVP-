'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Dictionary, Lang } from '../../../lib/i18n';
import type { CreditNote, CreditNoteStatus } from '../data';

const formatCurrency = (value: number, lang: Lang) =>
  value.toLocaleString(lang === 'en' ? 'en-MY' : 'ms-MY', { style: 'currency', currency: 'MYR' });

const translateStatus = (status: CreditNoteStatus, dict: Dictionary) => {
  switch (status) {
    case 'ISSUED':
      return dict.creditNoteStatusIssued;
    case 'VOID':
      return dict.creditNoteStatusVoid;
    default:
      return status;
  }
};

type Props = {
  initialNote: CreditNote;
  dict: Dictionary;
  lang: Lang;
};

export function CreditNoteDetailClient({ initialNote, dict, lang }: Props) {
  const [note, setNote] = useState<CreditNote>(initialNote);
  const [toast, setToast] = useState<string | null>(null);

  const voidNote = () => {
    if (note.status === 'VOID') {
      return;
    }
    setNote((prev) => ({ ...prev, status: 'VOID' }));
    setToast(dict.toastCreditNoteVoided);
  };

  const simulatePdf = () => {
    setToast(lang === 'en' ? 'Credit note PDF generated (mock).' : 'PDF nota kredit dijana (simulasi).');
  };

  return (
    <div className="stack gap-lg">
      {toast && <div className="toast">{toast}</div>}
      <Link href={`/credit-notes?lang=${lang}`} className="link">
        ← {dict.creditNoteDetailBack}
      </Link>
      <header className="detail-header">
        <div>
          <h2 className="section-heading">{dict.creditNoteDetailHeading}</h2>
          <p className="section-subheading">{dict.creditNotesSubtitle}</p>
        </div>
        <div className="status-pill">{translateStatus(note.status, dict)}</div>
      </header>
      <section className="panel">
        <h3>{dict.creditNoteDetailLinkedInvoice}</h3>
        <p>
          <strong>{dict.creditNoteLinkedInvoiceLabel}:</strong>{' '}
          <Link href={`/invoices/${note.linkedInvoiceId}?lang=${lang}`} className="link">
            {note.invoiceNo}
          </Link>
        </p>
        <p>
          <strong>{dict.creditNoteReasonLabel}:</strong> {note.reason || '—'}
        </p>
      </section>
      <section className="panel">
        <h3>{dict.creditNoteDetailTotals}</h3>
        <ul>
          <li>
            {dict.quoteDetailTotalsItems}: {formatCurrency(note.totals.itemsTotal, lang)}
          </li>
          <li>
            {dict.quoteDetailTotalsTaxable}: {formatCurrency(note.totals.taxableSubtotal, lang)}
          </li>
          <li>
            {dict.quoteDetailTotalsSst}: {formatCurrency(note.totals.sst, lang)}
          </li>
          <li>
            {dict.quoteDetailTotalsGrand}: {formatCurrency(note.totals.grandTotal, lang)}
          </li>
        </ul>
      </section>
      <section className="panel">
        <h3>{dict.creditNoteDetailItems}</h3>
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
            {note.items.map((line) => (
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
        <h3>{dict.creditNoteDetailActions}</h3>
        <div className="action-grid">
          <button type="button" onClick={simulatePdf}>
            {dict.creditNoteDetailPdf}
          </button>
          <button type="button" onClick={voidNote} disabled={note.status === 'VOID'}>
            {dict.creditNoteDetailVoid}
          </button>
        </div>
        <p>{dict.creditNoteDetailAudit}</p>
      </section>
    </div>
  );
}
