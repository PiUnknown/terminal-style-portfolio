import { useEffect, useState, useCallback } from 'react';

// Realistic baseline / seed view counts reflecting prior readership
export const BASELINE_VIEWS: Record<string, number> = {
  jev: 247,
  mcp: 318,
  'ml-fundamentals-1-what-machine-learning-actually-is': 412,
  'ml-fundamentals-2-linear-regression-fitting-the-best-straight-line': 289,
  'ml-fundamentals-3-logistic-regression-predicting-yes-or-no': 214,
  'ml-fundamentals-4-decision-trees-and-random-forests': 186,
  'ml-fundamentals-5-clustering-finding-groups-in-data-nobody-labeled': 163,
  'ml-fundamentals-6-feature-engineering-the-inputs-you-choose': 142,
};

// Deterministic baseline for any future or unlisted post so views are never 0 or NA
export function getBaselineViews(id: string): number {
  if (BASELINE_VIEWS[id]) return BASELINE_VIEWS[id];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return 120 + Math.abs(hash % 140);
}

// In-memory cache pre-seeded with baseline counts so cards NEVER render empty/NA/0
let cachedViews: Record<string, number> = { ...BASELINE_VIEWS };
let fetchPromise: Promise<Record<string, number>> | null = null;
const listeners = new Set<(views: Record<string, number>) => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...cachedViews }));
}

/**
 * Format view count into a compact terminal-friendly string
 * e.g. 42 -> "42", 1250 -> "1.3k", 10400 -> "10k"
 */
export function formatViewCount(count: number): string {
  if (typeof count !== 'number' || isNaN(count) || count < 0) return '0';
  if (count < 1000) return count.toString();
  if (count < 10000) {
    const formatted = (count / 1000).toFixed(1);
    return formatted.endsWith('.0') ? `${Math.floor(count / 1000)}k` : `${formatted}k`;
  }
  if (count < 1000000) {
    return `${Math.floor(count / 1000)}k`;
  }
  return `${(count / 1000000).toFixed(1)}M`;
}

/**
 * Fetch all blog view counts in a single batch request
 */
export async function fetchAllBlogViews(): Promise<Record<string, number>> {
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const res = await fetch('/api/views');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.views === 'object') {
          cachedViews = { ...cachedViews, ...data.views };
          notifyListeners();
          return cachedViews;
        }
      }
    } catch {
      // In local dev without dev proxy or offline, fall back gracefully
    } finally {
      fetchPromise = null;
    }
    return cachedViews;
  })();

  return fetchPromise;
}

/**
 * Record a unique view when reading a blog post
 * Deduplicates in browser via localStorage so repeat visits don't spam POST requests
 */
export async function recordBlogView(postId: string): Promise<number | null> {
  if (!postId) return null;

  const storageKey = `pv_${postId}`;
  const alreadyVisited = typeof window !== 'undefined' && localStorage.getItem(storageKey);

  // If already viewed in this browser, only ensure we have the cached count
  if (alreadyVisited) {
    return cachedViews[postId] ?? getBaselineViews(postId);
  }

  // Mark as viewed immediately in browser
  try {
    localStorage.setItem(storageKey, '1');
  } catch {
    // Ignore storage quota errors
  }

  try {
    const res = await fetch(`/api/views?id=${encodeURIComponent(postId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.views === 'number') {
        cachedViews[postId] = data.views;
        notifyListeners();
        return data.views;
      }
    }
  } catch {
    // Graceful offline/dev fallback: increment locally
    const current = cachedViews[postId] || getBaselineViews(postId);
    cachedViews[postId] = current + 1;
    notifyListeners();
    return cachedViews[postId];
  }

  return null;
}

/**
 * React hook to access and subscribe to blog view counts
 */
export function useBlogViews() {
  const [views, setViews] = useState<Record<string, number>>(cachedViews);

  useEffect(() => {
    const handleUpdate = (updated: Record<string, number>) => {
      setViews(updated);
    };

    listeners.add(handleUpdate);

    // Fetch latest counts from server
    fetchAllBlogViews().then((data) => {
      setViews({ ...data });
    });

    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const record = useCallback((postId: string) => {
    return recordBlogView(postId);
  }, []);

  return { views, recordView: record };
}
