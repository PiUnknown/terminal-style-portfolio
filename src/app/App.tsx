/// <reference types="vite/client" />
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { marked } from "marked";
import { TerminalSnakeModal } from "./components/TerminalSnakeModal";

// ── Types ────────────────────────────────────────────────────────────────────

type Section = "home" | "about" | "projects" | "skills" | "blog" | "contact";

type ThemeId = "phosphor" | "ice" | "synthwave" | "c64" | "gruvbox";

const THEMES: Record<ThemeId, { label: string; dot: string; vars: Record<string, string> }> = {
  phosphor: {
    label: "phosphor",
    dot: "#00ff41",
    vars: {
      "--background": "#0a0f0a", "--foreground": "#00ff41", "--card": "#0d1a0d",
      "--card-foreground": "#00ff41", "--primary": "#00ff41", "--primary-foreground": "#0a0f0a",
      "--secondary": "#0f2010", "--secondary-foreground": "#00cc33",
      "--muted": "#0f1a0f", "--muted-foreground": "#3a7a3a",
      "--accent": "#00cc33", "--border": "rgba(0,255,65,0.15)", "--ring": "rgba(0,255,65,0.4)", "--radius": "0rem",
    },
  },
  ice: {
    label: "ice",
    dot: "#00d4ff",
    vars: {
      "--background": "#000d0f", "--foreground": "#00d4ff", "--card": "#001a20",
      "--card-foreground": "#00d4ff", "--primary": "#00d4ff", "--primary-foreground": "#000d0f",
      "--secondary": "#002030", "--secondary-foreground": "#00aacc",
      "--muted": "#001520", "--muted-foreground": "#006680",
      "--accent": "#00aacc", "--border": "rgba(0,212,255,0.15)", "--ring": "rgba(0,212,255,0.4)", "--radius": "0rem",
    },
  },
  synthwave: {
    label: "synthwave",
    dot: "#ff2a8d",
    vars: {
      "--background": "#0d021a", "--foreground": "#ff71ce", "--card": "#180530",
      "--card-foreground": "#ff71ce", "--primary": "#ff2a8d", "--primary-foreground": "#0d021a",
      "--secondary": "#240845", "--secondary-foreground": "#01cdfe",
      "--muted": "#140326", "--muted-foreground": "#7d1f5c",
      "--accent": "#01cdfe", "--border": "rgba(255,42,141,0.2)", "--ring": "rgba(255,42,141,0.4)", "--radius": "0rem",
    },
  },
  c64: {
    label: "c64",
    dot: "#a5a5ff",
    vars: {
      "--background": "#0d0b1a", "--foreground": "#a5a5ff", "--card": "#16132b",
      "--card-foreground": "#a5a5ff", "--primary": "#a5a5ff", "--primary-foreground": "#0d0b1a",
      "--secondary": "#211c40", "--secondary-foreground": "#d0d0ff",
      "--muted": "#131024", "--muted-foreground": "#6c63a5",
      "--accent": "#7c70db", "--border": "rgba(165,165,255,0.2)", "--ring": "rgba(165,165,255,0.4)", "--radius": "0rem",
    },
  },
  gruvbox: {
    label: "gruvbox",
    dot: "#fabd2f",
    vars: {
      "--background": "#141617", "--foreground": "#fabd2f", "--card": "#1d2021",
      "--card-foreground": "#fabd2f", "--primary": "#fabd2f", "--primary-foreground": "#141617",
      "--secondary": "#282828", "--secondary-foreground": "#b8bb26",
      "--muted": "#1a1c1d", "--muted-foreground": "#928374",
      "--accent": "#8ec07c", "--border": "rgba(250,189,47,0.18)", "--ring": "rgba(250,189,47,0.4)", "--radius": "0rem",
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
  order: number;
  status: "active" | "archived" | "wip" | "research";
  url: string;
  liveUrl?: string;
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
  const wordCount = body.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
  const readTime = `${Math.max(1, Math.ceil(wordCount / 200))} min`;

  return {
    id,
    title: fm.title ?? id,
    date: fm.date ?? "",
    tags: fm.tags ? fm.tags.split(",").map((t) => t.trim()) : [],
    readTime,
    excerpt: fm.excerpt ?? "",
    content: body.split(/\n\n+/).filter(Boolean),
  };
}

// ── Data ─────────────────────────────────────────────────────────────────────

const BLOG_POSTS: BlogPost[] = Object.entries(mdModules)
  .filter(([path]) => !path.includes("template") && !path.split("/").pop()?.startsWith("_"))
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
    order: fm.order ? parseInt(fm.order, 10) : 999,
    status: (fm.status as Project["status"]) ?? "active",
    url: fm.url ?? "#",
    liveUrl: fm.live_url || fm.liveUrl || undefined,
  };
}

