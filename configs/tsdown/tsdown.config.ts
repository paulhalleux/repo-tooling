import { defineConfig } from "tsdown";
import tsdownBaseOptions from "./src/options.ts";

export default defineConfig({
  ...tsdownBaseOptions,
  entry: ["src/index.ts"]
});
