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

const files = fs.readdirSync(blogDir);

for (const file of files) {
  if (file.startsWith('_') || !file.endsWith('.md') || file === 'blog_template.md') {
    continue;
  }
  
  const slug = file.replace(/\.md$/, '');
  const filePath = path.join(blogDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const fm = parseFrontmatter(content);
  
  if (fm.title) {
    const title = `${fm.title} — Terminal Portfolio`;
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

console.log("Postbuild OG tags generation complete!");
