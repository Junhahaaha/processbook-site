import type { LinkMeta } from "@/lib/link-meta.server";

export default function LinkCard({
  urls,
  metaMap,
}: {
  urls: string[];
  metaMap: Record<string, LinkMeta>;
}) {
  const links = urls.map((l) => l.trim()).filter(Boolean);
  if (links.length === 0) return null;

  return (
    <div className="block-card link-card-row" data-block="link-card">
      {links.map((url) => {
        const meta = metaMap[url];
        return (
          <a key={url} href={url} target="_blank" rel="noreferrer noopener" className="link-card">
            {meta?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={meta.image} alt="" className="link-card-image" />
            )}
            <span className="link-card-body">
              <span className="link-card-title">{meta?.title || url}</span>
              {meta?.description && <span className="link-card-desc">{meta.description}</span>}
              <span className="link-card-url">{new URL(url).hostname}</span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
