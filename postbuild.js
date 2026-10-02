import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const blogDir = path.join(__dirname, 'src', 'content', 'blog');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error("No dist/index.html found. Make sure to run 'vite build' first.");
  process.exit(1);
}

const templateHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const distBlogDir = path.join(distDir, 'blog');
if (!fs.existsSync(distBlogDir)) {
  fs.mkdirSync(distBlogDir, { recursive: true });
}

function parseFrontmatter(content) {
  const fm = {};
  const fenceEnd = content.indexOf("\n---", 4);
  if (content.startsWith("---") && fenceEnd !== -1) {
    const fmText = content.slice(4, fenceEnd);
    fmText.split("\n").forEach((line) => {
      const colon = line.indexOf(":");
      if (colon !== -1) {
        const key = line.slice(0, colon).trim().replace(/^["']|["']$/g, "");
        const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
        fm[key] = val;
      }
    });
  }
  return fm;
}

// Recursively collect posts. A sub-directory of blog/ IS a series, so paths
// come back relative (e.g. "ml-fundamentals/lesson-01.md").
function collectPostFiles(dir, rel = "") {
  const out = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...collectPostFiles(path.join(dir, entry.name), relPath));
      return;
    }
    if (!entry.name.endsWith(".md")) return;
    if (entry.name.startsWith("_") || entry.name.includes("template")) return;
    out.push(relPath);
  });
  return out;
}
const files = collectPostFiles(blogDir);

