/// <reference types="vite/client" />
import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { marked } from "marked";
import { SpotifyWidget } from "./components/SpotifyWidget";
import { TerminalSnakeModal } from "./components/TerminalSnakeModal";
import { MatrixRainBackground } from "./components/MatrixRainBackground";
import { keyboardSound } from "./utils/sound";
import { triggerHaptic } from "./utils/haptics";
import { trackCommand, trackEasterEgg, trackEvent } from "./utils/analytics";
import { executeTerminalCommand, getTabCompletion, buildVFS } from "./utils/terminalEngine";
import { buildBlogFolders, listablePosts, slugify, type BlogFolder, type SeriesManifestEntry } from "./utils/blogSeries";

// ── Types ────────────────────────────────────────────────────────────────────

type Section = "home" | "about" | "projects" | "skills" | "blog" | "contact";

type ThemeId = "phosphor" | "ice" | "synthwave" | "c64" | "gruvbox";

const THEMES: Record<ThemeId, { label: string; dot: string; vars: Record<string, string> }> = {
  phosphor: {
    label: "phosphor",
    dot: "#00ff41",
    vars: {
      "--background": "#0a0f0a", "--foreground": "#d1d5db", "--card": "#0d1a0d",
      "--card-foreground": "#d1d5db", "--primary": "#00ff41", "--primary-foreground": "#0a0f0a",
      "--secondary": "#0f2010", "--secondary-foreground": "#00cc33",
      "--muted": "#0f1a0f", "--muted-foreground": "#9ca3af",
      "--accent": "#00cc33", "--border": "rgba(0,255,65,0.15)", "--ring": "rgba(0,255,65,0.4)", "--radius": "0rem",
      "--status-done": "#00ff41", "--status-progress": "#ffcc00", "--status-planned": "#9ca3af",
    },
  },
  ice: {
    label: "ice",
    dot: "#00d4ff",
    vars: {
      "--background": "#000d0f", "--foreground": "#d1d5db", "--card": "#001a20",
      "--card-foreground": "#d1d5db", "--primary": "#00d4ff", "--primary-foreground": "#000d0f",
      "--secondary": "#002030", "--secondary-foreground": "#00aacc",
      "--muted": "#001520", "--muted-foreground": "#9ca3af",
      "--accent": "#00aacc", "--border": "rgba(0,212,255,0.15)", "--ring": "rgba(0,212,255,0.4)", "--radius": "0rem",
      "--status-done": "#00d4ff", "--status-progress": "#ffcc00", "--status-planned": "#9ca3af",
    },
  },
  synthwave: {
    label: "synthwave",
    dot: "#ff2a8d",
    vars: {
      "--background": "#0d021a", "--foreground": "#d1d5db", "--card": "#180530",
      "--card-foreground": "#d1d5db", "--primary": "#ff2a8d", "--primary-foreground": "#0d021a",
      "--secondary": "#240845", "--secondary-foreground": "#01cdfe",
      "--muted": "#140326", "--muted-foreground": "#9ca3af",
      "--accent": "#01cdfe", "--border": "rgba(255,42,141,0.2)", "--ring": "rgba(255,42,141,0.4)", "--radius": "0rem",
      "--status-done": "#ff2a8d", "--status-progress": "#ffcc00", "--status-planned": "#9ca3af",
    },
  },
  c64: {
    label: "c64",
    dot: "#a5a5ff",
    vars: {
      "--background": "#0d0b1a", "--foreground": "#d1d5db", "--card": "#16132b",
      "--card-foreground": "#d1d5db", "--primary": "#a5a5ff", "--primary-foreground": "#0d0b1a",
      "--secondary": "#211c40", "--secondary-foreground": "#d0d0ff",
      "--muted": "#131024", "--muted-foreground": "#9ca3af",
      "--accent": "#7c70db", "--border": "rgba(165,165,255,0.2)", "--ring": "rgba(165,165,255,0.4)", "--radius": "0rem",
      "--status-done": "#a5a5ff", "--status-progress": "#ffcc00", "--status-planned": "#9ca3af",
    },
  },
  gruvbox: {
    label: "gruvbox",
    dot: "#fabd2f",
    vars: {
      "--background": "#141617", "--foreground": "#ebdbb2", "--card": "#1d2021",
      "--card-foreground": "#ebdbb2", "--primary": "#fabd2f", "--primary-foreground": "#141617",
      "--secondary": "#282828", "--secondary-foreground": "#b8bb26",
      "--muted": "#1a1c1d", "--muted-foreground": "#a89984",
      "--accent": "#8ec07c", "--border": "rgba(250,189,47,0.18)", "--ring": "rgba(250,189,47,0.4)", "--radius": "0rem",
      "--status-done": "#b8bb26", "--status-progress": "#fabd2f", "--status-planned": "#a89984",
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
  body: string;
  /** Folder / super-blog this post belongs to, e.g. "Ever Fundamentals". */
  series?: string;
  /** Lesson position inside that folder (1, 2, 3 …). */
  seriesOrder?: number;
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
  "../content/blog/**/*.md",
  { eager: true, query: "?raw", import: "default" }
);

/**
 * A sub-directory of src/content/blog/ IS a series:
 *   ../content/blog/ml-fundamentals/post.md  ->  series "ml-fundamentals"
 * Files sitting directly in blog/ are individual posts.
 */
function seriesFromPath(filepath: string): string | null {
  const parts = filepath.split("/");
  const file = parts.pop() ?? "";
  if (!file.endsWith(".md")) return null;
  const blogIdx = parts.lastIndexOf("blog");
  if (blogIdx === -1) return null;
  const subDirs = parts.slice(blogIdx + 1);
  return subDirs.length > 0 ? subDirs[0] : null;
}

/**
 * Blog dates must be ISO (YYYY-MM-DD) for the newest-first ordering to hold.
 * Anything unparseable is coerced to "" so the post sinks to the bottom of the
 * list instead of jumping to the top of it.
 */
function normalizeBlogDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    console.warn(`[blog] unparseable date "${trimmed}" — sorting as oldest`);
    return "";
  }
  console.warn(`[blog] non-ISO date "${trimmed}" — normalizing to YYYY-MM-DD`);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

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
          const key = line.slice(0, colon).trim().replace(/^["']|["']$/g, "");
          const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
          fm[key] = val;
        }
      });
  }
  const body = fenceEnd !== -1 ? raw.slice(fenceEnd + 5).trim() : raw.trim();
  const wordCount = body.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
  const readTime = `${Math.max(1, Math.ceil(wordCount / 200))} min`;

  // The folder on disk wins; `series:` in frontmatter is only a fallback for
  // posts that stay at the top level of src/content/blog/.
  const pathSeries = seriesFromPath(filepath);
  const frontmatterSeries = fm.series?.trim() || undefined;
  if (
    import.meta.env.DEV &&
    pathSeries &&
    frontmatterSeries &&
    slugify(pathSeries) !== slugify(frontmatterSeries)
  ) {
    console.warn(
      `[blog] ${id} lives in "${pathSeries}/" but its frontmatter says series: ` +
        `"${frontmatterSeries}" — the folder wins.`
    );
  }

  return {
    id,
    title: fm.title ?? id,
    date: normalizeBlogDate(fm.date ?? ""),
    tags: fm.tags ? fm.tags.split(",").map((t) => t.trim()) : [],
    readTime,
    excerpt: fm.excerpt ?? "",
    body,
    series: pathSeries ?? frontmatterSeries,
    seriesOrder: fm.order ? Number.parseInt(fm.order, 10) : undefined,
  };
}

