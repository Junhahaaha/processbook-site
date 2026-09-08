import fs from "node:fs";
import path from "node:path";

// Random-per-item "skin" for item cards on a subject page. Drop any number
// of files into public/card-skins/ named `<type>-<number>.png`
// (postit-01.png, postit-02.png, business-card-01.png, ticket-01.png, ...)
// — every matching file is picked up automatically, no code changes needed.
// Selection is a deterministic hash of the item's slug rather than
// Math.random(), so a given item keeps the same skin across rebuilds
// instead of reshuffling every deploy.
export type CardSkinType = "postit" | "business-card" | "ticket";

export type CardSkin = {
  type: CardSkinType;
  ratio: number; // width / height
  file: string; // filename under public/card-skins/
};

const TYPE_RATIOS: Record<CardSkinType, number> = {
  postit: 1,
  "business-card": 1.6,
  ticket: 2.75,
};

const CARD_SKINS_DIR = path.join(process.cwd(), "public", "card-skins");
const FILE_RE = /^(postit|business-card|ticket)-\d+\.(png|jpg|jpeg|webp)$/i;

export function getAvailableCardSkins(): CardSkin[] {
  if (!fs.existsSync(CARD_SKINS_DIR)) return [];
  return fs
    .readdirSync(CARD_SKINS_DIR)
    .filter((file) => FILE_RE.test(file))
    .map((file) => {
      const type = file.match(FILE_RE)![1] as CardSkinType;
      return { type, ratio: TYPE_RATIOS[type], file };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function pickCardSkin(seed: string, skins: CardSkin[]): CardSkin | null {
  if (skins.length === 0) return null;
  const h = hashString(seed);
  return skins[h % skins.length];
}
