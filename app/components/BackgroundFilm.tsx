"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { observeInView, reducedMotion, motion } from "@/lib/motion";

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };
type Scene = "waiting" | "video" | "poster" | "gradient";

export function useBackgroundFilm(clipPath: string, posterPath: string) {
  const t = useT();
  const root = useRef<HTMLElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const [scene, setScene] = useState<Scene>("waiting"),
    [paused, setPaused] = useState(false);
  const preference = useRef(false),
    sync = useRef<() => void>(() => {});
  useEffect(() => {
    const section = root.current,
      player = video.current;
    if (!section || !player || !("IntersectionObserver" in window)) return;
    const mq = matchMedia(reducedMotion);
    const connection = (navigator as Navigator & { connection?: Connection })
      .connection;
    let disposed = false,
      near = false,
      visible = false,
      posterReady = false,
      posterFailed = false,
      videoFailed = false,
      blocked = false,
      requested = false,
      pending = false;
    let poster: HTMLImageElement | undefined;
    const restricted = () =>
      !motion.enabled ||
      !motion.storyBackground ||
      mq.matches ||
      !!connection?.saveData ||
      /^(slow-)?2g$/.test(connection?.effectiveType || "");
    function update() {
      if (disposed || !section || !player) return;
      const still = restricted();
      const onScreen = visible && !document.hidden;
      const canPlay =
        onScreen &&
        !preference.current &&
        !still &&
        !blocked &&
        !posterFailed &&
        !videoFailed;
      section.dataset.ambient = String(
        onScreen && !preference.current && !still && !blocked,
      );
      if (!canPlay) player.pause();
      if (near && !poster && !posterFailed) {
        poster = new Image();
        poster.onload = () => {
          if (disposed) return;
          posterReady = true;
          section.style.setProperty(
            "--story-image",
            'url("' + posterPath + '")',
          );
          player.poster = posterPath;
          update();
        };
        poster.onerror = () => {
          posterFailed = true;
          update();
        };
        poster.src = posterPath;
      }
      if (posterFailed) {
        setScene(still ? "poster" : "gradient");
        return;
      }
      if (!posterReady) return;
      if (still || blocked || videoFailed) {
        setScene("poster");
        return;
      }
      if (near && !requested && !preference.current) {
        requested = true;
        player.muted = true;
        player.src = clipPath;
      }
      if (preference.current) setScene("video");
      if (!requested) return;
      if (!canPlay || !player.paused || pending) return;
      pending = true;
      player
        .play()
        .then(() => {
          pending = false;
          if (!disposed) update();
        })
        .catch((error: DOMException) => {
          pending = false;
          if (disposed) return;
          if (error.name !== "AbortError") {
            blocked = true;
            setScene("poster");
          } else if (visible && !preference.current && !document.hidden)
            update();
        });
    }
    const playing = () => {
      if (!disposed) setScene("video");
    };
    const error = () => {
      videoFailed = true;
      update();
    };
    const networkChange = () => {
      if (restricted() && requested) {
        requested = false;
        player.pause();
        player.removeAttribute("src");
        player.load();
      }
      update();
    };
    player.addEventListener("playing", playing);
    player.addEventListener("error", error);
    mq.addEventListener("change", networkChange);
    connection?.addEventListener("change", networkChange);
    document.addEventListener("visibilitychange", update);
    const proximity = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        update();
      },
      { rootMargin: "240px 0px" },
    );
    proximity.observe(section);
    const stop = observeInView(section, (entry) => {
      visible = entry.isIntersecting;
      update();
    });
    sync.current = update;
    return () => {
      disposed = true;
      sync.current = () => {};
      stop();
      proximity.disconnect();
      player.pause();
      if (poster) {
        poster.onload = null;
        poster.onerror = null;
      }
      player.removeEventListener("playing", playing);
      player.removeEventListener("error", error);
      mq.removeEventListener("change", networkChange);
      connection?.removeEventListener("change", networkChange);
      document.removeEventListener("visibilitychange", update);
    };
  }, [clipPath, posterPath]);
  const controllable = scene === "video" || scene === "gradient";
  const controlText = controllable
    ? paused
      ? t.playStory
      : t.pauseStory
    : t.stillStory;
  const toggle = () => {
    preference.current = !preference.current;
    setPaused(preference.current);
    sync.current();
  };
  return {
    root,
    video,
    scene,
    paused,
    control: { controllable, paused, controlText, toggle },
  };
}

export function FilmControl({
  controllable,
  paused,
  controlText,
  toggle,
}: ReturnType<typeof useBackgroundFilm>["control"]) {
  return (
    <button
      type="button"
      className="story-toggle"
      disabled={!controllable}
      aria-label={controlText}
      onClick={toggle}
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        {!controllable ? (
          <circle cx="8" cy="8" r="2.5" />
        ) : paused ? (
          <path d="M4 2.5v11L13 8z" />
        ) : (
          <path d="M4 3h2.5v10H4zm5.5 0H12v10H9.5z" />
        )}
      </svg>
      {controlText}
    </button>
  );
}
