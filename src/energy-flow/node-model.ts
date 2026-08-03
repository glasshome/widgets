/**
 * The user-defined flow-node config model: hand-written mirror of the shapes
 * `config.ts` declares with `field.variants`, plus the cross-item validation
 * the schema wires in via `.check()`. Pure and SDK-free so server-side tests
 * can import it (config.ts pulls the DOM-only SDK barrel). `config.ts` keeps
 * both in sync via typed assignments at its `.check()` call site.
 */

interface NodePresentation {
  label?: string;
  icon?: string;
  /** Level sensor (%) shown on the node, e.g. battery/EV state of charge. */
  level: string[];
}

export interface InputNodeConfig extends NodePresentation {
  kind: "input";
  entities: string[];
}

export interface OutputNodeConfig extends NodePresentation {
  kind: "output";
  entities: string[];
  /** Computed as inputs minus the other outputs; at most one per list. */
  remainder: boolean;
}

export interface BidirectionalNodeConfig extends NodePresentation {
  kind: "bidirectional";
  /** Sensor for power flowing toward the home (import, discharge). */
  positive: string[];
  /** Sensor for power flowing away from the home (export, charge). */
  negative: string[];
  /** Single signed sensor carrying both directions; wins over positive/negative. */
  signed: string[];
  /** The signed sensor reports positive while power flows AWAY from the home. */
  signedOutbound: boolean;
  /** The configured tariff prices this connection's import/export. */
  priced: boolean;
}

export type FlowNodeConfig = InputNodeConfig | OutputNodeConfig | BidirectionalNodeConfig;

function isInCapable(node: FlowNodeConfig): boolean {
  return node.kind === "input" || node.kind === "bidirectional";
}

function isOutCapable(node: FlowNodeConfig): boolean {
  return node.kind === "output" || node.kind === "bidirectional";
}

/**
 * Cross-item rules the per-field schema cannot express: at most one remainder,
 * and a shape that can conserve (`sum(inputs) == sum(outputs)` needs both
 * sides representable). Returns user-facing messages; empty means valid. An
 * empty list is legal (the widget shows its unconfigured state instead).
 */
export function validateNodes(nodes: readonly FlowNodeConfig[]): string[] {
  const messages: string[] = [];
  const remainders = nodes.filter((n) => n.kind === "output" && n.remainder);
  if (remainders.length > 1) {
    messages.push("Only one node can be marked as the remainder.");
  }
  if (nodes.some((n) => n.kind === "input") && !nodes.some(isOutCapable)) {
    messages.push("Add an output or two-way node so the flow has somewhere to go.");
  }
  if (remainders.length > 0 && !nodes.some(isInCapable)) {
    messages.push("A remainder output needs at least one input or two-way node feeding it.");
  }
  return messages;
}
