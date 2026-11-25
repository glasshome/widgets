import { fireEvent, render } from "@solidjs/testing-library";
import { WidgetLanguage } from "@glasshome/widget-sdk/testing";
import type { WidgetDialogProps } from "@glasshome/widget-sdk";
import type { JSX } from "solid-js";
import { describe, expect, test, vi } from "vitest";
import { ClockDialog } from "../../src/clock/dialog";
import type { ClockConfig } from "../../src/clock/types";
import { getDefaultConfig } from "../../src/clock/utils";
import { catalogsOf, language } from "../catalog";

const word = (tag: string, key: string): string => {
  const parts = catalogsOf("clock")[tag]?.[key];
  if (parts?.length !== 1 || typeof parts[0] !== "string") throw new Error(`clock ${tag} ${key}`);
  return parts[0];
};

const passthrough = (props: { children?: JSX.Element }) => <div>{props.children}</div>;

const stubs = {
  ResponsiveDialog: passthrough,
  ResponsiveDialogContent: passthrough,
  ResponsiveDialogHeader: passthrough,
  ResponsiveDialogTitle: passthrough,
  ResponsiveDialogDescription: passthrough,
  ResponsiveDialogBody: passthrough,
  ResponsiveDialogFooter: passthrough,
  Button: (props: { children?: JSX.Element; onClick?: () => void }) => (
    <button type="button" onClick={() => props.onClick?.()}>
      {props.children}
    </button>
  ),
} as unknown as Partial<WidgetDialogProps>;

const dialog = (tag: "en" | "fr", config: ClockConfig, onConfigSave = vi.fn()) =>
  render(() => (
    <WidgetLanguage {...language("clock", tag)}>
      <ClockDialog
        config={config}
        dialog={{ ...stubs, open: true, onOpenChange: () => {}, activeTab: "edit" }}
        onConfigSave={onConfigSave}
      />
    </WidgetLanguage>
  ));

describe("the clock's dialog", () => {
  test("the clock's dialog reads French from its catalog", () => {
    const view = dialog("fr", getDefaultConfig());
    expect(view.getByText(word("fr", "clock.dialog.style.label"))).toBeTruthy();
  });

  test("the clock's dialog reads English with no catalog", () => {
    const view = dialog("en", getDefaultConfig());
    expect(view.getByText("Clock Style")).toBeTruthy();
  });

  test("a migrated clock's dialog shows Automatic selected", () => {
    const onConfigSave = vi.fn();
    const config: ClockConfig = {
      ...getDefaultConfig(),
      timeFormat: "auto",
      dateFormat: "auto",
      showDate: true,
    };
    const view = dialog("en", config, onConfigSave);
    expect(view.getAllByText("Automatic")).toHaveLength(2);
    fireEvent.click(view.getByRole("button", { name: "Save" }));
    expect(onConfigSave).toHaveBeenCalledTimes(1);
    expect(onConfigSave.mock.calls[0]?.[0]).toMatchObject({
      timeFormat: "auto",
      dateFormat: "auto",
    });
  });
});
