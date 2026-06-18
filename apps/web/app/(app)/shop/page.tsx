'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Pencil, Plus, ShoppingCart } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Badge, Button, Card, Input, Modal, PageHeader, Select } from '@/components/ui';
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

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', PKR: '₨', INR: '₹', AED: 'AED ' };
function money(n: number, c: string) {
  return `${SYMBOL[c] ?? `${c} `}${n.toLocaleString()}`;
}

export default function ShopPage() {
  const qc = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [productModal, setProductModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [sellProduct, setSellProduct] = useState<Product | null>(null);
  const [sellQty, setSellQty] = useState(1);
  const [sellMethod, setSellMethod] = useState('cash');

  const productsQ = useQuery({ queryKey: ['products'], queryFn: () => apiFetch<Product[]>('/pos/products') });
  const salesQ = useQuery({ queryKey: ['sales'], queryFn: () => apiFetch<SalesResp>('/pos/sales') });
  const gymQ = useQuery({
    queryKey: ['gym'],
    queryFn: () => apiFetch<{ name: string; currency: string; address: string | null; city: string | null }>('/gym'),
  });
  const currency = gymQ.data?.currency ?? 'USD';

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['products'] });
    void qc.invalidateQueries({ queryKey: ['sales'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const saveProduct = useMutation({
    mutationFn: (b: { name: string; price: number; stock: number; isActive: boolean }) =>
      editing
        ? apiFetch(`/pos/products/${editing.id}`, { method: 'PATCH', body: JSON.stringify(b) })
        : apiFetch('/pos/products', { method: 'POST', body: JSON.stringify(b) }),
    onSuccess: () => {
      setNotice(editing ? 'Product updated' : 'Product added');
      setProductModal(false);
      setEditing(null);
      invalidate();
    },
  });
  const sell = useMutation({
    mutationFn: (b: { productId: string; quantity: number; method: string }) =>
      apiFetch('/pos/sell', { method: 'POST', body: JSON.stringify(b) }),
    onSuccess: () => {
      setNotice(`Sold ${sellQty} × ${sellProduct?.name} ✓`);
      setSellProduct(null);
      invalidate();
    },
  });
  const archive = useMutation({
    mutationFn: (id: string) => apiFetch(`/pos/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setNotice('Product archived');
      invalidate();
    },
  });

  function openAdd() {
    setEditing(null);
    setProductModal(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setProductModal(true);
  }
  function openSell(p: Product) {
    setSellProduct(p);
    setSellQty(1);
    setSellMethod('cash');
  }

  function onSaveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    saveProduct.mutate({
      name: String(f.get('name') ?? '').trim(),
      price: Number(f.get('price')),
      stock: Number(f.get('stock')) || 0,
      isActive: f.get('isActive') === 'on',
    });
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
      currency,
      lines: [{ name: s.productName, qty: s.quantity, amount: s.total }],
      total: s.total,
    });
  }

  const products = productsQ.data ?? [];
  const sales = salesQ.data?.sales ?? [];
  const todayTotal = salesQ.data?.todayTotal ?? 0;

  return (
    <div>
      <PageHeader
        title="Shop"
        description="Sell supplements, drinks, and merchandise at the front desk. Add products, track stock, and record every sale with a receipt."
      >
        <span className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
          Today: {money(todayTotal, currency)}
        </span>
        <Button onClick={openAdd}>
          <Plus size={16} /> Add product
        </Button>
      </PageHeader>

      {notice && <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{notice}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className={`transition hover:bg-slate-50/60 ${p.isActive ? '' : 'opacity-50'}`}>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {p.name}
                    {!p.isActive && <span className="ml-2 text-xs font-normal text-slate-500">(archived)</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{money(p.price, currency)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge tone={p.stock <= 0 ? 'red' : p.stock <= 3 ? 'amber' : 'slate'}>{p.stock} left</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button disabled={!p.isActive || p.stock <= 0} onClick={() => openSell(p)}>
                        <ShoppingCart size={15} /> Sell
                      </Button>
                      <button
                        onClick={() => openEdit(p)}
                        aria-label="Edit product"
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand"
                      >
                        <Pencil size={16} />
                      </button>
                      {p.isActive && (
                        <button
                          onClick={() => {
                            if (confirm(`Archive “${p.name}”?`)) archive.mutate(p.id);
                          }}
                          className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && !productsQ.isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No products yet — add your first item to start selling.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Recent sales</h2>
          <Card className="max-h-[28rem] overflow-y-auto">
            <ul className="divide-y divide-slate-100">
              {sales.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-700">
                      {s.productName} <span className="text-slate-500">× {s.quantity}</span>
                    </div>
                    <div className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold">{money(s.total, currency)}</span>
                    <button onClick={() => receiptFor(s)} className="text-xs font-medium text-brand hover:underline">
                      Receipt
                    </button>
                  </div>
                </li>
              ))}
              {sales.length === 0 && <li className="py-6 text-center text-sm text-slate-500">No sales yet.</li>}
            </ul>
          </Card>
        </div>
      </div>

      {/* Add / edit product */}
      <Modal
        open={productModal}
        onClose={() => {
          setProductModal(false);
          setEditing(null);
        }}
        title={editing ? `Edit “${editing.name}”` : 'Add a product'}
        description="Items you sell at the desk — set the price and how many are in stock."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setProductModal(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="product-form" disabled={saveProduct.isPending}>
              {saveProduct.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add product'}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={onSaveProduct} className="space-y-4">
          <Input label="Product name" name="name" required placeholder="e.g. Whey Protein 1kg" defaultValue={editing?.name ?? ''} />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price"
              name="price"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={editing ? editing.price : ''}
            />
            <Input
              label={editing ? 'Stock on hand' : 'Starting stock'}
              name="stock"
              type="number"
              min={0}
              defaultValue={editing ? editing.stock : 0}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={editing ? editing.isActive : true}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            Active — available to sell
          </label>
          {saveProduct.error && <p className="text-sm text-red-600">{(saveProduct.error as Error).message}</p>}
        </form>
      </Modal>

      {/* Sell product */}
      <Modal
        open={!!sellProduct}
        onClose={() => setSellProduct(null)}
        title={sellProduct ? `Sell ${sellProduct.name}` : ''}
        description="Record a counter sale. Stock and today's takings update automatically."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSellProduct(null)}>
              Cancel
            </Button>
            <Button
              disabled={sell.isPending}
              onClick={() =>
                sellProduct && sell.mutate({ productId: sellProduct.id, quantity: sellQty, method: sellMethod })
              }
            >
              {sell.isPending ? 'Recording…' : 'Record sale'}
            </Button>
          </>
        }
      >
        {sellProduct && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-600">Quantity</span>
                <input
                  type="number"
                  min={1}
                  max={sellProduct.stock}
                  value={sellQty}
                  onChange={(e) => setSellQty(Math.max(1, Math.min(sellProduct.stock, Number(e.target.value) || 1)))}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
                />
              </label>
              <Select label="Payment method" value={sellMethod} onChange={(e) => setSellMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
                <option value="bank">Bank</option>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">
                {sellProduct.stock} in stock · {money(sellProduct.price, currency)} each
              </span>
              <span className="text-xl font-bold text-slate-900">{money(sellProduct.price * sellQty, currency)}</span>
            </div>
            {sell.error && <p className="text-sm text-red-600">{(sell.error as Error).message}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
