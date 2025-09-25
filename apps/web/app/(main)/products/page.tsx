import { fetchFromApi } from '../../lib/api';
import { Lang, getDictionary } from '../../lib/i18n';
import { ProductsTable } from '../components/ProductsTable';

type ProductResponse = {
  products: Array<{
    id: string;
    sku: string;
    name: string;
    price: number;
    stock: number;
    branch: string;
  }>;
};

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const fallbackProducts = (): ProductResponse => ({
  products: [
    { id: '1', sku: 'SKU-001', name: 'Produk Contoh', price: 25, stock: 100, branch: 'BR-HQ' },
    { id: '2', sku: 'SKU-002', name: 'Pek Premium', price: 78, stock: 42, branch: 'BR-HQ' },
    { id: '3', sku: 'SKU-010', name: 'Bundle Raya', price: 150, stock: 18, branch: 'BR-JB' }
  ]
});

export default async function ProductsPage({ searchParams }: PageProps) {
  const lang = (searchParams?.lang === 'en' ? 'en' : 'ms') as Lang;
  const dict = getDictionary(lang);
  const response =
    (await fetchFromApi<ProductResponse>('/pos/products', lang)) ?? fallbackProducts();

  return (
    <div>
      <h2 className="section-heading">{dict.productsTitle}</h2>
      <p className="section-subheading">{dict.productsSubtitle}</p>
      <ProductsTable products={response.products} dict={dict} />
    </div>
  );
}
