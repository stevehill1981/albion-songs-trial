# Source-built museum editor: security plan

Keep the public museum, content formats, GitHub sign-in, checked previews,
publishing checks, Claude connector and free hosting intact. Build Decap from
its modules rather than modifying or copying its precompiled distribution.
The opt-in candidate and listed dependency declarations were approved on 20 October 2026. Promotion remains gated on workflow acceptance.

## Chosen direction and recommended scope

Use the existing Decap core, GitHub backend and the controls the museum actually
uses. Reuse Vite, which already builds the authentication service. Keep the
current editor live while an opt-in candidate is tested on the same origin.
Do not rewrite the CMS or add a second backend/service.

The alternative is rebuilding the complete decap-cms-app with every default
backend and widget. That changes less registration code but retains unused
Markdown, rich-text and external media integrations, including the paths to trim
and Plate. Prefer the selective module build for the full existing experience.

### Preserve these contracts

- Configured controls: string, text, number, boolean, select, list, object and
  relation; native image is also required by the custom museum image control.
- Museum controls: layout-blocks, museum-image and answer-choice.
- Existing window.CMS, window.h and window.createClass compatibility, manual
  initialisation and the registered GitHub backend contract.
- Every existing collection, template, photograph credit, draft record and
  saved-layout operation. No data migration or new editable fields.
- Native Astro inline previews, fallback block previews, checked saved previews,
  required status names and exact-revision publishing checks.
- English UI, keyboard navigation, image uploads/thumbnails/dimensions and
  existing upload limits. Keep all generated CSS, chunks and WebAssembly files
  required by those operations; validate their served URLs and content types.

### Dependency declaration proposed for approval

Add these explicitly pinned modules for the candidate; remove the umbrella
decap-cms dependency only at promotion so clean installs can still build the
unchanged main editor.
All are already present locally. Registry checks on 20 October 2026 confirm these
installed versions are the current stable tags:

| Package | Version |
| --- | --- |
| decap-cms-core | 3.20.1 |
| decap-cms-locales (separately approved) | 3.9.0 |
| decap-cms-backend-github | 3.9.1 |
| decap-cms-widget-string | 3.3.4 |
| decap-cms-widget-text | 3.3.4 |
| decap-cms-widget-number | 3.4.4 |
| decap-cms-widget-boolean | 3.2.4 |
| decap-cms-widget-select | 3.4.4 |
| decap-cms-widget-list | 3.6.5 |
| decap-cms-widget-object | 3.7.5 |
| decap-cms-widget-relation | 3.7.4 |
| decap-cms-widget-image | 3.4.5 |
| react / react-dom | 19.3.1 |
| create-react-class | 15.7.0 |
| vite (explicit build dependency) | 8.3.4 |

Native image brings its file control as an existing transitive dependency.
Review peer requirements during a clean install; stop before introducing any
additional package, shim or forced major override not covered by this list.
Keep package-lock.json authoritative. No paid editor, CDN, build service or
hosting upgrade is needed by the design. Free build/hosting limits still apply.

## Implementation sequence after approval

### 1. Build an opt-in candidate

New files: src/editor/index.mjs (explicit registrations and compatibility globals),
scripts/build-editor.mjs (Vite build and dependency/module report), and
public/admin/rebuild.html (loads candidate assets and the existing preview.mjs).
Modify package.json/package-lock.json for the declared dependencies; modify
scripts/prepare.mjs to generate the candidate without replacing the existing
/admin/ entry; ignore generated public/admin/rebuild/ output in .gitignore.

Generate registration coverage from the existing CMS config, including custom
controls' native image/list dependencies. A newly configured unsupported widget
must fail the build rather than silently render an unknown control.

Verify npm ci, dependency audit and all current tests/build. Inspect the actual
bundle module report: trim/legacy Markdown and Plate must be absent, not just
unregistered. Test all emitted chunks/assets; do not infer a security fix from
package-lock changes. Exclude unrelated backends/media integrations. Retain
upstream licence notices. If Vite needs unsupported loaders or polyfills, stop
and propose the smallest concrete addition rather than stacking workarounds.

