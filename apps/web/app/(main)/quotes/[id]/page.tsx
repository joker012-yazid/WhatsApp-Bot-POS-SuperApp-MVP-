import { fetchFromApi } from '../../../lib/api';
import { Lang, getDictionary } from '../../../lib/i18n';
import type { Quote } from '../data';
import { fallbackQuotes } from '../data';
import { QuoteDetailClient } from './QuoteDetailClient';

type QuoteResponse = {
  quote: Quote;
};

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function QuoteDetailPage({ params, searchParams }: PageProps) {
  const lang = (searchParams?.lang === 'en' ? 'en' : 'ms') as Lang;
  const dict = getDictionary(lang);
  const response = await fetchFromApi<QuoteResponse>(`/pos/quotes/${params.id}`, lang);
  const fallback = fallbackQuotes();
  const quote = response?.quote ?? fallback.find((item) => item.id === params.id) ?? fallback[0];

  return <QuoteDetailClient initialQuote={quote} dict={dict} lang={lang} />;
}
