# AfterClick Validation Funnel V1

Status: repo-ready source, Stripe Checkout functions added, Resend emails prepared, Tally intake linked, SEO/AI discovery pass applied locally  
Date: 2026-06-18

This folder contains the first local multi-page validation funnel for AfterClick.

## Current revision

The public purchase path is now direct:

```text
Landing
-> Checkout Start
-> Stripe Checkout
-> Checkout Success
-> Post-payment intake
-> Thank-you
```

The former `leak-score/` flow is parked as an optional diagnostic or future lead magnet.

This revision adds a public-safe `sample-map/` proof page and rewrites the FAQ section so the first questions reinforce positioning, delivery value and differentiation before handling scope boundaries. The landing hero now includes an interactive mini-sample with tabs for score, leaks, fix plan and delivery, so buyers can preview the report logic before opening the full Sample Map. The Sample Map uses a neutral ecommerce mock store built directly in HTML/CSS, with polished AfterClick annotation title bars, markers and focused callout boxes layered on top. The delivery package explanation sits outside the report shell as a website section, so the sample report itself ends at the roadmap. The preview hub now separates active pages, prepared future pages and the parked Leak Score diagnostic.

Latest local pre-deploy pass: home, Sample Map and policy pages now include clearer SEO metadata, canonical URLs, Open Graph/Twitter tags, conservative structured data and AI-readable discovery files. `robots.txt` allows public search/user-triggered AI crawling while keeping checkout, API, thank-you, preview hub and parked diagnostics out of the index. Broad training crawlers are blocked as a default IP-protection stance.

## Pages

- `00_preview-hub.html`: local review hub.
- `index.html`: main landing page.
- `sample-map/index.html`: public-safe sample Revenue Map with neutral HTML storefront annotations and an external delivery/CTA band.
- `leak-score/index.html`: parked optional diagnostic / future lead magnet, not part of the primary purchase flow.
- `checkout/start/index.html`: billing country and buyer type pre-check that posts to `/api/checkout/session`.
- `checkout/request/index.html`: parked manual fallback, not part of the active public path.
- `checkout/success/index.html`: post-payment confirmation page with Tally intake handoff.
- `thank-you/index.html`: post-intake confirmation page.
- `privacy-policy/index.html`: review-ready privacy page.
- `cookie-policy/index.html`: review-ready cookie page.

## Current flow

```text
Landing
-> Checkout Start
-> Hosted payment
-> Checkout Success
-> Tally post-payment intake
-> Thank-you
-> 48-72h report delivery
```

## Offer

- Product: `AfterClick Revenue Map`
- Price: `$299 founder price`
- Delivery: private HTML report link, shareable PDF export and AI-ready Markdown file.
- No revenue, ROAS, CVR or profit guarantee.

## Review link

Open `00_preview-hub.html` from this folder for local page-by-page review.

## Notes

