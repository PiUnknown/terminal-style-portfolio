import { useEffect, useRef, useState, useId } from "react";
import "./decision-tree.css";

type Node = { x: number; y: number; lines: string[] };
const layouts = {
  wide: {
    width: 760, height: 330, boxW: 164, boxH: 64,
    nodes: [
      { x: 12, y: 134, lines: ["Is it raining?"] },
      { x: 288, y: 54, lines: ["Covered patio?"] },
      { x: 288, y: 214, lines: ["Long wait?"] },
      { x: 574, y: 14, lines: ["Eat here"] },
      { x: 574, y: 94, lines: ["Skip it"] },
      { x: 574, y: 194, lines: ["Eat here"] },
      { x: 574, y: 274, lines: ["Skip it"] },
    ],
  },
  narrow: {
    width: 340, height: 398, boxW: 138, boxH: 56,
    nodes: [
      { x: 101, y: 12, lines: ["Is it", "raining?"] },
      { x: 14, y: 148, lines: ["Covered", "patio?"] },
      { x: 188, y: 148, lines: ["Long wait?"] },
      { x: 14, y: 286, lines: ["Eat here"] },
      { x: 14, y: 354, lines: ["Skip it"] },
      { x: 188, y: 286, lines: ["Eat here"] },
      { x: 188, y: 354, lines: ["Skip it"] },
    ],
  },
};
const edges = [ [0, 1, "yes"], [0, 2, "no"], [1, 3, "yes"], [1, 4, "no"], [2, 5, "no"], [2, 6, "yes"] ] as const;
const captions = [
  "Start with one example: rain = yes, covered patio = no.",
  "Rain = yes. Follow the branch to the next question.",
  "Covered patio = no. Follow that branch to a leaf.",
  "Prediction: skip it. One example follows one path, not every branch.",
];

