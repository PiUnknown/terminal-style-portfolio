import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./recommender-visuals.css";

/* Three native SVG figures for ML Fundamentals #11 (recommender systems).
 * Same behaviour as the other blog figures: plays only while on screen and while the tab is visible,
 * icon-only pause button top-right, static final state for reduced-motion users, compact labels on narrow screens.
 * Colours come only from the site's theme tokens. Every number is the post's own constructed food-app example. */

const PERIOD = 15000; // ms per loop

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
      className="rv-toggle"
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

function Figure({ name, fig, caption, children }: { name: string; fig: ReturnType<typeof useFigure>; caption: string; children: ReactNode }) {
  return (
    <figure ref={fig.ref} className={`rv-figure rv-${name}${fig.compact ? " rv-compact" : ""}`}>
      {fig.toggle}
      {children}
      <figcaption className="rv-caption">{caption}</figcaption>
    </figure>
  );
}

/* ---------- 1. Item-based collaborative filtering, one step at a time ---------- */

const USERS = ["Asha", "Bilal", "Chetan", "Divya", "Esha", "Farhan"];
const DISHES = ["Dosa", "Idli", "Biryani", "Kebab", "Noodles"];
// 0 = not rated (missing, not a dislike). A rating of 4 or 5 counts as "liked".
const RATINGS = [
  [5, 4, 0, 1, 0],
  [4, 5, 2, 0, 1],
  [1, 0, 5, 4, 2],
  [0, 2, 4, 5, 0],
  [5, 0, 1, 0, 4],
  [2, 1, 0, 5, 5],
];
const ESHA = 4;
const STEP_TEXT = [
  { full: ["Step 1: Esha liked Dosa (she rated it 5)."], compact: ["Step 1: Esha liked Dosa", "(rated 5)."] },
  { full: ["Step 2: find the other users who also liked Dosa: Asha and Bilal."], compact: ["Step 2: other Dosa fans:", "Asha and Bilal."] },
  { full: ["Step 3: see what else those two liked.", "Both liked Idli. Nothing else is shared."], compact: ["Step 3: what else did they like?", "Both liked Idli."] },
  { full: ["Step 4: Idli was co-liked with Dosa by 2 of the 3 users", "who liked either one: overlap score 2/3 = 0.67."], compact: ["Step 4: Idli overlaps Dosa for", "2 of 3 users: score 0.67."] },
  { full: ["Step 5: recommend Idli to Esha.", "Her empty Idli cell means unseen, not disliked."], compact: ["Step 5: recommend Idli to Esha.", "Empty means unseen, not disliked."] },
];

export function itemCfStep(p: number) {
  return Math.min(4, Math.floor(p / 0.17));
}

