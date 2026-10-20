# UUID and sprintf-js: compatibility repair proposal

## Goal and constraints

Remove both remaining vulnerable dependency paths while preserving the normal
/admin/ address, owner GitHub sign-in, all museum collections and controls,
inline Astro previews, checked draft previews and publication. No paid service,
plan change, content migration or automatic dismissal of alerts. The working
baseline is main revision 58f3246d5be384ecd04e6cb62a87c8a50440a60e.

This is a proposal awaiting agreement under AGENTS.md. No dependency or runtime
change is authorised by writing this document.

## Reproduced causes and current upstream state

- The latest Decap core (3.20.1) still declares uuid ^8.3.2, also declared by its
  auth/file/list/relation modules. A bounded local v5 test with an eight-byte
  buffer and offset four silently writes only four bytes instead of rejecting
  the invalid range. GHSA-w5hq-g745-h8pq fixes this in 11.1.1, 12.0.1 and 13.0.1.
  UUID 14.0.3 is latest; 11.1.1 is the published legacy-11 release and preserves
  CommonJS support removed in 12. This is the reason to evaluate 11.1.1 for
  compatibility rather than blindly forcing the latest major.
- Decap core -> gray-matter 4.0.3 -> js-yaml 3.15.2 -> argparse 1.0.10 ->
  sprintf-js 1.0.3. GHSA-hp3w-g68c-fv3c lists no patched sprintf-js release.
  Gray-matter still calls yaml.safeLoad/safeDump; forcing js-yaml 4 or newer
  without changing those calls breaks its default engine. Forcing argparse 3
  also breaks js-yaml 3's CLI (addArgument/parseArgs are the old interface).
- Decap's own front-matter formatter supplies custom yaml/json/toml engines;
  preserve that contract as well as gray-matter's standalone default engine.
  All current editable museum collections use JSON. A green JSON-only save
  does not establish parser compatibility.
- Registry checks on 20 October: Decap core 3.20.1, gray-matter 4.0.3,
  sprintf-js 1.1.3, js-yaml 5.5.0 (4.x ends at 4.3.2). There is no current
  upstream Decap/gray-matter release that removes these two paths directly.
- The @gr2m/gray-matter fork is an old 2021 prerelease (registry last modified
  2022), not a maintained stable fix. Do not adopt it just to clear the audit.
- The previously verified browser module inventory includes neither UUID nor
  sprintf-js. That is separate from removing vulnerable installed dependencies.
  GitHub still shows the old trim/Plate alerts pending graph processing too.

## Options for agreement

1. Recommended: two bounded compatibility repairs, one at a time. Evaluate an
   exact UUID 11.1.1 override against all Decap consumers, then a small licensed
   local backport of gray-matter using the current stable YAML parser and its
   supported load/dump API. Preserve upstream sources/notice and document the
   exact patch. This accepts local maintenance until an upstream release can
   replace it. Stop if the prototype needs a broader rewrite or forced install.
2. Repair UUID first; leave sprintf-js open pending an upstream gray-matter fix.
   This avoids maintaining a local parser package but cannot clear both alerts.
3. Leave both paths unchanged and wait for upstream. No compatibility risk now,
   but no removal of the vulnerable installed packages.

## Work after approval

### 1. UUID: small independent change

Files: package.json/package-lock.json (exact override, no unrelated updates),
new test/editor-dependency-compatibility.test.mjs and this evidence record.
First inspect the actual installed consumers/imports and the 11.1.1 package's
exports; test CommonJS and ESM, random IDs, deterministic namespace UUID vectors,
parse/stringify round trips and valid buffer offsets. Assert invalid buffer
ranges throw; retain a bounded baseline reproduction showing the check fails
against 8.3.2. Confirm no vulnerable UUID version survives npm's actual tree.

Run clean npm ci without --force/--legacy-peer-deps, audit, all tests and full
build. Verify all editor packages/controls/assets and the existing OAuth/MCP
checks. Push a protected PR and inspect the exact hosted preview before merge.

