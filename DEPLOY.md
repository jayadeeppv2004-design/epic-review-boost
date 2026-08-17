# Deploying EPIC Review Boost to Vercel

The app is already backed by Supabase (tables created, showrooms configured), so
deployment is just: push to GitHub → import in Vercel → set env vars → deploy.

## 1. Push the code to GitHub

Create an **empty** repo on github.com (no README/gitignore), then:

```bash
git remote add origin https://github.com/<you>/epic-review-boost.git
git push -u origin main
```

## 2. Import into Vercel

1. Go to **vercel.com → Add New → Project**.
2. Import the GitHub repo you just pushed.
3. Framework preset auto-detects **Next.js**. Leave build settings as-is
   (build command `prisma generate && next build` comes from `package.json`).
4. **Before clicking Deploy**, add the environment variables below.

## 3. Environment variables (Vercel → Settings → Environment Variables)

Set these for the **Production** (and Preview) environment:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Supabase **Transaction pooler** URI (port 6543) with `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supabase **Session/direct** URI (port 5432) |
| `NEXT_PUBLIC_BASE_URL` | Your Vercel URL, e.g. `https://epic-review-boost.vercel.app` (see step 5) |
| `ADMIN_EMAIL` | `admin@epictoyota.in` (or your choice) |
| `ADMIN_PASSWORD` | a strong password (change from the demo) |
| `SESSION_SECRET` | a long random string |

> Copy `DATABASE_URL` / `DIRECT_URL` from your local `.env`. For Vercel
> (serverless) use `connection_limit=1` on `DATABASE_URL`.

## 4. Deploy

Click **Deploy**. Vercel installs deps, runs `prisma generate && next build`, and
publishes. The tables already exist in Supabase — no migration runs on deploy.

## 5. Point QR codes at the live URL (important)

QR codes and tracked links encode `NEXT_PUBLIC_BASE_URL`. After the first deploy:

1. Copy the production URL Vercel gives you.
2. Set `NEXT_PUBLIC_BASE_URL` to that exact URL in Vercel env vars.
3. **Redeploy** (Deployments → ⋯ → Redeploy) so QR codes point to production.

Then generate/re-open each employee's QR — scanning it now hits your live site.

## Notes

- **Database:** the same Supabase project is used, so all current data
  (showrooms, links, employees) is already live.
- **Schema changes later:** run `npm run db:push` locally (uses `DIRECT_URL`) —
  it updates Supabase; Vercel picks up code on the next git push.
- **Custom domain:** add it in Vercel → Domains, then update
  `NEXT_PUBLIC_BASE_URL` to the custom domain and redeploy.
- **Security:** never commit `.env`; it is gitignored. Rotate `ADMIN_PASSWORD`
  and `SESSION_SECRET` for production.
