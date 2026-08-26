---
name: project-gnosis
lang: Python
status: wip
url: https://github.com/PiUnknown/Project-Gnosis
live_url: https://gnosis.piunknown.dev/
stars: 0
order: 1
desc: Multi-agent system that turns any GitHub repository into a structured, human-readable architecture onboarding document.
---

Project Gnosis takes a GitHub repository URL and produces a structured onboarding document explaining that codebase's architecture, dependencies, complexity risks, and core components. It exists because undocumented codebases are the default: new engineers routinely lose two to four weeks exploring an unfamiliar repo, and the usual fixes (written docs, Loom walkthroughs, 1:1 onboarding) either don't happen or go stale immediately. Gnosis automates the mental model a senior engineer builds when exploring new code.

**How it works:**
- Seven specialized agents run in a fixed sequence, each reading from and writing to one shared state object
- **Ingestion** → pulls the file tree via the GitHub API
- **AST Parsing** → extracts symbol tables with tree-sitter
- **Dependency Graph** → builds a NetworkX graph, detects cycles
- **Complexity Scoring** → ranks files by risk using radon
- **Code RAG** → chunks and embeds code semantically into ChromaDB
- **Explainability** → retrieves context, generates per-component prose via an LLM
- **Doc Generation** → synthesizes everything into the final output

**Tech Stack:** Python, FastAPI, tree-sitter, NetworkX, radon, ChromaDB, sentence-transformers, NVIDIA NIM, React, TypeScript, Azure App Service, Vercel

## What the Project Does

A user submits a public GitHub URL, no config or API keys required. The backend classifies the repo into a size tier (Full / Full with Warning / Sampled / Rejected, based on file count) and runs the pipeline as a background job the frontend polls for status.

**Output — four artifacts per run:**
- `onboarding.md` — a document reading like something a senior engineer handed a new hire
- `complexity_report.json` — machine-readable, files ranked by risk
- `dependency_graph.html` — interactive graph rendered with pyvis
- `agent_context.md` — summary aimed at other AI coding agents working in the repo

**Inside the onboarding doc:**
- Project summary and repository statistics (file/language/function counts)
- Architecture map of most heavily-imported modules
- Per-component explanations with dependency and risk annotations
- Tech-debt report flagging specific complexity and circular-import issues
- Suggested file reading order, derived from a topological sort of the dependency graph

**Scope limits (v1):** public repos only; repos over ~3,000 files are rejected rather than analyzed at degraded quality.

## Who the Project Is Useful For

- **Engineering managers** preparing a codebase for a new hire's first day
- **Open-source contributors** finding the relevant files for an issue without reading the whole repo
- **Senior engineers** reviewing a large PR that touches unfamiliar code
- **Tech leads** scoping a refactor who need a risk-ranked file list before starting
- **Solo developers** returning to their own project after months away

## Engineering Decisions

**Architecture — shared state over direct agent calls**
- All seven agents read/write one `ArchaeonState` dataclass; the orchestrator (plain Python, not an LLM) drives the sequence
- Makes each agent independently testable: mock the state, run the agent, assert on the result
- Only Agent 6 calls an LLM, and only as a retrieval tool, not as a decision-maker — Agents 1–5 and 7 are fully deterministic

**Chunking — AST nodes, not token windows**
- A fixed 512-token window can cut a function in half, producing two unretrievable fragments
- tree-sitter gives exact function/class boundaries across every supported language
- Result: one function = one chunk, one class = one chunk per method, semantic meaning survives

**Vector store — ChromaDB over FAISS**
- Needed metadata filtering (file path, symbol name, complexity score) plus a low-ops, persistent local store
- FAISS wins on raw speed, but only past ~500K chunks — monorepo-scale, outside this project's v1 target

**Embeddings — local (`all-MiniLM-L6-v2`) over API-based**
- No per-request cost, no rate limits, works offline
- Accuracy tradeoff versus a hosted embedding model wasn't worth the added dependency at this stage

**Inference — migrated Groq → NVIDIA NIM (Aug 2026)**
- Both are OpenAI-compatible, so the swap didn't touch calling code
- Default model set to `meta/llama-3.1-8b-instruct` to hold 5–15s latency on the free tier; `llama-3.3-70b-instruct` available via runtime override
- Temperature fixed at 0.1 — consistency across runs mattered more than variety

**Deployment — migrated Render → Azure App Service, Streamlit → React**
- This is an interview/portfolio-facing tool, so the infrastructure needed to look like production infrastructure
- Tradeoff: Azure introduced a real platform bug (below), accepted for GitHub Actions integration and stronger uptime

**Job store — in-memory dict, not Redis**
- Jobs don't survive a restart; acceptable for a single-server tool with short-lived jobs
- Deliberately kept the architecture one file away from a Redis-backed store when multi-server support is needed

## Challenges Faced

**Agent 5 silent stall on Azure**
- *Cause:* `sentence-transformers` embedding ~700 chunks in one large CPU batch exceeded memory on a constrained App Service plan, triggering timeouts
- *Fix:* streamed chunks in batches of 128, ran explicit garbage collection per batch, added per-batch logging
- *Result:* stall resolved, throughput traceable instead of a silent freeze

**SQLite version mismatch on Azure**
- *Cause:* Azure App Service ships SQLite 3.31; ChromaDB requires 3.35+, so Agent 5 crashed immediately on any collection open
- *Fix:* swapped in `pysqlite3-binary`, overrode `sys.modules["sqlite3"]` before any ChromaDB import
- *Result:* a platform constraint invisible in local dev, only surfaced once deployed

**Token-based chunking producing unusable retrieval**
- *Cause:* fixed-size windows split functions mid-body with no awareness of code structure
- *Fix:* rebuilt the chunker around tree-sitter's AST output for exact boundaries
- *Result:* retrieval returns whole, explainable functions instead of arbitrary fragments

## What I Learned

- **Cloud platforms surface constraints local dev hides.** The SQLite mismatch had nothing to do with application logic — it was purely what the hosting environment ships by default.
- **For code retrieval, chunk boundaries matter more than embedding model choice.** Fixing how chunks were defined improved answer quality more than swapping in a stronger model would have.
- **Independently testable agents made debugging tractable.** When Agent 5 stalled, isolating and re-running just that stage against the same shared state found the root cause quickly.
- **Infrastructure choices communicate intent.** Moving from Streamlit to React and Render to Azure wasn't about new capability — both prior choices worked — it was about the project reading as production-intent in an interview setting.