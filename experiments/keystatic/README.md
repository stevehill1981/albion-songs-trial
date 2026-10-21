# Keystatic comparison

This is an isolated local trial, not the museum's replacement editor. It uses
Keystatic's stock document UI with plain labels and copied public Albion content.
Nothing in this fixture can publish through the existing museum editor endpoint.

## Run locally

With Node 24.22.0 or newer, run `npm ci`, then `npm run dev` from this directory.
Open `http://127.0.0.1:54943/keystatic`. Local Save writes these disposable files.
The root site's content, dependencies and deployment remain unchanged.

`KEYSTATIC_CLOUDFLARE_BUILD=1 PUBLIC_KEYSTATIC_TRIAL_GITHUB=1 npm run build` compiles a
GitHub-mode Cloudflare candidate. It does not deploy it, grant access or prove
hosted compatibility. The configured GitHub mode is a compile-only example and
has no registered GitHub app or credentials. Do not deploy local storage mode.

## Results from 21 October 2026

| Requirement | Result |
| --- | --- |
| Friendly document editing | Promising: readable desktop canvas, labelled settings and mobile layout. Vendor toolbar still has several icon-only controls. |
| Structured components | Inserted a credited photo block; edited and saved a sourced text block. Generic blocks display labels, with fields in an Edit dialog. |
| Nested page creation | Created and reopened `managers/local-child`; the actual nested Astro route rendered its saved text. |
| Complete page tree | Missing in this configuration. The list displays raw slugs, and moving `managers` to `people` left both child files at their old paths. The parent was restored. |
| Duplicate addresses | Rejected with “Page address must be unique”. |
| Actual Astro rendering | Saved source link and photograph credit rendered through the museum's existing TextPanel and Photograph components. |
| Immediate unsaved Astro preview | Missing in this configuration. An unsaved block heading did not appear when the website preview was reloaded. |
| Save and reopen | Passed for local files. Local Save is not public Publish or an authenticated GitHub draft. |
| Cloudflare build | Passed for both local and GitHub storage modes. Sourcemap and large-chunk warnings remain. |
| Cloudflare dev runtime | Failed to load an optimized Keystatic API dependency; the Node local runtime passed. |
| Dependency audit | Zero reported vulnerabilities in the separately locked fixture installation. |
| Hosted GitHub auth and permissions | Untested; no account access or app registration was granted. |
| Checked preview and exact publication | Untested in Keystatic. Existing museum safeguards were not replaced. |
| Free hosted CPU and quotas | Untested; nothing was deployed and no paid service was enabled. |

A hostile-Origin read of the local tree endpoint returned HTTP400. This is a
narrow observation, not proof of hosted permission or write protection.

## Assessment

The document UI is a useful foundation. It is not a complete replacement for the
current editor under our requirements. A managed site tree, actual unsaved Astro
preview, credited media controls and safe structural publication still need an
integration design. GitHub-mode authentication, runtime behaviour and the free
Cloudflare allowance need a separate deployment trial before adoption.

Retain the working editor until those tests pass. Judge the integration work
against extending the existing editor; a clean stock UI alone is not enough to
justify migration. This trial does not migrate all museum pages or claim lossless
conversion of their block schemas.

Evidence is preserved outside the deployment tree at
`../../../verification-evidence/keystatic-comparison-2026-10-21/`. The desktop and
mobile captures show the stock UI; browser-created local content remains in the
fixture so the checks can be replayed. No live content or history was changed.

Official documentation:

- https://keystatic.com/docs/installation-astro
- https://keystatic.com/docs/entry-layout
- https://keystatic.com/docs/path-wildcard
- https://keystatic.com/docs/content-components
- https://keystatic.com/docs/github-mode
- https://keystatic.com/docs/recipes/real-time-previews

## Integrated Site studio: local proof

The approved integration is available at `/studio`, which opens a singleton in
Keystatic's full app. A standalone document field has no public app context; the
singleton supplies that context without private imports or vendor patches.

The studio adds a page tree with stable IDs, parent relationships and short
addresses. Moving a parent moves its children in one workspace snapshot and
retains old addresses as redirects. Invalid addresses, cycles, orphans and
collisions are rejected. The fixture supports sourced story and credited photo
blocks, rather than claiming conversion of the entire museum.

Unsaved text renders through the museum's real Astro components alongside the
Keystatic document. The preview frame cannot run scripts. Save keeps the working
copy; **Check saved draft** renders every page into an immutable snapshot.
**Open checked preview** reviews that exact snapshot. **Publish local test** uses
the existing publication state machine and updates one local release atomically.
Any later edit or rejected move cancels the review. Reopening an older draft
cannot overwrite newer typing, and uncertain writes block repeated publication.

Browser checks passed child creation, parent moves, live unsaved preview,
save/reopen, post-review edit rejection and exact local publication. Old addresses
redirected to moved pages; source links and photo credits survived. Backend tests
reject forged revisions, stale release bases and concurrent conflicting releases.
A rejected reserved address was visibly restored to the accepted value while the
publication control became disabled.

This proves a **local integration**, not remote editing for Marie. GitHub App
sign-in, fresh hosted permissions, atomic GitHub commits, hosted preview checks,
publication and free-plan CPU/quotas remain acceptance work. The proof's own write
endpoint returns HTTP 403 in hosted builds; `npm run build:github` executes the
compiled endpoint to verify that boundary. No service, dependency, paid plan or
museum content was added or changed by this proof.

Run `npm test` here for the fixture tests, or from the repository root for the
combined suite. Evidence is outside the deployment tree at
`../../../verification-evidence/keystatic-studio-proof-2026-10-21/`.
