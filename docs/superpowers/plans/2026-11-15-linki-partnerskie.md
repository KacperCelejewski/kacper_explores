# Travelpayouts implementation plan

**Goal:** Update the existing main-branch affiliate implementation for the approved Travelpayouts programs, explicit consent, group searches and honest disclosure.

**Spec:** User prompt `PROMPT-linki-partnerskie.md` and lead's 2026-11-15 messages. Main base: `2d6635b` (includes PR #30).

**Architecture:** Keep `PartnerLink`, `partnerLinkProps`, `affiliateClickParams` and `affiliateServerEvent` contracts. Add a strict program table and pure Travelpayouts wrapper in `src/lib/affiliate.ts`. Read existing server env names in that module. Reuse group and passenger functions from main; never hardcode one passenger for group trips. Add a consent-aware provider for client link builders and clean direct fallback URLs for stored flight links. Remove the old automatic link rewriting script.

**Global constraints:** Aviasales 100/4114, Tiqets 89/2074, Radical 209/5867. Marker/project from env. Booking/Hostelworld remain unpaid regardless of obsolete NEXT_PUBLIC config. No GetYourGuide/Viator/Omio monetization. Sponsored links have `rel="sponsored noopener noreferrer"` and visible `link partnerski`. Keep GA4 event `affiliate_click`, normalize new Radical partner to `radical` and document historical `radical_storage`. No new feature-flag promises. No push/deploy.

## Tasks

- [x] Write failing tests for program IDs, nested encoding, blocked programs, missing config, consent, and passenger-preserving route rebuild. Update obsolete monetization assertions while retaining group/attribution tests.
- [x] Implement wrapper, config reader, Tiqets/Radical builders and plain accommodation links. Replace UI Skyscanner links with Aviasales, keeping the existing group passenger contract and explicit infant warning. The unused historical Skyscanner helper and its group tests remain untouched.
- [x] Connect server config to existing client links, apply consent and remove hardcoded auto-rewriter. Add cookies-settings reset. Preserve global analytics capture and server click counting.
- [x] Update legal pages, env comments and operational notes. Validate link copy with FORBIDDEN_COPY. Keep optional unrelated GA4 corrections separate.
- [x] Run all tests, lint, typecheck and browser QA; review final diff against main.

## Review focus

Nested Unicode queries; absent/denied consent; stale marker URLs from saved trips; missing flight data; explicit group sizes and infants; no disabled feature claims.

## Execution ledger

- Started in old dirty source checkout (baseline 92 tests). User requested integrating current main; fetch showed main already includes group work and earlier affiliate UI. Created managed worktree at origin/main to preserve unrelated uncommitted refactor in source checkout. Porting changes to existing main interfaces rather than overwriting them.
- Chosen link format: `tp.media/r` with Aviasales's documented IATA/DDMM search URL in encoded `u`; consistent project attribution via `trs`. Source: https://support.travelpayouts.com/hc/en-us/articles/5711895629714-Aviasales-affiliate-links .
- User subsequently requested work in `../kacper-explores-etap1` on `przepustka-etap-1`. Repaired its old .git pointer and rebased onto origin/main (fast-forward to 2d6635b; earlier etapa1 commits were already merged). Transferred only missing affiliate deltas and restored only my prototype changes in the shared t9 checkout; lead's env additions retained. The interim managed worktree is clean again.
- Ruling: retain the group behavior already merged in PR #29, instead of reverting it. No passenger algorithm changes; added TODO and a test for the existing one-adult default when composition is absent.
- Verification: RED/GREEN observed for wrapper/config/encoding and consent tests. Chrome mobile QA passed twice with a fixture plan, unknown/accepted/rejected/reset consent, all program IDs/disclosures, preserved passengers and plain Booking parameters, one affiliate_click with partner/city/placement/paid, no tracking scripts or horizontal overflow. Upstream affiliate navigation was prevented to avoid polluting partner reports; actual attribution remains a manual post-deployment check.
- Final review: fresh subagent identified stale attribution on deals fallback and exceptions from malformed/off-host external deal links. Both reproduced with failing tests, fixed with safe route rebuild and stripping before fallback; targeted tests GREEN. Impossible calendar dates and copy forbidden by FORBIDDEN_COPY also reproduced and corrected.
- Full suite: 551 tests passed. Typecheck passed. Final lint exited 0 after fixing a test-only createElement style error; existing repository warnings remain outside scope.
