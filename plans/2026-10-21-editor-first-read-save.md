# Reduce first-read and save startup work

The owner requested the remaining first-read/save investigation after PR 56.
The published baseline is revision 43bf79a4c636bf51b7d767fe5cf285f86d02e1aa,
Worker c8fb7105-ee9a-491f-93a7-a38bdc6dff9d. Last hosted first read used 15 ms,
save 14 ms, and initial preview 11 ms; warm reads/checks used 2–6 ms.
No dependency, paid service, permission, content edit or deployment is authorised
by this investigation. Keep fresh access, immutable schema metadata, validation,
concurrency, uncertain-write and exact-preview publication checks intact.

1. Reuse the retained fixture-only fresh-runtime profiler as temporary
   `scripts/.editor-first-profile.mjs`, preserving normal compiled acceptance
   checks and the emitted-template guard. Capture three fresh-runtime reads and
   three saves sequentially, one operation each, with a 60-second process bound
   and existing 10-second inspector deadlines. Store profiles and logs in the
   existing verification-evidence directory. Reject idle-only captures.
2. Inspect sampled functions and actual compiled dependencies before selecting a
   repair. In particular check eager MCP guide/schema preparation in
   `auth/mcp/github.mjs`; the editor does not request those responses. Local
   samples locate work but do not establish hosted CPU timings or cold isolates.
3. Record the smallest supported repair and exact files here before editing.
   Routine refactoring inside existing contracts may proceed; seek agreement for
   new architecture, cache conventions, services or API/data-shape changes.
   Verify every supported schema/guide shape and immutability, fresh permission
   denials, save validation, draft scope and publication guards.
4. Run meaningful negative controls, all tests/build and repeat the same six
   captures. Inspect emitted code and retain logs. Stop/narrow rather than stack
   fixes if two attempts do not help. Commit and push checked work and present its
   exact hosted preview. Any production deployment remains gated by preview
   approval. Do not create a public or saved content test in this phase.
5. Remove the temporary runner, build/profile processes and temporary directories.
   Retain durable evidence and record what remains unproven.

## First supported repair

The six fresh-runtime baseline captures completed with normal compiled acceptance
checks. Read active samples were 219/71/108; save 114/89/133. Module initialisation,
GC and Astro routing are material in both, and freezeGuide/structuredClone appear
in their actual stacks. This is evidence of unnecessary eager work, not proof it
explains every hosted overrun.

- `auth/mcp/github.mjs`: defer the existing immutable guide and complete immutable
  block catalogue preparation until their existing public functions request them.
  Keep the same shared frozen outputs and cloning boundary; do not cache any
  permission, credential, content or operation result. This changes only when
  existing public metadata is prepared, not a cache/data/API contract.
- `test/mcp.test.mjs`: a fresh child runtime must import and perform a permitted
  read without preparing the guide/catalogue; first explicit guide/schema calls
  prepare the same deeply immutable metadata and repeated calls reuse it. Denied
  guide/schema calls must still fail on fresh access. The negative test must fail
  on the old implementation. Existing complete-field/parity and mutation tests
  continue checking all templates.
- Rebuild and repeat the identical six captures before judging the candidate.
  Inspect emitted module initialisation, not just source. Keep other suspected
  work (Astro startup, encoding and request parsing) separate from this repair.

## Candidate verification before hosted comparison

The new fresh-runtime test failed on the baseline with the expected assertion
`Importing the editor client must not prepare unused authoring metadata: 2 !== 0`.
After the repair it passes, including read behaviour, denied access, fresh permission
lookups, repeated-call identity and recursive immutability. An independent import
of the exact published github.mjs confirms byte-equivalent JSON/data for the guide
and every supported block schema. All 125 tests and the full build pass, including
compiled saving, checked-preview/exact-revision publishing, public publication
verification, OAuth/MCP acceptance and all 36 template-exclusion checks.

