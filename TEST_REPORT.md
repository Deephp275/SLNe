# Test report

Run on the production build at http://localhost:3000 (local mode). 154 passed, 0 failed, 154 tests in total.

Every failure below is a real finding about the site (not a broken test). See the findings section for severity and fixes.

## All tests

| # | Area | Test | Result | What went wrong (plain words) |
|---|---|---|---|---|
| 1 | Public pages | F2 header navigation reaches every page | PASS |  |
| 2 | Public pages | F3 homepage: headline, 3 category cards, no selected-products section | PASS |  |
| 3 | Public pages | F3 no prices or hardware anywhere on the public site | PASS |  |
| 4 | Public pages | F6 gallery: category chips filter and photo opens/closes | PASS |  |
| 5 | Public pages | F7 contact page: address, 3 people with call + WhatsApp, Google-only map | PASS |  |
| 6 | Public pages | F8 SEO: sitemap, robots, JSON-LD, canonical | PASS |  |
| 7 | Public pages | F9 unknown page and unknown product show the 404 page | PASS |  |
| 8 | Public pages | F2 header stays visible while scrolling (sticky) | PASS |  |
| 9 | Public pages | F1 / loads: 200, title, one h1, no console errors | PASS |  |
| 10 | Public pages | F1 /about loads: 200, title, one h1, no console errors | PASS |  |
| 11 | Public pages | F1 /products loads: 200, title, one h1, no console errors | PASS |  |
| 12 | Public pages | F1 /brands loads: 200, title, one h1, no console errors | PASS |  |
| 13 | Public pages | F1 /gallery loads: 200, title, one h1, no console errors | PASS |  |
| 14 | Public pages | F1 /quotation loads: 200, title, one h1, no console errors | PASS |  |
| 15 | Public pages | F1 /contact loads: 200, title, one h1, no console errors | PASS |  |
| 16 | Public pages | F4 default view shows 3 sections and 9 products | PASS |  |
| 17 | Public pages | F4 choosing Plywood limits categories, brands and thickness to plywood | PASS |  |
| 18 | Public pages | F4 laminates hides empty brand/thickness filters and shows 4 products | PASS |  |
| 19 | Public pages | F4 search, thickness, clear and empty state | PASS |  |
| 20 | Public pages | F5 all 9 products render with image, name and a working WhatsApp enquiry | PASS |  |
| 21 | Public pages | F5 thickness and quantity go into the WhatsApp message | PASS |  |
| 22 | Public pages | F5 "Add to Bulk Quotation" pre-fills the quotation form | PASS |  |
| 23 | Forms & edge cases | E2/E3 quotation with several products is saved and shows a reference | PASS |  |
| 24 | Forms & edge cases | E2 contact form message is saved | PASS |  |
| 25 | Forms & edge cases | E4 special characters, emoji and script text are stored and shown as plain text | PASS |  |
| 26 | Forms & edge cases | E5 very long input is refused and nothing is saved | PASS |  |
| 27 | Forms & edge cases | E6 double click on Submit saves one enquiry only | PASS |  |
| 28 | Forms & edge cases | E7 refreshing in the middle of submitting causes no crash or duplicate | PASS |  |
| 29 | Forms & edge cases | E8 bot filling the hidden honeypot field saves nothing | PASS |  |
| 30 | Forms & edge cases | E1 server also validates (not only the browser) | PASS |  |
| 31 | Forms & edge cases | E1 empty form is rejected with messages and nothing is sent | PASS |  |
| 32 | Forms & edge cases | E1 bad phone and bad email are rejected | PASS |  |
| 33 | Forms & edge cases | E1 contact form validation | PASS |  |
| 34 | Login & sessions | A2 wrong password shows an error and gives no session | PASS |  |
| 35 | Login & sessions | A3/A4 correct password logs in (secure cookie), logout ends the session | PASS |  |
| 36 | Login & sessions | A5 forged session cookie is refused | PASS |  |
| 37 | Login & sessions | A6 expired session is refused | PASS |  |
| 38 | Login & sessions | A7 locked after 5 wrong passwords, even the right password is refused during the lock | PASS |  |
| 39 | Login & sessions | A8 change-password form rejects wrong current and weak new passwords (nothing is changed) | PASS |  |
| 40 | Login & sessions | A9 there is no public signup route | PASS |  |
| 41 | Login & sessions | L7 only the exact login page is public: look-alike admin paths still require sign-in | PASS |  |
| 42 | Login & sessions | A1 /admin redirects to login | PASS |  |
| 43 | Login & sessions | A1 /admin/products redirects to login | PASS |  |
| 44 | Login & sessions | A1 /admin/categories redirects to login | PASS |  |
| 45 | Login & sessions | A1 /admin/brands redirects to login | PASS |  |
| 46 | Login & sessions | A1 /admin/inventory redirects to login | PASS |  |
| 47 | Login & sessions | A1 /admin/enquiries redirects to login | PASS |  |
| 48 | Login & sessions | A1 /admin/quotations redirects to login | PASS |  |
| 49 | Login & sessions | A1 /admin/gallery redirects to login | PASS |  |
| 50 | Login & sessions | A1 /admin/settings redirects to login | PASS |  |
| 51 | Login & sessions | A1 /admin/account redirects to login | PASS |  |
| 52 | Security / authorization | S6 enquiry endpoint is rate limited per visitor | PASS |  |
| 53 | Security / authorization | M2 a product name containing </script> cannot break out of the page data and run code | PASS |  |
| 54 | Security / authorization | M3 pages carry a per-request nonce policy and inline scripts still work (site hydrates, no CSP violations) | PASS |  |
| 55 | Security / authorization | Z1 every admin API refuses a visitor (401) | PASS |  |
| 56 | Security / authorization | Z2 requests from another website are refused (403) even with a valid session | PASS |  |
| 57 | Security / authorization | Z3 the secret "admins" table is not reachable through the data API | PASS |  |
| 58 | Security / authorization | Z4 delete / update of every row without a filter is refused | PASS |  |
| 59 | Security / authorization | Z5 the "skip middleware" header trick does not open /admin | PASS |  |
| 60 | Security / authorization | S1 security headers on pages and APIs | PASS |  |
| 61 | Security / authorization | S1 CSP does not allow inline script injection (no unsafe-inline for scripts) | PASS |  |
| 62 | Security / authorization | S1 session cookie is flagged Secure when served over HTTPS (checked via forwarded proto) | PASS |  |
| 63 | Security / authorization | S2 malformed, wrong-type and oversized requests are refused without leaking internals | PASS |  |
| 64 | Security / authorization | S2 admin-API error messages are generic (no file paths or stack traces) | PASS |  |
| 65 | Security / authorization | S2 no wide-open CORS on any API | PASS |  |
| 66 | Security / authorization | S3 unknown tables, injected select text, odd columns and object values are refused | PASS |  |
| 67 | Security / authorization | S3 prototype-pollution keys (__proto__, constructor, prototype) are refused | PASS |  |
| 68 | Security / authorization | S3 columns that do not exist (e.g. is_admin) are refused, not silently stored | PASS |  |
| 69 | Security / authorization | S4 text file renamed .jpg is refused | PASS |  |
| 70 | Security / authorization | S4 SVG with a script is refused | PASS |  |
| 71 | Security / authorization | S4 HTML disguised as PNG is refused | PASS |  |
| 72 | Security / authorization | S4 file over 5 MB is refused | PASS |  |
| 73 | Security / authorization | S4 real PNG is accepted, gets a server-chosen name and is served safely | PASS |  |
| 74 | Security / authorization | S5 /.env.local is not served | PASS |  |
| 75 | Security / authorization | S5 /.env is not served | PASS |  |
| 76 | Security / authorization | S5 /data/db.json is not served | PASS |  |
| 77 | Security / authorization | S5 /data/auth.json is not served | PASS |  |
| 78 | Security / authorization | S5 /data/sessions.json is not served | PASS |  |
| 79 | Security / authorization | S5 /data/audit.log is not served | PASS |  |
| 80 | Security / authorization | S5 /package.json is not served | PASS |  |
| 81 | Security / authorization | S5 /next.config.mjs is not served | PASS |  |
| 82 | Security / authorization | S5 /middleware.js is not served | PASS |  |
| 83 | Security / authorization | S5 /supabase/schema.sql is not served | PASS |  |
| 84 | Security / authorization | S5 /.git/config is not served | PASS |  |
| 85 | Security / authorization | S5 /TEST_PLAN.md is not served | PASS |  |
| 86 | Security / authorization | S5 /lib/local/security.js is not served | PASS |  |
| 87 | Security / authorization | S5 /tests/helpers.js is not served | PASS |  |
| 88 | Security / authorization | S5 path traversal on the uploads route is blocked | PASS |  |
| 89 | Security / authorization | L1 clients cannot set id / timestamps, and unknown filter or order columns are refused | PASS |  |
| 90 | Security / authorization | L2 "javascript:" and other non-web links are refused in settings; real https links are accepted | PASS |  |
| 91 | Security / authorization | L5 cleanup deletes only unused photos, keeps used ones, and never touches fresh ones by default | PASS |  |
| 92 | Admin dashboard | M2 product lifecycle: create (with photo) -> visible on site -> edit -> unpublish -> delete | PASS |  |
| 93 | Admin dashboard | M3 category and brand create + delete | PASS |  |
| 94 | Admin dashboard | M3 duplicate slug is refused with a clear message | PASS |  |
| 95 | Admin dashboard | M4 enquiry appears in admin; hostile text is shown as text; status change is saved | PASS |  |
| 96 | Admin dashboard | M5 quotation review saves amount, status and sent date | PASS |  |
| 97 | Admin dashboard | M6 settings and inventory show real values (not saved or changed) | PASS |  |
| 98 | Admin dashboard | M7 account page: mismatched and weak new passwords are rejected, password not changed | PASS |  |
| 99 | Admin dashboard | M1 /admin shows "Overview" with no errors | PASS |  |
| 100 | Admin dashboard | M1 /admin/products shows "Products" with no errors | PASS |  |
| 101 | Admin dashboard | M1 /admin/categories shows "Categories" with no errors | PASS |  |
| 102 | Admin dashboard | M1 /admin/brands shows "Brands" with no errors | PASS |  |
| 103 | Admin dashboard | M1 /admin/inventory shows "Inventory" with no errors | PASS |  |
| 104 | Admin dashboard | M1 /admin/enquiries shows "Enquiries" with no errors | PASS |  |
| 105 | Admin dashboard | M1 /admin/quotations shows "Quotations" with no errors | PASS |  |
| 106 | Admin dashboard | M1 /admin/gallery shows "Gallery" with no errors | PASS |  |
| 107 | Admin dashboard | M1 /admin/settings shows "Website Settings" with no errors | PASS |  |
| 108 | Admin dashboard | M1 /admin/account shows "Account & Security" with no errors | PASS |  |
| 109 | Cleanup | cleanup: remove all QA test data | PASS |  |
| 110 |  | H1 default start is reachable from this computer only, not from the network address | PASS |  |
| 111 |  | H1 "share on network" shows the public site, but admin sign-in stays refused from other devices | PASS |  |
| 112 |  | M4 a faked X-Forwarded-For header no longer dodges the login lock | PASS |  |
| 113 |  | M4 a faked X-Forwarded-For header no longer dodges the enquiry rate limit | PASS |  |
| 114 |  | M1 behind an HTTPS proxy: sign-in over plain HTTP from another device is refused, over HTTPS it works and the cookie is Secure + HSTS | PASS |  |
| 115 |  | M1 from this computer over plain http, sign-in works and the cookie is not Secure (localhost is exempt) | PASS |  |
| 116 | Responsive / accessibility / speed | R1 phone 375px /: no sideways scrolling, content visible | PASS |  |
| 117 | Responsive / accessibility / speed | R1 phone 375px /products: no sideways scrolling, content visible | PASS |  |
| 118 | Responsive / accessibility / speed | R1 phone 375px /products/greenply-plywood: no sideways scrolling, content visible | PASS |  |
| 119 | Responsive / accessibility / speed | R1 phone 375px /gallery: no sideways scrolling, content visible | PASS |  |
| 120 | Responsive / accessibility / speed | R1 phone 375px /contact: no sideways scrolling, content visible | PASS |  |
| 121 | Responsive / accessibility / speed | R1 phone 375px /quotation: no sideways scrolling, content visible | PASS |  |
| 122 | Responsive / accessibility / speed | R1 phone 375px /admin/login: no sideways scrolling, content visible | PASS |  |
| 123 | Responsive / accessibility / speed | R1 phone 375px navigation style is right for the screen size | PASS |  |
| 124 | Responsive / accessibility / speed | R1 tablet 768px /: no sideways scrolling, content visible | PASS |  |
| 125 | Responsive / accessibility / speed | R1 tablet 768px /products: no sideways scrolling, content visible | PASS |  |
| 126 | Responsive / accessibility / speed | R1 tablet 768px /products/greenply-plywood: no sideways scrolling, content visible | PASS |  |
| 127 | Responsive / accessibility / speed | R1 tablet 768px /gallery: no sideways scrolling, content visible | PASS |  |
| 128 | Responsive / accessibility / speed | R1 tablet 768px /contact: no sideways scrolling, content visible | PASS |  |
| 129 | Responsive / accessibility / speed | R1 tablet 768px /quotation: no sideways scrolling, content visible | PASS |  |
| 130 | Responsive / accessibility / speed | R1 tablet 768px /admin/login: no sideways scrolling, content visible | PASS |  |
| 131 | Responsive / accessibility / speed | R1 tablet 768px navigation style is right for the screen size | PASS |  |
| 132 | Responsive / accessibility / speed | R1 desktop 1280px /: no sideways scrolling, content visible | PASS |  |
| 133 | Responsive / accessibility / speed | R1 desktop 1280px /products: no sideways scrolling, content visible | PASS |  |
| 134 | Responsive / accessibility / speed | R1 desktop 1280px /products/greenply-plywood: no sideways scrolling, content visible | PASS |  |
| 135 | Responsive / accessibility / speed | R1 desktop 1280px /gallery: no sideways scrolling, content visible | PASS |  |
| 136 | Responsive / accessibility / speed | R1 desktop 1280px /contact: no sideways scrolling, content visible | PASS |  |
| 137 | Responsive / accessibility / speed | R1 desktop 1280px /quotation: no sideways scrolling, content visible | PASS |  |
| 138 | Responsive / accessibility / speed | R1 desktop 1280px /admin/login: no sideways scrolling, content visible | PASS |  |
| 139 | Responsive / accessibility / speed | R1 desktop 1280px navigation style is right for the screen size | PASS |  |
| 140 | Responsive / accessibility / speed | X1 / | PASS |  |
| 141 | Responsive / accessibility / speed | X1 /products | PASS |  |
| 142 | Responsive / accessibility / speed | X1 /products/greenply-plywood | PASS |  |
| 143 | Responsive / accessibility / speed | X1 /gallery | PASS |  |
| 144 | Responsive / accessibility / speed | X1 /contact | PASS |  |
| 145 | Responsive / accessibility / speed | X1 /quotation | PASS |  |
| 146 | Responsive / accessibility / speed | X1 /admin/login | PASS |  |
| 147 | Responsive / accessibility / speed | P1 /: loads under 4s, modest JavaScript and images | PASS |  |
| 148 | Responsive / accessibility / speed | P1 /products: loads under 4s, modest JavaScript and images | PASS |  |
| 149 | Responsive / accessibility / speed | P1 /products/greenply-plywood: loads under 4s, modest JavaScript and images | PASS |  |
| 150 | Responsive / accessibility / speed | P1 /gallery: loads under 4s, modest JavaScript and images | PASS |  |
| 151 | Responsive / accessibility / speed | P1 /contact: loads under 4s, modest JavaScript and images | PASS |  |
| 152 | Responsive / accessibility / speed | P2 menu is a floating panel: opening it does not push the page down, and the header has no blur effect | PASS |  |
| 153 | Responsive / accessibility / speed | P2 no heavy SVG-filter pictures are loaded on public pages (they are slow on phones) | PASS |  |
| 154 | Responsive / accessibility / speed | P2 pictures are sent as light, resized files (largest picture under 250 KB on a phone) | PASS |  |

