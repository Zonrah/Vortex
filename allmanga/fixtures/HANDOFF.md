# AllManga handoff — PARTIAL

Date: 11 October 2026 (Asia/Manila).

This is an inactive, incomplete development candidate, not a working Books source.
Module ID and family ID: `allmanga-v1`. Version: `0.1.0` (new family, so no existing version was changed). Release track: beta. Status: retired, used to keep this blocked candidate inactive. It does not imply the website itself is retired.

## Completed

Cloned the public source repository and read docs/TESTING.md before editing. Inspected index.json first: no AllManga/AllAnime name, family, alias or legacy identity was present. Used maintained MangaDex (Español) as a structural direct-JSON contract reference. Its tests and results are not evidence for AllManga. All upstream license and attribution files remain intact.

Classified https://allmanga.to/ as a general manga/anime catalogue based on its public metadata and rendered catalogue; it is not adult-only. Individual adult or unclassified records are excluded by the candidate, and requests set the site's observed allowAdult and allowUnknown fields to false. Content rating remains unknown because source coverage is incomplete.

The public homepage returned HTTP 200, 5,516 bytes of HTML containing a Nuxt loading shell. The browser displayed general manga listings. Read public application bundles as text only; downloaded code is not executed by the module or stored in this repository. Observed endpoint: https://api.allanime.day/api. Observed query fields underpin the search/details candidate. One bounded direct search for Blue Lock, limit 2, page 1 returned HTTP 403, text/html, cf-mitigated: challenge. Stopped probing immediately; no CAPTCHA bypass, credentials, account cookies or publication images were used.

Search and details fixture records are invented from the observed GraphQL field declarations. Their response types, real cover hosts and behavior have NOT been confirmed by live JSON. The cover allowlist is deliberately underinclusive: external cover hosts reject. Synthetic fixture URLs are not claims that those images exist. availableChaptersDetail is present in the source's query definition, but its actual structure is unobserved. No chapter or image success fixtures were fabricated.

## Reading path results

- Discovery: unsupported; not advertised or implemented.
- Search: candidate parser has exact invented fixture output, duplicate/adult exclusions and deterministic page arithmetic. Live JSON unverified. Structured filter input rejects; AND/NOT/status filter semantics are not advertised.
- Details: exact invented fixture output, metadata and identity checks pass. Live response types unverified.
- Complete chapters: incomplete; rejects with an explicit PARTIAL error. No network or partial chapter list is returned.
- Terminal page images: incomplete; rejects with an explicit PARTIAL error. No image endpoint or host guessed.

## Files changed

- index.json: one inactive AllManga candidate entry.
- modules/allmanga/manifest.json
- modules/allmanga/index.js
- modules/allmanga/icon.png: original plain placeholder PNG, not the source's logo.
- modules/allmanga/fixtures/search.json
- modules/allmanga/fixtures/search-page-2.json
- modules/allmanga/fixtures/details.json
- modules/allmanga/fixtures/empty.json
- modules/allmanga/fixtures/malformed.json
- modules/allmanga/fixtures/unauthorized.json
- modules/allmanga/fixtures/challenge.html: minimal invented challenge sample, no live challenge tokens.
- modules/allmanga/fixtures/expected.json
- modules/allmanga/fixtures/test.mjs
- modules/allmanga/fixtures/HANDOFF.md

## Commands and results

Node was absent from the shell PATH; used the officially bundled Node v24.19.0 by prepending `/Users/harzonrigor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` to PATH.

