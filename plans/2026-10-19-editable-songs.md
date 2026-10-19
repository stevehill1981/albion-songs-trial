# Reusable pages and blocks: Songs migration

19 October 2026. The owner approved making Songs the first reusable page, with page creation, predefined content templates and museum collection membership. This supersedes the initial fixed-section-forms proposal. Work stays inside the isolated free Astro/Decap trial; the original museum and results remain untouched.

## Implementation plan

1. Preserve `test/fixtures/songs-before-blocks.html` and `test/fixtures/songs-initial.json`. Extract all seven Songs sections into `content/pages/songs.json`, add `content/collections/terrace-culture.json`, and keep the existing `content/fact.json` editor entry compatible. `scripts/extract-songs.py` records the one-time extraction and refuses to overwrite migrated editorial content.
2. Implement seven reusable templates and structured plain fields in `src/lib/blocks.mjs`: introduction, sourced story/origin accounts, accounts/footage, songbook, timeline, Baggie Bird facts, closing/source notes. Share validation and rendering between public pages and styled CMS previews. Keep inline text/emphasis/bold/link fragments editable without HTML or Markdown. Retain the existing credited images. No new packages or rich-text widgets.
3. Load and validate editorial JSON in `src/lib/content.mjs`. Use `legacy/shell.html` for the retained chrome, `src/pages/[slug].astro` for pages, `src/pages/pages.astro` for discovery and `src/pages/collections/[slug].astro` for memberships. Keep `/songs` and the root Songs alias. Reject reserved paths, duplicate anchors, filename/address mismatches and missing collection references. The old live `legacy/songs.html` is removed once fixture parity passes.
4. Update `scripts/prepare.mjs`, `public/admin/preview.mjs`, `.github/workflows/publish.yml` and `scripts/check-editorial-diff.mjs`. Pages and Museum collections are creatable folder collections; ordered typed blocks provide the templates. Keep the shared fact file entry. Limit editorial drafts to explicit content JSON paths. Keep main protections and current authentication. `scripts/publish.mjs` and `scripts/served-revision.mjs` verify the exact served revision of every page and collection before a success status.
5. Verify with `test/blocks.test.mjs`, `test/content.test.mjs`, `test/served-revision.test.mjs`, `scripts/compare-songs.py` and `scripts/verify-build.mjs`. Check initial full markup/text/link preservation, legitimate changes, add/reorder/remove entries, new routes, collection references, source escaping, malformed input and restricted-file failures. The immutable baseline comparison must not pin live editorial files against legitimate edits. Deliberately alter a caveat to prove that the comparator can fail.
6. Build and inspect desktop/phone rendering, search, category filtering, fact rotation and a generated new page with collection membership. Ship through a checked feature PR. Then use the owner's signed-in browser editor to create a useful trial-information page, add template content, assign a collection, save, preview and publish it. Verify actual public content and membership. Retain that useful page rather than leave disposable test wording. Update `README.md`/publication help and evidence. Marie's independent usability trial still awaits her account.
7. Push completed work. Stop task-owned processes, close temporary browser tabs and remove build/cache/generated output. Keep durable repositories, editorial content and verification evidence. Never stop another project's local server.

## Preserved workflow and cost

Reuse GitHub sign-in, protected main, public standard-runner Actions and Cloudflare Free static previews/deployment. No database, paid CMS, extra authentication service, billing upgrade or uploaded Actions artifacts/cache. The original museum stays live. Existing Decap transitive rich-text advisories remain documented; the editor uses plain fields and escaped validated rendering.

## Evidence so far

- Eighteen tests pass, including negative controls for baseline corruption, unsafe input, protected files, missing collection references and missing public routes.
- Initial output matches 1,646 parsed markup/text tokens from the retained page, including every source URL, credit and evidence caveat. Only the trial toolbar/navigation and absolute asset paths deliberately change.
- Astro initially failed with `ENOENT: no such file or directory, scandir '…/build/content/pages/'`: bundling relocated `import.meta.url`. The build-time loader now resolves the project working directory and accepts an explicit root in isolated file tests. The rebuilt static pages pass.
- Local browser checks: Astle search shows 1 of 43; reset restores 43; Rivalries shows 6; fact rotation advances to 2 of 6. A temporary local page generated its route, appeared in the terrace-culture collection and linked back to that collection; its source was removed before shipping.
- Python 3.14.3 and Ruff 0.16.4 are installed; the two annotated helper scripts pass Ruff checks. No dependency was added.

Official capability references checked during design:
https://decapcms.org/docs/collection-folder/
https://decapcms.org/docs/variable-type-widgets/
https://decapcms.org/docs/widgets/relation/
