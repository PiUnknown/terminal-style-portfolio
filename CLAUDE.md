# AARAV.SH — Terminal Portfolio · Engineering Brief

Cold-start reference for any AI coding assistant. Read this before touching any file.

## Project Identity

- **Owner:** Om Kumar Jha (PiUnknown / piunknown.dev)
- **Stack:** React 18 + TypeScript + Vite + Tailwind CSS v4
- **Architecture:** Single-file SPA — all logic lives in `src/app/App.tsx`
- **Version constant:** `VERSION` in `App.tsx` — change once, syncs header + boot line

---

## File Map

src/ app/App.tsx ← ENTIRE application (components, state, data, commands) styles/ fonts.css ← Google Fonts imports only (JetBrains Mono + VT323) theme.css ← CSS custom property tokens (DO NOT rename tokens) index.css ← Tailwind base + imports theme.css + fonts.css index.html ← preconnect tags for Google Fonts CLAUDE.md ← this file


No routing library. No external state manager. No component library.

---

## Design Language

### Aesthetic
CRT phosphor terminal. Every visual decision references this: sharp corners everywhere
(radius: 0), monospace fonts only, scanline overlay, green-on-black ground.

### Fonts
- **VT323** — display only (name headings, section titles, logo)
- **JetBrains Mono** — everything else (body, labels, inputs, code)
- Never use sans-serif. The entire UI is monospace.
- Font set on root div via `style={{ fontFamily: "'JetBrains Mono', monospace" }}`
- VT323 overridden inline per element

### Color System — 4 Runtime Themes
Themes override CSS custom properties on the root div via `style={{ ...THEMES[theme].vars }}`.
All Tailwind semantic classes pick up new values automatically.

| ThemeId    | Label            | Primary   | Background | Feel          |
|------------|------------------|-----------|------------|---------------|
| `phosphor` | phosphor edition | #00ff41   | #0a0f0a    | Green P31 CRT |
| `amber`    | amber edition    | #ffb000   | #0f0900    | IBM 3278      |
| `ice`      | ice edition      | #00d4ff   | #000d0f    | Cyan phosphor |
| `ghost`    | ghost edition    | #cccccc   | #0a0a0a    | White P4      |

**Rule:** Use Tailwind semantic classes (`bg-background`, `text-primary`, `border-border`)
everywhere. Never hardcode hex values in JSX except inside the `THEMES` constant itself.

### Token Contract (never rename — Tailwind classes depend on these)
`--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`,
`--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`,
`--muted-foreground`, `--accent`, `--border`, `--ring`, `--radius`

### Visual Rules
- `--radius: 0rem` — no border-radius anywhere
- Borders: `border-border` (rgba primary at ~15% opacity) — hairline only
- Active/hover: `border-primary bg-secondary`
- No drop shadows (exception: palette floater uses subtle box-shadow)
- Scanline overlay: `<ScanlineOverlay />` — fixed, z-50, pointer-events-none, pure CSS gradient

---

## Component Architecture (all in App.tsx)

| Component         | Role                                                                 |
|-------------------|----------------------------------------------------------------------|
| `Cursor`          | Blinking block — only inside typewriter animations                   |
| `Prompt`          | Renders `visitor@portfolio:~/path$` with colored segments            |
| `ScanlineOverlay` | Fixed full-screen CRT scanline effect                                |
| `StatusBar`       | Fixed bottom bar: mode indicator + current section + clock           |
| `SlashPalette`    | Floating command autocomplete above input, triggered by `/` prefix   |
| `InlineLog`       | Renders echoed command output lines below section content            |
| `useTypewriter`   | Hook: animates text char-by-char; returns `{ displayed, done }`     |

### Section Components

| Section                          | Pattern                                                   |
|----------------------------------|-----------------------------------------------------------|
| `HomeSection`                    | Chained typewriter animations → quick-links grid          |
| `AboutSection`                   | Work experience (bullets, sorted by status) + education   |
| `ProjectsSection`                | List → detail view. Sorted: wip → research → active → archived |
| `SkillsSection`                  | Skills display + AI roadmap ✓/◐/○ sorted by completion   |
| `BlogListSection` / `BlogPostView` | Card list → detail view                                 |
| `ContactSection`                 | Web3Forms POST. stopPropagation on form tag               |

---

## State Architecture (App component)

