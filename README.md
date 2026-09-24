# Skies — Landing Page

The website for [Skies](https://chromewebstore.google.com/detail/gmjjpjccmmdnainbbgchlnkhmgckcmik), a world clock extension for Chrome. Live at [useskies.com](https://useskies.com).

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
- Analytics come from Umami Cloud (cookieless), through the script in `src/layouts/Base.astro`. `data-domains` limits tracking to `useskies.com`, so dev and preview visits aren't counted. Each Add to Chrome button sends an `add-to-chrome` event with a `location` of `nav`, `hero` or `cta`. If you change analytics, update the "This website" section of `/privacy`.
- "Always Use HTTPS" is on for the zone (SSL/TLS → Edge Certificates), so plain `http://` requests get a 301 to `https://`.
- [`public/_headers`](public/_headers) sets security headers, and long-lived caching for the hashed files in `/_astro/`.
- Pages are built as `privacy.html` and served at clean URLs (`/privacy`). Unknown paths get `404.html`.

## Structure

```text
src/
├── pages/            index, privacy, 404
├── layouts/Base.astro  <head>, meta and Open Graph tags, nav, footer
├── components/
│   ├── PopupDemo.astro  live popup demo: the visitor's zone as Base, plus a converter
│   ├── Features.astro
│   ├── Nav.astro
│   └── Footer.astro
├── lib/
│   ├── tz.ts         gap, UTC offset and sky logic, ported from the extension
│   └── links.ts      Chrome Web Store, feedback form, contact email
└── styles/global.scss  design tokens and shared styles
```

`src/lib/tz.ts` mirrors `src/core/tz.ts` in the extension. If the extension changes how it formats gaps or picks skies, update it here too.
