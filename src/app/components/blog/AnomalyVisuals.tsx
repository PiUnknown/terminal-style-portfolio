import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./anomaly-visuals.css";

/* Three native SVG figures for ML Fundamentals #10 (anomaly detection).
 * Same behaviour as the other blog figures: plays only while on screen and while the tab is visible,
 * icon-only pause button top-right, static final state for reduced-motion users, compact labels on narrow screens.
 * Colours come only from the site's theme tokens. Every number is the post's own constructed example. */

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
      className="ad-toggle"
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

const ramp = (p: number, start: number, dur: number) => Math.max(0, Math.min(1, (p - start) / dur));
/** Everything fades out in the last 6% so the loop restarts cleanly. */
const tail = (p: number) => (p > 0.94 ? Math.max(0, (1 - p) / 0.06) : 1);
const fade = (p: number, start: number, dur = 0.04) => ramp(p, start, dur) * tail(p);

function Figure({ name, fig, caption, children }: { name: string; fig: ReturnType<typeof useFigure>; caption: string; children: ReactNode }) {
  return (
    <figure ref={fig.ref} className={`ad-figure ad-${name}${fig.compact ? " ad-compact" : ""}`}>
      {fig.toggle}
      {children}
      <figcaption className="ad-caption">{caption}</figcaption>
    </figure>
  );
}

/* ---------- 1. Isolation: how many random cuts until a point is alone ---------- */

const CROWD = [380, 395, 400, 410, 420, 430, 445, 460];
const AMOUNTS = [...CROWD, 4000];
const CROWD_MIN = 380;
const CROWD_MAX = 460;
const OUTLIER = 4000;
const STEP = 0.15; // fraction of the loop spent on each cut

type Step = { pts: number[]; cut?: number; keep?: "left" | "right" };
// One recorded run per target. Each cut lies between the smallest and largest amount still in play.
const RUN_ANOMALY: Step[] = [
  { pts: AMOUNTS, cut: 2200, keep: "right" },
  { pts: [4000] },
];
const RUN_NORMAL: Step[] = [
  { pts: AMOUNTS, cut: 1500, keep: "left" },
  { pts: [380, 395, 400, 410, 420, 430, 445, 460], cut: 444, keep: "left" },
  { pts: [380, 395, 400, 410, 420, 430], cut: 405, keep: "right" },
  { pts: [410, 420, 430], cut: 425, keep: "left" },
  { pts: [410, 420], cut: 415, keep: "right" },
  { pts: [420] },
];

/** One fixed value axis per row. The empty ₹460–₹4,000 stretch is compressed and
 * marked with a break, so the crowd and the outlier can both be seen at once. */
function axisFor(compact: boolean, W: number) {
  const x0 = compact ? 26 : 60;
  const x1 = W - (compact ? 26 : 60);
  const crowdFrac = compact ? 0.7 : 0.62;
  const crowdEnd = x0 + (x1 - x0) * crowdFrac;
  const breakPad = compact ? 20 : 26;
  const farStart = crowdEnd + breakPad;
  const crowdW = crowdEnd - x0;
  const farW = x1 - farStart;
  const X = (v: number) => (v <= CROWD_MAX
    ? x0 + ((v - CROWD_MIN) / (CROWD_MAX - CROWD_MIN)) * crowdW
    : farStart + ((v - CROWD_MAX) / (OUTLIER - CROWD_MAX)) * farW);
  return { x0, x1, crowdEnd, breakPad, farStart, X };
}

