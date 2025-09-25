import { fetchFromApi } from '../../lib/api';
import { Lang, getDictionary } from '../../lib/i18n';
import { QuoteWorkspace } from './QuoteWorkspace';
import type { Quote } from './data';
import { fallbackQuotes } from './data';

type QuotesResponse = {
  quotes: Quote[];
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function QuotesPage({ searchParams }: PageProps) {
  const lang = (searchParams?.lang === 'en' ? 'en' : 'ms') as Lang;
  const dict = getDictionary(lang);
  const response = (await fetchFromApi<QuotesResponse>('/pos/quotes', lang)) ?? {
    quotes: fallbackQuotes()
  };

  return <QuoteWorkspace initialQuotes={response.quotes ?? fallbackQuotes()} dict={dict} lang={lang} />;
}
