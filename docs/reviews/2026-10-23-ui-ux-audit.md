# UI / UX Audit — Premier League Studio

**Date:** 2026-10-23
**Scope:** `frontend/` landing route (`/`) and studio terminal (`/studio`), reviewed live at 390×844, 768×1024, 1440×900 and 1920×1080, cross-checked against `CHALLENGE.md`, `HACKATHON_RULES.md`, `CONTEXT.md` and ADRs 0001–0008.
**Method:** four parallel read-only audits (landing visual design, studio UX/information design, CSS architecture & accessibility, content credibility vs. spec) plus direct source and in-browser measurement.
**Baseline commit:** `52cccfc` plus the uncommitted `frontend/src/app/globals.css` fix described in §0.

---

## §0 — Resolved before this review (do not re-litigate)

`frontend/src/app/globals.css` imported four Ionic stylesheets. Ionic's CSS is **unlayered**, so it outranked every Tailwind v4 `@layer utilities` rule and silently defeated the utility system:

| Ionic rule | Damage |
| :-- | :-- |
| `normalize.css` → `button { padding: 0; border: 0; border-radius: 0 }` | every `px-*` / `py-*` / `rounded-*` on every `<button>` |
| `typography.css` → `a { background-color: transparent; color: #0054e9 }` | every `bg-white` / `text-black` / `text-white` on every `<a>` |
| `structure.css` → `body { position: fixed; overflow: hidden }` | the document could not scroll at all |
| `core.css` → `h1 { font-size: 1.625rem; font-weight: 500 }` | the 72px hero headline computed to **26px / 500** |

The four imports are removed; only `<IonIcon>` is still rendered (an inline SVG that needs no stylesheet). Verified post-fix in-browser: `h1` = 72px/700, CTAs are proper white pills, `body` is `position: static`, landing page `scrollHeight` 3128px and scrollable.

**This fix is still uncommitted, and the public GitHub repo still contains the broken version.** The judge-facing build currently cannot scroll and renders its headline at 36% of the intended size.

---

## §1 — The headline finding

> The UI is not dull because of the styling. It is dull because **the product is a static diagram that contradicts itself**, and the marketing copy describes a system that does not exist.

Three independent diseases, each with its own measured evidence:

1. **The pitch does not move.** A tracked player centroid moved **0.39 m in x and 0.92 m in y over 5 seconds** — 3 px and 7 px on a 798 px-wide pitch. `high_possession` sets `vx = sin(t*0.8 + n) * 0.6`, integrated as `x += vx * 0.2` at 5 Hz, so each player oscillates inside a ~1.5 m circle around a fixed point. The repaint is 60 FPS; the motion underneath is imperceptible.
2. **The simulation has no football semantics.** The ball is welded to `h8` (De Bruyne) forever. The four "active passing lanes" are always the first four men in roster-array order — the goalkeeper and two centre-backs. There are **no discrete match events at all** (no pass, shot, duel, tackle, foul, turnover), so Stage 1 of the pipeline is unrepresented and milestone 1's validation targets (pass completion 75–85%, 20–30 shots) are unmeasurable.
3. **The four personas are four hardcoded card stacks** in one identical glass box. Only the headline string is live in Casual and Club; the numbers underneath never move. A demo viewer watching the Casual panel for ten seconds sees three fixed numbers, which disproves the personalisation pillar in front of them.

Compounding this: **the landing page shows zero product.** There is not one image, radar preview, chart, diagram or video frame on it. It is one glass-card template repeated 14 times on black. Meanwhile `/studio` — which does have a live radar — is deliberately kept off the landing page. The most compelling visual in the product is the one a judge never sees first.

---

## §2 — Blockers (a judge or a fan catches these in the 2-minute video)

### 2.1 The match clock is invalid 68% of the time and runs backwards
`mock-simulation.ts:297` builds `'68:' + (40 + (floor(frameCount*0.2) % 60))` — seconds 40–99 with **no minute rollover**. Observed on screen: `68:96`, `68:63`, `68:95`, then a jump back to `68:40`. The same invalid value is duplicated in the Broadcast Overlay lower-third. The most prominent live element in a broadcast product reads as a broken countdown timer.
**Fix:** absolute `matchSeconds` accumulator; `mm = 68 + floor(s/60)`, `ss = s % 60`; drive from elapsed wall-clock so Pause genuinely freezes.

