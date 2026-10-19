# Albion museum editing trial

A free Astro/Decap CMS trial retaining all five published museum pages, with editable stories, curated collections and saved layouts. Published match archives are copied intact and kept outside the casual editor. Internal research stays in the original private workspace. The original museum remains live until the migration is accepted.

- Public trial: https://albion-songs-trial.steve-e85.workers.dev/songs
- Editor: https://albion-songs-trial.steve-e85.workers.dev/admin/
- Real Astro component trial: https://albion-songs-trial.steve-e85.workers.dev/component-preview-trial
- Publishing status and instructions: https://albion-songs-trial.steve-e85.workers.dev/publication.html

## Owner setup

1. Create a GitHub OAuth app at https://github.com/settings/applications/new. Use a descriptive name such as **Albion Songs trial editor**. Homepage: `https://albion-songs-trial.steve-e85.workers.dev/admin/`. Callback: `https://albion-songs-auth.steve-e85.workers.dev/callback`. Device flow is not needed.
2. In this checkout, run `node scripts/configure-auth.mjs`. Enter the app's client ID and secret into its hidden terminal prompts. Do not put them in Git, chat or an issue. The script sends the credentials to Cloudflare's secret store through stdin. It does not store them locally.
3. Give Marie write access to this trial repository when she has a GitHub login. She does not need Cloudflare membership to edit or publish. Invitations need the owner's explicit instruction and her chosen username.

## Marie’s editing workflow

Sign in at the editor. **Pages** contains the museum, Hawthorns, results and rivalries, wartime football, and Songs. Expand a named section to edit its plain text and source links. The original sections retain their existing design. No HTML or Markdown is needed. Use View preview to check the full interactive page.

For new pages, choose **Pages → New Page**, enter a lower-case hyphenated address, title and description, and keep the introduction first. Set the address once; later address changes require a checked URL migration. Add existing story/song templates or a **Section with columns**. Sections support one to three columns, white/navy/pale-blue backgrounds and compact/standard/roomy spacing. Columns accept text, credited photographs and related-page cards. They stack on phones. Every section address must be unique.

To reuse a published layout, select it above Content blocks and choose **Replace blocks with selected layout**. This replaces the current blocks, so use it on a new page or a saved draft. To save a layout of your own:

1. Arrange the blocks and choose **Copy layout for a template**.
2. Open **Page templates → New Page template**, name it and enter its address and description.
3. Choose **Paste copied layout**, save, preview and publish through the normal checks.
4. On a new page, select that published template and replace its starter blocks.

Layouts are independent copies. Changing a template does not change pages already made from it. Copied content includes wording and source links, so replace them with the new story and its evidence before publishing. Copy/paste stays in the current browser session; save a draft before closing it.

**Museum collections** groups pages into topics; publish a collection before assigning it. Pages appear in the page directory and their collection landing pages. **Exhibits**, **Eras** and **Sources** control the museum cards and readable stories. **Photographs and credits** lets you upload an image, add its description and credits, and publish it for reuse. See the image workflow below. **Museum settings** controls ordering, featured exhibits, navigation and quiz questions. The shared blue-vinyl fact remains compatible with its original four fields.

Save a draft, wait for **View preview**, and check wording, links, credits and interactions. After saving again, Decap can temporarily retain the previous preview link; reload the saved editor entry after checks finish and confirm the preview contains your latest wording before publishing. Mark Ready, then **Publish → Publish now**. Required validation and deployment checks must pass. The workflow verifies the actual served revision of every page, collection and template preview. Check publication status and the public page afterward. To undo an edit, restore the earlier wording and preview/publish again; GitHub keeps file history.

Competitive and wartime JSON/CSV, computed totals, evidence labels and saved result tables are protected source files. They are not CMS fields. Research corrections use the checked archive workflow; wartime results never enter competitive totals. Editorial builds do not fetch or silently refresh match data. The existing browser-side free-feed fallback behaviour is preserved.

Marie needs her own GitHub account with repository write access, but no Cloudflare login. Her independent usability acceptance remains pending until she can complete editing, preview and publication herself.

## Immediate Astro component preview

Open **Pages → Build a page with Marie** to try the real component preview. Introductions, text panels, photographs and sections containing those blocks use the same `.astro` markup in the editor and on the published page. Changes are requested after a 400 ms pause, without saving or committing. Network and GitHub access checks add some delay. Incomplete fields keep the last successful preview visible; restore the required text to resume. Backgrounds, spacing and one to three columns remain the existing supported choices.

The first sign-in after this update may need **Login with GitHub** again. It uses the existing OAuth app and permissions. Each preview checks repository write access; no token or draft is stored by the preview Worker. The trial accepts up to 64 KB, 20 top-level blocks and 60 blocks overall. Other museum block types and unpublished image-record previews retain their existing browser previews. Select a published credited photograph for the Astro page trial. Saved GitHub build previews still check the whole page and its interactions before publication.

