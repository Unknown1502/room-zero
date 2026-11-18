# Risk register

Severity is the harm if it happens. Likelihood is our estimate now, before any prototype. Both are High, Medium or Low. R-01 to R-14 are the risks named in the brief; R-15 onward were found while writing the specification.

No mitigation here has been tried. Each names the test or milestone that will show whether it worked.

## Summary

| ID | Risk | Severity | Likelihood | Retired by |
|---|---|---|---|---|
| R-01 | Two-hand manipulation tracking stability | High | Medium | M0, M1 |
| R-02 | Seam snap precision | Medium | Low | M1 |
| R-03 | Room module collision | Medium | Medium | M2 |
| R-04 | Graph and presentation out of step | High | Low | M2 |
| R-05 | Enemy pathfinding after topology changes | High | Low | M4 |
| R-06 | Enemy unfairness and route exploits | High | Medium | M4, M5 |
| R-07 | Hand loss during manipulation | High | High | M0, M1 |
| R-08 | Comfort during room transitions | High | Medium | M1, M5 |
| R-09 | First-time onboarding | High | Medium | M3, M5 |
| R-10 | Rendering and asset budgets | High | Medium | M5, M6 |
| R-11 | Lifecycle cleanup | Medium | Medium | M5 |
| R-12 | Save incompatibility | Low | Medium | M5 |
| R-13 | Audio spatialisation | Medium | Medium | M4, M6 |
| R-14 | Quest performance without hardware access | High | Unknown | Access to a headset |
| R-15 | Art scope exceeds capacity | High | High | M5 decision |
| R-16 | SDK churn and documentation lag | Medium | High | M0, ongoing |
| R-17 | Near grab and far ray conflict on one pinch | Medium | Medium | M0 |
| R-18 | Darkness unreadable on the headset | Medium | Medium | M3 |
| R-19 | The encounter's timing is too tight or too slack for real players | Medium | Medium | M5 |
| R-20 | Title or content too close to existing work | High | Low | Before any public release |
| R-21 | Development tooling sends usage data or carries advisories | Low | Medium | M0 |

## Detail

### R-01 Two-hand manipulation tracking stability
- **Impact.** Three of six seams need two hands. If holds drop often, the staircase, the Turning Room and the lift become frustrating and the chapter fails its completion target.
- **Why it might happen.** Camera-based hand tracking loses hands that overlap, leave the cameras' view or move fast.
- **Mitigation.** Two-hand seams use one still bracing hand and one moving hand, kept 0.35 to 0.5 m apart and in front of the body. Releasing the brace freezes, with 1.5 s to re-take, and does not undo the move. A dropped travel hold returns the room without penalty. One-handed mode exists as a fallback for players, and as a fallback for us: if two-hand play is unreliable it can become the default.
- **Validation.** RT-05 for wiring. HQ-02 and HQ-03 for reality: 95% of holds kept.

### R-02 Seam snap precision
- **Impact.** Rooms that look joined but are not, or snap when the player did not intend it.
- **Why it might happen.** Snapping based on drawn positions and floating-point comparison.
- **Mitigation.** Rooms rest only at authored detents. Connection is computed from detent indices through exact authored poses, with tolerances wide compared with numerical error and narrow compared with any near-miss. Content validation fails the build on near-misses. The hand's snap window is a separate, tunable input parameter.
- **Validation.** UT-CONN-01, UT-CONN-02, UT-CONN-06, UT-SEAM-02, UT-SEAM-03, RT-07, RT-08.

### R-03 Room module collision
- **Impact.** Rooms passing through each other; or the final puzzle, which depends on blocking, behaving inconsistently.
- **Why it might happen.** Hand-authored collision boxes that do not match what is drawn; sampling that misses a thin overlap.
- **Mitigation.** Coarse oriented boxes with a margin; 64 samples per detent interval; a debug view that draws boxes over the art; validation that no two modules overlap at rest in any configuration. Only one blocking relationship is required by the chapter's design, and it is tested by name.
- **Validation.** UT-SEAM-04, UT-CONN-05, UT-CONN-06, UT-PUZ-03, RT-09.