- Stripe Checkout is implemented through Cloudflare Pages Functions but requires Cloudflare env vars/secrets before live testing.
- The active V1 purchase route is direct order intent, not a fit application: landing CTA goes to `checkout/start/`, then to dynamic Stripe Checkout.
- `checkout/start/` collects minimal pre-payment context: report email and store URL. These values prefill/attach to Stripe where possible, are stored in Stripe metadata and are written to Paid Orders after successful payment. No separate abandoned-checkout lead capture is created in this V1.
- `checkout/request/` remains only as an emergency manual fallback and is not part of the active public flow.
- The post-payment intake form is created and linked: `https://tally.so/r/2EVX9V`.
- Tally is connected manually to Google Sheet `AfterClick Ops Tracker`, tab `Intake`; a test submission reaches the Sheet. Hidden-field pass-through should be verified during the first Stripe end-to-end test.
- Stripe webhook route prepared: `/api/stripe/webhook`.
- Paid Orders Sheet webhook source prepared in `../../30_deploy/google-apps-script-paid-orders-webhook.gs`.
- Resend buyer/admin order emails are implemented in `functions/_lib/email.js` and send from the Stripe webhook when env vars are present.
- Tally intake received email is implemented through `/api/tally/intake-webhook`; it requires `TALLY_WEBHOOK_SECRET` in Cloudflare and a Tally Webhooks integration before it can send live.
- Manual report-ready delivery copy is prepared in `functions/_lib/email.js` as a template for HTML/PDF/Markdown delivery.
- Required env names are listed in `cloudflare-env.example`; no secret values are stored here.
- `leak-score/` is parked as an optional future diagnostic and is not part of the primary purchase flow.
- The landing preview and `sample-map/` examples are synthetic, neutral and public-safe. No real brand logo, product packaging, screenshot crop or source-store asset is linked in the public funnel.
- The hero report preview is interactive but still static/local: no backend, no external script and no private data.
- The Sample Map hero and annotation section explicitly state that the store is fictional and that a paid map is deeper and customized around the buyer's actual pages, offer, intake and public shopper journey.
- The Sample Map annotation grammar is intentional and should be reused in future samples/reports: numbered markers instead of fragile rectangles; green for strengths/capabilities, yellow for medium opportunities and red for high-priority fixes.
- The delivery package block is intentionally outside the sample report shell: sample proof stays inside the report, commercial delivery explanation and CTA stay in the page wrapper.
- The AfterClick Fix Sprint is currently only a possible follow-up signal, not a defined public product. Public copy should frame it as optional, separately scoped and discussed only after the Revenue Map; before accepting requests, define scope, price, delivery limits and eligibility.
- The first FAQ entries are intentionally positive positioning FAQs, not only objection handling.
- Legal pages are review-ready operational drafts, not final legal advice.
- Meta Pixel ID `1677975296859006` is installed through the consent manager. PageView and configured funnel events load only after measurement/advertising consent.
- Footer and AI-readable discovery files include the official Instagram profile: `https://www.instagram.com/tryafterclick/`.

## QA status

Completed after neutral HTML proof revision:

- HTML parse for all 10 funnel pages.
- Inline/external JS syntax check for 12 files and 9 inline scripts.
- Internal link and asset path check.
- Public sweep for operational labels, old sample brand references, API keys, live checkout endpoints and unsafe production notes.
- `noindex` present on checkout and thank-you pages.
- Browser smoke on `sample-map/` desktop and mobile: no horizontal overflow; neutral HTML storefront examples reviewed as public-safe proof assets.
- Visual polish pass on annotation examples: title bars added, marker overlap reduced, callout boxes made more focused, mobile absolute overlays hidden to avoid distorted stacked layouts.
- Structure polish pass on `sample-map/`: delivery package moved out of the report shell and sidebar navigation, then verified as a separate website band.
- Browser smoke on landing hero mini-sample: tab clicks passed for `Score`, `Leaks`, `Fix plan` and `Delivery` on desktop and mobile; no horizontal overflow.

Latest general review on 2026-06-18:

- Preview hub updated with active, prepared and parked page states.
- Stripe Checkout Session function added with fiscal decision tree, tax ID collection rules, Italian custom fields and metadata.
- Stripe webhook added with signature verification, final invoice classification, Paid Orders Sheet sync and Resend order emails.
- Tally intake webhook added with shared-secret protection and buyer intake received email.
- Cloudflare support files added: `_headers`, `robots.txt`, `sitemap.xml`, `llms.txt`, `wrangler.toml`, `package.json`, `cloudflare-env.example`.
- SEO/AI discovery files updated locally: page titles/descriptions, canonical URLs, Open Graph/Twitter tags, `Organization`/`Service`/`FAQPage`/`CreativeWork` structured data, expanded `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt` and `assets/afterclick-og-card.svg`.
- HTML parse passed for all 10 pages.
- Inline JS syntax and internal link/path check passed.
- Public active-page sweep passed for old application/qualification copy and public CTA links to `leak-score/`.
- Browser smoke was not rerun in this session: the in-app Browser plugin was available but missing its required browser-client script. Manual browser review should start from `00_preview-hub.html`.
