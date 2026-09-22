import { NextResponse } from "next/server";
import { getAllItemSlugs } from "@/lib/content.server";
import { NOTEBOOK_PASSWORDS } from "@/lib/notebook-passwords";

// Web feedback → vault, one-way "inbox" bridge (see project docs / chat with
// Claude for the design writeup). The site is fully static (SSG, no DB), and
// the Obsidian vault lives on the author's own PC, so there's no direct path
// from a live request to that filesystem. Instead: this route commits each
// submission as its own small JSON file under feedback-inbox/ via the GitHub
// Contents API; `scripts/pull-feedback.mjs`, run locally after a `git pull`,
// reads those files and appends them into the actual vault notes.
//
// Required environment variables (set in Vercel → Project → Settings →
// Environment Variables, and in a local .env.local for `npm run dev`):
//   GITHUB_TOKEN  - a fine-grained PAT scoped to just this repo, with
//                   "Contents: Read and write" permission only.
//   GITHUB_REPO   - "owner/repo", e.g. "Junhahaaha/processbook-site".
//   GITHUB_BRANCH - optional, defaults to "master".
const MAX_TEXT_LENGTH = 2000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const { subject, item, code, text } = (body ?? {}) as Record<string, unknown>;

  if (typeof subject !== "string" || typeof item !== "string") {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  const validPair = getAllItemSlugs().some((s) => s.subject === subject && s.item === item);
  if (!validPair) {
    return NextResponse.json({ error: "존재하지 않는 과목/항목이에요." }, { status: 404 });
  }

  if (typeof code !== "string" || code !== NOTEBOOK_PASSWORDS[subject]) {
    return NextResponse.json({ error: "비밀번호가 틀렸어요." }, { status: 401 });
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
  }
  const trimmed = text.trim().slice(0, MAX_TEXT_LENGTH);

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "master";
  if (!token || !repo) {
    return NextResponse.json(
      { error: "서버에 GITHUB_TOKEN / GITHUB_REPO가 설정되지 않았어요." },
      { status: 500 }
    );
  }

  const submittedAt = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `feedback-inbox/${subject}/${item}/${id}.json`;
  const payload = { subject, item, text: trimmed, submittedAt };
  const content = Buffer.from(JSON.stringify(payload, null, 2), "utf-8").toString("base64");

  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: `피드백 추가: ${subject}/${item}`,
        content,
        branch,
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("GitHub commit failed", res.status, detail);
    return NextResponse.json({ error: "저장 중 문제가 생겼어요. 잠시 후 다시 시도해주세요." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
