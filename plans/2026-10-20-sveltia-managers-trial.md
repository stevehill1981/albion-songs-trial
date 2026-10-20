# Sveltia managers trial

Owner agreed to the recommended small managers-section trial on 20 October.
Keep the museum, normal Decap editor, archives, OAuth service and Claude connector
unchanged. The unrelated UUID/parser candidate stays in draft PR #46.

## Scope and compatibility gates

Use pinned @sveltia/cms 0.249.0, currently MIT-licensed beta, only as an opt-in
trial. Its nested-folder UI directly addresses the owner's request. No claim
that the beta is ready to replace the live editor. No paid hosting/CMS service,
new account, database or permission expansion. Approval to trial Sveltia includes
its named CMS package; stop before adding other direct dependencies.

The current custom GitHub preview backend uses getBackend/registerBackend;
Sveltia's documented API does not support those methods. The layout and image
controls also wrap built-in list/image controls; Sveltia cannot reuse those via
getFieldType. Do not read authentication storage, weaken preview authentication,
or silently rewrite the current controls to get around these limitations.

First deliver an isolated browser-editable comparison using Sveltia's test backend
and copied public manager content. Clearly label its browser-only storage (which persists across reloads).
No changes from that demo may reach GitHub or the live content. Use native
Sveltia list/object/relation controls and a styled immediate block preview. Full
saved pages continue through the actual Astro components. A live authenticated
Astro preview and checked save/publish remain explicit compatibility gates,
not features to pretend this UI comparison has proven.

## Tasks and exact files

1. Add the pinned CMS package as a build-only dev dependency in package.json and
   package-lock.json. Inspect its installed exports/assets, licence and audit.
   Keep all existing direct package versions and normal editor entry unchanged.
2. Copy only managers plus the three existing sourced manager profile pages into
   content/sveltia-trial/managers/index.json and child folders with index.json.
   Retain prose, citations and performance manager IDs; adapt only trial-local
   navigation. Add src/lib/sveltia-trial.mjs for bounded nested-path loading and
   validation, and src/pages/sveltia-trial/[...path].astro for actual Astro pages
   with breadcrumbs. Keep canonical /managers and flat profiles intact.
3. Add public/admin/sveltia.html, src/editor/sveltia-trial.mjs and
   scripts/build-sveltia-trial.mjs. Generate an isolated config/test seed and
   audited local assets at /admin/sveltia/. Extend scripts/prepare.mjs to build
   these assets without changing the existing /admin/editor/ build. Preview
   copied manager pages with the museum styles, calculated context and source
   links. Native list/object controls must edit the existing block shapes.
4. Add test/sveltia-trial.test.mjs and focused build checks: nested path safety,
   parents, preserved source/performance content, seed isolation, no production
   credentials/network writes in the demo, emitted asset references/licences,
   exact public route rendering and unchanged normal editor/archive hashes.
   Test negative cases, not just matching constants. Run clean install, tests,
   full build and audit. Use a protected draft PR/version preview first.
5. Inspect the actual trial in the browser: tree, parent-folder selection, fields,
   block order, styled preview before saving and existing calculated performance and
   citations. Show an accurate screenshot and usable preview link. Record the
   remaining live-preview/save/publish integration work before any migration.
   Ask for a separate design decision if preserving those contracts requires a
   new authentication bridge or backend pattern. Do not deploy a replacement.
6. Remove task-owned caches, test servers and build outputs after verification.
   Retain source, licences, checks and evidence. No temporary worktree is needed;
   use trial/sveltia-managers, separate from the retained security draft.

Primary docs: https://sveltiacms.app/en/docs/migration/netlify-decap-cms,
https://sveltiacms.app/en/docs/collections/entries/nested,
https://sveltiacms.app/en/docs/api and
https://sveltiacms.app/en/docs/api/field-types.

## Findings and bounded stop

- Added only @sveltia/cms 0.249.0 as a direct dev dependency. The dependency audit
  reports the same UUID/sprintf-js advisories as main, zero high/critical findings.
- The first clean install exposed a missing optional Windows ARM canvas package
  in npm's generated lockfile. Regenerating the optional dependency metadata
  fixed it; clean npm ci then passed without force or legacy-peer flags.
- Corrected two documented initialization contracts: absolute site URLs, and
  load_config_file=false for a supplied complete config. Set CMS_MANUAL_INIT
  before dynamically importing Sveltia to prevent early auto-initialization.
- Browser test passed Start Demo, seeded managers tree, three child profiles,
  Parent Folder choices, existing block controls and collection choices.
- The custom preview pane stayed blank in the in-app browser, including when
  opened directly outside the wrapper. Manual initialization did not resolve
  that symptom. The page creates a blob preview frame; no evidence yet identifies
  whether the remaining issue is Sveltia integration or the in-app browser.
  Do not claim a working immediate preview or keep stacking speculative fixes.
- Safari cross-check then timed out. A fresh browser automation process could
  not start: `failed to inspect Seatbelt writable root
  /Volumes/Data/Reference-PDFs: Permission denied (os error 13)`.
  This is an environment blocker, not evidence of a Safari/Sveltia failure.
- Keep the comparison as a draft/version preview. No production editor, auth,
  MCP or canonical history change is permitted by these incomplete UI checks.
  The native authenticated Astro preview, custom layout/image/template controls
  and full checked save/publish are unproven migration gates.
- Verdict so far: a useful nested-page UI improvement, not yet evidence that
  Sveltia saves enough integration work to justify replacing the existing editor.
