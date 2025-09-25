import { fetchFromApi } from '../../../lib/api';
import { Lang, getDictionary } from '../../../lib/i18n';
import type { Invoice } from '../data';
import { fallbackInvoices } from '../data';
import { InvoiceDetailClient } from './InvoiceDetailClient';

type InvoiceResponse = {
  invoice: Invoice;
};

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function InvoiceDetailPage({ params, searchParams }: PageProps) {
  const lang = (searchParams?.lang === 'en' ? 'en' : 'ms') as Lang;
  const dict = getDictionary(lang);
  const response = await fetchFromApi<InvoiceResponse>(`/pos/invoices/${params.id}`, lang);
  const fallback = fallbackInvoices();
  const invoice = response?.invoice ?? fallback.find((item) => item.id === params.id) ?? fallback[0];

  return <InvoiceDetailClient initialInvoice={invoice} dict={dict} lang={lang} />;
}
