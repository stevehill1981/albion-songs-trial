# Document canvas with live Astro preview

Approved 21 October: build the chosen Notion-style document canvas alongside the
actual Astro preview, retaining free service and the existing editorial safeguards.
This is a UI extension of the five-page rollout, not a new schema or API design.

1. Add `src/editor/visual/document-canvas.mjs`: render the existing editable fields
   as parent-owned document inputs. Preserve linked prose, photographs, source
   links and calculated selections as structured/read-only content. Block details
   reuse the existing field form. Never save browser HTML or reconstruct records
   from the visible text. Keep active inputs/caret during preview updates.
2. Update `VisualEditor.astro` and new `src/editor/visual/document-canvas.css`:
   searchable existing-page sidebar, block outline, writing canvas and optional
   real Astro preview. Narrow screens switch between writing and preview. Keep
   keyboard controls, labelled fields, readable errors and visible save state.
3. Integrate with `index.mjs`: one draft model drives both document fields and the
   old precise fields. Load/reset/undo refresh the document; regular typing updates
   values without replacing the active control. Fresh authenticated load still
   gates editing, and switching still warns about unsaved text. Keep the sidebar
   selected page aligned with the actual successful load, not the requested page.
4. Update the guide and built-output verification. Add meaningful model/view tests
   for linked content preservation, nested blocks, input readiness and updates.
   Run the existing workflow and compiled security checks unchanged.
5. Test real document editing, undo, block details, phone layout and preview toggles
   in a local practice copy. Verify hosted assets and public content preservation.
   Request exact-preview publication approval before deployment, then test the live
   sign-in, real unsaved Astro rendering and one separately authorised draft.

First slice includes all five supported pages and the unsaved practice lab. No
page creation, block insertion, slash commands, drag handles, reordering, nested
routes or template authoring controls are offered until those stages are built.
The sidebar is a page list, not an invented hierarchy. Other pages and structured
source editing remain reachable through the existing CMS. No new dependency,
service, permission, public content edit or paid fallback. Known cold CPU spikes
remain unchanged. Preserve the current publication controls, endpoint, renderer,
validation, uncertain-write and source/credit contracts.

## Candidate verification

- All 140 tests and the full build pass. Compiled Worker tests retain exact-source
  saving, permission checks, locked previews, preview-before-publish and exact
  revision publication controls. Built-output negative controls reject editing
  before authentication and corrupted or missing page records.
- Browser checks cover direct typing/caret, Details synchronisation, photograph
  selection and credits, undo/reset, page search, phone navigation and both
  preview layouts. Unauthenticated writing remains inert. Native Safari preserves
  multiline mixed-case input and Undo restores the exact original heading.
- Finish review: ship, no material fixes. One detector run reports only the
  incumbent Arial warning; retain the existing system-sans editor convention.
- Evidence: `../verification-evidence/editor-document-canvas-2026-10-21/`.
  Local previews cannot authenticate by design. Live sign-in, unsaved Astro
  rendering and draft save/reopen acceptance remain pending exact-preview
  publication approval. No public content has changed.
