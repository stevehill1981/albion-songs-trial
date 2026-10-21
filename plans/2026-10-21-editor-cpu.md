# Reduce visual-editor CPU on Workers Free

Status: investigation requested, 21 October 2026. The completed one-page editor
workflow is published at revision `9257e71197e78c48ad07e12794eb96655a98fe8b`.
Earlier available editor API readings reached 31 ms; successful responses do not
establish compliance with the documented 10 ms Free allowance. Keep the current
editor and exact-preview publishing safeguards intact; no paid fallback.

## Bounded investigation

1. Confirm current deployed revision/version, Free-plan constraints and CLI access.
   Reuse sanitized invocation evidence in the workspace verification folder. Do
   not repeat the earlier idle-only MCP captures or interpret missing CPU as zero.
2. Extend `scripts/check-component-runtime.mjs` with opt-in local profiling using
   the existing installed Miniflare inspector pattern in
   `scripts/check-mcp-runtime.mjs`. Keep normal builds unchanged. Profile separate
   preview, published-page read and saved-draft status workloads, with fixed
   test-only GitHub responses. Bound rounds, command waits and temporary files;
   dispose the inspector/runtime even on failure. No deployed test route or bypass.
3. Build the current source, run all existing compiled acceptance checks, and
   inspect actual V8 call stacks. Local sampling locates work but cannot certify
   hosted per-request limits. Record functions, source files and sample counts.
4. Select the smallest change supported by those profiles. Routine refactoring
   may proceed within existing contracts; ask before a new architecture, service,
   caching convention, dependency or API shape. Preserve actual Astro components,
   fresh permission checks, draft scope, concurrency, uncertain-write handling and
   served-preview/publication verification. Do not replace Astro with a second
   hand-written renderer.
5. Before implementing that change, append exact files and checks here. Run
   meaningful negative controls, all tests and the full build; push a checked PR.
   Preview approval still gates production publication. Compare bounded hosted
   read/preview/status calls before/after and after an idle interval, keeping
   unknown readings unknown. Do not publish a new content edit without its own
   preview approval. Retain rollback information and narrow after two or three
   unsuccessful attempts, rather than weakening security or widening scope.

Evidence belongs in `/Users/stevehill/WBA/verification-evidence/editor-cpu-2026-10-21/`.
Profiles contain only local fixtures, never owner credentials or content drafts.
A hosted capture, if useful, must target the positively verified running version,
run for at most 5–10 seconds and use bounded read-only traffic. Stop after an
unavailable or idle-only capture rather than repeating the earlier capture loop.

## First measured repair

The separate 60-operation local captures found `validateBlock` at 187 of 470
active preview samples, and GitHub `record` decoding at 67 of 249 active read
samples. Saved-status samples are more distributed across fetch/stream work.
These are short warm local captures, not hosted timing or a complete root cause
for cold spikes. They support two bounded repairs before changing architecture:

- `src/lib/component-preview.mjs`: remove the extra flattened `validateBlock`
  walk. `validatePage` already recursively validates every block and column child;
  the additional walk repeats sections and their children again. Keep component
  type/count bounds, `validatePage`, and BlockList's own validation intact.
- `auth/mcp/github.mjs`: replace `Uint8Array.from`'s per-character callback and
  iterator with a preallocated byte array and indexed copy. Preserve `atob`'s
  rejection rules, document size bounds and fatal UTF-8 decoding. Do not depend
  on `Uint8Array.fromBase64`, which is absent from the installed Node runtime.
- `test/preview.test.mjs` and `test/mcp.test.mjs`: verify malformed nested content,
  unsafe sources, defaults, Unicode and malformed bytes keep the same contracts.
  Existing rendered-markup and publication/security negative controls must pass.
- Repeat the same local workloads, retain both raw fixture-only profiles and
  summaries, then decide whether the evidence merits a hosted comparison.

This does not change API/data shapes, caching, dependencies, deployments or
permission checks. A larger routing or storage change would require agreement.

## Proposed next step — owner agreement pending

The first repair reduced the targeted local samples (preview validation 200 to 30;
record decoding 67 to 12), but status work stayed similar (315 versus 314 active
samples). These short independent samples are directional evidence only, not
latency or hosted CPU savings. Do not deploy them as a claim that status is fixed.

A read-only prototype through the existing GitHub CLI returned the published
practice draft's exact permission, main/head revisions, one changed file, commit
ancestry and current check rollup in one 1,337-byte GraphQL response. The current
status path obtains those facts through seven GitHub responses, plus two public
preview reads that must remain. Before implementation, ask under AGENTS.md's rule
for new architectural patterns. Proposed scope if approved:

- `auth/mcp/github.mjs`: one fixed, bounded repository/draft metadata query for
  `status` and `publish`; preserve public outputs and REST content writes. Normalize
  facts through the same inspection/check guards rather than maintaining weaker
  parallel rules. Each call checks fresh `viewerPermission`; allow only confirmed
  write/admin/maintain, and fail closed on missing permission, GraphQL errors,
  truncated connections, missing data, changed head/ancestry or mismatched checks.
- Keep two token-free public reads verifying version JSON and page markup. Keep
  exact commit/base checks, fixed repository/record scope and the conditional merge.
  The editor's pre-publication scope check and actual publication each use a fresh
  lookup; no authentication, permission, snapshot or query-result cache.
- Preserve the present body/deadline bounds, error sanitization, and uncertain-write
  handling. The fixed read-only GraphQL POST is not a content mutation. Accept no
  caller-supplied query or arbitrary endpoint, repository, URL or path.
- Update GitHub fixtures in `test/mcp.test.mjs`,
  `scripts/test-support/editor-harness.mjs` and related actual-runtime tests to
  exercise complete, partial/error, revoked-access, foreign-draft, truncated,
  stale-head/base, missing-check and unserved-preview cases. Verify unchanged tool
  response shapes and fewer upstream requests; test every old failure mode.
- Verify the existing editor OAuth credential can read these fields without any
  additional scope; CLI-owner success alone does not establish this. No new
  dependency or paid service. Profile locally first; a checked preview and explicit
  approval gate the bounded hosted before/after comparison.
