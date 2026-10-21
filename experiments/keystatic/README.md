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
