import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type Section = "home" | "about" | "projects" | "skills" | "blog" | "contact";

interface BlogPost {
  id: string;
  title: string;
  date: string;
  tags: string[];
  readTime: string;
  excerpt: string;
  content: string[];
}

interface Project {
  name: string;
  lang: string;
  desc: string;
  status: "active" | "archived" | "wip" | "research";
  url: string;
  hostedUrl: string;
  stack: string[];
  architecture: string;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const BLOG_POSTS: BlogPost[] = [
  {
    id: "memory-allocator",
    title: "Writing a Memory Allocator in C from Scratch",
    date: "2026-07-14",
    tags: ["C", "systems", "memory"],
    readTime: "8 min",
    excerpt: "malloc() is something we take for granted. Let's break it open.",
    content: [
      "Every C program calls malloc(). But what does malloc() actually do?",
      "I spent last weekend implementing a slab allocator from scratch as part of my OS coursework. Here is what I learned.",
      "The core idea: you maintain a free list. When the user requests N bytes, you walk the list, find a block >= N, split if needed, and hand back a pointer.",
      "The tricky part is coalescing — merging adjacent free blocks so you don't fragment the heap into unusable slivers.",
      "My naive first-fit allocator passed 18/20 test cases. The two failures were edge cases around page-aligned allocations. Fixed by rounding up to the next 4096-byte boundary using (size + 4095) & ~4095.",
      "Full source: github.com/dev/malloc-from-scratch",
    ],
  },
  {
    id: "git-internals",
    title: "Git Internals: What is a Commit, Really?",
    date: "2026-06-28",
    tags: ["git", "internals", "tooling"],
    readTime: "6 min",
    excerpt: "Commits are just SHA-1-addressed blobs. Here is the proof.",
    content: [
      "Run: cat .git/HEAD",
      "You will see something like: ref: refs/heads/main",
      "Run: cat .git/refs/heads/main",
      "That is a 40-character SHA-1 hash — a content address pointing to a commit object.",
      "Run: git cat-file -p <that-hash>",
      "You get a tree hash, parent hash, author, committer, and message. That is a commit object in its entirety.",
      "Tree objects point to blob objects (file contents) and other tree objects (subdirectories). It is a Merkle DAG.",
      "This means git checkout is literally: read the tree, decompress the blobs, write them to disk. No magic.",
      "Understanding this made me a dramatically better debugger of merge conflicts.",
    ],
  },
  {
    id: "cs-sophomore-reflection",
    title: "Sophomore Year: What I Wish I Had Known",
    date: "2026-06-10",
    tags: ["reflection", "career", "advice"],
    readTime: "5 min",
    excerpt: "The gap between coursework and real engineering is navigable.",
    content: [
      "I finished my sophomore year with a 3.7 GPA and zero side projects. I thought that was fine.",
      "It was not fine. Recruiters do not care about your Algorithms grade. They want to see code you have shipped.",
      "What changed: I started treating weekends as engineering time. Not grinding LeetCode — actually building things.",
      "The rule I adopted: every two weeks, one deployed artifact. A CLI tool, a bot, a website, anything.",
      "Six months in: three internship offers, a talk at my university's ACM chapter, and more confidence than any grade ever gave me.",
      "Start building. Ship ugly things. Iterate.",
    ],
  },
];

const PROJECTS: Project[] = [
  {
    name: "project-alloy",
    lang: "Python",
    desc: "Data curation and continued pretraining pipeline for language models.",
    status: "research",
    url: "https://github.com/PiUnknown/Project-Alloy",
    hostedUrl: "",
    stack: [
      "Python",
      "PyTorch",
      "Transformers",
      "Tokenizers",
      "Datasets",
    ],
    architecture:
      "Research-focused pipeline for document ingestion, cleaning, deduplication, tokenizer preparation, dataset packing, and continued language model pretraining.",
  },

  {
    name: "queryforge",
    lang: "Python",
    desc: "Production-ready RAG system for querying and synthesizing research papers.",
    status: "active",
    url: "https://github.com/PiUnknown/QueryForge",
    hostedUrl: "",
    stack: [
      "Python",
      "LangChain",
      "ChromaDB",
      "Sentence-Transformers",
      "Ollama",
      "Streamlit",
    ],
    architecture:
      "Modular RAG pipeline with PDF ingestion, semantic chunking, dense retrieval, local LLM inference, and an evaluation framework measuring Precision@K, Recall, MRR, and F1.",
  },

  {
    name: "support-triage-agent",
    lang: "Python",
    desc: "Grounded multi-domain support agent built for adversarial support tickets.",
    status: "active",
    url: "https://github.com/PiUnknown/support-triage-agent",
    hostedUrl: "",
    stack: [
      "Python",
      "FAISS",
      "Sentence-Transformers",
      "Groq",
      "Pandas",
    ],
    architecture:
      "Deterministic seven-stage pipeline performing safety checks, retrieval, classification, escalation, and grounded response generation while resisting prompt injection and PII extraction.",
  },

  {
    name: "TerraGraph",
    lang: "Python",
    desc: "AI biodiversity intelligence system for grounded environmental recommendations.",
    status: "wip",
    url: "https://github.com/PiUnknown/TerraGraph",
    hostedUrl: "https://terragraph-x7oxucctkmfigypnt429be.streamlit.app/",
    stack: [
      "FastAPI",
      "ChromaDB",
      "Sentence-Transformers",
      "Groq",
      "Pydantic",
      "Streamlit",
    ],
    architecture:
      "Hybrid reasoning architecture combining deterministic ecological relationship graphs with semantic retrieval and LLM synthesis to generate evidence-backed biodiversity recommendations.",
  },

  {
    name: "IssueRouter",
    lang: "Python",
    desc: "AI-powered civic grievance triage system for routing citizen complaints.",
    status: "active",
    url: "https://github.com/PiUnknown/IssueRouter",
    hostedUrl: "",
    stack: [
      "FastAPI",
      "BART",
      "spaCy",
      "Sentence-Transformers",
      "Groq",
      "React",
    ],
    architecture:
      "Streams complaints from X, performs zero-shot classification, entity extraction, semantic clustering, urgency scoring, and LLM summarization before generating ranked action briefs for government officers.",
  },

  {
    name: "digital-persona",
    lang: "Python",
    desc: "RAG chatbot that lets users explore LinkedIn profiles through natural conversation.",
    status: "active",
    url: "https://github.com/PiUnknown/Digital-Persona",
    hostedUrl: "https://digital-persona-f5el2cmczdp8k53cszh38k.streamlit.app/",
    stack: [
      "LangChain",
      "FAISS",
      "Apify",
      "Sentence-Transformers",
      "Groq",
      "Streamlit",
    ],
    architecture:
      "Scrapes LinkedIn profiles, builds a FAISS vector index, retrieves relevant profile chunks, and generates grounded responses using a retrieval-augmented generation pipeline.",
  },

  {
    name: "SentioTrade",
    lang: "Python",
    desc: "Real-time stock sentiment analysis system powered by FinBERT.",
    status: "active",
    url: "https://github.com/PiUnknown/SentioTrade",
    hostedUrl: "",
    stack: [
      "FastAPI",
      "FinBERT",
      "PyTorch",
      "PRAW",
      "Docker",
    ],
    architecture:
      "End-to-end ML pipeline that scrapes Reddit discussions, performs financial-domain sentiment analysis using FinBERT, aggregates confidence-weighted predictions, and serves live results through a FastAPI backend.",
  },
];

const SKILLS = {
  languages: ["Python", "C", "C++", "SQL", "HTML", "CSS"],
  ml_ai: ["Scikit-learn", "TensorFlow", "PyTorch", "Pandas", "Numpy", "Matplotlib", "Seaborn", "YOLOv8", "Hugging Face", "Sentence-Transformers", "spaCy", "FinBERT", "BART"],
  llm_stack: ["LangChain", "ChromaDB", "FAISS", "Sentence-Transformers", "Hugging Face", "Groq", "Ollama"],
  tools: ["Git", "GitHub", "Docker", "AWS EC2", "Streamlit", "FastAPI"],
};

type ThemeId = "phosphor" | "amber" | "ice" | "ghost";

const THEMES: Record<ThemeId, { label: string; dot: string; vars: Record<string, string> }> = {
  phosphor: {
    label: "phosphor", dot: "#00ff41",
    vars: { "--background": "#0a0f0a", "--foreground": "#00ff41", "--primary": "#00ff41", "--primary-foreground": "#0a0f0a", "--card": "#0d1a0d", "--card-foreground": "#00ff41", "--secondary": "#0f2010", "--secondary-foreground": "#00cc33", "--muted": "#0f1a0f", "--muted-foreground": "#3a7a3a", "--accent": "#00cc33", "--border": "rgba(0,255,65,0.15)", "--ring": "rgba(0,255,65,0.4)" },
  },
  amber: {
    label: "amber", dot: "#ffb000",
    vars: { "--background": "#0f0900", "--foreground": "#ffb000", "--primary": "#ffb000", "--primary-foreground": "#0f0900", "--card": "#1a1000", "--card-foreground": "#ffb000", "--secondary": "#1f1400", "--secondary-foreground": "#cc8c00", "--muted": "#150c00", "--muted-foreground": "#7a5500", "--accent": "#cc8c00", "--border": "rgba(255,176,0,0.15)", "--ring": "rgba(255,176,0,0.4)" },
  },
  ice: {
    label: "ice", dot: "#00d4ff",
    vars: { "--background": "#000d0f", "--foreground": "#00d4ff", "--primary": "#00d4ff", "--primary-foreground": "#000d0f", "--card": "#001a1f", "--card-foreground": "#00d4ff", "--secondary": "#001f25", "--secondary-foreground": "#00aacc", "--muted": "#00151a", "--muted-foreground": "#006a80", "--accent": "#00aacc", "--border": "rgba(0,212,255,0.15)", "--ring": "rgba(0,212,255,0.4)" },
  },
  ghost: {
    label: "ghost", dot: "#cccccc",
    vars: { "--background": "#0a0a0a", "--foreground": "#cccccc", "--primary": "#cccccc", "--primary-foreground": "#0a0a0a", "--card": "#111111", "--card-foreground": "#cccccc", "--secondary": "#1a1a1a", "--secondary-foreground": "#999999", "--muted": "#141414", "--muted-foreground": "#555555", "--accent": "#999999", "--border": "rgba(204,204,204,0.15)", "--ring": "rgba(204,204,204,0.4)" },
  },
};

// ── Commands ──────────────────────────────────────────────────────────────────

const COMMANDS: Record<string, { desc: string; action?: string }> = {
  help: { desc: "show available commands" },
  whoami: { desc: "about me", action: "home" },
  about: { desc: "background & education", action: "about" },
  projects: { desc: "open source work", action: "projects" },
  skills: { desc: "languages & tools", action: "skills" },
  blog: { desc: "writing & posts", action: "blog" },
  contact: { desc: "get in touch", action: "contact" },
  clear: { desc: "clear terminal output" },
  ls: { desc: "list sections" },
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 28, deps: unknown[] = []) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  return { displayed, done };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Cursor({ visible = true }: { visible?: boolean }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), 530);
    return () => clearInterval(id);
  }, []);
  if (!visible) return null;
  return (
    <span
      className="inline-block w-2 h-4 bg-primary align-middle"
      style={{ opacity: on ? 1 : 0, transition: "opacity 0.05s" }}
    />
  );
}