function IsolationRow({ run, target, title, y0, W, p, compact }: { run: Step[]; target: number; title: string; y0: number; W: number; p: number; compact: boolean }) {
  const { x0, x1, crowdEnd, breakPad, farStart, X } = axisFor(compact, W);
  const lineY = y0 + 62;
  const current = Math.min(run.length - 1, Math.floor(p / STEP));
  const done = current === run.length - 1;
  const cuts = run.length - 1;
  // Cut index at which each payment leaves the running set.
  const droppedAt = new Map<number, number>();
  for (let i = 0; i < run.length - 1; i++) {
    const kept = new Set(run[i + 1].pts);
    for (const v of run[i].pts) if (!kept.has(v)) droppedAt.set(v, i);
  }
  const dotR = compact ? 4 : 5;
  const targetR = compact ? 6.5 : 7;
  return (
    <g>
      <text className="ad-label ad-label-main" x={x0} y={y0 + 12}>{title}</text>
      <text className="ad-label ad-label-hot" x={x1} y={y0 + 12} textAnchor="end">{done ? `isolated after ${cuts} cut${cuts === 1 ? "" : "s"}` : `cut ${current + 1} of this run`}</text>
      <line className="ad-axis" x1={x0} y1={lineY} x2={crowdEnd} y2={lineY} />
      <line className="ad-axis" x1={farStart} y1={lineY} x2={x1} y2={lineY} />
      <line className="ad-break" x1={crowdEnd + breakPad * 0.26} y1={lineY - 5} x2={crowdEnd + breakPad * 0.48} y2={lineY + 5} />
      <line className="ad-break" x1={crowdEnd + breakPad * 0.48} y1={lineY - 5} x2={crowdEnd + breakPad * 0.7} y2={lineY + 5} />
      <line className="ad-bracket" x1={x0} y1={lineY + 20} x2={crowdEnd} y2={lineY + 20} />
      <line className="ad-bracket" x1={x0} y1={lineY + 16} x2={x0} y2={lineY + 24} />
      <line className="ad-bracket" x1={crowdEnd} y1={lineY + 16} x2={crowdEnd} y2={lineY + 24} />
      <text className="ad-small" x={(x0 + crowdEnd) / 2} y={lineY + 38} textAnchor="middle">the crowd · ₹380–₹460</text>
      {run.slice(0, -1).map((s, k) => {
        if (s.cut === undefined) return null;
        const alpha = ramp(p, k * STEP, 0.02);
        if (alpha <= 0) return null;
        return (
          <g key={k} opacity={alpha}>
            <line className="ad-cut" x1={X(s.cut)} y1={lineY - 22} x2={X(s.cut)} y2={lineY + 4} />
            <circle className="ad-chip" cx={X(s.cut)} cy={lineY - 32} r={compact ? 7.5 : 8} />
            <text className="ad-chip-text" x={X(s.cut)} y={lineY - 28.5} textAnchor="middle">{k + 1}</text>
          </g>
        );
      })}
      {AMOUNTS.filter((v) => v !== target).map((v) => {
        const at = droppedAt.get(v);
        const m = at === undefined ? 0 : ramp(p, at * STEP + 0.04, 0.05);
        return (
          <circle
            key={v}
            className={`ad-dot${m > 0 ? " ad-dot-off" : ""}`}
            cx={X(v)}
            cy={lineY}
            r={m > 0 ? dotR * 0.9 : dotR}
            opacity={1 - 0.6 * m}
          />
        );
      })}
      <circle className="ad-dot ad-dot-target" cx={X(target)} cy={lineY} r={targetR} />
    </g>
  );
}

export function IsolationSvg({ p, compact, titleId, descId }: { p: number; compact: boolean; titleId?: string; descId?: string }) {
  const W = compact ? 360 : 720;
  const H = 272;
  const o = tail(p);
  return (
    <svg className="ad-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={titleId && descId ? `${titleId} ${descId}` : undefined}>
      <title id={titleId}>Random cuts isolate an odd payment fast and a normal one slowly</title>
      <desc id={descId}>Nine payment amounts on one axis. The empty stretch between 460 and 4,000 rupees is compressed (marked with a break) so the crowded 380 to 460 region stays readable. Every payment stays on screen; payments a cut discards fade to grey, and cuts are numbered in the order they happened. The 4,000 rupee payment is alone after one cut. A payment of 420 rupees inside the crowd needs five cuts in this run; averaged over 20,000 simulated runs it needs about five, against about one for the 4,000 rupee payment.</desc>
      <g opacity={o}>
        <IsolationRow run={RUN_ANOMALY} target={4000} title="payment of ₹4,000" y0={8} W={W} p={p} compact={compact} />
        <IsolationRow run={RUN_NORMAL} target={420} title="payment of ₹420" y0={148} W={W} p={p} compact={compact} />
      </g>
    </svg>
  );
}

export function IsolationAnimation() {
  const fig = useFigure("isolation cuts");
  const titleId = useId();
  const descId = useId();
  return (
    <Figure name="isolation" fig={fig} caption="Constructed example: nine payment amounts. The empty ₹460–₹4,000 stretch is compressed (marked //) so the crowd stays readable. One recorded run per target, cuts numbered in the order they happened: ₹2,200 isolates the ₹4,000 payment; ₹1,500 → ₹444 → ₹405 → ₹425 → ₹415 isolate the ₹420 payment. Averaged over 20,000 simulated runs, that is about 1.0 cut versus 5.0. Discarded payments fade to grey; the target stays yellow.">
      <IsolationSvg p={fig.p} compact={fig.compact} titleId={titleId} descId={descId} />
    </Figure>
  );
}

/* ---------- 2. Reconstruction error: a spike over a threshold, and a bump under it ---------- */

