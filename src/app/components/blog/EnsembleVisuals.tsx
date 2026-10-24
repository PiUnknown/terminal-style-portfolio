import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./ensemble-visuals.css";

/* Two native SVG figures for ML Fundamentals #8 (ensemble methods).
 * Same behaviour as the other blog figures: plays only while on screen and while the tab is visible,
 * icon-only pause button top-right, static final state for reduced-motion users, vertical-friendly
 * layout on narrow screens. Colours come only from the site's theme tokens.
 * Every number in both figures is the post's own constructed fest-footfall example. */

const PERIOD = 12000; // ms per loop

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
      className="ens-toggle"
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
    <figure ref={fig.ref} className={`ens-figure ens-${name}${fig.compact ? " ens-compact" : ""}`}>
      {fig.toggle}
      {children}
      <figcaption className="ens-caption">{caption}</figcaption>
    </figure>
  );
}

/* ---------- 1. Bagging: five trees vote, the average wins ---------- */

// The post's five committee guesses and their average. Actual turnout: 890.
const GUESSES = [820, 940, 710, 1010, 880];
const AVG = 872;
const ACTUAL = 890;
const ENS_MISS = 18;
const SINGLE_MISS = 86;

// Timeline: the whole pipeline is on screen before the predictions start moving, so the
// figure never reads as half-built while a pulse is travelling.
const PULSE_START = 0.16;
const PULSE_STAGGER = 0.05;
const PULSE_DUR = 0.18;
const ARRIVALS = GUESSES.map((_, i) => PULSE_START + i * PULSE_STAGGER + PULSE_DUR);
const VALUE_AT = ARRIVALS[ARRIVALS.length - 1] + 0.02;

