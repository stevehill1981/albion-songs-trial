# Saving and publishing from the visual editor

Status: approved for implementation, 21 October 2026. The user requested draft saving and
publishing while preserving immediate/inline editing, simplicity and free service.
AGENTS.md requires agreement before a new API route or significant convention;
The user approved the small endpoint reusing the existing safeguards. No dependencies or service upgrades planned.

## Recommended design

Add one bounded, same-origin POST endpoint to the existing Astro deployment. Reuse
`createMuseumClient` from `auth/mcp/github.mjs` for repository permission checks,
content validation, GitHub drafts, concurrent-edit rejection, exact saved-preview
verification and publication confirmation. No MCP SDK, new deployment, database,
new account or wider OAuth scope. This is an adapter for the existing operations.

Alternative: invoke GitHub directly from the browser, as the current CMS does.
GitHub supports that, but browser reads of the museum version-preview HTML are
currently blocked: the tested public version URLs return no CORS headers. That
would require a new public-header convention, and client-side verification would
not preserve the existing server enforcement by itself. Prefer the small route.

## Marie's workflow

1. Sign in with the existing GitHub popup. Load the real published practice page
   from GitHub at its current main revision before enabling edits. Render its
   actual Astro blocks. Keep the independent `/editor-lab` practice copy intact.
2. Type on the page or use its fields. Updating the immediate Astro view never
   commits content or triggers a build. Use the already-tested heading/paragraph
   input behaviour; keep linked prose, image credits and calculated statistics
   structured. Retain the last successful preview for incomplete input.
3. Save draft. Say Saving until GitHub confirms the commit. Say Saved only for
   that captured document; edits made during saving remain Unsaved changes. Save
   cannot write published content directly. One write operation at a time.
4. Reopen a saved draft after reload. List the existing shared museum drafts and
   read its exact content/revision; do not assume Decap's separate unpublished
   entries are the same drafts. Show readable page labels instead of Git terms.
5. Check saved preview. Show Checking/Building until required checks and actual
   served revision agree. Open the verified full-page preview without credentials
   in its URL. Record which commit the user chose to review.
6. Publish this version. Require an explicit final action for that saved and
   reviewed commit. New edits, another save, a changed draft or changed main clear
   eligibility. The server repeats the exact-commit checks before merging.
7. Show Publishing until deployment and the actually served production revision
   match. Then show Published with a public-page link. Preserve any subsequent
   local edits. Never show Published on a successful merge alone.

Initial scope is the existing `component-preview-trial` page, not an edited copy of
`manager-darren-moore`. Its current practice content and source links must load
losslessly. Do not silently append the lab's sample section to a real manager page.
Keep broad page selection, nested-page schemas, layout authoring and new uploads
for their agreed subsequent stages. This first endpoint is explicitly limited to
the named practice page and its verified shared drafts.

## Proposed contracts and exact files

- New `src/pages/editor-api.js`: Astro on-demand endpoint; POST JSON only, exact
  Origin and bounded body; existing GitHub bearer credential, no token storage or
  logging. Fixed read/list-drafts/read-draft/save/status/publish/publication actions.
  Reject unknown operations, fields, kinds and page IDs. Verify a draft belongs to
  the allowed practice page before returning its content or allowing a write.
- New `src/lib/editor-operations.mjs`: request validation and operation dispatch,
  calling the existing shared client. No arbitrary upstream URLs or file paths.
  Return actionable sign-in, conflict, validation and uncertain-save states; do
  not turn missing permission information into access. No general GitHub proxy.
- Reuse `auth/mcp/github.mjs`. Extract only shared logic needed by the adapter;
  preserve current MCP operations and accepted document schemas. Agree any optional
  idempotency extension before changing the shared save contract. Do not blindly
  retry draft creation after a lost response: recover the exact saved operation
  from GitHub or show a clear uncertain outcome and reopen-draft path. A paginated
  absence is not proof that an earlier write failed. No paid persistence service.
