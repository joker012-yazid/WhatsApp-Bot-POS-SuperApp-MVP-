import { fetchFromApi } from '../../lib/api';
import { Lang, getDictionary } from '../../lib/i18n';

type CustomerResponse = {
  customers: Array<{
    id: string;
    name: string;
    phone: string;
    lastPurchase: string;
    totalSpend: number;
  }>;
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const fallbackCustomers = (): CustomerResponse => ({
  customers: [
    {
      id: 'c1',
      name: 'Aina',
      phone: '+60123456789',
      lastPurchase: '2024-04-23',
      totalSpend: 765
    },
    {
      id: 'c2',
      name: 'Daniel',
      phone: '+60199887766',
      lastPurchase: '2024-04-22',
      totalSpend: 2240
    }
  ]
});

function formatCurrency(value: number) {
  return `RM ${value.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}`;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const lang = (searchParams?.lang === 'en' ? 'en' : 'ms') as Lang;
  const dict = getDictionary(lang);
  const response =
    (await fetchFromApi<CustomerResponse>('/customers', lang)) ?? fallbackCustomers();

  return (
    <div>
      <h2 className="section-heading">{dict.customersTitle}</h2>
      <p className="section-subheading">{dict.customersSubtitle}</p>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Last Purchase</th>
            <th>Total Spend</th>
          </tr>
        </thead>
        <tbody>
          {response.customers.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.name}</td>
              <td>{customer.phone}</td>
              <td>{customer.lastPurchase}</td>
              <td>{formatCurrency(customer.totalSpend)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
