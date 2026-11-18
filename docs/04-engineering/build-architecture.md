# Build architecture

Project layout, tooling, build and deployment. The layout follows what the official generator actually produced on 2026-11-16 (`iwsdk-verification.md` section 2), not the tree proposed in the brief.

## 1. Creating the project (M0)

1. In `room-zero/`, run the official generator: `npm create @iwsdk@latest .` choosing virtual reality, TypeScript, grabbing on, locomotion off, physics off. The generator accepts flags for these and a `--force` flag for a directory that is not empty.
2. The directory already contains `docs/` and `README.md`. The generator writes its own `README.md`; keep ours and move the generator's notes into `docs/04-engineering/` if useful.
3. Record the versions from the new lockfile in `iwsdk-verification.md` (REQ-PLAT-003).
4. Review what the generator added besides the app: agent and editor configuration folders, a reference-search package, and a headset command-line tool that reports usage data by its own notice. Decide what to keep (Q-17).
5. Run the type check and the dev server unchanged, and confirm the starter enters XR under IWER before changing anything.

Until step 5 passes, no application code is written.

## 2. Project structure

```
room-zero/
  docs/                          this documentation
  public/
    scenes/
      chapter-one.iwsdk.scene.json   composition and component data only
    ui/                          *.uikitml for the two cards, if UIKitML is used
    audio/                       sound files
    models/                      glTF kit parts and the Surveyor (from M6)
    textures/                    KTX2 textures and lightmaps (from M6)
  src/
    index.ts                     World.create() and explicit system registration   [generated]
    assets.ts                    asset manifest, defineAssets()                    [generated]
    components.ts                component manifest, defineComponents()            [generated]
    vite-env.d.ts                                                                  [generated]
    components/                  our component declarations; no system, DOM or renderer imports
    scene-assets/                *.scene-asset.ts procedural prototypes: graybox rooms and fittings  [generated convention]
    domain/                      pure TypeScript
      math/  house/  seams/  puzzles/  threats/  progression/  session/
    content/                     chapter-one data: modules, sockets, pairs, seams, vantages,
                                 checkpoints, objectives, hints, tunings, canonical snapshots
    persistence/                 save codec, validation, migration, recovery ladder; pure
    platform/                    adapters over the SDK and browser
      input/  lifecycle/  storage/
    app/                         command queue, context accessor, hop coordinator logic, error boundary
    systems/                     ECS systems
      input/  gameplay/  presentation/  audio/
  tests/
    unit/                        domain, persistence and adapter-logic tests
    model/                       state-space exploration and reference playthrough
    runtime/                     scripts that drive IWER through the SDK command-line tool
    fixtures/                    recorded hand samples, old saves, expected hashes
  iwsdk.config.json              project authority: scene, modules, XR, features, emulator   [generated]
  index.html                     the web page                                                [generated]
  package.json  tsconfig.json  vite.config.ts                                                [generated]
```

### Differences from the brief's proposed tree, and why

| Brief proposed | Decision | Reason |
|---|---|---|
| `public/assets/{environments,architecture,characters,materials,audio,animations}` | `public/{scenes,ui,audio,models,textures}` | The starter uses `public/scenes`, `public/ui` and `public/audio`, and the SDK tooling expects scenes there |
| `src/world/{modules,architecture,characters,effects}` | Removed | World composition is the scene document plus `src/scene-assets/`, per the SDK's convention that composition lives in JSON and static geometry in the asset manifest |
| `src/ui/{menus,diegetic,feedback}` | Removed | There are no menus. Diegetic feedback is presentation systems; the two cards are UIKitML files |
| `src/utilities` | `src/domain/math` | The only shared utility is the domain's small maths module |
| `src/app` | Kept, narrowed | Orchestration glue that is neither a system nor domain |
| `src/platform/{xr,input,audio}` | `src/platform/{input,lifecycle,storage}` | XR and audio are owned by the SDK; we adapt only input, lifecycle and storage |
| `src/systems/{interactions,house,gameplay,ai,presentation}` | `src/systems/{input,gameplay,presentation,audio}` | The house and the enemy are domain, not systems |
| `src/persistence` | Kept | Pure codec and validation |
| `tests/{unit,integration,e2e}` | `tests/{unit,model,runtime}` | Names say what each does: model checking and emulator runtime tests |
| No `src/content` | Added | Authored chapter data must be separate from rules |
| No `src/components/`, `src/scene-assets/` | Added | SDK conventions |

