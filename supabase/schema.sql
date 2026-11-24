-- Shree Lakshmi Narayan Enterprise — database schema
-- Run this whole file once in Supabase → SQL Editor.

create extension if not exists pgcrypto;

-- ---------- Tables ----------
create table if not exists admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  slug text not null unique,
  category_id uuid references categories(id) on delete set null,
  brand_id uuid references brands(id) on delete set null,
  description text,
  dimensions text,
  thickness text,
  availability text not null default 'on_request' check (availability in ('in_stock','out_of_stock','on_request')),
  stock_quantity int,
  price numeric(12,2),            -- null = "Request Price"
  is_published boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on products(category_id);
create index if not exists products_brand_idx on products(brand_id);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Category-specific specifications (e.g. Grade, Core, Finish, Material, Size...)
create table if not exists product_specifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  spec_key text not null,
  spec_value text not null,
  sort_order int not null default 0
);
create index if not exists specs_product_idx on product_specifications(product_id);

-- Price / size options per product, e.g. "19 mm" = Rs 145 per sq ft
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null,
  price numeric(12,2),              -- null = "Request Price"
  unit text,
  sort_order int not null default 0
);
create index if not exists variants_product_idx on product_variants(product_id);

create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  phone text not null,
  company text,
  email text,
  category text,
  requirements text not null,
  quantity text,
  dimensions text,
  delivery_location text,
  message text,
  status text not null default 'New' check (status in ('New','Contacted','Quotation Sent','Negotiation','Converted','Closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists enquiry_items (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references enquiries(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  quantity text,
  notes text
);

create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null unique references enquiries(id) on delete cascade,
  amount numeric(14,2),
  notes text,
  status text not null default 'Pending' check (status in ('Pending','In Review','Sent','Accepted','Rejected')),
  sent_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists website_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

create table if not exists gallery_images (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  category text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- updated_at trigger ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['categories','brands','products','enquiries','quotations','website_settings'] loop
    execute format('drop trigger if exists %I_updated on %I', t, t);
    execute format('create trigger %I_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ---------- Admin check ----------
create or replace function is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from admins where id = auth.uid());
$$;

-- ---------- Public bulk enquiry (anonymous users can only call this function) ----------
create or replace function submit_enquiry(payload jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare
  ref text; eid uuid; item jsonb;
begin
  -- Protection that still works if someone calls this function directly with the public key (skipping the website)
  if length(payload::text) > 60000 then raise exception 'Request too large'; end if;
  if jsonb_typeof(coalesce(payload->'items','[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(payload->'items','[]'::jsonb)) > 30 then raise exception 'Too many items'; end if;
  if (select count(*) from enquiries where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Too many enquiries, please try again shortly';
  end if;
  if coalesce(trim(payload->>'customer_name'),'') = '' or coalesce(trim(payload->>'phone'),'') = ''
     or coalesce(trim(payload->>'requirements'),'') = '' then
    raise exception 'Missing required fields';
  end if;
  ref := 'SLN-' || to_char(now(),'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text),1,5));
  insert into enquiries (reference, customer_name, phone, company, email, category, requirements, quantity, dimensions, delivery_location, message)
  values (ref, left(payload->>'customer_name',120), left(payload->>'phone',30), left(payload->>'company',120), left(payload->>'email',160),
          left(payload->>'category',80), left(payload->>'requirements',4000), left(payload->>'quantity',120),
          left(payload->>'dimensions',200), left(payload->>'delivery_location',200), left(payload->>'message',4000))
  returning id into eid;
  for item in select * from jsonb_array_elements(coalesce(payload->'items','[]'::jsonb)) loop
    if coalesce(trim(item->>'product_name'),'') <> '' then
      insert into enquiry_items (enquiry_id, product_id, product_name, quantity, notes)
      values (eid, nullif(item->>'product_id','')::uuid, left(item->>'product_name',200), left(item->>'quantity',80), left(item->>'notes',500));
    end if;
  end loop;
  insert into quotations (enquiry_id) values (eid);
  return ref;
end $$;
revoke all on function submit_enquiry(jsonb) from public;
grant execute on function submit_enquiry(jsonb) to anon, authenticated;

-- ---------- Row Level Security ----------
alter table admins enable row level security;
alter table categories enable row level security;
alter table brands enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_specifications enable row level security;
alter table product_variants enable row level security;
alter table enquiries enable row level security;
alter table enquiry_items enable row level security;
alter table quotations enable row level security;
alter table website_settings enable row level security;
alter table gallery_images enable row level security;

-- Admins can read their own row (used by the login check)
drop policy if exists "admin self read" on admins;
create policy "admin self read" on admins for select using (id = auth.uid());

-- Public read of catalogue content; admin full write
do $$ declare t text; begin
  foreach t in array array['categories','brands','gallery_images'] loop
    execute format('drop policy if exists "public read" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('drop policy if exists "admin write" on %I', t);
    execute format('create policy "admin write" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- Photos, specifications and size options belong to a product: visible only when the product itself is visible
-- (published, or the viewer is an admin). The sub-query is filtered by the products policy below.
do $$ declare t text; begin
  foreach t in array array['product_images','product_specifications','product_variants'] loop
    execute format('drop policy if exists "public read" on %I', t);
    execute format('drop policy if exists "read if product visible" on %I', t);
    execute format('create policy "read if product visible" on %I for select using (exists (select 1 from products p where p.id = product_id))', t);
    execute format('drop policy if exists "admin write" on %I', t);
    execute format('create policy "admin write" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- Website settings are public business details. Keys starting with "secret_" or "private_" are never readable by visitors,
-- but still: never store passwords or API keys in this table.
drop policy if exists "public read" on website_settings;
create policy "public read" on website_settings for select using (key !~ '^(secret|private)_');
drop policy if exists "admin write" on website_settings;
create policy "admin write" on website_settings for all using (is_admin()) with check (is_admin());

drop policy if exists "public read published" on products;
create policy "public read published" on products for select using (is_published or is_admin());
drop policy if exists "admin write" on products;
create policy "admin write" on products for all using (is_admin()) with check (is_admin());

-- Enquiries / quotations: admin only (anonymous submit goes through submit_enquiry())
do $$ declare t text; begin
  foreach t in array array['enquiries','enquiry_items','quotations'] loop
    execute format('drop policy if exists "admin all" on %I', t);
    execute format('create policy "admin all" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public) values ('media','media',true) on conflict (id) do nothing;
-- The bucket is public, so photo links work without any read policy. Having NO public "select" policy means visitors
-- cannot LIST every file name; only admins (policy below) can.
drop policy if exists "media public read" on storage.objects;
drop policy if exists "media admin write" on storage.objects;
create policy "media admin write" on storage.objects for all
  using (bucket_id = 'media' and is_admin()) with check (bucket_id = 'media' and is_admin());

-- ---------- Starter data: categories + empty settings (no invented business details) ----------
insert into categories (name, slug, sort_order, description) values
 ('Plywood','plywood',1,'Commercial, waterproof, marine and calibrated plywood.'),
 ('Laminates','laminates',2,'Plain colour, designer and 3D print laminates.'),
 ('Timber','timber',3,'Silver timber in ready cut sizes.')
on conflict (slug) do nothing;

insert into categories (parent_id, name, slug, sort_order)
select p.id, v.name, v.slug, v.ord from categories p
join (values
 ('plywood','Commercial Plywood','commercial-plywood',1),('plywood','Waterproof Plywood','waterproof-plywood',2),
 ('plywood','Marine Plywood','marine-plywood',3),('plywood','Calibrated Plywood','calibrated-plywood',4),
 ('laminates','Plain Colour Laminates','plain-colour-laminates',1),('laminates','Designer Laminates','designer-laminates',2),
 ('laminates','3D Print Laminates','3d-print-laminates',3),('laminates','Home Wall Laminates','home-wall-laminates',4),
 ('timber','Silver Cut Size','silver-cut-size',1)
) as v(parent,name,slug,ord) on p.slug = v.parent
on conflict (slug) do nothing;

insert into website_settings (key, value) values
 ('business_name','Shree Lakshmi Narayan Enterprise'),
 ('logo_url',''),('phone',''),('whatsapp_number',''),('email',''),('address',''),
 ('business_hours',''),('maps_embed_url',''),('maps_link',''),('service_area',''),
 ('facebook',''),('instagram',''),('youtube',''),('hero_image_url','')
on conflict (key) do nothing;
