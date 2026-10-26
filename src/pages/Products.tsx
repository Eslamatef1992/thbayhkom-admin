import { useCallback, useEffect, useState } from 'react';
import { isOk, listOf, request, totalOf, uploadImage } from '../api';
import { ConfirmDialog, EmptyRow, Field, ImageInput, Loading, Modal, Pagination, StatusBadge, StatusSelect, TextArea, TextInput, Thumb } from '../components/ui';
import { isTruthyFlag } from '../format';
import { useToast } from '../toast';

const PAGE_SIZE = 15;

interface Option { id: number; name?: string; name_en?: string }
const optionName = (o: Option) => o.name || o.name_en || `#${o.id}`;

interface ProductForm {
  name: string; nameAr: string; description: string; descriptionAr: string;
  price: string; discountPrice: string; quantity: string; categoryId: string; status: string;
  featured: boolean; bestSeller: boolean; cutTypeIds: number[]; serviceTypeIds: number[];
  file: File | null; image: string | null;
}

const emptyForm = (): ProductForm => ({
  name: '', nameAr: '', description: '', descriptionAr: '', price: '', discountPrice: '', quantity: '100',
  categoryId: '', status: 'active', featured: false, bestSeller: false, cutTypeIds: [], serviceTypeIds: [],
  file: null, image: null,
});

const toForm = (p: any): ProductForm => ({
  name: p.name_en || p.name || '',
  nameAr: p.name_ar || '',
  description: p.description_en || p.description || '',
  descriptionAr: p.description_ar || '',
  price: p.price != null ? String(p.price) : '',
  discountPrice: p.discount_price != null ? String(p.discount_price) : '',
  quantity: p.quantity != null ? String(p.quantity) : '100',
  categoryId: p.category_id ? String(p.category_id) : '',
  status: p.status || 'active',
  featured: isTruthyFlag(p.is_featured),
  bestSeller: isTruthyFlag(p.is_best_seller),
  cutTypeIds: p.cut_type_ids || [],
  serviceTypeIds: p.service_type_ids || [],
  file: null,
  image: p.image || null,
});

const toggleId = (ids: number[], id: number) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

