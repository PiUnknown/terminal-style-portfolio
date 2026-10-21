import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./evaluation-visuals.css";

/* Three native SVG figures for ML Fundamentals #7 (evaluation and overfitting).
 * Same behaviour as the other blog figures: plays only while on screen and while the tab is visible,
 * icon-only pause button top-right, static final state for reduced-motion users, vertical-friendly
 * layout on narrow screens. Colours come only from the site's theme tokens.
 * Numbers in OverfitFitAnimation and CrossValidationAnimation are the post's own. The complexity curve
 * is an illustration of a shape and says so on the figure. */

const PERIOD = 14000; // ms per loop

function useFigure(pauseLabel: string) {
  const ref = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.innerWidth < 540);
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
    const resize = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 540));
    resize.observe(el);
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => setReduced(media.matches);
    const onVis = () => setPageVisible(!document.hidden);
    media.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      resize.disconnect();
      io.disconnect();
      media.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (reduced) { setP(0.9); return; }
    if (!running) return;
    let raf = 0;
    let last: number | null = null;
    let elapsed = started.current ? p * PERIOD : 0; // first play starts at the beginning, later resumes
    started.current = true;
    const tick = (now: number) => {
      if (last !== null) elapsed = (elapsed + Math.min(now - last, 100)) % PERIOD;
      last = now;
      setP(elapsed / PERIOD);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, reduced]);

  const toggle = reduced ? null : (
    <button
      className="ev-toggle"
      type="button"
      onClick={() => setPaused((v) => !v)}
      aria-label={paused ? `Play ${pauseLabel} animation` : `Pause ${pauseLabel} animation`}
      title={paused ? "Play animation" : "Pause animation"}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        {paused ? <path d="M7 4.5 15 10l-8 5.5z" /> : <><path d="M7 4v12" /><path d="M13 4v12" /></>}
      </svg>
    </button>
  );
  return { ref, compact, p, toggle };
}

/** 0 before `start`, 1 after `start + dur`, linear between. */
const ramp = (p: number, start: number, dur: number) => Math.max(0, Math.min(1, (p - start) / dur));
/** Everything fades out in the last 6% so the loop restarts cleanly. */
const tail = (p: number) => (p > 0.94 ? Math.max(0, (1 - p) / 0.06) : 1);
const fade = (p: number, start: number, dur = 0.04) => ramp(p, start, dur) * tail(p);

function Figure({ name, fig, caption, children }: { name: string; fig: ReturnType<typeof useFigure>; caption: string; children: ReactNode }) {
  return (
    <figure ref={fig.ref} className={`ev-figure ev-${name}${fig.compact ? " ev-compact" : ""}`}>
      {fig.toggle}
      {children}
      <figcaption className="ev-caption">{caption}</figcaption>
    </figure>
  );
}

/* ---------- 1. Curve through every point vs a straight line ---------- */

const KM = [1, 2, 3, 4, 5, 6];
// Six deliberately noisy training orders (whole minutes).
const MIN = [16, 14, 24, 28, 28, 37];
// Three kept-aside orders: two inside the training range, one at 7 km.
const HELD: [number, number][] = [[2.5, 22], [4.5, 31], [7, 40]];
// Degree-5 curve through all six points = Lagrange interpolation (same polynomial as np.polyfit(km, minutes, 5)).
const curveA = (x: number) =>
  KM.reduce((sum, xi, i) => sum + MIN[i] * KM.reduce((prod, xj, j) => (i === j ? prod : prod * (x - xj) / (xi - xj)), 1), 0);
// Least-squares line: 9.4 + 4.314... x km (slope 151/35).
const lineB = (x: number) => 9.4 + (151 / 35) * x;
const fmt = (v: number) => v.toFixed(1);

