import './globals.css';
import type { ReactNode } from 'react';
import { ThemeProvider } from './components/theme-provider';
import { AppHeader } from './components/app-header';

export const metadata = {
  title: 'SPEC-1 SuperApp',
  description: 'WhatsApp Bot + POS SuperApp (MVP) untuk operasi omnichannel.',
  metadataBase: new URL('https://whatsappbot.laptoppro.my'),
  alternates: {
    languages: {
      en: '/en',
      ms: '/ms'
    }
  }
};

type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html lang="ms">
      <body>
        <ThemeProvider>
          <div className="app-shell">
            <AppHeader />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
