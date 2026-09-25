import {
  buildDebugData,
  defineConfig,
  defineWidget,
  field,
  type Infer,
  useEntities,
  useService,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  type WidgetDebugData,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import doorSwing from "../common/art/assets/door-swing.strip";
import { ArtStrip } from "../common/art/strip";
import { groupLine } from "../common/group";
import { Tile, TileGlyph, TileHead, TileHero } from "../common/tile/tile";
import boltSlide from "./assets/bolt-slide.strip";
import gateSwing from "./assets/gate-swing.strip";
import { LockPanel } from "./panel";

const OPEN_STATES = new Set(["unlocked", "open", "opening"]);

const ART = { door: doorSwing, gate: gateSwing, smart: boltSlide };

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("lock"),
  art: field.choice(["door", "gate", "smart"], {
    title: "Lock picture",
    default: "door",
    labels: { door: "Front door", gate: "Garden gate", smart: "Smart lock" },
    icons: { door: "mdi:door", gate: "mdi:gate", smart: "mdi:lock-smart" },
  }),
});

type LockConfig = Infer<typeof configSchema>;

function LockWidget(props: { config: LockConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
  const [isToggling, setIsToggling] = createSignal(false);

  const entities = useEntities(() => props.config.entityIds);

  const { emptyState, hasEntities, count } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "switch",
    emptyStateConfig: {
      icon: <Icon icon="mdi:lock" width={32} />,
      title: "No lock entity",
      message: "Hold to configure",
    },
  });

  const { callService } = useService();

  const lockedCount = createMemo(() => entities().filter((e) => e.state === "locked").length);
  const isLocked = createMemo(() => count() > 0 && lockedCount() === count());

  const name = () =>
    props.config.title ||
    entities()
      .map((e) => e.friendlyName)
      .join(", ") ||
    "Lock";
  const art = () => (
    <ArtStrip
      strip={ART[props.config.art]}
      end={entities().some((e) => OPEN_STATES.has(e.state))}
    />
  );
  const heroValue = () => (isLocked() ? "Locked" : "Unlocked");
  const eyebrow = () =>
    count() > 1
      ? groupLine(count() - lockedCount(), count(), { active: "unlocked", rest: "locked" })
      : "Lock";

  // A group never unlocks in one tap: it locks what is open, and once all are locked the dialog unlocks one by one.
  const handleTap = async () => {
    if (count() > 1 && isLocked()) {
      openDialog();
      return;
    }
    if (isToggling()) return;
    setIsToggling(true);
    const timeout = setTimeout(() => setIsToggling(false), 5000);
    try {
      if (isLocked()) {
        await callService("lock", "unlock", {}, { entity_id: entities().map((e) => e.id) });
      } else {
        const open = entities().filter((e) => e.state !== "locked");
        await callService("lock", "lock", {}, { entity_id: open.map((e) => e.id) });
      }
    } finally {
      clearTimeout(timeout);
      setIsToggling(false);
    }
  };

  const gestures = useWidgetGestures(() => ({
    tap: handleTap,
    hold: { action: openDialog },
  }));
  onCleanup(gestures.dispose);

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const ents = entities();
    if (ents.length === 0) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, ents);
  });

  return (
    <>
      <Widget
        gestures={gestures}
        variant="classic-glass"
        tone={isLocked() ? "success" : "warning"}
        loading={isToggling()}
        emptyState={emptyState()}
      >
        <Show when={hasEntities()}>
          <Tile active={isLocked()}>
            <TileGlyph icon={isLocked() ? "mdi:lock" : "mdi:lock-open"} />
            <TileHead
              icon={isLocked() ? "mdi:lock" : "mdi:lock-open-variant"}
              eyebrow={eyebrow()}
              name={name()}
              active={isLocked()}
              count={entities().length}
            />
            <TileHero value={heroValue()} art={art()} />
          </Tile>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title={name()}
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        panel={
          <Show when={hasEntities()}>
            <LockPanel
              entities={entities()}
              name={name()}
              eyebrow={eyebrow()}
              locked={isLocked()}
              art={art()}
            />
          </Show>
        }
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<LockConfig>({
  manifest: {
    name: "Lock",
    description: "Lock and unlock entities with security indicator",
    icon: "mdi:lock",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 8 },
    defaultSize: { w: 2, h: 2 },
    configVersion: 1,
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Front door",
        size: { w: 2, h: 2 },
        config: { entityIds: ["lock.front_door_lock"], title: "Front Door", art: "door" },
      },
      {
        label: "Locked",
        size: { w: 1, h: 1 },
        config: { entityIds: ["lock.front_door_lock"], title: "Front Door", art: "door" },
      },
      {
        label: "Unlocked",
        size: { w: 2, h: 2 },
        config: { entityIds: ["lock.side_gate"], title: "Side Gate", art: "gate" },
      },
      {
        label: "Locks",
        size: { w: 3, h: 2 },
        config: {
          entityIds: ["lock.front_door_lock", "lock.back_door_lock"],
          title: "Locks",
          art: "smart",
        },
      },
    ],
  },
  configSchema,
  component: LockWidget,
});
