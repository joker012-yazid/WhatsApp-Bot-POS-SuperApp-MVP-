import { fetchFromApi } from '../../lib/api';
import { Lang, getDictionary } from '../../lib/i18n';

type FormsResponse = {
  forms: Array<{
    id: string;
    name: string;
    responses: number;
    status: 'Active' | 'Draft' | 'Closed';
  }>;
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const fallbackForms = (): FormsResponse => ({
  forms: [
    { id: 'f1', name: 'Kaji Selidik Kepuasan', responses: 128, status: 'Active' },
    { id: 'f2', name: 'Permohonan Pembayaran', responses: 64, status: 'Draft' }
  ]
});

export default async function FormsPage({ searchParams }: PageProps) {
  const lang = (searchParams?.lang === 'en' ? 'en' : 'ms') as Lang;
  const dict = getDictionary(lang);
  const response = (await fetchFromApi<FormsResponse>('/forms', lang)) ?? fallbackForms();

  return (
    <div>
      <h2 className="section-heading">{dict.formsTitle}</h2>
      <p className="section-subheading">{dict.formsSubtitle}</p>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Responses</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {response.forms.map((form) => (
            <tr key={form.id}>
              <td>{form.name}</td>
              <td>{form.responses}</td>
              <td>{form.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
