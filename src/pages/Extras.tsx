import { useCallback, useEffect, useState } from 'react';
import { isOk, listOf, request, totalOf } from '../api';
import {
  ConfirmDialog, EmptyRow, Field, Loading, Modal, Pagination, StatusBadge, StatusSelect, TextInput,
} from '../components/ui';
import { useToast } from '../toast';

/**
 * Extras: add-ons (free or paid) that can be attached to packages.
 * In the app, customers tick the ones they want on the package page.
 */

const PAGE_SIZE = 20;

interface ExtraForm { name: string; nameAr: string; free: boolean; price: string; status: string; sortOrder: string }

const emptyForm = (): ExtraForm => ({ name: '', nameAr: '', free: false, price: '', status: 'active', sortOrder: '0' });
const toForm = (e: any): ExtraForm => {
  const price = Number(e.price) || 0;
  return {
    name: e.name || '', nameAr: e.name_ar || '', free: price === 0, price: price ? String(price) : '',
    status: e.status || 'active', sortOrder: String(e.sort_order ?? 0),
  };
};

export const priceLabel = (price: unknown) => (Number(price) > 0 ? `${Number(price).toFixed(3)} KWD` : 'Free');

export function Extras() {
  const notify = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<ExtraForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await request('GET', `/admin/extras?page=${page}&pageSize=${PAGE_SIZE}`);
    setRows(listOf(r));
    setTotal(totalOf(r));
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const set = (patch: Partial<ExtraForm>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const close = () => { setEditing(null); setForm(null); };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) return notify('English name is required', 'error');
    if (!form.nameAr.trim()) return notify('Arabic name is required', 'error');
    const price = form.free ? 0 : Number(form.price);
    if (!form.free && !(price > 0)) return notify('Enter a price, or mark the extra as Free', 'error');
    setSaving(true);
    const body = {
      name: form.name.trim(), name_ar: form.nameAr.trim(), price,
      status: form.status, sort_order: Number(form.sortOrder) || 0,
    };
    const r = await request(editing ? 'PUT' : 'POST', editing ? `/admin/extras/${editing.id}` : '/admin/extras', body);
    setSaving(false);
    if (isOk(r)) { notify(editing ? 'Extra updated!' : 'Extra created!'); close(); load(); }
    else notify(r?.message || 'Error', 'error');
  };

  const remove = async (id: number) => {
    const r = await request('DELETE', `/admin/extras/${id}`);
    if (isOk(r)) { notify('Deleted!'); load(); } else notify(r?.message || 'Error', 'error');
  };

  if (loading && rows.length === 0) return <Loading />;

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Extras ({total})</div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(emptyForm()); }}>
            <i className="fas fa-plus" /> Add Extra
          </button>
        </div>
        <p style={{ margin: '0 0 14px', color: '#777', fontSize: 13 }}>
          Add-ons customers can tick on a package (e.g. cutting, packaging, extra liver). Attach them to packages from the Packages page.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name (EN)</th><th>Name (AR)</th><th>Price</th><th>Status</th><th>Sort</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.name}</strong></td>
                  <td dir="rtl">{e.name_ar || '-'}</td>
                  <td>
                    {Number(e.price) > 0
                      ? <strong style={{ color: '#ac2023' }}>{priceLabel(e.price)}</strong>
                      : <span className="badge badge-success">Free</span>}
                  </td>
                  <td><StatusBadge status={e.status} /></td>
                  <td>{e.sort_order ?? 0}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-outline btn-sm" title="Edit" onClick={() => { setEditing(e); setForm(toForm(e)); }}>
                      <i className="fas fa-edit" />
                    </button>{' '}
                    <button className="btn btn-danger btn-sm" title="Delete" onClick={() => setDeleteId(e.id)}>
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <EmptyRow colSpan={6} text="No extras yet — create one with “Add Extra”" />}
            </tbody>
          </table>
        </div>
        <Pagination current={page} total={Math.ceil(total / PAGE_SIZE)} onChange={setPage} />
      </div>

      {form && (
        <Modal title={editing ? 'Edit Extra' : 'Add Extra'} onClose={close} onSave={save} saving={saving}>
          <div className="form-row">
            <Field label="Extra Name (English)"><TextInput value={form.name} onChange={(name) => set({ name })} placeholder="e.g. Extra liver" /></Field>
            <Field label="Extra Name (Arabic)"><TextInput dir="rtl" value={form.nameAr} onChange={(nameAr) => set({ nameAr })} placeholder="مثال: كبدة إضافية" /></Field>
          </div>
          <div className="form-row">
            <Field label="Pricing">
              <div style={{ display: 'flex', gap: 18, alignItems: 'center', minHeight: 42 }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" checked={!form.free} onChange={() => set({ free: false })} /> Paid
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                  <input type="radio" checked={form.free} onChange={() => set({ free: true, price: '' })} /> Free
                </label>
              </div>
            </Field>
            <Field label="Price (KWD)" hint={form.free ? 'Free extras show as “Free” in the app.' : 'Added to the package price when ticked.'}>
              <TextInput type="number" step="0.001" min={0} disabled={form.free} value={form.free ? '0' : form.price}
                onChange={(price) => set({ price })} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Status"><StatusSelect value={form.status} onChange={(status) => set({ status })} /></Field>
            <Field label="Sort Order" hint="Lower numbers show first in the app.">
              <TextInput type="number" value={form.sortOrder} onChange={(sortOrder) => set({ sortOrder })} />
            </Field>
          </div>
        </Modal>
      )}
      {deleteId !== null && (
        <ConfirmDialog
          title="Delete Extra"
          text="Delete this extra? It is removed from every package. Past orders keep it."
          onConfirm={() => remove(deleteId)}
          onClose={() => setDeleteId(null)}
        />
      )}
    </>
  );
}