const STATUS_ORDER: Record<Project["status"], number> = { wip: 0, research: 1, active: 2, archived: 3 };

const PROJECTS: Project[] = Object.values(projectMdModules)
  .map((raw) => parseProject(raw))
  .sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.order - b.order;
  });

const SKILLS = {
  languages: ["Python", "C", "C++", "SQL", "HTML", "CSS"],
  ml_ai: ["Scikit-learn", "TensorFlow", "PyTorch", "Pandas", "Numpy", "Matplotlib", "Seaborn", "YOLOv8", "Hugging Face", "Sentence-Transformers", "spaCy", "FinBERT", "BART"],
  llm_stack: ["LangChain", "ChromaDB", "FAISS", "Sentence-Transformers", "Hugging Face", "Groq", "Ollama"],
  tools: ["Git", "GitHub", "Docker", "AWS EC2", "Streamlit", "FastAPI"],
};

const VERSION = "v0.1.5";

const GREETINGS = [
  "HELLO",
  "नमस्ते",
  "HOLA",
  "BONJOUR",
  "こんにちは",
  "你好",
  "ПРИВЕТ",
  "مَرْحَبًا",
  "안녕하세요",
  "OLÁ",
  "CIAO",
  "HALLO",
  "MERHABA",
  "XIN CHÀO",
  "HEJ"
];


// ── Commands ──────────────────────────────────────────────────────────────────

const COMMANDS: Record<string, { desc: string; action?: string }> = {
  help: { desc: "show available commands" },
  whoami: { desc: "about me", action: "home" },
  about: { desc: "background & education", action: "about" },
  projects: { desc: "open source work", action: "projects" },
  skills: { desc: "languages & tools", action: "skills" },
  blog: { desc: "writing & posts", action: "blog" },
  contact: { desc: "get in touch", action: "contact" },
  snake: { desc: "play retro terminal snake mini-game" },
  game: { desc: "play retro terminal snake mini-game" },
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

// Shared cache for GitHub star counts to avoid redundant fetches and ensure consistent state.
const starsCache: Record<string, number> = {};
const starsListeners: Record<string, Set<(count: number) => void>> = {};

function updateStarsCache(url: string, count: number) {
  starsCache[url] = count;
  if (starsListeners[url]) {
    starsListeners[url].forEach((cb) => cb(count));
  }
}

function useGithubStars(url: string, fallback: number): number {
  const [stars, setStars] = useState(() => starsCache[url] ?? fallback);

  useEffect(() => {
    if (!starsListeners[url]) {
      starsListeners[url] = new Set();
    }
    starsListeners[url].add(setStars);

    const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
    if (match) {
      const repoPath = match[1];

      const fetchStars = () => {
        fetch(`https://api.github.com/repos/${repoPath}`)
          .then((r) => r.json())
          .then((d) => {
            if (typeof d.stargazers_count === "number") {
              updateStarsCache(url, d.stargazers_count);
            }
          })
          .catch(() => { });
      };

      if (starsCache[url] === undefined) {
        fetchStars();
      }

      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          fetchStars();
        }
      };

      const intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchStars();
        }
      }, 30000);

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        starsListeners[url]?.delete(setStars);
        clearInterval(intervalId);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }

    return () => {
      starsListeners[url]?.delete(setStars);
    };
  }, [url]);

  return stars;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
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

function ShareButton({ postId }: { postId: string }) {
  const [copied, setCopied] = useState(false);

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/blog/${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleShare}
      className="text-xs transition-colors shrink-0"
      style={{
        color: copied ? "var(--primary)" : "var(--muted-foreground)",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {copied ? "✓ copied" : "[share]"}
    </button>
  );
}

interface BootLoaderProps {
  visible: boolean;
}

function BootLoader({ visible }: BootLoaderProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % GREETINGS.length);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <ScanlineOverlay />
      <div
        className="text-4xl sm:text-6xl font-bold tracking-widest text-primary text-center px-4"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {GREETINGS[index]}
      </div>
    </div>
  );
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
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-3 sm:px-4 text-xs border-t border-border select-none"
      style={{
        background: `color-mix(in srgb, ${THEMES[theme].vars["--primary"]} 8%, var(--background))`,
        fontFamily: "'JetBrains Mono', monospace",
        height: "calc(28px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: 0,
      }}
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
  reducedMotion: boolean;
}

