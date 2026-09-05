"use client";

import { useEffect, useRef } from "react";

const BOOKMARK_SVG =
  '<svg viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M2 0h20a2 2 0 0 1 2 2v28l-12-8-12 8V2a2 2 0 0 1 2-2Z"/></svg>';

const SCALE_MIN = 0.6;
const SCALE_MAX = 1.5;
const GAP_MIN = 1;
const GAP_MAX = 12;

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

    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-feedback-block]"));
    if (nodes.length === 0) return;

    const items: TrackedItem[] = nodes.map((fb) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "bookmark-dock-icon";
      el.style.color = fb.dataset.color || "currentColor";
      el.innerHTML = BOOKMARK_SVG;
      el.addEventListener("click", () => {
        fb.scrollIntoView({ behavior: "smooth", block: "center" });
        fb.classList.add("bookmark-flash");
        window.setTimeout(() => fb.classList.remove("bookmark-flash"), 900);
      });
      return { fb, el, dist: 0 };
    });

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

    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);
    update();

    return () => {
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
      cancelAnimationFrame(raf);
      for (const item of items) item.el.remove();
    };
  }, []);

  return <div ref={dockRef} className="bookmark-dock" aria-label="피드백 북마크" />;
}
