# Separate editor startup from GitHub handling

The owner requested this bounded diagnostic after the failed PR 58 experiment
was rolled back. Baseline: a80f035d4123ee097b7ae6f758d1ba55541fb36f, published
Worker a91bd477-321d-467c-b525-0d177a48cfe3. Do not change live routes, content,
credentials, permissions, caches, validation, dependencies, services or plans.

1. Add an opt-in local script `scripts/profile-editor-boundaries.mjs` using the
   existing Miniflare inspector and fixed `scripts/test-support/editor-harness.mjs`.
   It reads the actual compiled site Worker, verifies the emitted-template guard,
   and runs with fixed fixture credentials and strictly mocked outbound requests.
2. Capture read/save in fresh runtimes, and in fresh runtimes first sent an
   unsigned request to the SAME editor route. That control must return 401 and
   make zero upstream calls. It includes framework and module startup plus the
   rejection path, not just startup. Keep those qualifications in the evidence.
3. For each authorised operation, stop the first profile at the first outbound
   GitHub request, start a second before returning its fixture response, and stop
   after the final editor response is consumed. The first phase includes startup,
   request validation and first-request construction; the second includes GitHub
   response handling, remaining calls, validation, response serialization and
   framework completion. Do not label either phase as pure framework or pure IO.
   Repeat the same operation in the same runtime with a fresh fixture to compare
   warm handling. No actual remote writes, repository draft or browser sign-in.
4. Use three independent repetitions for each of read/save and fresh/preloaded
   conditions (12 bounded runtimes). Each has a 60-second process limit; inspector
   commands and connection setup have 10-second deadlines, with guaranteed
   disposal of profiler, runtime and temporary directories. Bound raw outputs and
   keep only fixture profiles, source revision/digests, call counts and results.
5. Add a small profile-analysis helper and meaningful negative controls in
   `test/editor-profile.test.mjs`: reject malformed frames, unknown sample IDs,
   and idle-only captures as measurements. Partition self samples without double
   counting; keep GC/native/unattributed separate. Report source/module names and
   actual frames, not guessed causal attribution or hosted CPU milliseconds.
6. Rebuild the baseline, run tests and execute the 12 captures sequentially.
   Assert read/save outcomes, expected upstream sequence, fresh permission calls
   and zero network for the unsigned control. Run normal compiled acceptance
   after the diagnostic, then inspect profiles and write findings here.
7. Push verified diagnostic code and findings on this documentation/diagnostic
   branch. No preview or production publication is required for a local-only
   investigation. Verify production still has the recorded baseline and public
   content, and confirm all task processes/temp directories have exited/gone.
   Propose a narrower next design based on evidence; do not implement another
   speculative repair or new deployment in the same experiment.

Evidence: `/Users/stevehill/WBA/verification-evidence/editor-startup-2026-10-21/`.
Local inspector samples exclude idle time but still include GC/unattributed work;
fixture response latency is not GitHub latency and these are not hosted limits.
The inspector attaches after isolate creation/eager entry bootstrap, before the
first route request. Only first-route/lazy module startup is inside these captures;
do not claim this measures total Worker cold startup or resolves the hosted cause.


## Findings from the completed local comparison

Twelve retained successful runtime captures produced 54 usable phase profiles,
all from one exact compiled digest at the recorded a80f035 baseline. Every read
made exactly three fixture GitHub calls, and every save exactly nine; each first
and repeated operation independently checked permission and main revision.
Unsigned controls returned 401 with no upstream request. Profile analysis rejects
empty, idle-only, corrupt and unmatched samples; native, GC and unattributed
samples stay separate. All measured temporary runtime directories are gone.

Median active V8 samples across three observations per row/phase:

| Operation and condition | Before first GitHub call | After responses begin | Repeat before / after |
| --- | ---: | ---: | ---: |
| Read, fresh route | 28 | 5 | 4 / 3 |
| Read, unsigned request first | 8 | 7 | 3 / 4 |
| Save, fresh route | 45 | 32 | 6 / 11 |
| Save, unsigned request first | 13 | 17 | 5 / 22 |

The unsigned startup/rejection control itself used median 42 samples in the read
runs (41–58), and 22 in the save runs (5–44), before any GitHub work. Fresh read
pre-upstream samples ranged 22–110, demonstrating substantial variability. These
are sampled local observations, not milliseconds or a measured percentage of
hosted cost. Do not subtract medians from independent captures or pretend this
accounts for isolate creation before the inspector attached.

The evidence separates two local costs rather than identifying a single cause:

- Framework route handling, lazy module initialisation, authoring metadata setup
  and GC appear before the first upstream call. Moving those costs to an unsigned
  request substantially changes the following first authorised request. Read
  processing after the first response is smaller in these fixtures. This supports
  a first-route/startup component; it does not justify warm-up traffic or bypassing
  authentication, and does not reverse the failed hosted result of PR 58.
- Save work remains after startup is exercised: post-upstream medians 17 samples
  on the first authorised save and 22 on its repeat, versus 7/4 for reads in the
  corresponding condition. Across the six first-save post-upstream captures,
  save() has 26 self samples; api()/record() and boundedText() also appear. The
  function frame does not pinpoint an expression inside save(), so there is no
  evidence yet to single out base64 encoding, JSON serialization or one guard.
- boundedText() handles incoming request bodies as well as upstream responses.
  Classify it separately as stream-decoding; calling all its samples GitHub work
  would misattribute the input-body work observed before any GitHub response.
- The local fixture omits real GitHub transport and response delivery behaviour.
  These captures cannot explain why live requests used 22/26 ms after a local
  improvement. Keep production unchanged and the hosted CPU issue open.

One initial preloaded diagnostic attempt returned the editor's sanitized
`GitHub could not complete this operation` response (422). It was excluded and
its failure log retained. The fixture boundary originally hid the instrumentation
exception; the script now propagates the original boundary error instead of
misreporting it as an upstream failure and retains raw profiles before analysis.
The exact original exception was not recoverable and must not be guessed.
An immediate diagnostic retry and the three retained repetitions then passed.
In total, 14 runtimes were attempted (12 retained, one failed and one diagnostic
retry superseded by the retained run); this was not an exception-free experiment.

## Recommendation and scope boundary

The next useful bounded comparison is replaying realistic public GitHub response
payload sizes and delivery chunks against this same baseline, with the exact
fresh permission, revision, validation and write sequence still asserted. That
can test whether small in-memory fixture responses hide native decoding or
stream work, without touching production. A direct-handler versus Astro wrapper
comparison would also need equal lazy-import boundaries: an eager wrapper that
initialises before profiler attachment would create a false win.

Do not deploy another micro-optimisation from these figures. A hosted route or
architecture change would need a separate agreed design and preview approval.
This change contains local diagnostic scripts/tests and the findings only;
production routes, auth, content, dependencies, permissions and paid settings
are unchanged. The full row data is retained in
`plans/evidence/2026-10-21-editor-startup.json`; raw fixture-only profiles, exact
compiled source and logs remain in the evidence directory above.

## Final verification

All 126 tests pass after the final diagnostic/classification changes. The full
baseline build passed, and normal compiled Astro acceptance passed again after
profiling, including all 20 rendered variants, fresh permission denials, exact
preview/publication guards and the 36-template exclusion check. Independent
public reads still serve revision a80f035d4123ee097b7ae6f758d1ba55541fb36f and
unchanged practice-page content. No diagnostic temporary directory remains;
all capture and acceptance processes exited. No deployment was performed.
