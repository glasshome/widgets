import { configure } from "@solidjs/testing-library";

// test-change-ok hang guard for findBy* and waitFor, matching the expect.poll guard in vitest.config.ts
configure({ asyncUtilTimeout: 4_000 });
