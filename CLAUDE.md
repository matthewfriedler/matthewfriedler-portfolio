# CLAUDE.md — matthewfriedler-portfolio

Personal portfolio for Matthew Friedler (Training Specialist at Contentsquare, SF).
Clean, credible, legible, with some life to it. These decisions are settled —
don't re-litigate them.

## Tone (decided)
- Describe what Matthew does **now**. Do NOT say he is job searching, "looking
  for" roles, or "open to opportunities". Contact copy is "open to connect /
  happy to talk", not "hire me".
- First person, plain, no buzzwords.

## Stack (decided)
- Plain HTML + one shared stylesheet (`styles.css`). No framework, no React,
  no Tailwind, no build step. Vercel serves the files as-is.
- Vanilla JS only where genuinely needed: `contact.js` (the form) and `site.js`
  (sticky-header shadow + scroll reveal). The site must work with JS off;
  `.reveal` only hides content when `<html class="js">` is set.
- One serverless function: `api/contact.js` (Node, CommonJS) → Resend REST API
  via `fetch`. No `resend` SDK.
- **Zero npm dependencies.** No `package.json`. Ask Matthew before adding any.
- Fonts are self-hosted woff2 in `assets/fonts/` (SIL OFL), not Google Fonts.
- Clean URLs (`/about`, `/contact`) via `vercel.json`. Link with `/about`,
  not `about.html`.

## Pages
- `index.html` — Home (hero, at-a-glance facts)
- `about.html` — About, headshot (`assets/headshot.jpg`), project cards
  (Russian Flashcards, BarPulse, Split the Tab). Home shows short teasers of the
  same projects — update both when adding one.
- `contact.html` — Contact form

Header and footer are **copied by hand** into each page (no JS includes, to
avoid a flash of missing nav). When you change one, change all three. Only
`aria-current="page"` differs between pages.

## Design tokens (all in `:root` in styles.css)
Type pairing: **Source Serif 4** (headings, 600) + **Source Sans 3** (body/UI).

Palette: **dark forest green** brand with a **mint** highlight. Dark bands
(header, hero, CTA, footer) alternate with a cool green-grey page.

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--forest-900` | `#0e2a1f` | header, hero bands, CTA, footer | white 15.3:1 |
| `--forest` | `#1a4d3a` | links, primary buttons, borders | 9.7:1 on white |
| `--forest-strong` | `#123a2b` | hover / pressed | |
| `--mint` | `#9be0bd` | highlight on dark; buttons on dark | 10:1 on forest-900 |
| `--mint-tint` | `#e5f2eb` | tags, icon tiles | forest-strong 10.9:1 |
| `--bg` | `#f4f7f5` | page (cool green-grey — NOT cream) | ink 15.4:1 |
| `--ink` | `#13211b` | body text | |
| `--muted` | `#4a5b53` | secondary text | 6.7:1 on bg |
| `--on-dark-muted` | `#b9cfc4` | secondary text on dark | 9.3:1 |
| `--line` | `#d3ddd7` | dividers | |
| `--field-border` | `#77887f` | input borders | 3.7:1 (UI needs 3:1) |
| `--error` / `--success` | `#b42318` / `#1e7a4c` | form states only | |

Hero glows use `#245f47`; even at full strength text on it is ≥ 4.5:1.
Focus ring is forest on light, mint inside `.on-dark` (via `--focus`).
Avoided: cream + terracotta, near-black + acid green.

Type scale: `--text-sm` … `--text-3xl` (fluid `clamp()`, ~1.25 ratio).
Spacing scale (4px base): `--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 24 ·
`-6` 32 · `-7` 48 · `-8` 64 · `-9` 96. **Use only these** for margin/padding/gap.

Motion (all disabled under `prefers-reduced-motion`): hero text entrance,
drifting hero glows, mint underline that draws under the highlighted word,
scroll reveal (`.reveal`, stagger with `style="--i:N"`), card lift + top-bar
sweep on hover/focus, nav underline slide, button arrow nudge.

Accessibility rules: visible `:focus-visible` ring everywhere; skip link;
44px min touch targets; `overflow-wrap` so long URLs/emails never cause
horizontal scroll at 320px; decorative SVGs `aria-hidden`.

## Contact form
- `contact.html` + `contact.js` (client validation, inline errors, success panel,
  failure message with mailto fallback — never fail silently).
- `api/contact.js` re-validates, checks a honeypot field (`website`), then POSTs
  to `https://api.resend.com/emails`. Delivers to matthewfriedler@gmail.com,
  `reply_to` = the visitor. Validation rules are duplicated in both files —
  keep them in sync.
- Sender defaults to `onboarding@resend.dev` (Resend test sender: only delivers
  to the Resend account's own email). Set `CONTACT_FROM` after verifying a domain.
- Responses: 200 ok · 400 invalid (+fields) · 405 wrong method ·
  500 not_configured (no key) · 502 send_failed.

## Testing checklist (what "verified" means here)
- `node dev-server.js`, load `/`, `/about`, `/contact`.
- curl `/api/contact` with: GET, `{}`, bad email, honeypot filled, valid payload.
- Browser at 375 / 768 / 1280 (and 320 for reflow): no horizontal scroll.
- axe-core (WCAG 2.2 AA + best-practice): 0 violations; every Tab stop shows
  the focus ring. Run axe AFTER reveal animations finish (mid-fade colours
  are semi-transparent and produce false contrast failures).

## Run locally
```
node dev-server.js          # http://localhost:3000  (Node 18+, no install)
```
`dev-server.js` serves static files with clean URLs and runs `api/*.js` the
way Vercel does (parsed `req.body`, `res.status().json()`). It loads `.env`.
It is excluded from deploys by `.vercelignore`.

## Deploy
- GitHub (`matthewfriedler/matthewfriedler-portfolio`) is the source of truth.
  Vercel is connected to the GitHub repo (Git integration), **not** direct
  uploads. Push to `main` → production deploy; PRs get preview URLs.
- Framework preset: "Other". No build command, no output directory.
- Env var `RESEND_API_KEY` set in Vercel → Project → Settings → Environment
  Variables. Never commit it; `.env` is gitignored, `.env.example` is the template.
- Nothing is "done" until it's pushed and a live URL is verified (200 + renders).
