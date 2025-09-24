#!/usr/bin/env ts-node

/*
 * Simple CLI to submit a sample receipt print job to the print server.
 * Usage: pnpm --filter print-server cli -- --host 192.168.0.50 --port 9100 [--url http://localhost:4010]
 */

type ArgMap = Record<string, string>;

function parseArgs(): ArgMap {
  const entries: ArgMap = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) {
      // skip positional
      continue;
    }
    const value = argv[i + 1];
    if (value && !value.startsWith('--')) {
      entries[key.slice(2)] = value;
      i += 1;
    } else {
      entries[key.slice(2)] = 'true';
    }
  }
  return entries;
}

function buildSamplePayload(host: string, port?: number) {
  const now = new Date();
  return {
    type: 'receipt',
    payload: {
      saleId: 'sample-sale',
      receiptNo: 'BRHQ-20240423-0001',
      createdAt: now.toISOString(),
      paymentMethod: 'CARD',
      branch: {
        id: 'branch-hq',
        code: 'HQ',
        name: 'SPEC-1 HQ',
        address: 'Jalan Damansara, Kuala Lumpur',
        phone: '+60312345678'
      },
      customer: {
        id: 'customer-sample',
        name: 'Pelanggan Contoh',
        phone: '+60123456789'
      },
      totals: {
        subtotalCents: 15000,
        discountCents: 1500,
        taxCents: 810,
        totalCents: 14310
      },
      items: [
        {
          id: 'item-1',
          sku: 'SKU-001',
          name: 'Pakej Premium',
          quantity: 1,
          unitPriceCents: 15000,
          discountCents: 1500,
          totalCents: 13500
        }
      ],
      receiptUrl: 'https://whatsappbot.laptoppro.my/receipts/sample-sale',
      device: {
        type: 'network' as const,
        host,
        port
      }
    }
  };
}

async function main() {
  const args = parseArgs();
  const host = args.host;
  const port = args.port ? Number(args.port) : undefined;
  const baseUrl = (args.url || process.env.PRINT_SERVER_URL || 'http://localhost:4010').replace(/\/$/, '');

  if (!host) {
    console.error('Usage: --host <printer-host> [--port <port>] [--url <print-server-url>]');
    process.exit(1);
  }

  const payload = buildSamplePayload(host, port);
  console.log('Sending sample receipt to', `${baseUrl}/print/direct`);

  try {
    const response = await fetch(`${baseUrl}/print/direct`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await response.text();
    if (!response.ok) {
      console.error(`Print failed (${response.status}):`, body);
      process.exit(1);
    }

    console.log('Print response:', body);
  } catch (error) {
    console.error('Print request failed:', error);
    process.exit(1);
  }
}

main();
