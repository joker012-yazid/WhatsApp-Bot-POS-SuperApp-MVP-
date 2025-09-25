'use client';

import { useSearchParams } from 'next/navigation';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';
import { dictionaries } from '../lib/i18n';

export function AppHeader() {
  const searchParams = useSearchParams();
  const langParam = searchParams.get('lang');
  const dict = dictionaries[langParam === 'en' ? 'en' : 'ms'];

  return (
    <header className="app-header">
      <div className="app-header__top">
        <div>
          <h1 className="app-header__title">SPEC-1 SuperApp</h1>
          <p className="app-header__subtitle">{dict.dashboardSubtitle}</p>
        </div>
        <div className="app-header__actions">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
      <small>Domain: whatsappbot.laptoppro.my · TZ: Asia/Kuala_Lumpur</small>
    </header>
  );
}
