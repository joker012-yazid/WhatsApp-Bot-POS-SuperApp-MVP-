import { fetchFromApi } from '../../lib/api';
import { Lang, getDictionary } from '../../lib/i18n';

type ReportsResponse = {
  reports: Array<{
    id: string;
    name: string;
    range: string;
    status: string;
    p95: string;
  }>;
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const fallbackReports = (): ReportsResponse => ({
  reports: [
    { id: 'r1', name: 'Daily Sales', range: '2024-04-16 → 2024-04-23', status: 'Ready', p95: '210 ms' },
    { id: 'r2', name: 'Ticket SLA', range: 'April 2024', status: 'Refreshing', p95: '280 ms' }
  ]
});

export default async function ReportsPage({ searchParams }: PageProps) {
  const lang = (searchParams?.lang === 'en' ? 'en' : 'ms') as Lang;
  const dict = getDictionary(lang);
  const response =
    (await fetchFromApi<ReportsResponse>('/reports', lang)) ?? fallbackReports();

  return (
    <div>
      <h2 className="section-heading">{dict.reportsTitle}</h2>
      <p className="section-subheading">{dict.reportsSubtitle}</p>
      <table className="table">
        <thead>
          <tr>
            <th>{dict.reportsTitle}</th>
            <th>Range</th>
            <th>Status</th>
            <th>{dict.apiLatency}</th>
          </tr>
        </thead>
        <tbody>
          {response.reports.map((report) => (
            <tr key={report.id}>
              <td>{report.name}</td>
              <td>{report.range}</td>
              <td>{report.status}</td>
              <td>{report.p95}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
