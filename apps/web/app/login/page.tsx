import { fetchFromApi } from '../lib/api';
import { Lang, getDictionary } from '../lib/i18n';

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

type LoginHint = {
  message: string;
};

const fallbackHint: LoginHint = {
  message: 'Gunakan akaun ADMIN yang dibootstrap melalui API.'
};

export default async function LoginPage({ searchParams }: PageProps) {
  const lang = (searchParams?.lang === 'en' ? 'en' : 'ms') as Lang;
  const dict = getDictionary(lang);
  const hint = (await fetchFromApi<LoginHint>('/auth/hint', lang)) ?? fallbackHint;
  const action = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api'}/auth/login`;

  return (
    <section className="main-card" style={{ maxWidth: '420px', margin: '0 auto' }}>
      <h2 className="section-heading">{dict.loginTitle}</h2>
      <p className="section-subheading">{hint.message}</p>
      <form className="stats-grid" style={{ gap: '1rem' }} method="post" action={action}>
        <label className="label">
          {dict.loginEmail}
          <input type="email" name="email" className="input" required autoComplete="email" />
        </label>
        <label className="label">
          {dict.loginPassword}
          <input type="password" name="password" className="input" required autoComplete="current-password" />
        </label>
        <label className="label">
          {dict.loginTotp}
          <input type="text" name="totpCode" className="input" inputMode="numeric" pattern="[0-9]{6}" />
        </label>
        <label className="label">
          {dict.loginRecaptcha}
          <input type="text" name="recaptchaToken" className="input" required />
        </label>
        <button type="submit" className="button-primary">
          {dict.loginButton}
        </button>
      </form>
    </section>
  );
}
