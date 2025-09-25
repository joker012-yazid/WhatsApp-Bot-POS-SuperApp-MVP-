import { fetchFromApi } from '../../lib/api';
import { Lang, getDictionary } from '../../lib/i18n';
import { InvoiceWorkspace } from './InvoiceWorkspace';
import type { Invoice } from './data';
import { fallbackInvoices } from './data';

type InvoicesResponse = {
  invoices: Invoice[];
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function InvoicesPage({ searchParams }: PageProps) {
  const lang = (searchParams?.lang === 'en' ? 'en' : 'ms') as Lang;
  const dict = getDictionary(lang);
  const response = (await fetchFromApi<InvoicesResponse>('/pos/invoices', lang)) ?? {
    invoices: fallbackInvoices()
  };

  return <InvoiceWorkspace initialInvoices={response.invoices ?? fallbackInvoices()} dict={dict} lang={lang} />;
}
