# Travelpayouts links

The application uses only the Aviasales (100/4114), Tiqets (89/2074) and Radical Storage (209/5867) program/tool IDs verified in the Travelpayouts generator on 2026-11-15. `src/lib/affiliate.ts` owns the allowlist, pure URL builders and server configuration reader. No old `NEXT_PUBLIC_AFFILIATE_*` values are used; remove them from deployment settings if present. Booking and Hostelworld searches remain available without commission, including their existing group composition and date parameters.

## Configuration and activation

- `TRAVELPAYOUTS_MARKER=728414`
- `TRAVELPAYOUTS_PROJECT_ID=<trs of the current project>`

Kacper has set both variables in Vercel Production and in the source checkout's `.env.local`. The old project is `528873`; create the project for `https://wloczykij.me` and replace only `TRAVELPAYOUTS_PROJECT_ID`. The marker stays the same. Vercel env changes require a new deployment; this task does not deploy. Missing either variable yields a direct, unpaid link.

## URL choice and consent

`https://tp.media/r` carries `campaign_id`, `marker`, `p`, `trs` and the URL-encoded destination in `u`. The Aviasales destination uses the official `/search/ORIGINDDMMDESTDDMMPASSENGERS` format, or `/?params=ORIGINDESTPASSENGERS` for an undated form. This preserves the project attribution in the same format as Tiqets and Radical. Reference: https://support.travelpayouts.com/hc/en-us/articles/5711895629714-Aviasales-affiliate-links .

The two public IDs are read on the server and passed to a React provider. Client builders use them only after explicit acceptance in the existing cookie banner. Denied, unknown or inaccessible consent storage keeps direct links. Server-prepared deals links use the same consent-aware anchor. The old automatic emrldco script was removed, so it cannot rewrite accommodation links or retain a hardcoded old project.

Use “Zmień zgodę na cookies” on `/cookies` to withdraw/reselect consent. This updates future links immediately. Cookies already set by external partners must be managed on their sites or in browser settings. External sites control their own cookies and consent after navigation.

## Measurement and manual check

`affiliate_click` remains the event name. The existing global click capture receives `partner`, `city`, `placement` and `paid`, with no duplicate per-link event handlers. Partners are `aviasales`, `tiqets`, `radical`; map historical `radical_storage` to `radical` in reports. Existing hotel clicks remain `booking`/`hostelworld` with `paid=false`. Existing server event names stay `affiliate_click:<partner>:<placement>[:unpaid]`. The anonymous server count does not use cookies or a persistent user ID.

1. Run `npm run dev` with the two env values; open a plan with a saved flight offer, a paid attraction and the final day.
2. Before consent, links lead directly to providers with no marker. Accept the banner: expect `tp.media/r`, `marker=728414`, the configured `trs`, the correct program IDs, `rel="sponsored noopener noreferrer"` and visible “link partnerski”.
3. Flight destination `u` must contain the saved IATA route and dates. Existing quiz group composition is preserved; no-group trips keep one adult. Infant handling and warning remain the already-merged group implementation.
4. Capture `window.gtag` calls in local browser QA or use GA4 DebugView to inspect `affiliate_click` parameters. A click is tracked even on the direct fallback (`paid=false`), as in the existing implementation.
5. In Travelpayouts, select the matching project, then Reports → Performance. Allow up to 24 hours to verify clicks. No account login or dashboard verification is performed by this task.

Optional Airalo/eSIM, unrelated `quiz_quiz_complete` cleanup, payment changes, feature flags, pushing to main and deployment are outside this change. This branch is based on main after PR #30; group behavior already present on main is retained rather than regressed to single-person trips.
