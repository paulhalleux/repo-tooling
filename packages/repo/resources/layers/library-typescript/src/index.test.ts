import { describe, expect, it } from "vitest";

import { greet } from "./index.js";

describe("greet", () => {
  it("greets the supplied name", () => {
    expect(greet("world")).toBe("Hello, world!");
  });
});