const ERRORS = [0.08, 0.11, 0.07, 0.09, 0.12, 0.06, 0.1, 0.08, 0.22, 0.09, 0.11, 0.07, 0.1, 0.08, 0.09, 0.12, 0.07, 0.1, 0.09, 0.08, 0.11, 0.78, 0.1, 0.07, 0.09, 0.11, 0.08, 0.1, 0.07, 0.09];
const ERR_THRESHOLD = 0.3;

export function ReconstructionSvg({ p, compact, titleId, descId }: { p: number; compact: boolean; titleId?: string; descId?: string }) {
  const W = compact ? 360 : 720;
  const H = compact ? 340 : 360;
  const left = compact ? 54 : 64;
  const right = W - (compact ? 14 : 30);
  const top = 30;
  const bottom = H - 62;
  const X = (i: number) => left + (i / (ERRORS.length - 1)) * (right - left);
  const Y = (v: number) => bottom - v * (bottom - top);
  const reveal = ramp(p, 0.04, 0.5) * (ERRORS.length - 1);
  const shown = Math.floor(reveal);
  let path = "";
  for (let i = 0; i <= shown; i++) path += `${i === 0 ? "M" : "L"}${X(i).toFixed(1)} ${Y(ERRORS[i]).toFixed(1)} `;
  if (shown < ERRORS.length - 1) {
    const f = reveal - shown;
    path += `L${(X(shown) + (X(shown + 1) - X(shown)) * f).toFixed(1)} ${(Y(ERRORS[shown]) + (Y(ERRORS[shown + 1]) - Y(ERRORS[shown])) * f).toFixed(1)}`;
  }
  const o = tail(p);
  return (
    <svg className="ad-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={titleId && descId ? `${titleId} ${descId}` : undefined}>
      <title id={titleId}>Reconstruction error for 30 transactions against a threshold</title>
      <desc id={descId}>Most of the 30 transactions rebuild with errors near 0.1. Transaction 8 reaches 0.22 and stays under the dashed 0.30 threshold. Transaction 21 reaches 0.78, well over the threshold, and is flagged.</desc>
      <g opacity={o}>
        <line className="ad-axis" x1={left} y1={bottom} x2={right} y2={bottom} />
        <line className="ad-axis" x1={left} y1={bottom} x2={left} y2={top} />
        {[0, 0.5, 1].map((v) => (
          <text key={v} className="ad-small" x={left - 6} y={Y(v) + 4} textAnchor="end">{v}</text>
        ))}
        {[0, 15, 29].map((i) => (
          <text key={i} className="ad-small" x={X(i)} y={bottom + 18} textAnchor="middle">{i}</text>
        ))}
        <text className="ad-small" x={(left + right) / 2} y={bottom + 40} textAnchor="middle">transaction number</text>
        <text className="ad-small" transform={`rotate(-90 12 ${(top + bottom) / 2})`} x={12} y={(top + bottom) / 2} textAnchor="middle">reconstruction error</text>
        <path className="ad-curve" d={path} />
      </g>
      <g opacity={fade(p, 0.58, 0.05)}>
        <line className="ad-thresh" x1={left} y1={Y(ERR_THRESHOLD)} x2={right} y2={Y(ERR_THRESHOLD)} />
        <text className="ad-label ad-label-hot" x={compact ? X(8) + 8 : right} y={Y(ERR_THRESHOLD) - 6} textAnchor={compact ? "start" : "end"}>threshold 0.30</text>
      </g>
      <g opacity={fade(p, 0.66, 0.05)}>
        <circle className="ad-marker" cx={X(21)} cy={Y(0.78)} r={9} />
        <text className="ad-label ad-label-hot" x={X(21) - 14} y={Y(0.78) + 4} textAnchor="end">{compact ? "flagged: 0.78" : "flagged: error 0.78"}</text>
      </g>
      <g opacity={fade(p, 0.76, 0.05)}>
        <line className="ad-axis" x1={X(8)} y1={Y(0.22) - 6} x2={X(8)} y2={Y(ERR_THRESHOLD) - 28} />
        <text className="ad-label" x={compact ? X(8) - 6 : X(8)} y={Y(ERR_THRESHOLD) - 34} textAnchor={compact ? "start" : "middle"}>{compact ? "0.22: unflagged" : "0.22: under the line, not flagged"}</text>
      </g>
    </svg>
  );
}

export function ReconstructionAnimation() {
  const fig = useFigure("reconstruction error");
  const titleId = useId();
  const descId = useId();
  return (
    <Figure name="reconstruction" fig={fig} caption="Constructed values for 30 transactions. The autoencoder was trained on normal payments only. The spike at transaction 21 crosses the threshold and is flagged; the milder 0.22 bump does not, so a detector this size would miss a subtle oddity. The threshold itself would be chosen on held-out data.">
      <ReconstructionSvg p={fig.p} compact={fig.compact} titleId={titleId} descId={descId} />
    </Figure>
  );
}

