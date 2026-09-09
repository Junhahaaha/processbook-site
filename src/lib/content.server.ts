import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { SUBJECTS, type Subject } from "./subjects";
import { normalizeStatus, type Status } from "./status";
import { extractProgressChecklist, checklistPercent, type ChecklistItem } from "./markdown-clean";
import { colorForIndex } from "./colors";

const CONTENT_ROOT = path.join(process.cwd(), "content");

const FEEDBACK_FENCE = /```feedback\r?\n[\s\S]*?\r?\n```/g;

export type EntryType = "process" | "reference" | "feedback" | "reflection";

export type Entry = {
  slug: string;
  type: EntryType;
  date: string;
  title: string;
  body: string;
};

export type ItemDetail = {
  slug: string;
  name: string;
  category: string;
  status: Status;
  checklist: ChecklistItem[];
  progressPercent: number;
  overviewBody: string;
  entries: Entry[];
  feedbackColors: Record<string, string>;
  feedbackTexts: string[];
};

export type ItemSummary = {
  slug: string;
  name: string;
  category: string;
  status: Status;
  progressPercent: number;
  entryCount: number;
  bookmarkCounts: Record<string, number>;
};

export type SubjectSummary = Subject & {
  itemCount: number;
  bookmarkCounts: Record<string, number>;
};

function itemDirs(subjectSlug: string): string[] {
  const base = path.join(CONTENT_ROOT, subjectSlug);
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function readMd(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return matter(raw);
}

function toDateString(value: unknown): string {
  // gray-matter's YAML parser turns unquoted `date: 2026-09-03` into a Date.
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value ? String(value) : "";
}

function extractTitle(body: string, fallback: string): { title: string; body: string } {
  const m = body.match(/^#\s+(.+)\r?\n?/);
  if (!m) return { title: fallback, body };
  return { title: m[1].trim(), body: body.slice(m[0].length).trim() };
}

function extractFeedbackTexts(text: string): string[] {
  const matches = text.match(FEEDBACK_FENCE) ?? [];
  return matches.map((m) => m.replace(/^```feedback\r?\n/, "").replace(/\r?\n```$/, "").trim());
}

// Keyed by each feedback block's own text so the renderer can look up a color
// with a pure lookup instead of a mutable position counter (duplicate feedback
// text will share a color — an acceptable, unlikely edge case).
function buildFeedbackColorMap(texts: string[], seed = ""): Record<string, string> {
  const map: Record<string, string> = {};
  let i = 0;
  for (const text of texts) {
    if (text in map) continue;
    map[text] = colorForIndex(i, seed);
    i += 1;
  }
  return map;
}

function bookmarkCountsFromColorMap(map: Record<string, string>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const color of Object.values(map)) counts[color] = (counts[color] ?? 0) + 1;
  return counts;
}


function loadItem(subjectSlug: string, itemSlug: string): ItemDetail | undefined {
  const dir = path.join(CONTENT_ROOT, subjectSlug, itemSlug);
  if (!fs.existsSync(dir)) return undefined;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const overviewFile = files.find((f) => f === "00_assignment.md");
  if (!overviewFile) return undefined;

  const overview = readMd(path.join(dir, overviewFile));
  const { checklist, body: checklistStripped } = extractProgressChecklist(overview.content);
  const name = (overview.data.assignment as string) || itemSlug;
  const { body: overviewBodyRaw } = extractTitle(checklistStripped.trim(), name);
  const category = (overview.data.category as string) || "";
  const status = normalizeStatus(overview.data.status as string);

  const entryFiles = files.filter((f) => f !== overviewFile).sort();
  const entries: Entry[] = entryFiles.map((f) => {
    const parsed = readMd(path.join(dir, f));
    const type = (parsed.data.type as EntryType) || "process";
    const date = toDateString(parsed.data.date);
    const { title, body } = extractTitle(parsed.content.trim(), f.replace(/\.md$/, ""));
    return {
      slug: f.replace(/\.md$/, ""),
      type,
      date,
      title,
      body,
    };
  });
  entries.sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));

  const feedbackTexts = [
    ...extractFeedbackTexts(overviewBodyRaw),
    ...entries.flatMap((e) => extractFeedbackTexts(e.body)),
  ];
  const feedbackColors = buildFeedbackColorMap(feedbackTexts, `${subjectSlug}/${itemSlug}`);

  return {
    slug: itemSlug,
    name,
    category,
    status,
    checklist,
    progressPercent: checklistPercent(checklist),
    overviewBody: overviewBodyRaw,
    entries,
    feedbackColors,
    feedbackTexts,
  };
}

export function getItemDetail(subjectSlug: string, itemSlug: string): ItemDetail | undefined {
  const subject = SUBJECTS.find((s) => s.slug === subjectSlug);
  if (!subject) return undefined;
  return loadItem(subject.slug, itemSlug);
}

export function getSubjectItems(subjectSlug: string): ItemSummary[] {
  const subject = SUBJECTS.find((s) => s.slug === subjectSlug);
  if (!subject) return [];
  return itemDirs(subject.slug)
    .map((slug) => loadItem(subject.slug, slug))
    .filter((i): i is ItemDetail => !!i)
    .map((item) => ({
      slug: item.slug,
      name: item.name,
      category: item.category,
      status: item.status,
      progressPercent: item.progressPercent,
      entryCount: item.entries.length,
      bookmarkCounts: bookmarkCountsFromColorMap(item.feedbackColors),
    }));
}

export function getAllItemSlugs(): { subject: string; item: string }[] {
  return SUBJECTS.flatMap((s) => itemDirs(s.slug).map((item) => ({ subject: s.slug, item })));
}

export function getSubjectSummary(subjectSlug: string): SubjectSummary | undefined {
  const subject = SUBJECTS.find((s) => s.slug === subjectSlug);
  if (!subject) return undefined;
  const items = getSubjectItems(subjectSlug);

  // Merging each item's own feedbackColors here would mostly repeat 1-2
  // colors: loadItem numbers each item's feedback from 0, and most items
  // only have a couple of feedback blocks, so nearly every item's colors
  // restart at the same first palette entries. The notebook's bookmark
  // tabs read much better with real variety, so re-number across every
  // feedback block in the subject instead (item pages keep their own
  // local numbering — this only changes the notebook's tab colors).
  const subjectTexts = itemDirs(subject.slug).flatMap(
    (slug) => loadItem(subject.slug, slug)?.feedbackTexts ?? []
  );
  const bookmarkCounts = bookmarkCountsFromColorMap(buildFeedbackColorMap(subjectTexts, subject.slug));

  return { ...subject, itemCount: items.length, bookmarkCounts };
}

export function getAllSubjectSummaries(): SubjectSummary[] {
  return SUBJECTS.map((s) => getSubjectSummary(s.slug)).filter((s): s is SubjectSummary => !!s);
}
