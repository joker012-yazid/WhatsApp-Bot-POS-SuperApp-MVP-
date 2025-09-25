import PDFDocument from 'pdfkit';
import { InvoiceEntity } from '../entities/invoice.entity';

const formatMoney = (value: number, currency = 'MYR') => `${currency} ${value.toFixed(2)}`;

const formatDate = (value?: Date | null) =>
  value ? new Date(value).toISOString().split('T')[0] : '-';

export const renderInvoicePdf = async (invoice: InvoiceEntity) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const buffers: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers as unknown as readonly Uint8Array[])));
    doc.on('error', reject);

    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();

    if (invoice.branch) {
      doc
        .fontSize(12)
        .text(invoice.branch.name)
        .text(`Branch Code: ${invoice.branch.code}`)
        .moveDown();
    }

    doc
      .fontSize(12)
      .text(`Invoice No: ${invoice.invoiceNo}`)
      .text(`Issue Date: ${formatDate(invoice.issueDate)}`)
      .text(`Due Date: ${formatDate(invoice.dueDate)}`)
      .text(`Status: ${invoice.status}`)
      .moveDown();

    if (invoice.customer) {
      doc
        .fontSize(12)
        .text('Bill To:', { underline: true })
        .text(invoice.customer.fullName)
        .text(`Phone: ${invoice.customer.phone}`)
        .text(`Email: ${invoice.customer.email ?? '-'}`)
        .moveDown();
    }

    doc.fontSize(12).text('Items', { underline: true });

    invoice.items.forEach((item) => {
      doc
        .fontSize(11)
        .text(
          `${item.description} | Qty: ${item.qty.toFixed(2)} @ ${formatMoney(
            item.unitPrice,
            invoice.currency
          )} | Discount: ${formatMoney(item.lineDiscount, invoice.currency)} | Line Total: ${formatMoney(
            item.lineTotal,
            invoice.currency
          )}`
        );
    });

    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Items Total: ${formatMoney(invoice.itemsTotal, invoice.currency)}`)
      .text(`Discount Total: ${formatMoney(invoice.discountTotal, invoice.currency)}`)
      .text(`Taxable Subtotal: ${formatMoney(invoice.taxableSubtotal, invoice.currency)}`)
      .text(`SST (6%): ${formatMoney(invoice.sst, invoice.currency)}`)
      .text(`Grand Total: ${formatMoney(invoice.grandTotal, invoice.currency)}`)
      .text(`Paid Total: ${formatMoney(invoice.paidTotal, invoice.currency)}`)
      .text(`Balance Due: ${formatMoney(invoice.balanceDue, invoice.currency)}`)
      .moveDown();

    if (invoice.payments.length) {
      doc.fontSize(12).text('Payments', { underline: true });
      invoice.payments.forEach((payment) => {
        doc
          .fontSize(11)
          .text(
            `${formatDate(payment.paidAt)} - ${payment.method} - ${formatMoney(
              payment.amount,
              invoice.currency
            )}${payment.reference ? ` (Ref: ${payment.reference})` : ''}`
          );
      });
      doc.moveDown();
    }

    if (invoice.notes) {
      doc.fontSize(11).text('Notes:', { underline: true });
      doc.fontSize(11).text(invoice.notes);
      doc.moveDown();
    }

    doc
      .fontSize(10)
      .text('Thank you for your business.', { align: 'center' })
      .moveDown();

    doc.end();
  });
};