1. `git clone https://github.com/Synthetiq-HQ/synthetiq-manga-sources.git` — initial sandbox DNS failure; authorized network execution succeeded.
2. Bounded `curl -L --max-time 25 --max-filesize 1500000 -D /tmp/allmanga-headers.txt https://allmanga.to/ -o /tmp/allmanga-home.html` — HTTP 200 loading shell. Public bundle reads were capped at 1–4 MB with 20–25 second timeouts; only three bundles were read.
3. `curl --max-time 25 --max-filesize 1000000 -H 'Referer: https://allmanga.to/' -H 'Accept: application/json' -D /tmp/allmanga-api-headers.txt "$(cat /tmp/allmanga-search-url.txt)" -o /tmp/allmanga-search.json` — HTTP 403 challenge; curl exit 0 does not mean source success. The URL file contained the observed GraphQL search query and public Blue Lock variables, no secret.
4. `node --check modules/allmanga/index.js` — passed, no output.
5. `node scripts/validate.mjs --skip-hashes` — exit 0: 48 manifests, deterministic existing fixtures, JSON, PNG, no ZIPs; hashes skipped. This validator does not run the new AllManga tests.
6. `npm run test:module:fixtures -- allmanga` — report FAIL, 0 passed / 1 failed, Unexpected API redirect. The generic fixture adapter supplies a synthetic final URL incompatible with strict redirect validation and does not route GraphQL detail queries. It is not sufficient for this module. Do not weaken redirect checks to accommodate the adapter. Its wrapper printed a failure report despite returning exit 0.
7. `node --test modules/allmanga/fixtures/test.mjs` — 4 tests passed, 0 failed: exact invented search/details, pagination/deduplication/exclusion, bad responses, and explicit failure of unverified reading stages. This is limited parser/security coverage, not a complete FIXTURE_PASS.
8. Required multi-page live module probe — unavailable/skipped after the prior HTTP 403, in accordance with the stop-probing rule. No LIVE_NODE_PASS.
9. `node scripts/finalize-hashes.mjs` — finalized descriptors for 48 modules. Initial new version 0.1.0 established before finalization. Restored unrelated manifest formatting and original index descriptors that this repository-wide script changed, preserving all existing-version bytes.
10. `npm test` — 93 existing tests passed, 0 failed, then command failed at source-contract-audit: `allmanga-v1 is missing a source-test policy`. Resolving this requires tests/source-test-policy.json, outside the user's specified allowed file list. No test/policy files were modified to conceal the failure.
11. `node scripts/validate.mjs` — exit 0, validated 48 manifests and exact SHA-256 descriptors.
12. `node scripts/verify-repository.mjs` — exit 0, 509 files / 48 modules / all hashes exact. Both commands passed again after restoring unrelated formatting.
13. `xcode-select -p` — /Library/Developer/CommandLineTools. Full Xcode and the Books iOS runtime were not available in this workspace. iOS certification not run. No IOS_RUNTIME_PASS.

Overall evidence: PARTIAL. Full-flow fixture test: FAIL. Full repository npm gate: FAIL. No aggregate CONTRACT_PASS, FIXTURE_PASS, LIVE_NODE_PASS or IOS_RUNTIME_PASS is claimed. Passing static/hash commands alone do not override the missing contract policy or reading path.

Hashes are finalized and verified. The source was not installed in Books. No GitHub repository was created, no files were uploaded, and no PR was created. Work is local in the cloned repository.

## Next smallest step

A maintainer needs permitted minimal public API samples for a non-adult title's details, complete chapter list and terminal image metadata, plus observed image/cover hosts. Do not provide account cookies or bypass a challenge. Then complete the handlers, authorize the required source-test-policy entry, adapt the fixture harness and run the full ordered tests, including iOS. Keep this candidate inactive meanwhile.

Once complete and tested, publishing can use GitHub's website: sign in or create an account, create a public repository, and upload the loose files while preserving index.json at the root and the modules folder structure. Preserve LICENSE and upstream attribution. Never paste passwords or access tokens into chat. Publishing this partial candidate does not make it usable.

## What to do in Synthetiq Books

Do not install this partial candidate yet. When a working version is published and tested, use the raw index URL `https://raw.githubusercontent.com/YOUR-ACCOUNT/YOUR-REPOSITORY/main/index.json` in Settings → Extension Repositories. Then Browse → Modules → Install, and choose the installed source in Browse → Sources. Verify search, details, chapter counts and a readable chapter. These menu names come from this repository's docs/OPEN_SOURCE_MODULES.md and have not been verified against an installed app here. The repository must remain reachable for future installs and updates.
