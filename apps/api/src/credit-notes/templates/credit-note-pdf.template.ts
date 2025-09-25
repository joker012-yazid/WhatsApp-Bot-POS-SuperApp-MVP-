import PDFDocument = require('pdfkit');
import { CreditNoteEntity } from '../entities/credit-note.entity';

const formatMoney = (value: number, currency = 'MYR') => `${currency} ${value.toFixed(2)}`;

const formatDate = (value?: Date | null) =>
  value ? new Date(value).toISOString().split('T')[0] : '-';

export const renderCreditNotePdf = async (creditNote: CreditNoteEntity) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const buffers: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers as unknown as readonly Uint8Array[])));
    doc.on('error', reject);

    doc.fontSize(20).text('Credit Note', { align: 'center' });
    doc.moveDown();

    if (creditNote.branch) {
      doc
        .fontSize(12)
        .text(creditNote.branch.name)
        .text(`Branch Code: ${creditNote.branch.code}`)
        .moveDown();
    }

    doc
      .fontSize(12)
      .text(`Credit Note No: ${creditNote.creditNoteNo}`)
      .text(`Status: ${creditNote.status}`)
      .text(`Issued At: ${formatDate(creditNote.createdAt)}`)
      .moveDown();

    if (creditNote.invoice) {
      doc
        .fontSize(12)
        .text('Related Invoice', { underline: true })
        .text(`Invoice No: ${creditNote.invoice.invoiceNo}`)
        .text(`Invoice Status: ${creditNote.invoice.status}`)
        .text(
          `Invoice Balance Due: ${formatMoney(creditNote.invoice.balanceDue, creditNote.currency)}`
        )
        .moveDown();

      if (creditNote.invoice.customer) {
        doc
          .fontSize(12)
          .text('Bill To:', { underline: true })
          .text(creditNote.invoice.customer.fullName)
          .text(`Phone: ${creditNote.invoice.customer.phone}`)
          .text(`Email: ${creditNote.invoice.customer.email ?? '-'}`)
          .moveDown();
      }
    }

    if (creditNote.reason) {
      doc.fontSize(12).text(`Reason: ${creditNote.reason}`).moveDown();
    }

    doc.fontSize(12).text('Items', { underline: true });

    creditNote.items.forEach((item) => {
      doc
        .fontSize(11)
        .text(
          `${item.description} | Qty: ${item.qty.toFixed(2)} @ ${formatMoney(
            item.unitPrice,
            creditNote.currency
          )} | Discount: ${formatMoney(item.lineDiscount, creditNote.currency)} | Line Total: ${formatMoney(
            item.lineTotal,
            creditNote.currency
          )}`
        );
    });

    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Items Total: ${formatMoney(creditNote.itemsTotal, creditNote.currency)}`)
      .text(`Discount Total: ${formatMoney(creditNote.discountTotal, creditNote.currency)}`)
      .text(`Taxable Subtotal: ${formatMoney(creditNote.taxableSubtotal, creditNote.currency)}`)
      .text(`SST (6%): ${formatMoney(creditNote.sst, creditNote.currency)}`)
      .text(`Grand Total: ${formatMoney(creditNote.grandTotal, creditNote.currency)}`)
      .moveDown();

    doc.fontSize(10).text('Issued by POS SuperApp', { align: 'center' }).moveDown();

    doc.end();
  });
};