export function OverfitFitAnimation() {
  const fig = useFigure("overfit comparison");
  const { compact, p } = fig;
  const titleId = useId();
  const descId = useId();
  const clipId = `${titleId}-clip`;
  const W = compact ? 360 : 720, H = compact ? 460 : 440;
  const L = compact ? 42 : 52, R = compact ? 12 : 20, T = 16, B = compact ? 188 : 154;
  const X0 = 0.5, X1 = 7.4, Y1 = 80;
  const sx = (x: number) => L + ((x - X0) / (X1 - X0)) * (W - L - R);
  const sy = (y: number) => T + (1 - y / Y1) * (H - T - B);
  const pts = (f: (x: number) => number, a: number, b: number) =>
    Array.from({ length: Math.round((b - a) / 0.05) + 1 }, (_, i) => a + i * 0.05).map((x, i) => `${i ? "L" : "M"}${sx(x).toFixed(1)} ${sy(f(x)).toFixed(1)}`).join("");
  const pathB = pts(lineB, 0.7, 7.3);
  const pathA = pts(curveA, 1, 7.3);
  const a2 = ramp(p, 0.2, 0.12), a3 = ramp(p, 0.38, 0.14), tl = tail(p);
  const bottom = H - B;
  const legendY = bottom + 58;
  const tableY = bottom + (compact ? 108 : 88);
  const held = HELD.map(([x, truth]) => {
    const a = curveA(x), b = lineB(x);
    return { x, truth, a, b, am: Math.abs(a - truth), bm: Math.abs(b - truth) };
  });
  return (
    <Figure name="fit" fig={fig} caption="Deliberately constructed teaching example, not measured performance. Both models are fitted on the six filled dots only; the three hollow dots were never used for fitting. Values are minutes, and miss is the absolute error.">
      <svg className="ev-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>A degree-5 curve through six noisy training points versus a straight line</title>
        <desc id={descId}>Deliberately constructed teaching example. Six training orders from 1 to 6 km took 16, 14, 24, 28, 28 and 37 minutes. A degree-5 curve passes through all six. A least-squares line, 9.4 plus 4.31 times km, misses them by up to 4 minutes. Three kept-aside orders: 2.5 km took 22 minutes (curve says 19.2, line says 20.2), 4.5 km took 31 (curve 27.8, line 28.8), and 7 km took 40 (curve 70, line 39.6).</desc>
        <defs><clipPath id={clipId}><rect x={L} y={T} width={W - L - R} height={bottom - T} /></clipPath></defs>
        {[0, 20, 40, 60, 80].map((v) => (
          <g key={v}>
            <line className="ev-grid" x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} />
            <text className="ev-small" x={L - 8} y={sy(v) + 4} textAnchor="end">{v}</text>
          </g>
        ))}
        {[1, 2, 3, 4, 5, 6, 7].map((v) => <text key={v} className="ev-small" x={sx(v)} y={bottom + 18} textAnchor="middle">{v}</text>)}
        <text className="ev-small" x={(L + W - R) / 2} y={bottom + 36} textAnchor="middle">distance (km)</text>
        <text className="ev-small" textAnchor="middle" transform={`translate(${L - (compact ? 27 : 38)} ${(T + bottom) / 2}) rotate(-90)`}>minutes</text>

        <g clipPath={`url(#${clipId})`}>
          <path className="ev-line-b" d={pathB} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - a2} opacity={tl} />
          <path className="ev-line-a" d={pathA} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - a3} opacity={tl} />
        </g>
        {KM.map((x, i) => <circle key={x} className="ev-dot-train" cx={sx(x)} cy={sy(MIN[i])} r={4.5} />)}

        {!compact && (
          <>
            <g opacity={fade(p, 0.2, 0.06)}>
              <text className="ev-label ev-label-b" x={sx(0.8)} y={sy(lineB(0.8)) + 22}>B: line</text>
            </g>
            <g opacity={fade(p, 0.38, 0.06)}>
              <text className="ev-label ev-label-a" x={sx(1.25)} y={sy(46)}>A: degree-5 curve</text>
            </g>
          </>
        )}
        <g opacity={fade(p, 0.6)}>
          {HELD.map(([x, y]) => <circle key={x} className="ev-dot-held" cx={sx(x)} cy={sy(y)} r={5} />)}
          <text className="ev-small" x={sx(2.5)} y={sy(22) - 12} textAnchor="middle">2.5 km</text>
          <text className="ev-small" x={sx(4.5)} y={sy(31) - 12} textAnchor="middle">4.5 km</text>
        </g>
        <g opacity={fade(p, 0.76)}>
          <line className="ev-miss" x1={sx(7)} x2={sx(7)} y1={sy(40)} y2={sy(70)} />
          <text className="ev-label ev-label-a" x={sx(7) - (compact ? 2 : 8)} y={sy(70) - 6} textAnchor="end">A says {fmt(curveA(7))}</text>
          {!compact && (
            <>
              <text className="ev-label ev-label-held" x={W - R} y={sy(40) + 20} textAnchor="end">truth: 40</text>
              <text className="ev-label ev-label-b" x={W - R} y={sy(40) + 38} textAnchor="end">B says {fmt(lineB(7))}</text>
            </>
          )}
        </g>

        <g className="ev-legend">
          <circle className="ev-dot-train" cx={L + 6} cy={legendY} r={4.5} />
          <text className="ev-small" x={L + 18} y={legendY + 4}>training order</text>
          <circle className="ev-dot-held" cx={compact ? L + 141 : L + 133} cy={compact ? legendY : legendY} r={5} />
          <text className="ev-small" x={compact ? L + 153 : L + 145} y={legendY + 4}>held out</text>
          <line className="ev-key ev-line-a" x1={compact ? L : L + 213} x2={compact ? L + 22 : L + 235} y1={compact ? legendY + 18 : legendY} y2={compact ? legendY + 18 : legendY} />
          <text className="ev-small" x={compact ? L + 28 : L + 241} y={(compact ? legendY + 18 : legendY) + 4}>A: degree-5 curve</text>
          <line className="ev-key ev-line-b" x1={compact ? L + 175 : L + 383} x2={compact ? L + 197 : L + 405} y1={compact ? legendY + 18 : legendY} y2={compact ? legendY + 18 : legendY} />
          <text className="ev-small" x={compact ? L + 203 : L + 411} y={(compact ? legendY + 18 : legendY) + 4}>B: line</text>
        </g>

        <g opacity={fade(p, 0.86)}>
          <text className="ev-cell-text" x={compact ? 34 : L} y={tableY}>held out</text>
          <text className="ev-cell-text" x={compact ? 132 : 150} y={tableY} textAnchor={compact ? "end" : "start"}>truth</text>
          <text className="ev-cell-text" x={compact ? 140 : 240} y={tableY}>A pred/miss</text>
          <text className="ev-cell-text" x={compact ? 232 : 460} y={tableY}>B pred/miss</text>
          {held.map((h, i) => (
            <g key={h.x}>
              <text className="ev-cell-text" x={compact ? 34 : L} y={tableY + 18 + i * 18}>{h.x} km</text>
              <text className="ev-cell-text" x={compact ? 132 : 150} y={tableY + 18 + i * 18} textAnchor={compact ? "end" : "start"}>{h.truth}</text>
              <text className="ev-cell-text" x={compact ? 140 : 240} y={tableY + 18 + i * 18}>{fmt(h.a)} / {fmt(h.am)}</text>
              <text className="ev-cell-text" x={compact ? 232 : 460} y={tableY + 18 + i * 18}>{fmt(h.b)} / {fmt(h.bm)}</text>
            </g>
          ))}
        </g>
      </svg>
    </Figure>
  );
}

