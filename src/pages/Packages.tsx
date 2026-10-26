import { useCallback, useEffect, useMemo, useState } from 'react';
import { isOk, listOf, request, totalOf, uploadImage } from '../api';
import {
  ConfirmDialog, EmptyRow, Field, ImageInput, Loading, Modal, Pagination, StatusBadge, StatusSelect, TextArea, TextInput, Thumb,
} from '../components/ui';
import { useToast } from '../toast';

/**
 * Packages: bundles of products sold together at a package price.
 * The app shows price_after as the price and price_before struck through.
 */

const PAGE_SIZE = 15;

interface Line { productId: string; quantity: string }
interface PackageForm {
  name: string; nameAr: string; description: string; descriptionAr: string;
  priceBefore: string; priceAfter: string; status: string; sortOrder: string;
  file: File | null; image: string | null; lines: Line[];
}

const emptyForm = (): PackageForm => ({
  name: '', nameAr: '', description: '', descriptionAr: '', priceBefore: '', priceAfter: '',
  status: 'active', sortOrder: '0', file: null, image: null, lines: [{ productId: '', quantity: '1' }],
});

const toForm = (p: any): PackageForm => ({
  name: p.name || '', nameAr: p.name_ar || '', description: p.description || '', descriptionAr: p.description_ar || '',
  priceBefore: p.price_before != null ? String(p.price_before) : '', priceAfter: p.price_after != null ? String(p.price_after) : '',
  status: p.status || 'active', sortOrder: String(p.sort_order ?? 0), file: null, image: p.image || null,
  lines: (p.items || []).map((it: any) => ({ productId: String(it.product_id), quantity: String(it.quantity || 1) })),
});

const kwd = (v: number) => `${v.toFixed(3)} KWD`;
const unitPrice = (p: any) => Number(p?.discount_price ?? p?.price ?? 0);
const discountPct = (before: number, after: number) => (before > after && before > 0 ? Math.round(((before - after) / before) * 100) : 0);

