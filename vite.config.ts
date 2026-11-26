import solid from "@solidjs/vite-plugin";
import { glasshomeWidgets } from "@glasshome/widget-sdk/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [solid({ dev: false, refresh: false }), ...glasshomeWidgets()],
});
