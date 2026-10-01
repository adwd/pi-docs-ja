import { pagePaths, hrefFor } from '../lib/content.mjs';
export function GET() {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pagePaths.map((p) => `<url><loc>https://adwd.github.io${hrefFor(p)}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
}
