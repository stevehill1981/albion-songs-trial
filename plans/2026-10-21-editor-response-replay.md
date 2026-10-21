# Replay realistic GitHub responses locally

The owner approved merging PR 61 and proceeding with the recommended local
payload/stream comparison. PR 61 merged at 965f7f287a42069260520877a08fe0fe7b253797.
No runtime repair, live route, content write, dependency, permission or paid
service is in scope. Keep every existing access, revision and publication guard.

1. Add an opt-in public-response capture script using only eight fixed GET paths
   in the existing public museum repository. Fetch without credentials, pin all
   content/directory reads to one main revision, and reject non-public repository
   metadata, non-JSON/error responses and oversized payloads. Keep payloads and
   digests in the existing external evidence folder, not runtime content.
2. Add `scripts/test-support/editor-response-replay.mjs`. Reuse the existing fixed
   harness to validate every upstream request, then substitute fuller response
   bodies. Preserve public record base64/content bytes and complete directory
   arrays. Explicitly model local permission/branch/commit/draft fields needed by
   the fixture. A model of a write response is not an actual captured write.
   Support one response chunk or synthetic 1024-byte asynchronous chunks with
   identical bytes. This cannot recreate TLS, compression or real network timing.
3. Extend the local boundary profiler with optional replay path/delivery choice,
   preserving its compact defaults and fresh-permission assertions. Use the same
   preloaded-route condition for compact, full/single-chunk and full/chunked
   responses; three independent runtimes per workload/mode (18 retained runs).
   Each runtime has the existing 60-second bound and two measured operations.
   Capture the repeated operation whole in this follow-up; the earlier comparison
   already split its startup, and its tiny pre-fetch slices add sampling noise.
   This gives four phases per runtime, 72 retained profiles in total. Original
   four-argument profiler runs keep their existing phase contract.
   Keep mode outputs separate and require the same compiled digest for all.
4. Test byte-preserving chunking, record equivalence, fail-closed missing replay
   data, and denial of revoked permission even when public payloads are present.
   Run all tests/build, execute the bounded captures, then compiled acceptance.
   Stop on a failing capture instead of silently discarding it.
5. Record phase medians/ranges and actual sampled frames. Do not convert samples
   to hosted milliseconds or identify synthetic chunk sizes as GitHub's wire
   delivery. Verify production is unchanged apart from the separately approved
   PR 61 publication revision. Push this diagnostic change for review; no further
   merge/deployment or CPU repair is authorised by the local experiment itself.
6. Stop all task processes, verify runtime temporary directories are gone, and
   remove the temporary CI branch for PR 61 only after its commit is positively
   retained in main and its required checks have completed.

Evidence: `/Users/stevehill/WBA/verification-evidence/editor-responses-2026-10-21/`.


## Findings

The canonical comparison retained 18 successful runtimes and 72 usable phase
profiles from one compiled digest at revision 965f7f287a42069260520877a08fe0fe7b253797.
Each read checked permission/revision and made three fixture calls; each save
made nine. No actual write or authenticated public capture occurred. The full
response models deliver 13,498 JSON bytes per read and 51,797 per save. Single
mode emits 3/9 host chunks; synthetic 1024-byte mode emits 15/55. Those are host
emissions, not proof the simulator preserves each client-visible boundary.

Median active V8 samples, three ordered observations per cell:

| Mode | First read after responses begin | Repeated whole read | First save after responses begin | Repeated whole save |
| --- | ---: | ---: | ---: | ---: |
| Existing compact fixtures | 5 | 5 | 13 | 16 |
| Fuller public models, single chunks | 4 | 5 | 22 | 11 |
| Fuller public models, asynchronous chunks | 9 | 7 | 28 | 20 |

The read's pre-upstream median is 4 in every mode, while its response-processing
median changes with synthetic delivery. Payload size alone does not increase the
observed read work here. First-save response processing increases with fuller
models and with streaming. Repeated-save measurements are not monotonic with size
(16 versus 11), and ranges overlap: do not claim that larger responses always
cost more or extrapolate a hosted percentage. These small local samples suggest
transport/body handling is worth representing in tests, not that a particular
operation or startup boundary is now the proven live root cause.

All captures start after isolate creation and use a local mock service bridge.
The models serialize captured public JSON again, so they are not byte-exact HTTP
responses; the published page's base64 bytes/content and directory data remain.
Permission and branch/draft IDs are explicit synthetic fixture fields. Write
responses are models assembled from public GET data, not captured writes. The
1 ms delays, 1024-byte chunks, TLS and compression differ from real GitHub, and
bridge coalescing is possible. Missing or idle-only samples remain failures.

## Corrections and excluded runs

The first write model mistakenly carried the GET response's base64 content and
encoding into the modelled PUT result. GitHub's documented create/update response
returns file metadata without those fields:
https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents .
The model and a contract test were corrected, and only the six affected public
save captures were repeated. The earlier save evidence remains under
`superseded-write-model/` and is excluded from the canonical summary. No production
code was changed by this correction and no real save was performed.

An additional original-command read smoke failed with the expected diagnostic
assertion `An idle-only capture cannot measure the handler`; it was not counted
as zero or retried into the matrix. The original four-argument save smoke passed
with its original four phase names. That preserves the old command/phase contract,
while documenting that very short slices can still be unusable at this sampling
interval. There were 26 attempted runtimes: 18 canonical, six superseded models,
one successful compatibility smoke and one unusable read smoke. Normal runtime
finally blocks disposed them, including the failure path.

## Outcome

The useful change is a more realistic, reproducible local test foundation. Keep
the accepted production baseline and all editing safeguards intact. Do not ship
another runtime optimisation from these local figures. PR 61's merge and normal
production workflow succeeded, and its temporary CI branch was removed only
after verifying the exact commit was retained in main. This follow-up has no
further production deployment or content changes.

Full bounded row evidence: `plans/evidence/2026-10-21-editor-response-replay.json`.
Public snapshot, raw profiles, superseded models, compatibility logs and compiled
source are retained in the external evidence folder. No credentials or request
headers are retained. The replay mode is optional; existing compact commands keep
their original behaviour and guard against unusable samples.

## Final verification

All 130 tests and the final full build pass, including normal compiled editor
acceptance and OAuth/MCP checks. The rebuilt source digest matches every retained
replay capture. Independent public reads serve the approved PR 61 merge revision
965f7f287a42069260520877a08fe0fe7b253797 with unchanged practice-page content.
All diagnostic runtime directories are gone and capture/build processes exited.
The replay follow-up changes local scripts/tests and evidence only.
