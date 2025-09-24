'use client';

import { useMemo, useState } from 'react';
import type { Dictionary } from '../../lib/i18n';

type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  branch: string;
};

type ProductsTableProps = {
  products: Product[];
  dict: Dictionary;
};

function formatCurrency(value: number) {
  return `RM ${value.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}`;
}

export function ProductsTable({ products, dict }: ProductsTableProps) {
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState<string>('all');

  const branches = useMemo(() => ['all', ...new Set(products.map((product) => product.branch))], [
    products
  ]);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      const matchesBranch = branch === 'all' || product.branch === branch;
      return matchesSearch && matchesBranch;
    });
  }, [products, search, branch]);

  return (
    <div>
      <div className="products-table__filters">
        <input
          type="search"
          className="input products-table__search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari produk..."
        />
        <select
          className="select"
          value={branch}
          onChange={(event) => setBranch(event.target.value)}
        >
          {branches.map((item) => (
            <option key={item} value={item}>
              {item === 'all' ? 'Semua Cawangan' : item}
            </option>
          ))}
        </select>
      </div>
      <div className="products-table__table">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>{dict.productsTitle}</th>
              <th>Branch</th>
              <th>Harga</th>
              <th>Stok</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id}>
                <td>{product.sku}</td>
                <td>{product.name}</td>
                <td>{product.branch}</td>
                <td>{formatCurrency(product.price)}</td>
                <td>{product.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
