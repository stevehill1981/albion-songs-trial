# Hosted editor CPU comparison and first-request follow-up

## Scope

The owner approved publishing PR 54 and a bounded free hosted comparison, with
rollback if access broke or reliability did not improve. The owner separately
approved one unpublished practice-page draft, to close without publishing.
No new dependency, service, scope, content publication or paid plan is allowed.

## Completed comparison

- Verify production revision `612d809bcac87d6170ba7fac3befa547cfd39f2f` and Worker
  version `ed2318b6-a88d-436f-acee-2761ceb195ea`. Compare served practice HTML
  with the previous version, allowing only the build revision marker to differ.
- Use the real editor GitHub sign-in, immediate preview and test draft 55. Its
  only change is a clearly named test heading. Verify its exact checked preview.
- Compare three checked-status reads of that same draft against the old Worker
  `e2040086-0b5d-4c99-ba63-e17a175d494b`, then restore the approved repair.
  The old reads used 10, 9 and 8 ms; the repair used 3, 4 and 3 ms. All succeeded.
- Warm preview edits used 5–6 ms, but first/quiet-interval previews used 14–15 ms
  and the one draft save used 15 ms. Those are successful overruns, not Free-plan
  headroom. Keep the improvement without claiming the whole problem is solved.
- Close draft 55 without merging, preserving its recoverable branch. Done; its
  unchanged head is `b47bfe00112b48f1a60f9f20275ec36e8c1532fb`.

Sanitized invocation observations and screenshots are retained in
`/Users/stevehill/WBA/verification-evidence/editor-cpu-2026-10-21/`. Missing CPU
readings stay unknown. The browser connection stopped responding during the final
post-restore check; there was no matching captured authenticated request. Verify
the restored production version independently, and do not claim that UI check ran.

## Bounded local follow-up before proposing another repair

The previous profiler starts after acceptance requests have warmed the Worker.
It cannot explain the remaining first/quiet-interval spike. Do not infer cold
startup from a hosted gap alone.

1. Create one temporary instrumented copy of
   `scripts/check-component-runtime.mjs`, at `scripts/.editor-first-profile.mjs`.
   Move its existing inspector capture ahead of the first request, allow the
   existing local save fixture as a workload, capture one operation in a fresh
   runtime, and reset fixture counters before all normal acceptance checks run.
   This changes no deployed code, authentication or package declaration.
2. Capture first preview, first save and first status sequentially, each bounded
   by the existing ten-second inspector timeout and a sixty-second process bound.
   Retain fixture-only profiles, the exact instrumented source and acceptance
   logs in the evidence directory. Fail on missing/idle-only samples.
3. Inspect actual stacks. A local first-request profile does not prove the hosted
   spike has the same cause. Propose only a small change supported by evidence;
   seek agreement before any new architecture or API/data-shape change.
4. Remove the temporary script and all runtime-owned directories/processes. Record
   the comparison and findings, verify the restored Worker and unchanged content,
   and push this documentation separately without another production deployment.

## First-request findings and proposed next boundary — not implemented

All three one-operation fresh-runtime captures completed, followed by the full
compiled acceptance cases. Each had non-idle samples. These are local stacks,
not proof that a hosted quiet interval creates a new isolate.

The first-preview capture attributed 29 self samples to initialisation of the
shared `component-preview` chunk. Inspection shows that chunk is 320,702 bytes
and eagerly parses `museum-patterns.json`, the existing 311,240-byte catalogue
of 36 HTML templates. The 58,878-byte compact projection without `template`
contains every name, label, field definition and hero flag needed by validation.
`blocks.mjs` combines that validation with legacy HTML rendering, so both preview
and save import template markup they do not use. Astro's renderer and request
processing also appear in first-request stacks; splitting the catalogue is a
measured lead, not a guarantee that every request will drop below 10 ms.

The first-save capture also sampled eager guide freezing. Keep that separate;
do not combine an unrelated caching change with the next experiment.

Recommended design, requiring agreement for a new generated-schema convention:

- Keep `src/lib/museum-patterns.json` as the sole authoritative legacy catalogue.
  Derive a compact, committed metadata projection without HTML. Verify it against
  the catalogue before tests/build; a stale projection must fail, not silently
  weaken validation. This must work from a clean checkout before generated build
  context exists. Exact formatting of the internal projection is not a public
  content/schema change.
- Extract existing field definitions and validation functions from
  `src/lib/blocks.mjs` into a lightweight module that uses that projection. Keep
  existing exports compatible through re-exports; do not rewrite the validators.
  Legacy rendering continues to import the complete original catalogue.
- Update `src/lib/component-preview.mjs`, `auth/mcp/github.mjs`, and the Astro
  BlockList/Intro/TextPanel imports so preview/save paths use lightweight validation
  and inline-text helpers. Preserve actual Astro rendering, every field, default,
  hero rule, nested validation and all source/credit/publication checks.
- Negative controls must detect missing/changed metadata and template drift.
  Verify old/new validators agree on all museum pages/templates and malformed
  nested cases; inspect the emitted runtime modules to prove legacy template HTML
  is absent from these route dependencies. Run all tests/build and compare the
  same fresh-runtime captures. No paid service, dependency, scope or auth change.
- If the local experiment does not materially reduce the measured first-request
  work, revert it and narrow the question. A separate checked-preview approval
  would gate any subsequent production comparison.

Alternative: keep the published improvement and defer this larger module split.
Neither option claims the current Free-plan spike is solved.

## Approved prototype execution

The owner approved the smaller validation module on 21 October 2026. Use this
existing PR branch for the prototype; run the existing workflow explicitly on its
exact pushed head because documentation branches do not trigger push builds.
Production publication remains gated by a checked-preview approval.

1. Capture existing validation outputs, normalized defaults, schema/CMS fields and
   malformed nested cases for every page, saved template and collection. Retain
   this reference in the task evidence directory and compare again after extraction.
2. Add `src/lib/pattern-metadata.json` and `scripts/pattern-metadata.mjs`. The
   committed projection contains all metadata except HTML, plus a digest of the
   full authoritative catalogue. Explicit regeneration is separate from checking.
   Both test and preparation entry points must fail on missing/stale metadata.
3. Extract unchanged validators, field definitions and CMS conversion into
   `src/lib/block-schema.mjs`; move `renderParts` into `src/lib/inline-parts.mjs`.
   Keep `src/lib/blocks.mjs` exports compatible and legacy rendering unchanged.
   Redirect preview, GitHub-client and BlockList/Intro/TextPanel imports.
4. Update `scripts/prepare.mjs`, `scripts/verify-build.mjs`, `package.json` and
   `.gitignore` for the new browser modules/metadata, retaining the normal editor's
   complete catalogue. Add drift/parity tests in `test/block-schema.test.mjs`.
5. Add an emitted-module check in `scripts/check-runtime-templates.mjs`, invoked
   from `scripts/check-component-runtime.mjs`, proving no legacy template HTML is
   in the runtime modules. Its negative controls inject known template markup and
   must fail. Keep the static normal editor's catalogue intact.
6. Run focused tests, full tests/build and actual compiled acceptance, then repeat
   the same three bounded first-request captures. Inspect both source parity and
   emitted artefacts before drawing a conclusion. Revert if the split does not
   materially reduce the targeted work. Commit/push verified work, inspect hosted
   checks and present the exact preview; do not deploy it without approval.

## Prototype outcome before hosted approval

At the prototype review, the extraction was implemented and production had not changed. All 124 tests and the
full build pass, including the real compiled Astro editing/publication checks,
normal editor assets and OAuth/MCP acceptance. The old 15 exported names remain.
All 17 saved records, normalized defaults, schemas/CMS fields and 10 malformed
variants match the pre-extraction reference. Running the exact old implementation
from the published Git revision also produces byte-identical bodies for all
13 pages/templates.

The emitted-code guard first rejected the actual old Worker artefact, then passed
the new one: all 15 runtime modules exclude all 36 legacy HTML templates. Browser
assets still include the complete authoritative catalogue, new metadata and every
relative module import. Total emitted module bytes fell from 1,260,446 to 1,038,042;
the shared component-preview chunk fell from 320,702 to 95,896 bytes.