export function ItemCfSvg({ p, compact, titleId, descId }: { p: number; compact: boolean; titleId?: string; descId?: string }) {
  const W = compact ? 360 : 720;
  const step = itemCfStep(p);
  const o = tail(p);
  const labelW = compact ? 64 : 120;
  const cw = compact ? 56 : 100;
  const gx = compact ? 12 : 90;
  const x0 = gx + labelW;
  const rh = compact ? 30 : 34;
  const y0 = 46;
  const H = y0 + rh * 6 + (compact ? 78 : 70);
  const cx = (j: number) => x0 + cw * j + cw / 2;
  const cy = (i: number) => y0 + rh * i + rh / 2;
  const fans = [0, 1]; // Asha, Bilal: other Dosa fans
  const rowOn = (i: number) => (step === 1 || step === 2) && fans.includes(i);
  const lines = (compact ? STEP_TEXT[step].compact : STEP_TEXT[step].full);
  const textY = y0 + rh * 6 + 26;
  return (
    <svg className="rv-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={titleId && descId ? `${titleId} ${descId}` : undefined}>
      <title id={titleId}>Item-based collaborative filtering on a small food-app ratings grid</title>
      <desc id={descId}>Six users rate five dishes from 1 to 5; empty cells are unrated. Esha liked Dosa. Asha and Bilal also liked Dosa, and both of them liked Idli, so Idli is recommended to Esha.</desc>
      <g opacity={o}>
        {DISHES.map((d, j) => (
          <text key={d} className={`rv-small${(step === 0 && j === 0) || (step >= 1 && step <= 3 && (j === 0 || (j === 1 && step >= 2))) ? " rv-hot" : ""}`} x={cx(j)} y={y0 - 10} textAnchor="middle">{d}</text>
        ))}
        {USERS.map((u, i) => (
          <g key={u}>
            {rowOn(i) && <rect className="rv-row" x={gx - 4} y={y0 + rh * i + 1} width={labelW + cw * 5 + 8} height={rh - 2} />}
            <text className={`rv-label${i === ESHA ? " rv-label-hot" : ""}`} x={gx} y={cy(i) + 4}>{u}</text>
            {RATINGS[i].map((r, j) => {
              const liked = r >= 4;
              const focus =
                (step === 0 && i === ESHA && j === 0) ||
                (step === 1 && fans.includes(i) && j === 0) ||
                (step === 2 && fans.includes(i) && j === 1) ||
                (step === 3 && j <= 1 && liked && ((j === 0 && [0, 1, 4].includes(i)) || (j === 1 && [0, 1].includes(i))));
              return (
                <g key={j}>
                  <rect className={`rv-cell${liked ? " rv-cell-like" : ""}${focus ? " rv-cell-focus" : ""}`} x={x0 + cw * j + 3} y={y0 + rh * i + 3} width={cw - 6} height={rh - 6} />
                  <text className={`rv-num${liked ? " rv-num-like" : ""}`} x={cx(j)} y={cy(i) + 4} textAnchor="middle">{r === 0 ? "·" : r}</text>
                </g>
              );
            })}
          </g>
        ))}
        {step === 4 && (
          <g>
            <rect className="rv-cell rv-cell-rec" x={x0 + cw * 1 + 3} y={y0 + rh * ESHA + 3} width={cw - 6} height={rh - 6} />
            <text className="rv-num rv-num-hot" x={cx(1)} y={cy(ESHA) + 4} textAnchor="middle">?</text>
          </g>
        )}
        {lines.map((t, k) => (
          <text key={k} className="rv-step" x={gx} y={textY + k * 20}>{t}</text>
        ))}
      </g>
    </svg>
  );
}

export function ItemCfAnimation() {
  const fig = useFigure("item-based collaborative filtering");
  const titleId = useId();
  const descId = useId();
  return (
    <Figure name="itemcf" fig={fig} caption="Constructed example: 6 users, 5 dishes, ratings 1-5, a dot means not rated. Filled cells are likes (4 or 5). The overlap score is shared likes divided by users who liked either dish (the Jaccard index); it is one simple choice, not the only way to measure item similarity.">
      <ItemCfSvg p={fig.p} compact={fig.compact} titleId={titleId} descId={descId} />
    </Figure>
  );
}

/* ---------- 2. Latent factors: rotate the axes, every prediction stays the same ---------- */

// Learned by the post's code (k=2, seed 0, 18 training ratings, full-batch gradient descent). Only the P.Q part of the prediction; biases are separate.
const P_VEC = [[-1.0845, -0.9476], [-0.1267, -1.1272], [1.5921, 0.0355], [0.0879, 0.7554], [-1.046, -0.3814], [-0.4945, 1.424]];
const Q_VEC = [[-1.3868, -0.2878], [0.3285, -1.49], [1.4418, 0.5877], [0.5757, 1.3422], [-0.795, 0.681]];
const MAX_ANGLE = 75;

