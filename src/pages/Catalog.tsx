import { uploadImage } from '../api';
import { CrudPage } from '../components/CrudPage';
import { Field, ImageInput, Muted, StatusBadge, StatusSelect, TextInput, Thumb } from '../components/ui';

/* ------------------------------ Categories ------------------------------ */

interface Category { id: number; name?: string; name_en?: string; name_ar?: string; status?: string; image?: string }
interface CategoryForm { name: string; nameAr: string; status: string; file: File | null; image: string | null }

export function Categories() {
  return (
    <CrudPage<Category, CategoryForm>
      title="Categories"
      itemName="Category"
      endpoint="/admin/categories"
      columns={[
        { key: 'image', label: 'Image', render: (r) => <Thumb src={r.image} empty="No img" /> },
        { key: 'name', label: 'Name (EN)', render: (r) => r.name || r.name_en || '-' },
        { key: 'name_ar', label: 'Name (AR)', render: (r) => r.name_ar || '-' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
      ]}
      emptyForm={() => ({ name: '', nameAr: '', status: 'active', file: null, image: null })}
      toForm={(r) => ({ name: r.name_en || r.name || '', nameAr: r.name_ar || '', status: r.status || 'active', file: null, image: r.image || null })}
      renderForm={(f, set) => (
        <>
          <Field label="Name (English)"><TextInput value={f.name} onChange={(name) => set({ name })} /></Field>
          <Field label="Name (Arabic)"><TextInput dir="rtl" value={f.nameAr} onChange={(nameAr) => set({ nameAr })} /></Field>
          <Field label="Status"><StatusSelect value={f.status} onChange={(status) => set({ status })} /></Field>
          <Field label="Image"><ImageInput file={f.file} current={f.image} onChange={(file) => set({ file })} /></Field>
        </>
      )}
      toPayload={async (f) => {
        if (!f.name.trim()) throw new Error('Name is required');
        const image = f.file ? await uploadImage(f.file) : undefined;
        return { name: f.name, name_en: f.name, name_ar: f.nameAr, status: f.status, ...(image ? { image } : {}) };
      }}
    />
  );
}

/* ----------------------- Cut types / Service types ----------------------- */

interface NamedType { id: number; name?: string; name_en?: string; name_ar?: string }
interface NamedForm { name: string; nameAr: string }

function NamedTypePage({ title, itemName, endpoint }: { title: string; itemName: string; endpoint: string }) {
  return (
    <CrudPage<NamedType, NamedForm>
      title={title}
      itemName={itemName}
      endpoint={endpoint}
      columns={[
        { key: 'name', label: 'Name (EN)', render: (r) => r.name || r.name_en || '-' },
        { key: 'name_ar', label: 'Name (AR)', render: (r) => r.name_ar || <Muted /> },
      ]}
      emptyForm={() => ({ name: '', nameAr: '' })}
      toForm={(r) => ({ name: r.name || r.name_en || '', nameAr: r.name_ar || '' })}
      renderForm={(f, set) => (
        <>
          <Field label="Name (English)"><TextInput value={f.name} onChange={(name) => set({ name })} /></Field>
          <Field label="Name (Arabic)"><TextInput dir="rtl" value={f.nameAr} onChange={(nameAr) => set({ nameAr })} /></Field>
        </>
      )}
      toPayload={(f) => {
        if (!f.name.trim()) throw new Error('Name is required');
        return { name: f.name, name_en: f.name, name_ar: f.nameAr };
      }}
    />
  );
}

export const CutTypes = () => <NamedTypePage title="Cut Types" itemName="Cut Type" endpoint="/admin/cut-types" />;
export const ServiceTypes = () => <NamedTypePage title="Service Types" itemName="Service Type" endpoint="/admin/service-types" />;
