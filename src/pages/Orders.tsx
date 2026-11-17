import { useCallback, useEffect, useState } from 'react';
import { isOk, listOf, request, totalOf } from '../api';
import { EmptyRow, Loading, Modal, Pagination } from '../components/ui';
import { createdOf, dateTime, escapeHtml, ORDER_STATUS, PAYMENT_METHOD, shortDate } from '../format';
import { useToast } from '../toast';
import { isAr, t } from '../i18n';

const PAGE_SIZE = 15;

interface Filters { q: string; status: string; payment: string }
const NO_FILTERS: Filters = { q: '', status: '', payment: '' };

/** Add-ons chosen for a package line (JSON snapshot on the order line). */
const addOns = (it: any): any[] => {
  try { const v = typeof it.extras === 'string' ? JSON.parse(it.extras) : it.extras; return Array.isArray(v) ? v : []; } catch { return []; }
};
/** Arabic name when the admin is in Arabic and one exists. */
const localName = (x: any): string => (isAr() && x?.name_ar ? x.name_ar : x?.name || x?.name_en || '');

const addOnsText = (it: any) =>
  addOns(it).map((e) => `+ ${localName(e)} (${Number(e.price) > 0 ? `${Number(e.price).toFixed(3)} ${t('KWD')}` : t('Free')})`).join('، ');

const typeName = (it: any): string => {
  try { const pt = typeof it.package_type === 'string' ? JSON.parse(it.package_type) : it.package_type; return localName(pt); } catch { return ''; }
};

const itemName = (it: any) => {
  const base = localName(it.product) || (it.package ? `📦 ${localName(it.package)}` : `#${it.product_id}`);
  const parts = [typeName(it) && `${t('Type:')} ${typeName(it)}`, addOnsText(it)].filter(Boolean);
  return parts.length ? `${base} — ${parts.join(isAr() ? '، ' : ', ')}` : base;
};

const statusName = (s: unknown) => t(ORDER_STATUS[Number(s)]?.label ?? String(s));
const paymentName = (m: unknown) => (PAYMENT_METHOD[Number(m)] ? t(PAYMENT_METHOD[Number(m)]) : '-');