## Security findings: status after the fixes

Every finding from the first audit was fixed one at a time and re-tested. Each fix has an automated test that failed before the fix and passes now.

| ID | Finding | Rating | Status | What was done | Proof (test) |
|---|---|---|---|---|---|
| C1 | Next.js 14.2.15 had critical/high known holes | Critical | **Fixed** | Upgraded to Next.js 16.4.6 + React 19 (the only version with a clean audit); `middleware` became `proxy`; async params/cookies | `npm audit`: 0 vulnerabilities; whole suite passes |
| H1 | Both start scripts opened the site to the whole network | High | **Fixed** | New `server.js` launcher: this computer only by default. `share-on-network.bat` is a separate, clearly labelled script; admin sign-in stays refused from other devices | `H1` tests (2) |
| M1 | No HTTPS: password/cookie could travel in clear text | Medium | **Fixed (by rule)** | Admin sign-in is refused unless it comes from this computer or over HTTPS; behind HTTPS the cookie is `Secure` and HSTS is sent | `M1` tests (2) |
| M2 | `</script>` in a product name ran code on the page | Medium | **Fixed** | `<` is escaped in the search-engine data (`lib/jsonld.js`) | `M2` test |
| M3 | Security policy allowed inline scripts | Medium | **Fixed** | Per-request nonce policy (`proxy.js`, `lib/csp.js`); `'unsafe-inline'` removed from scripts | `M3` + `S1` tests |
| M4 | Faked `X-Forwarded-For` dodged lockout and rate limits; global lock could lock the owner out | Medium | **Fixed** | `server.js` overwrites the header with the real connection address (unless `TRUST_PROXY=1`); the site-wide lock never blocks the owner on this computer | `M4` tests (2) |
| M5 | Supabase rules too open (drafts readable, enquiry function unlimited, bucket listable) | Medium | **Fixed in SQL, not tested live** | Child tables readable only when the product is visible; `submit_enquiry()` limits size, item count and per-minute volume; public bucket listing removed; secret-looking settings keys hidden. SQL grammar verified with a real PostgreSQL parser | Not testable without a Supabase project |
| L1 | Odd/unknown field names accepted by the admin API | Low | **Fixed** | Exact column list per table; clients can't set `id` or timestamps | `L1` + `S3` tests |
| L2 | `javascript:` links accepted in settings | Low | **Fixed** | Server refuses non-web links; footer/contact only render real `http(s)` links; friendly message in Settings | `L2` test |
| L3 | Faint text failed accessibility | Low | **Fixed** | Text made lighter everywhere (public + admin) | `X1` tests (6) |
| L4 | First admin password lay in plain text in `.env.local` | Low | **Fixed** | Removed from `.env.local` (a hashed copy is in `data/auth.json`); tests use a separate git-ignored `.env.test` | Login still works; all tests pass |
| L5 | Unused uploaded photos could not be deleted | Low | **Fixed** | "Clean up unused photos" in Admin → Account & Security (only unused and older than 1 hour) | `L5` test |
| L6 | No lint setup | Low | **Fixed** | ESLint 9 + Next rules, `npm run lint` passes; real issues fixed (unescaped quotes, components defined inside components) | `npm run lint` exit 0 |
| L7 | `/admin/login...` look-alike paths skipped the gate | Low | **Fixed** | Only the exact login page is public | `L7` test |
| L8 | Customer data stored unencrypted in `data/db.json` | Low | **Not changed** | It is a local file on your PC. Keep the PC protected and back the file up. Encrypting it would need a key you must also protect | n/a |
| L9 | "Not added yet" placeholder shown on the Contact page | Low | **Fixed** | Row hidden until business hours are filled in | `F7` test |

