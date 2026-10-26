import { useCallback, useEffect, useState } from 'react';
import { assetUrl, isOk, listOf, request, totalOf, uploadImage } from '../api';
import { CrudPage } from '../components/CrudPage';
import { EmptyRow, Field, Loading, Pagination, Select, TextArea, TextInput } from '../components/ui';
import { createdOf, dateTime } from '../format';
import { useToast } from '../toast';

/* -------------------------------- Settings -------------------------------- */
// Keys match the `settings` table / mobile `getSetting` payload.

type FieldDef = { key: string; label: string; dir?: 'rtl'; type?: string; placeholder?: string };

const GROUPS: { title: string; icon: string; fields: FieldDef[] }[] = [
  {
    title: 'General', icon: 'info-circle', fields: [
      { key: 'title', label: 'App Name' },
      { key: 'url', label: 'Website URL', placeholder: 'https://thabayehkom.app' },
      { key: 'description', label: 'Description' },
      { key: 'address', label: 'Address' },
    ],
  },
  {
    title: 'Contact', icon: 'phone', fields: [
      { key: 'phone', label: 'Phone' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'info_email', label: 'Email', type: 'email' },
    ],
  },
  {
    title: 'Social Media', icon: 'share-alt', fields: [
      { key: 'instagram', label: 'Instagram' },
      { key: 'snapchat', label: 'Snapchat' },
      { key: 'twitter', label: 'Twitter / X' },
      { key: 'facebook', label: 'Facebook' },
      { key: 'youtube', label: 'YouTube' },
      { key: 'whatsApp', label: 'WhatsApp', placeholder: 'Number only, e.g. 96512345678' },
    ],
  },
  {
    title: 'Mobile Apps', icon: 'mobile-alt', fields: [
      { key: 'play_store_url', label: 'Android App URL' },
      { key: 'app_store_url', label: 'iOS App URL' },
    ],
  },
  {
    title: 'Ordering', icon: 'clock', fields: [
      { key: 'min_order', label: 'Minimum Order (KWD)', type: 'number' },
      { key: 'from_hour', label: 'Opening Hour', type: 'time' },
      { key: 'to_hour', label: 'Closing Hour', type: 'time' },
    ],
  },
];

const TOGGLES = [
  { key: 'is_alowed_register', label: 'Allow Registration' },
  { key: 'is_alowed_login', label: 'Allow Login' },
  { key: 'is_alowed_buying', label: 'Allow Buying' },
  { key: 'is_alowed_cart', label: 'Allow Cart' },
  { key: 'is_maintenance_mode', label: 'Maintenance Mode' },
];

const EDITABLE = [...GROUPS.flatMap((g) => g.fields.map((f) => f.key)), ...TOGGLES.map((t) => t.key), 'logo'];

export function Settings() {
  const notify = useToast();
  const [s, setS] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [logo, setLogo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request('GET', '/admin/settings').then((r) => { setS((r?.data as any) || {}); setLoading(false); });
  }, []);

  const set = (k: string, v: any) => setS((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, any> = {};
      for (const k of EDITABLE) if (s[k] !== undefined) body[k] = s[k] === '' ? null : s[k];
      if (body.min_order != null) body.min_order = Number(body.min_order);
      if (logo) body.logo = await uploadImage(logo);
      const r = await request('PUT', '/admin/settings', body);
      if (isOk(r)) { notify('Settings saved!'); setS((r.data as any) || s); setLogo(null); }
      else notify(r?.message || 'Error', 'error');
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      {GROUPS.map((g) => (
        <div className="card" key={g.title}>
          <div className="card-header">
            <div className="card-title"><i className={`fas fa-${g.icon}`} style={{ color: '#ac2023', marginRight: 8 }} />{g.title}</div>
          </div>
          <div className="form-row">
            {g.fields.map((f) => (
              <Field key={f.key} label={f.label}>
                <TextInput type={f.type || 'text'} dir={f.dir || 'ltr'} placeholder={f.placeholder}
                  value={s[f.key] == null ? '' : String(s[f.key])} onChange={(v) => set(f.key, v)} />
              </Field>
            ))}
          </div>
        </div>
      ))}
      <div className="card">
        <div className="card-header"><div className="card-title"><i className="fas fa-toggle-on" style={{ color: '#ac2023', marginRight: 8 }} />App Features</div></div>
        <div className="form-row">
          {TOGGLES.map((t) => (
            <Field key={t.key} label={t.label}>
              <Select value={Number(s[t.key]) ? '1' : '0'} onChange={(v) => set(t.key, Number(v))}
                options={[{ value: '1', label: 'Yes' }, { value: '0', label: 'No' }]} />
            </Field>
          ))}
        </div>
        <Field label="Logo">
          <input type="file" className="form-control" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
          {!logo && s.logo && <img src={assetUrl(s.logo)!} alt="logo" style={{ width: 120, marginTop: 10, borderRadius: 8 }} />}
        </Field>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          <i className={`fas fa-${saving ? 'spinner fa-spin' : 'save'}`} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </>
  );
}

