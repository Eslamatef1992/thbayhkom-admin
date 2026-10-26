import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { isOk, listOf, request, totalOf } from '../api';
import { useToast } from '../toast';
import { ConfirmDialog, EmptyRow, Loading, Modal, Pagination } from './ui';

export interface Column<Row> {
  key: string;
  label: string;
  render?: (row: Row) => ReactNode;
}

export interface CrudPageProps<Row extends { id: number }, Form> {
  /** Plural title, e.g. "Categories". */
  title: string;
  /** Singular noun for modal titles, e.g. "Category". Defaults to `title`. */
  itemName?: string;
  endpoint: string;
  columns: Column<Row>[];
  emptyForm: () => Form;
  toForm: (row: Row) => Form;
  renderForm: (form: Form, set: (patch: Partial<Form>) => void, editing: Row | null) => ReactNode;
  /** Build the request body. Throw an Error to show its message and keep the modal open. */
  toPayload: (form: Form, editing: Row | null) => Promise<Record<string, unknown>> | Record<string, unknown>;
  pageSize?: number;
  /** Extra query string, e.g. "parent_id=null". */
  query?: string;
  /** Client-side filter applied to each fetched page. */
  filter?: (row: Row) => boolean;
  headerExtra?: ReactNode;
}

export function CrudPage<Row extends { id: number }, Form>({
  title, itemName, endpoint, columns, emptyForm, toForm, renderForm, toPayload,
  pageSize = 15, query, filter, headerExtra,
}: CrudPageProps<Row, Form>) {
  const notify = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const r = await request<Row[]>('GET', `${endpoint}?page=${p}&pageSize=${pageSize}${query ? `&${query}` : ''}`);
    const list = listOf<Row>(r);
    setRows(filter ? list.filter(filter) : list);
    setTotal(totalOf(r));
    setLoading(false);
  }, [endpoint, pageSize, query, filter]);

  useEffect(() => { load(page); }, [load, page]);

  const openNew = () => { setEditing(null); setForm(emptyForm()); };
  const openEdit = (row: Row) => { setEditing(row); setForm(toForm(row)); };
  const close = () => { setEditing(null); setForm(null); };
  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const body = await toPayload(form, editing);
      const r = await request(editing ? 'PUT' : 'POST', editing ? `${endpoint}/${editing.id}` : endpoint, body);
      if (isOk(r)) {
        notify(editing ? 'Updated!' : 'Created!');
        close();
        load(page);
      } else notify(r?.message || 'Error', 'error');
    } catch (e) {
      notify((e as Error).message || 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const r = await request('DELETE', `${endpoint}/${id}`);
    if (isOk(r)) { notify('Deleted!'); load(page); } else notify(r?.message || 'Error', 'error');
  };

  if (loading && rows.length === 0) return <Loading />;

  const noun = itemName || title;
  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">{title} ({total})</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {headerExtra}
            <button className="btn btn-primary" onClick={openNew}><i className="fas fa-plus" /> Add</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : ((row as any)[c.key] ?? '-')}</td>
                  ))}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(row)} title="Edit">
                      <i className="fas fa-edit" />
                    </button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(row.id)} title="Delete">
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <EmptyRow colSpan={columns.length + 1} text={`No ${title.toLowerCase()} yet`} />}
            </tbody>
          </table>
        </div>
        <Pagination current={page} total={Math.ceil(total / pageSize)} onChange={setPage} />
      </div>

      {form && (
        <Modal title={editing ? `Edit ${noun}` : `Add ${noun}`} onClose={close} onSave={save} saving={saving}>
          {renderForm(form, set, editing)}
        </Modal>
      )}
      {deleteId !== null && (
        <ConfirmDialog
          title="Delete"
          text="Are you sure you want to delete this item?"
          onConfirm={() => remove(deleteId)}
          onClose={() => setDeleteId(null)}
        />
      )}
    </>
  );
}
