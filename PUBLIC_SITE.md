# Orbit public trust site

`public-site/` is the source-controlled static site served by the Cloudflare Pages project `orbit-landing` and custom domain `orbitcontacts.app`.

## Scope

- Static HTML and CSS only.
- No analytics, cookies, account flow, form submission, or automatic beta enrollment.
- Security headers are defined in `public-site/_headers`.

## Local preview

```bash
python3 -m http.server 4177 --bind 127.0.0.1 --directory public-site
```

## Production deployment

Deploy only after the exact revision has passed review and link/security validation:

```bash
env -u CLOUDFLARE_API_TOKEN wrangler pages deploy public-site \
  --project-name orbit-landing \
  --branch main \
  --commit-hash "$(git rev-parse HEAD)"
```

After deployment, read back the production deployment and verify `/`, `/privacy/`, `/terms/`, `/support/`, and `/contact/` on `https://orbitcontacts.app/`.
