import { useCallback, useEffect, useState } from 'react';
import { isOk, listOf, request, totalOf } from '../api';
import {
  ConfirmDialog, EmptyRow, Field, Loading, Modal, Pagination, StatusBadge, StatusSelect, TextInput,
} from '../components/ui';
import { useToast } from '../toast';

/**
 * Types (e.g. Naimi / Harri / Australian) that a package can offer.
 * In the app, the customer picks one before choosing add-ons.
 */

const PAGE_SIZE = 20;

interface TypeForm { name: string; nameAr: string; status: string; sortOrder: string }

const emptyForm = (): TypeForm => ({ name: '', nameAr: '', status: 'active', sortOrder: '0' });
const toForm = (e: any): TypeForm => ({
  name: e.name || '', nameAr: e.name_ar || '', status: e.status || 'active', sortOrder: String(e.sort_order ?? 0),
});

export function Types() {
  const notify = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<TypeForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await request('GET', `/admin/types?page=${page}&pageSize=${PAGE_SIZE}`);
    setRows(listOf(r));
    setTotal(totalOf(r));
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const set = (patch: Partial<TypeForm>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const close = () => { setEditing(null); setForm(null); };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim()) return notify('English name is required', 'error');
    if (!form.nameAr.trim()) return notify('Arabic name is required', 'error');
    setSaving(true);
    const body = {
      name: form.name.trim(), name_ar: form.nameAr.trim(),
      status: form.status, sort_order: Number(form.sortOrder) || 0,
    };
    const r = await request(editing ? 'PUT' : 'POST', editing ? `/admin/types/${editing.id}` : '/admin/types', body);
    setSaving(false);
    if (isOk(r)) { notify(editing ? 'Type updated!' : 'Type created!'); close(); load(); }
    else notify(r?.message || 'Error', 'error');
  };

  const remove = async (id: number) => {
    const r = await request('DELETE', `/admin/types/${id}`);
    if (isOk(r)) { notify('Deleted!'); load(); } else notify(r?.message || 'Error', 'error');
  };

  if (loading && rows.length === 0) return <Loading />;

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Types ({total})</div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(emptyForm()); }}>
            <i className="fas fa-plus" /> Add Type
          </button>
        </div>
        <p style={{ margin: '0 0 14px', color: '#777', fontSize: 13 }}>
          Types a package can come in (e.g. Naimi, Harri, Australian). In a package, turn on “Has types” and pick which types it offers — the customer chooses one in the app.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name (EN)</th><th>Name (AR)</th><th>Status</th><th>Sort</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.name}</strong></td>
                  <td dir="rtl">{e.name_ar || '-'}</td>
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
              {rows.length === 0 && <EmptyRow colSpan={5} text="No types yet — create one with “Add Type”" />}
            </tbody>
          </table>
        </div>
        <Pagination current={page} total={Math.ceil(total / PAGE_SIZE)} onChange={setPage} />
      </div>

      {form && (
        <Modal title={editing ? 'Edit Type' : 'Add Type'} onClose={close} onSave={save} saving={saving}>
          <div className="form-row">
            <Field label="Type Name (English)"><TextInput value={form.name} onChange={(name) => set({ name })} placeholder="e.g. Naimi" /></Field>
            <Field label="Type Name (Arabic)"><TextInput dir="rtl" value={form.nameAr} onChange={(nameAr) => set({ nameAr })} placeholder="مثال: نعيمي" /></Field>
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
          title="Delete Type"
          text="Delete this type? It is removed from every package. Past orders keep it."
          onConfirm={() => remove(deleteId)}
          onClose={() => setDeleteId(null)}
        />
      )}
    </>
  );
}
