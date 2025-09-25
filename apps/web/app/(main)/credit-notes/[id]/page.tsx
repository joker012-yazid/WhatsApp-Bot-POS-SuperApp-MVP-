import { fetchFromApi } from '../../../lib/api';
import { Lang, getDictionary } from '../../../lib/i18n';
import type { CreditNote } from '../data';
import { fallbackCreditNotes } from '../data';
import { CreditNoteDetailClient } from './CreditNoteDetailClient';

type CreditNoteResponse = {
  creditNote: CreditNote;
};

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function CreditNoteDetailPage({ params, searchParams }: PageProps) {
  const lang = (searchParams?.lang === 'en' ? 'en' : 'ms') as Lang;
  const dict = getDictionary(lang);
  const response = await fetchFromApi<CreditNoteResponse>(`/pos/credit-notes/${params.id}`, lang);
  const fallback = fallbackCreditNotes();
  const note = response?.creditNote ?? fallback.find((item) => item.id === params.id) ?? fallback[0];

  return <CreditNoteDetailClient initialNote={note} dict={dict} lang={lang} />;
}
