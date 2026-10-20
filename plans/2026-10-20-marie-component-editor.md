# A component editor for Marie

Status: design proposal, 20 October 2026. Planning is authorised; implementation,
new dependency declarations, API contracts and nested-page schema changes still
require agreement under AGENTS.md. No production changes accompany this plan.

## Intended result

Marie signs in, chooses a page from a tree, clicks its content to edit, sees the
result, saves a draft and publishes the exact version she checked. She can create
child pages, assign museum collections, arrange supported blocks and save layouts
for another page. Preserve the Albion design, evidence labels, sources, credits,
all existing URLs and the separate competitive/wartime archives.

Build a museum editor, rather than a general website builder. Maintenance is ours;
free hosting does not make the engineering or ongoing browser testing free of effort.

## Choice to agree

1. Recommended: guided visual editing. Click any supported block to open its short
   form beside the page. Then add direct typing for plain headings and simple text,
   with the same form available for accessibility and precise editing. Use explicit
   controls for links, credited images, collections and calculated statistics.
2. Simpler: page preview with forms only. Lower implementation cost, but less of the
   in-place experience Marie wants. Useful as the first engineering checkpoint.
3. Full canvas: arbitrary resizing, placement and rich-text editing everywhere.
   Defer: selection, undo, mobile layouts, accessibility and pasted markup make this
   a much larger product. Existing sections and one-to-three columns meet our scope.

Recommend option 1, delivered through the form-first checkpoint in option 2.

## Marie's screen and actions

- Left: Pages tree, Collections, Layouts and Images; search and New page.
- Centre: the rendered site at desktop or phone width; clearly labelled editing
  versus browsing mode so clicking a link is never confused with editing it.
- Right: fields for the selected block; collapse this panel when not needed.
- Top: Undo/Redo, save state, Save draft, Check preview and Publish.
- New page: choose a parent, choose a layout, name it and see the proposed address.
- Layouts: arrange sections, columns and blocks, then Save as layout directly.
  Creating from a layout makes an independent copy; later template changes never
  silently change existing pages. Keep current wording/citations when duplicating;
  make copied content explicit so Marie knows what needs replacing.
- Move blocks with accessible Move up/down and Move to section controls first.
  Drag and drop is optional later, never the only way to organise a page.
- Page tree and topic collections are independent: parent determines location;
  collections can gather pages from different branches.

## Reuse rather than replace

Confirmed existing foundation:

- `src/components/blocks/{BlockList,Intro,TextPanel,Photograph,Section,ManagerPerformance}.astro`.
- `src/pages/editor-preview.astro`, `src/lib/preview-request.mjs` and
  `src/lib/live-preview.mjs`: authenticated real-component rendering, validation,
  cancellation and rejection of stale responses.
- `src/lib/blocks.mjs`, `editor-schema.mjs`, `content.mjs`, `layout-copy.mjs`:
  content definitions, validation, collections and independent template copies.
- `auth/worker.mjs`: existing browser GitHub sign-in. Inspect its origin/token
  contract before reuse; do not assume the new UI can inherit Decap internals.
- `auth/mcp/github.mjs`: checked draft/save/publish logic. Extract/reuse pure
  operations only after agreeing a browser-facing contract; its current MCP
  entry points and one-record draft restrictions are not a drop-in browser API.
- Existing credited image records, build checks and protected GitHub publication.

Use the existing stable React/Vite installation for the editor shell if suitable;
add no dependency during the first spike. Keep the public site in Astro. No new
CMS service, database or separate deployment is planned. Retain Decap as the
working editor until all replacement acceptance checks pass. Keep PRs 46 and 47
separate; their experimental dependency changes are not prerequisites.

## Immediate and in-place preview

Astro components render on the server/build, not as browser-reactive components.
Retain one authoritative Astro rendering path. Do not recreate every block's markup
in React just to claim instant preview.

First checkpoint: selected block form changes update the actual Astro preview
without saving, committing or rebuilding. Preserve selection, scroll and the last
successful render; show incomplete/invalid fields without blanking the page.
Use cancellation, latest-response checks and a short debounce already supported.
Measure observed latency; aim for a settled preview within one second for ordinary
edits, but treat this as a usability target rather than a current guarantee.

Then add editor-only field markers to the same components. Click selects a stable
block/field identity. Permit native inline typing for plain text only, immediately
updating the draft model; re-render through Astro after a pause or on blur. Retain
caret/selection during reconciliation and never replace the active edit node on
an asynchronous response. Structured linked prose remains in a small form until a
lossless editor exists. Do not flatten `parts` arrays into plain text or save DOM
HTML as content. Handle composition/IME, paste, undo, focus and Escape explicitly.
Calculated performance, source evidence and image credits retain structured controls.
All editing markers and overlays are absent from public output.

