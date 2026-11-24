'use client';
import Crud from '@/components/admin/Crud';

export default function Page() {
  return (
    <Crud table="gallery_images" title="Gallery" order="sort_order" ascending
      fields={[
        { key: 'url', label: 'Photo', type: 'image' },
        { key: 'caption', label: 'Caption' },
        { key: 'category', label: 'Gallery category (e.g. Plywood, Showroom)' },
        { key: 'sort_order', label: 'Sort order', type: 'number' },
      ]}
      columns={[ { label: 'Photo', render: (r) => r.logo_url || r.image_url || r.url ? <img src={r.logo_url || r.image_url || r.url} alt='' className='h-10 w-10 object-cover' /> : '—' }, { key: 'caption', label: 'Caption' }, { key: 'category', label: 'Category' } ]} />
  );
}