export function latentAngle(p: number) {
  // hold at 0, sweep to MAX_ANGLE, hold, sweep back
  const t = p;
  if (t < 0.1) return 0;
  if (t < 0.45) return MAX_ANGLE * (0.5 - 0.5 * Math.cos(Math.PI * ramp(t, 0.1, 0.35)));
  if (t < 0.6) return MAX_ANGLE;
  if (t < 0.9) return MAX_ANGLE * (0.5 + 0.5 * Math.cos(Math.PI * ramp(t, 0.6, 0.3)));
  return 0;
}

const rot = (v: number[], deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
};
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1];

const USER_LABEL: Record<string, [number, number, "start" | "end" | "middle"]> = {
  Asha: [-7, 4, "end"], Bilal: [7, 4, "start"], Chetan: [6, -8, "start"],
  Divya: [7, 4, "start"], Esha: [8, 16, "start"], Farhan: [-7, 4, "end"],
};
const DISH_LABEL: Record<string, [number, number, "start" | "end" | "middle"]> = {
  Dosa: [-8, 4, "end"], Idli: [8, 4, "start"], Biryani: [0, -9, "middle"], Kebab: [8, 4, "start"], Noodles: [-8, 4, "end"],
};

/** The points stay where they are. The factor axes rotate, so every coordinate changes and every dot product does not. */
export function LatentSvg({ p, compact, titleId, descId }: { p: number; compact: boolean; titleId?: string; descId?: string }) {
  const W = compact ? 360 : 720;
  const H = compact ? 500 : 340;
  const o = tail(p);
  const ang = latentAngle(p);
  const R0 = compact ? 118 : 135; // plot half-size in px
  const ccx = compact ? W / 2 : 190;
  const ccy = compact ? 150 : 170;
  const S = R0 / 1.7;
  const X = (v: number[]) => ccx + v[0] * S;
  const Y = (v: number[]) => ccy - v[1] * S;
  // coordinates of a point measured along the rotated factor axes
  const coord = (v: number[]) => rot(v, -ang);
  const eshaC = coord(P_VEC[ESHA]);
  const idliC = coord(Q_VEC[1]);
  const d = dot(eshaC, idliC);
  const tx = compact ? 24 : 400;
  const ty = compact ? 330 : 60;
  const labelR = compact ? 1.73 : 1.78; // keep the compact factor labels inside the viewBox
  return (
    <svg className="rv-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={titleId && descId ? `${titleId} ${descId}` : undefined}>
      <title id={titleId}>Rotating the latent axes changes every coordinate but not the predictions</title>
      <desc id={descId}>Six users are drawn as arrows and five dishes as squares on a two-dimensional map of learned factors. A pair of dashed factor axes rotates over the map. Every coordinate changes as the axes turn, but the dot product between Esha and Idli stays at 0.225, so the predicted ratings do not change.</desc>
      <g opacity={o}>
        <rect className="rv-plot" x={ccx - R0} y={ccy - R0} width={R0 * 2} height={R0 * 2} />
        {[0, 90].map((a) => {
          const e = rot([1.6, 0], ang + a);
          const e2 = rot([-1.6, 0], ang + a);
          const out = rot([labelR, 0], ang + a);
          return (
            <g key={a}>
              <line className="rv-factor-axis" x1={X(e2)} y1={Y(e2)} x2={X(e)} y2={Y(e)} />
              <text className="rv-small rv-hot" x={X(out)} y={Y(out) + 4} textAnchor={out[0] >= 0.3 ? "start" : out[0] <= -0.3 ? "end" : "middle"}>{a === 0 ? "factor 1" : "factor 2"}</text>
            </g>
          );
        })}
        {USERS.map((u, i) => {
          const v = P_VEC[i];
          const hot = i === ESHA;
          const [dx, dy, an] = USER_LABEL[u];
          return (
            <g key={u} opacity={hot ? 1 : 0.6}>
              <line className={`rv-user${hot ? " rv-user-hot" : ""}`} x1={ccx} y1={ccy} x2={X(v)} y2={Y(v)} />
              <circle className={`rv-user-tip${hot ? " rv-user-hot" : ""}`} cx={X(v)} cy={Y(v)} r={hot ? 4 : 3} />
              <text className="rv-small" x={X(v) + dx} y={Y(v) + dy} textAnchor={an}>{u}</text>
            </g>
          );
        })}
        {DISHES.map((dsh, j) => {
          const v = Q_VEC[j];
          const hot = j === 1;
          const [dx, dy, an] = DISH_LABEL[dsh];
          return (
            <g key={dsh} opacity={hot ? 1 : 0.75}>
              <rect className={`rv-dish${hot ? " rv-dish-hot" : ""}`} x={X(v) - 4} y={Y(v) - 4} width={8} height={8} />
              <text className="rv-small rv-dishlabel" x={X(v) + dx} y={Y(v) + dy} textAnchor={an}>{dsh}</text>
            </g>
          );
        })}
        <text className="rv-stat" x={tx} y={ty}>{`axes turned by ${Math.round(ang)}°`}</text>
        <text className="rv-small" x={tx} y={ty + 28}>{`Esha  = (${eshaC[0].toFixed(2)}, ${eshaC[1].toFixed(2)})`}</text>
        <text className="rv-small" x={tx} y={ty + 48}>{`Idli  = (${idliC[0].toFixed(2)}, ${idliC[1].toFixed(2)})`}</text>
        <text className="rv-stat rv-stat-hot" x={tx} y={ty + 82}>{`Esha · Idli = ${d.toFixed(3)}`}</text>
        <text className="rv-small" x={tx} y={ty + 104}>same at every angle</text>
        {compact ? (
          <>
            <text className="rv-small" x={tx} y={ty + 132}>predicted rating =</text>
            <text className="rv-small" x={tx} y={ty + 150}>3.5 + (-0.186) + (-0.126) + 0.225 = 3.413</text>
          </>
        ) : (
          <>
            <text className="rv-small" x={tx} y={ty + 140}>predicted rating =</text>
            <text className="rv-small" x={tx} y={ty + 160}>3.5 + (-0.186) + (-0.126) + 0.225 = 3.413</text>
            <text className="rv-small" x={tx} y={ty + 180}>global mean + Esha bias + Idli bias + dot</text>
          </>
        )}
      </g>
    </svg>
  );
}