### 2. Verify the existing experience before changing the main editor

New tests: test/editor-build.test.mjs and scripts/check-editor-runtime.mjs.
Extend scripts/verify-build.mjs for generated entry, asset references and widget
coverage. Verify tests reject a missing required control, missing emitted asset
and a forbidden vulnerable module. Preserve all historical data/hash checks.

Use a checked PR preview to inspect the login screen and generated asset URLs.
For real sign-in and workflow acceptance, first deploy only the opt-in candidate
at /admin/rebuild.html on the established production origin. Keep /admin/ on the
known working editor. GitHub's callback remains unchanged: version-preview
origins cannot complete the current editor OAuth handshake, so do not weaken
origin checks just to test a candidate there.

With the owner's account, check login, existing page fields, new pages, nested
columns, template copy/save/apply, collection relations, photograph upload and
credits, native previews and the full saved preview. Use an approved practice
page revision for the publish test; confirm the exact revision on the public
site. Preserve/recover test content and assets deliberately. Do not publish a
new historical claim as test data.

### 3. Promote only the verified candidate

After the checked preview and owner workflow acceptance, modify
public/admin/index.html to load the source-built entry and remove the old
precompiled-copy step from scripts/prepare.mjs. Update README.md and relevant
build checks. Remove the temporary candidate HTML/path after handoff.

Use the normal protected PR/check/preview/merge process. Verify the actual served
editor digest, all lazy assets, the public museum revision and unchanged OAuth
and MCP access boundaries. Recheck Dependabot after its dependency graph scan.
Remove task-owned temporary caches/builds/processes and retain verification
results in plans/evidence/.

## Security acceptance and remaining alerts

- High-severity trim: its dependency path and shipped module must both disappear.
  Retain a bounded hostile-input negative control against the old implementation;
  no exploit input is sent to the public editor or another user's browser.
- Plate: excluding the unused rich-text widget should remove the dependency
  and emitted code. Confirm through both clean dependency tree and module report.
- UUID: core still requires the 8.x line. Version 11.1.1 fixes the reported
  v3/v5/v6 buffer issue, but a forced major override needs compatibility design.
  Inspect actual emitted calls and supported upstream options before proposing
  a fix or claiming a non-reachable path. No automatic alert dismissal.
- sprintf-js: no patched release is listed. It remains under core's gray-matter
  YAML dependencies even if its CLI-only path is absent from browser output.
  Record lockfile exposure separately from emitted/runtime exposure. Seek an
  upstream compatible dependency fix; do not silently force a breaking js-yaml
  major version or label the alert fixed solely because a bundle omits it.

Do not promise all four alerts will close from this rebuild. The release gate
for the first security change is removal of trim without regression; remaining
alerts require an explicit, evidenced disposition. Keep new modules/unsupported
features disabled until both build and workflow checks pass.

## Rollback and stop conditions

The known editor stays live during the candidate phase. If the candidate cannot
preserve current behaviour, discard its deployment and return to the known
editor; do not promote a partially working CMS. Retain the previous public Worker
version and checked source revision before promotion. Rolling back to the old
editor also restores the known trim exposure, so it is recovery rather than a
security fix and must be reported as such. After two or three failed attempts at
the same build problem, stop and narrow the design under AGENTS.md.

Official reference for module-based Decap usage:
https://decapcms.org/docs/install-decap-cms/ and
https://decapcms.org/docs/custom-widgets/. The selective registrations follow
Decap's installed packages/decap-cms-app/src/extensions.js convention.

## Investigation evidence (before changes)

- Live `/admin/decap-cms.js` matches upstream installed 3.17.1 byte for byte:
  4,855,393 bytes, SHA-256
  `95e216ad2ec85d48993e000e3b876ce95ad01b161a4f4652d9eb21b4664e93dc`.
- Source map identifies trim 0.0.1 in module 93729. A second similar regex is
  in dom-helpers/removeClass after whitespace collapsing; do not replace global
  text patterns or claim all similar expressions are the trim module.
