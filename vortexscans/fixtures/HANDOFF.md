# Vortex source handoff

Overall: PARTIAL. Module ID and family ID: vortexscans-v1. Final version: 0.1.1, beta. Not installed in Books or published to GitHub. The active manifest status means this beta is listed; it does not mean certified or ready for production.

Date: 11 October 2026, Asia/Manila.

## What was completed

Implemented discoveryHome, discoveryFeed, searchResults, extractDetails, extractChapters and extractImages. Used fetchv2 only, with narrow HTTPS hosts, manual redirect rejection, response type/size/status checks and source identity validation. No app files were changed. Original placeholder icon; upstream license and attribution retained. index.json and existing manifests showed no Vortex family or alias, so this is a new family. Asura Scans supplied a structural contract reference; Vortex selectors, endpoints and serialized data fields were independently observed.

The public homepage is a general manga/manhwa catalogue, not adult-only. The adapter excludes explicit genre labels and novels, and refuses locked, paid, short-link-locked, inaccessible, malformed, unauthorized and challenge content. This is not an exhaustive content classification; rating is suggestive, not safe. It does not solve challenges, use cookies or access paid material.

The observed archive component uses https://api.vortexscans.org/api/query with page/perPage/view/searchTerm/orderBy/orderDirection. Optional structured genre/status filters are not advertised because their AND/NOT semantics were not verified. They reject rather than silently weaken a structured query.

Series HTML contains post, initialChapters and totalChapterCount in its server-rendered data. In the sampled title, all 50 chapter records are present despite only 25 being rendered in the initial UI. The adapter checks the count and returns all 48 eligible free chapters in ascending order, excluding two paid/locked chapters. It never returns a UI-sized subset. If the server starts truncating this SSR data or serving pagination, the adapter rejects an incomplete count; that future pagination form is not implemented or claimed.

Chapter HTML contains a chapter record with seriesSlug, access flags and publicImages. A restricted literal parser reads these data fields. It never executes scripts, eval, new Function, analytics or downloaded application code. Unsupported serialized expressions/references reject. The sampled chapter provided 18 ordered URLs on storage.vortexscans.org. Cover URLs use that same origin; no image proxy or broad host wildcard is needed.

## Evidence

FIXTURE_PASS: the dedicated five-test suite exercises every declared handler, asserting exact invented normalized outputs in expected.json, including the complete reading path. It also tests pagination, duplicate/adult exclusions, locked chapters, malformed/empty/challenge bodies, redirects, truncation, size limits, source ownership, hostile serialized expressions, unknown image hosts and page-order gaps. No copied chapter payload is stored. Invented image URLs are not live image claims.

FAIL: the required generic repository fixture runner fails with `Vortex: unexpected redirect`. Its mock response supplies a synthetic finalUrl incompatible with strict validation, and its generic routing does not model this API/SSR contract. Fixing scripts/module-tester.mjs is outside the user's allowed file list. Redirect checks were not weakened to make a mock pass.

PARTIAL: the bounded Node live metadata probe succeeded in six requests: discovery (20 items), meaningful Archmage Curriculum search page 1 (one item) and page 2 (zero items, hasMore false), source details, complete authorized chapter list (48), chapter-1 terminal URL extraction (18), and one image HEAD request (200 image/webp). Zero publication image bytes were downloaded. HEAD is metadata, not proof of successful image-body delivery. No LIVE_NODE_PASS is claimed.

FAIL: npm test passed all 93 existing tests, then stopped in source-contract-audit.mjs because the prior AllManga candidate lacks a source-test-policy entry. Vortex likewise has no entry in tests/source-test-policy.json. Adding entries and updating generic fixture routing would require changes beyond the user-specified loose-file paths. No aggregate CONTRACT_PASS is claimed despite passing hash/static checks.

PARTIAL: iOS testing unavailable. xcode-select points to CommandLineTools, not full Xcode; no Books app test runtime exists in this source workspace. No IOS_RUNTIME_PASS, installation, download or reader-UI proof is claimed.

## Exact commands and outputs

Commands ran from /Users/harzonrigor/Documents/ChatGPT/Randos/synthetiq-manga-sources. Node v24.19.0 and npm were supplied by the bundled runtime; shell sessions prepended `/Users/harzonrigor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` to PATH.