- New `src/pages/editor.astro` and, if needed, a shared
  `src/components/editor/VisualEditor.astro`: reuse the existing editor structure
  and actual BlockList. Keep `/editor-lab` behaviour and notice accurate. An
  unpublished new UI is not a replacement for the normal `/admin/` editor.
- `src/editor/visual/index.mjs`: preserve selection/focus and inline editing while
  introducing an explicit read-only/loading state and document-load entry point.
  Keep the workflow outside the renderer where possible.
- New `src/editor/visual/workflow.mjs`: bounded network operations and state model;
  distinguish local edit generation, last saved document, draft commit, reviewed
  commit and publication revision. Poll only while an operation needs it; bound
  retries/time and stop polling when hidden/disposed or on a terminal result.
- `src/editor/visual/state.mjs`: acknowledge a saved snapshot without marking later
  edits saved. Loading a different record resets its independent undo history;
  saving keeps meaningful undo. Save responses cannot replace newer local text.
- `scripts/cloudflare-output.mjs`: include the new API in the existing explicit
  dynamic-route list; provision no storage/image/billing resource.
- `test/visual-editor.test.mjs`, new `test/editor-operations.test.mjs` and
  `test/editor-workflow.test.mjs`: enforce the invariants and failure cases below.
- `scripts/check-component-runtime.mjs` or a focused compiled-runtime check:
  exercise actual built route code with only the fixed GitHub requests mocked,
  as current compiled-runtime tests do. No deployed auth bypass.
- `scripts/verify-visual-editor.mjs` and build verification: preserve the normal
  editor, practice copy, archives, public markup and source/credit fixtures.

## Failure modes and acceptance

The old paths exposed stale saved-preview links, different draft lists between
interfaces, misleading merge/deploy success, duplicate/uncertain saves after lost
responses and overwritten concurrent changes. The new workflow must test each,
not merely reproduce a green transport result.

- Missing/revoked permission, hostile Origin, unsupported action, wrong page,
  foreign/different-record draft, oversized streaming body and unsafe content fail
  without a write. Existing records remain editable; do not tighten schemas as a
  side effect. Credentials never appear in errors, URLs or saved recovery state.
- Edit while saving: GitHub receives the captured document, the newer local edit
  remains dirty, and the saved revision can be reopened exactly. Duplicate clicks
  do not create two drafts. A timeout after a write does not invite unsafe retry.
- Another browser/MCP edit or advancing main produces a recoverable conflict,
  never an overwrite. Keep current local work available for comparison/recovery.
- New save/edit invalidates the reviewed commit. Failed, missing, stale or
  incorrectly hosted previews disable publication. User opens the checked saved
  preview before the final publish action. Server rejects a forged/stale commit.
- Failed/queued production stays distinct from Published. Actual public wording,
  source links, image credits and calculated results must match the approved draft.
- Unit checks must include negative controls; full build and meaningful compiled
  route checks pass. Compare old and new operations for unchanged MCP behaviour.
- Hosted preview first. Test sign-in, immediate edit, saved-draft reload, full saved
  preview and exact revision. Obtain the agreed preview-before-publication approval
  before deploying the new editor route or publishing a saved practice-page edit.
- Run a bounded hosted Free-plan cold/warm operation comparison before widening
  scope. Existing accepted MCP CPU overruns do not prove this endpoint reliable.
  If limits are exceeded, narrow the design; no paid fallback or auth weakening.
- Real browser test: type inline, save while continuing to type, reopen, check the
  correct full preview, publish an explicitly approved practice edit and confirm
  the served text/revision. Test error/retry and preserve original credits/content.
  Report IME/performance areas not actually tested. Clean task servers, caches and
  temporary fixture directories; retain evidence and push completed commits.

## Sources checked

- Existing implementation and live response headers, inspected 21 October 2026.
- GitHub browser API support:
  https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests
- Existing binding plan: `plans/2026-10-20-marie-component-editor.md`.