### 2.2 The ball never changes hands, so every scenario contradicts the pitch
Measured in **Counter-Attack Transition**: the ball sits at **69 m in Kevin De Bruyne's feet** while the overlay narrates *"Saka intercepts loose Gvardiol pass"*. Measured in **Penalty Box Scramble**: the ball is at **x = 100.3 m, y = 66.8 m** — the bottom-right *corner*, 1.3 m off the touchline — while the overlay claims a Haaland–Gabriel duel. In a counter-attack the ball is in the wrong team's half with the wrong team.
**Fix:** `ballCarrierId` as scenario state, transitioned on possession events; ball leads the carrier along its velocity vector.

### 2.3 The formation disintegrates
After a few minutes, **14 of 22 players were within 1–3 m of the pitch boundary**, with four players stacked on top of each other behind the goal. `box_scramble` applies a pure random walk with **no restoring force**; `counter_attack_transition` freezes every non-specialist's velocity at its last value so they drift in straight lines until they hit the clamp at `x=104 / x=1 / y=67 / y=1`. `setScenario` does not reset positions, so the shape is never restored.
**Fix:** per-player home position with a spring term; clamp with reflection; teammate-separation force; reset formation on scenario change; confine the box scramble to `x ∈ [85,102], y ∈ [20,48]`.

### 2.4 "Pitch Control" is a vertical linear gradient, and the copy claims Voronoi
`PitchRadarCanvas.tsx:102-120` draws `ctx.createLinearGradient(0, 0, width, 0)` whose only input is the scalar `homePercentage`, plus one dashed vertical line. The shape of the overlay never changes — it is always one vertical split, and it never reads `frame.players`. The `PitchControlCell` type in `types/telemetry.ts` is **declared and never consumed anywhere in the repo**. Yet `AnalystExperienceView.tsx:59` labels the metric **"Voronoi Metric"** and the landing page claims *"Dynamic Voronoi access surfaces calculated from player sprint coordinates and velocity vectors."*
**Fix:** implement it — a ~20×13 grid of `PitchControlCell`s, `controlScore` = Σ(1/d) over home vs. away players, rendered as filled rects; derive `homePercentage` from the cell counts. ~40 lines, and it simultaneously makes the claim true, gives the overlay genuine shape, and makes the pitch visibly change. (If it is not built, the word "Voronoi" must be deleted everywhere — do not ship the claim without the artefact.)

### 2.5 Pass Difficulty Rating is a distance proxy, and three different PDR values appear on one screen
`CONTEXT.md` defines PDR over **passer pressure, receiver coverage, trajectory distance and defender velocity vectors**. The implementation is `risk = clamp(dist/35 + sin(t)*0.2)` — one of four inputs, crude; the `sin(t)` term is a time oscillation, not a spatial term, and defenders are never consulted.

Worse, the numbers disagree on the same card. One live frame: header **PDR 72**, the Tactical Reasoning Engine **"PDR 78.5"**, the four lane rows **"PDR 95"**, the canvas pills **"PDR 95"**. The aggregate is `62 + cos(t*1.5)*12` — unrelated to the lanes. And every lane is permanently "CONTESTED" because `isClear = risk < 0.45` is unreachable for a 60 m pass to the goalkeeper.
**Fix:** implement the real formula (walk the corridor, count defenders within 1.5 m, project each defender's velocity onto the pass vector, add the passer's local pressure, normalise by distance and lane width); compute the aggregate as the **mean of the lane values** so the two can never disagree.

### 2.6 The four "active passing lanes" always include the goalkeeper
`mock-simulation.ts:259` takes `players.filter(p => p.team === passer.team).slice(0, 4)` — array order, not plausibility. With De Bruyne as the passer the lanes always run **backwards into City's own half**, one a 62 m diagonal to Ederson. The most prominent data layer on the pitch is four physically absurd backward passes to the goalkeeper, all identically labelled.
**Fix:** rank receivers by position ahead of the passer, in the attacking direction, in the same half, weighted by a space/pressure model.

