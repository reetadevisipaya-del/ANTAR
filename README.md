# ANTAR

ANTAR is a secure parent–institution communication and care support platform.

## Authentication milestone

ANTAR now connects directly to the real Supabase project and provides three login entry points:

- Parent Portal — `parent`
- Staff Portal — `teacher`, `special_educator`, `therapist`
- Institute Admin — `institute_admin`

The portal selected in the UI is never trusted for authorization. After Supabase email/password authentication, ANTAR reads the user's active role from `institution_members`.

## Supabase connection

Project URL:

`https://cxpsjlevzmodjpwokwyl.supabase.co`

The frontend uses the browser-safe Supabase publishable key. No service-role or secret key is committed.

You can still override the defaults with:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## Local setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Run `npm run dev`.

## Test accounts

Use controlled Supabase Auth test users. Keep passwords outside GitHub. Each test user must have an active row in `institution_members`.

## Deployment

The source is ready to deploy as a Vite SPA. GitHub Pages, Cloudflare Pages, Vercel, or Netlify can host it. Direct-link SPA routing must be configured for `/login/parent`, `/login/staff`, `/login/admin`, `/reset-password`, and `/app`.
