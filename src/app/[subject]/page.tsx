import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubject, SUBJECTS } from "@/lib/subjects";
import { getSubjectItems } from "@/lib/content.server";
import { getAvailableCardSkins, pickCardSkin } from "@/lib/card-skins.server";
import StatusBadge from "@/components/StatusBadge";
import BookmarkCounts from "@/components/BookmarkCounts";

export function generateStaticParams() {
  return SUBJECTS.map((s) => ({ subject: s.slug }));
}

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject: subjectSlug } = await params;
  const subject = getSubject(subjectSlug);
  if (!subject) notFound();

  const items = getSubjectItems(subjectSlug);
  const availableSkins = getAvailableCardSkins();

  return (
    <main className="page-shell">
      <header className="subject-header">
        <Link href="/" className="back-link">
          ← 전체 과목
        </Link>
        <h1>{subject.name}</h1>
      </header>

      <div className="card-grid">
        {items.map((item) => {
          const skin = pickCardSkin(`${subjectSlug}/${item.slug}`, availableSkins);

          return (
            <Link
              key={item.slug}
              href={`/${subjectSlug}/${item.slug}`}
              className={`item-card ${skin ? `item-card-skinned item-card-skin-${skin.type}` : ""}`}
              style={
                skin ? { aspectRatio: skin.ratio, backgroundImage: `url(/card-skins/${skin.file})` } : undefined
              }
            >
              <div className="item-card-top">
                <h2>{item.name}</h2>
                <StatusBadge status={item.status} />
              </div>
              {item.category && <p className="item-card-category">{item.category}</p>}
              <BookmarkCounts counts={item.bookmarkCounts} />
            </Link>
          );
        })}
        {items.length === 0 && <p className="empty-state">아직 등록된 항목이 없습니다.</p>}
      </div>
    </main>
  );
}
