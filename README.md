# Wealth Stacked

Static English website: 25 calculators (5 new stock tools), Market News page, guides, light/dark mode, currency symbol selector, favorites/search, and offline PWA.

## Structure
- `assets/tools.js`: calculator engine (pure functions, fields, formulas, no DOM)
- `assets/app.js`: UI (forms, validation, charts, home search, theme, currency)
- `assets/news.js`: trending news (RSS via rss2json.com, 10 min cache, fallback links)
- `worker/`: your own news proxy (Cloudflare Worker)
- `assets/config.js`: site settings (news proxy URL)
- `build.py`: regenerates all HTML, sitemap, service worker (`python3 build.py`, outputs to `out/`)

## Before publishing
1. Replace `https://YOUR-DOMAIN.example` and the contact email (edit `build.py`, rebuild).
2. News: deploy `worker/news-proxy.js` (see `worker/README.md`), then paste its URL into `assets/config.js`. Until then the page falls back to rss2json.com.
3. Stock tools use numbers you type. No live prices are fetched.
4. Review all formulas and legal pages with a qualified professional.
5. After any file change, bump `V` in `build.py` so offline caches refresh.

Run locally: `cd out && python3 -m http.server 8000`
