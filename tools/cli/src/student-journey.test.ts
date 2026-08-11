import { describe, expect, it } from "vitest";
import {
  needsProjectValidation,
  studentJourneyStates,
} from "./student-journey.js";

describe("parcours étudiant", () => {
  it("commence par la validation lorsque le brief manque", async () => {
    expect(needsProjectValidation("0.4.0-rc.1")).toEqual(
      expect.objectContaining({
        status: "NEEDS_PROJECT_VALIDATION",
        workflow_file: "Fanga_validation_projet.md",
      }),
    );
  });

  it("publie tous les états stables du parcours officiel", () => {
    expect(studentJourneyStates).toContain("READY_FOR_DRY_RUN");
    expect(studentJourneyStates).toContain("NEEDS_DESIGN_ACTIVATION");
    expect(studentJourneyStates.at(-1)).toBe("FAIL");
  });
});
