import { fetchFromApi } from '../../lib/api';
import { Lang, getDictionary } from '../../lib/i18n';
import { CreditNotesWorkspace } from './CreditNotesWorkspace';
import type { CreditNote } from './data';
import { fallbackCreditNotes } from './data';

type CreditNotesResponse = {
  creditNotes: CreditNote[];
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function CreditNotesPage({ searchParams }: PageProps) {
  const lang = (searchParams?.lang === 'en' ? 'en' : 'ms') as Lang;
  const dict = getDictionary(lang);
  const response = (await fetchFromApi<CreditNotesResponse>('/pos/credit-notes', lang)) ?? {
    creditNotes: fallbackCreditNotes()
  };

  return <CreditNotesWorkspace initialNotes={response.creditNotes ?? fallbackCreditNotes()} dict={dict} lang={lang} />;
}