/* ---------- 3. Threshold tradeoff: 10,000 payments, 20 real frauds ---------- */

// Flagged payments, true frauds among them, precision, recall. 20 frauds in 10,000 payments.
const STEPS = [
  { name: "strict", flagged: 10, caught: 8 },
  { name: "medium", flagged: 40, caught: 14 },
  { name: "loose", flagged: 100, caught: 16 },
  { name: "very loose", flagged: 400, caught: 18 },
];
const TOTAL_FRAUD = 20;
const THRESH_X = [0.8, 0.7, 0.6, 0.48]; // schematic positions along the score axis, 0 = low score, 1 = high

export function ThresholdSvg({ p, compact, titleId, descId }: { p: number; compact: boolean; titleId?: string; descId?: string }) {
  const W = compact ? 360 : 720;
  const H = 392;
  const left = compact ? 20 : 40;
  const right = W - left;
  const base = 190;
  const X = (u: number) => left + u * (right - left);
  const idx = Math.min(3, Math.floor(p / 0.2));
  const s = STEPS[idx];
  const prec = (s.caught / s.flagged) * 100;
  const rec = (s.caught / TOTAL_FRAUD) * 100;
  const hill = (c: number, w: number, h: number) => {
    let d = `M${X(0)} ${base}`;
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      d += ` L${X(u).toFixed(1)} ${(base - h * Math.exp(-((u - c) ** 2) / (2 * w * w))).toFixed(1)}`;
    }
    return d + ` L${X(1)} ${base} Z`;
  };
  const tx = X(THRESH_X[idx]);
  const o = tail(p);
  const fmt = (v: number) => (Number.isInteger(v) ? `${v}%` : `${v.toFixed(1)}%`);
  return (
    <svg className="ad-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={titleId && descId ? `${titleId} ${descId}` : undefined}>
      <title id={titleId}>Sliding the alert threshold trades precision against recall</title>
      <desc id={descId}>Schematic score hills for 10,000 payments, 20 of them real fraud. As the threshold slides from strict to very loose, flagged payments go 10, 40, 100, 400; precision goes 80, 35, 16, 4.5 percent; recall goes 40, 70, 80, 90 percent.</desc>
      <g opacity={o}>
        <path className="ad-hill-normal" d={hill(0.3, 0.13, 120)} />
        <path className="ad-hill-fraud" d={hill(0.76, 0.09, 40)} />
        <line className="ad-axis" x1={left} y1={base} x2={right} y2={base} />
        <text className="ad-small" x={left} y={base + 18} textAnchor="start">low anomaly score</text>
        <text className="ad-small" x={right} y={base + 18} textAnchor="end">high anomaly score</text>
        <text className="ad-small ad-legend-main" x={left} y={base + 36} textAnchor="start">green: normal payments</text>
        <text className="ad-small ad-legend-hot" x={right} y={base + 36} textAnchor="end">yellow: real fraud</text>
        <rect className="ad-flagged" x={tx} y={base - 150} width={right - tx} height={150} />
        <line className="ad-thresh" x1={tx} y1={base - 156} x2={tx} y2={base + 6} />
        <text className="ad-label ad-label-hot" x={tx} y={base - 162} textAnchor="middle">{`${s.name} threshold`}</text>
        <g>
          <text className="ad-stat" x={left} y={base + 70}>{`flagged: ${s.flagged}`}</text>
          <text className="ad-stat" x={left} y={base + 94}>{`real fraud among them: ${s.caught} of ${TOTAL_FRAUD}`}</text>
          <text className="ad-stat ad-stat-main" x={left} y={base + 124}>{`precision ${s.caught}/${s.flagged} = ${fmt(prec)}`}</text>
          <text className="ad-stat ad-stat-hot" x={left} y={base + 148}>{`recall ${s.caught}/${TOTAL_FRAUD} = ${fmt(rec)}`}</text>
          <text className="ad-small" x={left} y={base + 176}>{compact ? "always saying normal: 99.8% accurate, 0% recall" : "for comparison, always saying \"normal\": 99.8% accurate, 0% recall"}</text>
        </g>
      </g>
    </svg>
  );
}

export function ThresholdAnimation() {
  const fig = useFigure("threshold tradeoff");
  const titleId = useId();
  const descId = useId();
  return (
    <Figure name="threshold" fig={fig} caption="Constructed example: 10,000 payments, 20 of them real fraud. The hills are a schematic of anomaly scores, not to scale (fraud is 0.2% of payments). The four counts are the post's worked numbers.">
      <ThresholdSvg p={fig.p} compact={fig.compact} titleId={titleId} descId={descId} />
    </Figure>
  );
}
