# Rise Supabase setup

## Create and configure the project
1. Create a Supabase project and copy its Project URL and publishable (or legacy anon) key.
2. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The browser key is intentionally public; never put a service-role key in a `VITE_` variable or client bundle.
3. In Authentication → URL Configuration, set the Site URL to your deployed origin and add local and deployed origins to the redirect allow list (for example `http://localhost:5173/**` and `https://your-domain.example/**`). Enable email/password auth and configure SMTP before production email verification/reset delivery.
4. Apply `supabase/migrations/202610290001_initial_schema.sql` using the Supabase SQL Editor or Supabase CLI (`supabase db push` after linking the project). Keep migrations in version control.
5. Run `npm install`, `npm run dev`, and `npm run build`. Configure the same two public environment variables in the hosting provider before deployment.

All owned tables have RLS enabled. Policies derive ownership from `auth.uid()`. Keep Auth email verification enabled in Supabase. No service-role credential is used by this SPA.

## Current limitation
The application requires the migration to exist and a Supabase project to be configured. This repository contains no Supabase URL/key, and live signup, reset-email delivery, RLS isolation, and cross-device persistence cannot be verified until a project is supplied and configured. Website-blocking preferences are stored only; actual blocking still requires a separately implemented and installed extension with browser permissions.
