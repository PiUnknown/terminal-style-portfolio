---
name: sentiotrade
lang: Python
status: active
url: https://github.com/PiUnknown/SentioTrade
stars: 0
order: 4
desc: FinBERT-powered API that turns live Reddit discussion into a structured stock sentiment verdict.
---

SentioTrade ingests live Reddit discussion from finance communities (r/wallstreetbets, r/stocks, r/investing, r/stockmarket) and returns a structured sentiment summary for any queried stock ticker. A user queries `$TSLA`, the system scrapes matching Reddit posts, scores each one with FinBERT, aggregates the scores into a verdict, and returns it as JSON to a live frontend.

The project exists because general-purpose sentiment models fail on financial text in specific, predictable ways: domain jargon like "puts printing" or "short squeeze" is semantically invisible to a model trained on generic English, sentiment inverts depending on position ("TSLA down 8%" is bad news for a long holder and good news for a short seller), and r/wallstreetbets' pervasive sarcasm breaks naive positive/negative classification outright. SentioTrade uses FinBERT (ProsusAI), fine-tuned specifically on financial corpora, to handle these cases correctly instead of working around them with more keyword rules.

**Tech Stack:** Python, FastAPI, FinBERT (HuggingFace Transformers + PyTorch), PRAW, NumPy, Docker

## What the Project Does

**Request flow:**
- User queries a ticker (e.g. `$TSLA`) via the API or the vanilla-JS frontend
- **Scraper** (`PRAW`) searches 4 subreddits with 2 query variants per ticker, returning up to 400 posts
- **FinBERT** classifies each post independently: Positive / Negative / Neutral, with a confidence score
- **Aggregation** (NumPy) weighted-averages the per-post scores into one overall sentiment verdict
- **FastAPI** returns structured JSON: post counts by sentiment, average confidence per class, and the overall verdict

If Reddit API credentials aren't configured, the system runs on a mock data layer that mirrors the real API's exact return signature — the full NLP pipeline still runs end-to-end on realistic data, and swapping in real credentials later is a one-file change.

## Who the Project Is Useful For

- **Retail investors** wanting a quick read on community sentiment before checking a ticker further
- **Recruiters/engineers evaluating ML system design**, since the project demonstrates domain-specific model selection and a full local-to-containerized deployment path
- **Anyone comparing sentiment tooling choices**, since the README documents explicitly why FinBERT was chosen over VADER/TextBlob rather than just asserting it

## Engineering Decisions

**Model — FinBERT over VADER or TextBlob**
- General sentiment tools are trained on social media text broadly, not financial language specifically
- FinBERT is fine-tuned on analyst reports and financial news, so it correctly reads "bearish momentum" as negative even though "momentum" alone reads positive in general English

**API framework — FastAPI over Flask**
- Native async support was needed for concurrent Reddit scraping across 4 subreddits
- Automatic Pydantic validation and an auto-generated `/docs` interface came free, versus manual implementation of all three in Flask

**Containerization — Docker, non-negotiable**
- FinBERT + PyTorch dependencies are notoriously version-sensitive
- Docker guarantees the model loads identically on a local machine, staging, or cloud, eliminating an entire class of "works on my machine" failures

**Separation of concerns — Aggregation kept independent from FinBERT**
- FinBERT's single responsibility is per-post classification; combining 400 individual scores into one human-readable signal is a distinct job
- Keeping them separate makes each piece independently testable and replaceable — the aggregation formula could change without touching the model layer at all

**Mock data as a first-class fallback, not a stub**
- Reddit API credential approval takes time and would have blocked development entirely
- Building the scraper against a mock layer that mirrors PRAW's real return signature meant development never stalled, and the swap to live data later required changing exactly one file

## Challenges Faced

**Domain-specific jargon breaking general sentiment models**
- *Cause:* terms like "puts printing" or "going to the moon" carry no signal to a model trained on generic English
- *Fix:* selected FinBERT specifically for its financial-corpus fine-tuning rather than trying to patch a general model with a jargon dictionary
- *Result:* sentiment classification correctly reads finance-specific phrasing instead of scoring it as neutral or misclassifying it

**Inverted sentiment depending on market position**
- *Cause:* the same headline ("TSLA down 8%") is negative for a long holder and positive for a short seller — sentiment isn't a fixed property of the text
- *Fix:* documented explicitly as a known limitation rather than attempting an unreliable position-inference heuristic
- *Result:* the tool is honest about what it measures (aggregate stated sentiment) instead of overclaiming precision it can't deliver

**Blocked on Reddit API credential approval**
- *Cause:* PRAW requires app credentials that can take time to be approved
- *Fix:* built a mock data layer matching PRAW's exact return shape so the pipeline could be built and tested without waiting
- *Result:* full development proceeded on schedule; going live is a one-file swap, not a rebuild

## What I Learned

- **Domain-specific fine-tuning beats general-purpose tooling patched with rules.** FinBERT handling jargon and inverted-sentiment cases correctly, out of the box, validated that model selection mattered more here than prompt or rule engineering would have.
- **Being explicit about what a metric doesn't measure is part of the engineering, not an afterthought.** Documenting "sentiment ≠ price prediction" and Reddit's susceptibility to coordinated posting was as deliberate a decision as any architectural choice.
- **A well-designed mock layer removes external dependencies from the critical path.** Mirroring the real API's return signature meant a third-party approval delay never blocked the project's actual timeline.