// ── Blog folders ("super blogs") ──────────────────────────────────────────────
// Shared by App.tsx (UI) and utils/terminalEngine.ts (VFS / CLI) so the slug,
// ordering and membership rules stay byte-identical in both worlds.
//
// Membership comes from post frontmatter:      series: "Ever Fundamentals"
// Optional lesson ordering:                    order: 1
// Display metadata comes from the manifest:    src/content/blog/_series.json

export interface SeriesAwarePost {
  id: string;
  title: string;
  date: string;
  tags: string[];
  readTime: string;
  excerpt: string;
  body: string;
  series?: string;
  seriesOrder?: number;
}

export interface SeriesManifestEntry {
  name: string;
  /**
   * Stable identity for the folder. Defaults to slugify(name), so setting it
   * explicitly lets you rename the display name without breaking membership
   * (or existing /blog/<slug> links).
   */
  slug?: string;
  description?: string;
  order?: number;
  /** When true (default) members are only reachable through the folder. */
  hideMembers?: boolean;
}

export interface BlogFolder<T extends SeriesAwarePost = SeriesAwarePost> {
  slug: string;
  name: string;
  description: string;
  order: number;
  hideMembers: boolean;
  posts: T[];
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Newest first — the loose-post ordering used everywhere on the blog page. */
export function byNewestFirst(
  a: { date: string },
  b: { date: string }
): number {
  return b.date.localeCompare(a.date);
}

/**
 * Folder name fallback: "ml-fundamentals" -> "ML Fundamentals".
 * Short tokens stay uppercase so `ml`, `ai`, `mcp` don't become "Ml"/"Ai".
 * _series.json always wins when you want exact casing.
 */
export function humanizeSeriesName(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) =>
      word.length <= 3 && /[a-z]/.test(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

/**
 * Where a post sits in its series: `order:` frontmatter, else a leading
 * `01-` / `02.` in the filename, else last.
 */
function positionOf(post: SeriesAwarePost): number {
  if (typeof post.seriesOrder === "number" && !Number.isNaN(post.seriesOrder)) {
    return post.seriesOrder;
  }
  const match = post.id.match(/^(\d{1,2})[-.]/);
  return match ? Number.parseInt(match[1], 10) : 999;
}

function latestDate(posts: { date: string }[]): string {
  return posts.reduce((acc, p) => (p.date > acc ? p.date : acc), "");
}

/**
 * Groups posts into folders. A folder exists as soon as one post declares a
 * `series:`, manifest entry or not — the manifest only adds display metadata.
 */
export function buildBlogFolders<T extends SeriesAwarePost>(
  posts: T[],
  manifest: SeriesManifestEntry[] = []
): BlogFolder<T>[] {
  const metaBySlug = new Map<string, SeriesManifestEntry>();
  manifest.forEach((entry) => {
    if (entry && typeof entry.name === "string" && entry.name.trim()) {
      const key = entry.slug?.trim() ? slugify(entry.slug) : slugify(entry.name);
      if (key) metaBySlug.set(key, entry);
    }
  });

  // slug -> display name as first written in frontmatter
  const names = new Map<string, string>();
  posts.forEach((post) => {
    const raw = post.series?.trim();
    if (!raw) return;
    const slug = slugify(raw);
    if (!slug || names.has(slug)) return;
    names.set(slug, raw);
  });

  const folders: BlogFolder<T>[] = [];
  names.forEach((name, slug) => {
    const meta = metaBySlug.get(slug);
    const members = posts
      .filter((post) => post.series && slugify(post.series) === slug)
      .sort((a, b) => {
        const orderDiff = positionOf(a) - positionOf(b);
        return orderDiff !== 0 ? orderDiff : byNewestFirst(a, b);
      });
    if (members.length === 0) return;

    folders.push({
      slug,
      name: meta?.name ?? humanizeSeriesName(name),
      description: meta?.description ?? "",
      order: meta?.order ?? 999,
      hideMembers: meta?.hideMembers ?? true,
      posts: members,
    });
  });

  return folders.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return latestDate(b.posts).localeCompare(latestDate(a.posts));
  });
}

/**
 * Posts that show up as individual entries on the main blog page.
 * Members of a `hideMembers` folder are pulled out of the flat list.
 */
export function listablePosts<T extends SeriesAwarePost>(
  posts: T[],
  folders: BlogFolder<T>[]
): T[] {
  const hidden = new Set<string>();
  folders.forEach((folder) => {
    if (folder.hideMembers) {
      folder.posts.forEach((post) => hidden.add(post.id));
    }
  });
  return posts.filter((post) => !hidden.has(post.id));
}
