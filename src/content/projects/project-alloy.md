---
name: project-alloy
lang: Python
status: research
url: https://github.com/PiUnknown/Project-Alloy
stars: 0
order: 1
desc: Controlled ablation pipeline measuring which data-curation decisions actually improve a fine-tuned language model.
---

Alloy is a controlled ablation pipeline built to answer one question with quantified evidence: which data curation decisions actually improve a fine-tuned language model, and by how much? Rather than fine-tuning a model once on a fixed dataset and eyeballing the outputs, Alloy trains the same base model (Qwen2.5-1.5B-Instruct) four times on a Stack Exchange technical Q&A corpus, changing exactly one curation variable at a time, and scores every resulting checkpoint against a single frozen held-out evaluation set carved out before any curation decision is made.

The deliverable isn't a chatbot. It's a defensible, quantified answer to a real data-centric AI question — does quality filtering help, does deduplication help, does a general-text replay buffer actually preserve capability — backed by a reproducible, config-driven pipeline rather than a one-off training run.

This is active work in progress: the pipeline design, ablation structure, and evaluation harness are fully specified; training runs are not yet complete.

**Tech Stack:** Python, PyTorch, Unsloth, HuggingFace `datasets`, sentence-transformers, scikit-learn, FAISS/MinHash, Weights & Biases, FastAPI + SQLite

## What the Project Does

**Nine sequential, idempotent pipeline stages:**
- **Ingest** — stream-parse the raw Stack Exchange XML dump into structured Q&A pairs
- **Eval carve-out** — reserve 500–800 held-out pairs, stratified by score bucket, before any other stage touches the data
- **Weak-label** — derive quality labels from community upvotes and accepted-answer flags
- **Train classifier** — a lightweight scikit-learn classifier scores every pair on embedding features
- **Dedup** — embedding-based near-duplicate detection removes redundant pairs
- **Assemble variants** — combine active filters into four ablation conditions, V0 through V3
- **Train each variant** — continued pretraining → SFT → DPO, run identically per variant except for that variant's active filters
- **Evaluate** — score every checkpoint against the identical frozen held-out set
- **Report** — the actual deliverable: a written, quantified comparison across variants

**The ablation design:**

| Variant | Quality filter | Dedup | Replay buffer |
|---|---|---|---|
| V0 — Baseline | ✗ | ✗ | ✗ |
| V1 | ✓ | ✗ | ✗ |
| V2 | ✓ | ✓ | ✗ |
| V3 | ✓ | ✓ | ✓ |

Each variant isolates exactly one additional decision over the previous one, so V1 vs. V0 measures quality filtering alone, V2 vs. V1 measures deduplication alone, and V3 vs. V2 measures the replay buffer's effect on catastrophic forgetting alone. Every run is driven by a single YAML config, and a SQLite lineage table records config hash → dataset version → checkpoint → eval metrics for every run, which is what makes the final comparison defensible rather than anecdotal.

## Who the Project Is Useful For

- **ML engineers deciding where to spend limited data-curation effort**, since the project isolates which curation step actually moves the needle rather than bundling several changes into one improvement claim
- **Researchers evaluating free-tier-GPU-feasible fine-tuning workflows**, since the entire pipeline is scoped to run on Colab/Kaggle free-tier hardware via Unsloth
- **Anyone evaluating Om's ML systems thinking**, since this project demonstrates experiment design (isolating variables, freezing an eval harness first) rather than just running a fine-tune

## Engineering Decisions

**Ablation structure — one variable isolated per variant, not four unrelated experiments**
- Fine-tuning once and eyeballing the output can't attribute improvement to any specific decision
- Structuring V0→V3 so each variant adds exactly one curation change over the last is what turns four training runs into an actual controlled experiment

**Eval harness frozen in Phase 2, before curation decisions are finalized**
- An eval harness designed after seeing curation results is no longer a fair judge of those results
- Building and freezing perplexity scoring, LLM-as-judge comparison, and a general-capability check against the untrained base model first — before Phase 3/4 curation — was treated as a hard ordering requirement, not a nice-to-have

**Held-out set carved out first, enforced by construction**
- Any later leak of eval data into training would invalidate every downstream comparison
- The 500–800 pair held-out set, stratified by score bucket, is reserved in Phase 0 before ingestion output touches any other pipeline stage, and is demonstrably excluded by construction rather than by convention

**Unsloth over standard HuggingFace fine-tuning tooling**
- The local dev machine (GTX 1650, 4GB VRAM, no tensor cores) can only smoke-test code, not run real training
- Unsloth's memory-efficient kernels are specifically what makes LoRA/QLoRA continued pretraining, SFT, and DPO feasible at all on free-tier Colab/Kaggle T4s — this is the dependency the whole project's compute budget rests on

**DPO over PPO/GRPO for preference alignment**
- Full RLHF requires a separate reward model and an expensive rollout loop that free-tier compute can't support
- DPO achieves a comparable preference-alignment effect directly from (chosen, rejected) response pairs, without needing that machinery — explicitly scoped as the only preference-alignment method in the non-goals list

## Challenges Faced

**Weak labels reflect popularity, not correctness**
- *Cause:* the quality classifier is trained on upvotes and accepted-answer flags, which correlate with but aren't identical to a genuinely correct answer — a correct but unpopular answer can be mislabeled
- *Fix:* documented explicitly as a stated limitation to address directly in the Phase 5 write-up rather than treated as a hidden weakness or oversold as a "correctness" detector
- *Result:* the eventual ablation conclusions will be scoped honestly to what the classifier actually measures

**DPO pair construction has a data gap not caught until Phase 1**
- *Cause:* Phase 0's parser retains only the accepted answer per question, discarding every non-accepted answer at ingestion — but Phase 4's DPO stage needs a lower-scored "rejected" answer per question to build preference pairs, and that data doesn't exist anywhere in the pipeline yet
- *Fix:* flagged as an open item requiring a targeted re-parse of the dump before DPO pair construction begins in Phase 4
- *Result:* caught and documented before it became a late-stage blocker, rather than discovered mid-training

## What I Learned

- **Ordering constraints in an experiment are as important as the experiment design itself.** Freezing the eval harness before curation decisions, and carving out the held-out set before any other processing, aren't implementation details — getting either one out of order would silently invalidate the whole comparison.
- **A documented limitation is more valuable than a hidden one.** Naming the weak-label popularity-vs-quality gap explicitly, before any results exist, was a deliberate choice to keep the eventual conclusions honest rather than something to address only if a reviewer asks.
- **Free-tier compute constraints should shape architecture decisions early, not get patched in later.** Choosing Unsloth and designing checkpoint/resume logic into Phase 0 (rather than retrofitting it after a session limit interrupts training) came directly from treating the GTX 1650's limitations as a real constraint on the whole pipeline, not just the local dev loop.