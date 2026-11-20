"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { defaultLang, type Lang } from "./catalog";
import { dictionaries, pageCopy } from "./pages";
export { formatPrice } from "./catalog";
const Language = createContext({
  lang: defaultLang,
  change: (_lang: Lang) => {
    void _lang;
  },
});
function isLanguage(value: unknown): value is Lang {
  return value === "en" || value === "ar";
}
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const path = usePathname();
  const position = useRef<number | null>(null);
  const apply = useCallback((value: Lang, updateUrl: boolean) => {
    document.documentElement.lang = value;
    document.documentElement.dir = value === "ar" ? "rtl" : "ltr";
    if (updateUrl) {
      const url = new URL(location.href);
      url.searchParams.set("lang", value);
      history.replaceState(history.state, "", url);
    }
    setLang(value);
  }, []);
  const change = useCallback(
    (value: Lang) => {
      position.current = window.scrollY;
      try {
        localStorage.setItem("olivique-lang", value);
      } catch {}
      apply(value, true);
    },
    [apply],
  );
  useEffect(() => {
    function resolve() {
      const query = new URLSearchParams(location.search).get("lang");
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("olivique-lang");
      } catch {}
      if (isLanguage(query)) {
        try {
          localStorage.setItem("olivique-lang", query);
        } catch {}
        apply(query, false);
      } else if (isLanguage(saved)) apply(saved, false);
      else apply(defaultLang, false);
    }
    function sync(e: StorageEvent) {
      if (e.key === "olivique-lang")
        apply(isLanguage(e.newValue) ? e.newValue : defaultLang, true);
    }
    resolve();
    window.addEventListener("storage", sync);
    window.addEventListener("popstate", resolve);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("popstate", resolve);
    };
  }, [apply, path]);
  useLayoutEffect(() => {
    if (position.current !== null) {
      window.scrollTo({ top: position.current, behavior: "instant" });
      position.current = null;
    }
  }, [lang]);
  useEffect(() => {
    const { title, description } = pageCopy(path, lang);
    function syncMetadata() {
      if (document.title !== title) document.title = title;
      const meta = document.querySelector('meta[name="description"]');
      if (meta && meta.getAttribute("content") !== description)
        meta.setAttribute("content", description);
    }
    // App Router can finish reconciling server metadata after hydration.
    syncMetadata();
    const observer = new MutationObserver(syncMetadata);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["content"],
    });
    return () => observer.disconnect();
  }, [lang, path]);
  return (
    <Language.Provider value={{ lang, change }}>{children}</Language.Provider>
  );
}
export const useLang = () => useContext(Language);
export const useT = () => dictionaries[useLang().lang];
