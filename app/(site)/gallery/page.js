import { getGallery } from '@/lib/data';
import GalleryView from './GalleryView';
export const metadata = { title: 'Gallery', description: 'Photos of our materials and showroom.' };
export const revalidate = 60;

export default async function Gallery() {
  const images = await getGallery();
  return (
    <section className="section container-x">
      <p className="eyebrow">Gallery</p>
      <h1 className="h-display mt-3 text-4xl sm:text-5xl">Our Materials</h1>
      <div className="gold-rule mt-6" />
      <GalleryView images={images} />
    </section>
  );
}
