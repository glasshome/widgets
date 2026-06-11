import { glasshomeWidgets } from "@glasshome/widget-sdk/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    // delegateEvents: false — widgets render inside closed shadow roots where
    // Solid's document-level event delegation cannot see the target. Events
    // must attach directly to elements.
    solid({ solid: { delegateEvents: false } }),
    ...glasshomeWidgets(),
  ],
});
