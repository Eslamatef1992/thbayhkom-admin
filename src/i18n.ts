import { AR } from './i18n.ar';
import type { Lang } from './nav';

/**
 * Admin panel translations. Every user-visible English string goes through `t()`;
 * in Arabic mode it is looked up in `AR` (keyed by the English text), falling back
 * to the English text when there is no entry (e.g. data such as product names).
 *
 *   t('Save')                         -> "حفظ"
 *   t('Orders ({n})', { n: 12 })      -> "الطلبات (12)"
 *
 * Server messages shown in toasts go through `t()` too (see toast.tsx), so known
 * backend errors appear in Arabic as well.
 */

let current: Lang = 'en';

export function setLang(lang: Lang) { current = lang; }
export function getLang(): Lang { return current; }
export const isAr = () => current === 'ar';

export function t(en: string, vars?: Record<string, string | number>): string {
  if (en == null) return en;
  let s = current === 'ar' ? (AR[en] ?? AR[en.trim()] ?? pattern(en) ?? en) : en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Server messages with a variable part. */
function pattern(en: string): string | undefined {
  const m = /^Forbidden: missing permission '(.+)'$/.exec(en);
  if (m) return `غير مسموح: تحتاج صلاحية «${m[1]}»`;
  return undefined;
}

/** Translate a ReactNode label only when it is a plain string. */
export const tx = <T,>(v: T): T => (typeof v === 'string' ? (t(v) as unknown as T) : v);

/** Locale for dates and numbers: Arabic month names, Latin digits. */
export const dateLocale = () => (current === 'ar' ? 'ar-KW-u-nu-latn' : 'en-GB');

/** A record's name in the admin's language: name_ar in Arabic (when set), else the English name. */
export function localName(x: any): string {
  if (!x) return '';
  return (current === 'ar' && x.name_ar) ? x.name_ar : (x.name || x.name_en || x.name_ar || '');
}
