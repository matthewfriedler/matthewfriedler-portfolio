# CLAUDE.md — matthewfriedler-portfolio

Personal portfolio for Matthew Friedler (Training Specialist at Contentsquare, SF;
targeting solutions consulting / presales roles). Goes on job applications:
clean, credible, legible. These decisions are settled — don't re-litigate them.

## Stack (decided)
- Plain HTML + one shared stylesheet (`styles.css`). No framework, no React,
  no Tailwind, no build step. Vercel serves the files as-is.
- Vanilla JS only where genuinely needed (the contact form, `contact.js`).
- One serverless function: `api/contact.js` (Node, CommonJS) → Resend REST API
  via `fetch`. No `resend` SDK.
- **Zero npm dependencies.** No `package.json`. Ask Matthew before adding any.
- Fonts are self-hosted woff2 in `assets/fonts/` (SIL OFL), not Google Fonts.
- Clean URLs (`/about`, `/contact`) via `vercel.json`. Link with `/about`,
  not `about.html`.

## Pages
- `index.html` — Home (hero, at-a-glance facts)
- `about.html` — About, headshot (`assets/headshot.jpg`), project cards
- `contact.html` — Contact form

Header and footer are **copied by hand** into each page (no JS includes, to
avoid a flash of missing nav). When you change one, change all three. Only
`aria-current="page"` differs between pages.

## Design tokens (all in `:root` in styles.css)
Type pairing: **Source Serif 4** (headings, 600) + **Source Sans 3** (body/UI).
Same superfamily, so they harmonise; serif headings read considered rather
than startup-generic; the sans is very legible at small sizes.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f7f9fb` | page background (cool off-white, NOT cream) |
| `--surface` | `#ffffff` | header, footer, cards, inputs |
| `--ink` | `#16202a` | body text |
| `--muted` | `#4b5868` | secondary text (AA on bg) |
| `--line` | `#d9dfe6` | borders, dividers |
| `--accent` | `#1d4e7a` | links, buttons, focus ring (~8.5:1 on white) |
| `--accent-strong` | `#143a5c` | hover/active |
| `--accent-tint` | `#e8eff6` | secondary button hover |
| `--error` | `#b42318` | form errors only |
| `--success` | `#1e7a4c` | form success only |

Why navy/slate: the audience is B2B SaaS hiring managers; it reads
enterprise-credible. One accent, no gradients, colour only means "interactive".
Explicitly avoided: cream + terracotta, near-black + acid green. Light theme only.

Type scale: `--text-sm` … `--text-3xl` (fluid `clamp()`, ~1.25 ratio, base 16→18px).
Spacing scale (4px base): `--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 24 ·
`-6` 32 · `-7` 48 · `-8` 64 · `-9` 96. **Use only these** for margin/padding/gap.

Accessibility rules: visible `:focus-visible` ring everywhere; skip link;
44px min touch targets on buttons; `prefers-reduced-motion` kills transitions;
`overflow-wrap` set so long URLs/emails never cause horizontal scroll at 375px.

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
  the focus ring.

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
