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
