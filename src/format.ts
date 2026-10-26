/** Order status codes used by the backend and the Flutter app. */
export const ORDER_STATUS: Record<number, { label: string; color: string; badge: 'warning' | 'success' | 'danger' }> = {
  0: { label: 'Pending', color: '#f39c12', badge: 'warning' },
  1: { label: 'Confirmed', color: '#27ae60', badge: 'success' },
  2: { label: 'Processing', color: '#2980b9', badge: 'success' },
  3: { label: 'Out for Delivery', color: '#8e44ad', badge: 'success' },
  4: { label: 'Delivered', color: '#27ae60', badge: 'success' },
  5: { label: 'Cancelled', color: '#e74c3c', badge: 'danger' },
};

export const PAYMENT_METHOD: Record<number, string> = { 1: 'KNET', 2: 'Credit Card', 3: 'COD', 4: 'Sadad' };

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
};

/** e.g. "26 Oct 2026" */
export function shortDate(v: unknown): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
}

export function dateTime(v: unknown): string {
  const d = toDate(v);
  return d ? d.toLocaleString() : '-';
}

/** Sequelize returns `createdAt`; some payloads use `created_at`. */
export const createdOf = (row: any) => row?.createdAt ?? row?.created_at;

export const isTruthyFlag = (v: unknown) => v === 1 || v === true || v === '1';

/** Value for an `<input type="date">` from an ISO date/datetime. */
export function dateInput(v: unknown): string {
  const d = toDate(v);
  return d ? d.toISOString().slice(0, 10) : '';
}

export function escapeHtml(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