/* ---------------------------------- Pages ---------------------------------- */

interface Page { id: number; title?: string; title_en?: string; title_ar?: string; description?: string; description_en?: string; description_ar?: string; slug?: string; type?: string }
interface PageForm { title: string; titleAr: string; slug: string; content: string; contentAr: string; type: string }

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function Pages() {
  return (
    <CrudPage<Page, PageForm>
      title="Pages"
      itemName="Page"
      endpoint="/admin/pages"
      columns={[
        { key: 'title', label: 'Title (EN)', render: (p) => p.title_en || p.title || '-' },
        { key: 'title_ar', label: 'Title (AR)', render: (p) => p.title_ar || '-' },
        { key: 'slug', label: 'Slug', render: (p) => <code style={{ fontSize: 12, background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{p.slug || '-'}</code> },
        { key: 'type', label: 'Type', render: (p) => <span className={`badge badge-${p.type === 'mobile' ? 'warning' : 'success'}`}>{p.type || 'web'}</span> },
      ]}
      emptyForm={() => ({ title: '', titleAr: '', slug: '', content: '', contentAr: '', type: 'web' })}
      toForm={(p) => ({
        title: p.title_en || p.title || '', titleAr: p.title_ar || '', slug: p.slug || '',
        content: p.description_en || p.description || '', contentAr: p.description_ar || '', type: p.type || 'web',
      })}
      renderForm={(f, set) => (
        <>
          <div className="form-row">
            <Field label="Title (English)"><TextInput value={f.title} onChange={(title) => set({ title })} placeholder="e.g. Privacy Policy" /></Field>
            <Field label="Title (Arabic)"><TextInput dir="rtl" value={f.titleAr} onChange={(titleAr) => set({ titleAr })} placeholder="مثال: سياسة الخصوصية" /></Field>
          </div>
          <Field label="Slug (URL key)" hint={`Used in URL: /pages/${f.slug || slugify(f.title) || 'privacy-policy'}`}>
            <TextInput value={f.slug} onChange={(slug) => set({ slug })} placeholder="privacy-policy" />
          </Field>
          <Field label="Content (English)"><TextArea rows={5} value={f.content} onChange={(content) => set({ content })} /></Field>
          <Field label="Content (Arabic)"><TextArea rows={5} dir="rtl" value={f.contentAr} onChange={(contentAr) => set({ contentAr })} /></Field>
          <Field label="Platform">
            <Select value={f.type} onChange={(type) => set({ type })}
              options={[{ value: 'web', label: 'Website' }, { value: 'mobile', label: 'Mobile App' }, { value: 'both', label: 'Both' }]} />
          </Field>
        </>
      )}
      toPayload={(f) => {
        if (!f.title.trim()) throw new Error('Title is required');
        return {
          title: f.title, title_en: f.title, title_ar: f.titleAr,
          description: f.content, description_en: f.content, description_ar: f.contentAr,
          slug: f.slug || slugify(f.title), type: f.type,
        };
      }}
    />
  );
}

/* ----------------------------- Contact messages ----------------------------- */

const CONTACT_PAGE_SIZE = 20;

export function Contacts() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await request('GET', `/admin/contact-messages?page=${page}&pageSize=${CONTACT_PAGE_SIZE}`);
    setRows(listOf(r));
    setTotal(totalOf(r));
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  if (loading && rows.length === 0) return <Loading />;

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Contact Messages ({total})</div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Mobile</th><th>Message</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={7} text="No messages yet" />}
            {rows.map((m) => (
              <tr key={m.id} style={{ background: m.is_read ? '#fff' : '#fffdf0' }}>
                <td>{m.id}</td>
                <td><strong>{m.name || '-'}</strong></td>
                <td>{m.email ? <a href={`mailto:${m.email}`}>{m.email}</a> : '-'}</td>
                <td>{m.mobile || '-'}</td>
                <td style={{ maxWidth: 250, wordBreak: 'break-word' }}>{m.message || '-'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{dateTime(createdOf(m))}</td>
                <td><span className={`badge badge-${m.is_read ? 'success' : 'warning'}`}>{m.is_read ? 'Read' : 'Unread'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination current={page} total={Math.ceil(total / CONTACT_PAGE_SIZE)} onChange={setPage} />
    </div>
  );
}
