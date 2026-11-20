import settings from "@/client/settings.json";
export const motion = settings.motion;
export type Effect = Exclude<keyof typeof motion, "enabled">;
export const motionTokens = Object.entries(motion)
  .filter(([key, on]) => key !== "enabled" && motion.enabled && on)
  .map(([key]) => key)
  .join(" ");
export const reducedMotion = "(prefers-reduced-motion: reduce)";
export function permits(effect: Effect) {
  return (
    motion.enabled &&
    motion[effect] &&
    !window.matchMedia(reducedMotion).matches
  );
}

// All reveals, the chapter steps and precise video visibility share one observer.
type Listener = (entry: IntersectionObserverEntry) => void;
const listeners = new Map<Element, Set<Listener>>();
let observer: IntersectionObserver | undefined;
export function observeInView(element: Element, callback: Listener) {
  if (!observer)
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries)
        listeners.get(entry.target)?.forEach((fn) => fn(entry));
    });
  let set = listeners.get(element);
  if (!set) {
    set = new Set();
    listeners.set(element, set);
    observer.observe(element);
  }
  set.add(callback);
  return () => {
    const current = listeners.get(element);
    current?.delete(callback);
    if (!current?.size) {
      listeners.delete(element);
      observer?.unobserve(element);
    }
    if (!listeners.size) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}
export function flyToCart(button: HTMLButtonElement) {
  if (!permits("flyToCart") || !Element.prototype.animate) return;
  requestAnimationFrame(() => {
    if (!button.isConnected || !permits("flyToCart")) return;
    const inFrame = (r: DOMRect) =>
      r.width > 0 &&
      r.height > 0 &&
      r.y + r.height / 2 >= 0 &&
      r.y + r.height / 2 <= innerHeight &&
      r.x + r.width / 2 >= 0 &&
      r.x + r.width / 2 <= innerWidth;
    const start = button.getBoundingClientRect();
    if (!inFrame(start)) return;
    const target = [".sticky-bar .mobile-count", ".cart-trigger .badge"]
      .map((selector) =>
        document.querySelector(selector)?.getBoundingClientRect(),
      )
      .find((r) => r && inFrame(r));
    if (!target) return;
    const x = start.x + start.width / 2,
      y = start.y + start.height / 2;
    const direction = document.documentElement.dir === "rtl" ? -1 : 1;
    const dx = (target.x + target.width / 2 - x) * direction,
      dy = target.y + target.height / 2 - y;
    const dot = document.createElement("i");
    dot.className = "cart-flight";
    dot.setAttribute("aria-hidden", "true");
    dot.style.insetInlineStart =
      (direction === 1 ? x - 4 : document.documentElement.clientWidth - x - 4) +
      "px";
    dot.style.insetBlockStart = y - 4 + "px";
    document.body.append(dot);
    const frames = Array.from({ length: 13 }, (_, i) => {
      const p = i / 12;
      return {
        transform:
          "translate(calc(var(--dir) * " +
          dx * p +
          "px), " +
          (dy * p - 40 * 4 * p * (1 - p)) +
          "px) scale(" +
          (1 - 0.5 * p) +
          ")",
      };
    });
    const animation = dot.animate(frames, {
      duration: 420,
      easing: "cubic-bezier(.2,.5,.55,1)",
    });
    const preference = matchMedia(reducedMotion);
    const cancel = () => animation.cancel();
    preference.addEventListener("change", cancel);
    animation.finished
      .catch(() => {})
      .finally(() => {
        dot.remove();
        preference.removeEventListener("change", cancel);
      });
  });
}
