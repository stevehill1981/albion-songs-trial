# Reusable Astro CMS and complete site structure

We want Marie to manage the complete museum through the document editor and want
to reuse the CMS on other Astro sites. The next architecture needs agreement
before changing schemas, routing, dependencies or publishing behaviour.

## Current limits

`src/lib/editor-pages.mjs` permits five records. `src/pages/[slug].astro` generates
flat page routes. `src/lib/content.mjs` ties filenames to slugs and reads only the
top level of the page directory. `src/lib/block-schema.mjs` validates those slugs
as identifiers. Nested pages require coordinated changes, not just a tree UI.

`src/lib/component-preview.mjs` supports five native block types. The other museum
pages use additional blocks and legacy rendering. `src/lib/content.mjs` also reads
navigation, collections, templates and specialist data. Exposing these records
must not imply that all of their content already has immediate Astro preview.

## Proposed scope

- A complete site tree with create, duplicate, move, rename, order, archive and
  restore operations. Keep stable page identity separate from URL segments and
  parent relationships. Check reserved paths, collisions, cycles, missing parents
  and the effects of moving a whole subtree before saving.
- Page nesting controls URLs and breadcrumbs. Navigation visibility and order
  remain explicit. Collection membership describes related content and does not
  silently move pages or change their addresses.
- Preserve current public addresses and anchors during migration. Address changes
  need redirect previews and atomic publication of affected pages, links and
  navigation. An empty or incomplete inventory cannot remove existing pages.
- A document canvas with add, move, duplicate and remove block controls; sections
  and columns; named reusable layouts; collection membership; page metadata; and
  a credited asset library. Marie assembles layouts from supported components.
  Developers register new Astro components and their fields; the CMS does not
  accept executable Astro source as editorial content.
- One authoritative component/field catalogue for validation, editor controls,
  Astro preview, saved templates and MCP discovery. Avoid duplicating renderers.
- All museum content must have a migration route. Specialist archives and
  calculated results remain validated data, with separate competitive and wartime
  totals. Generated collection, image and template routes must be inventoried too.
- Retain fresh permission checks, server validation, conflict detection, uncertain
  save handling, verified preview and exact-revision publication. Multi-record
  structural changes need the same protections as a single-page draft.
- Reuse through per-site configuration for components, fields, content collections,
  branding and deployment. Keep independent repositories and access boundaries.
  Prove reuse on a second small fixture before extracting a distributable package.
  Do not introduce a central multi-site account service.
- No paid service or plan. Assess request, build, storage and media limits under
  the intended free deployment; reaching a quota must not activate billing.

## Package decision before implementation

Compare the working editor with Keystatic against the same acceptance case before
committing to a generic custom CMS. Keystatic documents GitHub storage, nested
slugs and content components. These capabilities alone do not establish a full
page tree, matching Astro preview or our publication safeguards.

Sources checked 21 October 2026:

- https://keystatic.com/docs/github-mode
- https://keystatic.com/docs/path-wildcard
- https://keystatic.com/docs/content-components
- https://docs.astro.build/en/guides/cms/
- https://tina.io/pricing
- https://cloudcannon.com/pricing/

Tina currently lists a two-user free tier and paid editorial workflow offerings;
CloudCannon lists paid plans. Neither is established as a replacement satisfying
this project's free workflow. StudioCMS is another Astro-specific candidate, but
its hosting and editing fit have not been verified. Do not claim any package
passes before testing it.

The bounded comparison uses a disposable local fixture and no live migration.
Installing Keystatic requires explicit approval for its dependency declarations.
Adopt it only if it reduces the work while passing the acceptance case; otherwise
write the case for continuing the existing editor. No rewrite based on a feature
list, and no migration merely because a package exists.

## Delivery order after agreement

1. Inventory every route, page, collection, template, asset and data source using
   `src/lib/content.mjs`, `src/lib/museum-content.mjs`, `src/pages/`, `content/`,
   `site.json` and the existing build checks. Record current public links and
   source content as a preservation baseline.
2. Run the package comparison. Document failure modes and verify them against
   each candidate: lost fields, mismatched preview, direct publication, stale
   permission, stale draft, broken moves, incomplete trees and free quota failure.
3. Agree the selected page identity, hierarchy, routing and migration design.
   Extend `src/lib/block-schema.mjs`, `src/lib/content.mjs`,
   `src/lib/editor-schema.mjs`, `src/lib/editor-operations.mjs`,
   `src/lib/editor-pages.mjs` and the page route together as required by the
   selected design. New files and exact tests belong in that implementation plan.
4. Replace the five-page rollout boundary with a validated inventory. Add tree and
   structural draft operations through `VisualEditor.astro` and `src/editor/visual/`.
   Test recovery and permissions, including failed/missing lookups and concurrent
   edits. Do not relax the allowlist without replacing its security role.
5. Migrate remaining block families to shared Astro rendering in small verified
   groups. Then add block assembly, template management, collection settings,
   navigation and media controls. Preserve readable existing records as schemas
   evolve; tighter checks apply to new writes rather than stranding old content.
6. Verify a second site fixture with different components and collections. Only
   then extract a reusable package and write its integration contract.
7. Publish each checked increment only after exact-preview approval. Complete real
   browser acceptance with recoverable test drafts before replacing working tools.

## Acceptance case

Marie can create a child page, choose a layout, add credited content, change a
heading and see the actual Astro preview immediately. She can save, reopen and
check a draft before publishing it. Moving the parent shows all affected URLs and
redirects; the whole approved change publishes together. Previous links continue
to resolve. A conflict or missing permission prevents the write without losing
her local work. Archiving is recoverable. A second site's configuration exercises
the same workflow without Albion-specific code in the reusable editor.

No implementation or package installation is approved by this proposal alone.
