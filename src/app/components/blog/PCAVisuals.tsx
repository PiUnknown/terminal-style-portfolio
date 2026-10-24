import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./pca-visuals.css";

const LOOP_MS = 14000;

function useFigure(label: string) {
  const ref = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.innerWidth < 560);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [p, setP] = useState(0.9);
  const started = useRef(false);
  const running = visible && pageVisible && !paused && !reduced;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const resize = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 560));
    resize.observe(el);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(el);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => setReduced(motion.matches);
    const onVisibility = () => setPageVisible(!document.hidden);
    motion.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      resize.disconnect();
      observer.disconnect();
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (reduced) { setP(0.9); return; }
    if (!running) return;
    let raf = 0;
    let last: number | null = null;
    let elapsed = started.current ? p * LOOP_MS : 0;
    started.current = true;
    const tick = (now: number) => {
      if (last !== null) elapsed = (elapsed + Math.min(now - last, 100)) % LOOP_MS;
      last = now;
      setP(elapsed / LOOP_MS);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // p is the resume point; do not restart the effect on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, reduced]);

  const toggle = reduced ? null : (
    <button
      className="pca-toggle"
      type="button"
      onClick={() => setPaused((value) => !value)}
      aria-label={paused ? `Play ${label} animation` : `Pause ${label} animation`}
      title={paused ? "Play animation" : "Pause animation"}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        {paused ? <path d="M7 4.5 15 10l-8 5.5z" /> : <><path d="M7 4v12" /><path d="M13 4v12" /></>}
      </svg>
    </button>
  );

  return { ref, compact, p, toggle };
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ramp = (p: number, start: number, duration: number) => clamp((p - start) / duration);
const tail = (p: number) => p > 0.96 ? Math.max(0, (1 - p) / 0.04) : 1;
const fade = (p: number, start: number, duration = 0.04) => ramp(p, start, duration) * tail(p);

function Figure({ name, fig, caption, children }: { name: string; fig: ReturnType<typeof useFigure>; caption: string; children: ReactNode }) {
  return (
    <figure ref={fig.ref} className={`pca-figure pca-${name}${fig.compact ? " pca-compact" : ""}`}>
      {fig.toggle}
      {children}
      <figcaption className="pca-caption">{caption}</figcaption>
    </figure>
  );
}

/* Constructed, centered song ratings. Each point is a leading-direction score t
 * plus a smaller perpendicular score q, matching the post's energy/loudness demo. */
const SONG_SCORES = [
  [-2.705, 0.0814], [-1.882, -0.416], [-1.235, 0.6934], [-0.470, -0.624],
  [0.470, 0.624], [1.235, -0.6934], [1.882, 0.416], [2.705, -0.0814],
] as const;
const SONGS = SONG_SCORES.map(([t, q]) => ({
  x: t * 0.866 - q * 0.5,
  y: t * 0.5 + q * 0.866,
}));

export function ProjectionAnimation() {
  const fig = useFigure("song projection");
  const { compact, p } = fig;
  const rawId = useId().replace(/:/g, "");
  const titleId = `pca-projection-title-${rawId}`;
  const descId = `pca-projection-desc-${rawId}`;
  const arrowId = `pca-projection-arrow-${rawId}`;
  const W = compact ? 360 : 720;
  const H = compact ? 480 : 440;
  const cx = W / 2;
  const cy = compact ? 222 : 205;
  const scale = compact ? 45 : 76;
  const rotate = ramp(p, 0.12, 0.28);
  const angle = (Math.PI / 6) * rotate;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const half = 3 * scale;
  const startX = cx - half * dx;
  const startY = cy + half * dy;
  const endX = cx + half * dx;
  const endY = cy - half * dy;
  const points = SONGS.map((song) => {
    const score = song.x * dx + song.y * dy;
    return {
      x: cx + song.x * scale,
      y: cy - song.y * scale,
      px: cx + score * dx * scale,
      py: cy - score * dy * scale,
    };
  });
  const summary = fade(p, 0.79, 0.06);

  return (
    <Figure
      name="projection"
      fig={fig}
      caption="Constructed song ratings on centered energy and loudness axes. Component 1 is about 0.87 energy + 0.50 loudness; each dashed segment is the shortest, perpendicular path onto it. The two spreads are 3.6 and 0.3, or 92% and 8% of the 3.9 total."
    >
      <svg className="pca-svg pca-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>Rotate toward the main direction, then project each song</title>
        <desc id={descId}>Eight constructed song ratings form a cloud on centered energy and loudness axes. A trial direction turns to component 1, about 0.87 energy plus 0.50 loudness. Dashed perpendiculars drop each song onto that line. Component 1 holds 3.6 of the total 3.9 variance, about 92 percent; the perpendicular component holds 0.3.</desc>
        <defs>
          <marker id={arrowId} viewBox="0 0 10 10" refX="8.8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path className="pca-arrowhead" d="M0 0 10 5 0 10z" />
          </marker>
        </defs>

        <text className="pca-kicker" x={cx} y="30" textAnchor="middle">8 songs · centered ratings</text>
        <line className="pca-axis" x1={cx - 2.85 * scale} x2={cx + 2.85 * scale} y1={cy} y2={cy} />
        <line className="pca-axis" x1={cx} x2={cx} y1={cy - 1.95 * scale} y2={cy + 1.95 * scale} />
        <text className="pca-small" x={cx + 2.42 * scale} y={cy + 18} textAnchor="end">energy</text>
        <text className="pca-small" x={cx - 8} y={cy - 1.85 * scale} textAnchor="end">loudness</text>

        <line
          className={`pca-direction${rotate < 0.98 ? " pca-direction-search" : ""}`}
          x1={startX} y1={startY} x2={endX} y2={endY}
          markerEnd={`url(#${arrowId})`}
          opacity={tail(p)}
        />
        <text className="pca-direction-label" x={endX - 3} y={endY - 10} textAnchor="end" opacity={tail(p)}>
          {rotate < 0.98 ? "trial direction" : "component 1"}
        </text>

        {points.map((point, index) => {
          const reveal = fade(p, 0.47 + index * 0.033, 0.045);
          return (
            <g key={index} opacity={reveal}>
              <line className="pca-projection-line" x1={point.x} y1={point.y} x2={point.px} y2={point.py} />
              <circle className="pca-foot" cx={point.px} cy={point.py} r="3.5" />
            </g>
          );
        })}

        {points.map((point, index) => (
          <circle key={`song-${index}`} className="pca-song" cx={point.x} cy={point.y} r={compact ? 5 : 6} />
        ))}

        <g opacity={summary}>
          <line
            className="pca-projection-line"
            x1={W - (compact ? 146 : 150)} x2={W - (compact ? 128 : 132)}
            y1={compact ? 81 : 54} y2={compact ? 81 : 54}
          />
          <text className="pca-small pca-residual-label" x={W - (compact ? 122 : 126)} y={compact ? 84 : 57} textAnchor="start">
            PC2 · perpendicular
          </text>
        </g>
        <text className="pca-small pca-step" x={cx} y={H - 74} textAnchor="middle" opacity={fade(p, 0.04, 0.04)}>
          {rotate < 0.98 ? "turn the trial axis toward the widest spread" : "drop each song along a perpendicular"}
        </text>
        <text className="pca-result" x={cx} y={H - 43} textAnchor="middle" opacity={summary}>
          PC1 keeps 3.6 / 3.9 variance · 92%
        </text>
        <text className="pca-small" x={cx} y={H - 22} textAnchor="middle" opacity={summary}>
          PC2 keeps the remaining 0.3 · 8%
        </text>
      </svg>
    </Figure>
  );
}

const SHARES = [42, 26, 14, 7, 4, 3, 2, 1, 0.5, 0.5];
const CUMULATIVE = SHARES.map((_, index) => SHARES.slice(0, index + 1).reduce((sum, value) => sum + value, 0));

export function VarianceCurveAnimation() {
  const fig = useFigure("explained variance");
  const { compact, p } = fig;
  const rawId = useId().replace(/:/g, "");
  const titleId = `pca-variance-title-${rawId}`;
  const descId = `pca-variance-desc-${rawId}`;
  const W = compact ? 360 : 720;
  const H = compact ? 530 : 500;
  const left = compact ? 48 : 62;
  const right = compact ? 38 : 58;
  const top = compact ? 132 : 118;
  const bottom = compact ? 394 : 394;
  const chartH = bottom - top;
  const step = (W - left - right) / SHARES.length;
  const barW = compact ? 15 : 28;
  const centers = SHARES.map((_, index) => left + step * (index + 0.5));
  const curvePoints = CUMULATIVE.map((value, index) => ({ x: centers[index], y: bottom - chartH * value / 100 }));
  const curvePath = curvePoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
  const curveLength = curvePoints.reduce((length, point, index) => index === 0 ? length : length + Math.hypot(point.x - curvePoints[index - 1].x, point.y - curvePoints[index - 1].y), 0);
  const curveProgress = ramp(p, 0.45, 0.27);
  const targetOpacity = fade(p, 0.73, 0.05);
  const targetY = bottom - chartH * 0.95;
  const crossingX = centers[5];
  const calloutW = compact ? 164 : 190;
  const calloutX = Math.max(left, Math.min(crossingX - calloutW / 2, W - right - calloutW));
  const legendY = H - (compact ? 67 : 43);

  return (
    <Figure
      name="variance"
      fig={fig}
      caption="The post's constructed 10-component example. Bars show each component's share; the line adds those shares as it moves right. The cumulative total first clears the 95% target at component 6: 96%. The final two shares are 0.5% each."
    >
      <svg className="pca-svg pca-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>Explained variance reaches 96 percent at six components</title>
        <desc id={descId}>Ten bars show variance shares of 42, 26, 14, 7, 4, 3, 2, 1, 0.5 and 0.5 percent. The cumulative curve reads 42, 68, 82, 89, 93 and 96 percent at the first six components, crossing the dashed 95 percent target for the first time at component six.</desc>

        <text className="pca-kicker" x={W / 2} y="31" textAnchor="middle">each component's share adds to the running total</text>
        <text className="pca-small" x={left} y={top - 14}>variance (%)</text>

        {[0, 25, 50, 75, 100].map((value) => {
          const y = bottom - chartH * value / 100;
          return (
            <g key={value}>
              <line className="pca-grid" x1={left} x2={W - right} y1={y} y2={y} />
              <text className="pca-tick" x={left - 8} y={y + 4} textAnchor="end">{value}</text>
            </g>
          );
        })}

        {SHARES.map((share, index) => {
          const start = 0.07 + index * 0.033;
          const reveal = ramp(p, start, 0.046);
          const height = chartH * share / 100 * reveal;
          const y = bottom - height;
          return (
            <g key={index}>
              <rect className="pca-bar" x={centers[index] - barW / 2} y={y} width={barW} height={height} rx="2" opacity={tail(p) * reveal} />
              <text className="pca-value" x={centers[index]} y={bottom - chartH * share / 100 - 8} textAnchor="middle" opacity={fade(p, start + 0.018, 0.035)}>
                {share}%
              </text>
              <text className="pca-tick pca-component" x={centers[index]} y={bottom + 20} textAnchor="middle">{index + 1}</text>
            </g>
          );
        })}

        <line className="pca-target" x1={left} x2={W - right} y1={targetY} y2={targetY} opacity={targetOpacity} />
        <text className="pca-target-label" x={W - right} y={targetY + 16} textAnchor="end" opacity={targetOpacity}>95% target</text>
        <line className="pca-cross-guide" x1={crossingX} x2={crossingX} y1={top} y2={bottom} opacity={targetOpacity} />
        <path
          className="pca-cumulative"
          d={curvePath}
          pathLength={curveLength}
          strokeDasharray={curveLength}
          strokeDashoffset={curveLength * (1 - curveProgress)}
          opacity={tail(p)}
        />
        {curvePoints.map((point, index) => {
          const reveal = clamp(curveProgress * SHARES.length - index);
          return (
            <g key={`cumulative-${index}`} opacity={tail(p) * reveal}>
              <circle className="pca-cumulative-dot" cx={point.x} cy={point.y} r={index === 5 ? 4.5 : 3} />
              {index === 5 && <circle className="pca-cross-ring" cx={point.x} cy={point.y} r="8" opacity={targetOpacity} />}
            </g>
          );
        })}

        <g opacity={targetOpacity}>
          <rect className="pca-callout" x={calloutX} y={top - 42} width={calloutW} height="25" rx="4" />
          <text className="pca-callout-text" x={calloutX + calloutW / 2} y={top - 25} textAnchor="middle">
            {compact ? "95% crossed at C6 · 96%" : "first crossing: C6 · 96%"}
          </text>
        </g>

        <text className="pca-small" x={W / 2} y={bottom + 40} textAnchor="middle">component</text>
        <g className="pca-legend">
          <rect className="pca-bar-swatch" x={W / 2 - (compact ? 126 : 158)} y={legendY - 8} width="11" height="11" rx="1" />
          <text className="pca-small" x={W / 2 - (compact ? 110 : 142)} y={legendY + 1}>share</text>
          <line className="pca-legend-line" x1={W / 2 - 42} x2={W / 2 - 24} y1={legendY - 2} y2={legendY - 2} />
          <text className="pca-small" x={W / 2 - 18} y={legendY + 1}>cumulative</text>
          <line className="pca-legend-target" x1={W / 2 + (compact ? 68 : 82)} x2={W / 2 + (compact ? 86 : 100)} y1={legendY - 2} y2={legendY - 2} />
          <text className="pca-small" x={W / 2 + (compact ? 91 : 105)} y={legendY + 1}>95%</text>
        </g>
        <text className="pca-result" x={W / 2} y={H - 25} textAnchor="middle" opacity={targetOpacity}>
          6 components retain 96% of the total variance
        </text>
      </svg>
    </Figure>
  );
}
