---
name: issue-router
lang: Python
status: active
url: https://github.com/PiUnknown/IssueRouter
stars: 0
order: 1
desc: Six-stage NLP pipeline that turns raw civic complaints on X into ranked, department-routed action briefs.
---

IssueRouter is an AI-powered civic grievance triage system built at HNC 3.0 (3rd place, Team Convergence). It ingests citizen complaints posted on X, runs them through a six-stage NLP pipeline, groups similar complaints into clusters, and surfaces ranked, actionable briefs on a real-time officer dashboard, without a human doing any of the sorting. The problem it targets is specific: government departments receive hundreds to a thousand civic complaints per district per day, and staff currently read, categorize, and route each one manually. At that volume a single officer would need 8+ hours a day just sorting, before doing any actual work. **The bottleneck is not resolution. It is sorting.** IssueRouter automates the sorting.

Built as a four-person team, Om owned the entire NLP pipeline (classification, NER, urgency scoring, routing, clustering, summarization) and the ingestion layer, while teammates owned the database/API layer and the frontend dashboard.

**Tech Stack:** Python, FastAPI, SQLAlchemy, spaCy, sentence-transformers, HuggingFace BART, Groq (llama-3.1-8b-instant), React, Vite, Tailwind

## What the Project Does

**Pipeline (6 stages, owned by Om):**
- **Normalize** — strips @mentions, URLs, and hashtags from raw tweet text
- **Classify** — `facebook/bart-large-mnli` zero-shot classification into 7 civic categories, ~400ms/tweet
- **Extract entities** — spaCy + a custom 30+ locality gazetteer pulls location and department signals
- **Score urgency** — keyword rules plus a retweet-reach boost produce critical/high/medium/low
- **Route** — maps category + city to the responsible department
- **Cluster** — `all-MiniLM-L6-v2` embeddings, cosine similarity at a 0.70 threshold, groups duplicate complaints into one running centroid
- **Summarize** — Groq `llama-3.1-8b-instant` writes a one-line officer brief per cluster, cached for reuse

**End-to-end flow:** tweets land in a `raw_tweets` table → a background worker picks up unprocessed rows every 8 seconds → each row runs the full pipeline → results save to `complaints` and `clusters` tables → FastAPI serves `/clusters`, `/clusters/{id}`, `/stats` → the React dashboard polls every 5 seconds and renders priority-ranked cluster cards, sorted server-side by a weighted priority score (`complaint_count × 1.0 + rt_reach × 0.3 + urgency_weight`).

The real-X-scraping path (`x_listener.py`, tweepy) is written and tested but not live — the demo runs on 63 pre-compiled mock tweets across 16 issue types and 5 cities, and going live post-hackathon is a documented one-line swap in `main.py`.

## Who the Project Is Useful For

- **Municipal/district government offices** needing to triage citizen complaints at volume without adding staff
- **Civic tech teams** building on top of existing social-media complaint behavior instead of a new intake app
- **Emergency-adjacent departments** (PWD, Jal Board) that need urgency-ranked, not just chronological, queues

## Engineering Decisions

**Classifier — BART zero-shot over a trained classifier**
- No labeled training data existed for civic complaint categories, and building one wasn't feasible in a hackathon timeframe
- Zero-shot classification against category label strings gave ~80–85% accuracy on real civic text with zero training cost

**Clustering — cosine similarity with a running centroid, not a fixed category bucket**
- Complaints about the same pothole worded three different ways needed to collapse into one officer-facing brief, not three
- A 0.70 cosine threshold on `all-MiniLM-L6-v2` embeddings, with the cluster centroid updated as an average on each new match, balances catching true duplicates against fragmenting genuinely distinct issues

**Urgency — hybrid keyword rules plus a social signal, not a pure keyword system**
- Keyword rules alone miss severity that isn't stated explicitly in the text
- Retweet count is used as a lightweight, free proxy for community-perceived severity, boosting a complaint's urgency score without requiring an ML model just for this

**Ingestion — a `processed` flag on a SQLite table as the job queue, not a message broker**
- At hackathon scale (60–100 tweets/session, 1 district), a boolean flag polled every 8 seconds is simpler to build, debug, and demo live than standing up Redis or Kafka
- The scaling path is documented, not deferred blindly: PostgreSQL + connection pooling for a pilot city, then a Redis queue with multiple pipeline workers for national scale (766 districts, ~52 servers, ~$1.15/district/month)

**Frontend — HTTP polling, not WebSockets**
- A 5-second poll on `/clusters` and a 10-second poll on `/stats` gave real-time-enough behavior for the demo without the added complexity of a WebSocket connection and reconnect logic

## Challenges Faced

**Clusters not grouping — every tweet became its own cluster**
- *Cause:* the initial cosine similarity threshold (0.82) was tuned too strict for how differently people phrase the same complaint
- *Fix:* lowered the threshold to 0.70 after testing against the mock data's known-duplicate pairs
- *Result:* semantically similar complaints correctly merged into shared clusters instead of fragmenting

**Groq API calls failing with an attribute error**
- *Cause:* the summarizer was written against Claude's API syntax (`client.messages.create()`) instead of Groq's OpenAI-compatible syntax
- *Fix:* switched to `client.chat.completions.create()`
- *Result:* summarization stage ran cleanly; a reminder that "OpenAI-compatible" APIs still need the right client calling convention verified, not assumed

**Coordinating a four-person team pipeline under a hackathon deadline**
- *Cause:* pipeline (Om), database/API, and frontend were being built in parallel with hard interface dependencies between them
- *Fix:* enforced branch-per-owner naming (`pipeline/`, `backend/`, `frontend/`), required PR review before merging to `main`, and pulled from `main` every 2 hours minimum during active development
- *Result:* all 6 pipeline stages, the API layer, and the dashboard integrated cleanly for the live demo with no last-minute merge conflicts on shared files

## What I Learned

- **The bottleneck framing matters more than the AI framing.** The insight that made this project make sense wasn't "use AI to read tweets" — it was recognizing that sorting, not resolving, was the actual scaling constraint government offices face.
- **A free, indirect signal can substitute for a model you don't have time to build.** Using retweet count as an urgency proxy avoided training a dedicated severity model without meaningfully hurting the ranking quality for the demo.
- **Deterministic, single-responsibility pipeline stages made a four-person team tractable.** Because each pipeline stage had one clear input/output contract, teammates could build the DB and frontend layers against a stable interface while the pipeline was still being tuned.
- **Latency budgets matter even for a demo.** With BART cold-load at 8–12 seconds and full per-tweet pipeline latency at 500–600ms, tuning the mock feed interval to 8 seconds kept the live demo visually responsive instead of feeling like it was hanging.