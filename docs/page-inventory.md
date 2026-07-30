# White Glove Itineraries Page Inventory

Date: 2026-07-24
Branch reviewed: `staging`

Status labels:

- `Complete`: page exists and appears usable for its current purpose.
- `Partially complete`: page exists but depends on preview/local behavior, missing content, or later backend work.
- `Empty`: route exists but has little or no useful content.
- `Broken risk`: route may render, but code or copy shows a likely user-facing problem.
- `Needs factual verification`: content should not be treated as confirmed until sources and dates are checked.
- `Needs translation`: Yiddish/Hebrew text or display language needs review.
- `Needs mobile repair`: route needs small-screen layout testing before promotion.

## Public Pages

| Route | Purpose | Current Status | Notes |
| --- | --- | --- | --- |
| `/` | Homepage and destination search entry | Partially complete | Strong brand layout exists. Needs encoding/Yiddish repair in hard-coded destination names and source copy. Search exists, but needs full route logging and verification in Step 3. |
| `/stops` | Full destination directory/search results | Partially complete | Useful directory exists across guide, cemetery, and research-queue data. Needs encoding cleanup, factual verification, mobile testing, and better distinction between complete guides and research placeholders. |
| `/[city]` | Full city guide template for verified guide cities | Partially complete | Has kever navigation, beis hachaim link, shomer/access section, practical sections, saving buttons. Needs factual verification for each guide, encoding cleanup, and completion of missing practical sections. |
| `/lizensk` | Legacy Lizhensk guide route | Broken risk | Separate from the main dynamic guide system. Needs review because `/lizhensk` spelling is commonly searched, while this route is `/lizensk`. Should redirect or consolidate in navigation/search. |
| `/destinations/[place]` | Research-queue destination page | Partially complete | Good placeholder pattern exists. Needs complete guide content, cemeteries, burials, addresses, shomer numbers, accommodations, and last-verified status per destination. |
| `/cemeteries` | Beis hachaim directory | Partially complete | Lists cemetery records and known burial count. Needs encoding cleanup and data verification. |
| `/cemeteries/[cemetery]` | Individual beis hachaim page | Partially complete | Has address, navigation, arrival notes, shomer/access section, and burials. Needs verified shomer numbers, proper Yiddish display, and richer burial details per cemetery. |
| `/book` | The booking page: flights, hotels and cars, with cash or with miles | Partially complete | The one booking experience — `/booking` was a second one and now redirects here. Duffel flight search exists; hotels go to the partner search because Duffel Stays is not approved yet (`DUFFEL_STAYS=1` switches to the in-site one). Needs booking completion workflow and stronger error handling. |
| `/book/review` | Flight selection/review and payment component | Partially complete | Review page exists (was `/booking/review`). Needs real booking confirmation flow, payment/account handling, validation cleanup, and final Duffel production testing. |
| `/login` | User sign-up/login preview | Partially complete | Uses browser storage, not real authentication. Needs real register/login/reset/logout/email verification and redirect protection after sign-in. |
| `/account` | Account dashboard | Partially complete | Shows saved route preview from browser storage. Needs database-backed account data available across devices. |
| `/my-route` | Route and favorites dashboard | Partially complete | Local route/favorites exists and supports fixed dates. Needs cloud saving, real route optimization preferences, itinerary integration, and mobile testing. |
| `/access` | Site-lock password gate | Complete for current development lock | Depends on private analytics/access configuration. Needs final security review and clearer owner workflow before public launch. |

## Admin Pages

| Route | Purpose | Current Status | Notes |
| --- | --- | --- | --- |
| `/admin/login` | Private owner login | Partially complete | Password gate exists. Needs real administrator accounts/roles later. |
| `/admin` | Owner dashboard | Partially complete | Shows visits/searches/site lock when Upstash is connected. Needs role-based security, content-management forms, missing-content reports, and removal from public navigation in the proper roadmap phase. |

## API Routes

| Route | Purpose | Current Status | Notes |
| --- | --- | --- | --- |
| `/api/access` | Site/admin password cookie handling | Partially complete | Works for current password-gate model. Needs migration to proper auth/roles. |
| `/api/analytics` | Visitor/search tracking | Partially complete | Depends on Upstash. Needs privacy review, bot filtering, and dashboard reporting rules. |
| `/api/admin/site-lock` | Owner site lock control | Partially complete | Depends on Upstash. Needs admin-role protection when auth is built. |
| `/api/flights/search` | Duffel flight search | Partially complete | Token-gated live search exists. Needs city/metropolitan airport handling, filtering, result details, and production booking checks. |
| `/api/flights/book` | Duffel flight booking | Partially complete | Booking route exists but needs complete payment/passenger validation and production confirmation testing. |
| `/api/duffel/component-key` | Duffel payment component key | Partially complete | Needs production account/payment confirmation testing. |
| `/api/hotels/search` | Duffel hotel search | Broken/blocked | Current code returns blocked/error state unless Duffel Stays is enabled. Needs alternate hotel API decision if Duffel Stays is unavailable. |

## Current Cross-Site Issues

| Issue | Status | Notes |
| --- | --- | --- |
| Encoding artifacts | Not started | Source contains visible mojibake and misencoded Yiddish/Hebrew in multiple files. This must be repaired before serious content expansion. |
| Factual verification | Not started | Existing destination, burial, yahrzeit, access, and shomer data needs source/date verification. Do not mark as confirmed until checked. |
| Shomer completeness | Not started | Some records have access contacts; many do not. Needs structured shomer database and verification status. |
| Accommodations completeness | Not started | Most destination practical sections currently show the clean unavailable message. Needs verified accommodation records. |
| Real user accounts | Not started | Login/account/My Route are local preview features, not cross-device accounts. |
| Public admin links | Not started | Admin links exist in navigation/footer from earlier development. Roadmap says remove from public navigation and expose only to authorized admins later. |
| Mobile responsiveness | Measured | `npm run audit:ui` loads nine key pages at 320, 375, 390, 430, 768, 1024, 1280 and 1440 in a real browser and reports horizontal overflow, duplicated site search, doubled navigation, touch targets under 44px, tab order and unlabeled inputs. No page overflows sideways at any of those widths. Chromium only — Safari's date and form controls still need a real device. |
| Legal/trust pages | Empty | No privacy, terms, advertising disclosure, affiliate disclosure, or travel-booking disclaimer pages found. |

## Inventory Summary

- Public page routes found: 13
- Admin page routes found: 2
- API routes found: 7
- Fully empty routes found: 0
- Main blockers before content scale-up: encoding repair, real accounts/storage, shomer data structure, factual verification workflow, and mobile audit.
