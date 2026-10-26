import { useEffect, useState, type ReactElement } from 'react';
import { AUTH_EXPIRED_EVENT, clearToken, getToken, request, setToken } from './api';
import { Layout } from './components/Layout';
import { isPageKey, type Lang, type PageKey } from './nav';
import { AdminManagement, Roles } from './pages/Admin';
import { Categories, CutTypes, ServiceTypes } from './pages/Catalog';
import { Advertisements, Banners, Coupons, Notifications } from './pages/Content';
import { Dashboard } from './pages/Dashboard';
import { Areas, Countries, Governorates } from './pages/Location';
import { Login } from './pages/Login';
import { Orders } from './pages/Orders';
import { Packages } from './pages/Packages';
import { Products } from './pages/Products';
import { Contacts, Pages, Settings } from './pages/System';
import { Users } from './pages/Users';
import { ToastProvider } from './toast';

const PAGES: Record<PageKey, () => ReactElement> = {
  dashboard: Dashboard,
  orders: Orders,
  users: Users,
  categories: Categories,
  products: Products,
  packages: Packages,
  'cut-types': CutTypes,
  'service-types': ServiceTypes,
  banners: Banners,
  advertisements: Advertisements,
  coupons: Coupons,
  notifications: Notifications,
  countries: Countries,
  governorates: Governorates,
  areas: Areas,
  'admin-management': AdminManagement,
  roles: Roles,
  settings: Settings,
  pages: Pages,
  contacts: Contacts,
};

// The current page lives in the URL hash (#orders) so refresh and back/forward work.
const pageFromHash = (): PageKey => {
  const k = window.location.hash.replace(/^#\/?/, '');
  return isPageKey(k) ? k : 'dashboard';
};

function applyLang(lang: Lang) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.body.dir = dir;
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
  document.body.style.fontFamily = lang === 'ar' ? "'Cairo',sans-serif" : "'Poppins',sans-serif";
}

export function App() {
  const [token, setTok] = useState<string | null>(getToken());
  const [page, setPage] = useState<PageKey>(pageFromHash);
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') === 'ar' ? 'ar' : 'en'));
  const [userName, setUserName] = useState<string>();

  useEffect(() => { applyLang(lang); localStorage.setItem('lang', lang); }, [lang]);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    const onExpired = () => setTok(null);
    window.addEventListener('hashchange', onHash);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
    };
  }, []);

  useEffect(() => {
    if (token) request('GET', '/admin/auth/me').then((r) => setUserName((r?.data as any)?.name));
  }, [token]);

  if (!token) {
    return (
      <ToastProvider>
        <Login onLogin={(t) => { setToken(t); setTok(t); }} />
      </ToastProvider>
    );
  }

  const Page = PAGES[page] || Dashboard;
  return (
    <ToastProvider>
      <Layout
        current={page}
        onNavigate={(k) => { window.location.hash = k; }}
        onLogout={() => { clearToken(); setTok(null); }}
        lang={lang}
        onToggleLang={() => setLang((l) => (l === 'en' ? 'ar' : 'en'))}
        userName={userName}
      >
        {/* key: remount on navigation so each page starts fresh */}
        <Page key={page} />
      </Layout>
    </ToastProvider>
  );
}
