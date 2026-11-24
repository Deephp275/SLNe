-- Showroom catalogue: Plywood / Laminates / Timber, product images, no prices, no hardware.
-- Safe to run on a new or existing database, and safe to run more than once. Run in Supabase -> SQL Editor.

-- 1. Thickness / size options per product (no prices are shown on the website)
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null,              -- "19 mm" or 3" x 2"
  price numeric(12,2),              -- unused (showroom site)
  unit text,                        -- unused
  sort_order int not null default 0
);
create index if not exists variants_product_idx on product_variants(product_id);
alter table product_variants enable row level security;
drop policy if exists "public read" on product_variants;
drop policy if exists "read if product visible" on product_variants;
create policy "read if product visible" on product_variants for select using (exists (select 1 from products p where p.id = product_id));
drop policy if exists "admin write" on product_variants;
create policy "admin write" on product_variants for all using (is_admin()) with check (is_admin());

-- 2. Clean up old demo / hardware / old laminate and timber categories
delete from products where sku like 'DEMO-%' or slug in ('silver-timber-cut-size');
delete from categories where slug = 'hardware';
delete from categories where slug in ('matte-laminates','glossy-laminates','textured-laminates','decorative-laminates','cut-size-timber');

-- 3. Categories (images are served from the website's /images folder)
update categories set image_url = '/images/plywood-greenply-stack.jpg', description = 'Greenply, Kitply, Cubixa and Jansathi plywood in different thicknesses.' where slug = 'plywood';
update categories set image_url = '/images/laminate-wall-fluted.jpg', description = 'Plain colour, designer, 3D print and home wall laminates.' where slug = 'laminates';
update categories set image_url = '/images/timber-stack.jpg', description = 'Silver timber in ready cut sizes.' where slug = 'timber';

insert into categories (parent_id, name, slug, sort_order)
select p.id, v.name, v.slug, v.ord from categories p
join (values
  ('laminates','Plain Colour Laminates','plain-colour-laminates',1),
  ('laminates','Designer Laminates','designer-laminates',2),
  ('laminates','3D Print Laminates','3d-print-laminates',3),
  ('laminates','Home Wall Laminates','home-wall-laminates',4),
  ('timber','Silver Cut Size','silver-cut-size',1)
) as v(parent,name,slug,ord) on p.slug = v.parent
on conflict (slug) do nothing;

-- 4. Brands
insert into brands (name, slug) values
  ('Greenply','greenply'), ('Kitply','kitply'), ('Cubixa','cubixa'), ('Jansathi','jansathi')
on conflict (slug) do nothing;

-- 5. Products, each in its own category
insert into products (name, slug, category_id, brand_id, description, availability, is_published, is_featured)
select v.name, v.slug, (select id from categories where slug = v.cat), (select id from brands where slug = v.brand), v.descr, 'on_request', true, false
from (values
  ('Greenply Plywood','greenply-plywood','plywood','greenply','Greenply plywood in 6 mm, 12 mm and 19 mm thickness.'),
  ('Kitply Plywood','kitply-plywood','plywood','kitply','Kitply plywood in 6 mm and 19 mm thickness.'),
  ('Cubixa Plywood','cubixa-plywood','plywood','cubixa','Cubixa plywood in 6 mm, 12 mm and 19 mm thickness.'),
  ('Jansathi Plywood','jansathi-plywood','plywood','jansathi','Jansathi plywood in 19 mm thickness.'),
  ('Plain Colour Laminates','plain-colour-laminates-range','plain-colour-laminates',null,'Solid plain colour laminates in a wide range of shades.'),
  ('Designer Laminates','designer-laminates-range','designer-laminates',null,'Designer laminates in marble, stone, wood and geometric designs.'),
  ('3D Print Laminates','3d-print-laminates-range','3d-print-laminates',null,'3D print laminates with fluted, pyramid, wave and cube textures.'),
  ('Home Wall Laminates','home-wall-laminates-range','home-wall-laminates',null,'Laminates for feature walls and living rooms, in fluted and 3D patterns.'),
  ('Silver Cut Size Timber','silver-cut-size-timber','silver-cut-size',null,'Silver timber available in ready cut sizes: 3" x 2", 4" x 2", 4" x 3" and 3" x 1.5".')
) as v(name,slug,cat,brand,descr)
on conflict (slug) do nothing;
update products set price = null;   -- showroom: no prices

-- 6. Thickness / size options
with v(slug,label,ord) as (values
  ('greenply-plywood','19 mm',1), ('greenply-plywood','12 mm',2), ('greenply-plywood','6 mm',3),
  ('kitply-plywood','19 mm',1), ('kitply-plywood','6 mm',2),
  ('cubixa-plywood','19 mm',1), ('cubixa-plywood','12 mm',2), ('cubixa-plywood','6 mm',3),
  ('jansathi-plywood','19 mm',1),
  ('silver-cut-size-timber','3" x 2"',1), ('silver-cut-size-timber','4" x 2"',2),
  ('silver-cut-size-timber','4" x 3"',3), ('silver-cut-size-timber','3" x 1.5"',4)
)
insert into product_variants (product_id, label, sort_order)
select p.id, v.label, v.ord from v join products p on p.slug = v.slug
where not exists (select 1 from product_variants x where x.product_id = p.id);
update product_variants set price = null, unit = null;

-- 7. Product photos
with v(slug,url,ord) as (values
  ('greenply-plywood','/images/plywood-greenply-stack.jpg',0), ('greenply-plywood','/images/plywood-greenply-face.jpg',1),
  ('kitply-plywood','/images/plywood-kitply-stack.jpg',0), ('kitply-plywood','/images/plywood-kitply-face.jpg',1),
  ('cubixa-plywood','/images/plywood-cubixa-stack.jpg',0), ('cubixa-plywood','/images/plywood-cubixa-face.jpg',1),
  ('jansathi-plywood','/images/plywood-jansathi-stack.jpg',0), ('jansathi-plywood','/images/plywood-jansathi-face.jpg',1),
  ('plain-colour-laminates-range','/images/laminate-plain.jpg',0),
  ('designer-laminates-range','/images/laminate-designer.jpg',0),
  ('3d-print-laminates-range','/images/laminate-3d.jpg',0),
  ('home-wall-laminates-range','/images/laminate-wall-fluted.jpg',0), ('home-wall-laminates-range','/images/laminate-wall-3d.jpg',1),
  ('silver-cut-size-timber','/images/timber-sizes.jpg',0), ('silver-cut-size-timber','/images/timber-stack.jpg',1)
)
insert into product_images (product_id, url, alt, sort_order)
select p.id, v.url, p.name, v.ord from v join products p on p.slug = v.slug
where not exists (select 1 from product_images x where x.product_id = p.id);

-- 9. Business contact details
insert into website_settings (key, value) values
  ('address', '200, Nagarabhavi Main Rd, 2nd Block, Govindaraja Nagar Ward, Anubhav Nagar, Vijayanagar, Bengaluru, Karnataka 560072'),
  ('phone', '+919986480096'),
  ('whatsapp_number', '919986480096'),
  ('contacts', E'Haresh|9986480096\nLeeladhar|9448588588\nAshwin|9535252660')
on conflict (key) do update set value = excluded.value;

-- 8. Homepage hero image
insert into website_settings (key, value) values ('hero_image_url', '/images/hero.jpg')
on conflict (key) do update set value = excluded.value where website_settings.value is null or website_settings.value = '';
