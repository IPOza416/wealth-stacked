/**
 * Wealth Stacked news proxy – Cloudflare Worker (free plan is enough).
 * Fetches a fixed allowlist of public RSS feeds, merges them, and returns clean JSON
 * with CORS so the static site can call it from the browser.
 */
const FEEDS = [
  ['Markets',     'https://finance.yahoo.com/news/rssindex'],
  ['Business',    'https://feeds.bbci.co.uk/news/business/rss.xml'],
  ['Top stories', 'https://www.cnbc.com/id/100003114/device/rss/rss.html'],
  ['Economy',     'https://www.cnbc.com/id/20910258/device/rss/rss.html'],
];
const MAX_PER_FEED = 12;      // headlines kept from each feed
const CACHE_SECONDS = 600;    // 10 minutes: protects the feeds and keeps your site fast
const TIMEOUT_MS = 6000;      // give up on a slow feed instead of hanging

// Only these websites may call the proxy from a browser. Edit to your real domain.
const ALLOWED_ORIGINS = ['https://YOUR-DOMAIN.example', 'http://localhost:8000'];

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const clean = (s = '') =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')                       // unwrap CDATA
   .replace(/<[^>]+>/g, '')                                             // strip any HTML tags
   .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {                // decode entities
      if (e[0] === '#') {
        const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
      }
      return ENT[e.toLowerCase()] ?? m;
   })
   .replace(/\s+/g, ' ').trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? clean(m[1]) : '';
};

/** Parse RSS 2.0 (<item>) and Atom (<entry>) into [{t,l,d}] */
export function parseFeed(xml) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  return blocks.map(b => {
    let link = tag(b, 'link');
    if (!link) { const a = b.match(/<link[^>]*href="([^"]+)"/i); link = a ? a[1] : ''; } // Atom style
    const raw = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated');
    const date = new Date(raw);
    return { t: tag(b, 'title'), l: link, d: isNaN(date) ? '' : date.toISOString() };
  }).filter(i => i.t && /^https?:\/\//i.test(i.l));                       // drop junk and non-http links
}

async function loadFeed([source, url]) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'WealthStackedNews/1.0' } });
    if (!r.ok) return [];
    return parseFeed(await r.text()).slice(0, MAX_PER_FEED).map(i => ({ s: source, ...i }));
  } catch { return []; }                                                  // one bad feed must not break the rest
  finally { clearTimeout(timer); }
}

const cors = origin => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Vary': 'Origin',
});

export default {
  async fetch(req) {
    const origin = req.headers.get('Origin') || '';
    const headers = { ...cors(origin), 'Content-Type': 'application/json; charset=utf-8' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'GET') return new Response('{"error":"method"}', { status: 405, headers });
    if (origin && !ALLOWED_ORIGINS.includes(origin)) return new Response('{"error":"origin not allowed"}', { status: 403, headers });

    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const key = new Request('https://news-cache.local/v1');               // one shared cache entry for everyone
    if (cache) { const hit = await cache.match(key); if (hit) { const r = new Response(hit.body, hit); Object.entries(headers).forEach(([k, v]) => r.headers.set(k, v)); return r; } }

    const all = (await Promise.all(FEEDS.map(loadFeed))).flat();
    const seen = new Set();
    const items = all
      .filter(i => { const k = i.t.toLowerCase().slice(0, 50); if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => (b.d || '').localeCompare(a.d || ''));
    const res = new Response(JSON.stringify({ updated: new Date().toISOString(), items }), {
      headers: { ...headers, 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
    });
    if (cache && items.length) await cache.put(key, res.clone());          // don't cache an empty failure
    return res;
  },
};
