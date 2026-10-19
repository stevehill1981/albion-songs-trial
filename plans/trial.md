# Songs editing trial

The user approved a small free Astro/Decap Songs trial on Cloudflare, a separate public repository containing only the trial material, and GitHub sign-in using an owned free Cloudflare authentication component. This replaces the provisional DecapBridge choice. Marie can create a GitHub login; Cloudflare membership is optional and distinct from editor access.

## Scope and sequence

1. Create `/Users/stevehill/WBA/albion-songs-trial` as a durable, separate project. Copy the Songs page, its four styles, two enhancement scripts and only the required credited assets. Record their origin. Extract the first sourced Baggie Bird fact into editable JSON. Retain the other historical text exactly. Link other museum sections to the existing live site.
2. Add Astro 7.4.1 and Decap CMS 3.17.1, the stable registry releases checked today, with a lockfile. Astro writes `build/`; existing museum `dist/` is untouched. Validate the editable fact and generated page against the source fixture.
3. Add a small OAuth bridge on Cloudflare Free: GitHub authorization-code flow, state cookie, PKCE, exact editor origin, no token logging or storage, explicit missing-secret failure. Test missing/mismatched state, expired cookies, token failures and origin rejection.
4. Use the installed `cf` CLI and its prebuilt output contract to deploy static assets separately from authentication. Inspect the account's subscription state first; do not enable a paid plan or provision storage. Public GitHub Actions uses standard Linux runners, no billable caches/artifacts, and a dedicated deployment credential. Draft versions expose a matching preview status; `main` deploys the trial only.
5. Verify the static page, editor loading, original anchors/text/source links, phone/desktop rendering, invalid-content rejection and no unexpected museum file changes. Make draft preview checks required before self-publishing. Prove the public deployment contains the matching revision.
6. Hand over the live trial and a short browser guide. Any OAuth registration, deployment credential or Marie access that needs owner action remains explicitly pending; do not claim independent publishing works until the full sign-in/edit/preview/publish chain and Marie's own trial have happened.

## Cost and recovery

Only Cloudflare Free, GitHub Free/public standard runners and open-source software are permitted. Static asset traffic is free; the separate authentication component uses the Workers Free request/CPU allowance and must stop at limits, never upgrade. No paid CMS, authentication service, database or new domain. Keep the current museum live throughout. Delete task-owned temporary caches, generated diagnostic files and stop preview processes after verification; the new repository remains the durable trial workspace.