function Prompt({ user = "visitor", path = "~" }: { user?: string; path?: string }) {
  return (
    <span className="select-none">
      <span style={{ color: "#00cc33" }}>{user}</span>
      <span className="text-muted-foreground">@</span>
      <span style={{ color: "#33ff66" }}>portfolio</span>
      <span className="text-muted-foreground">:</span>
      <span style={{ color: "#6699ff" }}>{path}</span>
      <span className="text-muted-foreground">$ </span>
    </span>
  );
}

function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)",
      }}
    />
  );
}

function StatusBar({ section }: { section: Section }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = time.toLocaleTimeString("en-US", { hour12: false });
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-1 text-xs border-t border-border select-none"
      style={{ background: "rgba(0,255,65,0.08)", fontFamily: "'JetBrains Mono', monospace" }}
    >
      <span className="text-muted-foreground">
        <span className="text-primary">INSERT</span> — type{" "}
        <span className="text-primary">/</span> to open command palette
      </span>
      <span className="text-muted-foreground">
        <span className="text-primary">[{section}]</span> &nbsp;{fmt}
      </span>
    </div>
  );
}

// ── Slash Palette ─────────────────────────────────────────────────────────────

interface SlashPaletteProps {
  query: string;
  activeIdx: number;
  onSelect: (cmd: string) => void;
  onHover: (idx: number) => void;
}

