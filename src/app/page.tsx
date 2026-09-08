import fs from "node:fs";
import path from "node:path";
import { getAllSubjectSummaries } from "@/lib/content.server";
import NotebookLandingLoader from "@/components/landing/NotebookLandingLoader";
import type { NotebookSubjectData } from "@/components/landing/types";

export default function HomePage() {
  const subjects = getAllSubjectSummaries();

  const notebookSubjects: NotebookSubjectData[] = subjects.map((s) => {
    const modelAbsPath = path.join(process.cwd(), "public", "models", "notebooks", s.modelFile);
    const bookmarkColors = Object.entries(s.bookmarkCounts).flatMap(([color, count]) =>
      Array.from({ length: count }, () => color)
    );
    return {
      slug: s.slug,
      code: s.code,
      name: s.name,
      itemCount: s.itemCount,
      modelPath: fs.existsSync(modelAbsPath) ? `/models/notebooks/${s.modelFile}` : null,
      bookmarkColors,
    };
  });

  return (
    <main className="home-notebook-stage">
      <NotebookLandingLoader subjects={notebookSubjects} />
    </main>
  );
}
