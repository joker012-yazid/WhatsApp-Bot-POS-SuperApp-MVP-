'use client';

import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Tema Cerah' : 'Tema Gelap';

  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={label}>
      <span aria-hidden>🌓</span>
      <span>{label}</span>
    </button>
  );
}
