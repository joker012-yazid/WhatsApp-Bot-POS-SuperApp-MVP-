'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Dictionary, Lang } from '../../lib/i18n';
import type { CreditNote, CreditNoteStatus } from './data';

type CreditNoteFormLine = {
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
  taxCode: string;
};

type CreditNoteFormState = {
  branch: string;
  invoiceNo: string;
  customer: string;
  reason: string;
  items: CreditNoteFormLine[];
};

type Props = {
  initialNotes: CreditNote[];
  dict: Dictionary;
  lang: Lang;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const calculateTotals = (lines: CreditNoteFormLine[]) => {
  const itemsTotal = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
  const discountTotal = lines.reduce((sum, line) => sum + line.discount, 0);
  const taxableSubtotal = Math.max(itemsTotal - discountTotal, 0);
  const sst = roundCurrency(taxableSubtotal * 0.06);
  const grandTotal = roundCurrency(taxableSubtotal + sst);
  return { itemsTotal: roundCurrency(itemsTotal), discountTotal: roundCurrency(discountTotal), taxableSubtotal: roundCurrency(taxableSubtotal), sst, grandTotal };
};

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

const buildCreditNoteNo = (branch: string) => {
  const today = new Date();
  const y = today.getFullYear();
  const m = `${today.getMonth() + 1}`.padStart(2, '0');
  const d = `${today.getDate()}`.padStart(2, '0');
  return `CN${branch}-${y}${m}${d}-${Math.floor(100 + Math.random() * 900)}`;
};

export function CreditNotesWorkspace({ initialNotes, dict, lang }: Props) {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(initialNotes);
  const [filter, setFilter] = useState<CreditNoteStatus | 'ALL'>('ALL');
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<CreditNoteFormState>(() => ({
    branch: initialNotes[0]?.branch ?? 'BR-HQ',
    invoiceNo: initialNotes[0]?.invoiceNo ?? '',
    customer: initialNotes[0]?.customer ?? '',
    reason: '',
    items: [
      { description: '', qty: 1, unitPrice: 0, discount: 0, taxCode: 'SR' }
    ]
  }));

  const filteredNotes = useMemo(() => {
    if (filter === 'ALL') {
      return creditNotes;
    }
    return creditNotes.filter((note) => note.status === filter);
  }, [creditNotes, filter]);

  const handleLineChange = (index: number, key: keyof CreditNoteFormLine, value: string) => {
    setForm((prev) => {
      const items = [...prev.items];
      const line = { ...items[index] };
      if (key === 'qty' || key === 'unitPrice' || key === 'discount') {
        line[key] = Number(value) || 0;
      } else {
        line[key] = value;
      }
      items[index] = line;
      return { ...prev, items };
    });
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', qty: 1, unitPrice: 0, discount: 0, taxCode: 'SR' }]
    }));
  };

  const handleFormChange = (key: keyof Omit<CreditNoteFormState, 'items'>, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitCreditNote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validLines = form.items.filter((line) => line.description.trim() && line.qty > 0);
    if (!form.invoiceNo.trim() || validLines.length === 0) {
      return;
    }
    const totals = calculateTotals(validLines);
    const id = `cn-${Date.now()}`;
    const creditNote: CreditNote = {
      id,
      creditNoteNo: buildCreditNoteNo(form.branch),
      branch: form.branch,
      invoiceNo: form.invoiceNo,
      customer: form.customer || dict.tableCustomer,
      status: 'ISSUED',
      reason: form.reason,
      issuedAt: new Date().toISOString(),
      totals,
      items: validLines.map((line, index) => ({
        id: `${id}-${index}`,
        description: line.description,
        qty: line.qty,
        unitPrice: line.unitPrice,
        discount: line.discount,
        taxCode: line.taxCode,
        lineTotal: roundCurrency(line.qty * line.unitPrice - line.discount)
      })),
      linkedInvoiceId: form.invoiceNo.replace('INV', 'inv')
    };
    setCreditNotes((prev) => [creditNote, ...prev]);
    setForm({
      branch: form.branch,
      invoiceNo: form.invoiceNo,
      customer: form.customer,
      reason: '',
      items: [{ description: '', qty: 1, unitPrice: 0, discount: 0, taxCode: 'SR' }]
    });
    setToast(dict.toastCreditNoteIssued);
  };

  const voidNote = (creditNoteId: string) => {
    setCreditNotes((prev) =>
      prev.map((note) =>
        note.id === creditNoteId
          ? {
              ...note,
              status: 'VOID'
            }
          : note
      )
    );
    setToast(dict.toastCreditNoteVoided);
  };

  return (
    <div className="stack gap-lg">
      {toast && <div className="toast">{toast}</div>}
      <section className="stack gap-md">
        <h2 className="section-heading">{dict.creditNotesTitle}</h2>
        <p className="section-subheading">{dict.creditNotesSubtitle}</p>
      </section>
      <section className="panel">
        <h3>{dict.creditNotesCreateTitle}</h3>
        <p className="section-subheading">{dict.creditNotesCreateDescription}</p>
        <form className="form-grid" onSubmit={submitCreditNote}>
          <div className="form-row">
            <label>
              {dict.formBranchLabel}
              <input value={form.branch} onChange={(event) => handleFormChange('branch', event.target.value)} required />
            </label>
            <label>
              {dict.creditNoteLinkedInvoiceLabel}
              <input value={form.invoiceNo} onChange={(event) => handleFormChange('invoiceNo', event.target.value)} required />
            </label>
            <label>
              {dict.formCustomerLabel}
              <input value={form.customer} onChange={(event) => handleFormChange('customer', event.target.value)} />
            </label>
          </div>
          <label className="form-full">
            {dict.creditNoteReasonLabel}
            <textarea value={form.reason} onChange={(event) => handleFormChange('reason', event.target.value)} rows={3} />
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
            {dict.formSubmitCreditNote}
          </button>
        </form>
      </section>
      <section className="panel">
        <div className="table-actions">
          <label>
            {dict.commonFilterStatus}
            <select value={filter} onChange={(event) => setFilter(event.target.value as CreditNoteStatus | 'ALL')}>
              <option value="ALL">{dict.commonFilterAll}</option>
              <option value="ISSUED">{dict.creditNoteStatusIssued}</option>
              <option value="VOID">{dict.creditNoteStatusVoid}</option>
            </select>
          </label>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>{dict.tableCreditNoteNumber}</th>
              <th>{dict.tableCustomer}</th>
              <th>{dict.tableLinkedInvoice}</th>
              <th>{dict.tableStatus}</th>
              <th>{dict.tableGrandTotal}</th>
              <th>{dict.tableActions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredNotes.length === 0 && (
              <tr>
                <td colSpan={6}>{dict.creditNotesTableEmpty}</td>
              </tr>
            )}
            {filteredNotes.map((note) => (
              <tr key={note.id}>
                <td>{note.creditNoteNo}</td>
                <td>{note.customer}</td>
                <td>{note.invoiceNo}</td>
                <td>{translateStatus(note.status, dict)}</td>
                <td>{formatCurrency(note.totals.grandTotal, lang)}</td>
                <td className="actions">
                  <Link href={`/credit-notes/${note.id}?lang=${lang}`} className="link">
                    {dict.actionView}
                  </Link>
                  <button type="button" onClick={() => voidNote(note.id)} disabled={note.status === 'VOID'}>
                    {dict.actionVoid}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