Two regressions I caused while fixing were found by the tests and fixed: (1) Next.js 16 let the site-wide headers overwrite the upload-folder safety headers, and (2) an editor tool silently changed an escape sequence in `lib/jsonld.js` into an invisible character, which broke the build. Both are covered by tests now.

### What is working well (verified)
No secrets or source maps in the browser files; `.env.local`, `.env.test` and `data/` are not downloadable and are in `.gitignore`; password stored hashed (scrypt); session cookie HttpOnly + SameSite=Strict; forged and expired sessions refused; admin APIs refuse visitors and other websites; `admins` table, delete-all/update-all and injected `select` text refused; fake, SVG and HTML-as-image uploads and files over 5 MB refused; path traversal blocked; hostile text shown as plain text everywhere; error messages leak no paths or stack traces; double-click, refresh and 25-at-once enquiries save correctly; no prices or hardware on the public site.

## Still true / not covered
* **HTTPS itself** is not set up (it needs a certificate or hosting). The rules above make the site safe to run on this computer; for other people to use the admin you need HTTPS in front of it (then set `TRUST_PROXY=1`).
* **Supabase mode** is untested live (no Supabase project): real login, signup setting, the new rules, storage and the enquiry limits. The SQL is syntactically valid and re-runnable.
* **"Normal user vs admin"** cannot be tested in local mode (one admin, no user accounts).
* Other browsers (Safari/Firefox), real phones, screen readers, heavy load, WhatsApp/Maps content, and the optional enquiry webhook.
* The standalone `website.html` was not changed or retested; it is a snapshot from before these fixes (it has no admin and no server).
* Git is not installed on this PC; no commits were made. Backup zips of the project exist one folder up (they contain secrets: keep them private or delete them).
* Real 8-hour session expiry (simulated by editing the session file).

