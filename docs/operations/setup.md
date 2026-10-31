# Hosted setup (free tiers)

Recheck the provider free-tier pages before provisioning (plan §5.1). **Don't add a payment
method or enable paid add-ons.**

## 1. Supabase (pilot project)

1. Create a Free project in the owner's account. Choose the region deliberately; it must appear
   in the privacy notice.
2. Link and push the schema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push            # applies supabase/migrations
   ```
   Don't run `seed.sql` against the pilot. Seed content through Admin, or run only the content
   part of it after review. Its development pilot admissions must **not** be loaded.
3. **Auth → Providers:** disable **Email** (production sign-in is Google only) and enable
   **Google** (step 2).
4. **Auth → URL configuration:**
   - Site URL: `https://<project>.pages.dev`
   - Redirect URLs (exact): `https://<project>.pages.dev/auth/callback`
5. Deploy the deletion function and set its allowed origins:
   ```bash
   npx supabase functions deploy delete-account
   npx supabase secrets set ALLOWED_ORIGINS=https://<project>.pages.dev
   ```
6. Check that **Storage → recordings** is private, with a 2,000,000-byte limit and only audio types.

## 2. Google OAuth

1. In Google Cloud Console, create an OAuth client (Web application).
2. Authorized JavaScript origin: `https://<project>.pages.dev`.
3. Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`.
4. Scopes: `openid`, `email`, `profile` only.
5. Consent screen: complete branding and audience. With basic scopes, publishing to production
   normally doesn't need verification. In "Testing" mode you must list every test user.
6. Paste the client ID and secret into Supabase → Auth → Google.
7. **Validate early (LB-04):** sign in on the hosted address before building further. The
   consent screen will name `<ref>.supabase.co` unless a custom domain is bought. That's a paid
   add-on, so accept this for the pilot.

## 3. Cloudflare Pages

1. Create a Pages project from the repository (or with `npx wrangler pages deploy dist`).
2. Build command: `npm run build`. Output directory: `dist`.
3. Environment variables (public values only):
   - `VITE_SUPABASE_URL=https://<ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<publishable/anon key>`
   - `VITE_ENABLE_DEV_LOGIN=false`
   - `VITE_SUPPORT_EMAIL=<owner-controlled mailbox>`
   - `VITE_POLICY_VERSION=<version of the published privacy notice>`
4. Edit `public/_headers` so `connect-src` and `form-action` name your exact Supabase URL.
5. Single-page routing works by default (no `404.html` is shipped). Test direct visits to
   `/memories`, `/auth/callback` and `/join#token=…`.
6. Restrict access to preview deployments, or keep them away from pilot data (plan §15).

## 4. First operator

After the operator signs in once with Google, run this in the Supabase SQL editor:

```sql
insert into public.admin_roles (user_id, role)
select id, 'operator' from auth.users where email = '<operator email>';
```

Grant the other roles from **Admin → Access** afterwards. Add pilot families under
**Admin → Access → Pilot admissions**.

## 5. Before enrolling anyone

Work through the release checklist in plan §23, including:

- [ ] Placeholder and unreviewed content flags cleared (Admin → Content).
- [ ] Privacy notice and terms completed: replace every `[bracketed]` item.
- [ ] `npm run check:bundle` passes on the production build.
- [ ] Real-device recording and playback checked across platforms, including iPhone ↔ Android.
- [ ] Restoration drill done (runbook).