// ── Data ─────────────────────────────────────────────────────────────────────

const BLOG_POSTS: BlogPost[] = Object.entries(mdModules)
  .filter(([path]) => !path.includes("template") && !path.split("/").pop()?.startsWith("_"))
  .map(([path, raw]) => parseBlogPost(raw, path))
  .sort((a, b) => b.date.localeCompare(a.date));

if (import.meta.env.DEV) {
  const seen = new Map<string, string>();
  BLOG_POSTS.forEach((post) => {
    const prev = seen.get(post.id);
    if (prev) {
      console.warn(
        `[blog] duplicate post id "${post.id}" — "${prev}" and ` +
          `"${post.series ?? "blog"}/${post.id}". Post ids must be unique (they are the URL).`
      );
    }
    seen.set(post.id, post.series ?? "blog");
  });
}

// ── Blog folders ("super blogs") ─────────────────────────────────────────────
// Membership = `series:` frontmatter, display metadata = _series.json.
// The underscore prefix + .json extension keep the manifest out of the post list.
const seriesManifestModules = import.meta.glob<unknown>("../content/blog/*.json", {
  eager: true,
  import: "default",
});

const SERIES_ENTRIES: SeriesManifestEntry[] = Object.values(
  seriesManifestModules
).flatMap((value) =>
  Array.isArray(value)
    ? (value as SeriesManifestEntry[])
    : value && typeof value === "object"
      ? [value as SeriesManifestEntry]
      : []
);

const FOLDERS: BlogFolder<BlogPost>[] = buildBlogFolders(BLOG_POSTS, SERIES_ENTRIES);

// Individual posts on the main blog page: members of a `hideMembers` folder
// live only inside that folder.
const LIST_POSTS: BlogPost[] = listablePosts(BLOG_POSTS, FOLDERS);

if (import.meta.env.DEV) {
  FOLDERS.forEach((folder) => {
    if (BLOG_POSTS.some((post) => post.id === folder.slug)) {
      console.warn(
        `[blog] folder slug "${folder.slug}" collides with a post id — the post wins that URL`
      );
    }
  });

  // A manifest entry that matches no post's `series:` is silently ignored —
  // this is the classic "I renamed the folder but the description disappeared".
  const folderSlugs = new Set(FOLDERS.map((folder) => folder.slug));
  SERIES_ENTRIES.forEach((entry) => {
    const key = entry.slug?.trim()
      ? slugify(entry.slug)
      : slugify(entry.name ?? "");
    if (key && !folderSlugs.has(key)) {
      console.warn(
        `[blog] _series.json entry "${entry.name}" matches no post's series: — its description/order are ignored. ` +
          `Posts declare: ${[...folderSlugs].join(", ") || "(none)"}. ` +
          `Fix the post frontmatter, or add "slug": "<folder-slug>" to the entry.`
      );
    }
  });
}

/**
 * Maps /blog/... onto view state. Post ids win over folder slugs on a
 * collision so existing share links never break.
 */
