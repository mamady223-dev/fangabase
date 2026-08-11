import { describe, expect, it } from "vitest";
import { shouldUseAutomaticAgentMode } from "./create-mode.js";

describe("sélection automatique du parcours create", () => {
  it("conserve le questionnaire humain lorsque stdin est un TTY", () => {
    expect(shouldUseAutomaticAgentMode(true, {})).toBe(false);
  });

  it("active le protocole agent sans TTY et sans option", () => {
    expect(shouldUseAutomaticAgentMode(false, {})).toBe(true);
  });

  it.each([
    ["config", { config: "config.yaml" }],
    ["brief", { brief: "brief.md" }],
    ["answers", { answers: "answers.json" }],
    ["destination", { destination: "projet" }],
    ["confirmation", { yes: true }],
    ["dry-run", { dryRun: true }],
  ])("ne détourne pas le parcours explicite %s", (_label, options) => {
    expect(shouldUseAutomaticAgentMode(false, options)).toBe(false);
  });
});
