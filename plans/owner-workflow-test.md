# Owner edit, preview and publish test

19 October 2026. The user authorises using his signed-in Safari editor to test the complete workflow while Marie creates her GitHub account.

1. Record the current `content/fact.json` and served revision. The original heading is `An Albion anthem on blue vinyl.`. Use only a temporary heading suffix `— publishing test`; keep historical claims and source fields unchanged.
2. In Safari's existing signed-in editor, change the heading and verify its live styled preview. Save a draft and verify that the public page still has the original heading.
3. Wait for the exact draft preview, open it from the editor and verify the temporary heading and source link. Check the draft's status and required checks through GitHub read-only tools.
4. Use the editor's own publishing controls. Verify the served public page and matching revision, rather than treating the editor's Published label as proof of deployment.
5. Restore the exact original heading through the same editor: save, preview, publish and check the public page. Verify all four fact fields agree with the original JSON and no unrelated content changed.
6. Record actual results, failures and any necessary fixes. Do not claim a CLI merge or source edit proves the CMS publishing controls work. Preserve any owner draft present before the test; do not discard user work. Keep this test free and confined to the trial site.

No dependency changes or application code changes are planned. If a failure requires code changes, reproduce and explain it first, use the required branch checks and rerun the affected browser step.

## Observed preview-link defect

The owner’s editor saved draft PR #2 and updated the styled preview correctly. The public site retained the original heading. After the draft check succeeded, the actual View Preview link became `https://9f620813-albion-songs-trial.steve-e85.workers.dev/songs#terrace-facts/songs%23terrace-facts`. The workflow already supplied a page/fragment URL, and Decap appended and encoded its configured preview path. Fix the draft status target to the preview origin and use the plain `songs` preview path. Recheck the actual browser link before publication; do not treat the CI status alone as sufficient.

The preview-link fix passed required checks in PR #3 and merged. The existing CMS draft was refreshed to include that fix; no content was published through the CLI. The merged fix did not immediately appear as a main push workflow in the returned run list, so a full main workflow was explicitly dispatched for this setup change. The delayed automatic main push run (39277285274) subsequently appeared and succeeded. This was a delayed observation, not evidence of a missing workflow trigger.


## Owner browser evidence

- Safari saved the temporary heading as PR #2, authored by `stevehill1981`. The inline preview used the site's actual colours, type and Baggie Bird illustration; the public heading remained unchanged while the draft built.
- After PR #3 fixed the link and the draft was refreshed, the editor opened `https://7c336eca-albion-songs-trial.steve-e85.workers.dev/songs`. The complete Songs page showed the temporary heading and retained source link.
- In Safari, selected Ready, Publish → Publish now, then confirmed the editor's publish dialog. PR #2 merged as `stevehill1981`, revision `1ad49b913c9a3c10ff75d123ff61ad36e27459d3`. Its automatic push workflow 39277667582 succeeded. The public HTML and version metadata both served that revision, with the temporary heading visible.
- Restored the exact original heading in Safari and saved a fresh draft, PR #4. The other three fields remained unchanged. Selected Ready and published via Safari’s Publish now control and confirmation dialog. PR #4 merged as `stevehill1981` at revision `d7f31fdbdbeb7dba7999411ea6f778be6adc58cc`, starting automatic push workflow 39278613261.

The code fix passed all 11 tests and the build's retained-page parity check before merging. No dependency, plan, billing or access changes were needed for this test. Marie's own sign-in and usability check remain pending her GitHub account.


## Final verification

The first public revision assertion ran before the restoration deployed and correctly failed: expected `d7f31fdbdbeb7dba7999411ea6f778be6adc58cc`, actual `1ad49b913c9a3c10ff75d123ff61ad36e27459d3`. Once the automatic deployment served the restored revision, the same assertion passed. The full served HTML matched the retained Songs page with the original fact inserted (whitespace normalised), including its exact revision metadata. All four JSON fields matched the saved baseline, and the temporary heading was absent.

A fresh browser load also showed the original heading, fact text and source link. Public-page screenshots record the [published test](evidence/owner-published-test.jpg) and [restored wording](evidence/owner-restored-public.jpg). No private browser tabs, account details or credentials are captured in these images.

The owner's complete edit → styled preview → saved draft → full-page preview → Ready → Publish → automatic public deployment round trip passed, followed by the same workflow to restore the original. Main branch protections were retained throughout. CLI operations inspected results and shipped the preview-link code fix; neither content publication was merged through the CLI. The original museum's source remains untouched.

Task cleanup: no development servers or temporary checkouts were started. Keep the two durable repositories and installed project dependencies; remove generated build/cache output and temporary baseline/PR-body files after verification. Marie’s trial remains a separate acceptance step.
