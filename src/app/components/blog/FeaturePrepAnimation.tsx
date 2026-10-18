import { useEffect, useId, useRef, useState } from "react";
import "./feature-prep-animation.css";

/** Shows a category, differently scaled numbers, and a ready-to-use value moving through prep. */
export function FeaturePrepAnimation() {
  const figureRef = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.innerWidth < 540);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const titleId = useId();
  const descId = useId();
  const running = visible && pageVisible && !paused && !reducedMotion;

  useEffect(() => {
    const element = figureRef.current;
    if (!element) return;

    const resize = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 540));
    resize.observe(element);

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(element);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      resize.disconnect();
      observer.disconnect();
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  return (
    <figure ref={figureRef} className={`fp-figure${compact ? " fp-compact" : ""}${reducedMotion ? " fp-still" : ""}`} data-running={running}>
      {!reducedMotion && (
        <button
          className="fp-toggle"
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? "Play feature preparation animation" : "Pause feature preparation animation"}
          title={paused ? "Play animation" : "Pause animation"}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            {paused ? <path d="M7 4.5 15 10l-8 5.5z" /> : <><path d="M7 4v12" /><path d="M13 4v12" /></>}
          </svg>
        </button>
      )}

      {compact ? (
        <svg className="fp-diagram fp-diagram-compact" viewBox="0 0 360 596" role="img" aria-labelledby={`${titleId} ${descId}`}>
          <title id={titleId}>Preparing three features for a model</title>
          <desc id={descId}>A country category is one-hot encoded, area and bedrooms are scaled to 0 to 1, and an already binary garage flag is left unchanged.</desc>
          <defs>
            <marker id={`${titleId}-arrow`} viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M1 1 7 4 1 7" />
            </marker>
          </defs>
          <g className="fp-run">
            <text className="fp-section" x="12" y="18">01 / CATEGORY</text>
            <g className="fp-source fp-delay-1"><rect className="fp-box" x="12" y="30" width="336" height="38" rx="4" /><text x="26" y="54">country: India</text></g>
            <line className="fp-arrow" x1="180" y1="70" x2="180" y2="79" markerEnd={`url(#${titleId}-arrow)`} />
            <rect className="fp-box fp-gate fp-delay-1" x="12" y="84" width="336" height="38" rx="4" />
            <text x="26" y="108">one-hot encode</text>
            <line className="fp-arrow" x1="180" y1="124" x2="180" y2="133" markerEnd={`url(#${titleId}-arrow)`} />
            <g className="fp-ready fp-mobile-ready fp-delay-1">
              {["India  1", "USA  0", "Russia  0"].map((label, index) => (
                <g key={label}>
                  <rect className={index === 0 ? "fp-on" : "fp-off"} x={12 + index * 112} y="140" width="104" height="38" rx="4" />
                  <text className={index === 0 ? "fp-on-text" : ""} x={64 + index * 112} y="164" textAnchor="middle">{label}</text>
                </g>
              ))}
            </g>
            <line className="fp-divider" x1="12" y1="194" x2="348" y2="194" />

            <text className="fp-section" x="12" y="216">02 / DIFFERENT SCALES</text>
            <g className="fp-source fp-delay-2"><rect className="fp-box" x="12" y="228" width="336" height="46" rx="4" /><text x="26" y="247">area_sqft: 1,200</text><text className="fp-small" x="26" y="265">bedrooms: 3</text></g>
            <line className="fp-arrow" x1="180" y1="276" x2="180" y2="283" markerEnd={`url(#${titleId}-arrow)`} />
            <rect className="fp-box fp-gate fp-delay-2" x="12" y="288" width="336" height="38" rx="4" />
            <text x="26" y="312">scale to a comparable range</text>
            <line className="fp-arrow" x1="180" y1="330" x2="180" y2="337" markerEnd={`url(#${titleId}-arrow)`} />
            <g className="fp-ready fp-mobile-ready fp-delay-2">
              <text className="fp-small" x="12" y="354">area_sqft 0.6</text>
              <text className="fp-small" x="186" y="354">bedrooms 0.4</text>
              <rect className="fp-track" x="12" y="362" width="156" height="10" rx="2" />
              <rect className="fp-track" x="186" y="362" width="162" height="10" rx="2" />
              <rect className="fp-bar fp-mobile-bar" x="12" y="362" width="94" height="10" rx="2" />
              <rect className="fp-bar fp-mobile-bar" x="186" y="362" width="65" height="10" rx="2" />
            </g>
            <line className="fp-divider" x1="12" y1="394" x2="348" y2="394" />

            <text className="fp-section" x="12" y="416">03 / ALREADY IN RANGE</text>
            <g className="fp-source fp-delay-3"><rect className="fp-box" x="12" y="428" width="336" height="38" rx="4" /><text x="26" y="452">has_garage: 1</text></g>
            <line className="fp-arrow" x1="180" y1="472" x2="180" y2="479" markerEnd={`url(#${titleId}-arrow)`} />
            <rect className="fp-box fp-gate fp-delay-3" x="12" y="484" width="336" height="38" rx="4" />
            <text x="26" y="508">leave as is</text>
            <line className="fp-arrow" x1="180" y1="528" x2="180" y2="535" markerEnd={`url(#${titleId}-arrow)`} />
            <g className="fp-ready fp-mobile-ready fp-delay-3">
              <rect className="fp-on" x="12" y="542" width="336" height="38" rx="4" />
              <text className="fp-on-text" x="26" y="566">has_garage: 1</text>
            </g>
          </g>
        </svg>
      ) : (
        <svg className="fp-diagram" viewBox="0 0 760 300" role="img" aria-labelledby={`${titleId} ${descId}`}>
          <title id={titleId}>Preparing three features for a model</title>
          <desc id={descId}>A country category is one-hot encoded, area and bedrooms are scaled to 0 to 1, and an already binary garage flag is left unchanged.</desc>
          <g className="fp-run">
            <text className="fp-small" x="10" y="22">raw column</text>
            <text className="fp-small" x="330" y="22">prep</text>
            <text className="fp-small" x="560" y="22">ready for the model</text>

            <line className="fp-lane" x1="10" y1="70" x2="750" y2="70" />
            <g className="fp-token fp-delay-1"><rect className="fp-box" x="10" y="52" width="130" height="36" rx="4" /><text x="22" y="75">country: India</text></g>
            <rect className="fp-box fp-gate fp-delay-1" x="330" y="48" width="110" height="44" rx="4" />
            <text x="345" y="75">one-hot</text>
            <g className="fp-ready fp-delay-1">
              {["India", "USA", "Russia"].map((country, index) => (
                <g key={country}>
                  <rect className={index === 0 ? "fp-on" : "fp-off"} x={560 + index * 62} y="52" width="52" height="36" rx="4" />
                  <text className={index === 0 ? "fp-on-text" : ""} x={586 + index * 62} y="75" textAnchor="middle">{index === 0 ? 1 : 0}</text>
                  <text className="fp-small" x={586 + index * 62} y="104" textAnchor="middle">{country}</text>
                </g>
              ))}
            </g>

            <line className="fp-lane" x1="10" y1="190" x2="750" y2="190" />
            <g className="fp-token fp-delay-2">
              <rect className="fp-bar" x="10" y="160" width="150" height="12" />
              <text className="fp-small" x="168" y="171">area_sqft 1,200</text>
              <rect className="fp-bar" x="10" y="182" width="9" height="12" />
              <text className="fp-small" x="168" y="193">bedrooms 3</text>
            </g>
            <rect className="fp-box fp-gate fp-delay-2" x="330" y="158" width="110" height="44" rx="4" />
            <text x="345" y="185">scale</text>
            <g className="fp-ready fp-delay-2">
              <rect className="fp-track" x="560" y="160" width="180" height="12" />
              <rect className="fp-track" x="560" y="182" width="180" height="12" />
              <rect className="fp-bar fp-bar-output" x="560" y="160" width="108" height="12" />
              <rect className="fp-bar fp-bar-output" x="560" y="182" width="72" height="12" />
              <text className="fp-small" x="560" y="212">area_sqft 0.6</text>
              <text className="fp-small" x="650" y="212">bedrooms 0.4</text>
            </g>

            <line className="fp-lane" x1="10" y1="262" x2="750" y2="262" />
            <g className="fp-token fp-delay-3"><rect className="fp-box" x="10" y="244" width="130" height="36" rx="4" /><text x="22" y="267">has_garage: 1</text></g>
            <rect className="fp-box fp-gate fp-delay-3" x="330" y="240" width="110" height="44" rx="4" />
            <text x="345" y="267">leave as is</text>
            <g className="fp-ready fp-delay-3"><rect className="fp-on" x="560" y="244" width="130" height="36" rx="4" /><text className="fp-on-text" x="572" y="267">has_garage: 1</text></g>
          </g>
        </svg>
      )}
    </figure>
  );
}