### R-04 Graph and presentation out of step
- **Impact.** The player sees a doorway that the rules say is closed, or the reverse. Trust in the house is lost.
- **Why it might happen.** Presentation computing its own idea of connection; animation finishing after or before the commit.
- **Mitigation.** One owner: the domain. Presentation receives events and a view and has no access to anything else. The domain times the settle and commits on its last tick; presentation animates to that time. Lamps, rings of light and audio are all driven by `GraphChanged`, never by positions.
- **Validation.** INS-01, UT-GRAPH-04, UT-SEAM-05, UT-SEAM-12, RT-22.

### R-05 Enemy pathfinding after topology changes
- **Impact.** The Surveyor walks through a closed doorway, stands still forever, or oscillates.
- **Why it might happen.** A stale route; a change during a crossing; replanning every tick.
- **Mitigation.** Its plan is re-evaluated every tick against the current graph. Crossings are atomic: the seams a doorway depends on are held while it is in it. A doorway in the player's hand is suspended, so nobody starts through it. Replanning is triggered only by a change of target or next doorway.
- **Validation.** UT-SURV-03, UT-SURV-04, UT-SURV-08, UT-SEAM-08, MC-04, RT-14.

### R-06 Enemy unfairness and route exploits
- **Impact.** Either the player feels cheated, or finds a trick that makes the Surveyor harmless.
- **Why it might happen.** Rules with gaps; timings tuned without players.
- **Mitigation.** Two rules, stated; every plan announced by the count; no perception model to guess at. Known exploits are analysed in `enemy-surveyor.md` section 11 and each is closed by a rule or accepted as harmless. The encounter is model-checked for the existence of an uncaught strategy with a minimum response window.
- **Validation.** MC-03, MC-04, UT-SURV-06, UT-SURV-13, PT-03.
- **Residual.** Exploits we have not thought of. Playtests at M5 are the net.

### R-07 Hand loss during manipulation
- **Impact.** A room committed somewhere the player did not put it; or constant dropped holds.
- **Why it is rated high likelihood.** Loss will certainly happen in normal play; the question is only whether it is handled well.
- **Mitigation.** A 0.25 s grace; a release on loss uses the last valid value and can commit only if that value was already inside a snap window; pause and hop force a return, never a snap; the room is never left between detents.
- **Validation.** UT-SEAM-11, UT-ADPT-02, RT-11, RT-12, HQ-05.
- **Open.** How quickly the SDK reports loss (assumption A3).

### R-08 Comfort during room transitions
- **Impact.** Nausea ends sessions and fails the product's promise.
- **Why it might happen.** Vection from large moving rooms; hops; height.
- **Mitigation.** The player's room never moves; a still frame of reference is always in view; drawn speeds are capped; motion is caused by the player's own hand; hops are faded; no camera animation at all.
- **Validation.** CF-02, CF-03, CF-06. This risk can be assessed only on a headset.

### R-09 First-time onboarding
- **Impact.** A judge or player who does not find the first grip in a minute leaves.
- **Why it might happen.** Hand tracking is unfamiliar; there is no text; the scene is dark.
- **Mitigation.** One new thing in view at a time; the first guess is always right; hints on the envelope after short waits; the first seam cannot be done wrongly; the web page states the three gestures in one line.
- **Validation.** PT-01, PT-05. Graybox playtest at M5 before any art is made.

### R-10 Rendering and asset budgets
- **Impact.** Missing 72 frames per second; or cutting the look to reach it.
- **Why it might happen.** Eleven rooms, long sight lines, a browser on a mobile GPU.
- **Mitigation.** Baked lighting; a shared kit; per-vantage visibility sets; rationed transparency; automated draw-call and triangle gates from M3; a stated degradation ladder; darkness and fog as art direction.
- **Validation.** PF-01 to PF-06, PF-08.

### R-11 Lifecycle cleanup
- **Impact.** Leaks and duplicate handlers after restart or session re-entry; state corrupted across sessions.
- **Why it might happen.** Subscriptions not released; assumptions that the session starts once.
- **Mitigation.** Every subscription goes through `cleanupFuncs`; no timers; restart re-creates the session object and reloads the level, not the world; session end returns to Title and resumes from a checkpoint.
- **Validation.** RT-02, RT-12, RT-13, PF-09, INS-09.

