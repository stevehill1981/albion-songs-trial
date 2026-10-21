# Integrated Keystatic site studio proof

Approved: a small studio around Keystatic's public document-field API, a real
page tree, actual unsaved Astro preview and the existing publication state machine.
No vendor patch, new dependency, paid service or live migration.

1. Prove public field Input/parse/serialize embedding in fixture
   `src/studio/Studio.jsx` and `src/pages/studio.astro`. No private imports, DOM
   scraping or intercepted network requests. Narrow scope after two failed fixes.
2. Add a tested workspace model in `src/studio/`: stable page IDs, parents,
   segments, Markdoc content and redirects. A move computes child routes and
   redirects atomically. Reject cycles, orphans, collisions and reserved paths.
3. Add fixture `src/pages/studio-preview.astro` to validate bounded requests and
   render unsaved Markdoc with the existing Astro TextPanel/Photograph components.
   Abort superseded work, reject stale responses and lock scripts in the preview.
4. Reuse root `src/editor/visual/workflow.mjs` via an optional document validator;
   preserve default component validation and existing tests. Fixture `studio-api.js`
   and a local operation adapter save/reopen immutable workspace drafts, verify
   rendered preview and release only the exact reviewed revision to a local file.
5. Test browser creation, movement, immediate preview, save/reopen, review and
   local release. Negative tests cover stale revisions, unreviewed previews,
   post-review changes, invalid/cross-origin requests and uncertain outcomes.
   Check sources, credits, redirects and all moved children. Preserve evidence.
6. Report local proof separately from hosted acceptance. GitHub auth, fresh access,
   atomic commits, exact hosted preview and public publication need an explicitly
   scoped backend adapter, exact-preview approval and any required OAuth consent.
   No production API/allowlist change or deployment in this local proof. Push the
   checked source; stop task servers and remove disposable caches afterward.

New fixture files stay under `src/studio/`, `src/pages/studio.astro`,
`src/pages/studio-preview.astro`, `src/pages/studio-api.js` and `test/`.
If embedding requires another dependency declaration, ask rather than patch vendor
code. Full hosted workflow is not proven by local tests or a successful build.

## Local proof outcome

All six local implementation steps passed. The public document field requires
Keystatic's full app context, so the studio is a custom singleton field inside
that app. Browser evidence covers creation, child moves, unsaved Astro rendering,
saved snapshot reopening, review invalidation and an exact atomic local release.
The finish review's rejected-address finding was reproduced and corrected: the
accepted value is restored and publication review is cancelled.

The combined suite passes 151 tests, including two independent stores racing to
publish against one release base: exactly one whole snapshot wins. The compiled
hosted endpoint is exercised to confirm it returns 403. No hosted sign-in,
permission, CPU or real GitHub publication claim follows from these checks.

A separate free hosted proof and its GitHub App boundary require the pending
architecture approval, then a written hosted-adapter plan and checked-preview
approval before deployment. The museum remains on its existing editor.
