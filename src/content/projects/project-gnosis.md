---
name: project-gnosis
lang: Python
status: wip
url: https://github.com/PiUnknown/Project-Gnosis
stars: 0
---

# Project Gnosis

Project Gnosis is a multi-agent code archaeology system that transforms an unfamiliar GitHub repository into structured onboarding documentation. Given a repository URL, it analyzes the codebase through a deterministic seven-agent pipeline that parses source code, maps dependencies, evaluates code quality, retrieves relevant context, and generates human-readable explanations for the repository's architecture. Instead of relying on generic LLM summaries, the system combines static analysis with Retrieval-Augmented Generation (RAG) to produce documentation grounded in the actual codebase. :contentReference[oaicite:0]{index=0} :contentReference[oaicite:1]{index=1}

**Tech Stack:** Python, FastAPI, React, TypeScript, Tailwind CSS, tree-sitter, NetworkX, ChromaDB, sentence-transformers, NVIDIA NIM (Llama 3.3 70B Instruct), GitHub REST API, GitPython, Radon, pyvis. :contentReference[oaicite:2]{index=2}

## What the Project Does

The system accepts a public GitHub repository and processes it through seven specialized agents. It begins by building a repository manifest, parses every supported source file into an Abstract Syntax Tree, constructs a dependency graph, calculates complexity metrics, semantically indexes code using AST-based chunking, retrieves relevant context from a vector database, and finally generates architectural explanations using an LLM. The final output includes an onboarding document, dependency graph, complexity report, and supporting JSON artifacts that help engineers understand an unfamiliar project without manually exploring every file. :contentReference[oaicite:3]{index=3} :contentReference[oaicite:4]{index=4}

## Who the Project Is Useful For

Project Gnosis is built for developers working with unfamiliar or undocumented repositories. It helps new engineers onboard more quickly, enables open-source contributors to understand project architecture before making changes, assists reviewers working on large pull requests, and gives engineering teams visibility into technical debt before major refactoring efforts. It can also be used to rapidly understand third-party codebases during integrations or acquisitions. :contentReference[oaicite:5]{index=5}

## Engineering Decisions

The project is designed as a deterministic multi-agent pipeline where each agent performs a single responsibility and communicates only through a shared state object managed by an orchestrator. This architecture keeps every stage independently testable while making the pipeline easy to extend with additional languages and analysis capabilities. :contentReference[oaicite:6]{index=6}

Rather than using conventional token-based chunking for Retrieval-Augmented Generation, Gnosis performs AST-based semantic chunking so that functions, classes, and modules remain intact during retrieval. This preserves the semantic meaning of code, improves retrieval quality, and provides more accurate context for explanation generation. The project also builds a directed dependency graph using NetworkX to identify critical modules, detect circular dependencies, compute centrality metrics, and recommend a reading order for new contributors. Combined with complexity analysis and coupling metrics, the system generates both architectural documentation and technical debt reports from a single analysis pipeline. :contentReference[oaicite:7]{index=7} :contentReference[oaicite:8]{index=8}

## Challenges Faced

One of the primary challenges was balancing explanation quality with inference rate limits. The initial implementation relied on Groq, but its free-tier limitations slowed analysis of medium-sized repositories. To improve reliability, the inference layer was migrated to NVIDIA NIM, whose OpenAI-compatible API required minimal code changes while providing more generous request limits. :contentReference[oaicite:9]{index=9}

Another challenge was avoiding repeated LLM inference when analyzing the same repository multiple times. This was addressed by implementing a disk-based explanation cache keyed by each file's Git SHA. Cached explanations are reused whenever the source file remains unchanged, reducing API usage while automatically invalidating outdated entries after code changes. :contentReference[oaicite:10]{index=10}

## What I Learned

Building Project Gnosis gave me hands-on experience designing production-oriented AI systems that extend beyond simply calling an LLM API. I learned how to architect deterministic multi-agent pipelines, build language-aware analysis systems using AST parsing, construct dependency graphs for architectural reasoning, implement semantic RAG pipelines for source code, and engineer context that enables grounded explanations rather than hallucinated summaries.

The project also strengthened my understanding of graph engineering, static code analysis, context engineering, retrieval system design, caching strategies, API rate-limit management, and modular software architecture. More importantly, it reinforced the importance of combining traditional software engineering techniques with LLMs to build systems that are explainable, extensible, and genuinely useful for developers. :contentReference[oaicite:11]{index=11}