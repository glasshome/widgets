import { _api } from "@iconify-icon/solid";
import { configure } from "@solidjs/testing-library";

// test-change-ok hang guard for findBy* and waitFor, matching the expect.poll guard in vitest.config.ts
configure({ asyncUtilTimeout: 4_000 });

_api.setFetch((() =>
  Promise.reject(new Error("iconify network is disabled in tests"))) as unknown as typeof fetch);
