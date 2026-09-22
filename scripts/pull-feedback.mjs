#!/usr/bin/env node
// Reads web-submitted feedback (committed by src/app/api/feedback/route.ts
// into feedback-inbox/<subject>/<item>/<id>.json) and appends it into the
// actual Obsidian vault as a dated note, using the same
// assignment_process_entry_템플릿.md frontmatter shape as any other entry.
//
// Run this AFTER `git pull` (so any inbox commits made by the live site are
// present locally), then run `npm run sync-content` as usual to bring the
// new vault content back into content/ for the next deploy.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.join(__dirname, "..");
const VAULT_ROOT = process.env.VAULT_PATH || "D:\\Obsidian_HUB\\Ore_1\\Univ_works";
const INBOX_ROOT = path.join(SITE_ROOT, "feedback-inbox");
const PROCESSED_ROOT = path.join(INBOX_ROOT, "_processed");

// Keep in sync with scripts/sync-content.mjs.
const SUBJECTS = [
  { slug: "cdp", vaultFolder: "Communication_design_process" },
  { slug: "dcd", vaultFolder: "Digital_communication_design" },
  { slug: "dfd", vaultFolder: "Digital_Fashion_design" },
  { slug: "dp", vaultFolder: "Design_prototyping" },
];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function findVaultItemDir(subjectSlug, itemSlug) {
  const subject = SUBJECTS.find((s) => s.slug === subjectSlug);
  if (!subject) return null;
  const processDir = path.join(VAULT_ROOT, subject.vaultFolder, "assignment_process");
  if (!fs.existsSync(processDir)) return null;
  const folders = fs
    .readdirSync(processDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "이미지")
    .map((d) => d.name);
  const match = folders.find((f) => slugify(f) === itemSlug);
  return match ? path.join(processDir, match) : null;
}

function readAssignmentName(itemDir) {
  const overviewPath = path.join(itemDir, "00_assignment.md");
  if (!fs.existsSync(overviewPath)) return "";
  const { data } = matter(fs.readFileSync(overviewPath, "utf-8"));
  return data.assignment || "";
}

function listInboxFiles() {
  const results = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (full === PROCESSED_ROOT) continue;
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".json")) results.push(full);
    }
  }
  walk(INBOX_ROOT);
  return results;
}

// Groups by the submitter's local (Asia/Seoul) calendar date, matching how a
// human would file a same-day note, regardless of the UTC ISO timestamp.
function seoulDate(iso) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));
}

const files = listInboxFiles();
if (files.length === 0) {
  console.log("새로운 피드백이 없어요 (feedback-inbox/ 비어있음).");
  process.exit(0);
}

const groups = new Map(); // "subject|item|date" -> { subject, item, date, entries: [{text, submittedAt, file}] }
for (const file of files) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (err) {
    console.warn(`  ! ${file} 파싱 실패, 건너뜀: ${err.message}`);
    continue;
  }
  const { subject, item, text, submittedAt } = parsed;
  if (!subject || !item || !text || !submittedAt) {
    console.warn(`  ! ${file} 필드 누락, 건너뜀`);
    continue;
  }
  const date = seoulDate(submittedAt);
  const key = `${subject}|${item}|${date}`;
  if (!groups.has(key)) groups.set(key, { subject, item, date, entries: [] });
  groups.get(key).entries.push({ text, submittedAt, file });
}

let appliedCount = 0;
for (const { subject, item, date, entries } of groups.values()) {
  const itemDir = findVaultItemDir(subject, item);
  if (!itemDir) {
    console.warn(`  ! ${subject}/${item}: 볼트에서 폴더를 찾을 수 없어요. 건너뜀 (파일은 그대로 남겨둠).`);
    continue;
  }

  entries.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const feedbackBlocks = entries.map((e) => "```feedback\n" + e.text + "\n```").join("\n\n");
  const noteFile = path.join(itemDir, `${date}_웹피드백.md`);

  if (fs.existsSync(noteFile)) {
    const existing = fs.readFileSync(noteFile, "utf-8");
    fs.writeFileSync(noteFile, existing.replace(/\s*$/, "") + "\n\n" + feedbackBlocks + "\n", "utf-8");
  } else {
    const subjectMeta = SUBJECTS.find((s) => s.slug === subject);
    const frontmatter = [
      "---",
      "type: feedback",
      `subject: ${subjectMeta ? subjectMeta.vaultFolder : ""}`,
      "category: 웹 피드백",
      `assignment: ${readAssignmentName(itemDir)}`,
      `date: ${date}`,
      "status: ",
      "tags: [web-feedback]",
      "---",
      "",
      "# 웹에서 남긴 피드백",
      "",
      "",
    ].join("\n");
    fs.writeFileSync(noteFile, frontmatter + feedbackBlocks + "\n", "utf-8");
  }

  console.log(`  ${subject}/${item}: ${entries.length}개 피드백 -> ${path.relative(VAULT_ROOT, noteFile)}`);
  appliedCount += entries.length;

  // Archive rather than delete, so there's always a record of what came in.
  for (const e of entries) {
    const rel = path.relative(INBOX_ROOT, e.file);
    const dest = path.join(PROCESSED_ROOT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(e.file, dest);
  }
}

console.log(`Done. 총 ${appliedCount}개 피드백을 볼트에 반영했어요.`);
console.log("이제 평소처럼 `npm run sync-content` 후 git add/commit/push 하면 사이트에도 반영돼요.");
