---
name: orbitdesk
lang: Python
status: active
url: https://github.com/PiUnknown/OrbitDesk
stars: 0
order: 3
desc: Local-first support-agent workflow that answers support questions via graph-routed, verified RAG using only local models.
---

# OrbitDesk

> **Disclosure:** This project was built with substantial assistance from OpenAI Codex, which generated the initial boilerplate, repository scaffolding, and much of the implementation code, and assisted with debugging, testing, and documentation. The architecture and behavior were reviewed and exercised directly and can be explained or modified without the assistant present.

OrbitDesk is a local-first support-agent workflow built for a course assignment requiring a graph-based system with shared typed state, conditional routing, local (non-hosted) models, retrieval over supplied material, grounded generation, verification, and a bounded revision path. It answers support questions for a fictional product using retrieval-augmented generation over a supplied knowledge base and resolved support cases — it is an orchestration and reliability exercise, not a general-purpose chatbot.

A question enters the graph, gets classified into one of five routes, and either proceeds through retrieval → generation → verification (revising once if verification fails) or exits immediately through a clarification, escalation, or out-of-scope path. Every routing decision is deterministic — the model is never trusted to decide on its own whether a refund, secret request, or escalation boundary is safe.

**Tech Stack:** Python, LangGraph, local Hugging Face models (`Qwen2.5-0.5B-Instruct`, `BAAI/bge-small-en-v1.5`), FAISS

## What the Project Does

**Routing (deterministic, not model-decided):**
- **Answerable** — sufficient evidence exists; proceeds through retrieval, generation, and verification
- **Requires clarification** — insufficient symptom/error information; asks for documented diagnostic fields
- **Requires escalation** — a documented condition is present (repeated failures, suspected credential exposure)
- **Out of scope** — refunds, cancellations, or other unsupported actions
- **Safe failure** — the fallback after one generated answer and one revision both fail verification

**Retrieval and generation, for answerable questions:**
- Parses every Markdown file in the knowledge base plus non-superseded resolved support cases as secondary evidence
- Encodes documents and the query locally with `BAAI/bge-small-en-v1.5`, searches a FAISS index for 5 candidates, reranks deterministically down to 3
- Generates a grounded answer with a locally cached `Qwen2.5-0.5B-Instruct`, instructed to use only supplied evidence, cite source IDs, and never request secrets
- Verification checks schema compliance, citation consistency, lexical grounding against retrieved evidence, and unsafe content (secret disclosure, unsupported account-action claims); a failed check triggers exactly one revision attempt before falling back to `safe_failure`

There are no hosted LLM API calls anywhere in the system — the assignment explicitly prohibited them, and the generation adapter loads with `local_files_only=True` to enforce it structurally rather than by convention.

## Who the Project Is Useful For

- **Support teams evaluating deterministic-routing RAG systems**, where the cost of a wrong escalation or refund decision is too high to leave to model judgment
- **Anyone comparing local-model-only architectures**, since the entire generation and embedding stack runs offline on cached Hugging Face checkpoints
- **Reviewers assessing reliability engineering over raw model capability**, since the project prioritizes bounded retries, schema enforcement, and safe-failure behavior over language quality

## Engineering Decisions

**Routing is deterministic code, not an LLM decision**
- Letting a language model decide whether to process a refund request or flag an escalation risks an inconsistent or exploitable boundary
- Classification into the five routes runs through explicit rules against documented conditions, so the same input always routes the same way — the LLM is used downstream for generation, never for the routing decision itself

**A local 0.5B model, chosen for CPU practicality over quality**
- The assignment prohibited hosted LLM APIs and needed to run on ordinary hardware
- `Qwen2.5-0.5B-Instruct` was selected specifically for CPU feasibility, with `ORBITDESK_LLM_MODEL` left swappable to a larger cached model (e.g. `Qwen2.5-3B-Instruct`) when hardware permits — the terse output quality tradeoff is accepted and documented rather than hidden

**A deterministic post-generation citation step, not a stronger prompt**
- The small model sometimes omits exact citation syntax even when instructed to cite sources
- Rather than relying on prompt engineering alone, a deterministic step attaches the retrieved source IDs after generation — it preserves retrieval provenance without adding any content the model didn't actually use

**Bounded to exactly one revision, not an open retry loop**
- An unbounded verify-revise loop risks masking a systemic evidence or grounding problem behind repeated retries
- Capping revision at one attempt, with `safe_failure` as the guaranteed terminal state, keeps the system's worst-case behavior predictable and testable

**Retrieval reranking is a deterministic lexical step, not a second model**
- A cross-encoder reranker would improve retrieval precision but adds model complexity and load time for marginal benefit at this corpus size
- A deterministic local lexical reranker over the FAISS candidates was judged sufficient for the assignment's knowledge base size, with the cross-encoder path explicitly scoped as a documented, un-implemented option rather than silently skipped

## Challenges Faced

**Keeping source-of-truth priority consistent when the KB and case history disagree**
- *Cause:* resolved support cases can describe older or superseded behavior that contradicts current knowledge-base documentation
- *Fix:* established an explicit source priority order (current KB documents ranked above resolved cases) and excluded any case flagged `superseded` from indexing entirely
- *Result:* generation never grounds an answer in outdated case behavior when current documentation says otherwise

**Verifying the model didn't fabricate account state or steps**
- *Cause:* small instruction-tuned models will readily produce plausible-sounding but unsupported troubleshooting steps or account claims when evidence is thin
- *Fix:* built explicit verification checks for unsafe actions, unsupported advice, and account-action claims, separate from the citation and schema checks
- *Result:* a fabricated but confident-sounding answer fails verification and triggers revision or `safe_failure` instead of reaching the user

## What I Learned

- **Deterministic routing is a safety boundary, not just an architecture choice.** Refusing to let the model decide refund or escalation routing directly was the single decision that made the rest of the system's safety guarantees possible to reason about.
- **A small local model changes what "good enough" verification has to catch.** Because `Qwen2.5-0.5B-Instruct` is more prone to terse or ungrounded output than a larger hosted model, verification had to be stricter and more explicit than it would need to be with a stronger generator.
- **Bounding a retry loop forces you to design for the failure case, not just the success case.** Capping revision at one attempt meant `safe_failure` had to be a genuinely well-formed, schema-valid output, not an afterthought — which turned out to matter as much as the happy path.