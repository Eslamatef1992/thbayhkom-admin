import { useEffect, useState } from 'react';
import { listOf, request, totalOf } from '../api';
import { EmptyRow, Loading } from '../components/ui';
import { createdOf, ORDER_STATUS, shortDate } from '../format';

export function Dashboard() {
  const [stats, setStats] = useState({ orders: 0, users: 0, products: 0, categories: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      request('GET', '/admin/orders?page=1&pageSize=5'),
      request('GET', '/admin/customers?page=1&pageSize=1'),
      request('GET', '/admin/products?page=1&pageSize=1'),
      request('GET', '/admin/categories?page=1&pageSize=1'),
    ]).then(([orders, users, products, categories]) => {
      setStats({
        orders: orders?.meta?.total || 0,
        users: users?.meta?.total || 0,
        products: products?.meta?.total || 0,
        categories: categories?.meta?.total || totalOf(categories),
      });
      setRecent(listOf(orders));
      setLoading(false);
    });
  }, []);

  if (loading) return <Loading />;

  const cards = [
    { icon: 'shopping-cart', label: 'Total Orders', value: stats.orders, cls: 'red', bg: '#fff0f0' },
    { icon: 'users', label: 'Total Users', value: stats.users, cls: 'blue', bg: '#f0f4ff' },
    { icon: 'box', label: 'Products', value: stats.products, cls: 'green', bg: '#f0fff4' },
    { icon: 'th-large', label: 'Categories', value: stats.categories, cls: 'orange', bg: '#fff8f0' },
  ];

  return (
    <>
      <div className="stats-grid">
        {cards.map((c) => (
          <div key={c.label} className="stat-card" style={{ background: c.bg, border: `1px solid ${c.bg}` }}>
            <div className={`stat-icon ${c.cls}`}><i className={`fas fa-${c.icon}`} /></div>
            <div>
              <div className="stat-value">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Recent Orders</div></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Customer</th><th>Mobile</th><th>Total</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {recent.map((o) => {
                const st = ORDER_STATUS[o.status] || { label: String(o.status), color: '#888' };
                return (
                  <tr key={o.id}>
                    <td><strong>#{o.id}</strong></td>
                    <td>{o.name || o.user?.name || 'Guest'}</td>
                    <td>{o.mobile || '-'}</td>
                    <td><strong>{o.total_price} KWD</strong></td>
                    <td>
                      <span style={{ background: `${st.color}22`, color: st.color, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {st.label}
                      </span>
                    </td>
                    <td>{shortDate(createdOf(o))}</td>
                  </tr>
                );
              })}
              {recent.length === 0 && <EmptyRow colSpan={6} text="No orders yet" />}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
