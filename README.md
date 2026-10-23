# shreyasprasad.dev

Personal website developed in Next.js, exported as a static site and hosted on Cloudflare Workers.

## Development

```sh
cd hosting
npm install
npm run dev       # Next.js dev server
npm run preview   # build and serve the static export locally with Wrangler
npm run deploy    # build and deploy to Cloudflare (requires `npx wrangler login`)
```

## Deployment

`.github/workflows/deploy.yml` deploys to production on every push to `main`, and uploads a preview
version for pull requests. It needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.
