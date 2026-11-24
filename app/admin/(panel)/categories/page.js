'use client';
import Crud from '@/components/admin/Crud';

export default function Page() {
  return (
    <Crud table="categories" title="Categories" order="sort_order" ascending
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'slug', label: 'URL slug (auto if empty)' },
        { key: 'parent_id', label: 'Parent category', type: 'select', placeholder: '— top level —',
          options: async (sb) => (await sb.from('categories').select('id,name').is('parent_id', null).order('sort_order')).data?.map((c) => ({ value: c.id, label: c.name })) || [] },
        { key: 'sort_order', label: 'Sort order', type: 'number' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'image_url', label: 'Category photo', type: 'image' },
      ]}
      columns={[
        { label: 'Photo', render: (r) => r.logo_url || r.image_url || r.url ? <img src={r.logo_url || r.image_url || r.url} alt='' className='h-10 w-10 object-cover' /> : '—' },
        { key: 'name', label: 'Name' },
        { label: 'Parent', render: (r, o) => o.parent_id?.find((x) => x.value === r.parent_id)?.label || '—' },
        { key: 'slug', label: 'Slug' },
      ]} />
  );
}