Identical one-operation first-request captures completed with compiled acceptance
checks after profiling. Preview active samples fell from 314 to 70. Save samples
were 97 before and 116 after, with more GC samples in the latter; status was 21
versus 23. These short independent captures support a preview improvement, do not
establish a save improvement, and are not hosted CPU timings or a statistical
range. Keep the save/first-request concern open. The source payload reduction and
preview evidence merit a bounded hosted comparison, subject to preview approval.

A missing legacy-renderer validateFact import was caught by the existing rendering
tests and restored before the successful full run. No validation rules were
removed or relaxed. No dependency, sign-in scope, permission, cache or paid plan
changed. The temporary first-request runner has been removed; raw profiles, exact
reference outputs and comparison logs remain in the evidence directory.


## Approved hosted comparison outcome

The owner approved the exact PR 56 preview and bounded deployment. PR 56 merged
normally after both required checks passed at the approved head; no protection was
bypassed. Production is revision `43bf79a4c636bf51b7d767fe5cf285f86d02e1aa`,
Worker `c8fb7105-ee9a-491f-93a7-a38bdc6dff9d`. Its production workflow completed
successfully. Only the site Worker was deployed; do not claim the auth/MCP Worker
was updated by this publication.

The owner approved Safari after Chrome was busy with another task. The real
browser passed existing GitHub sign-in, immediate component preview, saving the
single authorised draft, reopening its persisted heading, and checking/opening its
full-page preview. The exact diff of draft 57 was one heading; sources, credits
and calculated results were unchanged. The hosted preview retained the 48-match,
23-win, 13-draw, 12-loss, 79-for/60-against Moore table and its evidence notes.
The draft was closed without merging at its unchanged head
`02650a3dc349a8ea31bd4e2d293ecfe24446512e`; its recovery branch remains. No browser
publish test was performed or authorised in this comparison. Compiled publication
safeguards remain covered by the 124 passing tests and build checks.

The final sanitized log contains 18 authenticated successful POST observations:

- Six immediate previews: 11, 5, 5, 4, 5 and 2 ms CPU. The 5 ms quiet-interval
  preview followed about 91 seconds without another preview, but only 51 seconds
  without a recorded editor API call. This does not prove a cold isolate.
- Twelve editor API calls: initial read 15 ms, the single save 14 ms, then
  4, 2, 2, 2, 3, 2, 3, 4, 6 and 3 ms across readiness polling, checking and
  reopening. The remaining read calls used 2–6 ms.
- Every observed authenticated call returned HTTP 200/outcome ok. One unrelated
  unauthenticated preview returned 401 and is excluded. Logged traffic is not a
  guarantee of complete traffic or future reliability.

The preceding published version's bounded browser observations were a 12 ms read
and 12/34 ms previews. These were different sessions and timings, not matched or
randomised trials. The smaller payload and observed previews support retaining
the approved extraction; there was no functional regression or failed request in
this run. They do not establish a reliable reduction in first-read/save CPU.
The 11/14/15 ms observations still exceed the documented Free-plan 10 ms allowance;
successful overruns are not headroom. The remaining CPU issue is open. Keep this
baseline rather than make another speculative change in the same comparison.
No paid service, dependency, permission or scope was added.

The public practice page was fetched independently and matched the prior bytes
except its approved revision marker. Python's initial public fetch was refused
with `HTTP Error 403: Forbidden`; the existing Node fetch runtime succeeded and
performed the actual comparison. Browser assets also matched the approved source.
Evidence is retained under the existing verification-evidence directory in
`metadata-split-final.json`, `metadata-split-final-public.json`,
`metadata-split-deployed.json` and `safari-saved-draft-checked.png`.

The Safari test disconnected and its two task-owned tabs were closed. Three old
Chrome test tabs (1893424685, 1893424705 and 1893424722) remain because the
browser connection reports `Debugger unattached` when closing them. They can be
closed once that connection works; unrelated active Chrome work was not disturbed. The
one-off remote CI branch `trial/lean-validation` was removed only after verifying
its exact head was retained in main. No task runtime, temporary profiling script
or linked worktree remains. This outcome record is documentation only and does
not authorise another production deployment.
