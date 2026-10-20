# Skies — Landing Page

The website for Skies, a world clock extension for [Chrome](https://chromewebstore.google.com/detail/gmjjpjccmmdnainbbgchlnkhmgckcmik) and [Firefox](https://addons.mozilla.org/firefox/addon/skies-world-clock/). Live at [useskies.com](https://useskies.com).

A static [Astro](https://astro.build) site with Sass, served by a Cloudflare Worker with static assets. The extension lives in its own repo (`skies-chrome-extension`).

## Commands

```bash
npm install
npm run dev          # Astro dev server at http://localhost:4321
npm run build        # static build to dist/
npm run check        # type-check .astro and .ts files
npm run preview:cf   # build, then serve dist/ the way Cloudflare will (routing, _headers, 404)
npm run deploy       # build and deploy from your machine (needs `npx wrangler login`)
```

## Deployment

Every push to `main` deploys to production. The `skies-lp` Worker in the Cloudflare dashboard is connected to this repo through Workers Builds, which runs `npx wrangler deploy`.

- [`wrangler.jsonc`](wrangler.jsonc) holds the Worker config. Its `build.command` runs `npm run build` before each deploy, so the dashboard needs no build command. The Worker `name` must match the dashboard's Worker name.
- The custom domain `useskies.com` is declared in `routes`, and Cloudflare manages its DNS record.
- `www.useskies.com` is not part of the Worker. It lives in the Cloudflare dashboard as a proxied placeholder DNS record (`A 192.0.2.1`) plus a Redirect Rule ("Redirect www to useskies.com") that sends a 301 to `https://useskies.com`, keeping the path and query string.
- Analytics come from Umami Cloud (cookieless), through the script in `src/layouts/Base.astro`. `data-domains` limits tracking to `useskies.com`, so dev and preview visits aren't counted. Every link to a store sends `add-to-chrome` or `add-to-firefox`, with a `location` of `nav`, `hero`, `cta` (the closing section of the home page) or `footer` (the footer's store links). The nav's Get Skies button, shown on Safari and phones, sends `get-skies`. Umami records each visitor's browser, so whether the store matching it was clicked is a filter in the dashboard. If you change analytics, update the "This website" section of `/privacy`.
- The install buttons put the visitor's own store first: Firefox first on Firefox, Chrome first everywhere else. An inline script in `Base.astro`'s `<head>` sets `<html data-browser="firefox|chromium|other">` before the first paint, and CSS picks what to show, so nothing moves.
- The "Notify me" form on `/pro` posts to Buttondown (account `uryu`, set in `src/lib/notify.ts`), which handles confirmation emails and unsubscribes. The submit button also sends a `pro-notify` Umami event. If the form moves to another service, update the "Email updates" section of `/privacy`.
- "Always Use HTTPS" is on for the zone (SSL/TLS → Edge Certificates), so plain `http://` requests get a 301 to `https://`.
- [`public/_headers`](public/_headers) sets security headers, and long-lived caching for the hashed files in `/_astro/`.
- Pages are built as `privacy.html` and served at clean URLs (`/privacy`). Unknown paths get `404.html`. `/tokushoho` is submitted to Stripe, so keep that URL fixed.

## Structure

```text
src/
├── pages/            index, pro, privacy, tokushoho (特定商取引法に基づく表記, Japanese), 404
├── layouts/Base.astro  <head>, meta and Open Graph tags, nav, footer
├── components/
│   ├── PopupDemo.astro  the popup, live: the visitor's zone as Base, DST banner and badges, converter, Core Time
│   ├── InstallButtons.astro  Chrome and Firefox buttons, the visitor's store first
│   ├── Features.astro  feature cards; each visual is a still of the extension's popup
│   ├── SkyCard.astro   one city card, marked up like the extension's, for the demo and the visuals
│   ├── Nav.astro
│   └── Footer.astro
├── lib/
│   ├── extension/    verbatim copies of the extension's tz, types, dst, dstCopy and coretime, plus the parts of model.ts they need
│   ├── coreTimeCopy.ts  the Core Time panel's wording, from the extension's CoreTimePanel.tsx
│   ├── tz.ts         card view (gap, UTC offset, date, sky), ported from the extension
│   ├── sun.ts        the sky from the sun's elevation, copied from the extension
│   ├── links.ts      Chrome Web Store, Firefox Add-ons, feedback form, contact email
│   └── notify.ts     where the /pro "Notify me" form posts
├── data/             zoneCoordinates.ts and zoneLinks.ts, copied from the extension (generated from tzdata)
└── styles/
    ├── global.scss   design tokens and shared styles
    ├── popup.scss    the extension's popup styles, scoped to .skies-popup
    └── extension/    verbatim copies of the extension's src/styles/*.scss
```

`src/lib/tz.ts` mirrors `src/core/tz.ts` in the extension. `src/lib/sun.ts`, `src/data/`, `src/lib/extension/` and `src/styles/extension/` are copies of the extension's (only import paths differ). When the extension changes its formatting, skies, DST or Core Time logic, popup styles or zone data, re-copy them; `src/lib/coreTimeCopy.ts` follows `renderConclusion()` in its CoreTimePanel.tsx by hand.
