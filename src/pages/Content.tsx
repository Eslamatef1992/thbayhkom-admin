import { useEffect, useState } from 'react';
import { assetUrl, listOf, request, uploadImage, uploadVideo } from '../api';
import { CrudPage } from '../components/CrudPage';
import { Field, ImageInput, Muted, Select, StatusBadge, StatusSelect, TextArea, TextInput, Thumb } from '../components/ui';
import { dateInput } from '../format';

/* -------------------------------- Banners -------------------------------- */
// Matches the app (components/banner_component.dart): on tap, type 1 opens a product,
// 2 opens a category, 3 is a video (plays full screen); 0 is a plain image (optional web link).

const BANNER_TYPES = [
  { value: '0', label: '🖼️ Image (optional web link)' },
  { value: '1', label: '🥩 Image → opens a product' },
  { value: '2', label: '📦 Image → opens a category' },
  { value: '3', label: '🎬 Video' },
];

interface Banner { id: number; type?: number; image?: string; video_url?: string; link?: string; status?: string; item_id?: number; category_name?: string }
interface BannerForm {
  type: string; status: string; link: string; categoryId: string; productId: string;
  file: File | null; image: string | null; videoFile: File | null; videoUrl: string;
}

const isVideo = (b: Banner) => b.type === 3 || !!b.video_url;

export function Banners() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  useEffect(() => {
    request('GET', '/admin/categories?page=1&pageSize=100').then((r) => setCategories(listOf(r)));
    request('GET', '/admin/products?page=1&pageSize=100').then((r) => setProducts(listOf(r)));
  }, []);

  return (
    <CrudPage<Banner, BannerForm>
      title="Banners"
      itemName="Banner"
      endpoint="/admin/banners"
      columns={[
        {
          key: 'image', label: 'Preview',
          render: (b) => isVideo(b)
            ? (b.video_url ? <a href={assetUrl(b.video_url)!} target="_blank" rel="noreferrer" title="Open video">▶️ Video</a> : <Muted>No video</Muted>)
            : <Thumb src={b.image} empty="No image" />,
        },
        { key: 'type', label: 'Type', render: (b) => BANNER_TYPES.find((t) => t.value === String(isVideo(b) ? 3 : b.type || 0))?.label ?? b.type },
        {
          key: 'link', label: 'Opens',
          render: (b) => b.type === 1 ? (products.find((p) => p.id === b.item_id)?.name ?? `Product #${b.item_id}`)
            : b.type === 2 ? (b.category_name || `Category #${b.item_id}`)
            : b.link || <Muted />,
        },
        { key: 'status', label: 'Status', render: (b) => <StatusBadge status={b.status} /> },
      ]}
      emptyForm={() => ({ type: '0', status: 'active', link: '', categoryId: '', productId: '', file: null, image: null, videoFile: null, videoUrl: '' })}
      toForm={(b) => ({
        type: String(isVideo(b) ? 3 : b.type || 0), status: b.status || 'active', link: b.link || '',
        categoryId: b.type === 2 && b.item_id ? String(b.item_id) : '',
        productId: b.type === 1 && b.item_id ? String(b.item_id) : '', file: null, image: b.image || null, videoFile: null, videoUrl: b.video_url || '',
      })}
      renderForm={(f, set) => (
        <>
          <Field label="Banner Type">
            <Select value={f.type} onChange={(type) => set({ type })} options={BANNER_TYPES} />
          </Field>
          {f.type === '3' ? (
            <>
              <Field label="Video File" hint="MP4 or WebM. Leave empty to keep the current video or use a URL below.">
                <input type="file" className="form-control" accept="video/mp4,video/webm,video/ogg,video/quicktime"
                  onChange={(e) => set({ videoFile: e.target.files?.[0] || null })} />
              </Field>
              <Field label="…or Video URL">
                <TextInput type="url" value={f.videoUrl} onChange={(videoUrl) => set({ videoUrl })} placeholder="https://..." />
              </Field>
              {progress !== null && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ background: '#eee', borderRadius: 4, height: 10 }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: '#ac2023', borderRadius: 4, transition: 'width .3s' }} />
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, color: '#555' }}>Uploading… {progress}%</div>
                </div>
              )}
            </>
          ) : (
            <Field label="Image"><ImageInput file={f.file} current={f.image} previewWidth={200} onChange={(file) => set({ file })} /></Field>
          )}
          {f.type === '1' && (
            <Field label="Product">
              <Select value={f.productId} onChange={(productId) => set({ productId })} placeholder="Select product..."
                options={products.map((p) => ({ value: String(p.id), label: p.name || p.name_en }))} />
            </Field>
          )}
          {f.type === '2' && (
            <Field label="Category">
              <Select value={f.categoryId} onChange={(categoryId) => set({ categoryId })} placeholder="Select category..."
                options={categories.map((c) => ({ value: String(c.id), label: c.name || c.name_en }))} />
            </Field>
          )}
          {f.type === '0' && (
            <Field label="Web link (optional — opens in the browser on tap)">
              <TextInput type="url" value={f.link} onChange={(link) => set({ link })} placeholder="https://..." />
            </Field>
          )}
          <Field label="Status"><StatusSelect value={f.status} onChange={(status) => set({ status })} /></Field>
        </>
      )}
      toPayload={async (f, editing) => {
        const type = Number(f.type);
        const body: Record<string, unknown> = {
          type, status: f.status, link: type === 0 && f.link ? f.link : null, item_id: null, category_name: null,
        };
        if (type === 3) {
          let video = f.videoUrl.trim();
          if (f.videoFile) {
            setProgress(0);
            try { video = await uploadVideo(f.videoFile, setProgress); } finally { setProgress(null); }
          }
          if (!video) throw new Error('Select a video file or enter a video URL');
          body.video_url = video;
        } else {
          const image = f.file ? await uploadImage(f.file) : f.image;
          if (!image) throw new Error('Select an image');
          body.image = image;
          if (editing?.video_url) body.video_url = null;
        }
        if (type === 1) {
          if (!f.productId) throw new Error('Select a product');
          body.item_id = Number(f.productId);
        }
        if (type === 2) {
          const cat = categories.find((c) => String(c.id) === f.categoryId);
          if (!cat) throw new Error('Select a category');
          body.item_id = cat.id;
          body.category_name = cat.name || cat.name_en;
        }
        return body;
      }}
    />
  );
}