### 2. sprintf-js: bounded parser backport prototype

Proposed files: vendor/gray-matter/{package.json,LICENSE,index.js,lib/**,
gray-matter.d.ts,UPSTREAM.md}, package.json/package-lock.json for a scoped local
package resolution, and test/editor-dependency-compatibility.test.mjs.
Obtain source from the official pinned npm archive and verify integrity before
copying; keep the original MIT notice and a complete minimal patch/diff record.
Do not include third-party node_modules, a new service or a copied editor bundle.

Retain gray-matter's public API and helpers. Change only its YAML dependency and
supported API calls needed to remove the old CLI dependency chain. Test the
current stable js-yaml 5.5.0 first; if preserving supported behaviour requires a
larger adapter/rewrite, stop and return for a smaller design. Do not silently
switch to an older major, an abandoned fork or replace the parser wholesale.

Compare baseline and repaired behaviour with meaningful fixtures: JSON/YAML/TOML
front matter with custom engines and delimiters, Unicode, CRLF, empty/absent
front matter, body boundaries/trailing newline, ordered serialization, malformed
input, dates/scalars/aliases and default-engine round trips. Exercise the actual
Decap formatter contract, not only hand-written calls that bypass it. Every
current content record must round-trip through its configured format unchanged.

A local package must install reproducibly from a clean checkout and be represented
in the lockfile/GitHub graph. Confirm installed source/version/dependencies, not
just a green audit which could omit an unrecognised local package. Assert the
old js-yaml/argparse/sprintf-js dependency path is absent. No blanket exclusions.

### 3. Workflow and release verification

Files: scripts/build-editor.mjs and scripts/verify-editor-build.mjs only if a
specific necessary dependency/security invariant needs extending; README.md and
this record for the override/backport rationale and upstream replacement rule.
Keep the existing five asset/negative controls and both embedded encoders.

Repeat clean install, full tests/build and audit after each independent repair.
Use the protected PR/check/preview/merge process. Verify the served revision,
all editor asset digests/content types, unchanged archive hashes and preview
permission boundary. On the production-origin editor, use the owner's existing
sign-in for editing/inline preview and a saved practice draft; show its exact
preview and obtain the existing preview-before-publication approval before
publishing test content. Preserve sources, credits and calculated results.
Do not weaken OAuth checks to sign in on a version-preview origin.

Check GitHub alerts after its graph scan; report scan lag accurately and never
manually dismiss a finding merely because code is absent from the browser.
Rollback a regressing repair to its verified predecessor through the protected
process; report any restored exposure. After two or three failed fixes, stop
and narrow scope. Remove task-owned downloads, install caches, build directories
and processes; retain only the necessary source, licences and evidence.

## Primary references

- https://github.com/advisories/GHSA-w5hq-g745-h8pq
- https://github.com/advisories/GHSA-hp3w-g68c-fv3c
- https://github.com/uuidjs/uuid/blob/main/README.md (CommonJS removed in 12)
- https://github.com/jonschlinkert/gray-matter/pull/137 (YAML API migration)
- Installed Decap package manifests and formatters; official npm registry metadata.

## Agreement

Owner approved “Prototype both fixes” on 20 October 2026. Implement as bounded
candidate changes on this draft branch; keep production unchanged pending the
checked preview and workflow acceptance. CMS alternatives are a separate
read-only comparison, not an instruction to migrate the editor.

UUID-only prototype: the bounds test failed against 8.3.2 with “Missing expected
exception (RangeError)” while the independent hash and consumer tests passed.
With the exact 11.1.1 override, clean installation, all 78 tests and the full build
passed. The five declared Decap consumers resolve the same checked package; both
CommonJS and ESM pass independent MD5/SHA-1 vectors, random IDs, parse/stringify
round trips and output-buffer preservation/rejection checks. Audit no longer
reports UUID; sprintf-js remains for the next independent repair.