export function LatentAnimation() {
  const fig = useFigure("latent factor rotation");
  const titleId = useId();
  const descId = useId();
  return (
    <Figure name="latent" fig={fig} caption="Factors learned by the post's code on 18 toy ratings (two factors, seed 0), so the map is illustrative, not meaningful. Turning the factor axes by any angle changes every coordinate but leaves every dot product, and so every prediction, unchanged. That is why a single learned factor cannot be trusted to mean 'spiciness'. Reflections do the same, and so does a general invertible mix if items get its inverse transpose.">
      <LatentSvg p={fig.p} compact={fig.compact} titleId={titleId} descId={descId} />
    </Figure>
  );
}

/* ---------- 3. Cold start: which signal exists? (schematic, not a measurement) ---------- */

const COLD_ROWS = [
  { who: "Known dish, known user", cf: ["ok", "many ratings to compare"], cb: ["ok", "attributes; repeats taste"] },
  { who: "Brand-new dish", cf: ["no", "nobody has rated it yet"], cb: ["ok", "attributes exist on day one"] },
  { who: "Brand-new user", cf: ["no", "no ratings from them yet"], cb: ["no", "no liked dishes yet"] },
];
const COLD_ROWS_COMPACT = [
  { who: "Known dish, known user", cf: ["ok", "ratings to compare"], cb: ["ok", "repeats your taste"] },
  { who: "New dish", cf: ["no", "no ratings yet"], cb: ["ok", "has attributes"] },
  { who: "New user", cf: ["no", "no ratings yet"], cb: ["no", "no likes yet"] },
];