- `rg -n -i 'vortex' index.json modules/*/manifest.json` — no matches. Read docs/TESTING.md before editing; no AGENTS.md found in the repository.
- Bounded curl inspection of https://vortexscans.org/, its series archive (`searchTerm=Archmage`), /series/archmage-curriculum, /series/archmage-curriculum/chapter-1, and one archive API query (`page=1&perPage=2&view=archive&searchTerm=Archmage&orderBy=lastChapterAddedAt&orderDirection=desc`). Ordinary catalogue redirects were followed during inspection only; runtime rejects redirects. HTML/API responses were nonempty and usable. The API returned HTTP 200 application/json, 1,967 bytes, totalCount 3. Read five public application bundles as text to verify routes, API host and pagination, with 25-second timeouts and 2–5 MB caps. No downloaded code executed or persisted in the repository; temporary samples remain outside it.
- `node --check modules/vortexscans/index.js` — exit 0, no output.
- `node scripts/validate.mjs --skip-hashes` — exit 0; 49 manifests, existing deterministic fixtures, JSON and PNG checks passed, hashes skipped. This script does not run the new dedicated Vortex suite.
- `npm run test:module:fixtures -- vortexscans` — failure report, 0 passed / 1 failed: unexpected redirect. Wrapper exit 0 does not override its failure report.
- `node --test modules/vortexscans/fixtures/test.mjs` — initial four tests passed; after adding hostile-expression/page-order coverage, final five tests passed, zero failed. All declared handlers have exact-output coverage.
- `node modules/vortexscans/fixtures/live-probe.mjs` — exit 0, result PARTIAL; six public requests, two search pages, 48 authorized chapters, 18 image URLs, terminal HEAD 200 image/webp, zero publication image bytes downloaded. Probe has an eight-request hard budget, 25-second request timeout, manual redirects and explicit host checks.
- `npm run test:module -- vortexscans --query "Archmage Curriculum" --limit 1 --pages 2` — NOT RUN: its live terminal stage performs GET downloads of publication images, contrary to the explicit no-image-download instruction. Used the bounded metadata/HEAD probe above and retained the narrower evidence classification.
- Bumped the new scaffold from 0.1.0 to 0.1.1 before `node scripts/finalize-hashes.mjs` — finalized descriptors for 49 modules. Restored unrelated formatting/hash descriptors changed by this repository-wide script, preserving existing-version bytes and the previous AllManga work.
- `npm test` — 93 tests passed, zero failed, then failed: allmanga-v1 is missing a source-test policy. Vortex's policy entry is also absent, as described above.
- `node scripts/validate.mjs` — exit 0; 49 manifests and SHA-256 descriptors valid.
- `node scripts/verify-repository.mjs` — exit 0; 528 files / 49 modules / all hashes exact (before adding this handoff; fixture files are not hashed install assets).
- `xcode-select -p` — /Library/Developer/CommandLineTools; iOS certification not run.

Hashes finalized and verified: yes. Installed in Books: no. Published or uploaded: no.

## Exact files changed by this request

index.json gained only the Vortex entry in addition to the preserved earlier AllManga change.

modules/vortexscans/manifest.json
modules/vortexscans/index.js
modules/vortexscans/icon.png
modules/vortexscans/fixtures/search.json
modules/vortexscans/fixtures/home.json
modules/vortexscans/fixtures/search-page-2.json
modules/vortexscans/fixtures/empty.json
modules/vortexscans/fixtures/malformed.json
modules/vortexscans/fixtures/details.html
modules/vortexscans/fixtures/chapter.html
modules/vortexscans/fixtures/incomplete.html
modules/vortexscans/fixtures/locked.html
modules/vortexscans/fixtures/wrong-series.html
modules/vortexscans/fixtures/unsafe-images.html
modules/vortexscans/fixtures/challenge.html
modules/vortexscans/fixtures/expected.json
modules/vortexscans/fixtures/test.mjs
modules/vortexscans/fixtures/live-probe.mjs
modules/vortexscans/fixtures/HANDOFF.md

## What remains

Authorize repository test-support changes to add the source policy and generic fixture routing, then run the full gate. Verify terminal image-body delivery only if image downloading is allowed. Install and test in Books' iOS runtime. Wider source coverage and any future SSR pagination changes need additional representative tests. The current source-family bytes are uncommitted local work; no claim of production readiness.

When ready to publish, sign in to or create an account at github.com, create a public repository, and upload the loose index.json/modules files with their folder structure intact. Preserve upstream LICENSE/attribution. Do not paste passwords or tokens into this chat. The final repository URL is obtained from your published repository; no such URL was created here.

## What to do in Synthetiq Books

Wait for the remaining checks before installing. Once published and tested, paste `https://raw.githubusercontent.com/YOUR-ACCOUNT/YOUR-REPOSITORY/main/index.json` into Settings → Extension Repositories. Choose Browse → Modules → Install for Vortex, then select it under Browse → Sources. Check search, details, the complete free-chapter list and a readable chapter. These menu labels are taken from docs/OPEN_SOURCE_MODULES.md, not verified against an installed app here. The repository must remain reachable for future installs and updates.
