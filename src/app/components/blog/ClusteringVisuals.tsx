import { useEffect, useId, useRef, useState } from "react";
import "./clustering.css";

/** All examples are illustrative. Theme, viewport, manual pause and motion preferences stay local. */
function useClock(duration: number) {
  const ref = useRef<HTMLElement>(null), elapsed = useRef(0);
  const [time, setTime] = useState(0), [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false), [pageVisible, setPageVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches), visibility = () => setPageVisible(!document.hidden);
    motion(); visibility(); media.addEventListener("change", motion); document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {threshold: .15});
    if (ref.current) observer.observe(ref.current);
    return () => { observer.disconnect(); media.removeEventListener("change", motion); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  const running = visible && pageVisible && !paused && !reduced;
  useEffect(() => {
    if (!running) return;
    let frame = 0, last: number | undefined;
    const tick = (now: number) => { if (last !== undefined) elapsed.current = (elapsed.current + Math.min((now-last)/1000,.1)) % duration; last = now; setTime(elapsed.current); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [running, duration]);
  return {ref, time: reduced ? duration-.01 : time, paused, setPaused, reduced, running};
}
function Toggle({clock, name}: {clock: ReturnType<typeof useClock>; name: string}) {
  return clock.reduced ? null : <button type="button" className="cl-toggle" aria-label={`${clock.paused ? "Play" : "Pause"} ${name} animation`} title={clock.paused ? "Play animation" : "Pause animation"} onClick={() => clock.setPaused(p=>!p)}><svg viewBox="0 0 20 20" aria-hidden="true">{clock.paused ? <path d="M7 4L15 10L7 16Z"/> : <><path d="M7 4V16"/><path d="M13 4V16"/></>}</svg></button>;
}
const values = [1,2,4,9,10,12];
const centres = [[1,4],[1.5,8.75],[7/3,31/3],[7/3,31/3]];
const scale = (v:number) => 24 + (v-1)*24;
const kmCaptions = ["Choose k = 2. Two centres start at 1 and 4.","Assign each point to its nearest centre. The centres have not moved yet.","Move centres to the means: 1.5 and 8.75. Repeat assignment.","Assign again, then move to about 2.33 and 10.33.","Another assignment changes nothing. The groups have converged."];
export function KMeansAnimation() {
  const clock = useClock(18), id=useId();
  const phase = clock.time<3 ? 0 : clock.time<6 ? 1 : clock.time<10 ? 2 : clock.time<14 ? 3 : 4;
  const c=centres[phase<2?0:phase===2?1:2];
  const previous=centres[phase===2?0:phase===3?1:2];
  const progress=phase===2?Math.min(1,(clock.time-6)/2):phase===3?Math.min(1,(clock.time-10)/2):1;
  const displayed=c.map((v,i)=>previous[i]+(v-previous[i])*progress);
  const assign=phase===1?centres[0]:phase===2?centres[0]:centres[1];
  const groups=values.map(v=> Math.abs(v-assign[0])<=Math.abs(v-assign[1])?0:1);
  return <figure ref={clock.ref} className="cl-figure" data-running={clock.running} data-phase={phase}>
    <div className="cl-top"><div className="cl-heading">k-means: assign, move, repeat</div><Toggle clock={clock} name="k-means"/></div>
    <div className="cl-meta">made-up data: 1, 2, 4, 9, 10, 12 / k = 2</div>
    <ol className="cl-loop">{["Choose k","Place centres","Assign points","Move centres"].map((s,i)=><li className={(phase===0?i<2:phase===1||phase===4?i===2:i===3)?"cl-active":""} key={s}><span>0{i+1}</span>{s}</li>)}</ol>
    <svg className="cl-diagram" viewBox="0 0 312 160" role="img" aria-labelledby={id}><title id={id}>Two centres move to the means of their assigned points, then stop when assignments no longer change.</title>
      <path className="cl-rule" d="M24 116H288"/>
      {values.map((v,i)=><g key={v}>{phase>0&&<path className={`cl-assignment cl-group-${groups[i]}`} d={`M${scale(v)} 66L${scale(displayed[groups[i]])} 102`}/>}<circle className={phase===0?"cl-unassigned":`cl-group-${groups[i]}`} cx={scale(v)} cy="66" r="5"/><text x={scale(v)} y="140" textAnchor="middle">{v}</text></g>)}
      {displayed.map((v,i)=><g className={`cl-centre cl-group-${i}`} key={i}><path d={`M${scale(v)-6} 96L${scale(v)+6} 108M${scale(v)+6} 96L${scale(v)-6} 108`}/><text x={scale(v)} y="28" textAnchor="middle">{i===0?"A":"B"}: {Number(v.toFixed(2))}</text></g>)}
    </svg>
    <div className="cl-legend"><span className="cl-key-a">● group A</span><span className="cl-key-b">● group B</span><span>× centre / connectors show assignment</span></div>
    <figcaption><span className="cl-step">0{phase+1} / 05</span><span>{kmCaptions[phase]}</span></figcaption>
  </figure>;
}
// Euclidean DBSCAN example. minPts includes the query point itself.
const dbPoints = [[48,72],[64,68],[55,91],[77,85],[72,105],[91,104],[118,106],[192,68],[207,59],[223,71],[207,84],[232,92],[238,155],[137,35]];
const epsilon=30, minPts=4;
const neighbours=dbPoints.map(p=>dbPoints.map((q,i)=>Math.hypot(p[0]-q[0],p[1]-q[1])<=epsilon?i:-1).filter(i=>i>=0));
const core=neighbours.map(ns=>ns.length>=minPts);
const clusters=dbPoints.map(()=>-1);const visitOrder:number[]=[];let cluster=0;
for(let i=0;i<dbPoints.length;i++){if(!core[i]||clusters[i]>=0)continue;const queue=[i];clusters[i]=cluster;while(queue.length){const j=queue.shift()!;visitOrder.push(j);for(const n of neighbours[j]){if(clusters[n]===-1){clusters[n]=cluster;if(core[n])queue.push(n);}}}cluster++;}
export function DBSCANAnimation(){
  const clock=useClock(20), id=useId(); const phase=Math.min(visitOrder.length,Math.floor(clock.time/1.6));const visited=visitOrder.slice(0,phase);const current=visitOrder[Math.min(phase,visitOrder.length-1)];const seen=new Set(visited.flatMap(i=>neighbours[i]));const done=phase===visitOrder.length;
  return <figure ref={clock.ref} className="cl-figure" data-running={clock.running} data-phase={phase}><div className="cl-top"><div className="cl-heading">DBSCAN: grow dense regions</div><Toggle clock={clock} name="DBSCAN"/></div><div className="cl-meta">illustrative / ε = 30 diagram units / minPts = 4, including the point</div>
    <svg className="cl-diagram" viewBox="0 0 312 205" role="img" aria-labelledby={id}><title id={id}>DBSCAN expands through core points with at least four points in their radius. Border points join but do not expand. Two isolated points remain noise.</title>
      {!done&&<circle className="cl-neighbourhood" cx={dbPoints[current][0]} cy={dbPoints[current][1]} r={epsilon}/>}
      {dbPoints.map(([x,y],i)=><g key={i} className={seen.has(i)||done?clusters[i]===-1?"cl-noise":`cl-group-${clusters[i]}`:"cl-unassigned"}>
        {done&&clusters[i]===-1?<path d={`M${x-4} ${y-4}L${x+4} ${y+4}M${x+4} ${y-4}L${x-4} ${y+4}`}/>:<circle cx={x} cy={y} r="4.5"/>}
        {core[i]&&(seen.has(i)||done)&&<circle className="cl-core-ring" cx={x} cy={y} r="8"/>}
      </g>)}
    </svg><div className="cl-legend"><span className="cl-key-a">● group A</span><span className="cl-key-b">● group B</span><span>ring: core / dot: border / ×: noise</span></div><figcaption><span className="cl-step">{done?"done":"grow"}</span><span>{done?"Two dense groups remain. Border points join; isolated points stay noise.":`Inspect point ${current+1}: ${neighbours[current].length} points in its ε-neighbourhood. Expand through core points, not border points.`}</span></figcaption>
  </figure>;
}
const merges=[{a:0,b:1,height:1},{a:3,b:4,height:1},{a:6,b:2,height:2},{a:7,b:5,height:2},{a:8,b:9,height:5}];
const treeNodes=[{x:42,y:174},{x:82,y:174},{x:122,y:174},{x:196,y:174},{x:236,y:174},{x:276,y:174},{x:62,y:146},{x:216,y:146},{x:92,y:118},{x:246,y:118},{x:169,y:34}];
export function HierarchicalAnimation(){const clock=useClock(12),id=useId();const phase=clock.time<3?0:clock.time<6?1:clock.time<9?2:3;
  return <figure ref={clock.ref} className="cl-figure" data-running={clock.running} data-phase={phase}><div className="cl-top"><div className="cl-heading">hierarchical: merge the closest groups</div><Toggle clock={clock} name="hierarchical clustering"/></div><div className="cl-meta">made-up values: 1, 2, 4, 9, 10, 12 / single linkage</div>
    <svg className="cl-diagram" viewBox="0 0 312 214" role="img" aria-labelledby={id}><title id={id}>Single-linkage dendrogram: 1 and 2, and 9 and 10 merge at distance 1; 4 and 12 join at distance 2; both groups merge at distance 5. Height is distance, not time.</title>
      <path className="cl-rule" d="M18 174V34"/>{[0,1,2,5].map(h=><text className="cl-axis" x="12" y={178-h*28} textAnchor="end" key={h}>{h}</text>)}
      {merges.map((m,i)=>{const a=treeNodes[m.a],b=treeNodes[m.b],y=174-m.height*28;const show=phase>=(i<2?1:i<4?2:3);return <path key={i} className={show?"cl-merge cl-shown":"cl-merge"} d={`M${a.x} ${a.y}V${y}H${b.x}V${b.y}`}/>;})}
      {phase===3&&<path className="cl-cut" d="M30 90H290"/>}
      {[1,2,4,9,10,12].map((v,i)=><g key={v}><circle className="cl-unassigned" cx={treeNodes[i].x} cy="174" r="4"/><text x={treeNodes[i].x} y="196" textAnchor="middle">{v}</text></g>)}
    </svg><div className="cl-meta">height = distance / dashed cut at 3 leaves two groups</div><figcaption><span className="cl-step">0{phase+1} / 04</span><span>{["Start with each value in its own group.","Merge 1 with 2, and 9 with 10, at distance 1.","4 and 12 join their nearest groups at distance 2.","The groups merge at distance 5 (between 4 and 9). Cut between 2 and 5 to keep two groups."][phase]}</span></figcaption>
  </figure>;
}
// Hand-drawn curve follows the supplied screenshot. It is not measured output.
export const illustrativeInertia=[96,60,34,22,17,14,12,10.5,9.3,8.3];
export function ElbowChart(){
  const id=useId(), ref=useRef<HTMLElement>(null); const [width,setWidth]=useState(360);
  useEffect(()=>{if(!ref.current)return;const observer=new ResizeObserver(([entry])=>setWidth(Math.max(240,entry.contentRect.width)));observer.observe(ref.current);return()=>observer.disconnect();},[]);
  // Coordinate width tracks rendered width so 12 SVG units remain 12 CSS pixels.
  const height=width<560?220:250,left=34,right=width-12,top=12,bottom=height-44;
  const x=(k:number)=>left+(k-1)*(right-left)/9,y=(v:number)=>bottom-v*(bottom-top)/100;
  return <figure ref={ref} className="cl-figure cl-elbow"><div className="cl-heading">elbow method: inertia vs k</div><div className="cl-meta">illustrative curve, not a measured dataset</div><div className="cl-axis-title">inertia (squared distance)</div><svg className="cl-diagram" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={id}><title id={id}>Illustrative inertia falls quickly for the first few groups, then flattens. The elbow is a heuristic, not proof of the right k.</title>
    {[0,50,100].map(v=><g key={v}><path className="cl-grid" d={`M${left} ${y(v)}H${right}`}/><text className="cl-axis" x={left-8} y={y(v)+4} textAnchor="end">{v}</text></g>)}<path className="cl-rule" d={`M${left} ${top}V${bottom}H${right}`}/>
    <path className="cl-curve" d={illustrativeInertia.map((v,i)=>`${i?"L":"M"}${x(i+1)} ${y(v)}`).join(" ")}/>{[1,3,5,7,10].map(k=><text className="cl-axis" key={k} x={x(k)} y={bottom+19} textAnchor="middle">{k}</text>)}<text className="cl-axis" x={(left+right)/2} y={height-3} textAnchor="middle">number of clusters (k)</text>
    </svg><figcaption>Look for diminishing improvement, then check whether the groups make sense.</figcaption></figure>;
}
export function ClusteringFlow(){return <figure className="cl-figure"><div className="cl-heading">from raw inputs to useful groups</div><ol className="cl-flow">{[["Prepare inputs","Choose useful features and scale them."],["Choose a method","k-means, DBSCAN or hierarchical."],["Run and inspect","Check groups, settings and any noise."],["Interpret the groups","Give them meaning using domain context."]].map(([title,detail],i)=><li key={title}><span className="cl-flow-index">0{i+1}</span><div><strong>{title}</strong><span>{detail}</span></div></li>)}</ol><figcaption>Grouping finds structure. A cluster number does not explain what that structure means.</figcaption></figure>}

const moonPoints: number[][]=[[158.0, 100.0], [157.183, 91.18], [154.759, 82.66], [150.81, 74.731], [145.472, 67.663], [138.926, 61.695], [131.395, 57.032], [123.136, 53.832], [114.429, 52.205], [105.571, 52.205], [96.864, 53.832], [88.605, 57.032], [81.074, 61.695], [74.528, 67.663], [69.19, 74.731], [65.241, 82.66], [62.817, 91.18], [62.0, 100.0], [160.0, 100.0], [159.149, 90.813], [156.624, 81.938], [152.511, 73.678], [146.95, 66.315], [140.132, 60.099], [132.287, 55.242], [123.683, 51.909], [114.613, 50.213], [105.387, 50.213], [96.317, 51.909], [87.713, 55.242], [79.868, 60.099], [73.05, 66.315], [67.489, 73.678], [63.376, 81.938], [60.851, 90.813], [60.0, 100.0], [162.0, 100.0], [161.115, 90.445], [158.489, 81.215], [154.211, 72.626], [148.428, 64.968], [141.337, 58.503], [133.178, 53.452], [124.23, 49.985], [114.798, 48.222], [105.202, 48.222], [95.77, 49.985], [86.822, 53.452], [78.663, 58.503], [71.572, 64.968], [65.789, 72.626], [61.511, 81.215], [58.885, 90.445], [58.0, 100.0], [208.0, 80.0], [207.183, 88.82], [204.759, 97.34], [200.81, 105.269], [195.472, 112.337], [188.926, 118.305], [181.395, 122.968], [173.136, 126.168], [164.429, 127.795], [155.571, 127.795], [146.864, 126.168], [138.605, 122.968], [131.074, 118.305], [124.528, 112.337], [119.19, 105.269], [115.241, 97.34], [112.817, 88.82], [112.0, 80.0], [210.0, 80.0], [209.149, 89.187], [206.624, 98.062], [202.511, 106.322], [196.95, 113.685], [190.132, 119.901], [182.287, 124.758], [173.683, 128.091], [164.613, 129.787], [155.387, 129.787], [146.317, 128.091], [137.713, 124.758], [129.868, 119.901], [123.05, 113.685], [117.489, 106.322], [113.376, 98.062], [110.851, 89.187], [110.0, 80.0], [212.0, 80.0], [211.115, 89.555], [208.489, 98.785], [204.211, 107.374], [198.428, 115.032], [191.337, 121.497], [183.178, 126.548], [174.23, 130.015], [164.798, 131.778], [155.202, 131.778], [145.77, 130.015], [136.822, 126.548], [128.663, 121.497], [121.572, 115.032], [115.789, 107.374], [111.511, 98.785], [108.885, 89.555], [108.0, 80.0], [35, 145], [252, 30]];
const moonKMeans=[1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1];
const moonDBSCAN=[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -1, -1];
export function CrescentComparison(){const id=useId();return <figure className="cl-figure"><div className="cl-heading">same crescents, different definitions of a group</div><div className="cl-meta">made-up 2D points / computed assignments / two isolated points</div><div className="cl-compare">{[false,true].map(db=><div key={String(db)}><div className="cl-meta">{db?"DBSCAN: follow density":"k-means: nearest centre"}</div><svg className="cl-diagram" viewBox="0 0 280 180" role="img" aria-labelledby={`${id}-${db}`}><title id={`${id}-${db}`}>{db?"DBSCAN follows each curved crescent and leaves the isolated points as noise.":"k-means with k equals 2 partitions by nearest centre, cutting across crescent membership and assigning the isolated points too."}</title>{moonPoints.map(([x,y],i)=>{const label=(db?moonDBSCAN:moonKMeans)[i];return label<0?<path className="cl-noise" key={i} d={`M${x-3} ${y-3}L${x+3} ${y+3}M${x+3} ${y-3}L${x-3} ${y+3}`}/>:<circle key={i} className={`cl-group-${label}`} cx={x} cy={y} r="2.4"/>;})}</svg></div>)}</div><div className="cl-legend"><span className="cl-key-a">● group A</span><span className="cl-key-b">● group B</span><span>× noise</span></div><figcaption>k-means: k = 2, fixed start. DBSCAN: ε = 13 diagram units, minPts = 4 including itself. Results depend on these settings.</figcaption></figure>}
