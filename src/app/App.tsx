import { useState, useEffect, useRef, useCallback } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { marked } from "marked";

// ── Types ────────────────────────────────────────────────────────────────────

type Section = "home" | "about" | "projects" | "skills" | "blog" | "contact";

type ThemeId = "phosphor" | "amber" | "ice" | "ghost" | "synthwave" | "miami" | "redline" | "c64";

const THEMES: Record<ThemeId, { label: string; vars: Record<string, string> }> = {
  phosphor: {
    label: "phosphor edition",
    vars: {
      "--background": "#0a0f0a", "--foreground": "#00ff41", "--card": "#0d1a0d",
      "--card-foreground": "#00ff41", "--primary": "#00ff41", "--primary-foreground": "#0a0f0a",
      "--secondary": "#0f2010", "--secondary-foreground": "#00cc33",
      "--muted": "#0f1a0f", "--muted-foreground": "#3a7a3a",
      "--accent": "#00cc33", "--border": "rgba(0,255,65,0.15)", "--ring": "rgba(0,255,65,0.4)", "--radius": "0rem",
    },
  },
  amber: {
    label: "amber edition",
    vars: {
      "--background": "#0f0900", "--foreground": "#ffb000", "--card": "#1a1000",
      "--card-foreground": "#ffb000", "--primary": "#ffb000", "--primary-foreground": "#0f0900",
      "--secondary": "#201400", "--secondary-foreground": "#cc8800",
      "--muted": "#180f00", "--muted-foreground": "#7a5500",
      "--accent": "#cc8800", "--border": "rgba(255,176,0,0.15)", "--ring": "rgba(255,176,0,0.4)", "--radius": "0rem",
    },
  },
  ice: {
    label: "ice edition",
    vars: {
      "--background": "#000d0f", "--foreground": "#00d4ff", "--card": "#001a20",
      "--card-foreground": "#00d4ff", "--primary": "#00d4ff", "--primary-foreground": "#000d0f",
      "--secondary": "#002030", "--secondary-foreground": "#00aacc",
      "--muted": "#001520", "--muted-foreground": "#006680",
      "--accent": "#00aacc", "--border": "rgba(0,212,255,0.15)", "--ring": "rgba(0,212,255,0.4)", "--radius": "0rem",
    },
  },
  ghost: {
    label: "ghost edition",
    vars: {
      "--background": "#0a0a0a", "--foreground": "#cccccc", "--card": "#141414",
      "--card-foreground": "#cccccc", "--primary": "#cccccc", "--primary-foreground": "#0a0a0a",
      "--secondary": "#1e1e1e", "--secondary-foreground": "#aaaaaa",
      "--muted": "#181818", "--muted-foreground": "#666666",
      "--accent": "#aaaaaa", "--border": "rgba(204,204,204,0.15)", "--ring": "rgba(204,204,204,0.4)", "--radius": "0rem",
    },
  },
  synthwave: {
    label: "synthwave edition",
    vars: {
      "--background": "#0d0014", "--foreground": "#ff00ff", "--card": "#180020",
      "--card-foreground": "#ff00ff", "--primary": "#ff00ff", "--primary-foreground": "#0d0014",
      "--secondary": "#250030", "--secondary-foreground": "#cc00cc",
      "--muted": "#1a0020", "--muted-foreground": "#7a007a",
      "--accent": "#cc00cc", "--border": "rgba(255,0,255,0.15)", "--ring": "rgba(255,0,255,0.4)", "--radius": "0rem",
    },
  },
  miami: {
    label: "miami edition",
    vars: {
      "--background": "#0a000a", "--foreground": "#ff2079", "--card": "#1a0015",
      "--card-foreground": "#ff2079", "--primary": "#ff2079", "--primary-foreground": "#0a000a",
      "--secondary": "#200018", "--secondary-foreground": "#cc1a61",
      "--muted": "#180012", "--muted-foreground": "#7a1040",
      "--accent": "#cc1a61", "--border": "rgba(255,32,121,0.15)", "--ring": "rgba(255,32,121,0.4)", "--radius": "0rem",
    },
  },


  redline: {
    label: "redline edition",
    vars: {
      "--background": "#0f0000", "--foreground": "#ff2222", "--card": "#1a0000",
      "--card-foreground": "#ff2222", "--primary": "#ff2222", "--primary-foreground": "#0f0000",
      "--secondary": "#200000", "--secondary-foreground": "#cc1a1a",
      "--muted": "#180000", "--muted-foreground": "#7a1010",
      "--accent": "#cc1a1a", "--border": "rgba(255,34,34,0.15)", "--ring": "rgba(255,34,34,0.4)", "--radius": "0rem",
    },
  },
  c64: {
    label: "c64 edition",
    vars: {
      "--background": "#00003a", "--foreground": "#7b68ee", "--card": "#000050",
      "--card-foreground": "#7b68ee", "--primary": "#7b68ee", "--primary-foreground": "#00003a",
      "--secondary": "#000060", "--secondary-foreground": "#6255be",
      "--muted": "#000048", "--muted-foreground": "#3a3280",
      "--accent": "#6255be", "--border": "rgba(123,104,238,0.15)", "--ring": "rgba(123,104,238,0.4)", "--radius": "0rem",
    },
  },
};

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
  body: string;
  stars: number;
  status: "active" | "archived" | "wip";
  url: string;
}

