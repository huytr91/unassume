# Unassume

**Answers without assumptions.**

Unassume is a local-first brief clarifier for LLM work. It interviews for missing requirements, scores **CLEAR** with deterministic rules (not model vibes), answers from confirmed facts only, and exports a **portable prompt** you can paste into any other AI agent.

> Most tools wrap a model and hope. Unassume clarifies the brief first — then generates.

[Architecture](docs/ARCHITECTURE.md) · [SPEC](docs/SPEC.md)

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![Local](https://img.shields.io/badge/local--first-BYOK-orange)

---

## Why Unassume?

| Typical LLM chat | Unassume |
| --- | --- |
| Assumes missing requirements | Asks meta brief questions first |
| Jumps straight to generate | Local packs + CLEAR gate before answer |
| One opaque reply | Answer **+** one-click portable prompt |
| Cloud memory / training risk | Personal hints stay on **this device** |

Unassume is **not** an agent builder (compare Dify / Crew). It is the **clarify → verified brief** layer you run *before* agents execute.

---

## Features

- **Clarify-before-generate ladder** — classify → domain packs → personal ★ options → Call A (meta only) → filter → CLEAR → answer
- **Domain packs** — coding, data, business ops, research / growth (Vietnamese + English templates)
- **CLEAR scorer** — model-independent; vague answers (`ok` / `tùy`) rejected; regression suite via `npm run test:gold`
- **Anti subject-matter quiz** — Call A cannot quiz domain knowledge; allowlisted brief slots only
- **Always deliver** — useful framework with stated assumptions; never refusal-only dead ends
- **Portable prompt** — copy-once downstream brief (`OBJECTIVE` / `CONFIRMED REQUIREMENTS` / …)
- **BYOK providers** — OpenRouter, OpenAI, Anthropic, Google, DeepSeek, Qwen, Kimi, Ollama
- **On-device personal memory** — frequent choices boosted as ★; no cloud telemetry

---

## How it works

```text
Free-form request
    → Interview (local packs first)
    → Declare structure (user-confirmed facts)
    → Prompt compiler (portable brief)
    → Model answer (confirmed facts only)
    → Optional: copy brief → any other agent
```

---

## Quick start

**Requirements:** Node.js 20+

```bash
cd web
npm install
npm run dev
```

Open [http://127.0.0.1:3500](http://127.0.0.1:3500), connect a provider (bring your own key), describe what you need.

### Verify CLEAR rules

```bash
cd web
npm run test:gold
```

---

## Privacy

- API keys stay in the browser (optional “remember”) — **not** written into the repository or a server database
- Personal RAG / ★ hints use `localStorage` on this device only
- No cloud telemetry for product training

---

## Project layout

```text
web/                 Vite + React UI and local API (port 3500)
  server/rag/        Ontology, packs, CLEAR, Call A policy, gold set
docs/                Architecture and normative SPEC
```

---

## Docs

- [Architecture](docs/ARCHITECTURE.md) — ontology, packs, CLEAR, Call A, portable prompt policy
- [SPEC](docs/SPEC.md) — gate semantics (CLEAR before execute)

---

## Contributing

Issues and PRs are welcome. Before opening a PR:

```bash
cd web
npm run test:gold
npm run build
```

---

## License

[MIT](LICENSE)
