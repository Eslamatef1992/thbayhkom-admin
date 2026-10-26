import { useEffect, useState, type ReactNode } from 'react';
import { assetUrl } from '../api';

export function Loading() {
  return (
    <div className="loading">
      <div className="spinner" />
    </div>
  );
}

export function Modal({
  title, children, onClose, onSave, saving = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSave?: () => void;
  saving?: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {onSave && (
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={onSave} disabled={saving}>
              <i className={`fas fa-${saving ? 'spinner fa-spin' : 'save'}`} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title, text, confirmLabel = 'Delete', onConfirm, onClose,
}: {
  title: string;
  text: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay">
      <div className="confirm-box">
        <div className="confirm-icon"><i className="fas fa-exclamation-triangle" /></div>
        <div className="confirm-title">{title}</div>
        <div className="confirm-text">{text}</div>
        <div className="confirm-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/** Page buttons; shows a sliding window of 10 when there are more pages. */
export function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  const size = 10;
  const start = Math.max(1, Math.min(current - Math.floor(size / 2), total - size + 1));
  const pages = Array.from({ length: Math.min(total, size) }, (_, i) => start + i);
  return (
    <div className="pagination">
      {start > 1 && <button className="page-btn" onClick={() => onChange(1)}>«</button>}
      {pages.map((p) => (
        <button key={p} className={`page-btn ${p === current ? 'active' : ''}`} onClick={() => onChange(p)}>{p}</button>
      ))}
      {start + size - 1 < total && <button className="page-btn" onClick={() => onChange(total)}>»</button>}
    </div>
  );
}

export function StatusBadge({ status, fallback = 'active' }: { status?: string | null; fallback?: string }) {
  const s = status || fallback;
  return <span className={`badge badge-${s === 'active' ? 'success' : 'danger'}`}>{s}</span>;
}

export function Muted({ children = '-' }: { children?: ReactNode }) {
  return <span style={{ color: '#ccc', fontSize: 12 }}>{children}</span>;
}

export function Thumb({ src, empty = '-' }: { src?: string | null; empty?: string }) {
  const url = assetUrl(src);
  const [broken, setBroken] = useState(false);
  if (!url || broken) return <Muted>{empty}</Muted>;
  return <img className="table-img" src={url} alt="" onError={() => setBroken(true)} />;
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ textAlign: 'center', padding: 30, color: '#888' }}>{text}</td>
    </tr>
  );
}

/* ----------------------------- Form fields ----------------------------- */

export function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {hint && <small style={{ color: '#888', fontSize: 12 }}>{hint}</small>}
    </div>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string;
  onChange: (v: string) => void;
};

export function TextInput({ value, onChange, ...rest }: InputProps) {
  return <input className="form-control" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function TextArea({ value, onChange, rows = 3, dir }: { value: string; onChange: (v: string) => void; rows?: number; dir?: string }) {
  return <textarea className="form-control" rows={rows} dir={dir} value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function Select({
  value, onChange, options, placeholder, style,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  return (
    <select className="form-control" value={value} onChange={(e) => onChange(e.target.value)} style={style}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Select value={value} onChange={onChange} options={STATUS_OPTIONS} />;
}

/** File picker with preview of the chosen file, or of the current image when editing. */
export function ImageInput({
  file, onChange, current, previewWidth = 120,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  current?: string | null;
  previewWidth?: number;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const shown = preview || assetUrl(current);
  return (
    <>
      <input type="file" className="form-control" accept="image/*" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      {shown && <img src={shown} alt="preview" style={{ width: previewWidth, marginTop: 10, borderRadius: 8 }} />}
    </>
  );
}
