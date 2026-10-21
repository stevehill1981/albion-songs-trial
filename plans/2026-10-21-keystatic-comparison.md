# Keystatic comparison

Approved: test Keystatic in an isolated local fixture. Marie needs a friendly UI.
No live migration, deployment, new account access or publishing permission.

1. Add a separately locked package in `experiments/keystatic/` with current stable
   Astro, Keystatic and required official integrations. Keep the main dependencies
   and content unchanged. Bind development to loopback only.
2. Configure `keystatic.config.ts` with plain labels, content-first layout, page
   descriptions, nested slugs, collection links and a small supported component
   catalogue. Seed disposable copies drawn from existing museum content. Local
   Save writes only fixture content; it does not mean public Publish.
3. Render saved content through `src/pages/[...slug].astro` and the real existing
   Astro blocks using Markdoc tags. Check whether Keystatic itself can show unsaved
   Astro output, support page-tree moves, and preserve draft publication controls.
   Do not build replacement infrastructure to hide a failed comparison.
4. In a real browser: find a page, edit text, insert a component, create and reopen
   a nested page, save and inspect the actual resulting file and Astro page. Check
   narrow-screen usability and capture evidence. Verify the production site and
   main content remain unchanged. Record untested GitHub/hosted security cases.
5. Run fixture build/security audit and inspect adapter compatibility. Separate
   build success from proof of hosted runtime, auth, free quotas and safe publish.
   Report pass/fail/untested for each acceptance requirement. Push source/evidence
   without publishing it; stop task servers and remove disposable install/cache
   directories after preserving a reproducible locked fixture and browser data.

Files: fixture `package.json`, lockfile, `astro.config.mjs`, `keystatic.config.ts`,
`markdoc.config.mjs`, `src/content.config.ts`, `src/pages/[...slug].astro`,
`src/pages/index.astro`, `src/components/` and `content/pages/`; this plan and a
comparison report. No changes to the working editor API, schemas or deployment.
