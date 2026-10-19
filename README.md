# Albion Songs editing trial

A free Astro/Decap CMS trial retaining the existing Albion Songs page, with editable pages, reusable content templates and museum collections. This repository contains only the trial page and required public assets; the museum's match data and internal research are kept in the original project.

- Public trial: https://albion-songs-trial.steve-e85.workers.dev/songs
- Editor: https://albion-songs-trial.steve-e85.workers.dev/admin/
- Publishing status and instructions: https://albion-songs-trial.steve-e85.workers.dev/publication.html

## Owner setup

1. Create a GitHub OAuth app at https://github.com/settings/applications/new. Use a descriptive name such as **Albion Songs trial editor**. Homepage: `https://albion-songs-trial.steve-e85.workers.dev/admin/`. Callback: `https://albion-songs-auth.steve-e85.workers.dev/callback`. Device flow is not needed.
2. In this checkout, run `node scripts/configure-auth.mjs`. Enter the app's client ID and secret into its hidden terminal prompts. Do not put them in Git, chat or an issue. The script sends the credentials to Cloudflare's secret store through stdin. It does not store them locally.
3. Give Marie write access to this trial repository when she has a GitHub login. She does not need Cloudflare membership to edit or publish. Invitations need the owner's explicit instruction and her chosen username.

## Marie's trial

Sign in at the editor and open **Pages → Songs & terrace culture**. Expand the section you want to edit. Add a section with **Add Page sections**, choose its template, and move it into position. Text, emphasis, bold text and source links have separate labelled fields; no HTML or Markdown is needed. Use View preview for the full interactive page.

To create a page, choose **Pages → New Page**, set its lower-case hyphenated address, title and description, and complete the Page introduction. Set the address once; changing it later requires a checked URL migration. Add story, accounts/footage, songbook, timeline, Baggie Bird facts and source-note sections as needed. Each section needs a unique address. The current library retains the Hawthorns introduction photograph and its credits; it is not an image upload tool. The introduction must come first; one songbook, footage section and fact rotator per page keeps their controls distinct.

Create topics in **Museum collections**, then choose them in the page’s **Museum collections** field. Published pages appear automatically in the [page directory](https://albion-songs-trial.steve-e85.workers.dev/pages) and their collection landing pages. The original museum remains separate. A new collection must be published before it can be selected on a page.

Save a draft; wait for **View preview**, open the whole page and check wording, source links and interactions. Mark Ready and use **Publish → Publish now**. Required checks must pass. The publishing workflow verifies the actual served revision of every generated page and collection. Check the publication-status page and the public page. The existing blue-vinyl fact remains under **Shared blue-vinyl fact**, and fact sections can include it as their first item.

To undo an edit, restore the previous wording in the editor and preview/publish again. Previous versions remain in GitHub's file history. The trial's acceptance is still pending until Marie completes these steps herself; unit tests cannot establish usability for her.

## Development and verification

Use Node 24.22.0 or later. `npm ci`, `npm test`, `npm run build`; `npm run dev` serves a local preview. Astro 7.4.1 and Decap CMS 3.17.1 are pinned. `build/` is disposable output. `content/pages/*.json` and `content/collections/*.json` are the editorial sources. `legacy/shell.html` retains the shared site chrome; `src/lib/blocks.mjs` validates and renders both public and editor content. `content/fact.json` retains the compatible shared fact entry. Non-writable migration fixtures under `test/fixtures/` prove initial preservation without preventing legitimate future edits. The build checks every generated page, collection membership, the root Songs alias and shared preview renderers. Tests compare 1,646 original markup/text tokens and deliberately corrupt a caveat to verify that the comparator can fail. All other source assets are recorded in `plans/origins.json`.

The CLI mandated for this project is `cf`, currently pinned to 1.0.0-beta.14 in publication commands. The small `scripts/cloudflare-output.mjs` adapter writes its verified prebuilt output contract, avoiding automatic framework setup or a public request-time Worker. Recheck this adapter before changing the CLI version. The authentication Worker is separate, uses GitHub authorization code flow with PKCE and secure state cookies, verifies repository push access, and sends a token only to the exact configured editor origin. It logs no token and persists no editor token server-side. GitHub's `public_repo` OAuth permission covers public repositories the user can write to; it is not a single-repository permission.

## Free operation

The static public site uses Cloudflare Workers Static Assets. The account reported no account subscriptions during setup. Authentication uses Workers Free quotas and stops at their limits. No storage, paid add-on, custom domain or paid plan is provisioned. The public repository's workflow uses standard GitHub-hosted Linux runners without uploaded artifacts or Actions caches. It consumes no paid CMS/authentication subscription. Do not upgrade automatically if any free allowance is exhausted.

The repository has a dedicated Cloudflare deployment secret limited to Workers Scripts Write on the selected account. GitHub does not provide that secret to forks. Only trusted editors should have repository write access: the permission can also change repository code. Revoke the deployment credential and OAuth app when retiring the trial. No Cloudflare or GitHub credentials belong in this source.

## Dependency findings

The latest stable Decap package currently reports upstream peer-version/deprecation warnings and transitive security advisories in its Markdown/rich-text dependencies. The trial uses plain string/text, list, select, boolean and relation fields with HTTPS source links, with strict server-build validation and HTML escaping; Markdown/rich-text editing is not enabled. The shipped upstream editor bundle still contains those libraries. This remains an upstream dependency limitation to resolve before widening editor functionality; do not claim a clean dependency audit or silently downgrade the editor to suppress the report.

## Content and assets

The original museum retains research, source and credit information. The copied Songs page keeps its existing credits and uncertainty statements. The throstle is the club's published asset, and the Baggie Bird illustration is labelled independent fan artwork. Original photo attribution remains beside the photograph. This is an independent fan history, not an official club publication.
