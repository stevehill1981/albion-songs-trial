# Albion Songs editing trial

A free Astro/Decap CMS trial retaining the existing Albion Songs page, with one editable Baggie Bird fact. This repository contains only the trial page and required public assets; the museum's match data and internal research are kept in the original project.

- Public trial: https://albion-songs-trial.steve-e85.workers.dev/songs
- Editor: https://albion-songs-trial.steve-e85.workers.dev/admin/
- Publishing status and instructions: https://albion-songs-trial.steve-e85.workers.dev/publication.html

## Owner setup

1. Create a GitHub OAuth app at https://github.com/settings/applications/new. Use a descriptive name such as **Albion Songs trial editor**. Homepage: `https://albion-songs-trial.steve-e85.workers.dev/admin/`. Callback: `https://albion-songs-auth.steve-e85.workers.dev/callback`. Device flow is not needed.
2. In this checkout, run `node scripts/configure-auth.mjs`. Enter the app's client ID and secret into its hidden terminal prompts. Do not put them in Git, chat or an issue. The script sends the credentials to Cloudflare's secret store through stdin. It does not store them locally.
3. Give Marie write access to this trial repository when she has a GitHub login. She does not need Cloudflare membership to edit or publish. Invitations need the owner's explicit instruction and her chosen username.

## Marie's trial

Sign in at the editor, open **Songs & terrace culture**, and edit **Baggie Bird — Albion on blue vinyl**. Save a draft; wait for **View preview**, then open the preview and check the whole page. Mark the entry ready and publish using the editor workflow. A successful draft preview is required before merging. Check the publication-status page and then the public fact.

To undo an edit, restore the previous wording in the editor and preview/publish again. Previous versions remain in GitHub's file history. The trial's acceptance is still pending until Marie completes these steps herself; unit tests cannot establish usability for her.

## Development and verification

Use Node 24.22.0 or later. `npm ci`, `npm test`, `npm run build`; `npm run dev` serves a local preview. Astro 7.4.1 and Decap CMS 3.17.1 are pinned. `build/` is disposable output. `legacy/songs.html` holds the preserved page with one fact marker; `content/fact.json` is the sole editable fact. The build verifies that both generated routes match the retained page, inserting that fact. All other source assets are recorded in `plans/origins.json`.

The CLI mandated for this project is `cf`, currently pinned to 1.0.0-beta.14 in publication commands. The small `scripts/cloudflare-output.mjs` adapter writes its verified prebuilt output contract, avoiding automatic framework setup or a public request-time Worker. Recheck this adapter before changing the CLI version. The authentication Worker is separate, uses GitHub authorization code flow with PKCE and secure state cookies, verifies repository push access, and sends a token only to the exact configured editor origin. It logs no token and persists no editor token server-side. GitHub's `public_repo` OAuth permission covers public repositories the user can write to; it is not a single-repository permission.

## Free operation

The static public site uses Cloudflare Workers Static Assets. The account reported no account subscriptions during setup. Authentication uses Workers Free quotas and stops at their limits. No storage, paid add-on, custom domain or paid plan is provisioned. The public repository's workflow uses standard GitHub-hosted Linux runners without uploaded artifacts or Actions caches. It consumes no paid CMS/authentication subscription. Do not upgrade automatically if any free allowance is exhausted.

The repository has a dedicated Cloudflare deployment secret limited to Workers Scripts Write on the selected account. GitHub does not provide that secret to forks. Only trusted editors should have repository write access: the permission can also change repository code. Revoke the deployment credential and OAuth app when retiring the trial. No Cloudflare or GitHub credentials belong in this source.

## Dependency findings

The latest stable Decap package currently reports upstream peer-version/deprecation warnings and transitive security advisories in its Markdown/rich-text dependencies. The trial exposes only string/text fields and an HTTPS link, with strict server-build validation and HTML escaping; Markdown/rich-text editing is not enabled. The shipped upstream editor bundle still contains those libraries. This remains an upstream dependency limitation to resolve before widening editor functionality; do not claim a clean dependency audit or silently downgrade the editor to suppress the report.

## Content and assets

The original museum retains research, source and credit information. The copied Songs page keeps its existing credits and uncertainty statements. The throstle is the club's published asset, and the Baggie Bird illustration is labelled independent fan artwork. Original photo attribution remains beside the photograph. This is an independent fan history, not an official club publication.