### R-12 Save incompatibility
- **Impact.** A crash or a stuck state on load after an update.
- **Why it might happen.** Schema or content changes; hand-edited or truncated storage.
- **Mitigation.** Schema and content versions; full validation including graph equality; a recovery ladder that ends in a new game and never throws; canonical snapshots per checkpoint.
- **Validation.** UT-SAVE-01 to UT-SAVE-06, RT-18, RT-19.
- **Severity is low** because the whole chapter is seven minutes; the worst outcome is starting again.

### R-13 Audio spatialisation
- **Impact.** The Surveyor cannot be located by ear; through-wall sound is confusing; the count is missed.
- **Why it might happen.** Web audio has no occlusion; the headset's speakers are open; the SDK's audio component exposes no filter.
- **Mitigation.** True positions with level reduced by route length; the knock chosen for a clear attack; mix priority for the count; a visual twin for every cue. Low-pass is optional.
- **Validation.** UT-ADPT-04, RT-20, HQ-08.

### R-14 Quest performance without hardware access
- **Impact.** The project cannot make any performance, comfort or tracking claim, and cannot be accepted.
- **Likelihood.** Unknown: it depends on whether a headset is available to the team, which this document cannot establish.
- **Mitigation.** Everything that can be verified without hardware is: rules, wiring, scene counts, logic time. Budgets are conservative. Evidence is labelled, with a separate empty column for the headset. A short, ordered headset plan exists so that a few hours with a device are used well: HQ-01, HQ-02, PF-01 first.
- **Validation.** The Quest column of the evidence table having entries.
- **If it cannot be mitigated.** The project stops at IWER-verified and says so in every description of it.

### R-15 Art scope exceeds capacity
- **Impact.** An unfinished-looking chapter, or a schedule that never ends.
- **Why it is rated high.** Eleven rooms, a hero character with twelve clips, about sixty sounds, for what is probably a very small team.
- **Mitigation.** One architectural kit; graybox through M5; house-scale surfaces mostly dark; a minimum animation set of seven clips; rooms never entered have no interior. A scope decision is taken at the end of M5 with playtest evidence: if capacity is short, cut `landing`'s half-way detent, merge the two corridors' dressing, and ship the Surveyor with the minimum clip set.
- **Validation.** The M5 scope review; the asset register's status column.

### R-16 SDK churn and documentation lag
- **Impact.** An API changes or behaves differently from the guides; time is lost.
- **Why it is rated high.** The guides describe 0.5.3 while the package is 1.1.0, and 1.2.0 already has a release candidate.
- **Mitigation.** Versions locked from the generator's lockfile; installed declarations are the authority; SDK use is confined to adapters and systems; an explicit list of assumptions tested at M0; upgrades are deliberate.
- **Validation.** M0 exit criteria; INS-08.

### R-17 Near grab and far ray conflict
- **Impact.** Reaching for a grip triggers a hop, or a hop is swallowed by a grab.
- **Mitigation.** Lamps are never placed behind stations; hops are suppressed when a hand is near a grip; assumption A4 is tested first.
- **Validation.** UT-ADPT-03, RT-10, HQ-06.

### R-18 Darkness unreadable on the headset
- **Impact.** Players cannot see doorway shapes or the Surveyor; the mood becomes murk.
- **Mitigation.** Interactables are emissive; silhouettes are staged against light; minimum ambient is set on a headset, not a monitor.
- **Validation.** HQ-09 as soon as a graybox room with lighting exists.

### R-19 Encounter timing
- **Impact.** Too tight: repeated capture and frustration. Too slack: no tension.
- **Mitigation.** All timings are data; the window recurs; reduced intensity lengthens it; playtest with first-time players.
- **Validation.** MC-03 for the floor; PT-03 and PT-04 for the feel.

### R-20 Title or content too close to existing work
- **Impact.** A forced rename, or a takedown.
- **Mitigation.** The title is provisional and has not been cleared. An originality checklist governs design. The competitive review is recorded with its limits.
- **Validation.** A name and trademark search before any public release (Q-20); INS-05.

### R-21 Development tooling
- **Impact.** Usage data sent from a developer machine without a decision; advisories in the development tree.
- **Mitigation.** Review at M0; remove what is not needed; none of it ships.
- **Validation.** INS-07.

## Review

The register is reviewed at the end of each milestone. A risk is closed only when its validation has run and passed, with the evidence label recorded.
