# Olivique

A bilingual, mobile-first Egyptian olive-oil store built with Next.js App Router, TypeScript and plain CSS. The catalog offers 1L for 500 EGP, 2L for 800 EGP and 5L for 2,000 EGP. Customers can choose a size on Home or Shop, edit the cart and check out with cash on delivery.

## Run locally

Use Node 22.13 or later. From this folder, run the following commands.

```sh
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open [the local store](http://127.0.0.1:3000). For a production preview, run `npm run build` followed by `npm run start -- --hostname 127.0.0.1`. The app uses Vercel’s standard Next.js runtime. All implementation and verification took place locally.

## Edit the store

| File | What it controls |
| --- | --- |
| `client/settings.json` | Product IDs, names, litres, prices, blurbs, image paths, brand and operator names, logo, social image, contact links, quantity limit, delivery fee, governorates, language and digits |
| `client/theme.css` | Colour palette |
| `content/en.ts`, `content/ar.ts` | Interface copy, FAQs and legal sections. TypeScript checks the Arabic dictionary against English. |
| `app/globals.css`, `app/layout.tsx` | Layout, typography and Google Fonts |
| `public/` | Original bottle illustrations, hero artwork, monogram and the 1200×630 starter social image |
| `lib/pages.ts` | Page titles and descriptions from the dictionaries, plus the shared legal update date |

To replace a product illustration, place the approved image in `public/` and set the product’s `image` to its root-relative path. A blank slot uses the supplied illustration. Keep product IDs stable for existing carts. The catalog calculates per-litre prices, savings and totals. A numeric delivery fee, including zero, participates in the total. With `null`, checkout shows the product total and explains that delivery will be confirmed with the order. Listing the 27 governorates in the selector makes no delivery coverage promise.

Blank contact channels stay hidden. Set `whatsappNumber` with the country code. The WhatsApp action opens a draft in the active language containing the items, quantities, line totals, subtotal and any supplied name or governorate. **The WhatsApp path does not write to the sheet.**

The configured default language is server-rendered. A first-paint script sets language and direction using the query parameter, saved preference and default, in that order. The hydrated app translates the content, title and description. Switching languages preserves the current route and updates the browser preference across tabs. Cart storage contains only product IDs and quantities. Delivery fields stay in memory while the form is open.

## Connect the client’s Google Sheet

1. Create a client-owned Google spreadsheet and name a tab **Orders**. Put these headings in row 1, one per column, in this order.

   ```text
   Received at | Order ref | Language | Name | Phone | Governorate | Address | Notes | Items | Subtotal (EGP) | Delivery fee (EGP) | Status
   ```

2. In Apps Script, paste `integrations/google-sheets/Code.gs`. In **Project Settings → Script Properties**, set `SHEET_ID` to the spreadsheet ID and `ORDER_TOKEN` to a long random secret.
3. Deploy the script as a web app executing as the **client-owned owner**. Choose access that allows the website server to call the endpoint without an interactive Google sign-in. The script checks the shared token before writing.
4. Copy `.env.example` to `.env.local`. Set `GOOGLE_SCRIPT_URL` to the deployment URL ending in `/exec`, `GOOGLE_SCRIPT_TOKEN` to the same secret and `SITE_URL` to the production HTTPS origin. Keep the token in server environment settings.
5. Set the same variables in the client’s hosting environment when preparing their release. Rebuild after changing public settings, the production domain or preview environment. Restart the local server after editing its environment.

Only a successful acknowledgement from Apps Script produces a 201 receipt and clears the cart. If acknowledgement fails or times out, check the sheet for the original order before retrying. A script can finish writing even if its response is lost.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The route tests mock outbound fetch and cover input limits, origin, the honeypot, Egyptian phone normalization, validation, duplicate items, server-calculated prices, acknowledgement, failure and timeout. They also check catalog recovery, bilingual WhatsApp text and SEO configuration.

Real Chrome checks exercise English and Arabic at **360, 390, 430, 768 and 1280px**. They cover browsing, adding, editing and removing items, reload persistence, checkout validation and focus, half-filled forms, cross-tab language changes, drawer keyboard behaviour, reduced motion, mobile controls, both delivery-fee modes, both WhatsApp drafts, missing configuration, failed saves, timeouts, success receipts, asset loading, deep links, overflow and the custom 404.

To repeat the Chrome suite with the original catalog, first build the app. Provide a local Chrome executable in `CHROME_BIN` and the absolute path to an installed `playwright-core/index.mjs` in `OLIVIQUE_PLAYWRIGHT`. Run `npm run test:browser`. The test runner creates an isolated copy with a sample contact number and delivery fee, starts loopback servers and intercepts the Apps Script request inside its fixture process. The production route has no mock switch.

Browser checks use emulated viewports. Physical devices, Safari, Firefox, WhatsApp message delivery and the client’s live Google account were outside this verification. No live sheet order was sent. A clearly labelled live TEST order requires client approval.

## Client handoff

### Home story, footage and motion

Edit `story` in `client/settings.json` for the bilingual eyebrow, headline and three chapters. The supplied copy is marked `placeholderCopy: true` for client review. The section follows the product collection and links to Our Oil.

Replace `public/media/story.mp4` and `public/media/story-poster.webp` together. A poster from the opening frame makes the transition to playback unobtrusive. Use a 10–15 second loop, H.264, at most 720p, with no audio. These commands encode a prepared loop and extract its poster. Check the final file size against the 2.5 MB budget.

```sh
ffmpeg -i approved-press-loop.mov -t 13 -an -vf "scale=-2:'min(720,ih)',fps=25" -c:v libx264 -pix_fmt yuv420p -crf 24 -maxrate 1350k -bufsize 1500k -movflags +faststart story.mp4
ffmpeg -i story.mp4 -frames:v 1 -c:v libwebp -quality 76 story-poster.webp
```

**Current footage.** Gianpiero Ferraro filmed the small wooden olive press. The local edit slows the original 50 fps footage, blends the loop boundary and removes its audio. The encoded file is 13 seconds, 1280×720, 25 fps and 1,699,536 bytes. The matching poster is 27,906 bytes. Record the creator, source, licence and edits for every replacement. Have the client review any footage depicting someone else’s press before launch. [Original Pexels footage](https://www.pexels.com/video/close-up-of-small-wooden-olive-press-10621732/) · [Pexels licence](https://www.pexels.com/license/)

All switches live under `motion` in `client/settings.json`. Rebuild after editing.

| Set to false | Effect |
| --- | --- |
| `enabled` | Switch off motion throughout the store and use the still story background |
| `intro`, `heroReveal`, `bottleFloat` | Switch off the session entry, hero reveal or floating bottle individually |
| `scrollReveals`, `branchDivider`, `storyChapters` | Switch off general reveals, the drawn divider or chapter motion |
| `cardHover`, `addFeedback`, `flyToCart`, `drawer` | Switch off card lift, animated add feedback, the travelling dot or drawer motion |
| `storyBackground` | Use the poster and disable ambient background motion |

The entry uses the session key `olivique-home-entry`. A fresh tab with a new page session can show it again. Hero controls remain available through the overlay. Reduced-motion and data-saving visitors get a still background. A blocked or missing video uses the poster. An unavailable poster uses the CSS background. The pause choice lasts for the current Home visit, including language changes and scrolling away and back.

### Motion verification

The production Chrome suite exercises both languages at all five widths with 4× CPU throttling. It checks first and repeat visits, tap and keyboard dismissal, language changes, off-screen pausing, the local H.264 file, pause persistence, chapter reveals, cart feedback and overflow. It simulates missing media, blocked autoplay, data saver and both 2G connection types. Additional local checks confirmed a genuine back/forward-cache restoration, staggered drawer rows, desktop cart arcs, denied session storage and readable content when the observer never calls back. The entry’s CSS sequence lasts 1.2 seconds.

Before the storefront layout was enlarged, the hero image remained the LCP element on all ten cold loads. Story dimensions stayed stable, and measured CLS during video playback was zero at every width. Cold-load CLS was zero in English and Arabic at 360, 390 and 430px. At 768px it was 0.00005 in English and 0.02607 in Arabic. At 1280px it was 0.00030 and 0.03160. Desktop traces show residual movement during webfont loading and the existing English-to-Arabic hydration step. The original 768px Arabic baseline was 0.30147.

These measurements cover desktop Chrome with emulated phone viewports and CPU throttling. Physical low-end Android performance and actual iOS Low Power Mode remain unverified.

### Storefront layout verification

The enlarged Home layout was checked in Chrome at 360, 390, 430, 768, 1280 and 1920 pixels in English and Arabic. Checks covered horizontal overflow, headline clipping, mobile ordering controls, size selection, the cart drawer, the ordering guide and reduced motion. Responsive sizing and the button, gallery and footer effects live in app/storefront.css.

### Remaining launch inputs

Still needed for launch are the approved logo, product photos, Our Oil copy, WhatsApp number and any other public contact links, client-owned Sheet and Apps Script deployment, delivery fee and coverage areas, delivery times, returns and cancellation policy, operator legal name, production domain and approved social image. Confirm **أوليفيك** as the Arabic brand spelling. The supplied social artwork is available for approval or replacement.

Have the client and their legal adviser review the Privacy and Terms pages, including retention, contact and rights requests, governing law, warranties and liability. Replace the operator placeholders and supply the business policies before public launch.


The homepage hero uses a separate silent 1600×900 dining-table sequence with a matching WebP still. Replace `public/media/hero.mp4` and `public/media/hero-poster.webp` together. The hero and story share playback safeguards and bilingual pause controls. Dario Fernandez Ruz filmed the olive-oil pour over tomato toast. The local edit trims, scales and removes sound. [Original footage](https://www.pexels.com/video/close-up-view-of-a-person-pouring-olive-oil-on-his-toasted-bread-6857392/) · [Pexels licence](https://www.pexels.com/license/)
