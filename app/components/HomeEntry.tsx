"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import settings from "@/client/settings.json";
import { permits, reducedMotion } from "@/lib/motion";
const sessionKey = "olivique-home-entry";
let visitedInDocument = false;
export function HomeEntry({
  hero,
}: {
  hero: RefObject<HTMLElement | null>;
}) {
  const [show, setShow] = useState(false);
  const finishRef = useRef<() => void>(() => {});
  useEffect(() => {
    const element = hero.current;
    if (!element) return;
    let stopped = false,
      active = false,
      frame = 0,
      timer = 0;
    const media = matchMedia(reducedMotion);
    const controller = new AbortController();
    const { signal } = controller;
    function finish() {
      if (stopped) return;
      stopped = true;
      controller.abort();
      setShow(false);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      if (!media.matches && element) {
        if (permits("heroReveal"))
          element.dataset.heroReveal = active ? "full" : "short";
      }
    }
    finishRef.current = finish;
    // Give the original LCP image its own paint before starting optional motion.
    const picture = element.querySelector("img");
    const schedule = () => {
      if (stopped) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (stopped) return;
          const navigation = performance.getEntriesByType("navigation")[0] as
            PerformanceNavigationTiming | undefined;
          let eligible =
            permits("intro") &&
            !visitedInDocument &&
            navigation?.type !== "back_forward" &&
            !location.hash &&
            !document.hidden &&
            scrollY < 8;
          try {
            if (sessionStorage.getItem(sessionKey)) eligible = false;
            sessionStorage.setItem(sessionKey, "1");
          } catch {
            eligible = false;
          }
          visitedInDocument = true;
          if (!eligible) {
            finish();
            return;
          }
          active = true;
          setShow(true);
          timer = window.setTimeout(finish, 1230);
        });
      });
    };
    const interacted = () => {
      active = false;
      visitedInDocument = true;
      try {
        sessionStorage.setItem(sessionKey, "1");
      } catch {}
      finish();
    };
    const pageshow = (event: PageTransitionEvent) => {
      if (event.persisted) interacted();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === "olivique-lang") interacted();
    };
    const visibility = () => {
      if (document.hidden) interacted();
    };
    const inputs = [
      "pointerdown",
      "click",
      "keydown",
      "focusin",
      "wheel",
      "touchstart",
    ] as const;
    inputs.forEach((type) =>
      window.addEventListener(type, interacted, {
        capture: true,
        passive: true,
        signal,
      }),
    );
    window.addEventListener("pagehide", interacted, { signal });
    window.addEventListener("pageshow", pageshow, { signal });
    window.addEventListener("storage", storage, { signal });
    document.addEventListener("visibilitychange", visibility, { signal });
    media.addEventListener("change", interacted, { signal });
    if (picture?.decode) picture.decode().then(schedule, schedule);
    else schedule();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      controller.abort();
    };
  }, [hero]);
  return show ? (
    <div
      className="entry-overlay"
      inert
      aria-hidden="true"
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) finishRef.current();
      }}
    >
      <div className="entry-lockup" dir="ltr" lang="en">
        <div className="entry-word">
          {Array.from(settings.brand.en).map((c, i, a) => (
            <span
              key={i}
              style={
                {
                  "--spread": (i - (a.length - 1) / 2) * 0.085 + "em",
                } as React.CSSProperties
              }
            >
              {c}
            </span>
          ))}
        </div>
        <div className="entry-rule" />
        <svg
          className="entry-pour"
          width="68"
          height="50"
          viewBox="0 0 68 50"
          fill="none"
        >
          <path
            className="entry-drop"
            d="M34 6c-1.8 5-5 8.1-5 11.3a5 5 0 0 0 10 0C39 14.1 35.8 11 34 6Z"
            fill="currentColor"
          />
          <ellipse
            className="entry-ripple"
            cx="34"
            cy="41"
            rx="17"
            ry="3.5"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      </div>
    </div>
  ) : null;
}