function printReceipt(o: any) {
  const w = window.open('', '_blank');
  if (!w) return;
  const e = escapeHtml;
  const items: any[] = o.products || [];
  w.document.write(`
    <html dir="${isAr() ? 'rtl' : 'ltr'}"><head><title>${t('Order #{id}', { id: e(o.id) })}</title>
    <style>
      body { font-family: ${isAr() ? "'Cairo', Tahoma" : 'Arial'}, sans-serif; padding: 20px; }
      h2 { color: #ac2023; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
      th { background: #f5f5f5; padding: 8px; text-align: start; border: 1px solid #ddd; }
      td { padding: 8px; border: 1px solid #ddd; }
      .total { font-size: 18px; font-weight: bold; color: #ac2023; }
      .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
      @media print { .no-print { display: none; } }
    </style></head><body>
    <div class="header">
      <div><h2>Thabayehkom - ذبايحكم</h2><p>${t("Order Receipt")}</p></div>
      <div><h3>${t('Order #{id}', { id: e(o.id) })}</h3><p>${e(dateTime(createdOf(o)))}</p></div>
    </div>
    <table>
      <tr><th>${t("Customer")}</th><td>${e(o.name || t('Guest'))}</td><th>${t("Email")}</th><td>${e(o.email || '-')}</td></tr>
      <tr><th>${t("Mobile")}</th><td>${e(o.mobile || '-')}</td><th>${t("Payment")}</th><td>${e(paymentName(o.payment_method))}</td></tr>
      <tr><th>${t("Status")}</th><td>${e(statusName(o.status))}</td><th>${t("Date")}</th><td>${e(dateTime(createdOf(o)))}</td></tr>
      <tr><th>${t("Subtotal")}</th><td>${e(o.sub_total)} ${t('KWD')}</td><th>${t("Delivery")}</th><td>${e(o.delivery_cost)} ${t('KWD')}</td></tr>
      <tr><th>${t("Discount")}</th><td>${e(o.discount || 0)} ${t('KWD')}</td><th class="total">${t("Total")}</th><td class="total">${e(o.total_price)} ${t('KWD')}</td></tr>
    </table>
    ${items.length ? `<table><tr><th>${t("Item")}</th><th>${t("Qty")}</th><th>${t("Price")}</th></tr>${items
      .map((it) => `<tr><td>${e(itemName(it))}</td><td>${e(it.quantity)}</td><td>${e(it.offer_price ?? it.price)} ${t('KWD')}</td></tr>`)
      .join('')}</table>` : ''}
    ${o.special_request ? `<p><strong>${t("Special Request:")}</strong> ${e(o.special_request)}</p>` : ''}
    <button class="no-print" onclick="window.print()">${t("Print")}</button>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

const filterStyle = { flex: '1 1 150px', maxWidth: 180, borderRadius: 10 };

export function Orders() {
  const notify = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [viewing, setViewing] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let url = `/admin/orders?page=${page}&pageSize=${PAGE_SIZE}`;
    if (filters.q) url += `&q=${encodeURIComponent(filters.q)}`;
    if (filters.status !== '') url += `&status=${filters.status}`;
    if (filters.payment !== '') url += `&payment_method=${filters.payment}`;
    const r = await request('GET', url);
    setOrders(listOf(r));
    setTotal(totalOf(r));
    setLoading(false);
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = (patch: Partial<Filters>) => { setPage(1); setFilters((f) => ({ ...f, ...patch })); };
  const reset = () => { setSearch(''); setPage(1); setFilters(NO_FILTERS); };

  const updateStatus = async (id: number, status: string) => {
    const r = await request('PUT', `/admin/orders/${id}/status`, { status: parseInt(status, 10) });
    if (isOk(r)) { notify('Order updated'); load(); } else notify(r?.message || 'Error', 'error');
  };

  // Open the detail modal with the list row, then enrich with items + address.
  const view = async (o: any) => {
    setViewing(o);
    const r = await request('GET', `/admin/orders/${o.id}`);
    if (isOk(r) && r.data) setViewing(r.data);
  };

  const statusOptions = Object.entries(ORDER_STATUS).map(([v, s]) => <option key={v} value={v}>{t(s.label)}</option>);

  return (
    <>
      <div className="card" style={{ marginBottom: 20, padding: '20px 25px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 280 }}>
            <i className="fas fa-search" style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 14 }} />
            <input
              className="form-control" style={{ paddingInlineStart: 36, borderRadius: 10 }}
              placeholder={t("Search name, email, mobile...")}
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters({ q: search })}
            />
          </div>
          <select className="form-control" style={filterStyle} value={filters.status} onChange={(e) => applyFilters({ status: e.target.value })}>
            <option value="">{t("All Statuses")}</option>
            {statusOptions}
          </select>
          <select className="form-control" style={filterStyle} value={filters.payment} onChange={(e) => applyFilters({ payment: e.target.value })}>
            <option value="">{t("All Payments")}</option>
            {Object.entries(PAYMENT_METHOD).map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
          </select>
          <button className="btn btn-primary" style={{ borderRadius: 10, padding: '10px 20px' }} onClick={() => applyFilters({ q: search })}>
            <i className="fas fa-search" /> {t("Search")}
          </button>
          <button className="btn btn-outline" style={{ borderRadius: 10, padding: '10px 16px' }} onClick={reset} title={t("Reset")}>
            <i className="fas fa-redo-alt" />
          </button>
          <div style={{ marginInlineStart: 'auto', background: '#f5f5f5', padding: '8px 16px', borderRadius: 20, fontSize: 13, color: '#666', fontWeight: 500 }}>
            <i className="fas fa-receipt" style={{ marginInlineEnd: 6, color: '#ac2023' }} />{t('{n} Orders', { n: total })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">{t('Orders')} ({total})</div></div>
        {loading ? <Loading /> : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>{t("Customer")}</th><th>{t("Mobile")}</th><th>{t("Type")}</th><th>{t("Total")}</th>
                    <th>{t("Delivery")}</th><th>{t("Payment")}</th><th>{t("Status")}</th><th>{t("Date")}</th><th>{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>{o.name || '-'}</td>
                      <td>{o.mobile || '-'}</td>
                      <td><span className={`badge badge-${o.user_id ? 'success' : 'warning'}`}>{t(o.user_id ? 'Registered' : 'Guest')}</span></td>
                      <td><strong>{o.total_price} {t('KWD')}</strong></td>
                      <td>{o.delivery_cost || 0} {t('KWD')}</td>
                      <td>{paymentName(o.payment_method)}</td>
                      <td>
                        <select
                          className="form-control" style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                          value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}
                        >
                          {statusOptions}
                        </select>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{shortDate(createdOf(o))}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => view(o)} title={t("View")}><i className="fas fa-eye" /></button>{' '}
                        <button className="btn btn-outline btn-sm" onClick={async () => {
                          const r = await request('GET', `/admin/orders/${o.id}`);
                          printReceipt(isOk(r) && r.data ? r.data : o);
                        }} title={t("Print")}><i className="fas fa-print" /></button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && <EmptyRow colSpan={10} text={t("No orders found")} />}
                </tbody>
              </table>
            </div>
            <Pagination current={page} total={Math.ceil(total / PAGE_SIZE)} onChange={setPage} />
          </>
        )}
      </div>

      {viewing && <OrderModal order={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

function OrderModal({ order: o, onClose }: { order: any; onClose: () => void }) {
  const st = ORDER_STATUS[o.status];
  const items: any[] = o.products || [];
  const a = o.address;
  return (
    <Modal title={t('Order #{id}', { id: o.id })} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 15 }}>
        <div><strong>{t("Customer:")}</strong> {o.name || t('Guest')}</div>
        <div><strong>{t("Email:")}</strong> {o.email || '-'}</div>
        <div><strong>{t("Mobile:")}</strong> {o.mobile || '-'}</div>
        <div><strong>{t("Type:")}</strong> {t(o.user_id ? 'Registered' : 'Guest')}</div>
        <div><strong>{t("Subtotal:")}</strong> {o.sub_total} {t('KWD')}</div>
        <div><strong>{t("Delivery:")}</strong> {o.delivery_cost} {t('KWD')}</div>
        <div><strong>{t("Discount:")}</strong> {o.discount || 0} {t('KWD')}</div>
        <div><strong>{t("Total:")}</strong> <strong style={{ color: '#ac2023' }}>{o.total_price} {t('KWD')}</strong></div>
        <div><strong>{t("Payment:")}</strong> {paymentName(o.payment_method)}</div>
        <div><strong>{t("Status:")}</strong> <span className={`badge badge-${st?.badge}`}>{statusName(o.status)}</span></div>
        <div><strong>{t("Date:")}</strong> {dateTime(createdOf(o))}</div>
        <div><strong>{t("Special Request:")}</strong> {o.special_request || '-'}</div>
      </div>
      {a && (
        <div style={{ marginBottom: 15, fontSize: 14 }}>
          <strong>{t("Address:")}</strong>{' '}
          {[a.address_name, a.block && `${t('Block')} ${a.block}`, a.street && `${t('St.')} ${a.street}`, a.avenue && `${t('Ave.')} ${a.avenue}`,
            a.building_number && `${t('Bldg')} ${a.building_number}`, a.floor_number && `${t('Floor')} ${a.floor_number}`,
            a.apartment_number && `${t('Apt')} ${a.apartment_number}`, a.notes].filter(Boolean).join(isAr() ? '، ' : ', ') || '-'}
        </div>
      )}
      {items.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 10 }}>
          <table>
            <thead><tr><th>{t("Item")}</th><th>{t("Qty")}</th><th>{t("Price")}</th><th>{t("Notes")}</th></tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{itemName(it)}</td>
                  <td>{it.quantity}</td>
                  <td>{it.offer_price ?? it.price} {t('KWD')}</td>
                  <td>{it.special_request || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ textAlign: 'end', marginTop: 10 }}>
        <button className="btn btn-primary" onClick={() => printReceipt(o)}><i className="fas fa-print" /> {t("Print Receipt")}</button>
      </div>
    </Modal>
  );
}
