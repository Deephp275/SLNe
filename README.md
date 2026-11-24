# Shree Lakshmi Narayan Enterprise – Website

Next.js 16 · Tailwind · Supabase (database, auth, storage) · deploy on Vercel.

## Local-only mode (no Supabase needed)
While the Supabase keys in `.env.local` are still the `YOUR-...` placeholders, the site runs on its own:
- Data is stored in `data/db.json` (created on first run with your plywood brands, laminate types and silver timber sizes). Back this file up.
- Admin login at `/admin`: the very first password is the `LOCAL_ADMIN_PASSWORD` line in `.env.local`. On first sign-in it is stored **hashed** in `data/auth.json`; after that **delete that line** and change the password in Admin → Account & Security.
- Photos are served from `data/uploads`. Admin → Account & Security has a button that deletes photos nothing uses any more.
- This mode is for working on your own PC. To go live, set up Supabase below; the site switches over automatically when real keys are present (local data is not copied across).

## Running it
| Script | What it does |
|---|---|
| `start-website.bat` | Development mode, **this computer only** |
| `host-website.bat` | Builds and runs the real (production) site, **this computer only** |
| `share-on-network.bat` | Shows the public pages to other devices on your Wi-Fi. Admin sign-in is still refused from those devices (it only works on this computer, or over HTTPS). Never use on public Wi-Fi. |

Behind your own HTTPS proxy set `TRUST_PROXY=1` (the proxy must set `X-Forwarded-For` and `X-Forwarded-Proto` itself). Without it the site ignores those headers, because visitors can fake them.

## Tests
`npm run test:e2e` runs the Playwright suite against http://localhost:3000. Start the test server with `TRUST_PROXY=1` and `ALLOW_INSECURE_ADMIN=1` (test-only switches), and put the admin password in `.env.test`. `npm run lint` runs ESLint.

## Setup with Supabase (≈10 minutes)

1. **Create a Supabase project** at supabase.com.
2. **Database:** Supabase → SQL Editor → paste & run `supabase/schema.sql`. (Already ran an older version? Run it again: it is safe to repeat and it applies the newer, stricter access rules.)
3. **Keys:** copy `.env.example` to `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Project Settings → API). Only the public anon key is used; no service-role key exists anywhere in the code.
4. **First admin:** Supabase → Authentication → Users → *Add user* (email + password, tick auto-confirm). Then in the SQL Editor:
   ```sql
   insert into admins (id, email) select id, email from auth.users where email = 'YOUR-ADMIN-EMAIL';
   ```
   Also disable public sign-ups: Authentication → Providers → Email → turn off *Allow new users to sign up*.
   **Then run `supabase/update_catalog.sql`** – adds the thickness/size options, the four plywood brands (Greenply, Kitply, Cubixa, Jansathi), laminate types, silver timber cut sizes, and removes hardware. It is safe to run more than once and also works on a database created from an older `schema.sql`.
5. `npm install` then `npm run dev` → http://localhost:3000 · admin at `/admin`.
6. In **Admin → Settings** fill business name, phone, **WhatsApp number** (digits with country code), address, hours, Google Maps link/embed, social links, hero photo.

## Notifications for new enquiries
Set `ENQUIRY_WEBHOOK_URL` (Slack/Discord incoming webhook, Zapier, Make…) and each enquiry is POSTed there. Enquiries are always saved and visible in Admin → Enquiries.

## Deploy
Push to GitHub, import in Vercel, add the same env vars (plus `NEXT_PUBLIC_SITE_URL` = your domain).

## Security model
- `/admin/*` is protected by middleware (valid session **and** a row in `admins`) and by Row Level Security: only admins can write or read enquiries.
- Visitors can read published products only, and submit enquiries only through the `submit_enquiry()` database function.
- Storage bucket `media` is publicly readable, admin-writable.

## Photos
No stock photos are bundled. Upload product, category, brand, gallery and hero photos from the admin dashboard.
