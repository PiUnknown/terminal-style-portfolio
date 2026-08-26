# Portfolio Project Authoring Specification

## Purpose

This document defines the exact standards for writing project entries inside the `src/content/projects/*.md` directory of the portfolio codebase.

The goal is simple:

- Every project page should feel consistent.
- Every project should communicate engineering depth.
- Every project should showcase decision-making, not just features.
- Every project should help recruiters, hiring managers, engineers, and founders understand what was built and why it matters.

The portfolio is not a product catalog.

It is an engineering portfolio.

The focus should always be:

1. Problem
2. Solution
3. Architecture
4. Tradeoffs
5. Learning

Not feature lists.

---

# File Location

Every project must exist as a separate Markdown file inside:

```text
src/content/projects/
```

Example:

```text
src/content/projects/project-gnosis.md
src/content/projects/digital-persona.md
src/content/projects/queryforge.md
src/content/projects/project-alloy.md
```

File names should be:

- lowercase
- kebab-case
- concise
- descriptive

Good:

```text
digital-persona.md
queryforge.md
issue-router.md
```

Avoid:

```text
MyCoolProject.md
project1.md
final-final-v2.md
```

---

# Frontmatter Requirements

Every project file must begin with frontmatter.

Required structure:

```yaml
---
name: project-name
lang: Python
status: active
url: https://github.com/user/repo
stars: 0
order: 1
desc: One-line description of the project.
---
```

---

## Frontmatter Rules

### name

Repository-friendly identifier.

Example:

```yaml
name: digital-persona
```

---

### lang

Primary language used.

Examples:

```yaml
lang: Python
lang: TypeScript
lang: Go
lang: Rust
```

Only include the primary language.

---

### status

Allowed values:

```yaml
active
completed
archived
experimental
```

---

### url

Repository URL.

Example:

```yaml
url: https://github.com/username/project
```

---

### stars

GitHub star count.

Example:

```yaml
stars: 12
```

Use:

```yaml
stars: 0
```

if unknown.

---

### order

Controls display ordering.

Lower number appears first.

Example:

```yaml
order: 1
order: 2
order: 3
```

---

### desc

Single sentence summary.

Maximum:

```text
15-20 words
```

Good:

```yaml
desc: AI-powered system that converts GitHub repositories into searchable engineering knowledge bases.
```

Bad:

```yaml
desc: This project is really cool and has lots of features and can do many things.
```

---

# Project Structure

Every project must follow this exact structure.

```markdown
# Project Name

<Project Overview>

**Tech Stack:** ...

## What the Project Does

...

## Who the Project Is Useful For

...

## Engineering Decisions

...

## Challenges Faced

...

## What I Learned

...
```

No extra sections unless the project genuinely requires them.

Consistency matters.

---

# Section Guidelines

## Project Overview

### Purpose

Explain:

- What the project is
- Why it exists
- What problem it solves

This section should answer:

> "What is this project and why should I care?"

### Length

Target:

```text
150-250 words
```

### Include

- Core problem
- Solution
- High-level architecture
- Main capability

### Avoid

- Marketing language
- Buzzwords
- Feature dumping

Bad:

```text
A revolutionary AI platform leveraging cutting-edge technology.
```

Good:

```text
Digital Persona is a RAG-powered chatbot that allows users to explore LinkedIn profiles through natural language queries. The system indexes profile information into a vector database and retrieves relevant context when answering user questions.
```

---

## Tech Stack

Single concise line.

Format:

```markdown
**Tech Stack:** Python, FastAPI, PostgreSQL, OpenAI, ChromaDB, Docker
```

Keep it short.

Do not explain technologies here.

---

## What the Project Does

### Purpose

Describe user-facing functionality.

Answer:

> "What can someone actually do with it?"

### Length

3-6 paragraphs.

### Include

- Primary workflows
- Key capabilities
- Typical usage flow

Example:

```text
Users can upload documents and create searchable knowledge bases.

The system automatically chunks content, generates embeddings, and stores vectors for retrieval.

Questions are answered using context retrieved from the indexed content.
```