Three identical independent fresh-runtime read captures changed from 219/71/108
active samples to 33/21/26 (medians 108 and 26). Three saves changed from
114/89/133 to 39/59/76 (medians 114 and 59). All twelve captures had non-idle
samples and completed compiled acceptance afterward. freezeGuide had 22 self
samples across the six baseline captures and zero in the six new captures; actual
emitted editor code also moves both clone/freeze calls inside the requested
functions. This removes measured unused work without changing authentication,
validation, save/concurrency or publication code. These small local samples are
not hosted milliseconds, complete attribution or proof of Free-plan reliability.

Retain the candidate for exact-preview review and a separately approved bounded
hosted comparison of first read and save. Production remains at the baseline;
no saved content test or further deployment occurred in this phase. Evidence is
in first-read-save-{before,after}-*.cpuprofile/.log,
first-read-save-comparison.json, first-read-save-metadata-parity.json and the
first-read-save-test/build logs in the existing verification-evidence directory.
The temporary runner is removed after retaining its exact source. Runtime-owned
temporary directories were disposed by the runner's finally block each time.


## Approved hosted comparison and rollback

The owner approved publishing PR 58 and one unpublished practice-page draft,
closing it afterward, with rollback if access broke or reliability worsened.
The protected merge was b1b8e0e8b6b01bc6a575cb0c2c28a6a2cd4fd01a; its production
workflow 39600284688 passed. Worker 9b368f5e-481a-47d2-802c-80700928057e served
the candidate from 12:32:29 UTC on 21 October 2026. The earlier exact rollback
version was recorded before deployment. No auth/MCP Worker was deployed.

Safari's existing GitHub sign-in, initial content read, immediate preview and
single save all succeeded. Draft 59 changed only its clearly named test heading;
its head was 09202d7b0ec3d9bacae3fcd528fa6020cba0b590. Sources, credits and
calculated results were unchanged. The draft build and preview checks passed.
It was closed without merging and its branch remains recoverable. No content
was published. The task-owned Safari tab disconnected and closed afterward.

The final candidate log contains 12 authenticated successful requests, all HTTP
200/outcome ok: initial read 22 ms, initial preview 22 ms, edited preview 9 ms,
the single save 26 ms, and readiness/status reads 12/4/3/3/4/3/3/5 ms CPU.
One unauthenticated preview returned 401 and is excluded. This is not a matched
randomised experiment or proof that the refactor caused the increase, but it
failed to establish a hosted benefit over the earlier first read 15 ms/save
14 ms baseline. Local sample improvements must not be presented as live savings.

As authorised, restore the previously verified Worker, not another speculative
fix. Deployment f5f75fe0-9968-4592-9489-8975bb15f1f1 restored version
c8fb7105-ee9a-491f-93a7-a38bdc6dff9d to 100% at 12:35:26 UTC. Independent
public reads confirmed revision 43bf79a4c636bf51b7d767fe5cf285f86d02e1aa and
identical practice-page content. The retained older comparison HTML had a
612d809 revision marker; the initial exact comparison rejected that expected
marker difference, then the check explicitly substituted the known rollback
marker and passed. A browser observation timed out once, reconnected, and then
positively confirmed the restored version's saved-preview check. Two restored
status observations used 19/16 ms and succeeded. The CPU issue is still open;
there is no Free-plan headroom guarantee for either version.

Complete the source rollback as part of the authorised restoration:

1. Restore auth/mcp/github.mjs and test/mcp.test.mjs byte-for-byte from revision
   43bf79a4c636bf51b7d767fe5cf285f86d02e1aa. This reverts the candidate and its
   associated startup-only regression test together; all baseline tests remain.
2. Preserve this investigation and the earlier outcome record. Run all baseline
   tests/build, verify only the two baseline files plus this record differ from
   the candidate, and use the protected PR preview/check process to merge the
   exact source restoration. No further feature, dependency or pattern change.
3. Verify the resulting site uses the restored implementation and unchanged
   content. Retain the old rollback version until completion. Stop here and
   propose a narrower diagnostic rather than stack another unmeasured repair.

Evidence: first-read-save-{rollback,deployed,production-proof,hosted-final,
rollback-check,restored}.json and first-read-save-restored-editor.png in the
existing verification-evidence directory. All credentials and raw request bodies
are excluded from the saved telemetry.
