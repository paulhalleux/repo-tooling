import type { UserConfig } from "tsdown";

const tsdownBaseOptions: UserConfig = {
  clean: true,
  dts: true,
  format: ["esm"],
  sourcemap: true,
  target: "es2022"
};

export default tsdownBaseOptions;
