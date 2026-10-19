# Full museum and saved-layout verification

19 October 2026. Original public museum version 25 remains unchanged.

- All five pages preserve original parsed markup/text, credits, source links and caveats: home 6,918 tokens, Hawthorns 784, results 1,192, wartime 9,975, Songs 1,646. Only declared trial navigation/resources differ. Frozen comparisons are migration evidence, not restrictions on later editorial changes.
- Protected archive checks pass: 5,842 competitive matches, 266 separate wartime results, 53 checked cup records and three annulled fixtures. Public archive copies match recorded provenance hashes. No private research notes are in the new repository.
- Twenty-two unit tests pass, including independent layout copies, bounded columns/backgrounds/nesting, escaped quiz JSON, route preservation, content-only draft guards, auth failure paths and verification of actual served page revisions.
- Local browser: era navigation, Astle search, exhibit reader/source links, quiz answer/next question, Hawthorns West Stand switching and enlarged 1969 photo work. League Cup and opponent filters display their corresponding results. The 1942/43 wartime view retains single-source labels and its separate totals.
- Local Decap test backend: applied Story and photograph, rendered two columns, saved a new page draft; copied its blocks, created Local saved layout in Page templates, pasted and saved a separate template draft. The editor reported Changes saved. This was a disposable browser test, not a GitHub publication claim.
- Link verification checks every generated public HTML page, local targets/assets, duplicate IDs and cross-page anchors. Missing page, missing anchor and duplicate-ID negative controls are rejected.

Remote publication and the owner-account workflow are recorded below when completed. Marie’s own account acceptance remains pending.

CI initially failed with `Error [ERR_MODULE_NOT_FOUND]: Cannot find module .../public/admin/blocks.mjs` because the layout test imported a browser widget before preparation. The copy helper now lives in `src/lib/layout-copy.mjs` and is copied to the browser at build time. All 22 tests pass with generated public files removed, then the full build passes. A standalone copied quiz was answered in the browser with no console errors; museum-only controls are guarded when absent.