Full-page saved build preview remains the publication check. Block preview is not
proof that navigation, interactive widgets and all assets work on the final page.
Legacy museum blocks still use older renderers: inventory and convert them in small
verified groups before promising immediate Astro editing for the whole museum.

## Nested pages: proposed compatibility design

Keep current flat record identities and filenames; add a separate optional hierarchy
manifest rather than rekeying existing page JSON by filesystem paths. It maps stable
page IDs to parents, sibling order and explicit public routes. Existing entries without
metadata retain current routes. This is a proposed new structure, not yet approved.

Validate cycles, missing parents, duplicate routes, reserved paths, unsafe segments
and depth. Start with four levels of pages; confirm with real museum examples.
A tree reorder changes display order only. Moving an existing page never silently
changes its URL. Show a separate Change address action with affected descendants,
links and redirects, and publish that operation atomically after a checked preview.
A new child can use `/managers/name`; existing flat manager routes stay available.
Parentage alone does not automatically insert a menu link or alter a collection.
Before introducing nested routes, agree redirect support and how multi-file drafts
extend the current one-record protection. Migration must preserve old MCP clients
and existing records; stricter validation applies to new writes without stranding
previously valid content. Do not expose move/delete until these protections work.

## Drafts, images, safety and free operation

Keep one authoritative JSON draft state with undo/redo. Local recovery is best-effort
and labelled This browser; Save draft means GitHub has confirmed the revision.
Show unsaved, saving, saved and failed states distinctly; warn before leaving edits.
Do not put credentials in recovery storage or logs. Recheck repository write access
for server operations and fail closed when identity/permission lookup is missing.
Reject concurrent changes instead of overwriting another editor's work.

Reuse the credited library. New image files and their credit record must travel in
the same checked draft before publication; temporary local thumbnails must not be
mistaken for permanent asset URLs. Retain size/type limits and source validation.

Publish requires the current saved commit, passing required checks, verified served
preview and an explicit final action. Show Publishing until the production revision
is actually served. Preview stale or still building means Publish stays unavailable.
Retain source/credit/uncertainty labels and calculated numbers throughout edits.
MCP and browser must eventually share the same validation and publication rules;
unify draft visibility deliberately rather than assuming Decap/MCP drafts coincide.

Keep the public site/editor static on the existing free address. Only sign-in,
authorised preview and necessary editorial operations invoke existing dynamic code.
No plan upgrades, paid image service or paid rich-text framework. Current Workers
Free allowances bound dynamic work; exceeding them can interrupt editing, so measure
cold and warm requests and a normal session before widening the trial. The accepted
MCP CPU limitation is not evidence that the new editor is reliable. A failed free
runtime gate means narrow the workload/design, never silently upgrade or bypass auth.

## Staged work and verification

Each stage is a small checked change. Proposed new filenames are explicitly new.
No stage is complete based on a build/deployment status alone.

1. **Contracts and preservation.** Inventory every block in `src/lib/blocks.mjs`
   and its real renderer; record existing failure modes below. Agree hierarchy and
   browser draft contracts before editing schemas. Add preservation fixtures to
   `test/editor-route.test.mjs` and preview tests only where they test new behaviour.
2. **One-page editor spike.** Add proposed `src/editor/museum-editor.mjs` and an
   isolated editor entry, plus focused draft-state/selection modules under that
   directory. Adapt `scripts/build-editor.mjs` only after agreeing entry isolation.
   Open a copied manager page; edit heading, text, photo selection and one section
   using actual `/editor-preview`. No save or production replacement at this stage.
   Verify keyboard use, narrow screen, focus/scroll, invalid drafts, offline/retry,
   and stale responses. Measure deployed CPU and interaction latency cold/warm.
3. **Direct text trial.** Add optional editor metadata to the six existing Astro
   block components and selection/inline adapter in the new editor directory.
   Verify paste, linked-text preservation, IME, undo/redo, fast typing during delayed
   responses, blur/Escape and zero editor metadata on public pages. Stop here if
   it harms input reliability; click-to-edit forms remain a useful outcome.
