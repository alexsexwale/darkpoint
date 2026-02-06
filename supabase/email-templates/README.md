# Supabase Auth Email Templates

Use these templates in the **Supabase Dashboard** so auth emails match the Darkpoint brand (dark theme, gold accent `#c9a227`).

## Reset password

1. In [Supabase Dashboard](https://supabase.com/dashboard) go to **Authentication** → **Email Templates**.
2. Open **Reset password**.
3. Set **Subject** to: `Reset Your Darkpoint Password` (or keep default).
4. In the **Body** (Source tab), paste the contents of `reset-password.html`.
5. Click **Save changes**.

### Required Supabase settings

- **URL Configuration** → **Redirect URLs**: add your reset page URL, e.g.  
  `https://darkpoint.co.za/reset-password`  
  and for local dev: `http://localhost:3000/reset-password`
- **URL Configuration** → **Site URL**: set to your production URL (e.g. `https://darkpoint.co.za`) so `{{ .SiteURL }}` in the template works.

Template variables used:

- `{{ .ConfirmationURL }}` – reset link (required)
- `{{ .Email }}` – user email
- `{{ .SiteURL }}` – site URL from project settings
