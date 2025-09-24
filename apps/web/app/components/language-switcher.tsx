'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

type Lang = 'ms' | 'en';

export function LanguageSwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get('lang') as Lang | null) ?? 'ms';

  const createLink = (lang: Lang) => {
    const params = new URLSearchParams(searchParams.toString());
    if (lang === 'ms') {
      params.delete('lang');
    } else {
      params.set('lang', lang);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <div className="language-group">
      <Link
        href={createLink('ms')}
        className="language-toggle"
        aria-current={current === 'ms' ? 'true' : undefined}
      >
        BM
      </Link>
      <Link
        href={createLink('en')}
        className="language-toggle"
        aria-current={current === 'en' ? 'true' : undefined}
      >
        EN
      </Link>
    </div>
  );
}