### 2.7 The Casual and Club personas display fabricated numbers
`CasualExperienceView.tsx` hardcodes `34.8 km/h` "Top Sprint Burst", `5` duels, `80% In-Box Win Rate`, `Rodri — 100 Pitch Touches`, `94.2% completion accuracy`. **None change while the sim runs.** Live Player Cam for the same player at the same moment: **2.8–6.8 km/h**. The engine's *maximum possible* player speed is `0.6 × 3.6 × 2.2 = 4.75 km/h` — the Casual panel's 34.8 km/h is **7× above the engine's ceiling**.

`ClubCentricView.tsx:76` hardcodes *"1. High territorial sustain: 68% pitch control"* — and it still says 68% when the live metric is 46.5%.

**Fix:** derive every number from `frame`. If a metric cannot yet be derived, **delete the card**. In a synthetic-data product whose entire selling point is provenance, a stale number is worse than a missing one.

### 2.8 Three contradictory clock-rate claims on one screen
`"10Hz RAW TELEMETRY"` (Analyst badge) and `"sampled synchronously at 10Hz"` (Player Cam) and `"Spatial Sampling — 10Hz Synchronous"` (landing) sit ~400 px from `"CONNECTED (5Hz SYNC)"` (breadcrumb) and a real `setInterval(..., 200)`. The engine is also internally inconsistent: `t = frameCount * 0.1` (a 10 Hz assumption) while the clock uses `frameCount * 0.2` (5 Hz), so motion runs at half real speed against a 1:1 clock.
**Fix:** implement ADR 0003 properly (10 Hz engine → 5 Hz published) or make every string 5 Hz and `t = frameCount * 0.2`. Do not leave two rates on one screen.

### 2.9 The latency badges are `Math.random()`, and the AI-reasoning one is never displayed
`fastPathLatencyMs: 14 + Math.random()*8`; `agentReasoningLatencyMs: 640 + Math.random()*280`. `agentReasoningLatencyMs` is **never rendered** — the landing page's "AI REASONING <1.5s" stat has zero runtime backing. ADR 0004's rule-based fallback does not exist (`grep -iE "fallback|rule-based|template"` → 0 hits).

### 2.10 The landing page's "60 FPS" badge is unmeasured, and the dev-tools badge is in frame
`PitchRadarCanvas.tsx:290` renders a hardcoded "60 FPS". The rAF loop *is* off the React path (ADR 0008 satisfied), but the `useEffect` deps include `frame`, so the loop is torn down and recreated every 200 ms. The Next.js dev-tools "N" badge is visible bottom-left in every capture at both 1440 and 1920 — a dead giveaway of an unreleased build in frame one of the video.

---

## §3 — Landing page: why it reads as a template

### 3.1 The brand mark is a tofu box
The header and footer logos are the character **U+F8FF** (Apple logo, Private Use Area) — a hollow rectangle on any machine without the macOS system font. It is the **first pixel a judge sees** and the **last pixel they see**, and it also appears in the `/studio` header. No Windows machine, no Linux container and not Geist contains this glyph.
**Fix:** an inline SVG mark with `currentColor` (a stylised pitch/ball glyph, or a "PL" monogram). Not an emoji — that renders as a full-colour square on Windows.

### 3.2 The intended typeface never loads
`globals.css:17` asks for `"Geist"`, a family name that **does not exist in the document**. Measured by DOM span-width test on "Football Intelligence": the request resolves to the `-apple-system` branch (824.28px), whereas the actually-loaded face `__nextjs-Geist` measures 920.95px. `document.fonts` lists exactly `__nextjs-Geist | 400 600` and `__nextjs-Geist Mono | 400 600`. The mono stack is Tailwind's default `ui-monospace, …, "Courier New", monospace`, which measures **24% wider** than Geist Mono.

