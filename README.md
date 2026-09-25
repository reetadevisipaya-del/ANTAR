# ANTAR

ANTAR is a secure parent–institution communication and care support platform.

## Authentication milestone

The first working milestone provides three entry points backed by the same Supabase Auth system:

- Parent Portal — `parent`
- Staff Portal — `teacher`, `special_educator`, `therapist`
- Institute Admin — `institute_admin`

The portal selected in the UI is never trusted for authorization. After email/password authentication, ANTAR reads the user's active role from `institution_members`.

## Local setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add the ANTAR Supabase project URL and publishable/anon key.
5. Run `npm run dev`.

Never commit real passwords, `.env.local`, or a Supabase service-role key.

## Test accounts

Create or use controlled Supabase Auth test users. Keep their passwords outside GitHub. The existing database should contain an active `institution_members` row for each test account.

## Deployment

This is a Vite single-page application. It can be deployed to Cloudflare Pages, Vercel, Netlify, or another static host. A public site URL does not exist until a deployment provider or custom domain is connected.