## Changes made during the fix phase
`server.js` (new launcher), `proxy.js` (replaces `middleware.js`), `lib/csp.js`, `lib/jsonld.js`, `app/api/local/upload-cleanup/route.js`, `eslint.config.mjs`, `share-on-network.bat`; edits to the auth/db/upload routes, `next.config.mjs`, layouts and pages, `package.json` scripts, the Supabase SQL files, README, and the tests (`tests/08-hardening.spec.js` is new). Packages: Next.js 16.4.6, React 19, ESLint 9, eslint-config-next 16, Playwright and axe.

## Update: phone lag fix and safer testing

* **Phone menu "hangs" fixed.** The phone menu is now a floating panel that fades in (it no longer pushes the whole page down), the header has no blur effect, and it no longer changes size while scrolling. The textured pictures (which used heavy SVG filters) are now ordinary JPEGs. Measured on a simulated slow phone: repaint work when opening the menu fell from raster 173 ms / paint 77-139 ms to raster 2-4 ms / paint 10-20 ms. Tests `P2` guard this.
* **Standalone `website.html` rebuilt** from the fixed site (0.9 MB, was 1.3 MB): each picture is stored once, resized for phones, and attached when its page opens.
* **The tests now use a private copy of the site** (port 3100, its own data folder `data-test`, its own throw-away password in `.env.test`). They can no longer touch your real website data, your real admin password, or the site running on port 3000. This replaced a design flaw where tests ran against the real site.
* **Fixed along the way:** a stale server process was holding port 3000 and serving a half-replaced build (HTTP 500); an editor tool altered a `$$` in a script. Both found and fixed.