/** Point on a quadratic Bezier at t. */
const quad = (p0: [number, number], c: [number, number], p1: [number, number], t: number): [number, number] => [
  (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
  (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1],
];

export function VotingFlowAnimation() {
  const fig = useFigure("ensemble vote");
  const { compact, p } = fig;
  const titleId = useId();
  const descId = useId();
  const W = compact ? 360 : 720;
  const H = compact ? 560 : 430;
  const tl = tail(p);

  // Geometry: model boxes on the left (top on compact), combiner right (below on compact).
  const boxW = compact ? 150 : 168;
  const boxH = compact ? 40 : 46;
  const gap = compact ? 18 : 26;
  const stackX = compact ? (W - boxW) / 2 : 30;
  const stackY = compact ? 34 : (H - 5 * boxH - 4 * gap) / 2 - 6;
  const combiner: [number, number] = compact ? [W / 2, 356] : [W - 250, H / 2 - 8];
  const outBox: [number, number] = compact ? [W / 2, 470] : [W - 96, H / 2 - 8];

  const boxes = GUESSES.map((g, i) => {
    const x = stackX;
    const y = stackY + i * (boxH + gap);
    return { g, i, x, y, cx: x + boxW, cy: y + boxH / 2 };
  });

  const paths = boxes.map((b) => {
    // Compact: leave each box on the right and fan down the gutter, so the wires never
    // look like a single chain running through the stack (these models are independent).
    const start: [number, number] = compact ? [b.x + boxW - 2, b.cy] : [b.cx, b.cy];
    const end: [number, number] = compact ? [combiner[0] + 18, combiner[1] - 24] : [combiner[0] - 30, combiner[1]];
    const ctrl: [number, number] = compact
      ? [b.x + boxW + 78, b.cy]
      : [(start[0] + end[0]) / 2, start[1]];
    return { b, start, ctrl, end };
  });

  // Progress feedback while pulses are in flight: how many predictions have landed.
  const collected = ARRIVALS.filter((a) => p >= a).length;
  const progress = fade(p, 0.12, 0.03) * (1 - ramp(p, VALUE_AT, 0.03));
  const outReady = ramp(p, VALUE_AT, 0.04);

  return (
    <Figure name="vote" fig={fig} caption="The post's constructed example. Five small trees, each trained on a different bootstrap sample, predict the fest footfall independently; the ensemble averages their five predictions. Values are people.">
      <svg className="ens-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>Five model predictions flow into an average</title>
        <desc id={descId}>Five trees trained on different bootstrap samples predict 820, 940, 710, 1010 and 880 people. Their predictions travel into an averaging step that outputs 872. The actual turnout is 890, so the ensemble misses by 18 while the average single-model miss is 86.</desc>

        {/* connectors */}
        {paths.map(({ start, ctrl, end }, i) => (
          <path
            key={i}
            className="ens-wire"
            d={`M${start[0]} ${start[1]} Q${ctrl[0]} ${ctrl[1]} ${end[0]} ${end[1]}`}
            opacity={fade(p, 0.08 + i * 0.01)}
          />
        ))}

        {/* model boxes */}
        {boxes.map((b, i) => (
          <g key={i} opacity={fade(p, 0.01 + i * 0.02)}>
            <rect className="ens-box" x={b.x} y={b.y} width={boxW} height={boxH} rx={6} />
            <text className="ens-small" x={b.x + 10} y={b.y + (compact ? 16 : 17)}>tree {i + 1} · sample {String.fromCharCode(65 + i)}</text>
            <text className="ens-num" x={b.x + 10} y={b.y + boxH - 10}>{b.g}</text>
          </g>
        ))}

        {/* travelling pulses */}
        {paths.map(({ start, ctrl, end }, i) => {
          const t = ramp(p, PULSE_START + i * PULSE_STAGGER, PULSE_DUR);
          if (t <= 0 || t >= 1) return null;
          const [x, y] = quad(start, ctrl, end, t);
          return <circle key={i} className="ens-pulse" cx={x} cy={y} r={5} opacity={tl} />;
        })}

        {/* combiner */}
        <g opacity={fade(p, 0.08)}>
          <circle className="ens-combiner" cx={combiner[0]} cy={combiner[1]} r={30} />
          <text className="ens-combiner-text" x={combiner[0]} y={combiner[1] + 4} textAnchor="middle">avg</text>
        </g>

        {/* arrival rings: each pulse that lands registers on the combiner */}
        {ARRIVALS.map((a, i) => {
          const t = (p - a) / 0.03;
          if (t < 0 || t > 1) return null;
          return <circle key={i} className="ens-arrival" cx={combiner[0]} cy={combiner[1]} r={30 + t * 14} opacity={(1 - t) * 0.6} />;
        })}

        {/* running count, so the waiting phase has a visible purpose */}
        <text
          className="ens-small ens-progress"
          x={combiner[0]}
          y={combiner[1] + 52}
          textAnchor="middle"
          opacity={progress}
        >
          {collected} / {GUESSES.length} collected
        </text>

        {/* wire to output */}
        <line
          className="ens-wire"
          x1={compact ? combiner[0] : combiner[0] + 30}
          y1={compact ? combiner[1] + 30 : combiner[1]}
          x2={compact ? outBox[0] : outBox[0] - 56}
          y2={compact ? outBox[1] - 24 : outBox[1]}
          opacity={fade(p, 0.12)}
        />

        {/* output frame: present from the start, pending until every prediction has landed */}
        <g opacity={fade(p, 0.12)}>
          <rect className="ens-box ens-box-out" x={outBox[0] - 56} y={outBox[1] - 24} width={112} height={48} rx={6} />
          <text className="ens-small" x={outBox[0]} y={outBox[1] - 6} textAnchor="middle">ensemble</text>
          <text className="ens-num ens-pending" x={outBox[0]} y={outBox[1] + 16} textAnchor="middle" opacity={1 - outReady}>—</text>
          <g opacity={outReady} transform={`translate(0 ${(1 - outReady) * 5})`}>
            <text className="ens-num ens-num-out" x={outBox[0]} y={outBox[1] + 16} textAnchor="middle">{AVG}</text>
          </g>
        </g>

        {/* verdict */}
        <g opacity={fade(p, 0.7)}>
          <text className="ens-small" x={compact ? W / 2 : W - 20} y={outBox[1] + 52} textAnchor={compact ? "middle" : "end"}>
            actual: {ACTUAL} · ensemble miss: {ENS_MISS}
          </text>
          <text className="ens-small" x={compact ? W / 2 : W - 20} y={outBox[1] + 70} textAnchor={compact ? "middle" : "end"}>
            average single-model miss: {SINGLE_MISS}
          </text>
        </g>
      </svg>
    </Figure>
  );
}

/* ---------- 2. Boosting: each round hops closer to the truth ---------- */

// The post's residual chase: base 600, then +240, +35, +12 toward the actual 890.
const HOPS = [
  { total: 600, corr: null as number | null, resid: 290 },
  { total: 840, corr: 240, resid: 50 },
  { total: 875, corr: 35, resid: 15 },
  { total: 887, corr: 12, resid: 3 },
];
const BOOST_ACTUAL = 890;

export function BoostingRoundsAnimation() {
  const fig = useFigure("boosting rounds");
  const { compact, p } = fig;
  const titleId = useId();
  const descId = useId();
  const W = compact ? 360 : 720;
  const H = compact ? 470 : 400;
  const L = compact ? 34 : 60, R = compact ? 26 : 48;
  const lineY = compact ? 120 : 110;
  const X0 = 540, X1 = 920;
  const sx = (v: number) => L + ((v - X0) / (X1 - X0)) * (W - L - R);
  const tl = tail(p);

  // Residual bars: square-root scale so the small ones stay visible.
  const barBase = H - (compact ? 66 : 60);
  const barH = (r: number) => Math.sqrt(r / 290) * (compact ? 120 : 130);
  const barW = compact ? 44 : 60;

  // Dot position: hops at p 0.20-0.36, 0.42-0.56, 0.62-0.72.
  const hopT = [ramp(p, 0.2, 0.16), ramp(p, 0.42, 0.14), ramp(p, 0.62, 0.1)];
  const seg = (a: number, b: number, t: number) => a + (b - a) * t;
  let dotV = HOPS[0].total;
  if (hopT[2] > 0) dotV = seg(HOPS[2].total, HOPS[3].total, hopT[2]);
  else if (hopT[1] > 0) dotV = seg(HOPS[1].total, HOPS[2].total, hopT[1]);
  else if (hopT[0] > 0) dotV = seg(HOPS[0].total, HOPS[1].total, hopT[0]);
  // Small arc lift while mid-hop.
  const midHop = hopT.some((t) => t > 0 && t < 1);
  const activeT = hopT.find((t) => t > 0 && t < 1) ?? 1;
  const lift = midHop ? Math.sin(activeT * Math.PI) * 26 : 0;

  return (
    <Figure name="boost" fig={fig} caption="The post's constructed example. Each boosting round adds a correction to the running total, so the prediction hops toward the actual turnout in smaller and smaller steps. Residual bars use a square-root scale so the small ones stay visible. Values are people.">
      <svg className="ens-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>Boosting rounds converge on the actual value</title>
        <desc id={descId}>A marker starts at the base guess 600, far from the actual turnout 890. Round by round it hops closer: +240 to 840, then +35 to 875, then +12 to 887. The leftover residual shrinks each round: 290, then 50, then 15, then 3.</desc>

        {/* number line */}
        <line className="ens-axis" x1={L} x2={W - R} y1={lineY} y2={lineY} opacity={fade(p, 0.02)} />
        {[600, 700, 800].map((v) => (
          <g key={v} opacity={fade(p, 0.02)}>
            <line className="ens-axis" x1={sx(v)} x2={sx(v)} y1={lineY - 5} y2={lineY + 5} />
            <text className="ens-small" x={sx(v)} y={lineY + 22} textAnchor="middle">{v}</text>
          </g>
        ))}

        {/* actual marker */}
        <g opacity={fade(p, 0.06)}>
          <line className="ens-truth" x1={sx(BOOST_ACTUAL)} x2={sx(BOOST_ACTUAL)} y1={lineY - 34} y2={lineY + 34} />
          <text className="ens-label ens-label-truth" x={sx(BOOST_ACTUAL) - 6} y={lineY - (compact ? 64 : 42)} textAnchor="end">actual: {BOOST_ACTUAL}</text>
        </g>

        {/* correction labels above each hop */}
        {HOPS.slice(1).map((h, i) => {
          const from = sx(HOPS[i].total);
          const to = sx(h.total);
          return (
            <g key={i} opacity={fade(p, [0.2, 0.42, 0.62][i])}>
              <path className="ens-hop" d={`M${from} ${lineY} Q${(from + to) / 2} ${lineY - 34} ${to} ${lineY}`} />
              <text className="ens-label ens-label-hop" x={(from + to) / 2} y={lineY - (compact ? [46, 32, 16][i] : [40, 22, 18][i])} textAnchor="middle">+{h.corr}</text>
            </g>
          );
        })}

        {/* running totals below the line */}
        {HOPS.map((h, i) => (
          <text
            key={i}
            className="ens-label ens-label-total"
            x={sx(h.total)}
            y={lineY + 46 + (compact ? i * 20 : i === 3 ? 20 : 0)}
            textAnchor="middle"
            opacity={fade(p, [0.02, 0.36, 0.56, 0.72][i])}
          >
            {h.total}
          </text>
        ))}

        {/* the prediction marker */}
        <g opacity={tl}>
          <circle className="ens-dot" cx={sx(dotV)} cy={lineY - lift} r={7} />
        </g>
        <text className="ens-label ens-label-total" x={sx(HOPS[0].total)} y={lineY - 16} textAnchor="middle" opacity={fade(p, 0.02)}>
          base guess
        </text>

        {/* residual bars */}
        <text className="ens-small" x={L} y={barBase - (compact ? 145 : 158)} opacity={fade(p, 0.1)}>residual left after each round</text>
        {HOPS.map((h, i) => {
          const x = compact ? L + 16 + i * (barW + 34) : sx(620) + i * (barW + 46);
          const show = fade(p, [0.02, 0.36, 0.56, 0.72][i]);
          return (
            <g key={i} opacity={show}>
              <rect className="ens-bar" x={x} y={barBase - barH(h.resid)} width={barW} height={barH(h.resid)} rx={3} />
              <text className="ens-label ens-label-hop" x={x + barW / 2} y={barBase - barH(h.resid) - 8} textAnchor="middle">{h.resid}</text>
              <text className="ens-small" x={x + barW / 2} y={barBase + 18} textAnchor="middle">{i === 0 ? "base" : `round ${i}`}</text>
            </g>
          );
        })}

        {/* final */}
        <g opacity={fade(p, 0.8)}>
          <text className="ens-small" x={compact ? W / 2 : W - R} y={barBase + (compact ? 44 : 40)} textAnchor={compact ? "middle" : "end"}>
            combined: {HOPS[3].total} · miss: {HOPS[3].resid}
          </text>
        </g>
      </svg>
    </Figure>
  );
}
