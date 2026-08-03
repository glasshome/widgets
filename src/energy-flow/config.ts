/**
 * Energy Flow config schema (v3): a user-defined node list instead of the old
 * fixed five-role fields. Each node is a `field.variants` union — input,
 * output, or two-way — inside a `field.list`; `graph-adapter.ts` is the only
 * runtime consumer of the node field names, and `migrate.ts` maps v1/v2 flat
 * configs onto this shape.
 *
 * Cross-item rules (one remainder, a conservable shape) live in
 * `node-model.ts` and are wired in via `.check()` on the list; issues land at
 * the list path, so hosts surface them as form-level messages (v1 decision:
 * no per-item error mapping).
 */

import { defineConfig, field, type Infer } from "@glasshome/widget-sdk";
import { type FlowNodeConfig, validateNodes } from "./node-model";

const powerEntities = (description: string) =>
  field.entities("sensor", { title: "Power sensors", description, deviceClass: "power" });

const powerEntity = (title: string, description: string) =>
  field.entity("sensor", { title, description, deviceClass: "power" });

const nodeItem = field.variants(
  "kind",
  {
    input: {
      entities: powerEntities("Power feeding the home (W). Several sensors are summed."),
    },
    output: {
      entities: powerEntities("Power drawn from the home (W). Several sensors are summed."),
      remainder: field.toggle({
        title: "Remainder",
        description:
          "Compute this node as inputs minus the other outputs, so the flow always balances. At most one node.",
      }),
    },
    bidirectional: {
      positive: powerEntity(
        "Incoming power",
        "Power flowing into the home (W), e.g. grid import or battery discharge.",
      ),
      negative: powerEntity(
        "Outgoing power",
        "Power flowing out of the home (W), e.g. grid export or battery charging.",
      ),
      signed: powerEntity(
        "Signed sensor",
        "Single sensor carrying both directions (positive = into the home). Wins over the two separate sensors.",
      ),
      signedOutbound: field.toggle({
        title: "Positive means outgoing",
        description:
          "Flip if the signed sensor reports positive while power flows out of the home (e.g. battery charging).",
      }),
      priced: field.toggle({
        title: "Utility tariff applies",
        description: "Price this connection's import and export with the configured tariff.",
      }),
    },
  },
  {
    title: "Type",
    labels: { input: "Input", output: "Output", bidirectional: "Two-way" },
    shared: {
      label: field.text({ title: "Label", description: "Name shown on the node." }),
      icon: field.icon(),
      level: field.entity("sensor", {
        title: "Charge level",
        description: "Optional. Level sensor (%) shown on the node.",
        deviceClass: "battery",
      }),
    },
  },
);

const nodesField = field
  .list(nodeItem, {
    title: "Flow nodes",
    description:
      "Inputs feed the home, outputs draw from it, two-way nodes switch sides per reading.",
    max: 12,
    addLabel: "Add node",
    labelField: "label",
  })
  .check((ctx) => {
    // Typed assignment doubles as the compile gate keeping node-model.ts in
    // sync with the schema shape.
    const nodes: readonly FlowNodeConfig[] = ctx.value;
    for (const message of validateNodes(nodes)) {
      ctx.issues.push({ code: "custom", message, input: ctx.value });
    }
  });

export const configSchema = defineConfig({
  title: field.title(),
  nodes: nodesField,
  sunEntity: field.entity("sun", {
    title: "Sun entity",
    description:
      "Optional. Your sun.sun entity; input nodes rest after sunset when producing nothing.",
  }),
  tariffCurrency: field.text({
    title: "Currency",
    description:
      "Optional. Currency symbol for cost estimates (e.g. €). Set together with the rate.",
  }),
  tariffRate: field.number({
    title: "Rate per kWh",
    description: "Optional. Price per kWh. Set together with the currency.",
  }),
});

export type EnergyFlowConfig = Infer<typeof configSchema>;