---

## Who the Project Is Useful For

### Purpose

Show understanding of users.

### Include

Specific personas.

Examples:

```text
Recruiters exploring candidate profiles.

Sales teams researching prospects.

Students learning about AI retrieval systems.

Developers looking for a production-ready RAG implementation.
```

Avoid:

```text
Everyone.
```

Nothing is useful for everyone.

---

## Engineering Decisions

### Purpose

This is the most important section.

Recruiters skim features.

Engineers read decisions.

### Length

300-600 words.

### Explain

#### Architecture

Why the system is structured the way it is.

Example:

```text
I separated ingestion, retrieval, and generation into independent services to reduce coupling and make future model changes easier.
```

#### Technology Choices

Example:

```text
ChromaDB was chosen because the project required a lightweight local vector database during development.
```

#### Tradeoffs

Example:

```text
I prioritized retrieval quality over indexing speed because the expected workload involved far more reads than writes.
```

#### Scalability Considerations

Example:

```text
The ingestion pipeline was designed so additional workers could be added later without changing retrieval logic.
```

---

## Challenges Faced

### Purpose

Show real engineering experience.

### Include

Actual difficulties.

Examples:

```text
Managing token limits.

Reducing hallucinations.

Designing chunking strategies.

Handling rate limits.

Maintaining prompt consistency.

Optimizing query latency.
```

### Structure

Use:

```text
Challenge
→ Cause
→ Solution
→ Result
```

Example:

```text
One challenge was retrieving relevant profile sections when users asked broad questions.

The original chunking strategy fragmented related information across multiple embeddings.

I redesigned chunk boundaries around semantic sections rather than fixed token counts.

This improved retrieval relevance and reduced incomplete responses.
```

---

## What I Learned

### Purpose

Demonstrate growth.

### Include

Engineering lessons.

Examples:

```text
Building reliable AI systems is more about retrieval quality than model selection.

Good architecture reduces future complexity.

Observability becomes critical once multiple services interact.
```

Avoid:

```text
I learned a lot.
```

Be specific.

---

# Writing Style Rules

## Write Like an Engineer

Focus on:

- decisions
- constraints
- tradeoffs
- implementation

Not:

- hype
- marketing
- buzzwords

---

## Show Reasoning

Instead of:

```text
I used FastAPI.
```

Write:

```text
I selected FastAPI because asynchronous request handling was important for concurrent retrieval and generation workloads.
```

---

## Prefer Specifics

Bad:

```text
The system is fast.
```

Good:

```text
Average retrieval latency remained below 300ms during local testing with approximately 50,000 indexed chunks.
```

---

## Discuss Tradeoffs

Good engineering portfolios explain:

- what was chosen
- what was rejected
- why

Example:

```text
I considered Pinecone but chose ChromaDB because local development and zero infrastructure cost were more important than managed scalability at this stage.
```

---

# Content Priorities

When writing a project page, prioritize information in this order:

1. Problem being solved
2. System architecture
3. Engineering decisions
4. Challenges
5. User impact
6. Features

Many developers do the opposite.

Strong portfolios explain thinking before functionality.

---

# Quality Checklist

Before finalizing a project file, verify:

- [ ] Frontmatter is complete
- [ ] Description is one sentence
- [ ] Overview explains the problem clearly
- [ ] Tech stack is concise
- [ ] User personas are identified
- [ ] Engineering decisions include tradeoffs
- [ ] Challenges include solutions
- [ ] Learnings are specific
- [ ] No marketing language
- [ ] No feature dumping
- [ ] Consistent formatting with other projects

---

# Agent Objective

When generating a new project entry, the agent should act as a senior engineer reviewing a portfolio.

The agent should optimize for:

1. Technical credibility
2. Clarity
3. Engineering depth
4. Architecture thinking
5. Decision-making visibility

The final result should make a recruiter think:

> "This person doesn't just build projects. They understand why systems are designed the way they are."