// ── Blog: file-based markdown loader ─────────────────────────────────────────

const mdModules = import.meta.glob<string>(
  "../content/blog/*.md",
  { eager: true, query: "?raw", import: "default" }
);

function parseBlogPost(raw: string, filepath: string): BlogPost {
  const id = filepath.split("/").pop()!.replace(/\.md$/, "");
  const fenceEnd = raw.indexOf("\n---", 4);
  const fm: Record<string, string> = {};
  if (raw.startsWith("---") && fenceEnd !== -1) {
    raw
      .slice(4, fenceEnd)
      .split("\n")
      .forEach((line) => {
        const colon = line.indexOf(":");
        if (colon !== -1) {
          fm[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
        }
      });
  }
  const body = fenceEnd !== -1 ? raw.slice(fenceEnd + 5).trim() : raw.trim();
  return {
    id,
    title: fm.title ?? id,
    date: fm.date ?? "",
    tags: fm.tags ? fm.tags.split(",").map((t) => t.trim()) : [],
    readTime: fm.readTime ?? "",
    excerpt: fm.excerpt ?? "",
    content: body.split(/\n\n+/).filter(Boolean),
  };
}

// ── Data ─────────────────────────────────────────────────────────────────────

const BLOG_POSTS: BlogPost[] = Object.entries(mdModules)
  .map(([path, raw]) => parseBlogPost(raw, path))
  .sort((a, b) => b.date.localeCompare(a.date));

const projectMdModules = import.meta.glob<string>(
  "../content/projects/*.md",
  { eager: true, query: "?raw", import: "default" }
);

function parseProject(raw: string): Project {
  const fenceEnd = raw.indexOf("\n---", 4);
  const fm: Record<string, string> = {};
  if (raw.startsWith("---") && fenceEnd !== -1) {
    raw
      .slice(4, fenceEnd)
      .split("\n")
      .forEach((line) => {
        const colon = line.indexOf(":");
        if (colon !== -1) {
          fm[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
        }
      });
  }
  const body = fenceEnd !== -1 ? raw.slice(fenceEnd + 5).trim() : raw.trim();
  return {
    name: fm.name ?? "",
    lang: fm.lang ?? "",
    desc: fm.desc ?? "",
    body,
    stars: fm.stars ? parseInt(fm.stars, 10) : 0,
    status: (fm.status as Project["status"]) ?? "active",
    url: fm.url ?? "#",
  };
}

const STATUS_ORDER: Record<Project["status"], number> = { wip: 0, active: 1, archived: 2 };

const PROJECTS: Project[] = Object.values(projectMdModules)
  .map((raw) => parseProject(raw))
  .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

const SKILLS = {
  languages: ["Python", "C", "C++", "SQL", "HTML", "CSS"],
  ml_ai: ["Scikit-learn", "TensorFlow", "PyTorch", "Pandas", "Numpy", "Matplotlib", "Seaborn", "YOLOv8", "Hugging Face", "Sentence-Transformers", "spaCy", "FinBERT", "BART"],
  llm_stack: ["LangChain", "ChromaDB", "FAISS", "Sentence-Transformers", "Hugging Face", "Groq", "Ollama"],
  tools: ["Git", "GitHub", "Docker", "AWS EC2", "Streamlit", "FastAPI"],
};

const VERSION = "v0.1.5";


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

function useGithubStars(url: string, fallback: number): number {
  const [stars, setStars] = useState(fallback);
  useEffect(() => {
    const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
    if (!match) return;
    fetch(`https://api.github.com/repos/${match[1]}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.stargazers_count === "number") setStars(d.stargazers_count);
      })
      .catch(() => {});
  }, [url]);
  return stars;
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
  return <div className="scanline" />;
}

function StatusBar({ section, theme }: { section: Section; theme: ThemeId }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = time.toLocaleTimeString("en-US", { hour12: false });
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-3 sm:px-4 py-1 text-xs border-t border-border select-none"
      style={{ background: `color-mix(in srgb, ${THEMES[theme].vars["--primary"]} 8%, transparent)`, fontFamily: "'JetBrains Mono', monospace", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <span className="text-muted-foreground">
        <span className="text-primary hidden sm:inline">INSERT</span>
        <span className="hidden sm:inline"> — </span>
        type <span className="text-primary">/</span>
        <span className="hidden sm:inline"> to open command palette</span>
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
      <div className="border border-border p-3 sm:p-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-4">
          <span>┌─ whoami</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div
          className="text-2xl sm:text-4xl font-bold mb-2"
          style={{ fontFamily: "'VT323', monospace", color: "#00ff41", letterSpacing: "0.05em" }}
        >
          {line1.displayed}
          {line1.done ? null : <Cursor />}
        </div>
        <div className="text-base sm:text-lg mb-3" style={{ color: "#33ff66" }}>
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
              { label: "linkedin/omkumarjha043", icon: "⌘", url: "https://linkedin.com/in/omkumarjha043" },
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

      <div className="border border-border p-3 sm:p-4 space-y-4 text-sm leading-relaxed">
        <p>
          Hey, I am <span className="text-primary">Om</span>, a 3rd year CS Undergrad at GGSIPU and most of my time goes into building, breaking, and rebuilding systems capable of harnessing intelligence. I'm the kind of person who learns by doing... then doing it again the right way.
        </p>
        <p className="text-muted-foreground">
          Talking about where it all started, I was 8 when my father brought home a new laptop for work. Like every kid, I just wanted to play games on it. Neither of us knew how to install any, so an uncle of mine, who was an engineer, set everything up. Watching him somehow make the machine do whatever he wanted felt almost like magic. I didn't know it then, but that moment completely changed how I looked at technology. Over the next few years I spent countless hours experimenting on that laptop, from installing pirated games to accidentally resetting my father's system. Somewhere along the way I realized I simply loved machines. I could spend hours behind one, doing just about anything.
        </p>
        <p>
          Moving fast forward to today.<br />
          I design agentic LLM pipelines, train and fine-tune models, optimize local RAG systems, and build resource-constrained projects. I'm an AI generalist, but if you want to know my usual tech stack, check my GitHub.
        </p>
        <p className="text-muted-foreground">
          Currently: AI Summer Intern at IIT Ropar<br />
          Previously: 2-month Data Science internship at Indian Navy (WESEE), HPAIR 2025 Tokyo delegate.
        </p>
        <p>
          Outside of code I try to hit gym 5 times a week, drink too much diet coke, and write my thoughts out on a paper.
        </p>
        <p className="text-muted-foreground">
          I love working with people who are obsessed with what they're creating.<br />
          If that sounds like you, let's talk.
        </p>
      </div>

      <div className="text-muted-foreground text-sm">
        <Prompt path="~/about" />
        cat experience.txt
      </div>

      <div className="border border-border p-3 sm:p-4 space-y-4 text-sm">
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

      <div className="border border-border p-3 sm:p-4 space-y-3 text-sm">
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

function ProjectCard({ p, onClick }: { p: Project; onClick: () => void }) {
  const stars = useGithubStars(p.url, p.stars);
  const statusColor: Record<Project["status"], string> = {
    active: "#00ff41",
    archived: "#3a7a3a",
    wip: "#ffcc00",
  };
  return (
    <button
      onClick={onClick}
      className="w-full text-left block border border-border p-3 sm:p-4 hover:border-primary hover:bg-secondary transition-colors group touch-manipulation"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-primary group-hover:underline font-semibold">{p.name}</span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>★ {stars}</span>
          <span
            className="px-2 py-0.5 border text-xs"
            style={{ color: statusColor[p.status], borderColor: statusColor[p.status] + "44" }}
          >
            {p.status}
          </span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mb-2">{p.desc}</div>
      <div className="text-xs" style={{ color: "#6699ff" }}>{p.lang}</div>
    </button>
  );
}

function ProjectDetailView({
  project,
  onBack,
}: {
  project: Project;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="text-muted-foreground text-sm">
        <Prompt path="~/projects" />
        cat ./{project.name}/README.md
      </div>

      <div className="border border-border p-3 sm:p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span
            className="text-2xl font-bold"
            style={{ fontFamily: "'VT323', monospace", color: "var(--primary)", letterSpacing: "0.03em" }}
          >
            {project.name}
          </span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span style={{ color: "#6699ff" }}>{project.lang}</span>
            <span>★ {project.stars}</span>
          </div>
        </div>

        <div
          className="prose-terminal text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: marked(project.body) as string }}
        />

        <div className="flex gap-3 pt-2 border-t border-border">
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs px-3 py-1 border border-border hover:border-primary hover:text-primary transition-colors text-muted-foreground"
          >
            ↗ github
          </a>
        </div>
      </div>

      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <Prompt path="~/projects" />
        cd .. # ← go back
      </button>
    </div>
  );
}

function ProjectsSection({
  openProject,
  setOpenProject,
}: {
  openProject: string | null;
  setOpenProject: (name: string | null) => void;
}) {
  const project = openProject ? PROJECTS.find((p) => p.name === openProject) ?? null : null;

  if (project) {
    return <ProjectDetailView project={project} onBack={() => setOpenProject(null)} />;
  }

  return (
    <div className="space-y-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="text-muted-foreground text-sm">
        <Prompt path="~/projects" />
        ls -la ./repos/
      </div>
      <div className="space-y-3">
        {PROJECTS.map((p) => (
          <ProjectCard key={p.name} p={p} onClick={() => setOpenProject(p.name)} />
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

      <div className="border border-border p-3 sm:p-4 text-sm space-y-4">
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
      <div className="border border-border p-3 sm:p-4 space-y-1 text-xs">
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
            className="w-full text-left border border-border p-3 sm:p-4 hover:border-primary hover:bg-secondary transition-colors group"
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

      <div className="border border-border p-3 sm:p-4 space-y-4">
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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "69aa8a53-2d18-4282-9fde-f04edec7d5cb",
          name: form.name,
          email: form.email,
          message: form.message,
        }),
      });
      const data = await res.json();
      if (data.success) setSent(true);
      else alert("Something went wrong. Try emailing directly.");
    } catch {
      alert("Network error. Try emailing directly.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <div className="text-muted-foreground text-sm">
          <Prompt path="~/contact" />
          ./send-message.sh
        </div>
        <div className="border border-border p-3 sm:p-4 space-y-2 text-sm">
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

      <form onSubmit={handleSubmit} className="space-y-5" onClick={(e) => e.stopPropagation()}>
        {[
          { label: "name", key: "name", type: "text", placeholder: "your name" },
          { label: "email", key: "email", type: "email", placeholder: "you@example.com" },
        ].map(({ label, key, type, placeholder }) => (
          <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
            <span className="text-primary text-xs sm:shrink-0 sm:w-20 sm:text-right select-none">--{label}</span>
            <input
              type={type}
              required
              placeholder={placeholder}
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full sm:flex-1 bg-transparent border-b border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors pb-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
          </div>
        ))}

        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
          <span className="text-primary text-xs sm:shrink-0 sm:w-20 sm:text-right select-none sm:pt-1">--message</span>
          <textarea
            required
            rows={4}
            placeholder="what's on your mind?"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full sm:flex-1 bg-transparent border-b border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors resize-none pb-1"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block w-20 shrink-0" />
          <button
            type="submit"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <span className="text-primary mr-1">$</span>
            {loading ? "sending..." : <>./send.sh <span className="text-muted-foreground">↵</span></>}
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
  }, [inlineLog]);

  const navigate = useCallback((s: Section) => {
    setSection(s);
    setOpenPost(null);
    setOpenProject(null);
    setInlineLog([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        className="sticky top-0 z-30 border-b border-border px-4 py-2"
        style={{ background: "rgba(10,15,10,0.96)", backdropFilter: "blur(4px)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); navigate("home"); }}
              className="text-xl font-bold hover:opacity-80 transition-opacity"
              style={{ fontFamily: "'VT323', monospace", color: "#00ff41", letterSpacing: "0.1em" }}
            >
              Om.dev
            </button>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs hidden sm:inline">{VERSION} · {THEMES[theme].label}</span>
              <div className="hidden sm:flex items-center gap-1 ml-2">
                {(Object.keys(THEMES) as ThemeId[]).map((t) => (
                  <button
                    key={t}
                    title={THEMES[t].label}
                    onClick={(e) => { e.stopPropagation(); setTheme(t); }}
                    className="w-3 h-3 transition-transform hover:scale-125"
                    style={{
                      background: THEMES[t].vars["--primary"],
                      outline: theme === t ? `1px solid ${THEMES[t].vars["--primary"]}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <nav className="hidden sm:flex gap-1">
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

          <button
            className="sm:hidden text-muted-foreground hover:text-primary transition-colors px-2 py-1 text-lg"
            onClick={(e) => { e.stopPropagation(); setMobileNavOpen((v) => !v); }}
          >
            {mobileNavOpen ? "✕" : "☰"}
          </button>
        </div>

        {mobileNavOpen && (
          <nav className="sm:hidden border-t border-border mt-2 pt-2 flex flex-wrap gap-1">
            {(["home", "about", "projects", "skills", "blog", "contact"] as Section[]).map((s) => (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(s);
                  setMobileNavOpen(false);
                }}
                className={`px-3 py-1.5 text-xs transition-colors ${section === s
                  ? "text-primary border border-primary bg-secondary"
                  : "text-muted-foreground hover:text-primary border border-transparent"
                  }`}
              >
                {s}
              </button>
            ))}
            <div className="flex items-center gap-2 px-1 pt-2 border-t border-border mt-1 w-full">
              <span className="text-muted-foreground text-xs">theme:</span>
              {(Object.keys(THEMES) as ThemeId[]).map((t) => (
                <button
                  key={t}
                  title={THEMES[t].label}
                  onClick={(e) => { e.stopPropagation(); setTheme(t); }}
                  className="w-4 h-4 transition-transform hover:scale-125"
                  style={{
                    background: THEMES[t].vars["--primary"],
                    outline: theme === t ? `1px solid ${THEMES[t].vars["--primary"]}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Terminal body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 sm:pb-28">
        {/* Boot message */}
        <div className="text-muted-foreground text-xs mb-6 space-y-0.5">
          <div style={{ color: "#3a7a3a" }}>
            Om.dev {VERSION} ({theme}) #1 SMP {new Date().toDateString()}
          </div>
          <div style={{ color: "#3a7a3a" }}>
            Type <span className="text-primary">/</span> to open the command palette, or use the nav above.
          </div>
        </div>

        {/* Section content */}
        {section === "home" && <HomeSection key="home" />}
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

      <StatusBar section={section} theme={theme} />
      <SpeedInsights />
      <Analytics />
    </div>
  );
}