The SDK's own guidance asks for no barrel `index.ts` files, and that component declarations import no systems. Both are followed.

## 3. Tooling

| Tool | Use | Status |
|---|---|---|
| Node | Runtime for tooling. The starter requires 20.19+, 22.12+ or 24+ | Observed locally: 22.17.1 |
| npm | Package manager | As generated |
| Vite with the IWSDK development plugin | Dev server, emulator injection, build | As generated |
| TypeScript, strict | Type checking: `npm run typecheck` | As generated |
| IWSDK command-line tool | Dev server control; driving the emulator; ECS inspection, pause and step; screenshots | As generated; command surface confirmed by its help output |
| Vitest | Domain, persistence, adapter logic, and model checks | Installed; unit and model suites run from the project root |
| TypeScript AST rule check | Dependency rules INS-01 to INS-03 | Implemented in `tools/check-rules.mjs` and included in `npm run check`; adds no dependency |

No other dependency is added without an ADR.

## 4. Scripts

Available from the project root:

| Script | Does |
|---|---|
| `test` | Unit tests in Node |
| `test:rules` | Dependency boundaries and forbidden-API checks (INS-01 to INS-03) |
| `test:content` | Model/content tests, including the softlock checks |
| `test:runtime` | Live navigation assertions against the active IWER immersive session; start the dev server and enter XR first |
| `check` | `typecheck`, `test:rules`, `test`, and `test:content` |

## 5. Build

- `vite build` produces `dist/`: `index.html`, hashed scripts, and everything under `public/`.
- The starter sets the base path to relative, so the build can be served from any path (REQ-PLAT-004).
- Source maps are off in production, as generated.
- The emulator must not be injected in production builds. The project manifest has settings for emulator activation and build injection; they are left at development-only and checked by RT-23.
- The starter's Vite configuration deduplicates Three.js and the UI kit to avoid two copies of Three; it is kept unchanged.

## 6. Environments

| Environment | What | Purpose |
|---|---|---|
| Unit | Node, no browser | Rules, saves, adapter maths |
| Development | Desktop browser with IWER, through the managed dev server | Building and automated runtime tests |
| Headset development | The same HTTPS dev URL opened in the Quest Browser, over Wi-Fi or USB port forwarding. The local certificate is self-generated, so the headset shows a warning to accept | Feel, tracking, first performance readings |
| Preview | `vite preview` of the production build | Checking the build as shipped |
| Production | Static HTTPS host | Release |

## 7. Deployment

Any static host with HTTPS. WebXR needs a secure context. Requirements on the host:

- HTTPS with a valid certificate.
- Correct content types for JavaScript modules, JSON, glTF, KTX2, WebAssembly if any decoder uses it, and audio.
- Long cache lifetimes for hashed files; no cache for `index.html`.
- A content security policy limiting scripts, connections and media to the site itself. Decoder workers or WebAssembly may need specific allowances, to be found at M7.
- No server logic, no cookies, no logs beyond the host's defaults.

The choice of host is open (Q-18). The generated starter includes hosting guidance for common static hosts.

Packaging as an installable app is possible later and is out of scope.

## 8. Release checklist (M7)

1. `npm run check` passes.
2. `npm run test:runtime` passes under IWER.
3. Production build served from a subpath starts and enters XR under IWER, with the emulator not injected.
4. The network panel shows no requests after load.
5. `npm audit --omit=dev` reports no high-severity advisories.
6. The headset validation plan is complete, with evidence labelled Quest-tested.
7. The asset register has no row without a source.
8. The version ledger matches the lockfile.

## 9. Version control

The project gets its own repository, initialised at M0 by the generator or by hand. It has no relationship to any other project's repository. Large binary assets are kept out of history where the host allows, or in a separate assets folder with clear provenance.
