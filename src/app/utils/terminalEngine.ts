import { buildBlogFolders, slugify, type BlogFolder, type SeriesAwarePost } from "./blogSeries";

export type Section = "home" | "about" | "projects" | "skills" | "blog" | "contact";

export type ThemeId = "phosphor" | "ice" | "synthwave" | "c64" | "gruvbox";

export interface BlogPost {
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

export interface Project {
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

export interface VFSFile {
  type: "file";
  name: string;
  size: number;
  date: string;
  content: string;
  actionType?: "project" | "blog" | "resume" | "link";
  actionTarget?: string;
}

export interface VFSDirectory {
  type: "dir";
  name: string;
  date: string;
  children: Record<string, VFSNode>;
  section?: Section;
}

export type VFSNode = VFSFile | VFSDirectory;

export interface TerminalContext {
  currentSection: Section;
  currentPath: string; // e.g. "~", "~/projects", "~/blog", "~/skills", "~/about", "~/contact"
  theme: ThemeId;
  sfxEnabled: boolean;
  projects: Project[];
  blogPosts: BlogPost[];
  /** Series folders as the UI sees them (falls back to deriving from posts). */
  blogFolders?: BlogFolder[];
  skills: Record<string, string[]>;
  history: string[];
  selectedTag?: string | null;
}

export interface CommandResult {
  output: string[];
  newSection?: Section;
  newPath?: string;
  openProject?: string | null;
  openPost?: string | null;
  /** Folder slug to open, null to return to the blog list, undefined = untouched. */
  openFolder?: string | null;
  filterTag?: string | null;
  newTheme?: ThemeId;
  toggleSfx?: boolean;
  openSnake?: boolean;
  openMatrix?: boolean;
  clearLog?: boolean;
  downloadResume?: boolean;
}

export const THEME_LABELS: Record<ThemeId, string> = {
  phosphor: "phosphor edition",
  ice: "ice edition",
  synthwave: "synthwave edition",
  c64: "c64 edition",
  gruvbox: "gruvbox edition",
};

/**
 * Builds the in-memory Virtual File System (VFS) dynamically
 */
export function buildVFS(
  projects: Project[],
  blogPosts: BlogPost[],
  skills: Record<string, string[]>,
  blogFolders?: BlogFolder[]
): VFSDirectory {
  const root: VFSDirectory = {
    type: "dir",
    name: "~",
    date: "Sep 17 21:00",
    children: {},
  };

  // 1. Files in Root
  root.children["about.txt"] = {
    type: "file",
    name: "about.txt",
    size: 1420,
    date: "Sep 17 21:00",
    content: [
      "============================================================",
      "OM KUMAR JHA — Bio & Background",
      "============================================================",
      "3rd Year CS Undergrad @ GGSIPU (Delhi, India)",
      "Focus: Machine Learning, Agentic LLM Pipelines, Systems",
      "",
      "Summary:",
      "I learn by building, breaking, and rebuilding systems capable",
      "of harnessing intelligence. I design agentic LLM pipelines,",
      "train & fine-tune models, and build resource-constrained tools.",
      "",
      "Currently: Building Gnosis (AI Crypto/Market Intelligence)",
      "Previously: Data Science Intern @ Indian Navy (WESEE)",
      "            HPAIR 2025 Tokyo delegate",
      "",
      "Interests: Transformers, Attention Mechanisms, Local RAG,",
      "           Fitness (5x/week), Diet Coke, Writing.",
      "============================================================",
    ].join("\n"),
  };

  root.children["status.txt"] = {
    type: "file",
    name: "status.txt",
    size: 380,
    date: "Sep 17 21:00",
    content: [
      "STATUS REPORT: 2026",
      "----------------------------------------",
      "Education:  B.Tech IT @ GGSIPU (3rd Year)",
      "Learning:   Transformers, attention & model training",
      "Open For:   Remote Internships & Collabs",
      "Location:   Delhi, IN",
      "----------------------------------------",
    ].join("\n"),
  };

  root.children["contact.sh"] = {
    type: "file",
    name: "contact.sh",
    size: 512,
    date: "Sep 17 21:00",
    content: [
      "#!/bin/bash",
      "# Om's Contact Channels",
      "EMAIL=\"reachomjha@gmail.com\"",
      "GITHUB=\"https://github.com/PiUnknown\"",
      "LINKEDIN=\"https://linkedin.com/in/omkumarjha043\"",
      "",
      "echo \"Run 'cd contact' or './send-message.sh' to send a message via form!\"",
    ].join("\n"),
  };

  root.children["resume.pdf"] = {
    type: "file",
    name: "resume.pdf",
    size: 24576,
    date: "Sep 17 21:00",
    content: "[Binary PDF File] Run 'open resume.pdf' or 'cat resume.pdf' to download/view.",
    actionType: "resume",
  };

  root.children["game.bin"] = {
    type: "file",
    name: "game.bin",
    size: 16384,
    date: "Sep 17 21:00",
    content: "[Executable] CRT Retro Snake Mini-Game. Type 'snake' or './game.bin' to play!",
  };

  // 2. Directory: projects/
  const reposDir: VFSDirectory = {
    type: "dir",
    name: "repos",
    date: "Sep 17 21:00",
    section: "projects",
    children: {},
  };

  const projectsDir: VFSDirectory = {
    type: "dir",
    name: "projects",
    date: "Sep 17 21:00",
    section: "projects",
    children: {
      "README.txt": {
        type: "file",
        name: "README.txt",
        size: 580,
        date: "Sep 17 21:00",
        content: [
          "# FEATURED PROJECTS",
          "Type 'cat <project-name>.md' to inspect details and stack.",
          "Type 'open <project-name>' to navigate to full project view.",
          "-------------------------------------------------------------",
        ].join("\n"),
      },
      "repos": reposDir,
    },
  };

  projects.forEach((proj) => {
    const slug = proj.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `${slug}.md`;
    const projFile: VFSFile = {
      type: "file",
      name: filename,
      size: proj.body?.length || 1024,
      date: "Sep 17 21:00",
      actionType: "project",
      actionTarget: proj.name,
      content: [
        `# ${proj.name}`,
        `Language/Stack: ${proj.lang}`,
        `Status: ${proj.status.toUpperCase()}`,
        `Repository: ${proj.url}`,
        proj.liveUrl ? `Live URL: ${proj.liveUrl}` : "",
        `Description: ${proj.desc}`,
        "--------------------------------------------------",
        proj.body ? proj.body : "(No extra notes)",
      ]
        .filter(Boolean)
        .join("\n"),
    };
    projectsDir.children[filename] = projFile;
    reposDir.children[filename] = projFile;
  });
  root.children["projects"] = projectsDir;
  root.children["repos"] = reposDir;

  // 3. Directory: blog/
  const postsDir: VFSDirectory = {
    type: "dir",
    name: "posts",
    date: "Sep 17 21:00",
    section: "blog",
    children: {},
  };

  const blogDir: VFSDirectory = {
    type: "dir",
    name: "blog",
    date: "Sep 17 21:00",
    section: "blog",
    children: {
      "INDEX.txt": {
        type: "file",
        name: "INDEX.txt",
        size: 420,
        date: "Sep 17 21:00",
        content: [
          "# ARTICLES & NOTES",
          "Type 'cat <post-id>.md' to read an article inline.",
          "Type 'open <post-id>' to open in reader view.",
          "Series folders: ls -d ./*/  then  cd <folder>/",
          "--------------------------------------------------",
        ].join("\n"),
      },
      "posts": postsDir,
    },
  };

  const folders = blogFolders ?? buildBlogFolders(blogPosts);
  const memberIds = new Set<string>();
  folders.forEach((folder) =>
    folder.posts.forEach((post) => memberIds.add(post.id))
  );

  const makePostFile = (post: SeriesAwarePost): VFSFile => {
    const filename = `${post.id}.md`;
    return {
      type: "file",
      name: filename,
      size: post.body?.length || 2048,
      date: post.date || "Sep 17 21:00",
      actionType: "blog",
      actionTarget: post.id,
      content: [
        `# ${post.title}`,
        `Date: ${post.date} | Read Time: ${post.readTime}`,
        `Tags: ${(post.tags || []).join(", ")}`,
        "--------------------------------------------------",
        post.excerpt,
        "",
        post.body || "",
      ].join("\n\n"),
    };
  };

  // Individual posts sit at blog/ and posts/ — series members do not, they
  // only live inside their folder, exactly like the blog page renders them.
  blogPosts.forEach((post) => {
    if (memberIds.has(post.id)) return;
    const postFile = makePostFile(post);
    blogDir.children[`${post.id}.md`] = postFile;
    postsDir.children[`${post.id}.md`] = postFile;
  });

  folders.forEach((folder) => {
    const dir: VFSDirectory = {
      type: "dir",
      name: folder.slug,
      date: folder.posts[0]?.date || "Sep 17 21:00",
      section: "blog",
      children: {},
    };
    folder.posts.forEach((post) => {
      dir.children[`${post.id}.md`] = makePostFile(post);
    });
    blogDir.children[folder.slug] = dir;
  });

  root.children["blog"] = blogDir;
  root.children["posts"] = postsDir;

  // 4. Directory: skills/
  const skillsDir: VFSDirectory = {
    type: "dir",
    name: "skills",
    date: "Sep 17 21:00",
    section: "skills",
    children: {},
  };

  Object.entries(skills).forEach(([category, items]) => {
    const filename = `${category}.txt`;
    skillsDir.children[filename] = {
      type: "file",
      name: filename,
      size: items.join(", ").length * 4,
      date: "Sep 17 21:00",
      content: [
        `[SKILLS :: ${category.toUpperCase()}]`,
        "----------------------------------------",
        ...items.map((item) => `  * ${item}`),
        "----------------------------------------",
      ].join("\n"),
    };
  });
  root.children["skills"] = skillsDir;

  // 5. Directory: about/
  root.children["about"] = {
    type: "dir",
    name: "about",
    date: "Sep 17 21:00",
    section: "about",
    children: {
      "bio.txt": root.children["about.txt"] as VFSFile,
      "experience.txt": {
        type: "file",
        name: "experience.txt",
        size: 960,
        date: "Sep 17 21:00",
        content: [
          "# WORK EXPERIENCE",
          "--------------------------------------------------",
          "Role:    Data Science Intern",
          "Company: Indian Navy (WESEE)",
          "Period:  Jul 2025 – Sep 2025",
          "Points:",
          "  • Contributed to Trident Netra: naval AI surveillance for geospatial intelligence.",
          "  • Built satellite imagery classification pipelines.",
          "  • Showcased at India AI Impact Summit 2026.",
          "--------------------------------------------------",
        ].join("\n"),
      },
    },
  };

  // 6. Directory: contact/
  root.children["contact"] = {
    type: "dir",
    name: "contact",
    date: "Sep 17 21:00",
    section: "contact",
    children: {
      "channels.env": {
        type: "file",
        name: "channels.env",
        size: 320,
        date: "Sep 17 21:00",
        content: [
          "EMAIL=\"reachomjha@gmail.com\"",
          "GITHUB=\"https://github.com/PiUnknown\"",
          "LINKEDIN=\"https://linkedin.com/in/omkumarjha043\"",
        ].join("\n"),
      },
      "info.txt": {
        type: "file",
        name: "info.txt",
        size: 320,
        date: "Sep 17 21:00",
        content: [
          "EMAIL:    reachomjha@gmail.com",
          "GITHUB:   https://github.com/PiUnknown",
          "LINKEDIN: https://linkedin.com/in/omkumarjha043",
        ].join("\n"),
      },
    },
  };

  return root;
}

/**
 * Resolves a path (e.g. "projects", "../about", "~/blog/welcome.md") in the VFS
 */
export function resolvePath(
  vfs: VFSDirectory,
  currentPath: string,
  targetPath: string
): { node: VFSNode | null; absPath: string; parent: VFSDirectory | null } {
  const normCurrent = currentPath === "~" || currentPath === "/" ? [] : currentPath.replace(/^~\/?/, "").split("/").filter(Boolean);
  
  let targetSegments: string[];
  if (targetPath.startsWith("~") || targetPath.startsWith("/")) {
    targetSegments = targetPath.replace(/^(\~|\/)\/?/, "").split("/").filter(Boolean);
  } else {
    targetSegments = [...normCurrent, ...targetPath.split("/").filter(Boolean)];
  }

  // Handle . and ..
  const resolvedSegments: string[] = [];
  for (const seg of targetSegments) {
    if (seg === ".") continue;
    if (seg === "..") {
      resolvedSegments.pop();
    } else {
      resolvedSegments.push(seg);
    }
  }

  if (resolvedSegments.length === 0) {
    return { node: vfs, absPath: "~", parent: null };
  }

  let curr: VFSNode = vfs;
  let parent: VFSDirectory | null = null;
  for (const seg of resolvedSegments) {
    if (curr.type !== "dir") {
      return { node: null, absPath: "~/" + resolvedSegments.join("/"), parent };
    }
    parent = curr;
    const currentDir: VFSDirectory = curr;
    if (!currentDir.children[seg]) {
      // Case-insensitive lookup fallback
      const matchKey = Object.keys(currentDir.children).find(
        (k) => k.toLowerCase() === seg.toLowerCase()
      );
      if (matchKey && currentDir.children[matchKey]) {
        curr = currentDir.children[matchKey];
      } else {
        return { node: null, absPath: "~/" + resolvedSegments.join("/"), parent };
      }
    } else {
      curr = currentDir.children[seg];
    }
  }

  return {
    node: curr,
    absPath: "~/" + resolvedSegments.join("/"),
    parent,
  };
}

/**
 * Autocomplete helper for tab key
 */
export function getTabCompletion(
  input: string,
  currentPath: string,
  vfs: VFSDirectory,
  allCommands: string[],
  blogPosts?: BlogPost[],
  blogFolders?: BlogFolder[]
): string | null {
  const trimmed = input.trimStart();
  const parts = trimmed.split(/\s+/);

  // Autocomplete command name
  if (parts.length === 1 && !trimmed.includes(" ")) {
    const q = parts[0].toLowerCase();
    const matches = allCommands.filter((c) => c.toLowerCase().startsWith(q));
    if (matches.length === 1) {
      return matches[0] + " ";
    }
    return null;
  }

  // Autocomplete blog / grep tag arguments
  if (blogPosts && blogPosts.length > 0) {
    const cmd = parts[0].toLowerCase();
    if (cmd === "blog" || cmd === "grep") {
      // `blog -f <series>` completes folder slugs
      const seriesFlagIdx = parts.findIndex((p) => p === "-f" || p === "--series");
      if (cmd === "blog" && seriesFlagIdx !== -1 && parts.length > seriesFlagIdx + 1) {
        const folders = blogFolders ?? buildBlogFolders(blogPosts);
        const needle = parts[parts.length - 1].toLowerCase().replace(/\/$/, "");
        const matched = folders.filter((folder) => folder.slug.startsWith(needle));
        if (matched.length === 1) {
          return `${parts.slice(0, -1).join(" ")} ${matched[0].slug} `;
        }
        return null;
      }

      const allTags = Array.from(new Set(blogPosts.flatMap((p) => p.tags)));
      const lastPart = parts[parts.length - 1];
      const cleanTarget = lastPart.replace(/^(--tag=|-t|--tag|#)/, "").toLowerCase();

      const matched = allTags.filter((t) => t.toLowerCase().startsWith(cleanTarget));
      if (matched.length === 1) {
        const prefix = parts.slice(0, -1).join(" ");
        if (lastPart.startsWith("--tag=")) {
          return `${prefix ? prefix + " " : ""}--tag=${matched[0]} `;
        }
        return `${prefix ? prefix + " " : ""}${matched[0]} `;
      }
    }
  }

  // Autocomplete file or directory path argument (for cd, cat, open, ls, etc.)
  const target = parts[parts.length - 1];

  const { node: currDirNode } = resolvePath(vfs, currentPath, "");
  if (!currDirNode || currDirNode.type !== "dir") return null;

  const entries = Object.keys(currDirNode.children);
  const matches = entries.filter((e) => e.toLowerCase().startsWith(target.toLowerCase()));

  if (matches.length === 1) {
    const match = matches[0];
    const isDir = currDirNode.children[match].type === "dir";
    const prefix = parts.slice(0, -1).join(" ") + " ";
    return prefix + match + (isDir ? "/" : "");
  }

  return null;
}

/**
 * Master command executor
 */
export async function executeTerminalCommand(
  rawInput: string,
  ctx: TerminalContext
): Promise<CommandResult> {
  const raw = rawInput.trim();
  if (!raw) return { output: [] };

  // Strip leading slash if any
  const cleanCmd = raw.replace(/^\//, "").trim();
  const tokens = cleanCmd.split(/\s+/);
  const command = tokens[0].toLowerCase();
  const args = tokens.slice(1);

  const vfs = buildVFS(ctx.projects, ctx.blogPosts, ctx.skills);

  // ── 0. Pipe Support (e.g. ls ./posts/ | grep --tag="ai") ──
  if (cleanCmd.includes("|")) {
    const pipeParts = cleanCmd.split("|").map((s) => s.trim()).filter(Boolean);
    if (pipeParts.length >= 2) {
      const leftCmd = pipeParts[0];
      const rightCmd = pipeParts[1];

      // Execute left command
      const leftResult = await executeTerminalCommand(leftCmd, ctx);

      // Parse right command (e.g. grep ...)
      const rightTokens = rightCmd.split(/\s+/);
      const rightBase = rightTokens[0].toLowerCase();
      const rightArgs = rightTokens.slice(1);

      if (rightBase === "grep") {
        let pattern = "";
        let filterTag: string | null = null;

        const tagFlagIdx = rightArgs.findIndex((a) => a === "-t" || a === "--tag");
        if (tagFlagIdx !== -1 && rightArgs[tagFlagIdx + 1]) {
          pattern = rightArgs[tagFlagIdx + 1].replace(/^["']|["']$/g, "").replace(/^#/, "");
          filterTag = pattern;
        } else {
          const inlineTagArg = rightArgs.find((a) => a.startsWith("--tag="));
          if (inlineTagArg) {
            pattern = inlineTagArg.split("=")[1]?.replace(/^["']|["']$/g, "").replace(/^#/, "") || "";
            filterTag = pattern;
          } else if (rightArgs.length > 0) {
            pattern = rightArgs[0].replace(/^["']|["']$/g, "").replace(/^#/, "");
            filterTag = pattern;
          }
        }

        const allTags = Array.from(new Set(ctx.blogPosts.flatMap((p) => p.tags)));
        const matchedTag = filterTag ? allTags.find((t) => t.toLowerCase() === filterTag!.toLowerCase()) || null : null;

        if (matchedTag) {
          const matchingPosts = ctx.blogPosts.filter((p) =>
            p.tags.map((t) => t.toLowerCase()).includes(matchedTag.toLowerCase())
          );
          const postLines = matchingPosts.map(
            (p) => `  * ./posts/${p.id}.md — "${p.title}" [${(p.tags || []).map((t) => "#" + t).join(" ")}]`
          );
          return {
            output: [
              `> ${raw}`,
              `  grep: filtered by tag #${matchedTag} (${matchingPosts.length} ${matchingPosts.length === 1 ? "match" : "matches"}):`,
              ...postLines,
            ],
            newSection: "blog",
            newPath: "~/blog",
            filterTag: matchedTag,
            openPost: null,
            openProject: null,
            openFolder: null,
          };
        }

        const rawLines = leftResult.output.slice(1);
        const filteredLines = rawLines.filter((line) => {
          if (!pattern) return true;
          return line.toLowerCase().includes(pattern.toLowerCase());
        });

        return {
          output: [
            `> ${raw}`,
            ...(filteredLines.length > 0 ? filteredLines : [`  grep: pattern '${pattern}' not found in output.`]),
          ],
          filterTag: null,
          newSection: leftResult.newSection,
          newPath: leftResult.newPath,
        };
      }
    }
  }

  // ── 1. Clear ──
  if (command === "clear" || command === "cls") {
    return { output: [], clearLog: true };
  }

  // ── 2. Help ──
  if (command === "help" || command === "man") {
    return {
      output: [
        `> ${raw}`,
        "  OM.DEV TERMINAL CLI — AVAILABLE COMMANDS",
        "  ================================================================",
        "  FILESYSTEM & NAVIGATION:",
        "    ls [-l|-la] [dir]    List directory contents & files",
        "    cd <dir|..|~>        Change current section / directory",
        "    pwd                  Print current working directory",
        "    cat <file>           Read and display file contents inline",
        "    tree                 Display ASCII visual tree of portfolio files",
        "    open <project|series|post>  Open a project, series folder or article",
        "    grep [-t] <tag>      Filter blog posts by tag",
        "",
        "  SECTIONS & SHORTCUTS:",
        "    home | about | projects | skills | contact",
        "    blog [--tag <tag>]   Navigate to blog or filter by tag (e.g. blog -t ai)",
        "    blog -f <series>     Open a series folder (e.g. blog -f ever-fundamentals)",
        "",
        "  SYSTEM & UTILITIES:",
        "    theme [name]         List or change theme (phosphor, ice, synthwave, c64, gruvbox)",
        "    sfx [on|off]         Toggle mechanical keyboard click sound effects",
        "    whoami               Display current user & portfolio identity",
        "    uname [-a]           Display virtual system & kernel info",
        "    neofetch             Show retro ASCII system spec card",
        "    uptime               Display system load and uptime",
        "    date                 Show current date & time",
        "    history              List previously executed commands",
        "    clear                Clear the terminal log",
        "",
        "  MINI-GAMES & EASTER EGGS:",
        "    snake | game         Launch retro CRT Snake mini-game",
        "    matrix | neo         Toggle Matrix digital rain background",
        "    cowsay <text>        Make the ASCII cow speak",
        "    weather              Fetch live ASCII weather forecast (curl wttr.in)",
        "    sudo <cmd>           Execute command as superuser",
        "  ================================================================",
        "  Tip: Use TAB for auto-completion. Use ↑ and ↓ for history.",
      ],
    };
  }

  // ── 3. LS / DIR ──
  if (command === "ls" || command === "dir") {
    const isLong = args.includes("-l") || args.includes("-la") || args.includes("-al") || args.includes("-lh");
    const targetArg = args.find((a) => !a.startsWith("-")) || "";
    
    const { node, absPath } = resolvePath(vfs, ctx.currentPath, targetArg);
    if (!node) {
      return {
        output: [
          `> ${raw}`,
          `  ls: cannot access '${targetArg}': No such file or directory`,
        ],
      };
    }

    if (node.type === "file") {
      return {
        output: [
          `> ${raw}`,
          isLong ? `  -rw-r--r--  1 visitor guest ${String(node.size).padStart(6, " ")}B  ${node.date}  ${node.name}` : `  ${node.name}`,
        ],
      };
    }

    const entries = Object.values(node.children);
    if (isLong) {
      const lines = [
        `> ${raw}`,
        `  total ${entries.length * 4}K (in ${absPath})`,
        ...entries.map((item) => {
          const perm = item.type === "dir" ? "drwxr-xr-x" : (item.name.endsWith(".sh") || item.name.endsWith(".bin") ? "-rwxr-xr-x" : "-rw-r--r--");
          const sizeStr = `${item.type === "dir" ? 4096 : item.size}`.padStart(6, " ");
          const nameStr = item.type === "dir" ? `${item.name}/` : item.name;
          return `  ${perm}  1 visitor guest  ${sizeStr}  ${item.date}  ${nameStr}`;
        }),
      ];
      return { output: lines };
    }

    // Grid format
    const formatted = entries
      .map((item) => (item.type === "dir" ? `${item.name}/` : item.name))
      .join("    ");

    return {
      output: [
        `> ${raw}`,
        `  ${formatted}`,
      ],
    };
  }

  // ── 4. CD ──
  if (command === "cd") {
    const target = args[0] || "~";
    
    if (target === "~" || target === "/" || target === "") {
      return {
        output: [`> ${raw}`],
        newSection: "home",
        newPath: "~",
        openPost: null,
        openProject: null,
      };
    }

    const { node, absPath } = resolvePath(vfs, ctx.currentPath, target);

    if (!node) {
      return {
        output: [`> ${raw}`, `  bash: cd: ${target}: No such file or directory`],
      };
    }

    if (node.type === "file") {
      return {
        output: [`> ${raw}`, `  bash: cd: ${target}: Not a directory`],
      };
    }

    // Determine associated section if any
    const segs = absPath.replace(/^~\/?/, "").split("/").filter(Boolean);
    const topSection = segs[0] as Section;
    const validSections: Section[] = ["home", "about", "projects", "skills", "blog", "contact"];
    const newSection = validSections.includes(topSection) ? topSection : "home";

    // cd into (or out of) a series folder tracks the folder view.
    const openFolder =
      segs[0] === "blog" && segs.length === 2
        ? (ctx.blogFolders ?? buildBlogFolders(ctx.blogPosts)).find(
            (folder) => folder.slug === segs[1]
          )?.slug ?? null
        : null;

    return {
      output: [`> ${raw}`],
      newSection,
      newPath: absPath,
      openPost: null,
      openProject: null,
      openFolder,
    };
  }

  // ── 5. PWD ──
  if (command === "pwd") {
    const virtualPath = ctx.currentPath === "~" ? "/home/visitor" : ctx.currentPath.replace(/^~/, "/home/visitor");
    return {
      output: [`> ${raw}`, `  ${virtualPath}`],
    };
  }

  // ── 6. CAT / MORE / LESS / HEAD / TAIL ──
  if (["cat", "more", "less", "head", "tail"].includes(command)) {
    if (args.length === 0) {
      return {
        output: [`> ${raw}`, `  usage: ${command} <filename>`],
      };
    }

    const target = args[0];
    const { node } = resolvePath(vfs, ctx.currentPath, target);

    if (!node) {
      return {
        output: [`> ${raw}`, `  ${command}: ${target}: No such file or directory`],
      };
    }

    if (node.type === "dir") {
      return {
        output: [`> ${raw}`, `  ${command}: ${target}: Is a directory. Use 'cd ${target}' or 'ls ${target}'.`],
      };
    }

    const lines = node.content.split("\n").map((l) => `  ${l}`);
    
    // Check if reading resume
    const downloadResume = node.actionType === "resume" || target.includes("resume");

    return {
      output: [`> ${raw}`, ...lines],
      downloadResume,
    };
  }

  // ── 7. TREE ──
  if (command === "tree") {
    const seriesFolders = ctx.blogFolders ?? buildBlogFolders(ctx.blogPosts);
    const seriesMemberIds = new Set(
      seriesFolders.flatMap((f) => f.posts.map((p) => p.id))
    );
    const blogEntries = [
      ...seriesFolders.map((f) => `${f.slug}/`),
      ...ctx.blogPosts
        .filter((b) => !seriesMemberIds.has(b.id))
        .map((b) => `${b.id}.md`),
    ].slice(0, 8);

    const outputLines = [
      `> ${raw}`,
      "  .",
      "  ├── about.txt",
      "  ├── status.txt",
      "  ├── contact.sh",
      "  ├── resume.pdf",
      "  ├── game.bin",
      "  ├── projects/",
      "  │   ├── README.txt",
      ...ctx.projects.slice(0, 8).map((p, idx, arr) => {
        const isLast = idx === arr.length - 1;
        const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return `  │   ${isLast ? "└──" : "├──"} ${slug}.md`;
      }),
      "  ├── blog/",
      "  │   ├── INDEX.txt",
      ...blogEntries.map(
        (name, idx, arr) =>
          `  │   ${idx === arr.length - 1 ? "└──" : "├──"} ${name}`
      ),
      "  ├── skills/",
      "  │   ├── languages.txt",
      "  │   ├── ml_ai.txt",
      "  │   ├── llm_stack.txt",
      "  │   └── tools.txt",
      "  └── contact/",
      "      └── info.txt",
      "",
      `  ${Object.keys(rootDirs(vfs)).length} directories, ${countFiles(vfs)} files`,
    ];

    return { output: outputLines };
  }

  // ── 8. OPEN / VIEW ──
  if (command === "open" || command === "view") {
    if (args.length === 0) {
      return { output: [`> ${raw}`, "  usage: open <project-name | blog-id | resume.pdf>"] };
    }
    const target = args.join(" ").toLowerCase();

    if (target.includes("resume")) {
      return { output: [`> ${raw}`, "  ✓ opening resume.pdf..."], downloadResume: true };
    }

    // Match project
    const matchedProject = ctx.projects.find(
      (p) =>
        p.name.toLowerCase() === target ||
        p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === target.replace(/\.md$/, "")
    );
    if (matchedProject) {
      return {
        output: [`> ${raw}`, `  ✓ navigating to project: ${matchedProject.name}`],
        newSection: "projects",
        newPath: "~/projects",
        openProject: matchedProject.name,
      };
    }

    // Match blog post
    const matchedPost = ctx.blogPosts.find(
      (p) => p.id.toLowerCase() === target.replace(/\.md$/, "") || p.title.toLowerCase() === target
    );
    if (matchedPost) {
      return {
        output: [`> ${raw}`, `  ✓ reading blog post: ${matchedPost.title}`],
        newSection: "blog",
        newPath: "~/blog",
        openPost: matchedPost.id,
      };
    }

    // Match a series folder ("super blog")
    const seriesFolders = ctx.blogFolders ?? buildBlogFolders(ctx.blogPosts);
    const cleanTarget = target.replace(/\/$/, "");
    const matchedFolder = seriesFolders.find(
      (folder) => folder.slug === cleanTarget || folder.name.toLowerCase() === cleanTarget
    );
    if (matchedFolder) {
      return {
        output: [
          `> ${raw}`,
          `  ✓ entering series: ${matchedFolder.name} (${matchedFolder.posts.length} ${matchedFolder.posts.length === 1 ? "post" : "posts"})`,
        ],
        newSection: "blog",
        newPath: `~/blog/${matchedFolder.slug}`,
        openPost: null,
        openProject: null,
        openFolder: matchedFolder.slug,
      };
    }

    return {
      output: [`> ${raw}`, `  open: item '${target}' not found. Check 'ls projects' or 'ls blog'.`],
    };
  }

  // ── 9. Direct Navigation Commands (home, about, projects, skills, blog, contact) ──
  const validSections: Section[] = ["home", "about", "projects", "skills", "blog", "contact"];
  if (validSections.includes(command as Section)) {
    const s = command as Section;

    if (s === "blog") {
      // blog -f <series> / blog --series <series> jumps straight into a folder
      const seriesFlagIdx = args.findIndex((a) => a === "-f" || a === "--series");
      const inlineSeries = args.find((a) => a.startsWith("--series="));
      const seriesArg =
        seriesFlagIdx !== -1 && args[seriesFlagIdx + 1]
          ? args[seriesFlagIdx + 1]
          : inlineSeries
            ? inlineSeries.split("=")[1] || null
            : null;

      if (seriesArg) {
        const folders = ctx.blogFolders ?? buildBlogFolders(ctx.blogPosts);
        const needle = seriesArg.toLowerCase().replace(/\/$/, "");
        const matched = folders.find(
          (folder) =>
            folder.slug === slugify(seriesArg) || folder.name.toLowerCase() === needle
        );
        if (matched) {
          return {
            output: [
              `> ${raw}`,
              `  ✓ entering series: ${matched.name} (${matched.posts.length} ${matched.posts.length === 1 ? "post" : "posts"})`,
            ],
            newSection: "blog",
            newPath: `~/blog/${matched.slug}`,
            openPost: null,
            openProject: null,
            openFolder: matched.slug,
          };
        }
        return {
          output: [
            `> ${raw}`,
            `  blog: series '${seriesArg}' not found. Available: ${folders.map((f) => f.slug).join(", ") || "(none)"}`,
          ],
          newSection: "blog",
          newPath: "~/blog",
          filterTag: null,
          openPost: null,
          openProject: null,
          openFolder: null,
        };
      }

      let filterTag: string | null = null;
      const tagFlagIdx = args.findIndex((a) => a === "-t" || a === "--tag");
      if (tagFlagIdx !== -1 && args[tagFlagIdx + 1]) {
        filterTag = args[tagFlagIdx + 1].replace(/^#/, "");
      } else {
        const inlineTagArg = args.find((a) => a.startsWith("--tag="));
        if (inlineTagArg) {
          filterTag = inlineTagArg.split("=")[1]?.replace(/^#/, "") || null;
        } else if (args.length > 0 && !args[0].startsWith("-")) {
          if (args[0].toLowerCase() === "all" || args[0].toLowerCase() === "clear" || args[0].toLowerCase() === "reset") {
            filterTag = null;
          } else {
            filterTag = args[0].replace(/^#/, "");
          }
        }
      }

      const allTags = Array.from(new Set(ctx.blogPosts.flatMap((p) => p.tags)));

      if (filterTag) {
        const matched = allTags.find((t) => t.toLowerCase() === filterTag!.toLowerCase());
        if (matched) {
          const matchCount = ctx.blogPosts.filter((p) =>
            p.tags.map((t) => t.toLowerCase()).includes(matched.toLowerCase())
          ).length;
          return {
            output: [
              `> ${raw}`,
              `  ✓ switched to blog (filter: #${matched} — ${matchCount} ${matchCount === 1 ? "post" : "posts"})`,
            ],
            newSection: "blog",
            newPath: "~/blog",
            filterTag: matched,
            openPost: null,
            openProject: null,
            openFolder: null,
          };
        } else {
          return {
            output: [
              `> ${raw}`,
              `  blog: tag '${filterTag}' not found. Available tags: ${allTags.map((t) => "#" + t).join(", ")}`,
            ],
            newSection: "blog",
            newPath: "~/blog",
            filterTag: null,
            openPost: null,
            openProject: null,
            openFolder: null,
          };
        }
      }

      return {
        output: [`> ${raw}`, `  ✓ switched to section: blog`],
        newSection: "blog",
        newPath: "~/blog",
        filterTag: null,
        openPost: null,
        openProject: null,
      };
    }

    return {
      output: [`> ${raw}`, `  ✓ switched to section: ${s}`],
      newSection: s,
      newPath: s === "home" ? "~" : `~/${s}`,
      openPost: null,
      openProject: null,
    };
  }

  // ── 9b. GREP Command (Tag filtering in blog) ──
  if (command === "grep") {
    if (args.length === 0) {
      return {
        output: [`> ${raw}`, `  usage: grep [-t|--tag] <tag_name>`],
      };
    }

    let searchTag: string | null = null;
    const tagIdx = args.findIndex((a) => a === "-t" || a === "--tag");
    if (tagIdx !== -1 && args[tagIdx + 1]) {
      searchTag = args[tagIdx + 1].replace(/^#/, "");
    } else {
      const inlineTagArg = args.find((a) => a.startsWith("--tag="));
      if (inlineTagArg) {
        searchTag = inlineTagArg.split("=")[1]?.replace(/^#/, "") || null;
      } else {
        searchTag = args[0].replace(/^#/, "");
      }
    }

    const allTags = Array.from(new Set(ctx.blogPosts.flatMap((p) => p.tags)));
    if (searchTag) {
      if (searchTag.toLowerCase() === "all" || searchTag.toLowerCase() === "clear" || searchTag.toLowerCase() === "reset") {
        return {
          output: [`> ${raw}`, `  grep: cleared tag filter, showing all ${ctx.blogPosts.length} posts.`],
          newSection: "blog",
          newPath: "~/blog",
          filterTag: null,
          openPost: null,
          openProject: null,
          openFolder: null,
        };
      }

      const matched = allTags.find((t) => t.toLowerCase() === searchTag!.toLowerCase());
      if (matched) {
        const matches = ctx.blogPosts.filter((p) =>
          p.tags.map((t) => t.toLowerCase()).includes(matched.toLowerCase())
        );
        return {
          output: [
            `> ${raw}`,
            `  grep: ${matches.length} matching ${matches.length === 1 ? "post" : "posts"} for tag #${matched}:`,
            ...matches.map((m) => `    * ./posts/${m.id}.md — "${m.title}" (${m.date})`),
          ],
          newSection: "blog",
          newPath: "~/blog",
          filterTag: matched,
          openPost: null,
          openProject: null,
        };
      } else {
        return {
          output: [
            `> ${raw}`,
            `  grep: no posts found for tag '#${searchTag}'. Available tags: ${allTags.map((t) => "#" + t).join(", ")}`,
          ],
        };
      }
    }
  }

  // ── 10. THEME ──
  if (command === "theme") {
    const validThemes: ThemeId[] = ["phosphor", "ice", "synthwave", "c64", "gruvbox"];
    const rawSelected = args[0]?.toLowerCase();

    if (!rawSelected || rawSelected === "list") {
      const list = validThemes
        .map((t) => (t === ctx.theme ? `* ${t} (active)` : `  ${t}`))
        .join("\n");
      return {
        output: [
          `> ${raw}`,
          "  AVAILABLE THEMES:",
          list,
          "  usage: theme <phosphor | ice | synthwave | c64 | gruvbox>",
        ],
      };
    }

    if (validThemes.includes(rawSelected as ThemeId)) {
      const themeId = rawSelected as ThemeId;
      return {
        output: [`> ${raw}`, `  ✓ theme changed to: ${themeId} (${THEME_LABELS[themeId]})`],
        newTheme: themeId,
      };
    }

    return {
      output: [
        `> ${raw}`,
        `  theme: unknown theme '${rawSelected}'. Choose from: ${validThemes.join(", ")}`,
      ],
    };
  }

  // ── 11. SFX / SOUND ──
  if (command === "sfx" || command === "sound" || command === "audio") {
    const state = args[0]?.toLowerCase();
    let nextSfx = !ctx.sfxEnabled;
    if (state === "on" || state === "1" || state === "enable") nextSfx = true;
    if (state === "off" || state === "0" || state === "disable") nextSfx = false;

    return {
      output: [
        `> ${raw}`,
        `  ✓ mechanical keyboard sound effects: ${nextSfx ? "ENABLED [🔊]" : "DISABLED [🔇]"}`,
      ],
      toggleSfx: nextSfx,
    };
  }

  // ── 12. WHOAMI & UNAME ──
  if (command === "whoami") {
    return {
      output: [
        `> ${raw}`,
        "  visitor@portfolio (uid=1000 gid=1000 groups=wheel,guest)",
        "  Host: Om Kumar Jha [piunknown.dev]",
        "  Role: AI Engineer / 3rd Year CS Undergrad @ GGSIPU",
      ],
    };
  }

  if (command === "uname") {
    return {
      output: [
        `> ${raw}`,
        args.includes("-a")
          ? "  Linux localhost 6.8.0-portfolio-x86_64 #1 SMP PREEMPT GNU/Linux"
          : "  Linux",
      ],
    };
  }

  // ── 13. NEOFETCH / FASTFETCH ──
  if (command === "neofetch" || command === "fastfetch") {
    return {
      output: [
        `> ${raw}`,
        "   _____       __  __           visitor@portfolio",
        "  / ___/____  / /_/ /_____      -----------------",
        "  \\__ \\/ __ \\/ __/ __/ __ \\     OS: OmOS v0.1.5 x86_64",
        " ___/ / /_/ / /_/ /_/ /_/ /     Host: PiUnknown Dev Station",
        "/____/\\____/\\__/\\__/\\____/      Kernel: 6.8.0-portfolio-crt",
        "                                Uptime: 42 days, 13 hours",
        "                                Shell: bash 5.2.21 (CRT Edition)",
        "                                Theme: " + ctx.theme + " [" + THEME_LABELS[ctx.theme] + "]",
        "                                Terminal: VT323 / JetBrains Mono",
        "                                Memory: 64MB / 1024MB",
      ],
    };
  }

  // ── 14. DATE & UPTIME ──
  if (command === "date") {
    return {
      output: [`> ${raw}`, `  ${new Date().toUTCString()}`],
    };
  }

  if (command === "uptime") {
    return {
      output: [
        `> ${raw}`,
        `  ${new Date().toLocaleTimeString()} up 42 days, 1 user, load average: 0.04, 0.02, 0.01`,
      ],
    };
  }

  // ── 15. ECHO ──
  if (command === "echo") {
    return {
      output: [`> ${raw}`, `  ${args.join(" ")}`],
    };
  }

  // ── 16. HISTORY ──
  if (command === "history") {
    const list = ctx.history.slice(0, 15).reverse().map((h, i) => `  ${i + 1}  ${h}`);
    return {
      output: [`> ${raw}`, ...list],
    };
  }

  // ── 17. EASTER EGGS: Matrix, Snake, Cowsay, Weather, Sudo, Ping, RM ──
  if (["matrix", "neo", "redpill"].includes(command)) {
    return {
      output: [`> ${raw}`, "  [MATRIX DIGITAL RAIN INITIALIZED] Matrix mode active."],
      openMatrix: true,
    };
  }

  if (["snake", "game", "play", "./game.bin"].includes(command)) {
    return {
      output: [`> ${raw}`, "  [LAUNCHING RETRO CRT SNAKE MINI-GAME] Press arrow keys to control!"],
      openSnake: true,
    };
  }

  if (command === "cowsay") {
    const quotes = [
      "Attention is all you need... and maybe a GPU cluster.",
      "You take the red pill, you stay in localhost and see how deep the rabbit hole goes.",
      "99 little bugs in the code. Fix one, 127 little bugs in the code.",
      "Fueling intelligence with Transformers, PyTorch, and way too much Diet Coke.",
      "It's not a bug, it's an undocumented terminal feature.",
      "There is no spoon. Just floating-point tensors and backprop.",
      "Wake up, Neo... the agentic pipeline has you.",
      "I don't always test my code, but when I do, I do it in production.",
      "Talk is cheap. Show me the weights matrix.",
    ];

    const rawMsg = args.join(" ").trim();
    const msg = rawMsg || quotes[Math.floor(Math.random() * quotes.length)];

    // Wrap text nicely if long
    const words = msg.split(" ");
    const lines: string[] = [];
    let curLine = "";
    for (const w of words) {
      if ((curLine + " " + w).trim().length > 44) {
        if (curLine) lines.push(curLine);
        curLine = w;
      } else {
        curLine = curLine ? `${curLine} ${w}` : w;
      }
    }
    if (curLine) lines.push(curLine);

    const maxLen = Math.max(...lines.map((l) => l.length));
    const topBorder = " " + "_".repeat(maxLen + 2);
    const botBorder = " " + "-".repeat(maxLen + 2);

    let bubbleLines: string[];
    if (lines.length === 1) {
      bubbleLines = [`< ${lines[0].padEnd(maxLen, " ")} >`];
    } else {
      bubbleLines = lines.map((l, idx) => {
        const padded = l.padEnd(maxLen, " ");
        if (idx === 0) return `/ ${padded} \\`;
        if (idx === lines.length - 1) return `\\ ${padded} /`;
        return `| ${padded} |`;
      });
    }

    return {
      output: [
        `> ${raw}`,
        `  ${topBorder}`,
        ...bubbleLines.map((bl) => `  ${bl}`),
        `  ${botBorder}`,
        "          \\   ^__^",
        "           \\  (oo)\\_______",
        "              (__)\\       )\\/\\",
        "                  ||----w |",
        "                  ||     ||",
      ],
    };
  }

  if (command === "weather" || cleanCmd.startsWith("curl wttr.in")) {
    let targetCity = args.join(" ").trim();
    if (!targetCity && cleanCmd.startsWith("curl wttr.in/")) {
      targetCity = cleanCmd.replace("curl wttr.in/", "").trim();
    }
    if (!targetCity) targetCity = "Delhi";

    const weatherOutput = await fetchLiveWeather(targetCity);
    return {
      output: [`> ${raw}`, ...weatherOutput],
    };
  }

  if (command === "sudo") {
    return {
      output: [
        `> ${raw}`,
        "  [sudo] password for visitor: *********",
        "  visitor is not in the sudoers file. This incident will be reported to Om.",
      ],
    };
  }

  if (command === "ping") {
    const host = args[0] || "piunknown.dev";
    return {
      output: [
        `> ${raw}`,
        `  PING ${host} (127.0.0.1): 56 data bytes`,
        `  64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.038 ms`,
        `  64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.041 ms`,
        `  64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.035 ms`,
        `  --- ${host} ping statistics ---`,
        `  3 packets transmitted, 3 packets received, 0.0% packet loss`,
      ],
    };
  }

  if (command === "rm") {
    return {
      output: [
        `> ${raw}`,
        "  rm: cannot remove: Permission denied. Om's portfolio is read-only & immutable.",
      ],
    };
  }

  if (command === "exit" || command === "quit") {
    return {
      output: [
        `> ${raw}`,
        "  Session cannot be terminated: You are permanently connected to localhost :)",
      ],
    };
  }

  // ── 18. Fallback: Command not found ──
  return {
    output: [
      `> ${raw}`,
      `  bash: ${command}: command not found. Type 'help' or '/' for available commands.`,
    ],
  };
}

function rootDirs(vfs: VFSDirectory): Record<string, VFSDirectory> {
  const dirs: Record<string, VFSDirectory> = {};
  for (const [k, v] of Object.entries(vfs.children)) {
    if (v.type === "dir") dirs[k] = v;
  }
  return dirs;
}

function countFiles(vfs: VFSDirectory): number {
  let count = 0;
  for (const node of Object.values(vfs.children)) {
    if (node.type === "file") count++;
    else count += Object.keys(node.children).length;
  }
  return count;
}

function getWeatherConditionText(desc: string, isNight = false): string {
  const d = (desc || "").toLowerCase();
  if (d.includes("thunder") || d.includes("storm") || d.includes("lightning")) return "⚡ Storm";
  if (d.includes("snow") || d.includes("blizzard") || d.includes("ice") || d.includes("sleet")) return "❄ Snow";
  if (d.includes("heavy rain") || d.includes("torrential")) return "☂ H.Rain";
  if (d.includes("rain") || d.includes("shower") || d.includes("drizzle")) return "☂ Rain";
  if (d.includes("fog") || d.includes("mist") || d.includes("haze")) return "≡ Mist";
  if (d.includes("overcast")) return "☁ Overcast";
  if (d.includes("partly") || d.includes("cloud")) return "☁ P.Cloud";
  if (isNight) return "☽ Clear";
  return "☼ Sunny";
}

async function fetchLiveWeather(targetCity: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://wttr.in/${encodeURIComponent(targetCity)}?format=j1`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error("wttr.in error");
    const data = await res.json();
    const area = data.nearest_area?.[0];
    let cityName = area?.areaName?.[0]?.value || targetCity;
    if (targetCity.toLowerCase() === "delhi" || cityName.toLowerCase().includes("connaught")) {
      cityName = "Delhi";
    } else if (targetCity && targetCity.toLowerCase() !== cityName.toLowerCase()) {
      cityName = targetCity.charAt(0).toUpperCase() + targetCity.slice(1);
    }
    const countryName = area?.country?.[0]?.value || "";
    const locationName = countryName ? `${cityName}, ${countryName}` : cityName;

    const today = data.weather?.[0];
    const hourly = today?.hourly || [];
    const cur = data.current_condition?.[0];

    const mornHour = hourly[2] || hourly[1] || cur;
    const noonHour = hourly[4] || cur;
    const eveHour = hourly[6] || hourly[7] || cur;

    const mornCond = getWeatherConditionText(mornHour?.weatherDesc?.[0]?.value || "Clear", false);
    const noonCond = getWeatherConditionText(noonHour?.weatherDesc?.[0]?.value || "Sunny", false);
    const eveCond = getWeatherConditionText(eveHour?.weatherDesc?.[0]?.value || "Clear", true);

    const mornTemp = `${mornHour?.tempC || cur?.temp_C || "24"} °C`;
    const noonTemp = `${noonHour?.tempC || cur?.temp_C || "32"} °C`;
    const eveTemp = `${eveHour?.tempC || cur?.temp_C || "26"} °C`;

    const mornWind = `→ ${mornHour?.windspeedKmph || "12"} km/h`;
    const noonWind = `↗ ${noonHour?.windspeedKmph || "15"} km/h`;
    const eveWind = `↘ ${eveHour?.windspeedKmph || "8"} km/h`;

    const payload = JSON.stringify({
      location: locationName,
      morning: { cond: mornCond, temp: mornTemp, wind: mornWind },
      noon: { cond: noonCond, temp: noonTemp, wind: noonWind },
      evening: { cond: eveCond, temp: eveTemp, wind: eveWind },
    });

    return [`__WEATHER_JSON__:${payload}`];
  } catch {
    // Fallback if offline or network timeout
    const payload = JSON.stringify({
      location: targetCity.toLowerCase() === "delhi" ? "Delhi, India" : targetCity,
      morning: { cond: "☼ Clear", temp: "24 °C", wind: "→ 12 km/h" },
      noon: { cond: "☼ Sunny", temp: "32 °C", wind: "↗ 15 km/h" },
      evening: { cond: "☽ Clear", temp: "26 °C", wind: "↘ 8 km/h" },
    });
    return [`__WEATHER_JSON__:${payload}`];
  }
}





