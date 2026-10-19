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

Local cf CLI currently reports signed out. Existing CI credential deploys the static site but has only Workers Scripts Write; KV provisioning and auth Worker acceptance require an authorised signed-in cf session. The Mac was locked at the end of the earlier Safari task. Complete code and local verification before requesting any final account setup.

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

Pending: checked PR, hosted setup after cf sign-in, real owner-account Claude authorisation and draft/preview/publication, actual Free CPU use, Marie’s GitHub access and her own acceptance. Existing unsaved Safari drafts remain intact.
