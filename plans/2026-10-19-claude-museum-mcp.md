# Claude museum connector

Status: user approved an authenticated remote museum MCP connector, official MCP/OAuth dependencies and Cloudflare Free hosting on 19 October 2026. Claude is Marie’s chosen client. Preserve the visual CMS and existing static public site.

## Design

Add `/mcp` and OAuth consent to the existing authentication Worker, retaining its Decap sign-in endpoints. Use the official stateless Cloudflare MCP handler and official Workers OAuth provider. An OAuth KV namespace holds provider grants and short-lived login state within Free allowances; no paid plan, AI API, Durable Object or database. Reuse the existing GitHub OAuth app’s `/callback` via a distinct MCP state prefix and cookie. Claude receives a museum access token, never the upstream GitHub credential. Each operation rechecks repository push access; misses fail closed.

The tools operate only on approved museum editorial JSON in the fixed trial repository. No arbitrary repository, file path, shell, code, archive changes or Cloudflare administration. Reuse canonical page/collection schemas; preserve protected competitive and wartime records. Uploaded image bytes continue through the existing credited image editor initially; MCP can find and select published photographs.

Support listing/reading pages, templates, collections and photographs; validated page/template/collection drafts; preview/check status; explicit publication after checks pass for the exact draft commit. Use normal `cms/**` branches and GitHub PRs so existing branch protection, editorial guard, validation and Cloudflare preview remain authoritative. Publishing must reject stale heads and missing checks. Every changed draft must invalidate any previous publication approval. Report conflicts, do not overwrite concurrent CMS edits. The assistant must show a preview and ask Marie to publish; server publication requires the exact previewed commit and a confirmation argument.

## Bite-sized work and verification

1. Inspect installed/dependency contracts and pin compatible stable `agents`, MCP server, schema and OAuth packages in `package.json`/lockfile. Verify handler APIs and provider callbacks from current package sources. Document Free limits and client requirements.
2. Add browser-safe editorial GitHub operations and tool schemas under `auth/mcp/`. Validate byte/complexity bounds, stable IDs, references and fixed paths before mutations. Unit-test negative access, empty/malformed content, protected paths, concurrency and stale/missing checks; verify successful create/update/preview/publish sequences with mocked GitHub boundaries.
3. Add `auth/mcp/authorization.mjs` and an auth Worker entrypoint composing existing Decap handler, OAuth provider and MCP handler. Require consent with CSRF protection, PKCE, bounded state, repository access and resource-specific tokens. Test failed/expired/mismatched state and consent, existing Decap regressions and actual MCP protocol in workerd.
4. Extend `scripts/cloudflare-output.mjs` with bundled auth output using the existing Vite build tooling; retain cf CLI. Add a bounded setup script that provisions only the Free KV namespace and deploys the auth Worker with existing secrets retained. Never expose secrets or quietly enable paid services. Keep checked CI validation before deployment.
5. Build, run tests and preserve museum fixtures. Create/attach checked PR, merge and push normally. Deploy the configured auth Worker when local Cloudflare sign-in is available. Verify unauthenticated requests are rejected, metadata advertises the actual URL, old Decap login still works and real Claude can list tools, save a draft, preview and publish with owner-account acceptance before Marie’s own account is ready.
6. Document exact Claude connection URL, GitHub access and sample instructions in README and publishing help. Record remaining user setup honestly. Clean temporary files, local servers and test drafts; preserve existing unsaved Safari drafts.

## Boundaries and pending access

Cloudflare owner sign-in succeeded on 20 October 2026. The setup script created the classic OAuth KV namespace, retained the existing secrets and deployed revision 2b7e05ce2d3ef175ffecbcb7c8ab168a5a021c27. Hosted discovery, unauthenticated rejection and visual-editor sign-in checks passed. The resource reference is retained in auth/mcp-config.json. Claude Personal is paused at updated Consumer Terms, which the account owner must review and accept before the live workflow test.

## Current primary sources

- Claude custom connectors, including one connector on Free: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- Stateless Cloudflare MCP handler: https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/
- OAuth proxy consent and CSRF: https://developers.cloudflare.com/agents/model-context-protocol/guides/securing-mcp-server/
- OAuth provider: https://github.com/cloudflare/workers-oauth-provider
- KV Free allowances: https://developers.cloudflare.com/kv/platform/pricing/

## Verification so far

Pinned stable Agents 0.28.1, MCP server 2.3.1, Workers OAuth Provider 1.2.3 and Zod 4.6.7. Existing Vite tooling bundles the auth entry; no new bundler dependency. The pinned cf prebuilt dry-run recognises only the one configured OAuth KV binding (733 KiB / 149 KiB gzip); deployment uses `--no-provision`. The cf implementation sets `keepSecrets: true` during version upload, and setup additionally checks retained editor configuration and login.

41 tests passed, including actual SDK protocol/tool input validation and a mocked GitHub draft/preview/merge/live sequence with negative controls. The compiled workerd OAuth test completes consent, upstream GitHub PKCE, browser-bound callback and resource-specific token exchange, and rejects forged consent, unbound/replayed callbacks and upstream token passthrough. Old Decap OAuth tests pass. All original museum/Songs token comparisons and competitive/wartime archive checks pass.

