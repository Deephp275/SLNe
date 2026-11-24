'use client';
import Crud from '@/components/admin/Crud';

export default function Page() {
  return (
    <Crud table="brands" title="Brands" order="name" ascending
      fields={[
        { key: 'name', label: 'Brand name', required: true },
        { key: 'slug', label: 'URL slug (auto if empty)' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'logo_url', label: 'Brand logo', type: 'image' },
      ]}
      columns={[ { label: 'Logo', render: (r) => r.logo_url || r.image_url || r.url ? <img src={r.logo_url || r.image_url || r.url} alt='' className='h-10 w-10 object-cover' /> : '—' }, { key: 'name', label: 'Name' }, { key: 'slug', label: 'Slug' } ]} />
  );
}