Consequence: what renders depends on the recording machine — SF Pro on macOS, Segoe UI on Windows, Helvetica-metric on Linux. The one typographic decision that would make the page feel designed is the one that isn't happening.
**Fix:** `import { Geist, Geist_Mono } from "next/font/google"` with `variable: "--font-geist"`, applied to `<html>`. Note the bundled `__nextjs-Geist` axis is **400–600 only**, so `font-bold` (700) and `font-black` (900) clamp — either load the full Geist (100–900) or set the display weight to 600.

### 3.3 All content below the fold sits at `opacity: 0` until ScrollTrigger fires
On a fresh load at scroll 0: `.gsap-pipeline-step` ×5 and `.gsap-bento-card` ×5 are at `opacity: 0`. A `--full-page` screenshot of a freshly-loaded page shows **two blank black bands** where the pipeline row and the entire architecture bento should be — roughly **1,000 px of the 3,128 px page renders as nothing**. There is no `prefers-reduced-motion` branch and no failsafe, so if GSAP or ScrollTrigger throws, the page is permanently empty below the fold.
**Fix:** `gsap.from(...)` with `immediateRender: false` (a `from` tween does not pre-apply the hidden state), plus a `gsap.matchMedia()` reduced-motion branch and a 3-second failsafe that force-clears any element still at zero.

### 3.4 One card template, repeated 14 times
4 stat cards + 5 pipeline cards + 5 bento cards, all `bg-white/[0.04..0.08]` + `rounded-2xl/3xl` + `1px rgba(255,255,255,0.08)` + 12px `white/50` body. The hero stat strip is *structurally identical* to a pipeline card (LABEL / VALUE / CAPTION). A judge who scrolls twice stops perceiving information and starts perceiving a template.
**Fix:** differentiate the three families — stat strip → bare typography (48–64px mono numerals, hairline rules, no chrome); pipeline → a connected 5-stage spine, not five boxes; bento → genuinely varied tiles with one 2×2 hero tile.

### 3.5 Six saturated hues applied in order, not as a semantic system
The five bento cards run blue → green → purple → amber → red, each with a matching dot *and* a matching uppercase label; the pipeline footers repeat the same five in the same order. The hues are decorative, not categorical. It misfires concretely: **"Adaptive Delivery" is red** (universally error/danger) for a happy outcome, and **"Pass Difficulty Rating" is amber** (warning) for the most technically distinctive feature in the product.
**Fix:** two accents — **blue = structure/brand**, **green = live/measured/status** — and everything else neutral. Reserve amber and red for actual warnings.

### 3.6 Five different content widths; ~28% of the page is dead black
At 1440px: hero copy 1024px (left 208) · hero stat strip 768px (left 336) · pipeline grid 1216px (left 112) · bento 1216px (left 112) · CTA banner 992px (left 224) · footer copy 448px (left 496). The stat strip is **inset 224px on each side of the grids it sits directly above** — it reads as a band from a different page.

Measured dead space: hero 218px + section 1 217px + section 2 217px + CTA banner 285px tall with the headline starting 97px inside it + footer 264px tall holding ~110px of content ≈ **890px — 28% of the page** — one full viewport of scroll where nothing happens, split across four separate gaps. In a 2-minute video this is where the viewer's attention dies.
**Fix:** one content width (1216px) and one prose width (640px); cut `py-24`→`py-16`, `pb-32`→`pb-20`, footer `py-16`→`py-10`. Recovers ~350px.

### 3.7 The "cinematic stadium lighting" is literally invisible
The two `blur-[140px]` / `blur-[120px]` radial gradients sample at **RGB (5, 10, 13)** at their brightest — ~4% luminance, indistinguishable from black on any display and erased entirely by video compression. The hero is a pure black rectangle with white text.