export function Products() {
  const notify = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Option[]>([]);
  const [cutTypes, setCutTypes] = useState<Option[]>([]);
  const [serviceTypes, setServiceTypes] = useState<Option[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      request('GET', '/admin/categories?page=1&pageSize=100'),
      request('GET', '/admin/cut-types?page=1&pageSize=100'),
      request('GET', '/admin/service-types?page=1&pageSize=100'),
    ]).then(([c, ct, st]) => { setCategories(listOf(c)); setCutTypes(listOf(ct)); setServiceTypes(listOf(st)); });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await request('GET', `/admin/products?page=${page}&pageSize=${PAGE_SIZE}`);
    setProducts(listOf(r));
    setTotal(totalOf(r));
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const set = (patch: Partial<ProductForm>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const close = () => { setEditing(null); setForm(null); };

  const openEdit = async (p: any) => {
    setEditing(p);
    setForm(toForm(p));
    // The list row has no cut/service type links; fetch the full product.
    const r = await request('GET', `/admin/products/${p.id}`);
    if (isOk(r) && r.data) setForm((f) => (f ? { ...f, cutTypeIds: r.data.cut_type_ids || [], serviceTypeIds: r.data.service_type_ids || [] } : f));
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) { notify('Name is required', 'error'); return; }
    if (form.price === '' || isNaN(Number(form.price))) { notify('Price is required', 'error'); return; }
    setSaving(true);
    try {
      const image = form.file ? await uploadImage(form.file) : null;
      const body = {
        name: form.name, name_en: form.name, name_ar: form.nameAr,
        description: form.description, description_en: form.description, description_ar: form.descriptionAr,
        price: Number(form.price),
        discount_price: form.discountPrice !== '' ? Number(form.discountPrice) : null,
        quantity: Number(form.quantity || 0),
        category_id: form.categoryId ? Number(form.categoryId) : null,
        status: form.status,
        is_featured: form.featured ? 1 : 0,
        is_best_seller: form.bestSeller ? 1 : 0,
        cut_type_ids: form.cutTypeIds,
        service_type_ids: form.serviceTypeIds,
        ...(image ? { image, images: [image] } : {}),
      };
      const r = await request(editing ? 'PUT' : 'POST', editing ? `/admin/products/${editing.id}` : '/admin/products', body);
      if (isOk(r)) { notify(editing ? 'Product updated!' : 'Product created!'); close(); load(); }
      else notify(r?.message || 'Error', 'error');
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const r = await request('DELETE', `/admin/products/${id}`);
    if (isOk(r)) { notify('Deleted!'); load(); } else notify(r?.message || 'Error', 'error');
  };

  if (loading && products.length === 0) return <Loading />;

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Products ({total})</div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(emptyForm()); }}>
            <i className="fas fa-plus" /> Add
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Image</th><th>Name (EN)</th><th>Name (AR)</th><th>Price</th><th>Tags</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td><Thumb src={p.image} /></td>
                  <td>{p.name || p.name_en || '-'}</td>
                  <td>{p.name_ar || '-'}</td>
                  <td>
                    {p.discount_price ? (
                      <><s style={{ color: '#aaa' }}>{p.price}</s> {p.discount_price} KWD</>
                    ) : <>{p.price} KWD</>}
                  </td>
                  <td>
                    {isTruthyFlag(p.is_featured) && <span style={{ marginRight: 4 }} title="Featured">⭐</span>}
                    {isTruthyFlag(p.is_best_seller) && <span title="Best seller">🔥</span>}
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)} title="Edit"><i className="fas fa-edit" /></button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(p.id)} title="Delete"><i className="fas fa-trash" /></button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <EmptyRow colSpan={7} text="No products yet" />}
            </tbody>
          </table>
        </div>
        <Pagination current={page} total={Math.ceil(total / PAGE_SIZE)} onChange={setPage} />
      </div>

      {form && (
        <Modal title={editing ? 'Edit Product' : 'Add Product'} onClose={close} onSave={save} saving={saving}>
          <div className="form-row">
            <Field label="Name (EN)"><TextInput value={form.name} onChange={(name) => set({ name })} /></Field>
            <Field label="Name (AR)"><TextInput dir="rtl" value={form.nameAr} onChange={(nameAr) => set({ nameAr })} /></Field>
          </div>
          <Field label="Description (EN)"><TextArea rows={2} value={form.description} onChange={(description) => set({ description })} /></Field>
          <Field label="Description (AR)"><TextArea rows={2} dir="rtl" value={form.descriptionAr} onChange={(descriptionAr) => set({ descriptionAr })} /></Field>
          <div className="form-row">
            <Field label="Price (KWD)"><TextInput type="number" step="0.001" value={form.price} onChange={(price) => set({ price })} /></Field>
            <Field label="Discount Price"><TextInput type="number" step="0.001" value={form.discountPrice} onChange={(discountPrice) => set({ discountPrice })} /></Field>
          </div>
          <div className="form-row">
            <Field label="Quantity"><TextInput type="number" value={form.quantity} onChange={(quantity) => set({ quantity })} /></Field>
            <Field label="Category">
              <select className="form-control" value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
                <option value="">Select...</option>
                {categories.map((c) => <option key={c.id} value={String(c.id)}>{optionName(c)}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Status"><StatusSelect value={form.status} onChange={(status) => set({ status })} /></Field>
          <Field label="Product Tags">
            <div style={{ display: 'flex', gap: 12 }}>
              <TagToggle checked={form.featured} onChange={(featured) => set({ featured })} title="⭐ Featured" hint="Show on home screen" />
              <TagToggle checked={form.bestSeller} onChange={(bestSeller) => set({ bestSeller })} title="🔥 Best Seller" hint="Show in best sellers" />
            </div>
          </Field>
          {cutTypes.length > 0 && (
            <Field label="Cut Types">
              <CheckList options={cutTypes} selected={form.cutTypeIds} onToggle={(id) => set({ cutTypeIds: toggleId(form.cutTypeIds, id) })} />
            </Field>
          )}
          {serviceTypes.length > 0 && (
            <Field label="Service Types">
              <CheckList options={serviceTypes} selected={form.serviceTypeIds} onToggle={(id) => set({ serviceTypeIds: toggleId(form.serviceTypeIds, id) })} />
            </Field>
          )}
          <Field label="Image"><ImageInput file={form.file} current={form.image} onChange={(file) => set({ file })} /></Field>
        </Modal>
      )}
      {deleteId !== null && (
        <ConfirmDialog title="Delete Product" text="Are you sure?" onConfirm={() => remove(deleteId)} onClose={() => setDeleteId(null)} />
      )}
    </>
  );
}

function TagToggle({ checked, onChange, title, hint }: { checked: boolean; onChange: (v: boolean) => void; title: string; hint: string }) {
  return (
    <label
      style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 12, borderRadius: 10,
        border: `2px solid ${checked ? '#ac2023' : '#e0e0e0'}`, background: checked ? '#fff5f5' : '#fafafa',
      }}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18, accentColor: '#ac2023', cursor: 'pointer' }} />
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#888' }}>{hint}</div>
      </div>
    </label>
  );
}

function CheckList({ options, selected, onToggle }: { options: Option[]; selected: number[]; onToggle: (id: number) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, border: '1px solid #e0e0e0', borderRadius: 8, padding: 12 }}>
      {options.map((o) => (
        <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={selected.includes(o.id)} onChange={() => onToggle(o.id)} />
          <span style={{ fontSize: 13 }}>{optionName(o)}</span>
        </label>
      ))}
    </div>
  );
}
