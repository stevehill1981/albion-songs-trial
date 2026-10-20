# Throstle & Stripes: name, address and editing guide

Keep the existing museum design, content, archive data and free services. Use
https://throstle-and-stripes.steve-e85.workers.dev for the public museum. Keep the
repository name and the authentication/Claude endpoint unchanged.

1. Update site.json, scripts/cloudflare-output.mjs and scripts/publish.mjs to
   deploy and verify the named public Worker. Update the strict preview-host
   check in auth/mcp/github.mjs and its fixtures without broadening trust.
2. Update the five legacy shells, admin title, pages listing and selected internal
   links. Preserve historical text, source links, badge and all archive records.
3. Replace generated publication.html with a readable editing guide, keeping its
   existing address and publication-status check. Cover drafts, previews,
   publishing, photographs, templates, collections, recovery and account setup.
4. Run tests and full build; inspect desktop/mobile renders and the Impeccable
   detector. Push a normal checked PR and verify the exact hosted preview.
5. Bootstrap the new public Worker if version previews require it. Merge only
   after checks and preview verification, then verify production routes/data.
   Update only EDITOR_ORIGIN on the existing auth Worker and deploy its checked
   source so CMS and Claude links use the new address. Preserve OAuth secrets.
6. Keep the old public Worker available during cutover; redirect old GET/HEAD
   bookmarks to the fixed new origin after successful verification. Do not
   forward credential-bearing writes. Record deployments and any limitations.
7. Commit/push evidence and clean task-owned builds/processes. Marie's own
   account invitation and independent acceptance wait for her GitHub username.

Verification: all existing tests/build and required CI checks; strict preview
host negative cases; source/archive preservation checks; new public pages,
editor configuration, guide/status, component-preview runtime and old bookmark
behaviour. No paid plans, dependencies or domain registrations.