### 3.8 Type: the hierarchy is inverted and the smallest text carries the most information
Body copy is **12px** on every card — the whole explanatory content of the 5-stage pipeline, which in a 720p-downscaled recording becomes ~8px. The `h1` double-differentiates one headline (line 1 at 700/white, line 2 at 500/white-60), so the "subhead" measures **804px against line 1's 677px** — the widest, heaviest object on screen. The hero paragraph is a centred 3-line block ending in a one-word widow ("…fan **experiences.**"). Three section `h2`s have different line counts and visibly different mass. `globals.css:47` sets a global `letter-spacing: -0.018em` on `html, body`, which the 10px uppercase stat labels inherit — exactly wrong for small caps.

### 3.9 The "gapless bento" is not a bento
Grid at 1440px: row 1 = 600 / 292 / 292 (height 255px); row 2 = 600 / 600 (height 229px). `grid-flow-dense` has nothing to dense — the spans are 2,1,1 then 2,2, so no tile dominates and there is no focal point; the two rows are 26px different heights and the seam is visible. Every card has a **50–60px void in the middle** (`flex flex-col justify-between` with a short body). Five different footer grammars sit side by side with no system — a bordered mini-panel, a giant `<50 ms` numeral, five flag emoji, a bare text row, three grey pill chips. `<50ms` appears three times on the page, spelled two ways.

### 3.10 The footer highlights an internal compliance note
The three headline footer items are "Synthetic Telemetry Only · Azure AI Foundry · **Canonical CONTEXT.md Compliance**". CONTEXT.md is an internal glossary; a judge has no idea what it means and it signals "built for the team, not for the audience." The footer's 12px `white/40` paragraph is the least legible text on the page and carries the credits.

---

## §4 — Accessibility (measured)

| Finding | Measurement | Verdict |
| :-- | :-- | :-- |
| `text-white/40` on card surface `rgb(16,17,21)` | **3.29:1** | fails AA (needs 4.5:1) |
| `text-white/40` on black | **3.66:1** | fails AA |
| `text-white/50` on card | 4.78:1 | passes AA, fails AAA |
| `text-white/60` | 6.62–7.4:1 | passes AA |
| Accent colours on cards | blue 5.17 · green 9.33 · purple 5.35 · amber 13.36 · red 5.54 | all pass AA |

The failing `white/40` is used on the labels that carry the *most* meaning: "Radar Layers:" (12px), "105m × 68m" (10px), "MATCH CLOCK" (9px), "Tap any player on pitch to lock camera" (11px), and every persona subtitle.

Other gaps:
- **The canvas is invisible to assistive tech and the keyboard.** No `role`, no `aria-label`, no fallback text, `tabIndex = -1`. "Tap any player on pitch to lock camera" is mouse-only. *Fix:* `role="img"` + an `aria-label` summarising the live state, an off-canvas live text summary, and surface the working Player Cam `<select>` as the keyboard equivalent.
- **The persona control is four unlabelled buttons, not a tablist.** All four have `role = null`, `aria-selected = null`, `tabIndex = 0` — four separate tab stops, no arrow-key navigation, no programmatic selected state. *Fix:* `role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls`, roving `tabIndex`, Left/Right/Home/End handling.
- **Both `<select>`s have no focus indicator.** `outline-none` with no replacement: `outline-style: none`, `box-shadow: none` — nothing visible changes on keyboard focus. *Fix:* `focus-visible:ring-2 focus-visible:ring-[#0a84ff]`.
- **The 5 Hz DOM update announces nothing.** No `aria-live` region anywhere, so nothing is announced when the story actually changes. *Fix:* a polite `aria-live` region for the narrative headline and inflection point, and throttle numeric text to ~1 Hz while keeping the canvas at 5 Hz.
- **`globals.css` defines `--apple-muted` at 0.55 and never uses it** — while every component hardcodes `text-white/40` / `text-white/50` instead.

---

## §5 — Responsive

