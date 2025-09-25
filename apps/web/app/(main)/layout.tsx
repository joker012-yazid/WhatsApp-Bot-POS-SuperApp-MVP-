'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { dictionaries } from '../lib/i18n';

const links = [
  { href: '/', key: 'dashboardTitle' },
  { href: '/chat', key: 'chatTitle' },
  { href: '/tickets', key: 'ticketsTitle' },
  { href: '/pos', key: 'posTitle' },
  { href: '/products', key: 'productsTitle' },
  { href: '/customers', key: 'customersTitle' },
  { href: '/forms', key: 'formsTitle' },
  { href: '/reports', key: 'reportsTitle' },
  { href: '/settings', key: 'settingsTitle' },
  { href: '/settings/privacy', key: 'privacyTitle' }
] as const;

type Props = {
  children: ReactNode;
};

export default function MainLayout({ children }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const langParam = searchParams.get('lang');
  const lang = langParam === 'en' ? 'en' : 'ms';
  const dict = dictionaries[lang];

  const urlWithLang = (href: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (lang === 'ms') {
      params.delete('lang');
    } else {
      params.set('lang', lang);
    }
    const query = params.toString();
    return query ? `${href}?${query}` : href;
  };

  return (
    <section className="main-card">
      <nav className="nav">
        {links.map((link) => {
          const href = urlWithLang(link.href);
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={href} className={`nav-link${isActive ? ' active' : ''}`}>
              {dict[link.key as keyof typeof dict] as string}
            </Link>
          );
        })}
      </nav>
      {children}
    </section>
  );
}
