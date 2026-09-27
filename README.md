# Unassume

**Stop your AI agent from guessing.**

Local-first. Bring your own key. Clarify the brief → get a verified prompt you can paste into Claude, Codex, Gemini, Cursor, or any agent.

[![Gold set](https://github.com/huytr91/unassume/actions/workflows/gold.yml/badge.svg)](https://github.com/huytr91/unassume/actions/workflows/gold.yml)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![Local](https://img.shields.io/badge/local--first-BYOK-orange)

---

### You

> Build me a customer management app.

### Normal AI

> Sure! I'll use PostgreSQL…  
> I'll add Google login…  
> I'll make it multi-tenant…  
> I'll use React…

→ **ASSUMES** ❌ ❌ ❌ ❌ ❌

### Unassume

Before building:

1. Who are the users?
2. What does "customer" mean?
3. Do customers log in?
4. What data must be stored?
5. Who can edit / delete?

→ **VERIFIED BRIEF** → paste into any AI

![Unassume flow — interview, answer, portable prompt](docs/images/unassume-flow.png)

---

## Before / after (same request)

**Request:** `Build me a customer management app.`

| | Raw chat | Unassume |
| --- | --- | --- |
| What happens | Invents Postgres, Google login, multi-tenant, React | Asks who users are, what “customer” means, login?, data, who can edit |
| Risk | You inherit guesses you never approved | You only ship what you confirmed |
| Output | One opaque answer | Answer **+** portable prompt for Claude / Codex / Gemini |

### Sample portable prompt (verified)

```text
Thực hiện brief sau đây. Chỉ dùng phần đã xác nhận. Không bịa.

OBJECTIVE
Build a CRM for small retail shops

CONFIRMED REQUIREMENTS
- Users: shop owner + 1–2 staff
- Customer: walk-in + phone contacts (no self-serve portal)
- Auth: staff login only
- Platform: web app
- Output: MVP schema + screens list

CONSTRAINTS
- Use only confirmed facts.

INSTRUCTIONS TO DOWNSTREAM AI
- Use only CONFIRMED REQUIREMENTS. Do not invent figures, sources, or side-effects.
```

Full machine-readable example: [`schemas/examples/portable-prompt.verified.json`](schemas/examples/portable-prompt.verified.json)

---

## Try it (30 seconds)

**Node.js 20+**

```bash
cd web
npm install
npm run dev
```

Open [http://127.0.0.1:3500](http://127.0.0.1:3500) → connect a provider (BYOK) → describe what you need → copy **Prompt mang đi** into another AI.

---

## Why this exists

| Typical LLM chat | Unassume |
| --- | --- |
| Fills in missing requirements for you | Asks before it builds |
| One opaque reply | Answer **+** one-click portable prompt |
| Cloud memory / training risk | Personal hints stay on **this device** |

Unassume is **not** an agent builder. It is the **clarify → verified brief** layer you run *before* agents execute.

---

## What you get

- **Clarify before generate** — local packs first, then optional model interview (meta brief only)
- **CLEAR gate** — deterministic rules, not model vibes (`npm run test:gold`)
- **No domain quizzes** — asks about *your* brief, not “what causes gold prices to fall?”
- **Always useful** — answer with stated assumptions; never a dead-end refusal
- **Portable prompt** — one paste for Claude / Codex / Gemini / Cursor
- **BYOK** — OpenRouter, OpenAI, Anthropic, Google, DeepSeek, Qwen, Kimi, Ollama

---

## How it works

```text
Your request
  → Interview (who / what / constraints — not guessing)
  → VERIFIED BRIEF (facts you confirmed)
  → Answer + copy-once prompt for any other AI
```

---

## Tests

```bash
cd web
npm run test:gold      # CLEAR / plan / anti-quiz regression (CI)
npm run test:compare   # offline Unassume vs raw for human judging
```

---

## Integrate as a layer

- Schema: [`schemas/portable-prompt.schema.json`](schemas/portable-prompt.schema.json)
- Examples: [`schemas/examples/`](schemas/examples/)
  - `portable-prompt.verified.json` — CLEAR (`label: VERIFIED`)
  - `portable-prompt.passthrough.json` — early proceed (`UNVERIFIED_PARTIAL`)

---

## Benchmark

See [`benchmark/BENCHMARK.md`](benchmark/BENCHMARK.md). Seed **B01–B28** (`seeded_by: maintainer`). Community cases via the **Benchmark case** issue template.

---

## Privacy

- **Remember connection (default on):** API key is stored **plaintext in `localStorage` on this device** so you do not reconnect every visit. Unassume never uploads the key. Dev server binds **`127.0.0.1` only** and sends a strict **CSP**. Untick Remember to keep the key in the tab session only.
- Personal ★ hints: `localStorage` on this device; injection-like values are filtered out before ★ boost and before verified briefs
- No cloud telemetry for product training

---

## Project layout

```text
web/                 Vite + React UI and local API (port 3500)
  server/rag/        Ontology, packs, CLEAR, Call A policy, gold set
docs/                Architecture and SPEC
schemas/             Portable prompt JSON Schemas
benchmark/           Seed cases + human rubric
```

---

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [SPEC](docs/SPEC.md)
- [Portable prompt schema](schemas/portable-prompt.schema.json)

---

## Contributing

```bash
cd web
npm run test:gold
npm run test:compare
npm run build
```

---

## License

[MIT](LICENSE)