- **390×844 is broken.** The header overflows: "Premier League Studio" wraps to 3 lines, the scoreboard splits "2 - 1" across 2 lines, the scenario `<select>` is cut off ("High Poss…"). The breadcrumb bar renders **on top of** the wrapped header text. The canvas is 390×252 with 8px player labels and a PDR pill one-sixth the pitch wide. **The persona switcher — the product's primary navigation — is ~1,500px down the page**, after the radar, the gauge *and* the broadcast overlay.
- At 1440×900 the **Broadcast Overlay sits below the fold** (y ≈ 900–1109) with no scroll affordance — a judge watching a 10-second viewport capture never sees the multilingual overlay, which is the product's most distinctive feature and the one that best justifies "broadcast" in the name.
- The right rail leaves a **~445px void** in Club mode (right column ends y ≈ 420, left runs to y ≈ 865) because the panel is `sticky top-24` in a `lg:col-span-4` column.
- No horizontal overflow at 390px or 1920px.

---

## §6 — Spec, rubric and submission coverage

### 6.1 Stage coverage in the UI

| Stage | CHALLENGE.md requirement | What the frontend shows | Verdict |
| :-- | :-- | :-- | :-- |
| **1 Ingest** | Event stream: passes, shots, tackles, interceptions, carries, fouls, pressure indexes, clock metadata | 22 positions + 1 ball + a string clock. **No event type exists.** | **Not represented** |
| **2 Interpret** | PDR from defensive congestion; xP; ball speed/accel; burst speed; cumulative distance; pitch control zones | PDR = distance proxy; pitch control = a constant; xP = a string in copy | **Fake** |
| **3 Explain** | Control vs. Chaos; Game Rhythm shifts; tactical pressure shifts; game-state leverage | One hardcoded constant + 4 hardcoded enum values | **Fake** |
| **4 Render** | Time-indexed JSON for broadcast graphic engines; lower-third cards; heatmaps; cue cards | React JSX only. No JSON, no payload schema, no sync timestamp | **Not represented** |
| **5 Personalize** | 4 personas + 5-language simultaneous stream | 4 personas ✓, but all render pre-written strings from one `NarrativeEvent` lookup table. Multilingual on 1 of 5 surfaces. | **Partial** |

### 6.2 Judging rubric

| Pillar | Weight | Evidence visible | Risk |
| :-- | :-- | :-- | :-- |
| 1 Technological Implementation | 20% | Canvas + TS + a simulation. **No Azure, no backend, no tests, no Voronoi, no event generator, no real PDR.** The strongest claims are the easiest to disprove. | **High** |
| 2 Agentic Design & Innovation | 20% | **Nothing.** No agent roles, no shared state, no blackboard, no MCP, no handoffs, no traces. The landing page asserts "Azure AI Swarm" produced the metrics. | **Total gap** |
| 3 Real-World Impact | 20% | Broadcast framing + persona model is a real product story. No deployment, no Docker, no IaC, no observability. | **Medium-high** |
| 4 UX & Presentation | 20% | **Strong** — the best pillar. Apple-grade design, working persona switching, working radar, working i18n. Damaged only by the self-contradictions. | **Low** |
| 5 Category Adherence | 20% | "Best Azure Cloud Native" and "Best Multi-Agent System" are invisible; UX categories are the only ones reachable today. | **High** |

**Hero technologies: 0 of 5 present in code.** `grep -ri azure frontend/src` returns only string literals — no SDK, no client, no endpoint, no Event Hubs, no Foundry call, no agent, no MCP.

HACKATHON_RULES §4 Stage 1 is a **pass/fail viability gate** on "genuine adoption of required Microsoft technologies". A frontend-only repo whose landing page says "Azure AI Foundry" and "Azure Event Hubs" and contains no Azure is the single highest-risk disqualification in this submission.

### 6.3 Submission checklist (HACKATHON_RULES §3)

| Item | Status | Note |
| :-- | :-- | :-- |
| Public GitHub repo | ⚠️ Partial | Exists and is public ✓, but the pushed version has the broken Ionic CSS, ESLint is missing, `tsconfig.tsbuildinfo` is committed, no LICENSE/CI. |
| Pitch text + explicit list of MS/Azure technologies | ⚠️ Dangerous | README lists Event Hubs, Container Apps, Functions, Cosmos DB, Fabric, MCP, Foundry, Agent Framework — **none of which exist**. |
| Demo video < 120s, public URL | ❌ Missing | Disqualifying. |
| Judge-accessible build (live, free, until Nov 10) | ❌ Missing | Only `localhost`. Disqualifying. |
| Synthetic-only data | ✓ | 100% synthetic. The "100% Synthetic" stat is true. |