function resolveBlogTarget(
  segments: string[],
  tagParam: string | null
): { post: string | null; folder: string | null; tag: string | null } {
  const key = segments[1];
  if (!key) return { post: null, folder: null, tag: tagParam };
  if (BLOG_POSTS.some((post) => post.id === key)) {
    return { post: key, folder: null, tag: tagParam };
  }
  if (FOLDERS.some((folder) => folder.slug === key)) {
    // Folder URLs carry no filter — tags belong to the list.
    return { post: null, folder: key, tag: null };
  }
  return { post: null, folder: null, tag: null };
}

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
          const key = line.slice(0, colon).trim().replace(/^["']|["']$/g, "");
          const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
          fm[key] = val;
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

const PROJECTS: Project[] = Object.entries(projectMdModules)
  .filter(([path]) => !path.includes("template") && !path.split("/").pop()?.startsWith("_"))
  .map(([, raw]) => parseProject(raw))
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


// ── Commands (Slash Palette) ──────────────────────────────────────────────────

/**
 * Reads the URL once, at module load, so a deep link renders the right view on
 * the very first paint instead of mounting "home" and swapping into place.
 */
function readInitialLocation(): {
  section: Section;
  post: string | null;
  folder: string | null;
  project: string | null;
  tag: string | null;
} {
  const path = window.location.pathname.replace(/^\//, "");
  const segments = path.split("/");
  const maybeSection = segments[0] as Section;
  const validSections: Section[] = ["home", "about", "projects", "skills", "blog", "contact"];
  const tag = new URLSearchParams(window.location.search).get("tag");

  if (!path || path === "/") {
    return { section: "home", post: null, folder: null, project: null, tag: null };
  }
  if (maybeSection === "blog") {
    const target = resolveBlogTarget(segments, tag);
    return {
      section: "blog",
      post: target.post,
      folder: target.folder,
      project: null,
      tag: target.tag,
    };
  }
  if (maybeSection === "projects" && segments[1]) {
    return { section: "projects", post: null, folder: null, project: segments[1], tag: null };
  }
  if (validSections.includes(maybeSection)) {
    return { section: maybeSection, post: null, folder: null, project: null, tag: null };
  }
  return { section: "home", post: null, folder: null, project: null, tag: null };
}

const INITIAL_LOCATION = readInitialLocation();

const COMMANDS: Record<string, { desc: string; action?: string }> = {
  help: { desc: "show available commands" },
  whoami: { desc: "about me", action: "home" },
  about: { desc: "background & education", action: "about" },
  projects: { desc: "featured projects & systems", action: "projects" },
  skills: { desc: "languages & tools", action: "skills" },
  blog: { desc: "writing & posts", action: "blog" },
  contact: { desc: "get in touch", action: "contact" },
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
      <span className="text-primary">{user}</span>
      <span className="text-muted-foreground">@</span>
      <span className="text-accent">portfolio</span>
      <span className="text-muted-foreground">:</span>
      <span className="text-blue-400">{path}</span>
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
    triggerHaptic("success");
    const url = `${window.location.origin}/blog/${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleShare}
      className={`text-xs px-2 py-0.5 border transition-colors shrink-0 flex items-center gap-1.5 ${
        copied
          ? "border-primary text-primary"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary"
      }`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {copied ? (
        <>
          <span>✓</span> copied
        </>
      ) : (
        <>
          <span>🔗</span> share
        </>
      )}
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
      <span className="text-muted-foreground flex items-center">
        <SpotifyWidget />
      </span>
      <span className="text-muted-foreground flex items-center">
        <span className="text-primary">[{section}]</span> &nbsp;{fmt}
      </span>
    </div>
  );
}

// ── Slash Palette ─────────────────────────────────────────────────────────────

interface SlashPaletteProps {
  commands: [string, { desc: string; action?: string }][];
  activeIdx: number;
  onSelect: (cmd: string) => void;
  onHover: (idx: number) => void;
  reducedMotion: boolean;
}

function SlashPalette({ commands, activeIdx, onSelect, onHover, reducedMotion }: SlashPaletteProps) {
  if (commands.length === 0) return null;

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

      {commands.map(([cmd, { desc }], i) => {
        const isActive = i === activeIdx;
        return (
          <motion.button
            key={cmd}
            initial={reducedMotion ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.2, delay: reducedMotion ? 0 : i * 0.028 }}
            className={`w-full flex items-center gap-4 px-3 py-2 text-left transition-colors border-l-2 ${isActive ? "bg-primary/10 border-primary" : "border-transparent"}`}
            onMouseEnter={() => onHover(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(cmd);
            }}
          >
            <span
              className={`text-sm w-24 shrink-0 font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}
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

interface WeatherCardData {
  location: string;
  morning: { cond: string; temp: string; wind: string };
  noon: { cond: string; temp: string; wind: string };
  evening: { cond: string; temp: string; wind: string };
}

function WeatherCard({ data }: { data: WeatherCardData }) {
  return (
    <div className="my-2 max-w-md border border-border bg-card/40 text-xs font-mono">
      <div className="px-3 py-1.5 border-b border-border text-muted-foreground flex items-center justify-between">
        <span>
          Weather report: <span className="text-primary font-bold">{data.location}</span>
        </span>
        <span className="text-[10px] text-primary/80">● LIVE</span>
      </div>
      <div className="grid grid-cols-3 text-center divide-x divide-border">
        {/* Morning */}
        <div className="py-2 px-2 space-y-1">
          <div className="text-muted-foreground text-[11px] pb-1 border-b border-border/40 font-semibold">Morning</div>
          <div className="text-primary text-sm font-semibold pt-0.5">{data.morning.cond}</div>
          <div className="text-foreground font-bold">{data.morning.temp}</div>
          <div className="text-muted-foreground text-[11px]">{data.morning.wind}</div>
        </div>
        {/* Noon */}
        <div className="py-2 px-2 space-y-1">
          <div className="text-muted-foreground text-[11px] pb-1 border-b border-border/40 font-semibold">Noon</div>
          <div className="text-primary text-sm font-semibold pt-0.5">{data.noon.cond}</div>
          <div className="text-foreground font-bold">{data.noon.temp}</div>
          <div className="text-muted-foreground text-[11px]">{data.noon.wind}</div>
        </div>
        {/* Evening */}
        <div className="py-2 px-2 space-y-1">
          <div className="text-muted-foreground text-[11px] pb-1 border-b border-border/40 font-semibold">Evening</div>
          <div className="text-primary text-sm font-semibold pt-0.5">{data.evening.cond}</div>
          <div className="text-foreground font-bold">{data.evening.temp}</div>
          <div className="text-muted-foreground text-[11px]">{data.evening.wind}</div>
        </div>
      </div>
    </div>
  );
}

function InlineLog({ lines, path }: { lines: string[]; path: string }) {
  if (lines.length === 0) return null;
  return (
    <div
      className="mt-6 space-y-1 text-sm border-t border-border pt-4 overflow-x-auto"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {lines.map((line, i) => {
        const isPrompt = line.startsWith(">");
        const isWeatherJson = line.startsWith("__WEATHER_JSON__:");
        const isSuccess = line.includes("✓");
        const isError = line.includes("bash:") || line.includes("cannot access") || line.includes("No such file") || line.includes("Not a directory");
        const isTreeOrList = line.includes("├──") || line.includes("└──") || line.includes("drwxr-xr-x") || line.includes("-rw-r--r--");

        if (isWeatherJson) {
          try {
            const data: WeatherCardData = JSON.parse(line.replace("__WEATHER_JSON__:", ""));
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.2, delay: 0.05 }}
              >
                <WeatherCard data={data} />
              </motion.div>
            );
          } catch {
            return null;
          }
        }

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
          >
            {isPrompt ? (
              <div className="text-primary font-semibold">
                <Prompt path={path} />
                {line.slice(2)}
              </div>
            ) : (
              <div
                className={`pl-2 whitespace-pre font-mono leading-relaxed ${
                  isSuccess
                    ? "text-primary"
                    : isError
                    ? "text-red-400 opacity-90"
                    : isTreeOrList
                    ? "text-foreground opacity-85"
                    : "text-muted-foreground"
                }`}
              >
                {line}
              </div>
            )}
          </motion.div>
        );
      })}
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
        <div className="text-base sm:text-lg mb-3 text-accent">
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
              { label: "github.com/PiUnknown", icon: "⌥", url: "https://github.com/PiUnknown", type: "github" },
              { label: "linkedin/omkumarjha043", icon: "⌘", url: "https://linkedin.com/in/omkumarjha043", type: "linkedin" },
              { label: "reachomjha@gmail.com", icon: "✉", url: "mailto:reachomjha@gmail.com", type: "email" },
              { label: "resume.pdf", icon: "↓", url: "/resume.pdf", type: "resume" },
            ].map((link) => (
              <motion.a
                key={link.label}
                href={link.url}
                target={link.url.startsWith("mailto") || link.url.startsWith("/") ? undefined : "_blank"}
                rel="noreferrer"
                onClick={() => {
                  triggerHaptic("light");
                  if (link.type === "resume") {
                    trackEvent("resume_download_clicked");
                  } else {
                    trackEvent("quick_link_clicked", { link: link.label, url: link.url });
                  }
                }}
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
              <span className="text-accent">Transformers, attention & model training</span>
            </div>
            <div>
              <span className="text-muted-foreground">open for &nbsp; ::</span>{" "}
              <span className="text-accent">Remote Internships</span>
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
          Currently: Building <a href="https://gnosis.piunknown.dev/" target="_blank" rel="noreferrer" className="text-primary hover:underline">Gnosis</a><br />
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
            role: "Data Science Intern",
            company: "Indian Navy (WESEE)",
            period: "Jul 2025 – Sep 2025",
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
      <div className="text-xs text-blue-400">{p.lang}</div>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3 mb-4">
          <span
            className="text-2xl font-bold"
            style={{ fontFamily: "'VT323', monospace", color: "var(--primary)", letterSpacing: "0.03em" }}
          >
            {project.name}
          </span>
          <div className="flex items-center flex-wrap gap-3">
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs px-2 py-0.5 border border-border hover:border-primary hover:text-primary transition-colors text-muted-foreground"
            >
              ↗ github
            </a>
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs px-2 py-0.5 border border-border hover:border-primary hover:text-primary transition-colors text-muted-foreground"
              >
                ↗ live link
              </a>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
              <span className="text-blue-400">{project.lang}</span>
              <span>★ {stars}</span>
            </div>
          </div>
        </div>

        <div
          className="prose-terminal text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: marked(project.body) as string }}
        />
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
          const color =
            status === "done"
              ? "var(--status-done, var(--primary))"
              : status === "progress"
                ? "var(--status-progress, #ffcc00)"
                : "var(--status-planned, var(--muted-foreground))";
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

// ── Blog: folder ("super blog") + shared list pieces ─────────────────────────

const FolderCard = forwardRef<
  HTMLButtonElement,
  {
    folder: BlogFolder<BlogPost>;
    onOpen?: (slug: string) => void;
  }
>(({ folder, onOpen }, ref) => {
  const latest = folder.posts.reduce(
    (acc, post) => (post.date > acc ? post.date : acc),
    ""
  );
  const tags = Array.from(new Set(folder.posts.flatMap((post) => post.tags)));

  // Same card as a post — only the meta line says "series" instead of a read time.
  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={() => onOpen?.(folder.slug)}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", bounce: 0, duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left border border-border p-3 sm:p-4 hover:border-primary hover:bg-secondary transition-colors group cursor-pointer block"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-primary group-hover:underline font-semibold text-sm leading-snug">
          {folder.name}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          series · {folder.posts.length} {folder.posts.length === 1 ? "post" : "posts"}
        </span>
      </div>
      <div className="text-xs text-muted-foreground mb-2">{latest}</div>
      <div className="text-xs text-muted-foreground mb-3">{folder.description}</div>
      <div className="flex gap-2 flex-wrap">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 text-xs rounded border transition-all text-blue-400 border-blue-400/30"
            title={`#${tag} — open the series to filter`}
          >
            #{tag}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-end mt-2">
        <ShareButton postId={folder.slug} />
      </div>
    </motion.button>
  );
});
FolderCard.displayName = "FolderCard";

const BlogPostCard = forwardRef<
  HTMLButtonElement,
  {
    post: BlogPost;
    selectedTag?: string | null;
    onOpen: (id: string) => void;
    /** Absent inside a super folder, where tags are display-only. */
    onSelectTag?: (tag: string | null) => void;
  }
>(({ post, selectedTag, onOpen, onSelectTag }, ref) => {
  return (
    <motion.button
      ref={ref}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", bounce: 0, duration: 0.2 }}
      onClick={() => onOpen(post.id)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left border border-border p-3 sm:p-4 hover:border-primary hover:bg-secondary transition-colors group cursor-pointer block"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-primary group-hover:underline font-semibold text-sm leading-snug">
          {post.title}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">{post.readTime}</span>
      </div>
      <div className="text-xs text-muted-foreground mb-2">{post.date}</div>
      <div className="text-xs text-muted-foreground mb-3">{post.excerpt}</div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 flex-wrap">
          {post.tags.map((tag) => {
            const isTagActive = selectedTag?.toLowerCase() === tag.toLowerCase();
            const filterable = typeof onSelectTag === "function";
            return (
              <span
                key={tag}
                onClick={
                  filterable
                    ? (e) => {
                        e.stopPropagation();
                        onSelectTag?.(isTagActive ? null : tag);
                      }
                    : undefined
                }
                className={`px-2 py-0.5 text-xs rounded border transition-all ${
                  filterable
                    ? "cursor-pointer hover:border-blue-400 hover:bg-blue-400/10"
                    : "cursor-default"
                } ${
                  isTagActive
                    ? "text-primary border-primary bg-primary/20 font-semibold"
                    : "text-blue-400 border-blue-400/30"
                }`}
                title={filterable ? `Filter by #${tag}` : `#${tag}`}
              >
                #{tag}
              </span>
            );
          })}
        </div>
        <ShareButton postId={post.id} />
      </div>
    </motion.button>
  );
});
BlogPostCard.displayName = "BlogPostCard";

function BlogTagRibbon({
  tags,
  total,
  matching,
  selectedTag,
  onSelectTag,
}: {
  tags: { name: string; count: number }[];
  total: number;
  matching: number;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}) {
  const COLLAPSED_COUNT = 10;
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const sorted = [...tags].sort((a, b) => b.count - a.count);
  const q = query.trim().toLowerCase();
  const visible = q
    ? sorted.filter((t) => t.name.toLowerCase().includes(q))
    : expanded
      ? sorted
      : sorted.slice(0, COLLAPSED_COUNT);
  const hiddenCount = sorted.length - COLLAPSED_COUNT;

  return (
    <div className="border border-border p-2.5 sm:p-3.5 bg-card/40 space-y-2 text-xs">
      <div className="flex items-center justify-between text-muted-foreground border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-primary font-semibold tracking-wider">TAG_FLAGS:</span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            (click flag to filter / click active to clear)
          </span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">
          matching: <span className="text-primary font-bold">{matching}</span>/{total}
        </span>
      </div>

      <div
        className="flex items-center gap-2 border border-border bg-background/60 px-2 py-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-primary font-mono whitespace-nowrap">filter:#</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="type to narrow flags…"
          className="flex-1 min-w-0 bg-transparent outline-none text-xs font-mono placeholder:text-muted-foreground/50"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-muted-foreground hover:text-primary font-mono cursor-pointer"
          >
            esc
          </button>
        )}
      </div>

      <div
        className={`flex flex-wrap gap-1.5 pt-1 items-center ${
          expanded || q ? "max-h-56 overflow-y-auto pr-1" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => onSelectTag(null)}
          className={`px-2 py-1 text-xs border transition-all cursor-pointer font-mono ${
            selectedTag === null
              ? "border-primary bg-primary text-primary-foreground font-bold"
              : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
          }`}
        >
          * ALL ({total})
        </button>
        {visible.map(({ name, count }) => {
          const isActive = selectedTag?.toLowerCase() === name.toLowerCase();
          return (
            <button
              key={name}
              type="button"
              onClick={() => onSelectTag(isActive ? null : name)}
              className={`px-2 py-1 text-xs border transition-all cursor-pointer flex items-center gap-1.5 font-mono ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground font-bold"
                  : "border-border text-muted-foreground hover:border-primary/60 hover:text-primary"
              }`}
            >
              <span>#{name}</span>
              <span className="opacity-60 text-[10px]">[{count}]</span>
            </button>
          );
        })}
        {!q && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="px-2 py-1 text-xs border border-dashed border-border text-muted-foreground hover:border-primary/60 hover:text-primary transition-all cursor-pointer font-mono"
          >
            {expanded ? "[- collapse]" : `[+${hiddenCount} more]`}
          </button>
        )}
      </div>
    </div>
  );
}

interface BlogListSectionProps {
  /** Directory cards ("super blogs") rendered above the post list. */
  folders?: BlogFolder<BlogPost>[];
  /** Posts to list, already in display order. */
  posts?: BlogPost[];
  /** Prompt path shown in front of every command in this view. */
  pathLabel?: string;
  /** Command rendered on the posts block header. */
  listCommand?: string;
  /** Extra block rendered above everything (series header card). */
  header?: React.ReactNode;
  /** Renders `cd .. # ← go back` when provided. */
  onBack?: () => void;
  /** Tag filtering is a list-only concern — super folders take no filter. */
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
  onOpen: (id: string) => void;
  onFolderOpen?: (slug: string) => void;
}

function BlogListSection({
  folders = FOLDERS,
  posts = LIST_POSTS,
  pathLabel = "~/blog",
  listCommand = "ls -t ./posts/",
  header,
  onBack,
  selectedTag,
  onSelectTag,
  onOpen,
  onFolderOpen,
}: BlogListSectionProps) {
  const filteredPosts = selectedTag
    ? posts.filter((post) =>
        post.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())
      )
    : posts;

  // Tag counts are scoped to whatever this list is showing.
  const ribbonTags = Array.from(new Set(posts.flatMap((post) => post.tags))).map(
    (tag) => ({
      name: tag,
      count: posts.filter((post) => post.tags.includes(tag)).length,
    })
  );

  return (
    <div className="space-y-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {header}

      {/* Block 1 — series / super blogs, i.e. directories only */}
      {folders.length > 0 && (
        <div className="space-y-3">
          <div className="text-muted-foreground text-sm">
            <Prompt path={pathLabel} />
            ls -d ./*/
          </div>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {folders.map((folder) => (
                <FolderCard key={folder.slug} folder={folder} onOpen={onFolderOpen} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Block 2 — individual posts, newest first (oldest at the bottom) */}
      <div className="space-y-3">
        <div className="text-muted-foreground text-sm flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Prompt path={pathLabel} />
            {selectedTag ? (
              <span>
                ls ./posts/ | grep <span className="text-primary font-bold">--tag="{selectedTag}"</span>
              </span>
            ) : (
              <span>{listCommand}</span>
            )}
          </div>
          {selectedTag && onSelectTag && (
            <button
              type="button"
              onClick={() => onSelectTag(null)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 border border-border px-2 py-0.5 hover:border-primary bg-card/50 cursor-pointer"
              title="Clear filter and show all posts"
            >
              <span>[esc] clear filter</span>
            </button>
          )}
        </div>

        {onSelectTag && (
          <BlogTagRibbon
            tags={ribbonTags}
            total={posts.length}
            matching={filteredPosts.length}
            selectedTag={selectedTag ?? null}
            onSelectTag={onSelectTag}
          />
        )}

        {filteredPosts.length === 0 ? (
          selectedTag ? (
            <div className="border border-dashed border-border p-6 text-center space-y-3 bg-card/20">
              <div className="text-sm text-muted-foreground font-mono">
                grep: ./posts/: No entries matching tag <span className="text-primary font-bold">"#{selectedTag}"</span>
              </div>
              <button
                type="button"
                onClick={() => onSelectTag?.(null)}
                className="px-3 py-1.5 text-xs border border-primary text-primary hover:bg-primary/10 transition-colors font-mono cursor-pointer"
              >
                [ reset filter: ls ./posts/ ]
              </button>
            </div>
          ) : (
            <div className="border border-dashed border-border p-6 text-center bg-card/20">
              <div className="text-sm text-muted-foreground font-mono">
                ls: no loose posts — everything is archived under{" "}
                <span className="text-primary font-bold">./series/</span>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredPosts.map((post) => (
                <BlogPostCard
                  key={post.id}
                  post={post}
                  selectedTag={selectedTag}
                  onOpen={onOpen}
                  onSelectTag={onSelectTag}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Prompt path="~/blog" />
          cd .. # ← go back
        </button>
      )}
    </div>
  );
}

function SeriesHeaderCard({ folder }: { folder: BlogFolder<BlogPost> }) {
  const latest = folder.posts.reduce(
    (acc, post) => (post.date > acc ? post.date : acc),
    ""
  );

  // Same header treatment as BlogPostView: VT323 title, meta + share, rule.
  return (
    <div className="border border-border p-3 sm:p-4 space-y-4">
      <div
        className="text-[1.6rem] font-medium leading-none tracking-wider text-primary"
        style={{ fontFamily: "'VT323', monospace" }}
      >
        {folder.name}
      </div>
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-3">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{folder.posts.length} {folder.posts.length === 1 ? "post" : "posts"}</span>
          {latest && <span>updated {latest}</span>}
        </div>
        <ShareButton postId={folder.slug} />
      </div>
      {folder.description && (
        <div className="text-sm text-muted-foreground">{folder.description}</div>
      )}
    </div>
  );
}

function BlogFolderSection({
  folder,
  onOpen,
  onBack,
}: {
  folder: BlogFolder<BlogPost>;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  // Same list, scoped to this folder: identical cards and header.
  // No tag filter here — that stays a list-only concern.
  return (
    <BlogListSection
      folders={[]}
      posts={folder.posts}
      pathLabel={`~/blog/${folder.slug}`}
      listCommand="ls ./posts/   # lesson order"
      header={<SeriesHeaderCard folder={folder} />}
      onBack={onBack}
      onOpen={onOpen}
    />
  );
}

function renderMarkdown(content: string): string {
  const renderer = new marked.Renderer();
  renderer.code = function ({ text, lang }) {
    const language = lang || "code";
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    const encoded = encodeURIComponent(text);
    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="font-mono text-xs uppercase tracking-wide opacity-80">${language}</span>
        <button class="copy-code-btn text-xs hover:text-primary transition-colors cursor-pointer select-none opacity-70 hover:opacity-100 p-0.5 flex items-center" data-code="${encoded}" type="button" title="Copy code">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
      </div>
      <pre><code>${escaped}</code></pre>
    </div>`;
  };
  return marked.parse(content, { renderer }) as string;
}

function BlogPostView({
  post,
  onBack,
  onSelectTag,
}: {
  post: BlogPost;
  onBack: () => void;
  onSelectTag?: (tag: string) => void;
}) {
  const handlePostClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const btn = (e.target as HTMLElement).closest(".copy-code-btn") as HTMLButtonElement | null;
    if (btn && btn.dataset.code) {
      e.stopPropagation();
      const code = decodeURIComponent(btn.dataset.code);
      navigator.clipboard.writeText(code).then(() => {
        const origContent = btn.innerHTML;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        btn.style.color = "var(--primary)";
        setTimeout(() => {
          btn.innerHTML = origContent;
          btn.style.color = "";
        }, 1500);
      }).catch(() => {});
    }
  };

  return (
    <div className="space-y-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="text-muted-foreground text-sm">
        <Prompt path="~/blog" />
        cat ./posts/{post.id}.md
      </div>

      <div className="border border-border p-3 sm:p-4 space-y-4" onClick={handlePostClick}>
        <div
          className="text-[1.6rem] font-medium leading-none tracking-wider text-primary"
          style={{ fontFamily: "'VT323', monospace" }}
        >
          {post.title}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-3">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{post.date}</span>
            <span>{post.readTime} read</span>
          </div>
          <ShareButton postId={post.id} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {post.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                if (onSelectTag) {
                  onSelectTag(tag);
                }
              }}
              className="px-2 py-0.5 text-xs rounded border text-blue-400 border-blue-400/30 hover:border-blue-400 hover:bg-blue-400/10 transition-colors cursor-pointer"
              title={`View posts tagged #${tag}`}
            >
              #{tag}
            </button>
          ))}
        </div>
        <div className="border-t border-border pt-4">
          <div
            className="prose-terminal text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
          />
        </div>
      </div>

      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5"
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

      <div className="space-y-2 pt-1">
        <div className="text-muted-foreground text-xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Prompt path="~/contact" />
            <span>cat ./channels.env</span>
          </div>
          <span className="text-[10px] text-muted-foreground/70 font-mono">[DIRECT_CHANNELS]</span>
        </div>

        <div className="border border-border bg-card/40 p-3 sm:p-4 text-xs font-mono space-y-2.5">
          {[
            {
              key: "email",
              val: "reachomjha@gmail.com",
              href: "mailto:reachomjha@gmail.com",
              badge: "PRIMARY",
            },
            {
              key: "github",
              val: "github.com/PiUnknown",
              href: "https://github.com/PiUnknown",
              badge: "CODE",
            },
            {
              key: "linkedin",
              val: "linkedin.com/in/omkumarjha043",
              href: "https://linkedin.com/in/omkumarjha043",
              badge: "NETWORK",
            },
          ].map(({ key, val, href, badge }) => (
            <div key={key} className="flex items-center justify-between flex-wrap gap-2 group">
              <div className="flex items-center gap-2">
                <span className="text-primary font-semibold w-16 sm:w-20 shrink-0">{key}</span>
                <span className="text-muted-foreground">::</span>
                <a
                  href={href}
                  target={href.startsWith("mailto") ? undefined : "_blank"}
                  rel="noreferrer"
                  onClick={() => {
                    triggerHaptic("light");
                    trackEvent("contact_link_clicked", { channel: key, url: href });
                  }}
                  className="text-foreground hover:text-primary hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>{val}</span>
                  {!href.startsWith("mailto") && (
                    <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">↗</span>
                  )}
                </a>
              </div>
              <span className="text-[10px] text-muted-foreground border border-border/60 px-1.5 py-0.5 rounded bg-background/50">
                {badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeId>("phosphor");
  const [section, setSection] = useState<Section>(INITIAL_LOCATION.section);
  const [openPost, setOpenPost] = useState<string | null>(INITIAL_LOCATION.post);
  const [openProject, setOpenProject] = useState<string | null>(INITIAL_LOCATION.project);
  const [openFolder, setOpenFolder] = useState<string | null>(INITIAL_LOCATION.folder);
  const [selectedBlogTag, setSelectedBlogTag] = useState<string | null>(INITIAL_LOCATION.tag);
  const [snakeOpen, setSnakeOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(() => keyboardSound.enabled);
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
  const logoClicksRef = useRef<{ count: number; timer: ReturnType<typeof setTimeout> | null }>({ count: 0, timer: null });

  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section, openPost, openProject, openFolder]);

  // Konami Code Secret Listener (↑ ↑ ↓ ↓ ← → ← → B A)
  useEffect(() => {
    const konamiCode = [
      "ArrowUp", "ArrowUp",
      "ArrowDown", "ArrowDown",
      "ArrowLeft", "ArrowRight",
      "ArrowLeft", "ArrowRight",
      "b", "a",
    ];
    let konamiIdx = 0;

    const handleKonami = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.tagName === "INPUT" && e.key.length === 1 && e.key !== "b" && e.key !== "a" && e.key !== "B" && e.key !== "A") {
        return;
      }

      if (e.key.toLowerCase() === konamiCode[konamiIdx].toLowerCase()) {
        konamiIdx++;
        if (konamiIdx === konamiCode.length) {
          setMatrixOpen(true);
          konamiIdx = 0;
        }
      } else {
        konamiIdx = e.key.toLowerCase() === konamiCode[0].toLowerCase() ? 1 : 0;
      }
    };

    window.addEventListener("keydown", handleKonami);
    return () => window.removeEventListener("keydown", handleKonami);
  }, []);

  useEffect(() => {
    const timer = new Promise((resolve) => setTimeout(resolve, 1500));
    Promise.all([document.fonts.ready, timer]).then(() => {
      setLoading(false);
    });
  }, []);

  // Deep links are handled by INITIAL_LOCATION above; this stays as a safety net
  // for anything that mutates history before React hydrates.
  useEffect(() => {
    const path = window.location.pathname.replace(/^\//, "");
    const segments = path.split("/");
    const maybeSection = segments[0] as Section;
    const validSections: Section[] = ["home", "about", "projects", "skills", "blog", "contact"];
    const urlParams = new URLSearchParams(window.location.search);
    const tagParam = urlParams.get("tag");

    if (!path || path === "/") {
      // already home, do nothing
    } else if (maybeSection === "blog") {
      setSection("blog");
      const target = resolveBlogTarget(segments, tagParam);
      setOpenPost(target.post);
      setOpenFolder(target.folder);
      if (target.tag) {
        setSelectedBlogTag(target.tag);
      }
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
      const urlParams = new URLSearchParams(window.location.search);
      const tagParam = urlParams.get("tag");

      if (!path || path === "/") {
        setSection("home");
        setOpenPost(null);
        setOpenProject(null);
        setOpenFolder(null);
        setSelectedBlogTag(null);
      } else if (maybeSection === "blog") {
        setSection("blog");
        const target = resolveBlogTarget(segments, tagParam);
        setOpenPost(target.post);
        setOpenFolder(target.folder);
        setSelectedBlogTag(target.tag);
      } else if (maybeSection === "projects" && segments[1]) {
        setSection("projects");
        setOpenPost(null);
        setOpenFolder(null);
        setOpenProject(segments[1]);
      } else if (validSections.includes(maybeSection)) {
        setSection(maybeSection);
        setOpenPost(null);
        setOpenFolder(null);
        setOpenProject(null);
        setSelectedBlogTag(null);
      }
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const handleSelectBlogTag = (tag: string | null) => {
    keyboardSound.playKey("t");
    triggerHaptic("selection");
    setSelectedBlogTag(tag);
    if (tag) {
      history.pushState(null, "", `/blog?tag=${encodeURIComponent(tag)}`);
    } else {
      history.pushState(null, "", "/blog");
    }
  };

  const handleOpenPost = (id: string | null) => {
    triggerHaptic("light");
    setOpenPost(id);
    if (id) {
      history.pushState(null, "", `/blog/${id}`);
    } else {
      // Leaving a post always lands on the list.
      setOpenFolder(null);
      if (selectedBlogTag) {
        history.pushState(null, "", `/blog?tag=${encodeURIComponent(selectedBlogTag)}`);
      } else {
        history.pushState(null, "", "/blog");
      }
    }
  };

  // Avoid stacking identical history entries when several handlers target /blog.
  const pushUrl = (url: string) => {
    if (window.location.pathname + window.location.search !== url) {
      history.pushState(null, "", url);
    }
  };

  const handleOpenFolder = (slug: string | null) => {
    triggerHaptic("light");
    keyboardSound.playNavClick();
    setOpenPost(null);
    setOpenFolder(slug);
    if (slug) {
      // A folder always opens on its full list, never on a leftover tag filter.
      setSelectedBlogTag(null);
      trackEvent("blog_folder_opened", { folder: slug });
      pushUrl(`/blog/${slug}`);
    } else if (selectedBlogTag) {
      pushUrl(`/blog?tag=${encodeURIComponent(selectedBlogTag)}`);
    } else {
      pushUrl("/blog");
    }
  };

  // Back out of a post: into its folder when it belongs to one, else the list.
  const handleBackFromPost = () => {
    const current = openPost ? BLOG_POSTS.find((post) => post.id === openPost) : null;
    const slug = current?.series ? slugify(current.series) : null;
    const target =
      slug && FOLDERS.some((folder) => folder.slug === slug) ? slug : null;

    if (target) {
      triggerHaptic("light");
      setOpenPost(null);
      setOpenFolder(target);
      pushUrl(`/blog/${target}`);
    } else {
      handleOpenPost(null);
    }
  };

  const handleOpenProject = (name: string | null) => {
    triggerHaptic("light");
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
      // Exclude command if it navigates to the current active section (unless in sub-view)
      if (v.action && v.action === section && !openProject && !openPost && !openFolder) return false;
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
    if (inlineLog.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [inlineLog]);

  const navigate = useCallback((s: Section) => {
    triggerHaptic("selection");
    setSection(s);
    setOpenPost(null);
    setOpenProject(null);
    // The blog nav entry always means "the list", never a folder you were in.
    setOpenFolder(null);
    if (s !== "blog") {
      setSelectedBlogTag(null);
    }
    setInlineLog([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.pushState(null, "", s === "home" ? "/" : `/${s}`);
  }, []);

  const currentPath =
    section === "home"
      ? "~"
      : section === "blog" && openFolder && !openPost
        ? `~/blog/${openFolder}`
        : `~/${section}`;

  async function execCommand(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const baseCmd = trimmed.replace(/^\//, "").split(/\s+/)[0].toLowerCase();
    trackCommand(baseCmd, raw.startsWith("/") ? "slash_palette" : "cli");

    setCmdHistory((h) => [trimmed, ...h]);
    setHistoryIdx(-1);
    setCmdInput("");
    setPaletteOpen(false);

    const result = await executeTerminalCommand(trimmed, {
      currentSection: section,
      currentPath,
      theme,
      sfxEnabled,
      projects: PROJECTS,
      blogPosts: BLOG_POSTS,
      blogFolders: FOLDERS,
      skills: SKILLS,
      history: cmdHistory,
      selectedTag: selectedBlogTag,
    });

    if (result.clearLog) {
      setInlineLog([]);
      return;
    }

    if (result.openSnake) {
      trackEasterEgg("snake_game", { trigger: trimmed });
      setSnakeOpen(true);
    }

    if (result.openMatrix) {
      trackEasterEgg("matrix_digital_rain", { trigger: trimmed });
      setMatrixOpen(true);
    }

    if (result.newTheme) {
      setTheme(result.newTheme);
      trackEvent("theme_changed", { theme: result.newTheme, source: "cli" });
    }

    if (result.toggleSfx !== undefined) {
      setSfxEnabled(result.toggleSfx);
      keyboardSound.setEnabled(result.toggleSfx);
    }

    if (result.downloadResume) {
      trackEvent("resume_download_clicked", { source: "cli" });
      const a = document.createElement("a");
      a.href = "/resume.pdf";
      a.download = "Om_Kumar_Jha_Resume.pdf";
      a.target = "_blank";
      a.click();
    }

    if (result.filterTag !== undefined) {
      // Tag filters are a list-level concern: drop out of any open folder.
      setSelectedBlogTag(result.filterTag);
      setOpenFolder(null);
      if (result.filterTag) {
        history.pushState(null, "", `/blog?tag=${encodeURIComponent(result.filterTag)}`);
      } else if (result.newSection === "blog" || section === "blog") {
        history.pushState(null, "", "/blog");
      }
    }

    if (result.newSection && result.newSection !== section) {
      navigate(result.newSection);
      if (result.openProject) {
        handleOpenProject(result.openProject);
      } else if (result.openPost) {
        handleOpenPost(result.openPost);
      } else if (result.openFolder !== undefined && result.filterTag === undefined) {
        handleOpenFolder(result.openFolder);
      }
      setInlineLog(result.output);
      return;
    }

    if (result.openProject) {
      handleOpenProject(result.openProject);
    } else if (result.openPost) {
      handleOpenPost(result.openPost);
    } else if (result.openFolder !== undefined && result.filterTag === undefined) {
      handleOpenFolder(result.openFolder);
    }

    if (result.output.length > 0) {
      setInlineLog((o) => [...o, ...result.output]);
    }
  }

  function selectPaletteItem(cmd: string) {
    execCommand(cmd);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    keyboardSound.playKey(e.key);
    triggerHaptic("light");
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
      if (e.key === "Tab") {
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
      } else if (e.key === "Tab") {
        e.preventDefault();
        const vfs = buildVFS(PROJECTS, BLOG_POSTS, SKILLS, FOLDERS);
        const allCliCommands = [
          "help", "whoami", "about", "projects", "skills", "blog", "contact",
          "game", "clear", "ls", "cd", "cat", "pwd", "tree", "open", "grep",
          "theme", "sfx", "neofetch", "weather", "date", "uptime", "history", "cowsay"
        ];
        const completion = getTabCompletion(cmdInput, currentPath, vfs, allCliCommands, BLOG_POSTS, FOLDERS);
        if (completion) {
          setCmdInput(completion);
        }
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
  const folder = openFolder ? FOLDERS.find((f) => f.slug === openFolder) ?? null : null;

  // Entering / leaving a folder animates like a section change; posts stay instant.
  const viewKey = section === "blog" && openFolder && !openPost
    ? `blog/${openFolder}`
    : section;

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
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic("light");
                navigate("home");
                logoClicksRef.current.count += 1;
                if (logoClicksRef.current.timer) clearTimeout(logoClicksRef.current.timer);
                if (logoClicksRef.current.count >= 5) {
                  trackEasterEgg("logo_clicks", { count: 5 });
                  setMatrixOpen(true);
                  logoClicksRef.current.count = 0;
                } else {
                  logoClicksRef.current.timer = setTimeout(() => {
                    logoClicksRef.current.count = 0;
                  }, 1500);
                }
              }}
              className="text-sm sm:text-base font-bold hover:opacity-80 transition-opacity flex items-center gap-1"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--primary)" }}
              title="~ localhost"
            >
              <span className="text-muted-foreground opacity-60">~</span>
              <span>localhost</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs hidden sm:inline">{VERSION} ·</span>
              <div className="hidden sm:flex items-center gap-2 ml-1">
                {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                  <button
                    key={id}
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic("medium");
                      setTheme(id);
                      trackEvent("theme_changed", { theme: id });
                    }}
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    const next = !sfxEnabled;
                    setSfxEnabled(next);
                    keyboardSound.setEnabled(next);
                    if (next) keyboardSound.playNavClick();
                  }}
                  title={sfxEnabled ? "Mute mechanical keyboard sounds" : "Enable mechanical keyboard sounds"}
                  className="flex items-center gap-1 text-xs transition-colors px-1.5 py-0.5 border border-border hover:border-primary ml-1"
                  style={{ color: sfxEnabled ? "var(--primary)" : "var(--muted-foreground)" }}
                >
                  <span className="text-[11px]">{sfxEnabled ? "⌨ 🔊" : "⌨ 🔇"}</span>
                </button>
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
          <div className="text-muted-foreground">
            localhost {VERSION} ({theme}) #1 SMP {new Date().toDateString()}
          </div>
          <div className="text-muted-foreground">
            Type <span className="text-primary">/</span> to open the command palette, or use the nav above.
          </div>
        </div>

        {/* Section content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewKey}
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
                <BlogPostView
                  post={post}
                  onBack={handleBackFromPost}
                  onSelectTag={(tag) => {
                    handleSelectBlogTag(tag);
                    handleOpenPost(null);
                  }}
                />
              ) : folder ? (
                <BlogFolderSection
                  folder={folder}
                  onOpen={handleOpenPost}
                  onBack={() => handleOpenFolder(null)}
                />
              ) : (
                <BlogListSection
                  selectedTag={selectedBlogTag}
                  onSelectTag={handleSelectBlogTag}
                  onOpen={handleOpenPost}
                  onFolderOpen={handleOpenFolder}
                />
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
                commands={filteredCmds}
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
      <MatrixRainBackground
        isActive={matrixOpen}
        themeDot={THEMES[theme]?.dot}
        onToggle={() => setMatrixOpen((m) => !m)}
      />
      <StatusBar section={section} theme={theme} />
      <SpeedInsights />
      <Analytics />
    </div>
  );
}
