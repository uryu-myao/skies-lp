## Project

Landing page for the Skies Chrome extension (useskies.com): a static Astro site with Sass, deployed as a Cloudflare Worker with static assets. See README.md for commands, deployment and structure.

- Pushing to `main` deploys to production through Cloudflare Workers Builds (`npx wrangler deploy`). `build.command` in `wrangler.jsonc` runs the Astro build first. Keep the Worker `name` as `skies-lp`.
- `src/lib/tz.ts` is a port of the extension's `src/core/tz.ts`. Keep the formatting (`−13h`, `+3:30h`, `UTC−04`, sky states) identical to the extension.
- Copy must describe only what the extension actually does. Check `../skies-chrome-extension` (README, `docs/spec-v2.md`) before claiming a feature. Pro features aren't shipped yet.
- Astro's HTML compression drops a line break between text and an inline tag (`text\n<a>` renders as `text<a>`). Keep them on one line, or add `{' '}`.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