/* ----------------------------- Advertisements ----------------------------- */

interface Ad { id: number; image?: string; link?: string; status?: string }
interface AdForm { file: File | null; image: string | null; link: string; status: string }

export function Advertisements() {
  return (
    <CrudPage<Ad, AdForm>
      title="Advertisements"
      itemName="Advertisement"
      endpoint="/admin/advertisements"
      columns={[
        { key: 'image', label: 'Image', render: (a) => <Thumb src={a.image} /> },
        { key: 'link', label: 'Link', render: (a) => a.link || <Muted /> },
        { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
      ]}
      emptyForm={() => ({ file: null, image: null, link: '', status: 'active' })}
      toForm={(a) => ({ file: null, image: a.image || null, link: a.link || '', status: a.status || 'active' })}
      renderForm={(f, set) => (
        <>
          <Field label="Image"><ImageInput file={f.file} current={f.image} previewWidth={200} onChange={(file) => set({ file })} /></Field>
          <Field label="Link URL"><TextInput value={f.link} onChange={(link) => set({ link })} placeholder="https://..." /></Field>
          <Field label="Status"><StatusSelect value={f.status} onChange={(status) => set({ status })} /></Field>
        </>
      )}
      toPayload={async (f) => {
        const image = f.file ? await uploadImage(f.file) : f.image;
        if (!image) throw new Error('Select an image');
        return { image, link: f.link || null, status: f.status };
      }}
    />
  );
}

/* --------------------------------- Coupons --------------------------------- */

interface Coupon { id: number; code: string; percent?: number; type?: number; max_use?: number; start_date?: string; end_date?: string; status?: string; description?: string }
interface CouponForm { code: string; type: string; percent: string; maxUse: string; start: string; end: string; status: string; description: string }

// Backend: type 2 = percentage of subtotal, type 1 = fixed KWD amount (value stored in `percent`).
const COUPON_TYPES = [
  { value: '2', label: 'Percentage (%)' },
  { value: '1', label: 'Fixed amount (KWD)' },
];
const couponValue = (c: Coupon) => (c.type === 2 ? `${c.percent ?? 0}%` : `${c.percent ?? 0} KWD`);

export function Coupons() {
  return (
    <CrudPage<Coupon, CouponForm>
      title="Coupons"
      itemName="Coupon"
      endpoint="/admin/promotion-codes"
      columns={[
        { key: 'code', label: 'Code', render: (c) => <code>{c.code}</code> },
        { key: 'percent', label: 'Discount', render: couponValue },
        { key: 'max_use', label: 'Max Use', render: (c) => c.max_use ?? <Muted>∞</Muted> },
        { key: 'dates', label: 'Valid', render: (c) => (c.start_date || c.end_date) ? `${dateInput(c.start_date) || '…'} → ${dateInput(c.end_date) || '…'}` : <Muted>Always</Muted> },
        { key: 'status', label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
      ]}
      emptyForm={() => ({ code: '', type: '2', percent: '', maxUse: '', start: '', end: '', status: 'active', description: '' })}
      toForm={(c) => ({
        code: c.code || '', type: String(c.type ?? 2), percent: c.percent != null ? String(c.percent) : '', maxUse: c.max_use != null ? String(c.max_use) : '',
        start: dateInput(c.start_date), end: dateInput(c.end_date), status: c.status || 'active', description: c.description || '',
      })}
      renderForm={(f, set) => (
        <>
          <Field label="Code"><TextInput value={f.code} onChange={(code) => set({ code: code.toUpperCase() })} placeholder="SAVE20" /></Field>
          <div className="form-row">
            <Field label="Discount Type"><Select value={f.type} onChange={(type) => set({ type })} options={COUPON_TYPES} /></Field>
            <Field label={f.type === '2' ? 'Discount %' : 'Discount (KWD)'}>
              <TextInput type="number" min={0} max={f.type === '2' ? 100 : undefined} step={1} value={f.percent} onChange={(percent) => set({ percent })} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Max Use"><TextInput type="number" min={0} value={f.maxUse} onChange={(maxUse) => set({ maxUse })} placeholder="Unlimited" /></Field>
            <Field label="Description"><TextInput value={f.description} onChange={(description) => set({ description })} placeholder="10% off" /></Field>
          </div>
          <div className="form-row">
            <Field label="Start Date"><TextInput type="date" value={f.start} onChange={(start) => set({ start })} /></Field>
            <Field label="End Date"><TextInput type="date" value={f.end} onChange={(end) => set({ end })} /></Field>
          </div>
          <Field label="Status"><StatusSelect value={f.status} onChange={(status) => set({ status })} /></Field>
        </>
      )}
      toPayload={(f) => {
        const percent = Number(f.percent);
        const type = Number(f.type);
        if (!f.code.trim()) throw new Error('Code is required');
        if (!(percent > 0)) throw new Error('Discount must be greater than 0');
        // Stored in an INTEGER column, so fixed amounts are whole KWD.
        if (!Number.isInteger(percent)) throw new Error('Discount must be a whole number');
        if (type === 2 && percent > 100) throw new Error('Percentage cannot exceed 100');
        if (f.start && f.end && f.end < f.start) throw new Error('End date is before start date');
        return {
          code: f.code.trim(), percent, type,
          max_use: f.maxUse !== '' ? Number(f.maxUse) : null,
          start_date: f.start || null, end_date: f.end || null,
          description: f.description || null, status: f.status,
        };
      }}
    />
  );
}

/* ------------------------------ Notifications ------------------------------ */

interface Notice { id: number; title?: string; message?: string }
interface NoticeForm { title: string; message: string }

export function Notifications() {
  return (
    <CrudPage<Notice, NoticeForm>
      title="Notifications"
      itemName="Notification"
      endpoint="/admin/notifications"
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'message', label: 'Message', render: (n) => (n.message || '').substring(0, 60) },
      ]}
      emptyForm={() => ({ title: '', message: '' })}
      toForm={(n) => ({ title: n.title || '', message: n.message || '' })}
      renderForm={(f, set) => (
        <>
          <Field label="Title"><TextInput value={f.title} onChange={(title) => set({ title })} /></Field>
          <Field label="Message"><TextArea rows={3} value={f.message} onChange={(message) => set({ message })} /></Field>
        </>
      )}
      toPayload={(f) => {
        if (!f.title.trim()) throw new Error('Title is required');
        return { title: f.title, message: f.message };
      }}
    />
  );
}
