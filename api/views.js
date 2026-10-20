import crypto from 'crypto';

// Realistic baseline / seed view counts reflecting historical readership
export const BASELINE_VIEWS = {
  jev: 124,
  mcp: 168,
  'ml-fundamentals-1-what-machine-learning-actually-is': 68,
  'ml-fundamentals-2-linear-regression-fitting-the-best-straight-line': 54,
  'ml-fundamentals-3-logistic-regression-predicting-yes-or-no': 43,
  'ml-fundamentals-4-decision-trees-and-random-forests': 35,
  'ml-fundamentals-5-clustering-finding-groups-in-data-nobody-labeled': 27,
  'ml-fundamentals-6-feature-engineering-the-inputs-you-choose': 21,
};

// Any future or new blog post starts at 0 views
export function getBaselineViews(id) {
  return BASELINE_VIEWS[id] || 0;
}

// In-memory increment tracking for local development or when Redis env vars are not set
const memoryCounts = new Map();
const memoryVisitors = new Set();

export default async function handler(req, res) {
  // CORS & Cache control headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  // ── GET: Retrieve view counts (Baseline + Real Unique Visitors) ───────────
  if (req.method === 'GET') {
    const { id } = req.query || {};

    if (redisUrl && redisToken) {
      try {
        if (id) {
          // Single post count
          const response = await fetch(`${redisUrl}/hget/blog_views:counts/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${redisToken}` },
          });
          const data = await response.json();
          const redisCount = Number.parseInt(data.result || '0', 10);
          const total = getBaselineViews(id) + (isNaN(redisCount) ? 0 : redisCount);
          return res.status(200).json({ id, views: total });
        }

        // All posts count
        const response = await fetch(`${redisUrl}/hgetall/blog_views:counts`, {
          headers: { Authorization: `Bearer ${redisToken}` },
        });
        const data = await response.json();
        const viewsMap = {};

        // Seed with baseline numbers
        for (const [k, base] of Object.entries(BASELINE_VIEWS)) {
          viewsMap[k] = base;
        }

        if (data.result && typeof data.result === 'object') {
          if (Array.isArray(data.result)) {
            for (let i = 0; i < data.result.length; i += 2) {
              const k = data.result[i];
              const v = Number.parseInt(data.result[i + 1] || '0', 10);
              const extra = isNaN(v) ? 0 : v;
              viewsMap[k] = getBaselineViews(k) + extra;
            }
          } else {
            for (const [k, v] of Object.entries(data.result)) {
              const num = Number.parseInt(v || '0', 10);
              const extra = isNaN(num) ? 0 : num;
              viewsMap[k] = getBaselineViews(k) + extra;
            }
          }
        }

        return res.status(200).json({ views: viewsMap });
      } catch (err) {
        console.error('[views] Redis GET error:', err);
      }
    }

    // Fallback response (without Redis or during local dev)
    if (id) {
      const extra = memoryCounts.get(id) || 0;
      return res.status(200).json({ id, views: getBaselineViews(id) + extra, fallback: true });
    }
    const allViews = {};
    for (const [k, base] of Object.entries(BASELINE_VIEWS)) {
      allViews[k] = base + (memoryCounts.get(k) || 0);
    }
    return res.status(200).json({ views: allViews, fallback: true });
  }

  // ── POST: Record a unique blog post view ──────────────────────────────────
  if (req.method === 'POST') {
    let id = req.query?.id;
    if (!id && req.body) {
      try {
        const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        id = parsed.id;
      } catch {
        // Ignored
      }
    }

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Post ID is required' });
    }

    // Generate anonymous unique visitor hash (IP + User Agent + salt)
    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const salt = process.env.VIEWS_SALT || 'terminal_visitor_salt_v1';
    const visitorHash = crypto
      .createHash('sha256')
      .update(`${clientIp}-${userAgent}-${salt}`)
      .digest('hex')
      .slice(0, 20);

    if (redisUrl && redisToken) {
      try {
        // Add visitor to post's unique visitor set (SADD returns 1 if new, 0 if already present)
        const saddRes = await fetch(
          `${redisUrl}/sadd/blog_views:${encodeURIComponent(id)}:visitors/${visitorHash}`,
          {
            headers: { Authorization: `Bearer ${redisToken}` },
          }
        );
        const saddData = await saddRes.json();
        const isNewVisitor = saddData.result === 1;

        if (isNewVisitor) {
          // Increment the total unique view count in the Redis hash
          await fetch(`${redisUrl}/hincrby/blog_views:counts/${encodeURIComponent(id)}/1`, {
            headers: { Authorization: `Bearer ${redisToken}` },
          });
        }

        // Fetch latest count
        const countRes = await fetch(`${redisUrl}/hget/blog_views:counts/${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${redisToken}` },
        });
        const countData = await countRes.json();
        const latestRedis = Number.parseInt(countData.result || '0', 10);
        const total = getBaselineViews(id) + (isNaN(latestRedis) ? 0 : latestRedis);

        return res.status(200).json({
          id,
          views: total,
          isNewVisitor,
        });
      } catch (err) {
        console.error('[views] Redis POST error:', err);
      }
    }

    // Fallback in-memory tracking
    const visitorKey = `${id}:${visitorHash}`;
    const isNew = !memoryVisitors.has(visitorKey);
    if (isNew) {
      memoryVisitors.add(visitorKey);
      const current = memoryCounts.get(id) || 0;
      memoryCounts.set(id, current + 1);
    }
    const total = getBaselineViews(id) + (memoryCounts.get(id) || 0);
    return res.status(200).json({ id, views: total, isNewVisitor: isNew, fallback: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
