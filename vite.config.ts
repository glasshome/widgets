import { glasshomeWidgets } from "@glasshome/widget-sdk/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid(), ...glasshomeWidgets()],
});