function SlashPalette({ query, activeIdx, onSelect, onHover, reducedMotion }: SlashPaletteProps) {
  const q = query.toLowerCase();
  const filtered = Object.entries(COMMANDS).filter(
    ([k, v]) => k.startsWith(q) || v.desc.toLowerCase().includes(q)
  );

  if (filtered.length === 0) return null;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: 6 }}
      transition={{ type: "spring", bounce: 0, duration: 0.2 }}
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
          <motion.button
            key={cmd}
            initial={reducedMotion ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.2, delay: reducedMotion ? 0 : i * 0.028 }}
            className="w-full flex items-center gap-4 px-3 py-2 text-left transition-colors"
            style={{
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
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// ── Inline log ────────────────────────────────────────────────────────────────

function InlineLog({ lines, path }: { lines: string[]; path: string }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-6 space-y-0.5 text-xs border-t border-border pt-4">
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.2, delay: i * 0.03 }}
        >
          {line.startsWith(">") ? (
            <div className="text-primary">
              <Prompt path={path} />
              {line.slice(2)}
            </div>
          ) : (
            <div className="text-muted-foreground pl-2">{line}</div>
          )}
        </motion.div>
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
              <motion.a
                key={link.label}
                href={link.url}
                target={link.url.startsWith("mailto") || link.url.startsWith("/") ? undefined : "_blank"}
                rel="noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                className="border border-border px-3 py-2 text-xs hover:border-primary hover:bg-secondary transition-colors group"
              >
                <span className="text-muted-foreground mr-1">{link.icon}</span>
                <span className="group-hover:text-primary transition-colors">{link.label}</span>
              </motion.a>
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
            note: "CGPA: 8",
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
    wip: "#ffcc00",
    research: "#a554e3ff",
    active: "#00ff41",
    archived: "#ec1b1bff",
  };
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", bounce: 0, duration: 0.2 }}
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
    </motion.button>
  );
}

