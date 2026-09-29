"use client";

import { useEffect, useRef } from "react";
import { bookmarkSvgMarkup } from "@/components/BookmarkIcon";

const SCALE_MIN = 0.6;
const SCALE_MAX = 1.5;
const GAP_MIN = 1;
const GAP_MAX = 12;
// How much of the icon reads as "still planted in the ground" at its
// furthest — half-buried, then rises out (clip shrinks toward 0) the closer
// you scroll toward it. Fully unearthed right as it's about to scroll into
// view, at which point it disappears from the dock — the in-place margin
// icon next to that paragraph (see AnnotationToolbar) is the "pulled
// bookmark" left sitting there.
const BURIED_MAX = 52;

type TrackedItem = { fb: HTMLElement; el: HTMLButtonElement; dist: number };

/**
 * Reads every [data-feedback-block] on the page and shows a shrinking-toward-
 * the-right row of bookmark icons for the ones still below the viewport.
 * Ported from the vanilla-JS prototype validated earlier — see process-book
 * spec doc for the algorithm this mirrors (closest = biggest = leftmost).
 */
export default function BookmarkDock() {
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    let items: TrackedItem[] = [];
    let raf = 0;

    function update() {
      const vh = window.innerHeight;
      const upcoming: TrackedItem[] = [];

      for (const item of items) {
        const r = item.fb.getBoundingClientRect();
        if (r.top >= vh) {
          item.el.hidden = false;
          item.dist = r.top - vh;
          upcoming.push(item);
        } else {
          item.el.hidden = true;
        }
      }

      upcoming.sort((a, b) => a.dist - b.dist);

      const maxDist = Math.max(document.body.scrollHeight, 1);
      upcoming.forEach((item, i) => {
        const t = Math.min(item.dist / (maxDist * 0.35), 1);
        const scale = SCALE_MAX - t * (SCALE_MAX - SCALE_MIN);
        item.el.style.transform = `scale(${scale.toFixed(2)})`;
        const buried = t * BURIED_MAX;
        item.el.style.clipPath = `inset(0 0 ${buried.toFixed(1)}% 0)`;
        const ratio = Math.pow((scale - SCALE_MIN) / (SCALE_MAX - SCALE_MIN), 1.8);
        item.el.style.marginRight = `${(GAP_MIN + ratio * (GAP_MAX - GAP_MIN)).toFixed(1)}px`;
        dock!.appendChild(item.el);
        if (i === upcoming.length - 1) item.el.style.marginRight = "0px";
      });
    }

    function onChange() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }

    // Rebuilds the tracked-item list from whatever [data-feedback-block]
    // elements exist right now. Re-run whenever one is added at runtime (the
    // reading-time annotation toolbar tags a paragraph the same way a
    // ```feedback block already does), not just once at mount — otherwise a
    // bookmark placed after this component mounted would never show up here.
    function rebuild() {
      for (const item of items) item.el.remove();
      const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-feedback-block]"));
      items = nodes.map((fb) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "bookmark-dock-icon";
        el.innerHTML = bookmarkSvgMarkup(fb.dataset.color || "currentColor", Number(fb.dataset.variant || 0));
        el.addEventListener("click", () => {
          fb.scrollIntoView({ behavior: "smooth", block: "center" });
          fb.classList.add("bookmark-flash");
          window.setTimeout(() => fb.classList.remove("bookmark-flash"), 900);
        });
        return { fb, el, dist: 0 };
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