for (const file of files) {
  if (file.startsWith('_') || !file.endsWith('.md') || file === 'blog_template.md') {
    continue;
  }
  
  // Post id (and therefore its URL) is the filename, not the folder it sits in.
  const slug = path.basename(file).replace(/\.md$/, '');
  const filePath = path.join(blogDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const fm = parseFrontmatter(content);
  
  if (fm.title) {
    const title = fm.title;
    // Escape quotes in description to prevent breaking the meta tag
    const rawDescription = fm.excerpt || fm.title;
    const description = rawDescription.replace(/"/g, '&quot;');
    const url = `https://www.piunknown.dev/blog/${slug}`;
    
    let newHtml = templateHtml;
    
    // Page Title
    newHtml = newHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
    newHtml = newHtml.replace(/<meta\s+name="title"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="title" content="${title}" />`);
    
    // Description (handles multiline)
    newHtml = newHtml.replace(/<meta\s+name="description"[\s\S]*?content="[\s\S]*?"\s*\/?>/i, `<meta name="description" content="${description}" />`);
    
    // Open Graph
    newHtml = newHtml.replace(/<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
    newHtml = newHtml.replace(/<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
    newHtml = newHtml.replace(/<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:url" content="${url}" />`);
    newHtml = newHtml.replace(/<meta\s+property="og:type"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:type" content="article" />`);
    
    // Twitter
    newHtml = newHtml.replace(/<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
    newHtml = newHtml.replace(/<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:description" content="${description}" />`);
    newHtml = newHtml.replace(/<meta\s+name="twitter:url"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:url" content="${url}" />`);
    
    const slugDir = path.join(distBlogDir, slug);
    if (!fs.existsSync(slugDir)) {
      fs.mkdirSync(slugDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(slugDir, 'index.html'), newHtml, 'utf8');
    console.log(`✓ Generated static OG HTML for /blog/${slug}`);
  }
}

// ── Series folder ("super blog") OG pages: /blog/<slug> ───────────────────────
// Skipped when a post already owns the slug — posts always win that URL.
{
  const slugify = (value) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Display metadata, keyed by folder identity (explicit slug, else slugified name)
  const seriesPath = path.join(blogDir, "_series.json");
  const seriesMeta = new Map();
  if (fs.existsSync(seriesPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(seriesPath, "utf8"));
      (Array.isArray(parsed) ? parsed : [parsed]).forEach((entry) => {
        if (entry && typeof entry.name === "string" && entry.name.trim()) {
          const key =
            entry.slug && entry.slug.trim() ? slugify(entry.slug) : slugify(entry.name);
          if (key) seriesMeta.set(key, entry);
        }
      });
    } catch (err) {
      console.warn(`! Could not parse _series.json: ${err.message}`);
    }
  }

  const humanize = (value) =>
    value
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map((w) =>
        w.length <= 3 && /[a-z]/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
      )
      .join(" ");

  // Folders come from the filesystem: a sub-directory of blog/ IS a series.
  // `series:` frontmatter is only the fallback for top-level files.
  const folders = new Map();
  files.forEach((file) => {
    if (!file.endsWith(".md")) return;
    const parts = file.split("/");
    const dirName = parts.length > 1 ? parts[0] : null;
    const fm = parseFrontmatter(fs.readFileSync(path.join(blogDir, file), "utf8"));
    const seriesLabel =
      dirName || (fm.series && fm.series.trim() ? fm.series.trim() : null);
    if (!seriesLabel) return;
    const slug = slugify(seriesLabel);
    if (!slug) return;
    const meta = seriesMeta.get(slug);
    const folder = folders.get(slug) || {
      name: (meta && meta.name) || humanize(seriesLabel),
      description: (meta && meta.description) || "",
      count: 0,
      latest: "",
    };
    folder.count += 1;
    if ((fm.date || "") > folder.latest) folder.latest = fm.date || "";
    folders.set(slug, folder);
  });

  seriesMeta.forEach((entry, slug) => {
    if (!folders.has(slug)) {
      console.warn(
        `! _series.json entry "${entry.name}" matches no post's series: — no OG page for /blog/${slug}`
      );
    }
  });

  const postSlugs = new Set(
    files.map((f) => path.basename(f).replace(/\.md$/, ""))
  );

  folders.forEach((folder, slug) => {
    if (postSlugs.has(slug)) {
      console.warn(`! Skipping series OG page /blog/${slug} — a post owns that URL`);
      return;
    }

    const title = folder.name;
    const description = (
      folder.description || `${folder.count} posts in the ${title} series.`
    ).replace(/"/g, "&quot;");
    const url = `https://www.piunknown.dev/blog/${slug}`;

    let newHtml = templateHtml;
    newHtml = newHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
    newHtml = newHtml.replace(/<meta\s+name="title"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="title" content="${title}" />`);
    newHtml = newHtml.replace(/<meta\s+name="description"[\s\S]*?content="[\s\S]*?"\s*\/?>/i, `<meta name="description" content="${description}" />`);
    newHtml = newHtml.replace(/<meta\s+property="og:title"[\s\S]*?content="[\s\S]*?"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
    newHtml = newHtml.replace(/<meta\s+property="og:description"[\s\S]*?content="[\s\S]*?"\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
    newHtml = newHtml.replace(/<meta\s+property="og:url"[\s\S]*?content="[\s\S]*?"\s*\/?>/i, `<meta property="og:url" content="${url}" />`);
    newHtml = newHtml.replace(/<meta\s+property="og:type"[\s\S]*?content="[\s\S]*?"\s*\/?>/i, `<meta property="og:type" content="website" />`);
    newHtml = newHtml.replace(/<meta\s+name="twitter:title"[\s\S]*?content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
    newHtml = newHtml.replace(/<meta\s+name="twitter:description"[\s\S]*?content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:description" content="${description}" />`);
    newHtml = newHtml.replace(/<meta\s+name="twitter:url"[\s\S]*?content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:url" content="${url}" />`);

    const slugDir = path.join(distBlogDir, slug);
    if (!fs.existsSync(slugDir)) {
      fs.mkdirSync(slugDir, { recursive: true });
    }
    fs.writeFileSync(path.join(slugDir, "index.html"), newHtml, "utf8");
    console.log(
      `✓ Generated static OG HTML for /blog/${slug} (series, ${folder.count} post${folder.count === 1 ? "" : "s"}${folder.latest ? `, updated ${folder.latest}` : ""})`
    );
  });
}

console.log("Postbuild OG tags generation complete!");