The owner-account Safari test passed unsaved editing, error recovery, saved full-page preview and CMS publication. The remaining component migration is gated on measured Free-plan CPU use; CLI sign-in is still needed for that measurement. Successful requests and local simulator checks are not CPU measurements. Marie’s own acceptance remains pending.

## Uploading and reusing images

Open **Photographs and credits → New**, set a stable address, and use **Image → Choose an image** to upload or select a JPEG, PNG or WebP. Upload while editing this credited record so the file travels with its draft. The thumbnail shows its automatically detected dimensions; no pixel measurements need entering. Add the image description, caption, photographer/creator, licence or permission, and HTTPS source record URL. Existing photographs retain their addresses and credits.

Save a draft and wait for the full photograph preview. Check its image, credits and description, then mark Ready and publish. Once deployment finishes, reload the editor and choose that published photograph in a page’s Photograph block, an exhibit or an era. The [image library](https://albion-songs-trial.steve-e85.workers.dev/images) provides thumbnails and full credit records. Shared photograph edits update their uses; page templates continue to copy layout structure independently.

Files are limited to 5 MB each, 8,000 pixels on either side and 32 megapixels. The upload folder is bounded to 500 files and 100 MB total. Exceeding a limit stops publication; there is no automatic paid upgrade. Resize oversized files before uploading. Dimensions and format are checked again from the actual file during the build.

Use a new filename when replacing an image, then update its selection. Published files cannot be overwritten or removed by an editorial draft, so existing image links stay available. New uploads must have a credited photograph record. The general Media button is not an alternative publication path: start a photograph draft to upload; main branch protection and checks still apply. Original hero photographs in fixed page templates retain their existing configuration.

## Development and verification

Use Node 24.22.0 or later. `npm ci`, `npm test`, `npm run build`; `npm run dev` serves a local preview. Astro 7.4.1 and Decap CMS 3.17.1 are pinned. `build/` is disposable output. `content/` holds editorial JSON; `src/lib/museum-patterns.json` holds protected original section markup. `legacy/shell.html` retains the shared site chrome; `src/lib/blocks.mjs` validates and renders both public and editor content. `content/fact.json` retains the compatible shared fact entry. Non-writable migration fixtures under `test/fixtures/` prove initial preservation without preventing legitimate future edits. The build checks every generated page, collection membership, the root museum page and shared preview renderers. Tests compare 1,646 original markup/text tokens and deliberately corrupt a caveat to verify that the comparator can fail. Full museum provenance is recorded in `plans/full-museum-origins.json`. Run `python3 scripts/compare-museum.py build` and `python3 scripts/compare-songs.py build/songs.html` for the one-time migration comparison; these frozen baselines must not prevent later legitimate edits. The build also checks archive arithmetic, evidence agreement and local links, with negative controls.

The CLI mandated for this project is `cf`, currently pinned to 1.0.0-beta.14 in publication commands. The small `scripts/cloudflare-output.mjs` adapter writes its verified prebuilt output contract, avoiding automatic framework setup. Public pages remain static; only the authenticated `/editor-preview` route uses the official Astro Cloudflare adapter at request time. The build exercises the compiled route in Cloudflare’s local runtime, including rejected access and preview/public markup parity. No KV, image service or other storage binding is provisioned. Recheck this adapter before changing the CLI version. The authentication Worker is separate, uses GitHub authorization code flow with PKCE and secure state cookies, verifies repository push access, and sends a token only to the exact configured editor origin. It logs no token and persists no editor token server-side. GitHub's `public_repo` OAuth permission covers public repositories the user can write to; it is not a single-repository permission.

## Free operation

The static public site uses Cloudflare Workers Static Assets. The account reported no account subscriptions during setup. Authentication uses Workers Free quotas and stops at their limits. No storage, paid add-on, custom domain or paid plan is provisioned. The public repository's workflow uses standard GitHub-hosted Linux runners without uploaded artifacts or Actions caches. It consumes no paid CMS/authentication subscription. Do not upgrade automatically if any free allowance is exhausted.

The repository has a dedicated Cloudflare deployment secret limited to Workers Scripts Write on the selected account. GitHub does not provide that secret to forks. Only trusted editors should have repository write access: the permission can also change repository code. Revoke the deployment credential and OAuth app when retiring the trial. No Cloudflare or GitHub credentials belong in this source.

## Dependency findings

The latest stable Decap package currently reports upstream peer-version/deprecation warnings and transitive security advisories in its Markdown/rich-text dependencies. The trial uses plain string/text, list, select, boolean and relation fields with HTTPS source links, with strict server-build validation and HTML escaping; Markdown/rich-text editing is not enabled. The shipped upstream editor bundle still contains those libraries. This remains an upstream dependency limitation to resolve before widening editor functionality; do not claim a clean dependency audit or silently downgrade the editor to suppress the report.

## Content and assets

All copied museum pages retain their source links, image credits and uncertainty statements. Internal research remains outside this public repository. The throstle is the club's published asset, and the Baggie Bird illustration is labelled independent fan artwork. Original photo attribution remains beside the photograph. This is an independent fan history, not an official club publication.
