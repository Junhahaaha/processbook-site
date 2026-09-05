#!/usr/bin/env node
// Syncs markdown + attachments from the Obsidian vault into this repo:
//   <vault>/<subject>/assignment_process/<item>/*.md  -> content/<subject-slug>/<item-slug>/*.md
//   referenced images/video/audio/pdf                  -> public/content/<subject-slug>/<item-slug>/*
//
// Run manually after writing notes in Obsidian, then `git add -A && git commit && git push`.
// Keep the subject list below in sync with src/lib/subjects.ts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.join(__dirname, "..");
const VAULT_ROOT = process.env.VAULT_PATH || "D:\\Obsidian_HUB\\Ore_1\\Univ_works";

const SUBJECTS = [
  { slug: "cdp", vaultFolder: "Communication_design_process" },
  { slug: "dcd", vaultFolder: "Digital_communication_design" },
  { slug: "dfd", vaultFolder: "Digital_Fashion_design" },
  { slug: "dp", vaultFolder: "Design_prototyping" },
];

const FILENAME_FENCE_LANGS = new Set([
  "before-after",
  "gallery",
  "cursor-switch",
  "sticker",
]);
// video/audio/pdf take a single filename too, but are handled the same way.
for (const l of ["video", "audio", "pdf"]) FILENAME_FENCE_LANGS.add(l);

const FENCE_RE = /```([a-zA-Z-]+)\r?\n([\s\S]*?)\r?\n```/g;
const EMBED_RE = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

let warnings = 0;

function slugify(name) {
  // \p{L}/\p{N} keep letters & digits from any script (Korean included) —
  // a plain a-z0-9 charset would strip Korean folder names down to "".
  return name
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function findFile(basename, searchDirs) {
  for (const dir of searchDirs) {
    const p = path.join(dir, basename);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

function findFileRecursive(basename, rootDir) {
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name === basename) return full;
    }
  }
  return null;
}

function makeResolver({ itemDir, subjectDir, publicItemDir, subjectSlug, itemSlug, relLabel }) {
  const sharedImgDir = path.join(subjectDir, "assignment_process", "이미지");
  return function resolve(rawName) {
    const trimmed = rawName.trim();
    if (/^(https?:)?\/\//i.test(trimmed)) return trimmed; // external URL — pass through as-is
    const basename = path.basename(trimmed);
    if (!basename) return rawName;
    const found =
      findFile(basename, [itemDir, sharedImgDir, subjectDir]) ||
      findFileRecursive(basename, VAULT_ROOT);
    if (!found) {
      console.warn(`  ! could not resolve "${basename}" referenced in ${relLabel}`);
      warnings++;
      return rawName;
    }
    fs.mkdirSync(publicItemDir, { recursive: true });
    fs.copyFileSync(found, path.join(publicItemDir, basename));
    return `/content/${subjectSlug}/${itemSlug}/${basename}`;
  };
}

function processMarkdown(text, resolve) {
  // Pull out fenced blocks first so wikilink/embed regexes only touch prose.
  const fences = [];
  const withoutFences = text.replace(FENCE_RE, (match, lang, body) => {
    const idx = fences.length;
    fences.push({ lang, body });
    return `\u0000FENCE${idx}\u0000`;
  });

  let prose = withoutFences.replace(EMBED_RE, (_, name, alias) => {
    const resolved = resolve(name);
    return `![${alias || ""}](${resolved})`;
  });
  prose = prose.replace(WIKILINK_RE, (_, name, alias) => {
    return `**${(alias || name).trim()}**`;
  });

  const rebuilt = prose.replace(/\u0000FENCE(\d+)\u0000/g, (_, i) => {
    const { lang, body } = fences[Number(i)];
    let newBody = body;
    if (FILENAME_FENCE_LANGS.has(lang)) {
      newBody = body
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          return resolve(trimmed);
        })
        .join("\n");
    }
    return "```" + lang + "\n" + newBody + "\n```";
  });

  return rebuilt;
}

function syncSubject({ slug, vaultFolder }) {
  const subjectDir = path.join(VAULT_ROOT, vaultFolder);
  if (!fs.existsSync(subjectDir)) {
    console.warn(`skip ${slug}: vault folder not found (${subjectDir})`);
    return;
  }

  const overviewSrc = path.join(subjectDir, "00_개요.md");
  if (fs.existsSync(overviewSrc)) {
    const contentSubjectDir = path.join(SITE_ROOT, "content", slug);
    fs.mkdirSync(contentSubjectDir, { recursive: true });
    const raw = fs.readFileSync(overviewSrc, "utf-8");
    const processed = raw.replace(WIKILINK_RE, (_, name, alias) => `**${(alias || name).trim()}**`);
    fs.writeFileSync(path.join(contentSubjectDir, "00_개요.md"), processed, "utf-8");
  }

  const processDir = path.join(subjectDir, "assignment_process");
  if (!fs.existsSync(processDir)) return;

  const itemFolders = fs
    .readdirSync(processDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "이미지")
    .map((d) => d.name);

  for (const itemFolder of itemFolders) {
    const itemSlug = slugify(itemFolder);
    const itemDir = path.join(processDir, itemFolder);
    const contentItemDir = path.join(SITE_ROOT, "content", slug, itemSlug);
    const publicItemDir = path.join(SITE_ROOT, "public", "content", slug, itemSlug);
    fs.mkdirSync(contentItemDir, { recursive: true });

    const mdFiles = fs.readdirSync(itemDir).filter((f) => f.endsWith(".md"));
    for (const file of mdFiles) {
      const raw = fs.readFileSync(path.join(itemDir, file), "utf-8");
      const resolve = makeResolver({
        itemDir,
        subjectDir,
        publicItemDir,
        subjectSlug: slug,
        itemSlug,
        relLabel: `${vaultFolder}/${itemFolder}/${file}`,
      });
      const processed = processMarkdown(raw, resolve);
      fs.writeFileSync(path.join(contentItemDir, file), processed, "utf-8");
    }
    console.log(`  ${slug}/${itemSlug}: ${mdFiles.length} note(s) synced`);
  }
}

console.log(`Syncing from vault: ${VAULT_ROOT}`);
for (const subject of SUBJECTS) syncSubject(subject);
console.log(warnings ? `Done, with ${warnings} unresolved reference(s).` : "Done.");
