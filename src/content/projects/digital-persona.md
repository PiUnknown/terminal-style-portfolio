---
name: digital-persona
lang: Python
status: active
url: https://github.com/PiUnknown/digital-persona
stars: 0
order: 2
desc: RAG-powered chatbot that lets users explore anyone's LinkedIn profile through natural conversation.
---

Digital Persona is a RAG-powered chatbot that turns a LinkedIn profile URL into a queryable knowledge base. A user pastes a profile URL, the system scrapes and indexes the profile's career data, and the user can then ask natural-language questions about that person's experience, grounded entirely in the retrieved profile data rather than the model's own assumptions.

The core design constraint was avoiding hallucination on factual claims about a real person. Instead of stuffing the full scraped profile into the LLM's context window, the system chunks the profile text, embeds it, and retrieves only the relevant chunks per question, so every answer is traceable back to specific retrieved data rather than the model inferring or fabricating career details.

**Tech Stack:** Python, Streamlit, Apify, FAISS, SentenceTransformers, LangChain, Groq (llama-3.3-70b-versatile)

## What the Project Does

**Pipeline:**
- **Scrape** — Apify's LinkedIn profile scraper pulls structured data with no login or cookies required
- **Chunk** — LangChain's `RecursiveCharacterTextSplitter` breaks the structured text into retrievable pieces
- **Embed** — `all-MiniLM-L6-v2` (SentenceTransformers) generates vector embeddings for each chunk
- **Index** — embeddings go into a local FAISS index
- **Query** — a user question retrieves the top-k relevant chunks, which are passed to Groq's `llama-3.3-70b-versatile` alongside the question to generate a grounded answer

The system is deployed live on Streamlit Community Cloud, with a demo video walking through the full flow from URL input to conversational answer.

**Handled failure modes:** invalid LinkedIn URLs, private profiles, empty scrape results, API rate limits (with retry/timeout handling), and LLM errors — each surfaces a specific, user-facing message rather than a raw stack trace.

## Who the Project Is Useful For

- **Recruiters** exploring a candidate's background conversationally instead of manually reading a full profile
- **Sales teams** researching a prospect's career history before an outreach call
- **Developers** looking for a small, production-deployed reference implementation of a RAG pipeline
- **Students** learning how retrieval-augmented generation is actually wired end-to-end, from scrape to grounded answer

## Engineering Decisions

**RAG over full-context injection**
- Stuffing an entire scraped profile into the prompt breaks down for longer or more detailed profiles and risks hitting token limits
- Retrieval scales to profiles of any length and keeps answers grounded in the specific chunks retrieved, which reduces hallucination versus asking the model to reason over everything at once

**FAISS over a hosted vector database**
- Each profile's knowledge base is small to medium sized and short-lived (one session, one profile)
- A local, zero-cost, fast index removed the need for an external vector DB service entirely, which matched the project's scope

**Groq over a slower or paid inference provider**
- Free tier, and `llama-3.3-70b-versatile` produces answer quality comparable to GPT-4 for this use case
- Groq's inference speed keeps the conversational loop fast enough to feel like chat rather than a batch query

**Apify over building a custom LinkedIn scraper**
- No LinkedIn credentials required at any point, which removes the ban risk that comes with scraping under a real account
- Apify's `apimaestro/linkedin-profile-detail` actor returns reliable structured output instead of requiring custom HTML parsing that would break on every LinkedIn redesign

## Challenges Faced

**Unreliable third-party scrape results**
- *Cause:* profiles can be private, URLs can be malformed, and Apify can occasionally return empty or partial data
- *Fix:* built a dedicated validation layer (`validators.py`) plus explicit handling for each failure mode: invalid URL, private profile, empty data, and rate-limit timeouts with retries
- *Result:* the system degrades gracefully with a specific user-facing message per failure type instead of crashing or returning a confusing error

**Keeping answers grounded instead of fabricated**
- *Cause:* an LLM given loose context about a person will readily fill gaps with plausible-sounding but invented details
- *Fix:* constrained the model to answer only from retrieved chunks via RAG rather than general knowledge or inference about the person
- *Result:* answers are traceable to specific scraped data, directly addressing the core risk of building a tool that makes factual claims about real people

## What I Learned

- **Retrieval constraints are a hallucination-mitigation strategy, not just a scaling technique.** Choosing RAG here wasn't primarily about token limits — it was about making every claim about a real person traceable to a retrieved source.
- **Third-party data sources need failure-mode handling designed up front, not bolted on.** Treating "private profile" and "empty scrape" as expected cases rather than edge cases changed how the validation layer was structured from the start.
- **Removing a service dependency (LinkedIn credentials) removes a whole category of operational risk.** Choosing Apify over direct scraping wasn't just a convenience decision — it eliminated ban risk as a concern entirely.