4. **One real draft through publication.** Agree browser operation boundaries around
   `auth/mcp/github.mjs` and `auth/worker.mjs`; reuse permission and revision checks.
   Save one practice-page draft, reload it, check its exact served build preview,
   obtain publication approval and confirm production content/revision. Test revoked
   access, stale draft, main advancing, failed build and retry without duplicate PRs.
5. **Tree, layouts and assets.** After schema/API agreement, add proposed
   `src/lib/page-hierarchy.mjs`, `content/settings/page-hierarchy.json` and
   `test/page-hierarchy.test.mjs`; adapt `src/lib/content.mjs`, public routing and
   build checks. Extend existing template/image operations for the new UI. Test
   nested creation, collisions/cycles, no lost old URLs, atomic changes, copying
   layouts without shared mutation, image draft+credits and collection membership.
6. **Expand and hand over.** Convert remaining legacy block renderers with parity
   tests; extend the new editor across collections/settings. Marie completes the
   tasks below before promotion. Keep the previous editor as rollback until accepted;
   remove old runtime/dependencies later in a separate approved cleanup.

Old-system failure modes to test against the replacement: blank preview; stale saved
preview links; invalid draft clearing output; lost focus/scroll; missing interaction
scripts after refresh; unsaved images looking published; templates copying stale
wording; page address changes breaking links; invisible drafts between interfaces;
concurrent overwrite; unclear publication status; free CPU/request limits.

Handover tasks for Marie, without a terminal: find a page; edit and undo; create a
child from a layout; attach a collection; upload a credited photo; rearrange blocks;
save a new layout; recover a draft after reload; preview desktop/phone; publish the
checked revision; confirm the public page; restore earlier wording as a new draft.

After two or three unsuccessful fixes to the same symptom, stop and narrow the
trial. Retain current editor. Clean task servers/build caches and preserve evidence.

## Sources checked on 20 October 2026

- Astro component rendering: https://docs.astro.build/basics/astro-components/
- On-demand preview: https://docs.astro.build/en/guides/on-demand-rendering/
- Free static hosting versus dynamic requests:
  https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- Dynamic free allowances: https://developers.cloudflare.com/workers/platform/pricing/

No code, dependency, runtime contract or live content changes are part of this plan.

## Approved first prototype

On 20 October the user approved click-to-edit followed by simple in-place typing.
The isolated route is `src/pages/editor-lab.astro`; its client lives in
`src/editor/visual/{index,state,auth}.mjs`, with tests in `test/visual-editor.test.mjs`.
Use plain browser modules bundled by Astro; no new dependency or separate build
entry is necessary. Initial markup renders through the actual BlockList component.
Editor-only selection markers are added inside the sandboxed preview document,
so public component markup and the existing preview API remain unchanged.

The existing popup origin contract accepts the configured production origin only.
The client checks that origin before opening sign-in; it does not expand origins,
read Decap storage or introduce a token relay. Tokens remain in memory. A version
preview can demonstrate its seeded Astro page and local fields, but authenticated
unsaved preview/typing needs an approved same-origin test deployment or a separate
authentication design decision. Local compiled-runtime tests may mock only the
fixed GitHub permission lookup, following the existing test convention.

No draft persistence, save/publish controls, routing schema or production editor
replacement is included in this first checkpoint.

### First checkpoint verification and remaining gates

- Local full suite: 79 tests passed. Four new tests exercise grouped undo/redo,
  lossless citations and manager selection, draft/source isolation, invalid draft
  recovery, nested fields and rejection of spoofed popup responses.
- Full build passed, preserving 5,842 competitive and 266 wartime records. The
  actual compiled Astro Worker rendered 20 draft variants, including visual draft
  edits/undo, with matching public markup and retained auth rejection tests.
- Built editor verifier checks the original sourced blocks, actual initial Astro
  HTML, complete museum stylesheet stack and memory-only auth client. A corrupted
  seed negative control failed as intended.
- The UI detector reported its generic Arial warning. This is an operating UI
  using familiar controls; no public typography or identity was changed.
- Browser automation could not start: `failed to inspect Seatbelt writable root
  /Volumes/Data/Reference-PDFs: Permission denied (os error 13)`. No screenshot,
  measured editing latency, caret/IME/keyboard acceptance or hosted CPU claim is
  available. Source inspection is not a substitute for this acceptance.
- Keep this checkpoint in a draft PR. Do not promote it or call direct typing
  verified. Next: restore browser access, test the initial UI at desktop/phone,
  then obtain approval for a same-origin isolated lab deployment (or agree a
  separate auth testing design) before the real sign-in/unsaved-render test.
  Neither live editor replacement nor expanded auth origins is authorised here.