function ProjectDetailView({
  project,
  onBack,
}: {
  project: Project;
  onBack: () => void;
}) {
  const stars = useGithubStars(project.url, project.stars);

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
            <span>★ {stars}</span>
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
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs px-3 py-1 border border-border hover:border-primary hover:text-primary transition-colors text-muted-foreground"
            >
              ↗ live link
            </a>
          )}
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
          <motion.button
            key={post.id}
            onClick={() => onOpen(post.id)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", bounce: 0, duration: 0.2 }}
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
            <div className="flex items-center justify-end mt-2">
              <ShareButton postId={post.id} />
            </div>
          </motion.button>
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>share:</span>
          <ShareButton postId={post.id} />
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
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeId>("phosphor");
  const [section, setSection] = useState<Section>("home");
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [snakeOpen, setSnakeOpen] = useState(false);
  const [cmdInput, setCmdInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [inlineLog, setInlineLog] = useState<string[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = new Promise((resolve) => setTimeout(resolve, 1500));
    Promise.all([document.fonts.ready, timer]).then(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const path = window.location.pathname.replace(/^\//, "");
    const segments = path.split("/");
    const maybeSection = segments[0] as Section;
    const validSections: Section[] = ["home", "about", "projects", "skills", "blog", "contact"];

    if (!path || path === "/") {
      // already home, do nothing
    } else if (maybeSection === "blog" && segments[1]) {
      setSection("blog");
      setOpenPost(segments[1]);
    } else if (maybeSection === "projects" && segments[1]) {
      setSection("projects");
      setOpenProject(segments[1]);
    } else if (validSections.includes(maybeSection)) {
      setSection(maybeSection);
    }
  }, []);

  useEffect(() => {
    function onPop() {
      const path = window.location.pathname.replace(/^\//, "");
      const segments = path.split("/");
      const maybeSection = segments[0] as Section;
      const validSections: Section[] = ["home", "about", "projects", "skills", "blog", "contact"];

      if (!path || path === "/") {
        setSection("home");
        setOpenPost(null);
        setOpenProject(null);
      } else if (maybeSection === "blog" && segments[1]) {
        setSection("blog");
        setOpenPost(segments[1]);
      } else if (maybeSection === "projects" && segments[1]) {
        setSection("projects");
        setOpenProject(segments[1]);
      } else if (validSections.includes(maybeSection)) {
        setSection(maybeSection);
        setOpenPost(null);
        setOpenProject(null);
      }
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const handleOpenPost = (id: string | null) => {
    setOpenPost(id);
    if (id) {
      history.pushState(null, "", `/blog/${id}`);
    } else {
      history.pushState(null, "", "/blog");
    }
  };

  const handleOpenProject = (name: string | null) => {
    setOpenProject(name);
    if (name) {
      history.pushState(null, "", `/projects/${name}`);
    } else {
      history.pushState(null, "", "/projects");
    }
  };

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
    history.pushState(null, "", s === "home" ? "/" : `/${s}`);
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

    if (cmd === "snake" || cmd === "game" || cmd === "play") {
      setSnakeOpen(true);
      setInlineLog((o) => [...o, `> ${cmd}`, "  Launching terminal snake v1.0..."]);
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
      <BootLoader visible={loading} />
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
              <span className="text-muted-foreground text-xs hidden sm:inline">{VERSION} ·</span>
              <div className="hidden sm:flex items-center gap-2 ml-1">
                {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                  <button
                    key={id}
                    onClick={(e) => { e.stopPropagation(); setTheme(id); }}
                    title={THEMES[id].label}
                    className="flex items-center gap-1 text-xs transition-colors px-1"
                    style={{ color: theme === id ? THEMES[id].dot : "var(--muted-foreground)" }}
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
          </div>

          <nav className="hidden sm:flex gap-1">
            {(["home", "about", "projects", "skills", "blog", "contact"] as Section[]).map((s) => (
              <motion.button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(s);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", bounce: 0, duration: 0.15 }}
                className={`px-2 py-1 text-xs transition-colors ${section === s
                  ? "text-primary border border-primary bg-secondary"
                  : "text-muted-foreground hover:text-primary border border-transparent"
                  }`}
              >
                {s}
              </motion.button>
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
              <motion.button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(s);
                  setMobileNavOpen(false);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", bounce: 0, duration: 0.15 }}
                className={`px-3 py-1.5 text-xs transition-colors ${section === s
                  ? "text-primary border border-primary bg-secondary"
                  : "text-muted-foreground hover:text-primary border border-transparent"
                  }`}
              >
                {s}
              </motion.button>
            ))}
            <div className="flex items-center gap-2 px-1 pt-2 border-t border-border mt-1 w-full">
              <span className="text-muted-foreground text-xs">theme:</span>
              {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                <button
                  key={id}
                  onClick={(e) => { e.stopPropagation(); setTheme(id); }}
                  title={THEMES[id].label}
                  className="flex items-center gap-1 text-xs transition-colors px-1"
                  style={{ color: theme === id ? THEMES[id].dot : "var(--muted-foreground)" }}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: THEMES[id].dot, opacity: theme === id ? 1 : 0.35 }}
                  />
                  <span>{THEMES[id].label}</span>
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Terminal body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 sm:pb-20">
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
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          >
            {section === "home" && <HomeSection />}
            {section === "about" && <AboutSection />}
            {section === "projects" && (
              <ProjectsSection
                openProject={openProject}
                setOpenProject={handleOpenProject}
              />
            )}
            {section === "skills" && <SkillsSection />}
            {section === "blog" &&
              (post ? (
                <BlogPostView post={post} onBack={() => handleOpenPost(null)} />
              ) : (
                <BlogListSection onOpen={handleOpenPost} />
              ))}
            {section === "contact" && <ContactSection />}
          </motion.div>
        </AnimatePresence>

        {/* Inline log — appears below section content, above the input */}
        <InlineLog lines={inlineLog} path={currentPath} />

        <div ref={bottomRef} />
      </main>

      <div
        className="fixed left-0 right-0 z-40 border-t border-border px-3 sm:px-4 py-2"
        style={{
          bottom: "calc(28px + env(safe-area-inset-bottom))",
          background: "var(--background)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <div className="max-w-5xl mx-auto relative" ref={inputWrapRef}>
          <AnimatePresence>
            {paletteOpen && filteredCmds.length > 0 && (
              <SlashPalette
                query={paletteQuery}
                activeIdx={paletteIdx}
                onSelect={selectPaletteItem}
                onHover={setPaletteIdx}
                reducedMotion={reducedMotion}
              />
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2">
            <Prompt path={currentPath} />
            <input
              ref={inputRef}
              value={cmdInput}
              onChange={(e) => {
                setCmdInput(e.target.value);
                setHistoryIdx(-1);
              }}
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

      <TerminalSnakeModal isOpen={snakeOpen} onClose={() => setSnakeOpen(false)} />
      <StatusBar section={section} theme={theme} />
      <SpeedInsights />
      <Analytics />
    </div>
  );
}