### 6.4 ADR compliance

| ADR | Status |
| :-- | :-- |
| 0001 physics-based spatial engine, events derived from pitch geometry | **Not implemented** |
| 0002 four-agent swarm, shared tactical state | **Not implemented** |
| 0003 10 Hz engine → 5 Hz over WebSocket | **Not implemented**; badges claim 10 Hz |
| 0004 Tiered Fast-Path + rule-based fallback | **Not implemented**; 0 grep hits for "fallback" |
| 0005 monorepo: `backend/` (FastAPI, WS, NumPy, Azure AI SDK) + `frontend/` + `docker compose` | **No `backend/`, no `docker-compose.yml`** |
| 0006 Agent Framework + Azure MCP + blackboard + Pydantic contracts | **Not implemented** |
| 0007 frontend-first prototyping | **Honoured** — this ADR sanctions the current state |
| 0008 Next 16 / React 19 / TS 5.9.3 / Tailwind 4.3.3, exact pins, ESLint in CI | Versions mostly right; **caret ranges present** (`@gsap/react`, `@ionic/react`, `@types/node`, `postcss`), **ESLint not installed**, **no CI** |

ADR 0007 is the team's own licence for the current state. The problem is that **the copy has run ahead of the implementation** — either close the gap or pull the copy back.

### 6.5 Canonical terminology violations (AGENTS.md constraint 4)

Nine violations of `CONTEXT.md`'s explicit `_Avoid_` list, in code identifiers, UI labels and narrative strings:

1. `BroadcastOverlayTicker` — component, props interface, filename and StudioTerminal comment all use the banned alias **"ticker"** (the visible label is correct). Rename to `BroadcastOverlayPanel`.
2. `"Pitch Control Dominance"` (`AnalystExperienceView.tsx:57`, `types/telemetry.ts:57`) — invented compound of the banned "Dominance map".
3. `"territorial"` / `"dominance"` used as canonical metric language (`ClubCentricView.tsx:76`, `mock-simulation.ts:71,153`).
4. Spanish narrative uses *"espacio del **campo**"* for Pitch Space — the French and Japanese strings of the same payload are correct.
5. Arabic narrative uses *"مسارات التمرير"* (passing paths) for Passing Lane.
6. Arabic renders PDR as *"مؤشر الخطورة المباشرة"* — a metric that does not exist.
7. `"Multi-Persona Engine"` / `"Multi-Persona Terminal"` — `CONTEXT.md` fixes **Multi-Persona Presentation**.
8. `"Structured Possession"` / `"Transition Volatility"` presented as named metrics in the gauge.
9. Game Rhythm enum values `'Structured' | 'Fluid' | 'High Intensity' | 'Chaotic Break'` — "High Intensity" re-enters the banned intensity family.

### 6.6 Engineering hygiene

- `npm run lint` **fails** — `eslint` is declared in the script but is not in `devDependencies` and is not installed. ADR 0008 explicitly requires CI to invoke ESLint directly.
- `frontend/tsconfig.tsbuildinfo` is tracked in git and is not gitignored.
- Unused dependencies: `lucide-react`, `clsx`, `tailwind-merge`.
- **The design-token system is dead code.** `globals.css` declares 15 tokens (9 Apple palette + 6 surface/border); the whole `frontend/src` tree contains only **8 `var(--…)` usages** against **127 hardcoded hex literals** spread across **12 files**. `--apple-muted` is declared at 0.55 and never used while every component hardcodes `text-white/40` / `text-white/50`. *Fix:* a Tailwind v4 `@theme` block mapping the tokens (`--color-brand: var(--apple-blue)` → `bg-brand`, `text-brand`), then replace the 127 literals mechanically.
- **`app/layout.tsx` has no `next/font` import at all.** The loaded webfont is Next's built-in `__nextjs-Geist`, whose family name is `__nextjs-Geist` — but the CSS asks for `"Geist"`, which matches nothing. The app therefore renders in the system fallback on every platform. Also note `body` carries a hardcoded `bg-[#070a13]`, which the unlayered `globals.css` `html, body { background-color: var(--bg-pitch-black) }` overrides to `#000000`.
- No `LICENSE`, no `CONTRIBUTING.md`, no CI workflow, no tests, no `backend/`.
- The `git` remote points at `git@github-gamoventure.com:…`, which does not resolve publicly. The public GitHub repo is in sync at `52cccfc`; **the Ionic fix is uncommitted and unpushed.**

