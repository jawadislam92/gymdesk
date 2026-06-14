'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input } from '@/components/ui';
import { printReceipt } from '@/lib/receipt';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
}
interface Sale {
  id: string;
  productName: string;
  quantity: number;
  total: number;
  method: string;
  createdAt: string;
}
interface SalesResp {
  sales: Sale[];
  todayTotal: number;
}

export default function ShopPage() {
  const qc = useQueryClient();
  const productsQ = useQuery({ queryKey: ['products'], queryFn: () => apiFetch<Product[]>('/pos/products') });
  const salesQ = useQuery({ queryKey: ['sales'], queryFn: () => apiFetch<SalesResp>('/pos/sales') });
  const gymQ = useQuery({
    queryKey: ['gym'],
    queryFn: () =>
      apiFetch<{ name: string; currency: string; address: string | null; city: string | null }>('/gym'),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['products'] });
    void qc.invalidateQueries({ queryKey: ['sales'] });
  };
  const addProduct = useMutation({
    mutationFn: (b: { name: string; price: number; stock: number }) =>
      apiFetch('/pos/products', { method: 'POST', body: JSON.stringify(b) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['products'] }),
  });
  const sell = useMutation({
    mutationFn: (b: { productId: string; quantity: number }) =>
      apiFetch('/pos/sell', { method: 'POST', body: JSON.stringify(b) }),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (id: string) => apiFetch(`/pos/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['products'] }),
  });

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    addProduct.mutate({
      name: String(f.get('name')),
      price: Number(f.get('price')),
      stock: Number(f.get('stock')) || 0,
    });
    e.currentTarget.reset();
  }

  function receiptFor(s: Sale) {
    const g = gymQ.data;
    printReceipt({
      gymName: g?.name ?? 'Gym',
      gymAddress: [g?.address, g?.city].filter(Boolean).join(', ') || null,
      title: 'Sales receipt',
      reference: s.id.slice(0, 8).toUpperCase(),
      dateLabel: new Date(s.createdAt).toLocaleString(),
      method: s.method,
      currency: g?.currency ?? 'USD',
      lines: [{ name: s.productName, qty: s.quantity, amount: s.total }],
      total: s.total,
    });
  }

  const products = productsQ.data ?? [];
  const sales = salesQ.data?.sales ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shop</h1>
        <Badge tone="green">Today: ${(salesQ.data?.todayTotal ?? 0).toLocaleString()}</Badge>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">Add product</h2>
        <form onSubmit={onAdd} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="col-span-2">
            <Input label="Name" name="name" placeholder="e.g. Whey Protein" required />
          </div>
          <Input label="Price" name="price" type="number" min={0} step="0.01" required />
          <Input label="Stock" name="stock" type="number" min={0} defaultValue={0} />
          <div className="col-span-2 sm:col-span-4">
            <Button type="submit" disabled={addProduct.isPending}>
              {addProduct.isPending ? 'Saving…' : 'Add product'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-right">Sell</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.id} className={p.isActive ? '' : 'opacity-40'}>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-right">${p.price}</td>
                <td className="px-4 py-3 text-right">
                  <Badge tone={p.stock <= 0 ? 'red' : p.stock <= 3 ? 'amber' : 'slate'}>{p.stock}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <input
                      id={`qty-${p.id}`}
                      type="number"
                      min={1}
                      defaultValue={1}
                      className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                    <Button
                      disabled={!p.isActive || p.stock <= 0 || sell.isPending}
                      onClick={() => {
                        const qty = Number((document.getElementById(`qty-${p.id}`) as HTMLInputElement)?.value) || 1;
                        sell.mutate({ productId: p.id, quantity: qty });
                      }}
                    >
                      Sell
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {p.isActive && (
                    <button onClick={() => archive.mutate(p.id)} className="text-xs text-slate-400 hover:text-red-600">
                      Archive
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && !productsQ.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No products yet — add your first item above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Recent sales</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {sales.map((s) => (
            <li key={s.id} className="flex justify-between py-2">
              <span>
                {s.productName} <span className="text-slate-400">×{s.quantity}</span>
              </span>
              <span className="text-slate-500">{new Date(s.createdAt).toLocaleString()}</span>
              <span className="font-medium">${s.total}</span>
              <button
                onClick={() => receiptFor(s)}
                className="text-xs font-medium text-brand hover:underline"
              >
                Receipt
              </button>
            </li>
          ))}
          {sales.length === 0 && <li className="py-2 text-slate-400">No sales yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
