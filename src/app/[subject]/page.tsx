import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubject, SUBJECTS } from "@/lib/subjects";
import { getSubjectItems } from "@/lib/content.server";
import { getAvailableCardSkins, pickCardSkin } from "@/lib/card-skins.server";
import { jitterForSeed } from "@/lib/jitter";
import ItemCard from "@/components/ItemCard";
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
        {items.map((item, i) => {
          const seed = `${subjectSlug}/${item.slug}`;
          const skin = pickCardSkin(seed, availableSkins);
          const { rotation, offsetY } = jitterForSeed(seed);

          return (
            <ItemCard
              key={item.slug}
              href={`/${subjectSlug}/${item.slug}`}
              className={`item-card ${skin ? `item-card-skinned item-card-skin-${skin.type}` : ""}`}
              baseRotation={rotation}
              entranceDelay={i * 55}
              style={{
                marginTop: offsetY,
                ...(skin
                  ? { aspectRatio: skin.ratio, backgroundImage: `url(/card-skins/${skin.file})` }
                  : {}),
              }}
            >
              <div className="item-card-top">
                <h2>{item.name}</h2>
              </div>
              <BookmarkCounts counts={item.bookmarkCounts} />
            </ItemCard>
          );
        })}
        {items.length === 0 && <p className="empty-state">아직 등록된 항목이 없습니다.</p>}
      </div>
    </main>
  );
}
