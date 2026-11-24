# Test Plan: Shree Lakshmi Narayan Enterprise website

**App:** Next.js 14 website with an admin dashboard. It has two data modes:
* **Local mode** (active now): data in `data/db.json`, password login, sessions stored on the server.
* **Supabase mode** (when real keys are in `.env.local`): Supabase database, Supabase Auth, Row Level Security (RLS).

**Test target:** the production build running at `http://localhost:3000` (local mode).
**Rule for all tests:** use test data only (names start with `QA TEST` / `qa-test`) and delete it afterwards. No test reads or prints `.env.local` contents.

## 1. What exists (map of the app)

### Roles
| Role | How you become it | What it may do |
|---|---|---|
| Visitor | Nothing needed | Browse pages, send enquiries |
| Admin | Local mode: correct password, session cookie. Supabase mode: Supabase user listed in `admins` table | Everything in `/admin` |
| "Normal logged-in user" | Does not exist in local mode. In Supabase mode, any Supabase account that is **not** in `admins` | Must have **no** admin access (tested only by reading the SQL rules, see report) |

### Pages
Public: `/`, `/about`, `/products`, `/products/[slug]` (9 products), `/brands`, `/gallery`, `/quotation`, `/contact`, 404 page, `/sitemap.xml`, `/robots.txt`.
Admin: `/admin/login` (public), then `/admin`, `/admin/products`, `/admin/categories`, `/admin/brands`, `/admin/inventory`, `/admin/enquiries`, `/admin/quotations`, `/admin/gallery`, `/admin/settings`, `/admin/account`.

### API routes
| Route | Who | Purpose |
|---|---|---|
| `POST /api/enquiry` | Visitor | Save an enquiry (quotation or contact form) |
| `POST /api/local/auth` | Visitor / Admin | `login`, `logout`, `change` password |
| `POST /api/local/db` | Admin only | All admin data reads and writes |
| `POST /api/local/upload` | Admin only | Photo upload |
| `GET /uploads/...` | Visitor | Serves uploaded photos |

### Forms
Quotation form, Contact form, product enquiry box (variant, quantity, message), product filters, admin login, change-password form, admin add/edit forms (products, categories, brands, gallery, settings, quotation review, enquiry status).

## 2. Test areas and what "pass" means

### A. Functional (visitor)
| ID | Test | Pass when |
|---|---|---|
| F1 | Every public page loads | HTTP 200, a title, one `h1`, no browser console errors, no failed requests |
| F2 | Header navigation | Every link reaches the right page |
| F3 | Homepage content | Headline, 3 category cards; **no prices (₹), no "Selected Products", no "hardware"** anywhere |
| F4 | Product filters | Section-aware: choosing Plywood shows only plywood categories/brands/thicknesses; search, thickness, clear work; empty state shown |
| F5 | Product pages | Each of the 9 products shows name, image, thickness/sizes; WhatsApp link goes to `wa.me/91…` with the product, thickness and quantity in the message |
| F6 | Gallery | Category chips filter; photo opens and closes |
| F7 | Contact page | Address, 3 phone numbers with working `tel:` and WhatsApp links, map from Google only |
| F8 | SEO | sitemap lists all products, robots blocks `/admin`, JSON-LD is valid JSON, canonical tags |
| F9 | 404 | Unknown page and unknown product show the 404 page |

### B. Forms and edge cases
| ID | Test | Pass when |
|---|---|---|
| E1 | Quotation + contact forms validate | Missing name/phone/requirements and bad email are rejected with a message |
| E2 | Successful submit | A reference like `SLN-…` is shown and the enquiry is saved |
| E3 | Several products in one quotation | All rows are saved |
| E4 | Special characters, emoji, `<script>`/`<img onerror>` text | Saved and shown as plain text; nothing executes |
| E5 | Very long input (5000+ characters) | Rejected cleanly, nothing saved |
| E6 | Double click on Submit | One enquiry, not two |
| E7 | Refresh in the middle of submitting | No crash, no duplicate |
| E8 | Hidden "honeypot" field filled (bot) | Nothing saved |

### C. Authentication
| ID | Test | Pass when |
|---|---|---|
| A1 | Visitor opens any admin page | Redirected to login (all 10 pages) |
| A2 | Wrong password | Clear error, no session |
| A3 | Correct password | Reaches the dashboard; cookie is HttpOnly and SameSite=Strict |
| A4 | Logout | Session ends; admin pages and APIs refuse again |
| A5 | Forged / random cookie | Refused |
| A6 | Expired session | Refused |
| A7 | Brute force | Locked after 5 wrong tries, **and the lock cannot be bypassed by faking the visitor address** |
| A8 | Password change | Weak password rejected, wrong current password rejected (full change/restore was run in the earlier hardening pass) |
| A9 | Signup | Not applicable: there is no public signup |

### D. Authorization
| ID | Test | Pass when |
|---|---|---|
| Z1 | Every admin API without login | 401 |
| Z2 | Admin API from another website (wrong `Origin`) | 403 |
| Z3 | Secret table `admins` through the data API | Refused |
| Z4 | Delete/update every row with no filter | Refused |
| Z5 | Middleware-skip trick (`x-middleware-subrequest` header) on `/admin` | Still redirected to login |
| Z6 | "Normal user cannot reach admin / user A cannot read user B" | Local mode has one admin and no user accounts; for Supabase this is reviewed in SQL (see report) |

### E. Admin functional (logged in, test data only)
| ID | Test |
|---|---|
| M1 | All 10 admin pages load without errors |
| M2 | Create product (with option, photo upload, category, brand) → appears on the public site → edit → unpublish (disappears) → delete |
| M3 | Create and delete a category and a brand |
| M4 | Enquiry shows in admin, status change is saved, hostile text is displayed as text |
| M5 | Quotation review saves amount, status |
| M6 | Settings and inventory pages load real values |
| M7 | Change-password form rejects mismatched and weak passwords |

### F. Security (attacker view)
| ID | Test |
|---|---|
| S1 | Security headers: CSP, frame protection, nosniff, no `X-Powered-By` |
| S2 | Malformed / huge / wrong-type requests are refused without leaking internals (no stack traces, file paths) |
| S3 | Query tampering: bad table names, injected `select` text, `__proto__` keys, object values |
| S4 | Uploads: text renamed `.jpg`, SVG with script, oversized file refused; real PNG accepted with server-chosen name |
| S5 | Path traversal on `/uploads`; `.env.local`, `data/db.json`, `data/auth.json` not downloadable |
| S6 | Enquiry rate limiting |
| S7 | Source review: secrets, `NEXT_PUBLIC_*`, `service_role`, RLS policies, SQL injection, XSS sinks, OWASP Top 10, `.bat` files, dependencies (`npm audit`) |

### G. Responsive, accessibility, performance
| ID | Test | Pass when |
|---|---|---|
| R1 | Phone (375px), tablet (768px), desktop (1280px) on 7 key pages | No horizontal scrolling; menu button on small screens |
| X1 | Accessibility scan (axe) on key pages | No serious or critical violations |
| P1 | Basic speed | Page loads in under 4 seconds locally; first-load JavaScript is modest; images not oversized |

## 3. How to run
```
npm install
npx playwright install chromium
npm run test:e2e
```
Reports: `test-results/results.json` and `playwright-report/`.

## 4. Not covered by automated tests
Supabase mode with real keys (no Supabase project exists yet), real phone devices, other browsers (Safari/Firefox), screen readers, WhatsApp itself, Google Maps content, load/stress at scale, other computers on the network.
