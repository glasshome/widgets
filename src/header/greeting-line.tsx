import { useTranslation, zonedTime } from "@glasshome/widget-sdk";
import { createSignal, onCleanup, onMount } from "solid-js";
import { greetingKey } from "./greeting";

export function GreetingLine(props: { name?: string | null }) {
  const { t } = useTranslation();
  const [now, setNow] = createSignal(new Date());
  onMount(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    onCleanup(() => clearInterval(timer));
  });
  const hello = () => t(greetingKey(zonedTime(now()).hour));
  return (
    <span class="header-greeting">
      {props.name ? t("header.greeting.named", { greeting: hello(), name: props.name }) : hello()}
    </span>
  );
}
