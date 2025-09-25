import Link from 'next/link';
import { fetchFromApi } from '../../lib/api';
import { Lang, getDictionary } from '../../lib/i18n';

type SettingsResponse = {
  audit: Array<{
    id: string;
    action: string;
    actor: string;
    timestamp: string;
  }>;
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const fallbackAudit = (): SettingsResponse => ({
  audit: [
    {
      id: 'a1',
      action: 'Kemas kini CORS kepada domain produksi.',
      actor: 'System',
      timestamp: new Date().toISOString()
    },
    {
      id: 'a2',
      action: 'ADMIN mencipta pengguna baru untuk cawangan JB.',
      actor: 'Nor',
      timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString()
    }
  ]
});

export default async function SettingsPage({ searchParams }: PageProps) {
  const lang = (searchParams?.lang === 'en' ? 'en' : 'ms') as Lang;
  const dict = getDictionary(lang);
  const response =
    (await fetchFromApi<SettingsResponse>('/settings/audit', lang)) ?? fallbackAudit();

  const rbacRoles = ['ADMIN', 'MANAGER', 'AGENT', 'CASHIER'];

  return (
    <div className="stats-grid" style={{ gap: '1.5rem' }}>
      <section>
        <h2 className="section-heading">{dict.settingsTitle}</h2>
        <p className="section-subheading">{dict.settingsSubtitle}</p>
      </section>
      <section className="stat-card">
        <h3 className="section-heading">RBAC</h3>
        <ul className="list">
          {rbacRoles.map((role) => (
            <li key={role}>{role}</li>
          ))}
        </ul>
      </section>
      <section className="stat-card">
        <h3 className="section-heading">Keselamatan</h3>
        <ul className="list">
          <li>Secure cookies (HTTPOnly, SameSite=strict).</li>
          <li>Rate limit login (5 percubaan / minit).</li>
          <li>CORS dihadkan kepada whatsappbot.laptoppro.my.</li>
          <li>Login dilindungi reCAPTCHA dan ADMIN boleh aktifkan TOTP.</li>
        </ul>
      </section>
      <section className="stat-card">
        <h3 className="section-heading">Audit</h3>
        <ul className="list">
          {response.audit.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.actor}</strong> — {entry.action}
              <br />
              <small>{new Date(entry.timestamp).toLocaleString('ms-MY')}</small>
            </li>
          ))}
        </ul>
      </section>
      <section className="stat-card">
        <h3 className="section-heading">Privasi</h3>
        <p className="section-subheading">
          Baca notis pemprosesan data peribadi mengikut Akta Perlindungan Data Peribadi (PDPA).
        </p>
        <Link href="/settings/privacy" className="nav-link">
          Lihat Privacy Notice
        </Link>
      </section>
    </div>
  );
}