/* ---------- 2. Training and held-out error as complexity grows (illustrative shape) ---------- */

const TRAIN: [number, number][] = [[1, .55], [2, .38], [3, .26], [4, .18], [5, .12], [6, .08], [7, .05], [8, .035], [9, .025], [10, .02]];
const TEST: [number, number][] = [[1, .58], [2, .42], [3, .32], [4, .27], [5, .25], [6, .27], [7, .32], [8, .4], [9, .5], [10, .62]];

function smooth(points: [number, number][]) {
  // Catmull-Rom to cubic Bezier.
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export function ComplexityCurveAnimation() {
  const fig = useFigure("complexity and error");
  const { compact, p } = fig;
  const titleId = useId();
  const descId = useId();
  const W = compact ? 360 : 720, H = compact ? 380 : 360;
  const L = compact ? 38 : 44, R = compact ? 12 : 24, T = 20, B = compact ? 78 : 70;
  const sx = (x: number) => L + ((x - 1) / 9) * (W - L - R);
  const sy = (y: number) => T + (1 - y / 0.7) * (H - T - B);
  const bottom = H - B;
  const trainPath = smooth(TRAIN.map(([x, y]) => [sx(x), sy(y)]));
  const testPath = smooth(TEST.map(([x, y]) => [sx(x), sy(y)]));
  const draw = ramp(p, 0.06, 0.34), tl = tail(p);
  const sweetX = sx(5), endX = sx(10);
  const legendY = bottom + 44;
  return (
    <Figure name="curve" fig={fig} caption="Illustrative shape only, not measured data. Real held-out curves can be bumpy.">
      <svg className="ev-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>Training error and held-out error as model complexity grows</title>
        <desc id={descId}>Illustration. Training error keeps falling as complexity rises. Held-out error falls, reaches a low point in the middle, then rises again. The gap on the right is overfitting.</desc>
        <line className="ev-axis" x1={L} x2={L} y1={T} y2={bottom} />
        <line className="ev-axis" x1={L} x2={W - R} y1={bottom} y2={bottom} />
        <text className="ev-small" textAnchor="middle" transform={`translate(${L - 22} ${(T + bottom) / 2}) rotate(-90)`}>error</text>
        <text className="ev-small" x={(L + W - R) / 2} y={bottom + 22} textAnchor="middle">model complexity: simple to flexible</text>

        <g opacity={fade(p, 0.42)}>
          <line className="ev-sweet" x1={sweetX} x2={sweetX} y1={T + 4} y2={bottom} />
        </g>
        <path className="ev-line-b" d={trainPath} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} opacity={tl} />
        <path className="ev-line-held" d={testPath} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} opacity={tl} />

        <g opacity={fade(p, 0.42)}>
          <text className="ev-label ev-label-b" x={sweetX} y={T + 2} textAnchor="middle">sweet spot</text>
        </g>
        <g opacity={fade(p, 0.52)}>
          <text className="ev-label" x={sx(1.2)} y={sy(0.12)} textAnchor="start">underfitting</text>
          <text className="ev-small" x={sx(1.2)} y={sy(0.12) + 16} textAnchor="start">both errors high</text>
        </g>
        <g opacity={fade(p, 0.62)}>
          <text className="ev-label" x={endX - 10} y={sy(0.22)} textAnchor="end">overfitting</text>
          <text className="ev-small" x={endX - 10} y={sy(0.22) + 16} textAnchor="end">training keeps falling,</text>
          <text className="ev-small" x={endX - 10} y={sy(0.22) + 32} textAnchor="end">held-out climbs</text>
        </g>
        <g opacity={fade(p, 0.74)}>
          <line className="ev-miss" x1={endX - 2} x2={endX - 2} y1={sy(0.62) + 2} y2={sy(0.02) - 2} />
        </g>

        <g className="ev-legend">
          <line className="ev-key ev-line-b" x1={L} x2={L + 22} y1={legendY} y2={legendY} />
          <text className="ev-small" x={L + 30} y={legendY + 4}>training error</text>
          <line className="ev-key ev-line-held" x1={compact ? L : L + 160} x2={compact ? L + 22 : L + 182} y1={compact ? legendY + 20 : legendY} y2={compact ? legendY + 20 : legendY} />
          <text className="ev-small" x={compact ? L + 30 : L + 190} y={(compact ? legendY + 20 : legendY) + 4}>held-out error</text>
        </g>
      </svg>
    </Figure>
  );
}