- Bounded Node probe with `x` + 100,000 spaces + `x` times out after one second
  with installed trim 0.0.1. The official npm trim 0.0.3 completes the same
  probe and agrees with native trim/trimStart/trimEnd on ordinary strings.
- Official 0.0.3 npm integrity:
  `sha512-h82ywcYhHK7veeelXrCScdH7HkWfbIT1D/CgYO+nmDarz3SGNssVBMws6jU16Ga60AJCRAvPV6w6RLuNerQqjg==`.
- npm audit reports four underlying advisories; its 36 affected packages include
  propagated parent-package findings, not 36 independent security defects.
- Other advisories: Plate HTML parsing (fixed 53.3.11; installed 49.2.21), UUID
  buffer bounds (fixed 11.1.1; installed 8.3.2), sprintf-js unbounded precision
  (no patched version). Avoid blind major overrides or npm audit fix --force.
- Root editor source map includes Plate; it does not list sprintf-js/argparse.
  These observations do not by themselves establish complete non-reachability.

References: https://github.com/advisories/GHSA-w5p7-h5w8-2hfq,
https://github.com/advisories/GHSA-qrfj-mgw8-j9c6,
https://github.com/advisories/GHSA-w5hq-g745-h8pq,
https://github.com/advisories/GHSA-hp3w-g68c-fv3c.

No dependency or production-code change has been made. The guarded repair was
declined in favour of planning the source-built editor described above.

## Approved promotion: 20 October 2026

Owner acceptance passed on the production-origin candidate: existing sign-in,
page edit and immediate Astro preview, nested columns/backgrounds, photograph
relations and credits, template copy/paste, collection choices and image upload
with dimensions. Unsaved template and image tests were discarded. PR #44 changed
only the practice-page heading; the owner approved its checked preview and the
candidate published it through the normal workflow. Live revision
`1b8b7a8730f781f05e0e148497bee8b1abbaf66a` passed production checks, exact-revision
and preview-authorisation checks; both match JSON archives were byte-identical.
The owner then explicitly approved making this editor the default and removing
the old umbrella dependency. Encoder WASM was build-validated; not every image
codec was separately exercised in Safari.

Promotion tasks:

1. Switch `public/admin/index.html` to the checked module entry, remove
   `public/admin/rebuild.html`, and generate assets at `/admin/editor/` in
   `scripts/build-editor.mjs`. In `scripts/prepare.mjs`, remove the old copy step
   and remove obsolete generated bundle/candidate files so incremental builds
   cannot ship them.
2. Remove only `decap-cms` from `package.json`/`package-lock.json`; preserve the
   approved pinned modules. Verify a clean install and audit. Update
   `scripts/verify-editor-build.mjs`, `scripts/verify-build.mjs`, relevant tests,
   `.gitignore` and README for the promoted entry and positive rejection of old
   bundles. Preserve asset hashes, module coverage, licences and image encoders.
3. Run tests and full build, including negative controls; compare archive files
   and content against the accepted main revision. Push a small protected PR,
   inspect its exact preview assets and revision, and merge only after checks.
4. Verify the live editor entry and all emitted asset digests, absence of the old
   bundle, preview permission boundaries and unchanged archive hashes. Recheck
   GitHub's alerts after its dependency scan. Retain the pre-promotion source
   revision above for rollback; if workflow behaviour regresses, revert this
   promotion through the protected process and report the restored exposure.
5. Record outcomes and remaining alerts, and remove task-owned build/cache files
   and processes. No paid plan, new service or new package is authorised/needed.

Local promotion verification passed: clean `npm ci`, all 75 tests and the full
build, including 18 Astro draft variants, authenticated MCP/OAuth checks and five
editor negative controls. The lockfile loses 281 entries with no new packages or
version changes. The editor still has 1,252 audited modules and five exact assets;
trim, Plate, UUID and sprintf-js are absent from its emitted module inventory.
Both embedded image encoders validate. The audit reports zero high/critical
vulnerabilities and two underlying moderate advisories (UUID and sprintf-js),
propagated through 12 package entries. Existing upstream peer-range, deprecation
and direct-eval warnings remain visible; no forced overrides were used.