/** An illustrative classification tree, not a tree trained on restaurant data. */
export function DecisionTreeAnimation() {
  const figureRef = useRef<HTMLElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const elapsed = useRef(0);
  const [narrow, setNarrow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const titleId = useId();
  const descId = useId();
  const layout = narrow ? layouts.narrow : layouts.wide;
  const phase = reducedMotion ? 3 : time < 1.2 ? 0 : time < 3.4 ? 1 : time < 5.8 ? 2 : 3;
  const running = visible && pageVisible && !paused && !reducedMotion;

  useEffect(() => {
    const element = figureRef.current;
    if (!element) return;
    const resize = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 560));
    resize.observe(element);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(element);
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { resize.disconnect(); observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last !== null) elapsed.current = (elapsed.current + Math.min((now - last) / 1000, 0.1)) % 9;
      last = now;
      setTime(elapsed.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  function path(a: Node, b: Node, index: number) {
    const { boxW: w, boxH: h } = layout;
    if (!narrow) {
      const sx = a.x + w, sy = a.y + h / 2, ex = b.x, ey = b.y + h / 2;
      const mid = (sx + ex) / 2;
      return `M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ey}, ${ex} ${ey}`;
    }
    if (index < 2) {
      const sx = a.x + w / 2, sy = a.y + h, ex = b.x + w / 2, ey = b.y;
      return `M ${sx} ${sy} C ${sx} ${sy + 40}, ${ex} ${ey - 40}, ${ex} ${ey}`;
    }
    // A side rail bypasses the first leaf; no connector crosses a leaf box.
    if (index % 2 !== 0) {
      const sx = a.x + w, sy = a.y + h / 2, ex = b.x + w, ey = b.y + h / 2;
      const rail = sx + 12;
      return `M ${sx} ${sy} C ${rail} ${sy}, ${rail} ${sy + 12}, ${rail} ${sy + 24} L ${rail} ${ey - 24} C ${rail} ${ey - 12}, ${rail} ${ey}, ${ex} ${ey}`;
    }
    const sx = a.x + w / 2, sy = a.y + h, ex = b.x + w / 2, ey = b.y;
    return `M ${sx} ${sy} C ${sx - 35} ${sy + 28}, ${ex - 35} ${ey - 28}, ${ex} ${ey}`;
  }

  const activeEdge = phase === 1 ? 0 : phase === 2 ? 3 : null;
  let point: { x: number; y: number } | null = null;
  if (activeEdge !== null) {
    const element = pathRefs.current[activeEdge];
    const start = phase === 1 ? 1.2 : 3.4;
    const duration = phase === 1 ? 2.2 : 2.4;
    if (element) point = element.getPointAtLength(element.getTotalLength() * Math.max(0, Math.min(1, (time - start) / duration)));
  }

  return (
    <figure ref={figureRef} className={`decision-tree${narrow ? " dt-narrow" : ""}`} data-phase={phase} data-running={running}>
      <div className="dt-topline">
        <div className="dt-heading">one path through a decision tree</div>
        {!reducedMotion && <button className="dt-toggle" type="button" onClick={() => setPaused(p => !p)} aria-label={paused ? "Play decision tree animation" : "Pause decision tree animation"} title={paused ? "Play animation" : "Pause animation"}>
          <svg viewBox="0 0 20 20" aria-hidden="true">{paused ? <path d="M 7 4 L 15 10 L 7 16 Z" /> : <><path d="M 7 4 V 16" /><path d="M 13 4 V 16" /></>}</svg>
        </button>}
      </div>
      <div className="dt-example"><span>input</span> rain: yes <span>/</span> covered patio: no</div>
      <svg viewBox={`0 0 ${layout.width} ${layout.height + (narrow ? 14 : 18)}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
        <title id={titleId}>A restaurant decision tree</title>
        <desc id={descId}>Illustrative tree. If it is raining, ask whether there is a covered patio. A rainy day without a covered patio reaches the leaf Skip it. The other branches are shown but are not taken by this example.</desc>
        {edges.map(([a, b, label], i) => {
          const selected = (i === 0 && phase >= 1) || (i === 3 && phase >= 2);
          const from = layout.nodes[a], to = layout.nodes[b];
          // Anchor labels to the actual curve geometry, not the node bounds.
          // Cubic Bezier midpoint: (P0 + 3P1 + 3P2 + P3) / 8.
          let labelX: number, labelY: number;
          if (!narrow) {
            labelX = (from.x + layout.boxW + to.x) / 2;
            labelY = (from.y + to.y) / 2 + layout.boxH / 2;
          } else if (i < 2) {
            labelX = (from.x + to.x) / 2 + layout.boxW / 2;
            labelY = (from.y + layout.boxH + to.y) / 2;
          } else if (i % 2 === 0) {
            labelX = from.x + layout.boxW / 2 - 26.25;
            labelY = (from.y + layout.boxH + to.y) / 2;
          } else {
            labelX = from.x + layout.boxW + 12;
            labelY = from.y + layout.boxH / 2 + 72;
          }
          return <g key={i} className={selected ? "dt-edge dt-selected" : "dt-edge"}>
            <path ref={el => { pathRefs.current[i] = el; }} d={path(from, to, i)} />
            <text className="dt-branch-label" x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central">{label}</text>
          </g>;
        })}
        {layout.nodes.map((node, i) => {
          const chosen = i === 0 || (i === 1 && phase >= 1) || (i === 4 && phase === 3);
          return <g key={i} className={chosen ? "dt-node dt-selected" : "dt-node"}>
            <rect x={node.x} y={node.y} width={layout.boxW} height={layout.boxH} />
            <text x={node.x + layout.boxW / 2} y={node.y + layout.boxH / 2 + (node.lines.length > 1 ? -5 : 5)} textAnchor="middle">{node.lines.map((line, lineIndex) => <tspan key={line} x={node.x + layout.boxW / 2} dy={lineIndex ? 18 : 0}>{line}</tspan>)}</text>
            {i === 4 && phase === 3 && <rect className="dt-leaf-marker" x={node.x + 8} y={node.y + 8} width="5" height="5" />}
          </g>;
        })}
        {point && <g className="dt-point" aria-hidden="true"><circle cx={point.x} cy={point.y} r="11" opacity="0.12" /><circle cx={point.x} cy={point.y} r="6" opacity="0.3" /><circle cx={point.x} cy={point.y} r="3.5" /></g>}
      </svg>
      <figcaption><span className="dt-step">{String(phase + 1).padStart(2, "0")} / 04</span><span>{captions[phase]}</span></figcaption>

    </figure>
  );
}
