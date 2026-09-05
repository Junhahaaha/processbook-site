import Link from "next/link";
import { getAllSubjectSummaries } from "@/lib/content.server";
import BookmarkCounts from "@/components/BookmarkCounts";

export default function HomePage() {
  const subjects = getAllSubjectSummaries();

  return (
    <main className="page-shell">
      <header className="home-header">
        <p className="eyebrow">Process Book</p>
        <h1>이번 학기 작업 기록</h1>
        <p className="home-sub">과목별로 진행 중인 과제 · 프로젝트의 작업 과정을 모아둔 곳.</p>
      </header>

      <div className="card-grid">
        {subjects.map((s) => (
          <Link key={s.slug} href={`/${s.slug}`} className="subject-card">
            <span className="subject-card-code">{s.code}</span>
            <h2>{s.name}</h2>
            <p className="subject-card-meta">{s.itemCount}개 항목</p>
            <BookmarkCounts counts={s.bookmarkCounts} />
          </Link>
        ))}
      </div>
    </main>
  );
}
