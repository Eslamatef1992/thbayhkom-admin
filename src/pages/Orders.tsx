import { useCallback, useEffect, useState } from 'react';
import { isOk, listOf, request, totalOf } from '../api';
import { EmptyRow, Loading, Modal, Pagination } from '../components/ui';
import { createdOf, dateTime, escapeHtml, ORDER_STATUS, PAYMENT_METHOD, shortDate } from '../format';
import { useToast } from '../toast';

const PAGE_SIZE = 15;

interface Filters { q: string; status: string; payment: string }
const NO_FILTERS: Filters = { q: '', status: '', payment: '' };

const itemName = (it: any) => it.product?.name || it.product?.name_en || `#${it.product_id}`;

function printReceipt(o: any) {
  const w = window.open('', '_blank');
  if (!w) return;
  const e = escapeHtml;
  const items: any[] = o.products || [];
  w.document.write(`
    <html><head><title>Order #${e(o.id)}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h2 { color: #ac2023; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
      th { background: #f5f5f5; padding: 8px; text-align: left; border: 1px solid #ddd; }
      td { padding: 8px; border: 1px solid #ddd; }
      .total { font-size: 18px; font-weight: bold; color: #ac2023; }
      .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
      @media print { .no-print { display: none; } }
    </style></head><body>
    <div class="header">
      <div><h2>Thabayehkom - ذبايحكم</h2><p>Order Receipt</p></div>
      <div><h3>Order #${e(o.id)}</h3><p>${e(dateTime(createdOf(o)))}</p></div>
    </div>
    <table>
      <tr><th>Customer</th><td>${e(o.name || 'Guest')}</td><th>Email</th><td>${e(o.email || '-')}</td></tr>
      <tr><th>Mobile</th><td>${e(o.mobile || '-')}</td><th>Payment</th><td>${e(PAYMENT_METHOD[o.payment_method] || '-')}</td></tr>
      <tr><th>Status</th><td>${e(ORDER_STATUS[o.status]?.label || o.status)}</td><th>Date</th><td>${e(dateTime(createdOf(o)))}</td></tr>
      <tr><th>Subtotal</th><td>${e(o.sub_total)} KWD</td><th>Delivery</th><td>${e(o.delivery_cost)} KWD</td></tr>
      <tr><th>Discount</th><td>${e(o.discount || 0)} KWD</td><th class="total">Total</th><td class="total">${e(o.total_price)} KWD</td></tr>
    </table>
    ${items.length ? `<table><tr><th>Item</th><th>Qty</th><th>Price</th></tr>${items
      .map((it) => `<tr><td>${e(itemName(it))}</td><td>${e(it.quantity)}</td><td>${e(it.offer_price ?? it.price)} KWD</td></tr>`)
      .join('')}</table>` : ''}
    ${o.special_request ? `<p><strong>Special Request:</strong> ${e(o.special_request)}</p>` : ''}
    <button class="no-print" onclick="window.print()">Print</button>
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

  const statusOptions = Object.entries(ORDER_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>);

  return (
    <>
      <div className="card" style={{ marginBottom: 20, padding: '20px 25px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 280 }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 14 }} />
            <input
              className="form-control" style={{ paddingLeft: 36, borderRadius: 10 }}
              placeholder="Search name, email, mobile..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters({ q: search })}
            />
          </div>
          <select className="form-control" style={filterStyle} value={filters.status} onChange={(e) => applyFilters({ status: e.target.value })}>
            <option value="">All Statuses</option>
            {statusOptions}
          </select>
          <select className="form-control" style={filterStyle} value={filters.payment} onChange={(e) => applyFilters({ payment: e.target.value })}>
            <option value="">All Payments</option>
            {Object.entries(PAYMENT_METHOD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="btn btn-primary" style={{ borderRadius: 10, padding: '10px 20px' }} onClick={() => applyFilters({ q: search })}>
            <i className="fas fa-search" /> Search
          </button>
          <button className="btn btn-outline" style={{ borderRadius: 10, padding: '10px 16px' }} onClick={reset} title="Reset">
            <i className="fas fa-redo-alt" />
          </button>
          <div style={{ marginLeft: 'auto', background: '#f5f5f5', padding: '8px 16px', borderRadius: 20, fontSize: 13, color: '#666', fontWeight: 500 }}>
            <i className="fas fa-receipt" style={{ marginRight: 6, color: '#ac2023' }} />{total} Orders
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Orders ({total})</div></div>
        {loading ? <Loading /> : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Customer</th><th>Mobile</th><th>Type</th><th>Total</th>
                    <th>Delivery</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>{o.name || '-'}</td>
                      <td>{o.mobile || '-'}</td>
                      <td><span className={`badge badge-${o.user_id ? 'success' : 'warning'}`}>{o.user_id ? 'Registered' : 'Guest'}</span></td>
                      <td><strong>{o.total_price} KWD</strong></td>
                      <td>{o.delivery_cost || 0} KWD</td>
                      <td>{PAYMENT_METHOD[o.payment_method] || '-'}</td>
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
                        <button className="btn btn-outline btn-sm" onClick={() => view(o)} title="View"><i className="fas fa-eye" /></button>{' '}
                        <button className="btn btn-outline btn-sm" onClick={async () => {
                          const r = await request('GET', `/admin/orders/${o.id}`);
                          printReceipt(isOk(r) && r.data ? r.data : o);
                        }} title="Print"><i className="fas fa-print" /></button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && <EmptyRow colSpan={10} text="No orders found" />}
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
    <Modal title={`Order #${o.id}`} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 15 }}>
        <div><strong>Customer:</strong> {o.name || 'Guest'}</div>
        <div><strong>Email:</strong> {o.email || '-'}</div>
        <div><strong>Mobile:</strong> {o.mobile || '-'}</div>
        <div><strong>Type:</strong> {o.user_id ? 'Registered' : 'Guest'}</div>
        <div><strong>Subtotal:</strong> {o.sub_total} KWD</div>
        <div><strong>Delivery:</strong> {o.delivery_cost} KWD</div>
        <div><strong>Discount:</strong> {o.discount || 0} KWD</div>
        <div><strong>Total:</strong> <strong style={{ color: '#ac2023' }}>{o.total_price} KWD</strong></div>
        <div><strong>Payment:</strong> {PAYMENT_METHOD[o.payment_method] || '-'}</div>
        <div><strong>Status:</strong> <span className={`badge badge-${st?.badge}`}>{st?.label ?? o.status}</span></div>
        <div><strong>Date:</strong> {dateTime(createdOf(o))}</div>
        <div><strong>Special Request:</strong> {o.special_request || '-'}</div>
      </div>
      {a && (
        <div style={{ marginBottom: 15, fontSize: 14 }}>
          <strong>Address:</strong>{' '}
          {[a.address_name, a.block && `Block ${a.block}`, a.street && `St. ${a.street}`, a.avenue && `Ave. ${a.avenue}`,
            a.building_number && `Bldg ${a.building_number}`, a.floor_number && `Floor ${a.floor_number}`,
            a.apartment_number && `Apt ${a.apartment_number}`, a.notes].filter(Boolean).join(', ') || '-'}
        </div>
      )}
      {items.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 10 }}>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Notes</th></tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{itemName(it)}</td>
                  <td>{it.quantity}</td>
                  <td>{it.offer_price ?? it.price} KWD</td>
                  <td>{it.special_request || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ textAlign: 'right', marginTop: 10 }}>
        <button className="btn btn-primary" onClick={() => printReceipt(o)}><i className="fas fa-print" /> Print Receipt</button>
      </div>
    </Modal>
  );
}
