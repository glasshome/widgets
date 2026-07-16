import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const here = resolve(import.meta.dirname);
const widgetsRoot = resolve(here, "..");

export default defineConfig({
  root: here,
  // delegateEvents: false — widgets mount in closed shadow roots where Solid's
  // document-level event delegation cannot see the target (matches the widgets
  // build and dash mount). tailwindcss() compiles @glasshome/ui/styles so the
  // app theme tokens land on :root exactly as they do in dash.
  plugins: [tailwindcss(), solid({ solid: { delegateEvents: false } })],
  server: {
    fs: {
      // harness.tsx imports the built bundle from ../dist and the workspace deps.
      allow: [here, widgetsRoot, resolve(widgetsRoot, "..", "..", "..")],
    },
  },
});