/* ---------- 3. Five-fold cross-validation, one round at a time ---------- */

const SCORES = ["0.80", "0.84", "0.78", "0.82", "0.86"];

export function CrossValidationAnimation() {
  const fig = useFigure("cross-validation");
  const { compact, p } = fig;
  const titleId = useId();
  const descId = useId();
  const W = compact ? 360 : 720;
  const labelW = compact ? 44 : 84, scoreW = compact ? 52 : 110;
  const gap = 4;
  const cellW = (W - labelW - scoreW - gap * 4) / 5;
  const rowH = compact ? 42 : 44, top = 34, cellH = compact ? 30 : 30;
  const H = top + rowH * 5 + (compact ? 96 : 76);
  const avgY = top + rowH * 5 + 22;
  return (
    <Figure name="cv" fig={fig} caption="The five scores are the hand-traced example in this post.">
      <svg className="ev-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>Five-fold cross-validation</title>
        <desc id={descId}>The data is cut into five folds. In each of five rounds one fold is held out for testing and the other four train the model. The scores are 0.80, 0.84, 0.78, 0.82 and 0.86, which average to 0.82.</desc>
        {[0, 1, 2, 3, 4].map((f) => (
          <text key={f} className="ev-small" x={labelW + f * (cellW + gap) + cellW / 2} y={16} textAnchor="middle">{compact ? `f${f + 1}` : `fold ${f + 1}`}</text>
        ))}
        <text className="ev-small" x={compact ? W : labelW + 5 * (cellW + gap) - gap + 14} y={16} textAnchor={compact ? "end" : "start"}>score</text>
        {SCORES.map((score, r) => {
          const start = 0.06 + r * 0.13;
          const y = top + r * rowH;
          const opacity = fade(p, start);
          const scoreOpacity = fade(p, start + 0.06);
          return (
            <g key={r}>
              <g opacity={opacity}>
                <text className="ev-small" x={0} y={y + cellH / 2 + 4}>{compact ? `#${r + 1}` : `round ${r + 1}`}</text>
                {[0, 1, 2, 3, 4].map((f) => (
                  <g key={f}>
                    <rect className={f === r ? "ev-cell-test" : "ev-cell-train"} x={labelW + f * (cellW + gap)} y={y} width={cellW} height={cellH} />
                    <text className={f === r ? "ev-cell-text ev-cell-text-test" : "ev-cell-text"} x={labelW + f * (cellW + gap) + cellW / 2} y={y + cellH / 2 + 4} textAnchor="middle">{f === r ? "test" : "train"}</text>
                  </g>
                ))}
              </g>
              <text className="ev-score" opacity={scoreOpacity} x={compact ? W : labelW + 5 * (cellW + gap) - gap + 14} textAnchor={compact ? "end" : "start"} y={y + cellH / 2 + 5}>{score}</text>
            </g>
          );
        })}
        <g opacity={fade(p, 0.78)}>
          <line className="ev-grid" x1={0} x2={W} y1={avgY - 12} y2={avgY - 12} />
          {compact ? (
            <>
              <text className="ev-label ev-label-b" x={0} y={avgY + 8}>average = 4.10 / 5 = 0.82</text>
              <text className="ev-small" x={0} y={avgY + 30}>scores range from 0.78 to 0.86</text>
              <text className="ev-small" x={0} y={avgY + 50}>every row is tested exactly once</text>
            </>
          ) : (
            <>
              <text className="ev-label ev-label-b" x={0} y={avgY + 8}>average = (0.80 + 0.84 + 0.78 + 0.82 + 0.86) / 5 = 0.82</text>
              <text className="ev-small" x={0} y={avgY + 30}>scores range from 0.78 to 0.86, and every row is tested exactly once</text>
            </>
          )}
        </g>
      </svg>
    </Figure>
  );
}

