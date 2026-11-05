import { _api } from "@iconify-icon/solid";

_api.setFetch((() =>
  Promise.reject(new Error("iconify network is disabled in tests"))) as unknown as typeof fetch);
