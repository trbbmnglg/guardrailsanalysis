---
title: Guardrails360 v3.0 Itadori
emoji: 📊
colorFrom: purple
colorTo: pink
sdk: docker
pinned: false
license: mit
---

# Guardrails360 — AI System Instruction Auditor

Paste any AI agent system prompt and get a structured audit report of which security, privacy, and governance guardrails are present or missing — with severity ratings and remediation guidance.

## What it does

Guardrails360 runs your system instruction through 7 specialized auditor agents built on CrewAI. Each agent inspects the prompt against a specific compliance domain and returns structured findings. A governance agent then synthesizes everything into a single JSON report with per-guardrail status, severity, and remediation steps — streamed to the UI in real time.

## Audit categories

| Category | Standards |
|---|---|
| Security | OWASP LLM Top-10 |
| Privacy | GDPR, CCPA |
| Responsible AI | EU AI Act, bias & fairness |
| Quality & Reliability | Error handling, monitoring, determinism |
| Scope Control | Task boundaries, out-of-scope detection |
| Input Validation | Sanitization, format enforcement |
| Output Control | Response filtering, length limits |

Each guardrail in the report carries a status (`PRESENT` / `MISSING`), severity (`Critical` / `High` / `Medium` / `Low`), a description of the mechanism, and concrete remediation guidance.

## Optional features

- **Gatekeeper** — pre-flight LLM classifier that rejects non-prompt input before the full crew runs
- **Cost / latency profiling** — tier breakdown estimating per-1k-request compute cost
- **Green-AI scoring** — estimated energy per 1k requests with an efficiency score
- **Advanced reasoning** — switch the analysis engine between DeepSeek-V3, Llama-3.3-70B, and Qwen2.5-72B

## Usage

1. Open the [live Space](https://huggingface.co/spaces/rbrtbmnglg/guardrailsanalysis)
2. Paste your system instruction (10–20 000 characters)
3. Enter a [HuggingFace API token](https://huggingface.co/settings/tokens) with Inference access (`hf_…`)
4. Toggle any optional features
5. Click **Analyze** — results stream in as each agent completes

Your token is used client-side to call the HF Inference Router; it is never stored on the server.

## Architecture

- **Backend**: FastAPI serving a single `POST /analyze` endpoint (NDJSON stream)
- **Agents**: CrewAI sequential process — 4 audit agents run, then optional cost/green-AI agents, then governance synthesizes
- **LLM routing**: HuggingFace Inference Router (OpenAI-compatible), user-supplied token
- **RAG**: OWASP LLM Top-10 PDF indexed with sentence-transformers + ChromaDB
- **Frontend**: Vanilla JS (6 modules), Tailwind CSS, real-time progress bar
- **Deploy**: Docker on HF Spaces (port 7860)

## Local development

```sh
# 1. Clone and install
git clone https://github.com/trbbmnglg/guardrailsanalysis
cd guardrailsanalysis
python -m venv .venv && source .venv/Scripts/activate  # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 2. Run
uvicorn main:app --reload --port 7860
# Open http://localhost:7860 — the UI will ask for your HF token
```

## Deployment

Pushing to `main` on GitHub triggers `.github/workflows/sync-to-hf.yml`, which force-pushes to the HF Space and triggers an automatic Docker rebuild. GitHub is the single source of truth — never push to HF directly.

## License

MIT
