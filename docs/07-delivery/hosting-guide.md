# Hosting the production build (free, HTTPS)

Status: **HOSTED on 2026-11-18 with the user's explicit authorization:** https://unknown1502.github.io/room-zero/ (GitHub Pages, branch `gh-pages` of `Unknown1502/room-zero`, the contents of `dist/` plus `.nojekyll`). To update it: `npm run build`, then push the contents of `dist/` to `gh-pages` again. Desktop check: `qa/hosting/hosted-check.json` (0 errors, same-origin only). **Not yet opened in the Quest Browser.** The rest of this page is the general procedure and the alternatives. WebXR on the Quest Browser needs a secure context, so the host must serve HTTPS (all the options below do).

## What is ready

- `npm run build` writes a static site to `dist/` with relative paths (`base: './'`), so it works from a site root or a sub-folder, with no server code and no environment variables or keys in the bundle.
- The build has no emulator or development-hook code (checked by RT-23 on every full run); it makes no request to another origin.
- `public/_headers` (copied into `dist/`) sets long caching for the hashed `/assets/*` and a day for `/audio/*`. Netlify and Cloudflare Pages read it; GitHub Pages ignores it harmlessly.
- Local check: `node tools/serve-dist.mjs 4173` serves `dist/` on `http://127.0.0.1:4173/` (loopback only).

## Options (all free)

| Host | Steps | Notes |
|---|---|---|
| Cloudflare Pages | Create a Pages project, "Direct upload", upload the contents of `dist/` | HTTPS and a `*.pages.dev` URL. Reads `_headers`. |
| Netlify | Drag the `dist/` folder onto app.netlify.com/drop | HTTPS and a `*.netlify.app` URL. Reads `_headers`. |
| GitHub Pages | Push the contents of `dist/` to a repository's Pages branch | Needs a repository, which this project does not have (it is not a Git repository and none was created). |

## After uploading (to be done by you or after you authorise it)

1. Open the public URL on a desktop: the page should say it needs a VR headset browser, with no console errors.
2. Open it in the Quest Browser, press Enter VR, begin, hop to the first lamp, move the first seam.
3. Check that `audio/*.wav` and `assets/*.js` return 200 (browser network panel), and that the URL needs no login.
4. Put the URL in the Devpost form. Do not use a `localhost` address.

I did not choose a provider or create an account for you.
