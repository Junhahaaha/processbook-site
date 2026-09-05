// Build-time metadata fetch for `link-card` blocks. Runs during the server
// render of an item detail page; results are passed down as a plain object
// so the (server-safe) LinkCard component never needs to fetch itself.
export type LinkMeta = { url: string; title: string; description: string; image: string | null };

const LINK_CARD_FENCE = /```link-card\r?\n([\s\S]*?)\r?\n```/g;

function extractTag(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

async function fetchOne(url: string): Promise<LinkMeta> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; ProcessBookBot/1.0)" },
    });
    const html = await res.text();
    const title =
      extractTag(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      extractTag(html, /<title[^>]*>([^<]+)<\/title>/i) ||
      url;
    const description = extractTag(
      html,
      /<meta[^>]+(?:property=["']og:description["']|name=["']description["'])[^>]+content=["']([^"']+)["']/i
    );
    const image = extractTag(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    return { url, title, description, image: image || null };
  } catch {
    return { url, title: url, description: "", image: null };
  }
}

export function extractLinkCardUrls(...texts: string[]): string[] {
  const urls = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(LINK_CARD_FENCE)) {
      for (const line of match[1].split("\n")) {
        const trimmed = line.trim();
        if (trimmed) urls.add(trimmed);
      }
    }
  }
  return [...urls];
}

export async function fetchLinkMetaMap(urls: string[]): Promise<Record<string, LinkMeta>> {
  const results = await Promise.all(urls.map(fetchOne));
  const map: Record<string, LinkMeta> = {};
  for (const r of results) map[r.url] = r;
  return map;
}
