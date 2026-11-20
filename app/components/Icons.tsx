import type { CSSProperties } from "react";
const paths = {
  bag: (
    <>
      <path d="M4.5 7.5h15l.8 13h-16.6l.8-13Z" />
      <path d="M8.5 9V6a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.3" />
      <ellipse cx="12" cy="12" rx="3.5" ry="8.3" />
      <path d="M4 12h16" />
    </>
  ),
  menu: (
    <>
      <path d="M3 7h18M3 12h18M3 17h18" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  leaf: (
    <>
      <path d="M20 4C8 3 3 8 5 15c5 5 14 0 15-11ZM3 21l12-12" />
    </>
  ),
  drop: (
    <path d="M12 2c-1 5-7.2 10-7.2 14A7.2 7.2 0 0 0 19 16c0-4-5.5-9-7-14Z" />
  ),
  box: (
    <>
      <path d="m3 7 9-4 9 4v11l-9 4-9-4Zm0 0 9 4 9-4M12 11v11M7 5l10 4" />
    </>
  ),
  cash: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M5.5 12h1M17.5 12h1" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  pin: (
    <>
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  chevron: <path d="m6 10 6 6 6-6" />,
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: keyof typeof paths;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={name === "arrow" ? "directional" : ""}
    >
      {paths[name]}
    </svg>
  );
}
export function Sprig({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 54"
      aria-hidden="true"
      fill="none"
    >
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M7 49C17 35 29 25 41 7M15 39C8 36 7 29 6 25c7 3 11 7 9 14Zm7-9c-5-5-5-12-3-17 5 6 7 12 3 17Zm9-11c-2-6 0-12 4-17 2 7 2 12-4 17Zm1 1c7-6 13-6 17-5-4 5-10 8-17 5ZM19 35c6-5 13-6 18-5-4 5-12 8-18 5Z" />
      </g>
      <g fill="currentColor">
        <ellipse
          cx="28"
          cy="27"
          rx="3.3"
          ry="4.4"
          transform="rotate(-27 28 27)"
        />
        <ellipse
          cx="11"
          cy="43"
          rx="3.4"
          ry="4.8"
          transform="rotate(23 11 43)"
        />
      </g>
    </svg>
  );
}