The initial OAuth endpoints were nested beneath protected `/mcp`; the runtime correctly rejected consent. They now sit at `/authorize`, `/token` and `/register`, outside the protected resource. The local simulator’s HTTP bridge rewrites Host to loopback, preventing an authorised end-to-end public-host MCP call. After inspecting and reducing the harness, no production hostname check was weakened: OAuth is checked in workerd, MCP protocol through the actual SDK in memory, and the full hosted Claude path remains a required acceptance gate. Do not present these separate tests as a completed live Claude workflow.

Pending: real owner-account Claude authorisation and draft/preview/publication, actual Free CPU use, Marie’s GitHub access and her own acceptance. Existing unsaved Safari drafts remain intact.

## Safari consent repair — 20 October 2026

The hosted native form fails with “The consent form origin could not be verified.” The consent document sends Referrer-Policy: no-referrer, which makes native form POST requests carry Origin: null. The handler correctly requires the exact auth origin. Use same-origin on the consent document only, keeping cross-origin referrers suppressed and retaining exact-origin, browser cookie, one-use handle and PKCE checks. Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy

1. In scripts/check-mcp-runtime.mjs assert the consent document policy and reject missing/null/foreign origins even with its valid cookie and handle; first run against the old response to verify failure.
2. Change only the consent document header in auth/mcp/authorization.mjs. Run the compiled OAuth check, all tests and the build.
3. Merge a checked PR normally, redeploy using scripts/setup-mcp.mjs, and start fresh consent from Claude. Verify native Safari consent before continuing the authorised draft/preview/publish test.

## Safari redirect repair — 20 October 2026

Fresh consent submission consumes the transaction but stays on the form. Safari’s console confirms: GitHub’s OAuth URL was refused because it does not appear in the form-action directive. A second click therefore correctly rejects the already-used handle. This is independent of the earlier Origin defect.

1. Extend scripts/check-mcp-runtime.mjs to compare the consent form policy against the actual upstream redirect origin and the validated client callback origin, with no wildcard. Confirm failure on the current bundle.
2. In auth/mcp/authorization.mjs allow self, the fixed GitHub origin and the provider-validated callback origin in form-action. Retain default-src none, frame protection, exact POST origin, cookie binding, one-use consent and PKCE. Run the full build and tests, merge a checked trial PR and redeploy.
3. Start a fresh Safari/Claude connection, inspect the actual redirect chain, then continue the authorised content draft, checked preview and publication acceptance test. Do not call the live workflow complete from unit checks alone.

## Hosted owner-account acceptance — 20 October 2026

The complete workflow passed in Safari using the personal Claude Free workspace and GitHub sign-in. All eight tools were discovered. Tool calls were approved once; blanket permission preferences were not changed.

- Deployed auth revision: e02347cff150994119272324cb268b2f68399128. The browser completed consent and returned to Claude with the connector connected.
- Claude read the guide and component-preview-trial, saved draft PR #22, and returned its checked full-page preview after the required checks passed: https://github.com/stevehill1981/albion-songs-trial/pull/22
- Exact draft commit: 61b31e7f18c5a2a191dc9891ac1f39afd8072685; base: e02347cff150994119272324cb268b2f68399128. A semantic JSON comparison confirmed only the requested instructional sentence changed; existing content, source links, credits and layouts matched. JSON key ordering also changed without changing content.
- Inspected the served full-page preview in Safari, including the new paragraph, both photographs, credits and columns: https://5b30d1cf-albion-songs-trial.steve-e85.workers.dev/component-preview-trial
- Asked Claude to publish that exact previewed commit. Its publish tool merged normally and publication_status progressed from publishing to live. Production revision: a8bbdaba6409b9cd4947317520192020544478d5. Independently fetched version.json and the public HTML; both matched, with the sentence and existing image credit/license present.
- Public result: https://albion-songs-trial.steve-e85.workers.dev/component-preview-trial
- Claude acceptance chat: https://claude.ai/chat/b3542a7d-b943-4f2d-bdc2-6b4576c4588d (owner access required).

No paid upgrade, paid AI API or paid resource was introduced. Actual authenticated /mcp invocation samples used 14–23 ms CPU and returned outcome ok. This exceeds the documented 10 ms Free allowance; Cloudflare allows occasional overruns but can terminate consistent overruns. Do not equate this successful trial with reliable Free CPU compliance. Optimisation and renewed measurement remain required before routine use, along with Marie’s own GitHub access and independent acceptance. Source: https://developers.cloudflare.com/workers/platform/limits/#cpu-time

A Python urllib fetch of the preview returned HTTP Error 403: Forbidden; Safari served the page successfully, and independent curl verification of production passed. The browser result and served HTML, rather than deployment status alone, are the acceptance evidence. Task-owned caches and build outputs were removed; original museum sources and unsaved visual-editor drafts were preserved.