export function Packages() {
  const notify = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<PackageForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    request('GET', '/admin/products?page=1&pageSize=100').then((r) => setProducts(listOf(r)));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await request('GET', `/admin/packages?page=${page}&pageSize=${PAGE_SIZE}`);
    setRows(listOf(r));
    setTotal(totalOf(r));
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const set = (patch: Partial<PackageForm>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setLine = (i: number, patch: Partial<Line>) =>
    setForm((f) => (f ? { ...f, lines: f.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) } : f));
  const close = () => { setEditing(null); setForm(null); };

  const productById = useMemo(() => new Map(products.map((p) => [String(p.id), p])), [products]);

  // Sum of the chosen products at their normal prices — a guide for "price before".
  const productsTotal = (form?.lines || []).reduce((s, l) => {
    const p = productById.get(l.productId);
    return s + (p ? unitPrice(p) * (Number(l.quantity) || 0) : 0);
  }, 0);

  const save = async () => {
    if (!form) return;
    const lines = form.lines.filter((l) => l.productId);
    const after = Number(form.priceAfter);
    const before = form.priceBefore === '' ? null : Number(form.priceBefore);
    if (!form.name.trim()) return notify('Name (EN) is required', 'error');
    if (!lines.length) return notify('Add at least one product', 'error');
    if (new Set(lines.map((l) => l.productId)).size !== lines.length) return notify('Each product can only be added once', 'error');
    if (!(after > 0)) return notify('Package price must be greater than 0', 'error');
    if (before !== null && before < after) return notify('Price before must be ≥ the package price', 'error');
    setSaving(true);
    try {
      const image = form.file ? await uploadImage(form.file) : form.image;
      const body = {
        name: form.name.trim(), name_ar: form.nameAr.trim() || null,
        description: form.description || null, description_ar: form.descriptionAr || null,
        image, price_before: before, price_after: after, status: form.status, sort_order: Number(form.sortOrder) || 0,
        products: lines.map((l) => ({ product_id: Number(l.productId), quantity: Math.max(1, Number(l.quantity) || 1) })),
      };
      const r = await request(editing ? 'PUT' : 'POST', editing ? `/admin/packages/${editing.id}` : '/admin/packages', body);
      if (isOk(r)) { notify(editing ? 'Package updated!' : 'Package created!'); close(); load(); }
      else notify(r?.message || 'Error', 'error');
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const r = await request('DELETE', `/admin/packages/${id}`);
    if (isOk(r)) { notify('Deleted!'); load(); } else notify(r?.message || 'Error', 'error');
  };

  if (loading && rows.length === 0) return <Loading />;

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Packages ({total})</div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(emptyForm()); }}>
            <i className="fas fa-plus" /> Add Package
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Image</th><th>Name (EN)</th><th>Name (AR)</th><th>Products</th><th>Price</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const before = Number(p.price_before ?? 0);
                const after = Number(p.price_after ?? 0);
                const pct = discountPct(before, after);
                return (
                  <tr key={p.id}>
                    <td><Thumb src={p.image} /></td>
                    <td><strong>{p.name}</strong></td>
                    <td dir="rtl">{p.name_ar || '-'}</td>
                    <td style={{ fontSize: 13 }}>
                      {(p.items || []).map((it: any) => (
                        <div key={it.id}>{it.quantity} × {it.product?.name || `#${it.product_id}`}</div>
                      ))}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {before > after && <s style={{ color: '#aaa', marginRight: 6 }}>{before}</s>}
                      <strong style={{ color: '#ac2023' }}>{after} KWD</strong>
                      {pct > 0 && <span className="badge badge-success" style={{ marginLeft: 6 }}>-{pct}%</span>}
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-outline btn-sm" title="Edit" onClick={() => { setEditing(p); setForm(toForm(p)); }}>
                        <i className="fas fa-edit" />
                      </button>{' '}
                      <button className="btn btn-danger btn-sm" title="Delete" onClick={() => setDeleteId(p.id)}>
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <EmptyRow colSpan={7} text="No packages yet — create one with “Add Package”" />}
            </tbody>
          </table>
        </div>
        <Pagination current={page} total={Math.ceil(total / PAGE_SIZE)} onChange={setPage} />
      </div>

      {form && (
        <Modal title={editing ? 'Edit Package' : 'Add Package'} onClose={close} onSave={save} saving={saving}>
          <div className="form-row">
            <Field label="Package Name (English)"><TextInput value={form.name} onChange={(name) => set({ name })} placeholder="e.g. BBQ Box" /></Field>
            <Field label="Package Name (Arabic)"><TextInput dir="rtl" value={form.nameAr} onChange={(nameAr) => set({ nameAr })} placeholder="مثال: صندوق المشاوي" /></Field>
          </div>
          <Field label="Description (English)"><TextArea rows={3} value={form.description} onChange={(description) => set({ description })} /></Field>
          <Field label="Description (Arabic)"><TextArea rows={3} dir="rtl" value={form.descriptionAr} onChange={(descriptionAr) => set({ descriptionAr })} /></Field>

          <Field label="Products in this package">
            <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12 }}>
              {form.lines.map((l, i) => {
                const p = productById.get(l.productId);
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <select className="form-control" style={{ flex: 1 }} value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value })}>
                      <option value="">Select product...</option>
                      {products.map((pr) => (
                        <option key={pr.id} value={String(pr.id)}>{pr.name || pr.name_en} — {unitPrice(pr)} KWD</option>
                      ))}
                    </select>
                    <input className="form-control" type="number" min={1} style={{ width: 80 }} title="Quantity"
                      value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                    <span style={{ width: 90, fontSize: 12, color: '#888', textAlign: 'right' }}>
                      {p ? kwd(unitPrice(p) * (Number(l.quantity) || 0)) : ''}
                    </span>
                    <button className="btn btn-outline btn-sm" title="Remove" disabled={form.lines.length === 1}
                      onClick={() => set({ lines: form.lines.filter((_, j) => j !== i) })}>
                      <i className="fas fa-times" />
                    </button>
                  </div>
                );
              })}
              <button className="btn btn-outline btn-sm" onClick={() => set({ lines: [...form.lines, { productId: '', quantity: '1' }] })}>
                <i className="fas fa-plus" /> Add product
              </button>
              <div style={{ marginTop: 10, fontSize: 13, color: '#555' }}>
                Products total at normal prices: <strong>{kwd(productsTotal)}</strong>{' '}
                {productsTotal > 0 && (
                  <button className="btn btn-outline btn-sm" style={{ marginLeft: 6 }} onClick={() => set({ priceBefore: productsTotal.toFixed(3) })}>
                    Use as “price before”
                  </button>
                )}
              </div>
            </div>
          </Field>

          <div className="form-row">
            <Field label="Price Before (KWD)" hint="Shown struck through in the app (optional).">
              <TextInput type="number" step="0.001" min={0} value={form.priceBefore} onChange={(priceBefore) => set({ priceBefore })} />
            </Field>
            <Field
              label="Package Price — After (KWD)"
              hint={discountPct(Number(form.priceBefore), Number(form.priceAfter)) > 0
                ? `Customer saves ${discountPct(Number(form.priceBefore), Number(form.priceAfter))}%`
                : 'What the customer pays.'}
            >
              <TextInput type="number" step="0.001" min={0} value={form.priceAfter} onChange={(priceAfter) => set({ priceAfter })} />
            </Field>
          </div>
          <Field label="Image"><ImageInput file={form.file} current={form.image} previewWidth={200} onChange={(file) => set({ file })} /></Field>
          <div className="form-row">
            <Field label="Status"><StatusSelect value={form.status} onChange={(status) => set({ status })} /></Field>
            <Field label="Sort Order" hint="Lower numbers show first in the app.">
              <TextInput type="number" value={form.sortOrder} onChange={(sortOrder) => set({ sortOrder })} />
            </Field>
          </div>
        </Modal>
      )}
      {deleteId !== null && (
        <ConfirmDialog title="Delete Package" text="Delete this package? Carts holding it will drop it." onConfirm={() => remove(deleteId)} onClose={() => setDeleteId(null)} />
      )}
    </>
  );
}
