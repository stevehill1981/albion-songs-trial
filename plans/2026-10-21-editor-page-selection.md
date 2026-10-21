# Choose an existing page in the visual editor

Approved on 21 October: extend the existing single-page API and UI to select
existing museum pages. No dependencies, paid services, schema or permission changes.

Start with the five pages already accepted by the actual Astro component validator:
the practice page, managers index and Darren Moore, Steve Clarke and Tony Mowbray.
Keep other pages in the existing form editor; do not promise their immediate preview.
Do not add creation, URL changes, nested routing or layout authoring in this step.

1. Add a shared explicit page allowlist in `src/lib/editor-pages.mjs`. Build the
   chooser from current content titles and validate every allowed page at build.
2. Extend `src/lib/editor-operations.mjs` with an optional `pageId`, defaulting to
   the practice page for existing clients. Check saved draft identity and document
   slug against that selection before returning content or writing. Preserve all
   current origin, permission, revision, scope and exact-preview checks.
3. Update `src/editor/visual/workflow.mjs` and `index.mjs` to load a chosen page,
   isolate its drafts, warn about unsaved changes and reset undo/review state.
   Keep the public link and reload URL aligned with the successfully loaded page.
   A failed switch must disable writes until a fresh page load succeeds.
4. Update `VisualEditor.astro`, `/editor` and the editing guide with clear scope
   and the real visual-editor address. Keep `/admin/` and `/editor-lab` available.
5. Test cross-page reads/saves/drafts, unsupported IDs, failed/stale switches and
   unchanged publishing guards. Run the complete tests, build and actual compiled
   route checks, then push a checked preview for publication approval.

After deployment approval, test the real browser chooser, inline preview and
draft reopening. Any public content publication still needs its checked preview.
Marie needs her own GitHub account and accepted repository write invitation;
she does not need Cloudflare access. Wider page conversion and her own handover
session remain subsequent work. Accepted cold CPU spikes remain a known Free-plan
limitation; this change neither solves them nor enables a paid fallback.

## Candidate verification

All 134 tests and the full build pass. The compiled Workers route reads and saves
an existing manager record, rejects a different selected page's draft and keeps
legacy practice-page calls working. The build checks all five source documents
and chooser entries; removing an option deliberately fails verification. Existing
source, credit, calculated-statistic and exact-publication tests still pass.

Local browser inspection confirms the five labelled choices, disabled controls
before sign-in, the actual rendered practice page and the phone-width toggle.
Authenticated browser switching/save/reopen remains to test after approved live
publication, because GitHub sign-in is restricted to the live address.

PR #62 is merged as ea7ffbdf70f3f4a80b551a1e5beb1511bd9d2673. The served
version and unchanged public practice-page content were checked. Its temporary
CI branch was deleted after confirming the commit is retained on main.
