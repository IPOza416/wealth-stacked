# News proxy (Cloudflare Worker)

1. Edit `ALLOWED_ORIGINS` in `news-proxy.js` to your real domain(s).
2. Install and deploy (free Cloudflare account):
   ```
   npm i -g wrangler
   wrangler login
   cd worker && wrangler deploy
   ```
3. Copy the printed URL (https://wealth-stacked-news.<you>.workers.dev) into `assets/config.js` as `newsProxy`.
4. Run `python3 build.py` from the site folder and upload the site again.
