// Random-per-item "skin" for item cards on a subject page (post-it / business
// card / ticket — see public/card-skins/). Add more entries any time; each
// gets its own aspect ratio. Selection is a deterministic hash of the item's
// slug rather than Math.random(), so a given item keeps the same skin across
// rebuilds instead of reshuffling every deploy.
export type CardSkin = {
  id: string;
  ratio: number; // width / height
  file: string; // filename under public/card-skins/
};

export const CARD_SKINS: CardSkin[] = [
  { id: "postit", ratio: 1, file: "postit.png" },
  { id: "business-card", ratio: 1.6, file: "business-card.png" },
  { id: "ticket", ratio: 2.75, file: "ticket.png" },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function pickCardSkin(seed: string): CardSkin {
  const h = hashString(seed);
  return CARD_SKINS[h % CARD_SKINS.length];
}
