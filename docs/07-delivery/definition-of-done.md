# Definition of done

## For a change

A change to the code or content is done when:

1. It does what its requirement or task says, and the relevant document is updated in the same change if behaviour or data changed.
2. `npm run check` passes: type check, import rules, unit tests, content validation and model checks.
3. New rules have unit tests. A fixed rules bug has a test that replays the failing command sequence.
4. It adds no allocation to a per-frame update, no entity array to a system, no timer, and no dependency.
5. Every subscription it creates is released in teardown.
6. It does not let presentation decide a rule, and does not read connectivity from a transform.
7. If it uses an SDK API not listed as declared in the verification ledger, the API was checked in the installed package and the ledger updated.
8. If it touches interaction, the affected runtime tests pass under IWER.
9. Its status is described with an evidence label, and no stronger one than was actually obtained.

## For a milestone

A milestone is done when:

1. Its acceptance list in the roadmap is met, with results recorded.
2. The risks it was meant to retire are closed with evidence, or re-rated with a reason.
3. The questions it was meant to answer are answered in `unresolved-questions.md`.
4. The documents affected by what was learned are updated.
5. The evidence level reached is stated.

## For the vertical slice

The slice is done when:

1. The eleven acceptance criteria are met at the "Accepted" level in `05-quality/acceptance-criteria.md`, with no controller used in the completion run.
2. All 125 requirements have a passing verification, or a recorded, justified waiver.
3. Performance on Quest 3 meets REQ-PERF-001 and never triggers REQ-PERF-002, measured on the release build and recorded in the Quest column of the evidence table.
4. No comfort tester stopped for discomfort, and the results are recorded.
5. At least 80% of first-time players completed unassisted.
6. The softlock check passes on the shipped content.
7. Every shipped asset has provenance and the originality checklist is signed.
8. The release checklist is complete.
9. Known limitations are current.
10. The title has been checked for conflicts before any public release.

## Not done, however it looks

- "Works in the emulator" described as working on Quest.
- A test that exists but was not run on the build being described.
- A frame rate read off a desktop.
- A puzzle the developers can solve that no first-time player has tried.
- Art without a source.
