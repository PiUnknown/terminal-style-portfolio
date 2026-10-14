import { Component, Fragment, type ReactNode } from "react";
import { DecisionTreeAnimation } from "./DecisionTreeAnimation";
import { KMeansAnimation, DBSCANAnimation, HierarchicalAnimation, ElbowChart, CrescentComparison, ClusteringFlow } from "./ClusteringVisuals";

class AnimationFallback extends Component<{ children: ReactNode; poster: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div dangerouslySetInnerHTML={{ __html: this.props.poster }} /> : this.props.children; }
}

// A deliberately small allowlist. Markdown cannot import or execute components.
const animations = {
  "decision-tree": DecisionTreeAnimation,
  "k-means": KMeansAnimation,
  "dbscan": DBSCANAnimation,
  "hierarchical": HierarchicalAnimation,
  "elbow-chart": ElbowChart,
  "crescent-comparison": CrescentComparison,
  "clustering-flow": ClusteringFlow,
};

/** Replace only registered, block-level placeholders after Markdown rendering.
 * Unknown names retain their supplied poster. Normal Markdown uses the old renderer.
 * No additional React roots: lifecycle, theme and event handling stay in the post.
 */
export function BlogMarkdown({ html }: { html: string }) {
  const pattern = /<div data-blog-animation="([a-z-]+)">\s*(<img\b[^>]*>)\s*<\/div>/g;
  const blocks = [];
  let cursor = 0;
  for (const match of html.matchAll(pattern)) {
    blocks.push(<div key={`html-${cursor}`} dangerouslySetInnerHTML={{ __html: html.slice(cursor, match.index) }} />);
    const Animation = animations[match[1] as keyof typeof animations];
    blocks.push(Animation ? <AnimationFallback key={`animation-${match.index}`} poster={match[2]}><Animation /></AnimationFallback> : <div key={`fallback-${match.index}`} dangerouslySetInnerHTML={{ __html: match[0] }} />);
    cursor = match.index! + match[0].length;
  }
  blocks.push(<div key={`html-${cursor}`} dangerouslySetInnerHTML={{ __html: html.slice(cursor) }} />);
  return <>{blocks.map((block, i) => <Fragment key={i}>{block}</Fragment>)}</>;
}
