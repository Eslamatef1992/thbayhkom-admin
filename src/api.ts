/**
 * Thin client for the Thabayehkom admin REST API (`/api/admin/...`).
 *
 * Admin endpoints respond with `{ success, data, meta? }` and real HTTP status codes.
 * Upload endpoints (`/api/upload/...`) use the mobile envelope `{ status, code, url }`.
 */

export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'https://back.thabayehkom.app').replace(/\/$/, '');
export const API_URL = `${BACKEND_URL}/api`;

const TOKEN_KEY = 'admin_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

export interface ListMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  status?: boolean;
  data?: T;
  meta?: ListMeta;
  message?: string;
}

export const isOk = (r: ApiResponse | undefined): boolean => Boolean(r?.success || r?.status);

/** Fired when a request comes back 401 so the app can drop to the login screen. */
export const AUTH_EXPIRED_EVENT = 'admin:auth-expired';

export async function request<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  { skipAuthRedirect = false }: { skipAuthRedirect?: boolean } = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(API_URL + path, { method, headers, body: payload });
  } catch {
    return { success: false, message: 'Connection error' };
  }

  if (res.status === 401 && !skipAuthRedirect) {
    clearToken();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    return { success: false, message: 'Session expired' };
  }
  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { success: false, message: `HTTP ${res.status}` };
  }
}

/** Unwrap list payloads (array, or legacy `{ items }`). */
export function listOf<T = any>(r: ApiResponse | undefined): T[] {
  const d: any = r?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  return [];
}

export const totalOf = (r: ApiResponse | undefined): number =>
  r?.meta?.total ?? (r?.data as any)?.pagination?.total ?? listOf(r).length;

/** Resolve a stored image path (absolute URL or relative `storage/...`) to a URL. */
export function assetUrl(path?: string | null): string | null {
  if (!path) return null;
  return /^https?:\/\//i.test(path) ? path : `${BACKEND_URL}/${path.replace(/^\//, '')}`;
}

/** Upload an image; resolves to its public URL. */
export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const r: any = await request('POST', '/upload/single', fd);
  const url = r?.url || r?.data?.url;
  if (!url) throw new Error(r?.message || 'Image upload failed');
  return url;
}

/** Upload a video with progress reporting (XHR, since fetch has no upload progress). */
export function uploadVideo(file: File, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/upload/video`);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const r = JSON.parse(xhr.responseText);
        const url = r?.url || r?.data?.url;
        if (xhr.status === 200 && url) resolve(url);
        else reject(new Error(r?.message || `Upload failed (HTTP ${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload network error'));
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}