```ts
section: Section              // current page
openPost: string | null       // blog post id (null = list view)
openProject: string | null    // project name (null = list view)
cmdInput: string              // command input field value
cmdHistory: string[]          // arrow-up history buffer
historyIdx: number            // current history navigation index
inlineLog: string[]           // lines echoed below section content
paletteOpen: boolean          // slash palette visibility
paletteIdx: number            // palette keyboard selection index
theme: ThemeId                // active color theme
mobileNavOpen: boolean        // mobile hamburger menu open state
Navigation — always use navigate(), never setSection()
const navigate = useCallback((s: Section) => {
  setSection(s);
  setOpenPost(null);
  setOpenProject(null);
  setInlineLog([]);
  window.scrollTo({ top: 0, behavior: "smooth" });
}, []);
Scroll behavior
bottomRef.scrollIntoView depends only on [inlineLog] — NOT [section]
Removing section from deps prevents page jumping to bottom on every navigation
Command System
Palette trigger
Type / in the bottom input → isPaletteMode = cmdInput.startsWith("/") Query = cmdInput.slice(1) → filters COMMANDS by key prefix or desc substring. Keyboard: ↑/↓ to navigate, Tab/Enter to select, Escape to close.

COMMANDS object shape
const COMMANDS: Record<string, { desc: string; action?: Section }> = {
  help, whoami, about, projects, skills, blog, contact, clear, ls, ...
}
execCommand flow
Strip leading /, trim, lowercase
Push to cmdHistory
clear → empty inlineLog
help, ls → append output lines to inlineLog
Match in COMMANDS → navigate(action) + echo confirmation to inlineLog
No match → append "command not found" to inlineLog
Data Structures
Project
interface Project {
  name: string;
  lang: string;
  desc: string;
  status: "wip" | "research" | "active" | "archived";
  url: string;        // GitHub link
  hostedUrl: string;  // live demo URL, "" if none
  stack: string[];
  architecture: string;
}
// Sort order: { wip: 0, research: 1, active: 2, archived: 3 }
BlogPost
interface BlogPost {
  id: string;
  title: string;
  date: string;       // YYYY-MM-DD
  tags: string[];
  readTime: string;   // e.g. "5 min"
  excerpt: string;
  content: string[];  // paragraphs. Lines starting with "Run:" render as <code>
}
AI Roadmap item
{ label: string; status: "done" | "progress" | "planned" }
// Icons: done=✓ (#00ff41), progress=◐ (#ffcc00), planned=○ (#3a7a3a)
// Sorted: done → progress → planned
Work Experience entry
{ role: string; org: string; period: string; bullets: string[]; status: "done" | "current" | "upcoming" }
// Sorted: current → done → upcoming
Layout Rules
Max content width: max-w-5xl centered with mx-auto
Main padding: px-3 sm:px-4 py-4 sm:py-6 pb-32 sm:pb-28
Cards: border border-border p-3 sm:p-4
Section spacing: space-y-5 or space-y-6
Fixed elements (z-index stack)
Element	Position	z-index
Header	sticky top-0	30
SlashPalette	absolute above input	50
StatusBar	fixed bottom-0	40
ScanlineOverlay	fixed inset-0	50
Mobile Layout
Header: desktop nav is hidden sm:flex, hamburger button is sm:hidden
Mobile nav: dropdown below header using mobileNavOpen state; closes on item select
Home heading: text-2xl sm:text-4xl
Contact form labels: stack above inputs on mobile (flex-col sm:flex-row)
StatusBar: INSERT label hidden on mobile (hidden sm:inline)
StatusBar: paddingBottom: "env(safe-area-inset-bottom)" for notched devices
Contact Form
Uses Web3Forms (https://web3forms.com). Access key in handleSubmit fetch body as access_key. Form has onClick={e => e.stopPropagation()} — prevents root div click handler from stealing focus from inputs.

Known Gotchas / Fixed Bugs
Bug	Fix
Double / in path prompt	section === "home" ? "~" : \~/${section}``
Contact form loses focus on click	onClick={e => e.stopPropagation()} on <form> tag
Page scrolls to bottom on nav	Remove section from bottomRef useEffect deps
whoami box not full width	Use <div className="flex-1 h-px bg-border" /> instead of ASCII dashes
Theme label stale in boot line	Use THEMES[theme].label not a hardcoded string
Version mismatch header vs boot	Single VERSION constant used in both places
What NOT to do
Do not add border-radius — design is intentionally sharp (radius: 0)
Do not use sans-serif fonts anywhere
Do not hardcode color hex values in JSX (use CSS token classes or THEMES entries)
Do not rename CSS token variables in theme.css — Tailwind classes break
Do not call setSection() directly — always use navigate()
Do not add lorem ipsum — use realistic placeholder content
Do not add new npm packages without checking if lucide-react / Radix / recharts covers it
Do not add a CSS reset (Tailwind already resets in @layer base)
Do not add comments describing WHAT code does — only WHY when non-obvious
