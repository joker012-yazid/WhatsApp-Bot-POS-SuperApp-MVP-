import type { Printer } from 'escpos';
import { ReceiptPayload } from './printer';

function formatCurrency(cents: number) {
  return `RM ${(cents / 100).toFixed(2)}`;
}

function divider(printer: Printer) {
  printer.text('--------------------------------');
}

function newline(printer: Printer, lines = 1) {
  for (let i = 0; i < lines; i += 1) {
    (printer as any).newline?.() ?? printer.text('');
  }
}

function printItems(printer: Printer, payload: ReceiptPayload) {
  payload.items.forEach((item) => {
    const label = `${item.quantity} x ${item.name}`;
    printer.align('LT').text(label);
    const discount = item.discountCents ? ` (-${formatCurrency(item.discountCents)})` : '';
    const sku = item.sku ? ` [${item.sku}]` : '';
    printer.text(`   @ ${formatCurrency(item.unitPriceCents)}${discount}${sku}`);
    printer.align('RT').text(formatCurrency(item.totalCents));
    newline(printer);
  });
}

function printTotals(printer: Printer, payload: ReceiptPayload) {
  divider(printer);
  printer.align('RT').text(`Subtotal: ${formatCurrency(payload.totals.subtotalCents)}`);
  printer.align('RT').text(`Discount: -${formatCurrency(payload.totals.discountCents)}`);
  printer.align('RT').text(`SST (6%): ${formatCurrency(payload.totals.taxCents)}`);
  divider(printer);
  printer.align('RT').style('b').text(`TOTAL: ${formatCurrency(payload.totals.totalCents)}`);
  printer.style('normal');
  printer.align('LT').text(`Bayaran / Payment: ${payload.paymentMethod}`);
}

function printHeader(printer: Printer, payload: ReceiptPayload) {
  printer.align('CT').style('b').size(1, 1).text(payload.branch?.name ?? 'SPEC-1 HQ');
  printer.style('normal').size(0, 0);
  if (payload.branch?.address) {
    printer.text(payload.branch.address);
  }
  if (payload.branch?.phone) {
    printer.text(`Tel: ${payload.branch.phone}`);
  }
  newline(printer);
  printer.align('LT').text(`Resit / Receipt: ${payload.receiptNo}`);
  printer.text(`Cawangan / Branch: ${payload.branch?.code ?? 'N/A'}`);
  printer.text(`Tarikh / Date: ${new Date(payload.createdAt).toLocaleString('ms-MY')}`);
  if (payload.customer?.name) {
    printer.text(`Pelanggan / Customer: ${payload.customer.name}`);
  }
  if (payload.customer?.phone) {
    printer.text(`Telefon: ${payload.customer.phone}`);
  }
  newline(printer);
}

function printFooter(printer: Printer, payload: ReceiptPayload) {
  divider(printer);
  printer.align('CT');
  return new Promise<void>((resolve, reject) => {
    const qrCallback = (error?: Error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    try {
      (printer as any).qrimage?.(payload.receiptUrl, { type: 'png', size: 6 }, qrCallback) ??
        (printer as any).qrcode?.(payload.receiptUrl, { typeNumber: 4, errorCorrectionLevel: 'M' }, qrCallback);
    } catch (error) {
      reject(error as Error);
    }
  }).then(() => {
    printer.text('Imbas untuk resit digital / Scan for e-receipt');
    newline(printer, 2);
    printer.text('Terima kasih! / Thank you!');
  });
}

export async function renderReceipt(printer: Printer, payload: ReceiptPayload) {
  printHeader(printer, payload);
  divider(printer);
  printItems(printer, payload);
  printTotals(printer, payload);
  await printFooter(printer, payload);
}
