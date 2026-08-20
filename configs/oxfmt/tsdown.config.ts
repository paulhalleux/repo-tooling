import { defineConfig } from "tsdown";
import sharedConfig from "@paulhalleux/tsdown-config";

export default defineConfig({
  ...sharedConfig,
  entry: ["src/index.ts"]
});
