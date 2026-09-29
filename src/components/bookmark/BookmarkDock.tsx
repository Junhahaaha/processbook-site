"use client";

import { useEffect, useRef } from "react";
import { bookmarkSvgMarkup } from "@/components/BookmarkIcon";

const SCALE_MIN = 0.55;
const SCALE_MAX = 1; // 1 = exactly the landed size, so arrival has no size jump
const ICON_W = 14;
const ICON_H = 24;
const DOCK_RIGHT = 20;
const STACK_GAP = 16; // horizontal spread between multiple far-away icons
// How much of the icon reads as "still planted in the ground" at its
// furthest — half-buried, then rises out (clip shrinks toward 0) the closer
// you scroll toward it, reaching 0 exactly on arrival.
const BURIED_MAX = 52;

type TrackedItem = {
  fb: HTMLElement;
  el: HTMLButtonElement;
  // Once true, el has been reparented into fb as a normal in-flow marker
  // and this loop stops repositioning it — from then on it scrolls with
  // the page like any other content, which is the whole point (a reader
  // asked for the bookmark to keep "coming up with the page" once it's
  // surfaced, not just vanish from a fixed corner).
  landed: boolean;
};

/**
 * Reads every [data-feedback-block] on the page. While one is still below
 * the viewport, its icon lives in the fixed bottom-right corner, growing
 * and rising out of a "buried" clip as you scroll closer — and physically
 * travels (via interpolated fixed left/top) from that corner toward the
 * block's own top-right corner as it does, so full size + full reveal + the
 * travel both complete at exactly the same moment, right as the block
 * reaches the bottom of the viewport. At that instant it's reparented in
 * place (position:absolute inside the block) with no jump, and continues
 * scrolling normally as ordinary page content from then on.
 */
export default function BookmarkDock() {
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    let items: TrackedItem[] = [];
    let raf = 0;

    // Reparents the icon into the block as a normal in-flow marker, at
    // exactly (right:0, top:1px) — the same point the travel animation
    // interpolates toward, so there's nothing to jump: by construction the
    // fixed-position frame right before this one already renders it here.
    function land(item: TrackedItem) {
      item.landed = true;
      const fb = item.fb;
      if (!fb.style.position) fb.style.position = "relative";
      if (!fb.style.paddingRight) fb.style.paddingRight = "20px";
      const el = item.el;
      el.style.transition = "none";
      el.style.transform = "none";
      el.style.clipPath = "none";
      el.style.position = "absolute";
      el.style.left = "auto";
      el.style.top = "1px";
      el.style.right = "0";
      el.style.width = `${ICON_W}px`;
      el.style.height = `${ICON_H}px`;
      fb.appendChild(el);
    }

    function update() {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const maxDist = Math.max(document.body.scrollHeight, 1);

      const active = items.filter((it) => !it.landed);
      const withMeta = active
        .map((it) => {
          const r = it.fb.getBoundingClientRect();
          return { it, top: r.top, right: r.right, dist: r.top - vh };
        })
        .sort((a, b) => a.dist - b.dist);

      withMeta.forEach(({ it, top, right, dist }, i) => {
        if (top < vh) {
          land(it);
          return;
        }

        const t = Math.min(dist / (maxDist * 0.35), 1); // 1 far -> 0 arriving
        const p = 1 - t; // 0 far -> 1 arriving
        const scale = SCALE_MIN + p * (SCALE_MAX - SCALE_MIN);
        const buried = t * BURIED_MAX;

        const startLeft = vw - DOCK_RIGHT - ICON_W - i * STACK_GAP;
        const startTop = vh - ICON_H;
        const endLeft = right - ICON_W;
        const endTop = top + 1;
        const left = startLeft + (endLeft - startLeft) * p;
        const elTop = startTop + (endTop - startTop) * p;

        const el = it.el;
        el.hidden = false;
        el.style.transition = "clip-path 0.15s ease";
        el.style.position = "fixed";
        el.style.width = `${ICON_W}px`;
        el.style.height = `${ICON_H}px`;
        el.style.left = `${left}px`;
        el.style.top = `${elTop}px`;
        el.style.transform = `scale(${scale.toFixed(2)})`;
        el.style.clipPath = `inset(0 0 ${buried.toFixed(1)}% 0)`;
      });
    }

    function onChange() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }

    // Rebuilds the tracked-item list from whatever [data-feedback-block]
    // elements exist right now, preserving already-landed items in place
    // (re-running from scratch would reset a landed marker back into the
    // fixed dock, which would look like it un-planted itself the moment a
    // second, unrelated bookmark got added elsewhere on the page).
    function rebuild() {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-feedback-block]"));
      const existingByFb = new Map(items.map((it) => [it.fb, it]));
      const nextFbs = new Set(nodes);
      for (const it of items) {
        if (!nextFbs.has(it.fb)) it.el.remove();
      }
      items = nodes.map((fb) => {
        const existing = existingByFb.get(fb);
        if (existing) return existing;
        const el = document.createElement("button");
        el.type = "button";
        el.className = "bookmark-dock-icon";
        el.innerHTML = bookmarkSvgMarkup(fb.dataset.color || "currentColor", Number(fb.dataset.variant || 0));
        el.addEventListener("click", () => {
          fb.scrollIntoView({ behavior: "smooth", block: "center" });
          fb.classList.add("bookmark-flash");
          window.setTimeout(() => fb.classList.remove("bookmark-flash"), 900);
        });
        dock!.appendChild(el);
        return { fb, el, landed: false };
      });
      update();
    }

    rebuild();

    const observer = new MutationObserver((mutations) => {
      const changed = mutations.some((m) => {
        if (m.type === "attributes") return true;
        return Array.from(m.addedNodes).some(
          (n) =>
            n instanceof HTMLElement &&
            (n.matches?.("[data-feedback-block]") || n.querySelector?.("[data-feedback-block]"))
        );
      });
      if (changed) rebuild();
    });
    // Both forms the reading-time annotation toolbar can use to mark a new
    // bookmark are covered: tagging an existing paragraph (attribute change)
    // or inserting a fresh marker node (childList change).
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-feedback-block"],
    });

    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
      cancelAnimationFrame(raf);
      for (const item of items) item.el.remove();
    };
  }, []);

  return <div ref={dockRef} className="bookmark-dock" aria-label="피드백 북마크" />;
}