---

## §7 — What to do, in order

### Track 0 — today, ~2 hours, non-negotiable
1. Commit the `globals.css` Ionic fix and push. **The public repo is currently a broken build.**
2. Fix the clock rollover, the "Live" badge, and the 10 Hz / 5 Hz contradiction.
3. Add ESLint + a CI step; pin exact versions; gitignore `tsconfig.tsbuildinfo`; add `LICENSE`.
4. Implement the Voronoi Pitch Control grid (~40 lines) and the real PDR formula, deriving the aggregate from the lanes.
5. Derive the Casual and Club panels from `frame`; delete any card whose metric cannot be derived.
6. Fix the formation: per-player home position + spring, reflection clamp, separation force, reset on scenario change.
7. Make the ball a state variable with a scenario-driven carrier and a possession chain.
8. Rename `BroadcastOverlayTicker` → `BroadcastOverlayPanel`; fix the nine terminology violations.

### Track 1 — the "dull" fix, ~1.5 days
9. Landing: put the live radar in the hero; lead with a number; delete the tofu mark; load real Geist; fix the GSAP opacity-0 blank-page bug; one content width; cut the dead space; two accents instead of six; stat strip → bare numerals; rebuild the bento with one 2×2 hero tile and one footer grammar; rewrite the footer.
10. Studio: raise canvas type (names 11px with a halo, PDR pills drawn *after* players and offset off the lane), add a legend, give the carrier a distinct treatment, make the velocity vectors actually visible, strengthen the pitch (mown bands, penalty spot, D-arc, corner arcs, goal nets, crests, attack direction).
11. Move the Broadcast Overlay onto the pitch as a real lower-third; add a **Compare** mode (all four personas at once) and an **On-air preview** frame; show both latencies in the header.
12. Accessibility pass: tablist semantics, canvas labelling, focus rings on the selects, lift `white/40` to AA, add an `aria-live` region, throttled numeric text.

### Track 2 — the rubric multiplier, ~2 days
13. Scaffold `backend/` per ADR 0005 (FastAPI + WebSocket + NumPy + Pydantic) and move the engine server-side at a real 10 Hz → 5 Hz.
14. Emit discrete match events (pass with completion, shot with xG, duel, tackle, foul) — this unlocks §4.A, §4.D and milestone 1's 75–85% / 20–30 targets, and supplies the numbers the Casual and Club panels need.
15. Serve a **Broadcast Overlay JSON payload** endpoint (Stage 4) and render a raw-payload viewer.
16. Implement the **four-agent swarm** with distinct roles and a shared tactical blackboard (ADR 0002, 0006) — **and surface the agent activity in the UI.** Without a visible agent panel the swarm scores zero.
17. Deploy frontend (Static Web Apps / App Service) and backend (Container Apps) with a `docker-compose.yml`; wire one real Azure service (Event Hubs + a Foundry call for the narrative tier); persist overlay payloads in Cosmos DB.
18. Rewrite the README's Azure table to list **only what is actually running**; record the <120 s video; publish a judge URL that survives to Nov 10; submit by **26 Oct evening PT**.

### Contingency
If the backend cannot be built in time, re-scope honestly to a pure-frontend "Synthetic Match Scenario Studio": remove every Azure/agent claim from the copy, and target Pillar 4 (UX) and Pillar 5. But the Stage 1 pass/fail gate is on genuine Microsoft-technology adoption, so the cheapest insurance is **one genuinely running Azure service plus one visible agent panel** — that panel alone is the difference between 0% and ~20% on Pillar 2.
