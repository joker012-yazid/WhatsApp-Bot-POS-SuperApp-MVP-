import { fetchFromApi } from '../lib/api';
import { Lang, getDictionary } from '../lib/i18n';

type DashboardResponse = {
  sessions: number;
  sales: number;
  tickets: number;
  apiP95: number;
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function fallbackStats(): DashboardResponse {
  return {
    sessions: 4,
    sales: 2450.4,
    tickets: 6,
    apiP95: 180
  };
}

function formatCurrency(value: number) {
  return `RM ${value.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}`;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const lang = (searchParams?.lang === 'en' ? 'en' : 'ms') as Lang;
  const dict = getDictionary(lang);
  const data =
    (await fetchFromApi<DashboardResponse>('/dashboard', lang)) ?? fallbackStats();

  const stats = [
    { label: dict.activeSessions, value: data.sessions.toString() },
    { label: dict.todaysSales, value: formatCurrency(data.sales) },
    { label: dict.ticketsInProgress, value: data.tickets.toString() },
    { label: dict.apiLatency, value: `${data.apiP95} ms` }
  ];

  return (
    <div className="stats-grid two-column">
      {stats.map((stat) => (
        <article key={stat.label} className="stat-card">
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
        </article>
      ))}
      <article className="stat-card" style={{ gridColumn: '1 / -1' }}>
        <h2 className="section-heading">{dict.operationalNotes}</h2>
        <ul className="list">
          <li>Rate limit WhatsApp outbound 1 msg/s (burst 5) dijaga oleh Baileys gateway.</li>
          <li>Job BACKUP_DAILY dijadualkan 02:00 melalui worker BullMQ.</li>
          <li>Sasaran p95 API ≤ 300ms dipantau melalui laporan.</li>
        </ul>
      </article>
    </div>
  );
}
