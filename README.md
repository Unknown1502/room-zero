# ROOM ZERO: THE UNRETURNED LETTER

An original, seated, hands-only VR puzzle-adventure for Meta Quest 3 and 3S, built on the Meta Immersive Web SDK (IWSDK 1.1.0), Three.js, TypeScript and WebXR.

> **Hosted build:** https://unknown1502.github.io/room-zero/ (needs the Meta Quest Browser to play; on a desktop it only shows the title page).
>
> **Status: playable graybox chapter, validated in a desktop emulator only.** The whole first chapter (11 rooms, 6 seams, the Surveyor, the letter) is implemented with procedural placeholder art and generated placeholder audio. It has been exercised in IWER (the browser XR emulator), not on a Quest and not by a person. It is **not release-ready**; the open items are in `docs/07-delivery/known-limitations.md`.

The working title is provisional. No name or trademark clearance has been done (see `docs/07-delivery/unresolved-questions.md`, Q-20).

## The game in one paragraph

You are a tiny night courier in an enormous boarding house whose rooms are separate sections hung in a void. You hold a letter addressed to **Room 0**, a room that no longer exists. By gripping small brass fittings at the seams between rooms, you slide and turn whole sections of the house until their doorways meet. Every connection you make or break rewrites one graph of rooms and doorways. That same graph is the only map the **Surveyor** has: a tall plaster caretaker whose head is an incomplete brass ring, and who is compelled to walk to every new joint in the house and measure it.

**The player changes the house. The house changes the game.**

## Run it

Requirements: Node 20.19+, 22.12+ or 24+.

```bash
npm install
npm run dev:runtime          # plain Vite dev server (no emulator control)
npx iwsdk dev up --headless --allow-browser-automation   # dev server + managed emulator browser, used by the runtime tests
npm run build                # static production build into dist/ (served from /room-zero/)
npm run preview              # serve the production build locally
```

On a Quest, open the HTTPS URL of the build in the Quest Browser and press **Enter VR**. WebXR needs a secure context; `localhost` and HTTPS hosts qualify. The build has no emulator code and makes no request to another origin.

## Check it

| Command | What it runs | Evidence level |
|---|---|---|
| `npm run typecheck` | `tsc --noEmit` | Automated |
| `npm test` | Unit tests of the pure rules (house graph, Surveyor, session, save, navigation) | Automated-tested |
| `npm run test:content` | Model checks of the authored chapter (all 288 configurations, reach envelope, reference solution) | Automated-tested |
| `npm run test:rules` | Layer rules (domain imports no Three.js, IWSDK or DOM) | Automated |
| `node tools/rt/run-rt.mjs [RT-xx ...]` | The 24 runtime tests of `docs/05-quality/interaction-test-matrix.md` against the live emulator session | IWER-verified |
| `node tools/rt/perf.mjs <label>` | Emulator performance sampling | IWER desktop only, not Quest performance |
| `node tools/bundle-report.mjs <label>` | Bundle composition report | Automated |
| `node tools/rt/playthroughs.mjs 3` | Three fresh-profile, hands-only, full-chapter runs | IWER-verified |
| `node tools/rt/record.mjs <name>` then `node tools/make-trailer.mjs <name>` | One real full-chapter run recorded from the game canvas, and a trailer cut from it (needs ffmpeg) | Footage is the emulator, silent |

Results are written up in `docs/05-quality/runtime-test-results.md` (RT matrix: 24 of 24 pass in the emulator), `docs/05-quality/validation-findings.md` (defects found and fixed, repeat-run counts), `docs/05-quality/performance-report.md` and `docs/07-delivery/judging-readiness-audit.md`.

Recordings and stills (real emulator footage, silent): `artifacts/recordings/` (raw `take4.webm`, `take7.webm`, the 168 s `ROOM-ZERO-trailer.mp4` and its cut list) and `artifacts/screenshots/`.

## Where to start reading

| If you want | Read |
|---|---|
| The whole thing in ten minutes | `docs/00-product/vision.md`, then `docs/01-game-design/first-chapter.md` |
| What we are building and for whom | `docs/00-product/product-brief.md` (PRD) |
| How it plays | `docs/01-game-design/game-design-document.md` (GDD) |
| What must be true to ship | `docs/04-engineering/software-requirements.md` (SRS) |
| How it is built | `docs/04-engineering/technical-architecture.md` and `architecture-diagrams.md` |
| What we verified about the SDK | `docs/04-engineering/iwsdk-verification.md` |
| What was run, and what was not | `docs/05-quality/runtime-test-results.md`, `docs/07-delivery/known-limitations.md` |
| What could go wrong | `docs/05-quality/risk-register.md` |
| What is still undecided | `docs/07-delivery/unresolved-questions.md` |

The full index is in `docs/README.md`. The generator's own starter README is preserved at `docs/04-engineering/generated-starter-readme.md`.

## Evidence labels

Every status claim about this project uses one of these labels and never a stronger one than the evidence supports.

| Label | Meaning |
|---|---|
| Specified | Written in the documentation only |
| Implemented | Present in source code |
| Automated-tested | Covered by a passing automated test |
| IWER-verified | Exercised in the browser emulator |
| Human-tested | Played by a person |
| Quest-tested | Run on physical Quest hardware |

An IWER result is never reported as a Quest result. **Human-tested and Quest-tested are both empty today.** Audio has been generated and checked by program, not listened to by a person; treat it as unverified.

## Layout

| Path | Purpose |
|---|---|
| `src/domain`, `src/content` | Pure TypeScript rules and authored chapter data. Imports nothing from Three.js, IWSDK or the DOM. |
| `src/persistence` | Versioned, validated save and settings |
| `src/app`, `src/systems` | Game director, navigation, input adapters and IWSDK systems |
| `src/world` | Procedural presentation kit, rooms, stations, the Surveyor figure |
| `public/audio` | Generated placeholder sounds (`tools/make-audio.mjs`) |
| `tests`, `tools` | Unit and model tests, runtime test harness (`tools/rt`), report tools |
| `docs` | The documentation contract and the validation write-ups |

## Rules that still hold

1. The gameplay domain imports nothing from Three.js, IWSDK or the DOM.
2. The house graph is the only authority on which rooms are connected. Rendering reads it and never decides it.
3. Any SDK API not listed as verified in `iwsdk-verification.md` is checked against the installed declarations before use.
4. This project is independent of BREACH. It shares no code, repository or assets with it.
