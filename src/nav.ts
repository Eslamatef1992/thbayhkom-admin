export type Lang = 'en' | 'ar';
export type Localized = Record<Lang, string>;

export type PageKey =
  | 'dashboard' | 'orders' | 'users'
  | 'categories' | 'products' | 'cut-types' | 'service-types'
  | 'banners' | 'advertisements' | 'coupons' | 'notifications'
  | 'countries' | 'governorates' | 'areas'
  | 'admin-management' | 'roles'
  | 'settings' | 'pages' | 'contacts';

export type NavEntry =
  | { section: Localized }
  | { key: PageKey; icon: string; label: Localized };

export const NAV: NavEntry[] = [
  { section: { en: 'Main', ar: 'الرئيسية' } },
  { key: 'dashboard', icon: 'tachometer-alt', label: { en: 'Dashboard', ar: 'لوحة التحكم' } },
  { key: 'orders', icon: 'shopping-cart', label: { en: 'Orders', ar: 'الطلبات' } },
  { key: 'users', icon: 'users', label: { en: 'Users', ar: 'المستخدمون' } },
  { section: { en: 'Catalog', ar: 'الكتالوج' } },
  { key: 'categories', icon: 'th-large', label: { en: 'Categories', ar: 'الفئات' } },
  { key: 'products', icon: 'box', label: { en: 'Products', ar: 'المنتجات' } },
  { key: 'cut-types', icon: 'cut', label: { en: 'Cut Types', ar: 'أنواع التقطيع' } },
  { key: 'service-types', icon: 'concierge-bell', label: { en: 'Service Types', ar: 'أنواع الخدمة' } },
  { section: { en: 'Content', ar: 'المحتوى' } },
  { key: 'banners', icon: 'images', label: { en: 'Banners', ar: 'البانرات' } },
  { key: 'advertisements', icon: 'ad', label: { en: 'Advertisements', ar: 'الإعلانات' } },
  { key: 'coupons', icon: 'tag', label: { en: 'Coupons', ar: 'الكوبونات' } },
  { key: 'notifications', icon: 'bell', label: { en: 'Notifications', ar: 'الإشعارات' } },
  { section: { en: 'Location', ar: 'المناطق' } },
  { key: 'countries', icon: 'globe', label: { en: 'Countries', ar: 'الدول' } },
  { key: 'governorates', icon: 'map-marker-alt', label: { en: 'Governorates', ar: 'المحافظات' } },
  { key: 'areas', icon: 'map', label: { en: 'Areas', ar: 'المناطق' } },
  { section: { en: 'Admin', ar: 'الإدارة' } },
  { key: 'admin-management', icon: 'user-shield', label: { en: 'Admin Management', ar: 'إدارة المشرفين' } },
  { key: 'roles', icon: 'key', label: { en: 'Roles & Permissions', ar: 'الأدوار والصلاحيات' } },
  { section: { en: 'System', ar: 'النظام' } },
  { key: 'settings', icon: 'cog', label: { en: 'Settings', ar: 'الإعدادات' } },
  { key: 'pages', icon: 'file-alt', label: { en: 'Pages', ar: 'الصفحات' } },
  { key: 'contacts', icon: 'envelope', label: { en: 'Contact Messages', ar: 'رسائل التواصل' } },
];

export const PAGE_TITLES = Object.fromEntries(
  NAV.flatMap((n) => ('key' in n ? [[n.key, n.label]] : [])),
) as Record<PageKey, Localized>;

export const isPageKey = (k: string | null): k is PageKey => !!k && k in PAGE_TITLES;
