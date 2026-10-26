import { useEffect, useState } from 'react';
import { listOf, request, uploadImage } from '../api';
import { CrudPage } from '../components/CrudPage';
import { Field, ImageInput, Muted, Select, StatusBadge, StatusSelect, TextInput, Thumb } from '../components/ui';

/* -------------------------------- Countries -------------------------------- */

interface Country { id: number; name?: string; name_en?: string; name_ar?: string; country_code?: string; currency_code?: string; status?: string; icon_url?: string; image?: string }
interface CountryForm { name: string; nameAr: string; code: string; currency: string; status: string; file: File | null; flag: string | null }

export function Countries() {
  return (
    <CrudPage<Country, CountryForm>
      title="Countries"
      itemName="Country"
      endpoint="/admin/countries"
      columns={[
        { key: 'flag', label: 'Flag', render: (c) => <Thumb src={c.icon_url || c.image} /> },
        { key: 'name', label: 'Name', render: (c) => c.name || c.name_en || '-' },
        { key: 'name_ar', label: 'Name (AR)', render: (c) => c.name_ar || <Muted /> },
        { key: 'country_code', label: 'Code' },
        { key: 'currency_code', label: 'Currency' },
        { key: 'status', label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
      ]}
      emptyForm={() => ({ name: '', nameAr: '', code: '', currency: '', status: 'active', file: null, flag: null })}
      toForm={(c) => ({
        name: c.name || c.name_en || '', nameAr: c.name_ar || '', code: c.country_code || '', currency: c.currency_code || '',
        status: c.status || 'active', file: null, flag: c.icon_url || c.image || null,
      })}
      renderForm={(f, set) => (
        <>
          <div className="form-row">
            <Field label="Name (EN)"><TextInput value={f.name} onChange={(name) => set({ name })} /></Field>
            <Field label="Name (AR)"><TextInput dir="rtl" value={f.nameAr} onChange={(nameAr) => set({ nameAr })} /></Field>
          </div>
          <div className="form-row">
            <Field label="Country Code" hint="Dial code (+965) or ISO code (KW) — the app shows the right flag for either.">
              <TextInput value={f.code} onChange={(code) => set({ code: code.trim().toUpperCase() })} placeholder="+965 or KW" />
            </Field>
            <Field label="Currency Code"><TextInput value={f.currency} onChange={(currency) => set({ currency: currency.toUpperCase() })} placeholder="KWD" maxLength={3} /></Field>
          </div>
          <Field label="🏳️ Country Flag" hint="Optional — without an upload, the app uses its built-in flag for the country code.">
            <ImageInput file={f.file} current={f.flag} previewWidth={60} onChange={(file) => set({ file })} />
          </Field>
          <Field label="Status"><StatusSelect value={f.status} onChange={(status) => set({ status })} /></Field>
        </>
      )}
      toPayload={async (f) => {
        if (!f.name.trim()) throw new Error('Name is required');
        const flag = f.file ? await uploadImage(f.file) : undefined;
        return {
          name: f.name, name_en: f.name, name_ar: f.nameAr, country_code: f.code, currency_code: f.currency, status: f.status,
          ...(flag ? { icon_url: flag, image: flag } : {}),
        };
      }}
    />
  );
}

/* ------------------------- Governorates and Areas ------------------------- */
// Both live in `cities`: a governorate has parent_id NULL, an area points at its governorate.

interface City { id: number; name?: string; name_en?: string; name_ar?: string; country_id?: number; parent_id?: number | null; deliveryCost?: number; delivery_cost?: number; status?: string }
interface CityForm { name: string; nameAr: string; parent: string; fee: string; status: string }

const feeOf = (c: City) => c.deliveryCost ?? c.delivery_cost ?? 0;
const cityName = (c?: City) => (c ? c.name_en || c.name || '-' : '-');

function useOptions(path: string) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { request('GET', path).then((r) => setItems(listOf(r))); }, [path]);
  return items;
}

function CityPage({ level }: { level: 'governorate' | 'area' }) {
  const isGov = level === 'governorate';
  const countries = useOptions('/admin/countries?page=1&pageSize=100');
  const governorates = useOptions('/admin/cities?page=1&pageSize=100&level=governorate');
  const parents: any[] = isGov ? countries : governorates;
  const parentName = (id?: number | null) => {
    const p = parents.find((x) => x.id === id);
    return p ? p.name || p.name_en : <Muted />;
  };

  return (
    <CrudPage<City, CityForm>
      title={isGov ? 'Governorates' : 'Areas'}
      itemName={isGov ? 'Governorate' : 'Area'}
      endpoint="/admin/cities"
      query={`level=${level}`}
      columns={[
        { key: 'name', label: 'Name (EN)', render: cityName },
        { key: 'name_ar', label: 'Name (AR)', render: (c) => c.name_ar || '-' },
        { key: 'parent', label: isGov ? 'Country' : 'Governorate', render: (c) => parentName(isGov ? c.country_id : c.parent_id) },
        { key: 'delivery_cost', label: 'Delivery Fee', render: (c) => `${feeOf(c)} KWD` },
        { key: 'status', label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
      ]}
      emptyForm={() => ({ name: '', nameAr: '', parent: parents.length === 1 ? String(parents[0].id) : '', fee: '0', status: 'active' })}
      toForm={(c) => ({
        name: c.name_en || c.name || '', nameAr: c.name_ar || '',
        parent: String((isGov ? c.country_id : c.parent_id) ?? ''), fee: String(feeOf(c)), status: c.status || 'active',
      })}
      renderForm={(f, set) => (
        <>
          <div className="form-row">
            <Field label="Name (EN)"><TextInput value={f.name} onChange={(name) => set({ name })} /></Field>
            <Field label="Name (AR)"><TextInput dir="rtl" value={f.nameAr} onChange={(nameAr) => set({ nameAr })} /></Field>
          </div>
          <div className="form-row">
            <Field label={isGov ? 'Country' : 'Governorate'}>
              <Select value={f.parent} onChange={(parent) => set({ parent })} placeholder={isGov ? 'Select Country...' : 'Select Governorate...'}
                options={parents.map((p) => ({ value: String(p.id), label: p.name || p.name_en }))} />
            </Field>
            <Field label="Delivery Fee (KWD)"><TextInput type="number" step="0.001" min={0} value={f.fee} onChange={(fee) => set({ fee })} /></Field>
          </div>
          <Field label="Status"><StatusSelect value={f.status} onChange={(status) => set({ status })} /></Field>
        </>
      )}
      toPayload={(f) => {
        if (!f.name.trim()) throw new Error('Name is required');
        if (!f.parent) throw new Error(isGov ? 'Select a country' : 'Select a governorate');
        const parentId = Number(f.parent);
        const base = {
          name: f.name, name_en: f.name, name_ar: f.nameAr, status: f.status,
          // The model attribute is `deliveryCost` (column delivery_cost).
          deliveryCost: Number(f.fee || 0),
        };
        if (isGov) return { ...base, country_id: parentId, parent_id: null };
        // Areas inherit the governorate's country so the app's country filter finds them.
        const gov = governorates.find((g) => g.id === parentId);
        return { ...base, parent_id: parentId, country_id: gov?.country_id ?? null };
      }}
    />
  );
}

export const Governorates = () => <CityPage level="governorate" />;
export const Areas = () => <CityPage level="area" />;
