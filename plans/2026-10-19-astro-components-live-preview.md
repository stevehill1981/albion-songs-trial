# Actual Astro components with immediate CMS preview

Status: the user approved the official Cloudflare adapter and bounded real-component preview trial on 19 October 2026. Keep the wider migration gated on measured trial results.

## Requirements

Marie selects actual Astro components through CMS fields, arranges supported sections and columns, and saves layouts as templates. Preserve current content JSON, URLs, credits, evidence labels, histories, independent publishing, original Albion appearance and competitive/wartime separation. Maximise immediate preview. The entire workflow remains free.

## Recommendation and alternative

Recommend a bounded on-demand Astro preview route in the existing site deployment, using the official `@astrojs/cloudflare` adapter. Public pages remain prerendered. The editor sends validated draft content after a short pause; the route renders the same real `.astro` components used for publication. It must not rebuild the site or create a Git commit on every edit. No experimental Astro Container API, additional service, database or paid plan.

Alternative: keep client-side JavaScript previews beside new Astro components. This gives instant local updates, but maintains two markup implementations and needs parity tests. Prefer this only if real Astro preview fails the Free-plan performance trial.

The recommended route is server rendered, so feedback includes network latency; 300–500 ms debounce is a starting value, not a measured end-to-end speed guarantee. Cloudflare currently documents 10 ms CPU per request and 100,000 dynamic requests per day on Workers Free. Measure the actual trial against those bounds. Do not upgrade plans or promise full-site suitability before measurement.

## Bounded trial and exact files

1. Inventory existing block rendering and preview behaviour in `src/lib/blocks.mjs`, `public/admin/preview.mjs`, `public/admin/layout-widget.mjs`, `src/lib/content.mjs` and `scripts/prepare.mjs`. List existing failure modes: stale asynchronous preview responses, unpublished image paths, incomplete drafts blanking the preview, lost scroll position, interactive controls failing after refresh, and static/build output drifting. Reuse current content validation and source escaping.
2. After approval, add the official stable adapter in `package.json` and lockfile; configure `astro.config.mjs` for one on-demand preview route and Node-based prerendering where the existing file readers require it. Check compatibility with pinned Astro before choosing its version. No other new dependency without approval.
3. Add real markup components `src/components/blocks/TextPanel.astro`, `Photograph.astro`, `Section.astro` and `BlockList.astro`, plus a trial page using the existing story-and-photograph JSON. A component merely wrapping the old JavaScript renderer does not meet the requirement. Preserve existing global CSS, fields, IDs and nesting limits. Other block types retain their existing implementation until the trial proves the design.
4. Add `src/pages/editor-preview.astro` for request-time rendering of those components. Bundle a build-generated preview context instead of reading repository files in the Worker. Restrict this route to authorised repository editors, fail closed on failed/missing access checks, bound request size/complexity, avoid storing/logging drafts, disallow arbitrary component names, URLs or code, and use no-store responses. Reuse existing GitHub identity rather than adding another login. Confirm the supported Decap token/access integration before implementing it; do not assume an undocumented API exists.
5. Extend `public/admin/preview.mjs` with a debounced request, cancellation/latest-response control, visible updating/error state and retained last successful output. Use the actual component styles. Preserve scroll on refresh. Local draft image blobs stay in the existing photograph-record browser preview. The bounded Astro page trial accepts published credited photograph references only; it does not upload binary files on keystrokes or fetch editor-supplied URLs. Test interaction scripts explicitly; HTML insertion alone does not execute them.
6. Extend `scripts/cloudflare-output.mjs`, `scripts/publish.mjs` and `scripts/verify-build.mjs` for adapter-generated runtime plus static assets, preserving the existing cf CLI and checked GitHub deployment process. Read the actual adapter output contract before changing deployment code. Existing static-only assumptions must be tested, not silently discarded.
7. Verify immediate text/credit changes, adding/reordering blocks, column/background/spacing changes, new draft images, invalid/incomplete fields, stale network responses, offline/error recovery, restored scroll, interactive controls, desktop/phone widths, auth rejection and Free-plan CPU. Compare trial preview and published Astro output against each other and current preservation fixtures. Keep original museum untouched. Remove temporary test outputs/processes.

## Acceptance and subsequent migration

Proceed beyond the trial only when the actual deployed renderer meets the free CPU budget and authorised CMS updates reach the preview reliably. Then migrate remaining blocks in small checked groups, keeping JSON compatible and deleting duplicated JavaScript markup only when the equivalent Astro output and preview are verified. Keep GitHub build previews for checking a saved draft in its full published context and for code/component changes.

## Sources checked

- Astro on-demand rendering: https://docs.astro.build/en/guides/on-demand-rendering/
- Official Cloudflare adapter: https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- Workers Free limits: https://developers.cloudflare.com/workers/platform/limits/
- Current local code is static Astro 7.4.1 with Decap CMS 3.17.1 and shared JavaScript HTML renderers; it does not yet have individual Astro block components.

## Implementation and verification record

- Added the approved official adapter 14.4.1, compatible with pinned Astro 7.4.1; no additional direct dependency. Existing Decap upstream warnings remain documented in README.
- Real Intro, TextPanel, Photograph, Section and BlockList components serve compatible pages and templates, including the new learning page. Existing museum blocks retain their current previews. No content schema change.
- Preview authentication uses a registered extension of Decap’s GitHub backend and inherited save/publish behaviour. Auth lookup misses fail closed; request size, allowed components, published image references and complexity are bounded.
- The compiled Worker test caught unsupported Workers `redirect: error`; the fixed GitHub lookup uses `manual` and rejects redirects. Browser fetch keeps its supported redirect policy.
- Local tests exercised actual compiled Astro output for 13 variants, authentication rejection, unsafe content, missing photographs and revoked access. Unit tests exercise stale response rejection, disposal, incomplete drafts and served-revision checks with negative controls.
- The disposable local Decap UI confirmed an unsaved heading update, retained last-good output for an empty heading, navy background, roomy spacing and the loaded credited photograph. Test-only credentials and backend changes exist only in temporary files outside the build.
- Pending: fresh final checks, checked deployment, authorised Safari hosted preview, actual Free-plan CPU measurement. Do not claim the broader migration or Marie’s independent acceptance is complete.
