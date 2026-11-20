"use client";
import settings from "@/client/settings.json";
import { useLang } from "@/lib/i18n";
import { useBackgroundFilm, FilmControl } from "./BackgroundFilm";
const posterPath = "/media/story-poster.webp";
const clipPath = "/media/story.mp4";
function BranchDivider() {
  return (
    <div
      className="branch-divider wrap"
      aria-hidden="true"
      data-reveal="branch"
    >
      <i />
      <svg
        width="90"
        height="38"
        viewBox="0 0 90 38"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          pathLength="1"
          d="M3 29Q39 31 83 7 M18 29Q14 20 6 17Q7 26 18 29 M28 28Q29 15 19 9Q18 20 28 28 M36 25Q43 36 53 33Q48 26 36 25 M46 22Q50 13 44 5Q40 14 46 22 M57 18Q68 26 76 21Q68 15 57 18 M67 14Q70 6 68 2Q62 7 67 14 M74 11Q82 12 87 4Q77 4 74 11"
        />
      </svg>
      <i />
    </div>
  );
}
export function Story() {
  const { lang } = useLang();
  const {root,video,scene,paused,control} = useBackgroundFilm(clipPath,posterPath);
  return (
    <>
      <BranchDivider />
      <section
        ref={root}
        id="our-story"
        className="story"
        data-scene={scene}
        data-paused={paused}
        aria-labelledby="story-title"
      >
        <div className="story-media" aria-hidden="true">
          <div className="story-wash" />
          <span className="story-ring" />
          <div className="story-poster" />
          <video
            ref={video}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            disablePictureInPicture
          />
          <div className="story-scrim" />
        </div>
        <div className="story-inner wrap">
          <div className="story-intro">
            <p className="eyebrow">
              <i />
              {settings.story.eyebrow[lang]}
            </p>
            <h2
              id="story-title"
              className="motion-heading"
              data-reveal="heading"
            >
              <span>{settings.story.headline[lang]}</span>
            </h2>
          </div>
          <ol className="chapters">
            {settings.story.chapters.map((chapter, i) => (
              <li key={i} data-reveal="chapter">
                <div>
                  <h3>{chapter.title[lang]}</h3>
                  <p>{chapter.body[lang]}</p>
                </div>
              </li>
            ))}
          </ol>
          <FilmControl {...control} />
        </div>
      </section>
    </>
  );
}
