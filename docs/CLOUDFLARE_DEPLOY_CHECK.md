# Cloudflare deployment check

This commit is intended to trigger the connected Cloudflare Workers Build for `rfit-v2`.

Expected configuration:
- Root directory: `/`
- Deploy command: `npx wrangler deploy`
- Wrangler config: `wrangler.toml`
- Static assets: `./apps`
- D1 binding: `RFIT_DB` (existing `rfit-v2-db`)

Do not recreate or replace the D1 database as part of deployment.
