import { useCallback, useEffect, useState } from 'react';
import { isOk, listOf, request, totalOf } from '../api';
import { EmptyRow, Loading, Pagination, StatusBadge } from '../components/ui';
import { createdOf, shortDate } from '../format';
import { useToast } from '../toast';

const PAGE_SIZE = 15;

/** Mobile app customers (admin accounts live under Admin Management). */
export function Users() {
  const notify = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await request('GET', `/admin/customers?page=${page}&pageSize=${PAGE_SIZE}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
    setUsers(listOf(r));
    setTotal(totalOf(r));
    setLoading(false);
  }, [page, q]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id: number, status: string) => {
    const r = await request('PUT', `/admin/customers/${id}`, { status: status === 'active' ? 'inactive' : 'active' });
    if (isOk(r)) { notify('User updated'); load(); } else notify(r?.message || 'Error', 'error');
  };

  if (loading && users.length === 0) return <Loading />;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Mobile App Users ({total})</div>
        <input
          className="form-control" style={{ maxWidth: 260 }} placeholder="Search name, email, mobile..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setQ(search); } }}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Mobile</th><th>Country</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name || '-'}</td>
                <td>{u.email || '-'}</td>
                <td>{u.mobile || '-'}</td>
                <td>{u.country?.name || u.country_code || u.country_id || '-'}</td>
                <td><StatusBadge status={u.status} /></td>
                <td>{shortDate(createdOf(u))}</td>
                <td>
                  <button className={`btn btn-${u.status === 'active' ? 'danger' : 'success'} btn-sm`} onClick={() => toggle(u.id, u.status || 'active')}>
                    {u.status === 'active' ? 'Block' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <EmptyRow colSpan={8} text="No users found" />}
          </tbody>
        </table>
      </div>
      <Pagination current={page} total={Math.ceil(total / PAGE_SIZE)} onChange={setPage} />
    </div>
  );
}