function SlashPalette({ query, activeIdx, onSelect, onHover }: SlashPaletteProps) {
  const q = query.toLowerCase();
  const filtered = Object.entries(COMMANDS).filter(
    ([k, v]) => k.startsWith(q) || v.desc.toLowerCase().includes(q)
  );

  if (filtered.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes paletteSlideUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .palette-item {
          animation: paletteSlideUp 0.18s ease both;
        }
      `}</style>
      <div
        className="absolute left-0 right-0 bottom-full mb-2 border border-border z-50 overflow-hidden"
        style={{
          background: "rgba(10,15,10,0.97)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 -4px 24px rgba(0,255,65,0.08)",
        }}
      >
        {/* Palette header */}
        <div
          className="flex items-center justify-between px-3 py-1.5 border-b border-border"
          style={{ background: "rgba(0,255,65,0.04)" }}
        >
          <span className="text-xs text-muted-foreground">
            <span className="text-primary">CMD</span> palette
          </span>
          <span className="text-xs text-muted-foreground">
            ↑↓ navigate &nbsp; ↵ select &nbsp; esc dismiss
          </span>
        </div>

        {filtered.map(([cmd, { desc }], i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={cmd}
              className="palette-item w-full flex items-center gap-4 px-3 py-2 text-left transition-colors"
              style={{
                animationDelay: `${i * 28}ms`,
                background: isActive ? "rgba(0,255,65,0.08)" : "transparent",
                borderLeft: isActive ? "2px solid #00ff41" : "2px solid transparent",
              }}
              onMouseEnter={() => onHover(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(cmd);
              }}
            >
              <span
                className="text-sm w-24 shrink-0 font-semibold"
                style={{ color: isActive ? "#00ff41" : "#3a7a3a" }}
              >
                /{cmd}
              </span>
              <span className="text-xs text-muted-foreground truncate">{desc}</span>
              {isActive && (
                <span className="ml-auto text-xs text-muted-foreground shrink-0">↵</span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── Inline log ────────────────────────────────────────────────────────────────

function InlineLog({ lines, path }: { lines: string[]; path: string }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-6 space-y-0.5 text-xs border-t border-border pt-4">
      {lines.map((line, i) => (
        <div key={i}>
          {line.startsWith(">") ? (
            <div className="text-primary">
              <Prompt path={path} />
              {line.slice(2)}
            </div>
          ) : (
            <div className="text-muted-foreground pl-2">{line}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────────

function HomeSection() {
  const line1 = useTypewriter("Om Kumar Jha", 60);
  const line2 = useTypewriter("Engineering Intelligence into Software • Student", 40, [line1.done]);
  const line3 = useTypewriter(
    "Learning by building. Exploring machine learning, LLMs, and the systems that make them work.",
    30,
    [line2.done]
  );

  return (
    <div className="space-y-6 pt-2">
      <div className="border border-border p-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-4">
          <span>┌─ whoami</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div
          className="text-4xl font-bold mb-2"
          style={{ fontFamily: "'VT323', monospace", color: "#00ff41", letterSpacing: "0.05em" }}
        >
          {line1.displayed}
          {line1.done ? null : <Cursor />}
        </div>
        <div className="text-lg mb-3" style={{ color: "#33ff66" }}>
          {line1.done && (
            <>
              {line2.displayed}
              {line2.done ? null : <Cursor />}
            </>
          )}
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {line2.done && (
            <>
              {line3.displayed}
              {line3.done ? null : <Cursor />}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-xs mt-4">
          <span>└</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      </div>

      {line3.done && (
        <div className="space-y-1 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <div className="text-muted-foreground">
            <span className="text-primary">$</span> ls ./quick-links/
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 sm:grid-cols-4">
            {[
              { label: "github.com/PiUnknown", icon: "⌥", url: "https://github.com/PiUnknown" },
              { label: "linkedin/omjha043", icon: "⌘", url: "https://linkedin.com/in/omjha043" },
              { label: "reachomjha@gmail.com", icon: "✉", url: "mailto:reachomjha@gmail.com" },
              { label: "resume.pdf", icon: "↓", url: "/resume.pdf" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.url}
                target={link.url.startsWith("mailto") || link.url.startsWith("/") ? undefined : "_blank"}
                rel="noreferrer"
                className="border border-border px-3 py-2 text-xs hover:border-primary hover:bg-secondary transition-colors group"
              >
                <span className="text-muted-foreground mr-1">{link.icon}</span>
                <span className="group-hover:text-primary transition-colors">{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {line3.done && (
        <div className="text-sm space-y-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <div className="text-muted-foreground">
            <span className="text-primary">$</span> cat ./status.txt
          </div>
          <div className="mt-2 border border-border p-3 space-y-1">
            <div>
              <span className="text-muted-foreground">currently &nbsp;::</span>{" "}
              <span className="text-primary">B.Tech IT @ GGSIPU (3rd Year)</span>
            </div>
            <div>
              <span className="text-muted-foreground">learning &nbsp; ::</span>{" "}
              <span style={{ color: "#33ff66" }}>Transformers, attention & model training</span>
            </div>
            <div>
              <span className="text-muted-foreground">open for &nbsp; ::</span>{" "}
              <span style={{ color: "#66ff88" }}>Remote Internships</span>
            </div>
            <div>
              <span className="text-muted-foreground">location &nbsp; ::</span>{" "}
              <span className="text-foreground">Delhi, IN</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="text-muted-foreground text-sm">
        <Prompt path="~/about" />
        cat about.txt
      </div>

      <div className="border border-border p-4 space-y-4 text-sm leading-relaxed">
        <p>
          Hey. I am <span className="text-primary">Om</span>, a 3rd year UG at GGSIPU
          focused on Artificial Intelligence, LLMs, and the thin line between software
          and hardware.
        </p>
        <p className="text-muted-foreground">
          I got into CS because I wanted to understand how computers actually work — not just call
          APIs. That itch led me from Python scripts to C, then to Rust, then to writing a JIT
          compiler as a weekend project.
        </p>
        <p>
          Outside of code I try to hit gym at least 5 times a week, drink too much diet coke, and write my thoughts on paper.
        </p>
      </div>

      <div className="text-muted-foreground text-sm">
        <Prompt path="~/about" />
        cat experience.txt
      </div>

      <div className="border border-border p-4 space-y-4 text-sm">
        {[
          {
            role: "Summer Intern",
            company: "IIT Ropar",
            period: "July 2026 – Present",
            desc: [

            ],
          },
          {
            role: "Data Science Intern",
            company: "Indian Navy (WESEE)",
            period: "July 2025 - Aug 2025",
            desc: [
              "Contributed to Trident Netra, a naval AI surveillance system for geospatial intelligence.",
              "Developed data pipelines and preprocessing scripts for satellite imagery classification.",
              "Project showcased at India AI Impact Summit 2026 (Bharat Mandapam, February 2026).",
            ],
          },
        ].map((e, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
            <div>
              <div className="text-primary">{e.role}</div>
              <div className="text-muted-foreground">{e.company}</div>
              <ul className="mt-1 space-y-0.5">
                {e.desc.map((point, j) => (
                  <li key={j} className="text-muted-foreground text-xs flex gap-2">
                    <span className="text-primary shrink-0">·</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-muted-foreground text-xs shrink-0">{e.period}</div>
          </div>
        ))}
      </div>

      <div className="text-muted-foreground text-sm">
        <Prompt path="~/about" />
        cat education.txt
      </div>

      <div className="border border-border p-4 space-y-3 text-sm">
        {[
          {
            degree: "B.Tech Information Technology",
            school: "ADGIPS, GGSIPU",
            period: "2024 – 2028",
            note: "CGPA: 7.95",
          },
          {
            degree: "Relevant Coursework",
            school: "",
            period: "",
            note: "Operating Systems · Compilers · Computer Networks · Algorithm Design · Database Systems · Computer Architecture",
          },
        ].map((e, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
            <div>
              <div className="text-primary">{e.degree}</div>
              {e.school && <div className="text-muted-foreground">{e.school}</div>}
              <div className="text-muted-foreground text-xs mt-1">{e.note}</div>
            </div>
            {e.period && <div className="text-muted-foreground text-xs shrink-0">{e.period}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectsSection({ openProject, setOpenProject }: {
  openProject: string | null;
  setOpenProject: (id: string | null) => void;
}) {

  const statusColor: Record<Project["status"], string> = {
    wip: "#ffcc00",
    research: "#cc88ff",
    active: "#00ff41",
    archived: "#3a7a3a",
  };

  const project = openProject ? PROJECTS.find((p) => p.name === openProject) ?? null : null;

  if (project) {
    return (
      <div className="space-y-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <div className="text-muted-foreground text-sm">
          <Prompt path="~/projects" />
          cat ./{project.name}/README.md
        </div>

        <div className="border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-primary text-lg font-bold">{project.name}</span>
            <span
              className="text-xs px-2 py-0.5 border"
              style={{ color: statusColor[project.status], borderColor: statusColor[project.status] + "44" }}
            >
              {project.status}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">{project.desc}</p>

          <div>
            <div className="text-xs text-muted-foreground mb-2">-- tech stack</div>
            <div className="flex flex-wrap gap-2">
              {project.stack.map((t) => (
                <span key={t} className="text-xs border border-border px-2 py-0.5 text-foreground">{t}</span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2">-- architecture</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{project.architecture}</p>
          </div>

          <div className="flex gap-4 pt-2">
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs border border-border px-3 py-1 hover:border-primary hover:text-primary transition-colors"
            >
              ⌥ github
            </a>
            {project.hostedUrl && (
              <a
                href={project.hostedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs border border-border px-3 py-1 hover:border-primary hover:text-primary transition-colors"
              >
                ↗ live demo
              </a>
            )}
          </div>
        </div>

        <button
          onClick={() => setOpenProject(null)}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Prompt path="~/projects" />
          cd .. # ← go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="text-muted-foreground text-sm">
        <Prompt path="~/projects" />
        ls -la ./repos/
      </div>

      <div className="space-y-3">
        {[...PROJECTS]
          .sort((a, b) => {
            const ORDER = { wip: 0, research: 1, active: 2, archived: 3 };
            return ORDER[a.status] - ORDER[b.status];
          })
          .map((p) => (
            <button
              key={p.name}
              onClick={() => setOpenProject(p.name)}
              className="w-full text-left border border-border p-4 hover:border-primary hover:bg-secondary transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-primary group-hover:underline font-semibold">{p.name}</span>
                <span
                  className="text-xs px-2 py-0.5 border"
                  style={{ color: statusColor[p.status], borderColor: statusColor[p.status] + "44" }}
                >
                  {p.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mb-2">{p.desc}</div>
              <div className="text-xs" style={{ color: "#6699ff" }}>{p.lang}</div>
            </button>
          ))}
      </div>
    </div>
  );
}

function SkillsSection() {
  return (
    <div className="space-y-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="text-muted-foreground text-sm">
        <Prompt path="~/skills" />
        cat skills.json | jq .
      </div>

      <div className="border border-border p-4 text-sm space-y-4">
        {Object.entries(SKILLS).map(([category, items]) => (
          <div key={category}>
            <div className="text-muted-foreground text-xs mb-2">
              <span className="text-primary">"{category}"</span>:{" "}
              <span className="text-muted-foreground">[</span>
            </div>
            <div className="flex flex-wrap gap-2 pl-4">
              {items.map((skill) => (
                <span
                  key={skill}
                  className="border border-border px-2 py-0.5 text-xs hover:border-primary hover:text-primary transition-colors cursor-default"
                >
                  {skill}
                </span>
              ))}
            </div>
            <div className="text-muted-foreground text-xs mt-2">]</div>
          </div>
        ))}
      </div>

      <div className="text-muted-foreground text-sm">
        <Prompt path="~/skills" />
        cat ./roadmap/ai-engineer.txt
      </div>
      <div className="border border-border p-4 space-y-1 text-xs">
        {[
          { label: "Python", status: "done" },
          { label: "Machine Learning", status: "done" },
          { label: "Deep Learning", status: "progress" },
          { label: "LLM Applications", status: "done" },
          { label: "RAG", status: "done" },
          { label: "AI Agents", status: "done" },
          { label: "LLM Architecture", status: "progress" },
          { label: "AI Systems", status: "progress" },
          { label: "Distributed Training", status: "planned" },
          { label: "Model Serving", status: "planned" },
          { label: "CUDA", status: "planned" },
        ].sort((a, b) => {
          const ORDER: Record<string, number> = { done: 0, progress: 1, planned: 2 };
          return ORDER[a.status] - ORDER[b.status];
        }).map(({ label, status }) => {
          const icon = status === "done" ? "✓" : status === "progress" ? "◐" : "○";
          const color = status === "done" ? "#00ff41" : status === "progress" ? "#ffcc00" : "#3a7a3a";
          return (
            <div key={label} className="flex items-center gap-3">
              <span className="w-4 shrink-0 text-center" style={{ color }}>{icon}</span>
              <span style={{ color }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlogListSection({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="space-y-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="text-muted-foreground text-sm">
        <Prompt path="~/blog" />
        ls -t ./posts/ | head -20
      </div>

      <div className="space-y-3">
        {BLOG_POSTS.map((post) => (
          <button
            key={post.id}
            onClick={() => onOpen(post.id)}
            className="w-full text-left border border-border p-4 hover:border-primary hover:bg-secondary transition-colors group"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-primary group-hover:underline font-semibold text-sm leading-snug">
                {post.title}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{post.readTime}</span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">{post.date}</div>
            <div className="text-xs text-muted-foreground mb-3">{post.excerpt}</div>
            <div className="flex gap-2 flex-wrap">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 border border-border"
                  style={{ color: "#6699ff", borderColor: "rgba(102,153,255,0.3)" }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function BlogPostView({ post, onBack }: { post: BlogPost; onBack: () => void }) {
  return (
    <div className="space-y-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="text-muted-foreground text-sm">
        <Prompt path="~/blog" />
        cat ./posts/{post.id}.md
      </div>

      <div className="border border-border p-4 space-y-4">
        <div
          className="text-2xl font-bold"
          style={{ fontFamily: "'VT323', monospace", color: "#00ff41", letterSpacing: "0.03em" }}
        >
          {post.title}
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{post.date}</span>
          <span>{post.readTime} read</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 border"
              style={{ color: "#6699ff", borderColor: "rgba(102,153,255,0.3)" }}
            >
              #{tag}
            </span>
          ))}
        </div>
        <div className="border-t border-border pt-4 space-y-3">
          {post.content.map((para, i) => (
            <p key={i} className="text-sm leading-relaxed">
              {para.startsWith("Run:") ? (
                <>
                  <span className="text-muted-foreground">Run: </span>
                  <code
                    className="text-primary bg-secondary px-2 py-0.5"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {para.slice(5)}
                  </code>
                </>
              ) : (
                <span className="text-muted-foreground">{para}</span>
              )}
            </p>
          ))}
        </div>
      </div>

      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <Prompt path="~/blog" />
        cd .. # ← go back
      </button>
    </div>
  );
}

function ContactSection() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <div className="text-muted-foreground text-sm">
          <Prompt path="~/contact" />
          ./send-message.sh
        </div>
        <div className="border border-border p-4 space-y-2 text-sm">
          <div className="text-primary">✓ message queued successfully</div>
          <div className="text-muted-foreground">status: 200 OK</div>
          <div className="text-muted-foreground">
            expected reply latency: <span className="text-foreground">24–48h</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="text-muted-foreground text-sm">
        <Prompt path="~/contact" />
        ./send-message.sh --interactive
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {[
          { label: "name", key: "name", type: "text", placeholder: "your name" },
          { label: "email", key: "email", type: "email", placeholder: "you@example.com" },
        ].map(({ label, key, type, placeholder }) => (
          <div key={key} className="flex items-baseline gap-3">
            <span className="text-primary text-xs shrink-0 w-20 text-right select-none">--{label}</span>
            <input
              type={type}
              required
              placeholder={placeholder}
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="flex-1 bg-transparent border-b border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors pb-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
          </div>
        ))}

        <div className="flex items-start gap-3">
          <span className="text-primary text-xs shrink-0 w-20 text-right select-none pt-1">--message</span>
          <textarea
            required
            rows={4}
            placeholder="what's on your mind?"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="flex-1 bg-transparent border-b border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors resize-none pb-1"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0" />
          <button
            type="submit"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <span className="text-primary mr-1">$</span>./send.sh <span className="text-muted-foreground">↵</span>
          </button>
        </div>
      </form>

      <div className="border border-border p-3 space-y-1 text-xs text-muted-foreground">
        <div>
          email &nbsp;&nbsp;:: <span className="text-foreground">reachomjha@gmail.com</span>
        </div>
        <div>
          github &nbsp;:: <span className="text-foreground">github.com/PiUnknown</span>
        </div>
        <div>
          X &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:: <span className="text-foreground">@piunknown043</span>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [theme, setTheme] = useState<ThemeId>("phosphor");
  const [section, setSection] = useState<Section>("home");
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [cmdInput, setCmdInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [inlineLog, setInlineLog] = useState<string[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);

  // Derive palette state from input
  const isPaletteMode = cmdInput.startsWith("/");
  const paletteQuery = isPaletteMode ? cmdInput.slice(1) : "";

  const filteredCmds = isPaletteMode
    ? Object.entries(COMMANDS).filter(([k, v]) => {
      const q = paletteQuery.toLowerCase();
      return k.startsWith(q) || v.desc.toLowerCase().includes(q);
    })
    : [];

  useEffect(() => {
    if (isPaletteMode) {
      setPaletteOpen(true);
      setPaletteIdx(0);
    } else {
      setPaletteOpen(false);
    }
  }, [isPaletteMode, paletteQuery]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [section, inlineLog]);

  const navigate = useCallback((s: Section) => {
    setSection(s);
    setOpenPost(null);
    setOpenProject(null);
    setInlineLog([]);
  }, []);

  const currentPath = section === "home" ? "~" : `~/${section}`;

  function execCommand(raw: string) {
    // Strip leading slash if came from palette
    const cmd = raw.replace(/^\//, "").trim().toLowerCase();
    if (!cmd) return;

    setCmdHistory((h) => [cmd, ...h]);
    setHistoryIdx(-1);
    setCmdInput("");
    setPaletteOpen(false);

    if (cmd === "clear") {
      setInlineLog([]);
      return;
    }

    if (cmd === "help") {
      const lines = Object.entries(COMMANDS).map(
        ([k, v]) => `  ${k.padEnd(12)}${v.desc}`
      );
      setInlineLog((o) => [...o, `> ${cmd}`, ...lines]);
      return;
    }

    if (cmd === "ls") {
      setInlineLog((o) => [
        ...o,
        `> ${cmd}`,
        "  home  about  projects  skills  blog  contact",
      ]);
      return;
    }

    const found = Object.entries(COMMANDS).find(([k]) => k === cmd);
    if (found && found[1].action) {
      navigate(found[1].action as Section);
      // Echo appended after nav — inlineLog reset by navigate, so just add the echo
      setInlineLog([`> ${cmd}`]);
      return;
    }

    setInlineLog((o) => [
      ...o,
      `> ${cmd}`,
      `  bash: ${cmd}: command not found. Type '/help' for available commands.`,
    ]);
  }

  function selectPaletteItem(cmd: string) {
    execCommand(cmd);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (paletteOpen && filteredCmds.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPaletteIdx((i) => Math.min(i + 1, filteredCmds.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPaletteIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectPaletteItem(filteredCmds[paletteIdx]?.[0] ?? "");
        return;
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setCmdInput("");
        return;
      }
    } else {
      if (e.key === "Enter") {
        execCommand(cmdInput);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const idx = Math.min(historyIdx + 1, cmdHistory.length - 1);
        setHistoryIdx(idx);
        setCmdInput(cmdHistory[idx] ?? "");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const idx = Math.max(historyIdx - 1, -1);
        setHistoryIdx(idx);
        setCmdInput(idx === -1 ? "" : cmdHistory[idx]);
      } else if (e.key === "Escape") {
        setCmdInput("");
      }
    }
  }

  const post = openPost ? BLOG_POSTS.find((p) => p.id === openPost) ?? null : null;

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ fontFamily: "'JetBrains Mono', monospace", ...THEMES[theme].vars }}
      onClick={() => inputRef.current?.focus()}
    >
      <ScanlineOverlay />

      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b border-border px-4 py-2 flex items-center justify-between"
        style={{ background: "rgba(10,15,10,0.96)", backdropFilter: "blur(4px)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); navigate("home"); }}
            className="text-xl font-bold hover:opacity-80 transition-opacity"
            style={{ fontFamily: "'VT323', monospace", color: "#00ff41", letterSpacing: "0.1em" }}
          >
            Om.dev
          </button>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs hidden sm:inline">v0.1.5 ·</span>
            {(Object.keys(THEMES) as ThemeId[]).map((id) => (
              <button
                key={id}
                onClick={(e) => { e.stopPropagation(); setTheme(id); }}
                title={THEMES[id].label}
                className="flex items-center gap-1 text-xs transition-colors px-1"
                style={{ color: theme === id ? THEMES[id].dot : "#3a5a3a" }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: THEMES[id].dot, opacity: theme === id ? 1 : 0.35 }}
                />
                <span className="hidden sm:inline">{THEMES[id].label}</span>
              </button>
            ))}
          </div>
        </div>

        <nav className="flex gap-1">
          {(["home", "about", "projects", "skills", "blog", "contact"] as Section[]).map((s) => (
            <button
              key={s}
              onClick={(e) => {
                e.stopPropagation();
                navigate(s);
              }}
              className={`px-2 py-1 text-xs transition-colors ${section === s
                ? "text-primary border border-primary bg-secondary"
                : "text-muted-foreground hover:text-primary border border-transparent"
                }`}
            >
              {s}
            </button>
          ))}
        </nav>
      </header>

      {/* Terminal body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 pb-28">
        {/* Boot message */}
        <div className="text-muted-foreground text-xs mb-6 space-y-0.5">
          <div style={{ color: "#3a7a3a" }}>
            Om.dev v2.1.0 (phosphor) #1 SMP {new Date().toDateString()}
          </div>
          <div style={{ color: "#3a7a3a" }}>
            Type <span className="text-primary">/</span> to open the command palette, or use the nav above.
          </div>
        </div>

        {/* Section content */}
        {section === "home" && <HomeSection />}
        {section === "about" && <AboutSection />}
        {section === "projects" && (
          <ProjectsSection
            openProject={openProject}
            setOpenProject={setOpenProject}
          />
        )}
        {section === "skills" && <SkillsSection />}
        {section === "blog" &&
          (post ? (
            <BlogPostView post={post} onBack={() => setOpenPost(null)} />
          ) : (
            <BlogListSection onOpen={setOpenPost} />
          ))}
        {section === "contact" && <ContactSection />}

        {/* Inline log — appears below section content, above the input */}
        <InlineLog lines={inlineLog} path={currentPath} />

        <div ref={bottomRef} />
      </main>

      <div
        className="fixed left-0 right-0 z-40 border-t border-border px-4 py-2"
        style={{ bottom: "28px", background: "rgba(10,15,10,0.97)", backdropFilter: "blur(4px)" }}
      >
        <div className="max-w-5xl mx-auto relative" ref={inputWrapRef}>
          {paletteOpen && filteredCmds.length > 0 && (
            <SlashPalette
              query={paletteQuery}
              activeIdx={paletteIdx}
              onSelect={selectPaletteItem}
              onHover={setPaletteIdx}
            />
          )}
          <div className="flex items-center gap-2">
            <Prompt path={currentPath} />
            <input
              ref={inputRef}
              value={cmdInput}
              onChange={(e) => { setCmdInput(e.target.value); setHistoryIdx(-1); }}
              onKeyDown={handleKey}
              onClick={(e) => e.stopPropagation()}
              placeholder="type / for commands..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground caret-primary"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      <StatusBar section={section} />
    </div>
  );
}
