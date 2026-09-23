import { resolve } from "node:path";

export const OUT_DIR = process.env.SIZES_OUT ?? resolve(import.meta.dirname, "../../.sizes");