export function ColdStartSvg({ p, compact, titleId, descId }: { p: number; compact: boolean; titleId?: string; descId?: string }) {
  const W = compact ? 360 : 720;
  const rows = compact ? COLD_ROWS_COMPACT : COLD_ROWS;
  const o = tail(p);
  const rowH = compact ? 78 : 66;
  const y0 = 62;
  const H = y0 + rowH * 3 + (compact ? 76 : 54);
  const col1 = compact ? 10 : 210;
  const colW = compact ? 164 : 235;
  const col2 = col1 + colW + (compact ? 10 : 16);
  const fadeAt = (i: number) => ramp(p, 0.08 + i * 0.2, 0.08);
  return (
    <svg className="rv-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={titleId && descId ? `${titleId} ${descId}` : undefined}>
      <title id={titleId}>Which signal each approach has for a new dish and a new user</title>
      <desc id={descId}>A schematic table, not measured results. For an established dish and user, collaborative and content-based both have signal. For a brand-new dish, collaborative filtering has no ratings but content-based has attributes. For a brand-new user, both lack a signal: collaborative has no ratings and content-based has no liked dishes to build a profile.</desc>
      <g opacity={o}>
        <text className="rv-label rv-label-main" x={col1 + 2} y={y0 - 24}>{compact ? "collaborative" : "collaborative filtering"}</text>
        <text className="rv-label rv-label-hot" x={col2 + 2} y={y0 - 24}>{compact ? "content-based" : "content-based filtering"}</text>
        {rows.map((r, i) => {
          const y = y0 + rowH * i;
          const a = fadeAt(i);
          return (
            <g key={r.who} opacity={a}>
              {!compact && <text className="rv-step" x={10} y={y + rowH / 2 + 4}>{r.who}</text>}
              {compact && <text className="rv-small rv-whoc" x={col1 + 2} y={y + 14}>{r.who}</text>}
              {[r.cf, r.cb].map((c, k) => {
                const ok = c[0] === "ok";
                const x = k === 0 ? col1 : col2;
                const by = compact ? y + 22 : y + 6;
                const bh = compact ? rowH - 32 : rowH - 12;
                return (
                  <g key={k}>
                    <rect className={ok ? "rv-chip rv-chip-ok" : "rv-chip rv-chip-no"} x={x} y={by} width={colW} height={bh} />
                    <text className={ok ? "rv-chip-mark rv-ok" : "rv-chip-mark rv-no"} x={x + 12} y={by + bh / 2 + 5}>{ok ? "✓" : "✗"}</text>
                    <text className="rv-small rv-chiptext" x={x + 32} y={by + bh / 2 + 4}>{c[1]}</text>
                  </g>
                );
              })}
            </g>
          );
        })}
        <g opacity={ramp(p, 0.72, 0.08)}>
          {(compact
            ? ["Usual fallbacks: show popular items,", "ask a few taste questions, use item", "attributes, explore on purpose."]
            : ["Usual fallbacks: show popular items, ask a few", "taste questions, use item attributes, explore on purpose."]
          ).map((t, k) => (
            <text key={k} className="rv-small" x={compact ? 10 : 10} y={y0 + rowH * 3 + 22 + k * 18}>{t}</text>
          ))}
        </g>
      </g>
    </svg>
  );
}

export function ColdStartAnimation() {
  const fig = useFigure("cold start");
  const titleId = useId();
  const descId = useId();
  return (
    <Figure name="cold" fig={fig} caption="A schematic of which signal exists, not a measured accuracy curve. How well each approach actually does depends on the data, the features and the design; no approach is guaranteed to overtake the other as history grows. Content-based filtering also needs some record of what the user likes.">
      <ColdStartSvg p={fig.p} compact={fig.compact} titleId={titleId} descId={descId} />
    </Figure>
  );
}
