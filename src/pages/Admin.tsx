import { useCallback, useEffect, useState } from 'react';
import { isOk, listOf, request } from '../api';
import { ConfirmDialog, EmptyRow, Field, Loading, Modal, Select, StatusBadge, StatusSelect, TextInput } from '../components/ui';
import { createdOf, shortDate } from '../format';
import { useToast } from '../toast';

/* ---------------------------- Admin management ---------------------------- */

interface AdminForm { name: string; email: string; mobile: string; password: string; role: string; status: string }

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin (full access)' },
  { value: 'manager', label: 'Manager (operational)' },
];

export function AdminManagement() {
  const notify = useToast();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<AdminForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [removeId, setRemoveId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await request('GET', '/admin/admins');
    if (isOk(r)) { setAdmins(listOf(r)); setError(''); } else setError(r?.message || 'Could not load admins');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (patch: Partial<AdminForm>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const close = () => { setEditing(null); setForm(null); };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.email.trim()) { notify('Name and email required', 'error'); return; }
    if (!editing && form.password.length < 8) { notify('Password must be at least 8 characters', 'error'); return; }
    setSaving(true);
    const body: Record<string, unknown> = { name: form.name, email: form.email, mobile: form.mobile || null, role: form.role, status: form.status };
    if (form.password) body.password = form.password;
    const r = await request(editing ? 'PUT' : 'POST', editing ? `/admin/admins/${editing.id}` : '/admin/admins', body);
    setSaving(false);
    if (isOk(r)) { notify(editing ? 'Admin updated!' : 'Admin created!'); close(); load(); }
    else notify(r?.message || 'Error', 'error');
  };

  const remove = async (id: number) => {
    const r = await request('DELETE', `/admin/admins/${id}`);
    if (isOk(r)) { notify('Admin removed!'); load(); } else notify(r?.message || 'Error', 'error');
  };

  if (loading) return <Loading />;

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Admin Management ({admins.length})</div>
          <button className="btn btn-primary" onClick={() => {
            setEditing(null);
            setForm({ name: '', email: '', mobile: '', password: '', role: 'manager', status: 'active' });
          }}>
            <i className="fas fa-plus" /> Add Admin
          </button>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>{a.name || '-'}</td>
                  <td>{a.email || '-'}</td>
                  <td><span className={`badge badge-${a.role === 'admin' ? 'danger' : 'warning'}`}>{a.role || 'admin'}</span></td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>{shortDate(createdOf(a))}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-outline btn-sm" title="Edit" onClick={() => {
                      setEditing(a);
                      setForm({ name: a.name || '', email: a.email || '', mobile: a.mobile || '', password: '', role: a.role === 'admin' ? 'admin' : 'manager', status: a.status || 'active' });
                    }}><i className="fas fa-edit" /></button>{' '}
                    <button className="btn btn-danger btn-sm" title="Remove" onClick={() => setRemoveId(a.id)}><i className="fas fa-trash" /></button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && !error && <EmptyRow colSpan={7} text="No admins" />}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <Modal title={editing ? 'Edit Admin' : 'Add Admin'} onClose={close} onSave={save} saving={saving}>
          <div className="form-row">
            <Field label="Full Name"><TextInput value={form.name} onChange={(name) => set({ name })} placeholder="Admin Name" /></Field>
            <Field label="Email"><TextInput type="email" value={form.email} onChange={(email) => set({ email })} placeholder="admin@example.com" /></Field>
          </div>
          <div className="form-row">
            <Field label={<>Password {editing && '(leave blank to keep)'}</>}>
              <TextInput type="password" autoComplete="new-password" value={form.password} onChange={(password) => set({ password })} placeholder="At least 8 characters" />
            </Field>
            <Field label="Mobile"><TextInput value={form.mobile} onChange={(mobile) => set({ mobile })} /></Field>
          </div>
          <div className="form-row">
            <Field label="Role"><Select value={form.role} onChange={(role) => set({ role })} options={ROLE_OPTIONS} /></Field>
            <Field label="Status"><StatusSelect value={form.status} onChange={(status) => set({ status })} /></Field>
          </div>
        </Modal>
      )}
      {removeId !== null && (
        <ConfirmDialog
          title="Remove Admin"
          text="This removes admin access. The account itself is kept as a regular user."
          confirmLabel="Remove"
          onConfirm={() => remove(removeId)}
          onClose={() => setRemoveId(null)}
        />
      )}
    </>
  );
}

/* --------------------------- Roles & permissions --------------------------- */

const ACCESS: Record<string, { label: string; badge: string }> = {
  admin: { label: 'Full Access', badge: 'danger' },
  manager: { label: 'Operational', badge: 'success' },
  customer: { label: 'App User', badge: 'success' },
};

export function Roles() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request('GET', '/admin/roles').then((r) => { setRoles(listOf(r)); setLoading(false); });
  }, []);

  if (loading) return <Loading />;

  const allPerms = [...new Set(roles.flatMap((r) => r.permissions || []))].sort();

  return (
    <>
      <div className="card">
        <div className="card-header"><div className="card-title">Roles ({roles.length})</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Description</th><th>Access Level</th><th>Permissions</th></tr></thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td><span className="badge badge-warning">{r.name}</span></td>
                  <td>{r.description || '-'}</td>
                  <td>{ACCESS[r.name] && <span className={`badge badge-${ACCESS[r.name].badge}`}>{ACCESS[r.name].label}</span>}</td>
                  <td>{(r.permissions || []).length}</td>
                </tr>
              ))}
              {roles.length === 0 && <EmptyRow colSpan={5} text="No roles found — run the backend seed" />}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">System Permissions</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Permission</th>{roles.map((r) => <th key={r.id} style={{ textAlign: 'center' }}>{r.name}</th>)}</tr></thead>
            <tbody>
              {allPerms.map((p) => (
                <tr key={p}>
                  <td><code>{p}</code></td>
                  {roles.map((r) => (
                    <td key={r.id} style={{ textAlign: 'center' }}>
                      {(r.permissions || []).includes(p) ? <i className="fas fa-check" style={{ color: '#28a745' }} /> : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
