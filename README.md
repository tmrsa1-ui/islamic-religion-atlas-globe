# Islamic Religion Atlas · أطلس الدين الإسلامي

| Field | Value |
|---|---|
| Project name | **Islamic Religion Atlas** (أطلس الدين الإسلامي) |
| Package | `islamic-religion-atlas` |
| Event | Bathel 2026 (بذل) — track 03 |
| Judged work window | **4–6 October 2026** |
| Stack | Next.js 16 (App Router) · TypeScript · Tailwind CSS 3 · pnpm |
| Data | Pew Research Center, 2020 estimates, published 9 June 2025 (frozen JSON in `/data`) |
| Secrets | None. No `.env` needed. No external API calls at runtime. |

**Problem.** One introduction to Islam fails a Christian, a Hindu, a secular Swede and a Thai Buddhist.
**Success.** From choosing a country or an explicit background: headlines in under 60 seconds, one Islamic concept on expand, then a source or a verified center.
**Rule.** The visitor's religion is never inferred from language, behavior or IP. Framing comes from country statistics, or from a background the visitor picks explicitly.

## Disclosure (prior work)

- **Reused from Falak (فلك), the team's earlier project**, and adapted for this atlas:
  - Globe code: `lib/globe.ts` is adapted from Falak's `globe.js` (three.js scene, real-time Sun and Earth rotation, Yale BSC star field, canvas land/border textures, copper rim, DOM label layout, picking, drag/zoom/orbit).
  - Visual language: the night palette (ink, ocean, limestone, copper, verdigris tokens in `app/globals.css`), the dossier-style drawer, the numbered notebook index and 2px radii.
  - Files: IBM Plex Sans Arabic font files (`public/fonts/`, OFL), `public/globe/countries.index.json` (Arabic/English country names), `public/globe/countries-110m.json` (Natural Earth 1:110m via world-atlas) and `public/globe/stars.json` (Yale Bright Star Catalogue via d3-celestial).
- **Changed for this build:** the twelve atlas countries are lit and labelled first, others dimmed; the globe drives `/country/[iso3]` through the URL; hovering the country list turns the Earth; no live clouds or any other network call (Falak's NASA GIBS layer was removed); Falak's hand-drawn Kashmir polygon, search combobox, regions panel, weather and its logo mark were not brought over. The atlas mark is new.
- **Not reused:** anything from Adim (أديم) or Ufuq (أفق).
- The static "earth plate" (`components/EarthPlate.tsx`, shown before the globe loads or without 3D support) was drawn for this build.
- [ ] Team confirms this list is complete before judging.
- All work submitted for judging falls within **4–6 October 2026**; anything built before that window must be listed here.

## Run

```bash
cd ~/atlas-project
pnpm install
pnpm dev            # http://localhost:3000
```

Production:

```bash
pnpm build          # runs data checks, then next build  (npm run build also works)
pnpm start          # serves on port 3000
```

Checks:

```bash
pnpm check          # validates /data and prints the null-field checklist
pnpm accept         # acceptance boxes against a running server (BASE_URL defaults to http://localhost:3000)
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Night globe stage (the twelve countries lit in copper) beside a panel: explicit background chips, «خذني إلى دولة», searchable country list (server-rendered, works without JS/WebGL), world 2020 bars |
| `/country/[iso3]` | Panel: name → Pew 2020 bars → framing badge → six tabs المدخل، التصوّر، الوقفة، التحفّظ، الأصل، المرجع → question box → footer «المراجع» |
| `/api/journey` | The product (see below) |
| `/references` | Every claim, with anchor `#claim_id`; every percentage links here |
| `/centers` | Verified centers only (currently empty by policy) |
| `/method` | Pew vs WCD, China, conversion, fertility, migration (from `data/method.md`) |
| `/about` | Problem, success, scope, disclosure |

Default UI is Arabic (`dir="rtl"`); the header button toggles English (cookie `lang`).

## The journey engine — `POST /api/journey`

```bash
curl -s -X POST localhost:3000/api/journey \
  -H 'content-type: application/json' \
  -d '{"iso3":"IND","background":"hindu"}'
```

Body: `{ iso3, background?: "christian"|"unaffiliated"|"hindu"|"buddhist_ea"|"unspecified", question? }`

- Explicit `background` wins; otherwise the country's `content_template_id`.
- Retrieval only from `/data/*.json`. No scraping, no language-model call, deterministic.
- Returns `template_id, badge, headlines (5–8), detail (60–90 words), claim_ids[], centers[], tabs[] (the six sections in panel order, with fixed titles), abstain_flag, abstain_topic, referral, figures, missing[]`.
- Questions about apostasy, hudud, gender rulings or contemporary politics → `abstain_flag: true` + referral to qualified scholars; no ruling is ever produced. Arabic matching is token-based (so «حد» does not match inside «واحد»).
- Missing figures render as «لا رقم مؤكد» / "No verified figure" with a link to `/method`.
- Errors: unknown country 404, unknown background 400, bad JSON 400.

## Data (`/data`)

| File | Content |
|---|---|
| `world_2020_pew.json` | World 2020 by group + Europe 2020 |
| `countries.json` | 12 countries, Pew 2020 percents exactly as frozen; unknown → `null` |
| `templates.json` | 5 templates: `christian`, `unaffiliated`, `hindu`, `buddhist_ea`, `muslim_majority` — sections curiosity, misconceptions, attractions, objections, one_concept, next_step. `meta.section_titles` gives every template the same one-word titles: المدخل Entry · التصوّر Impressions · الوقفة What holds · التحفّظ Reservations · الأصل One idea · المرجع Sources |
| `references.json` | `claim_id, statement_ar, statement_en, year, published, publisher, url` |
| `centers.json` | Empty until an official URL is verified |
| `method.md` | Bilingual method note |

Rules enforced by `pnpm check`: the six section keys and their one-word Arabic titles never change, headlines ≤ 18 words (ar and en), concept 60–90 words, every `claim_id` resolves, every country figure is year 2020. Attractions cite only Köse (1996), van Nieuwkerk (2006), Zebiri (2008), Cambridge CIS (2013/2016) and Pew US (2018). No annual convert counts, no weather, no WCD figures, no emoji, no "join now".

## Globe decision

The globe is a direct three.js scene adapted from Falak (see Disclosure), not `react-globe.gl`. It lives in `app/(stage)/layout.tsx`, so it stays mounted while the URL moves between `/` and `/country/[iso3]`: clicking a lit country navigates, and the camera flies to whatever country the URL names. The Sun and the terminator are real for the current UTC minute. Everything the reader needs is server-rendered first; the globe is loaded afterwards in the browser. Without JavaScript or 3D support the page keeps the static SVG earth plate and the full country list. `prefers-reduced-motion` turns off the orbit, intro and animations. On phones the globe sits above the panel and uses a 2048 px texture.

## Not built (by design)

201 countries · live weather · fatwa engine · mixed Pew/WCD cards · religion auto-detection.

## Structure

```
app/            (stage) home + country drawer over the globe, (read) paper pages, /api/journey
components/     Stage (globe host), SectionTabs, Bars, CountryList, RandomCountry, AskBox, LangToggle, EarthPlate, SourceFooter
lib/            data loaders, journey engine, abstain detector, i18n, tiny markdown, globe (three.js)
data/           frozen JSON + method.md
scripts/        check-data.mjs, acceptance.mjs
```
