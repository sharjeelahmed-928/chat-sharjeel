# Admin Panel Setup

This adds a Supabase-backed admin panel to the existing chat.sharjeel.space
app: authentication, a live dashboard, Website Settings, Chat Settings,
Prompt management with version history, and multi-admin support. It's
additive — with no Supabase env vars set, the site runs exactly as it did
before.

## 1. Create a Supabase project

1. Go to https://supabase.com and create a free project.
2. In the SQL editor, run the migration in
   `supabase/migrations/0001_admin_panel.sql` (paste the whole file, run it
   once).
3. In **Project Settings → API**, copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (NOT the anon key) → `SUPABASE_SERVICE_ROLE_KEY`

The service_role key bypasses Row Level Security by design and is only ever
used from server-side code (API routes / middleware). Never expose it to the
browser or prefix it with `NEXT_PUBLIC_`.

## 2. Set environment variables

Copy `.env.example` to `.env.local` and fill in:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_SESSION_SECRET=...   # openssl rand -base64 32
ADMIN_SETUP_SECRET=...     # any long random string, temporary
```

On Vercel, add the same variables under Project Settings → Environment
Variables.

## 3. Install the new dependencies

```
npm install
```

New packages: `@supabase/supabase-js`, `bcryptjs`, `jose`, `server-only`,
`recharts`.

## 4. Create the first super admin

Start the app (`npm run dev` or deploy), then visit `/admin/login`, click
"First time setting up? Create the super admin", and fill in your email,
a password (10+ characters), and the `ADMIN_SETUP_SECRET` you set above.

This only works once — as soon as one admin exists, `/api/admin/setup`
refuses to run again, so a leaked setup secret can't be used to create a
second super admin later. After setup, you can remove `ADMIN_SETUP_SECRET`
from your environment if you like (or leave it; it's inert once an admin
exists).

## 5. Log in

Go to `/admin/login`, sign in, and you'll land on the dashboard.

## What's included

- **Auth**: bcrypt-hashed passwords, signed JWT session cookies, route
  protection via middleware, two roles (`admin`, `super_admin`)
- **Dashboard**: real message/error/upload counts and a 7-day chart, sourced
  from an `analytics_events` table the chat API now writes to
- **Website Settings**: branding, SEO, maintenance mode, announcement banner,
  footer, contact, social links, custom CSS/JS/head/footer HTML — all wired
  into the live site's metadata and layout
- **Chat Settings**: default model, temperature/top-p/top-k, max tokens,
  rate limit, feature toggles, welcome message, placeholder, suggested
  prompts — wired into `/api/chat` and the welcome screen
- **Prompts**: edit the system prompt (and add unlimited custom ones), with
  full version history and one-click restore
- **Admins**: super_admins can invite additional admin accounts and
  deactivate them

## What's deliberately not included yet

This was scoped as Phase 1 of a much larger spec. Not built: blog CMS, page
builder, drag-and-drop menu/footer builder, media library, multi-provider AI
routing with health checks (OpenAI/OpenRouter/Groq/etc.), 2FA, backups/
restore, localization/RTL, a live theme editor, webhook notifications, and a
full end-user accounts system. Say the word for any of these as a follow-up
phase — building them on top of this foundation (same auth, same Supabase
project, same patterns) is much cheaper than it would have been to attempt
everything in one pass.
