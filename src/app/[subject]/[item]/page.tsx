import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubject } from "@/lib/subjects";
import { getAllItemSlugs, getItemDetail } from "@/lib/content.server";
import { extractLinkCardUrls, fetchLinkMetaMap } from "@/lib/link-meta.server";
import StatusBadge from "@/components/StatusBadge";
import ProcessMarkdown from "@/components/markdown/ProcessMarkdown";
import BookmarkDock from "@/components/bookmark/BookmarkDock";

export function generateStaticParams() {
  return getAllItemSlugs().map(({ subject, item }) => ({ subject, item }));
}

const ENTRY_TYPE_LABEL: Record<string, string> = {
  process: "작업 과정",
  reference: "레퍼런스",
  feedback: "피드백",
  reflection: "회고",
};

export default async function ItemPage({
  params,
}: {
  params: Promise<{ subject: string; item: string }>;
}) {
  const raw = await params;
  const subjectSlug = decodeURIComponent(raw.subject);
  const itemSlug = decodeURIComponent(raw.item);
  const subject = getSubject(subjectSlug);
  if (!subject) notFound();

  const item = getItemDetail(subjectSlug, itemSlug);
  if (!item) notFound();

  const urls = extractLinkCardUrls(item.overviewBody, ...item.entries.map((e) => e.body));
  const linkMeta = await fetchLinkMetaMap(urls);

  return (
    <main className="page-shell item-page">
      <header className="item-header">
        <Link href={`/${subjectSlug}`} className="back-link">
          ← {subject.name}
        </Link>
        <div className="item-header-top">
          <h1>{item.name}</h1>
          <StatusBadge status={item.status} />
        </div>
      </header>

      <ProcessMarkdown
        source={item.overviewBody}
        feedbackColors={item.feedbackColors}
        linkMeta={linkMeta}
      />

      <div className="entry-timeline">
        {item.entries.map((entry) => (
          <section key={entry.slug} className="entry">
            <div className="entry-meta">
              <span className="entry-date">{entry.date}</span>
              <span className={`entry-type entry-type-${entry.type}`}>
                {ENTRY_TYPE_LABEL[entry.type] ?? entry.type}
              </span>
            </div>
            <h2>{entry.title}</h2>
            <ProcessMarkdown
              source={entry.body}
              feedbackColors={item.feedbackColors}
              linkMeta={linkMeta}
            />
          </section>
        ))}
      </div>

      <BookmarkDock />
    </main>
  );
}
