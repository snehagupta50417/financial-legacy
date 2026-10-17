// Rule-based intake when no model key is set (aiDegraded) — the one-pager's three journeys (FL-01).
import { describe, expect, it } from "vitest";
import { fallbackClassification } from "@/server/domain/intake-fallback";
import { STARTER_PROMPTS } from "@/lib/starters";

const LIVING_QUESTION = "Is the asset holder living or deceased?";

describe("FL-01: fallback classification of the one-pager starters", () => {
  it.each([
    ["claim", STARTER_PROMPTS.claim, "family_death", false],
    ["discover", STARTER_PROMPTS.discover, "living_individual", true],
    ["legacy", STARTER_PROMPTS.legacy, "estate_planning", true],
  ] as const)("FL-01: %s starter opens the right journey", (_, message, caseType, holderLiving) => {
    const cls = fallbackClassification(message);
    expect(cls.caseType).toBe(caseType);
    expect(cls.holderLiving).toBe(holderLiving);
    expect(cls.followUpQuestions).not.toContain(LIVING_QUESTION);
    expect(cls.followUpQuestions.length).toBeLessThanOrEqual(2);
  });

  it("FL-01: the legacy starter does not ask for a death certificate", () => {
    expect(fallbackClassification(STARTER_PROMPTS.legacy).followUpQuestions.join(" ")).not.toMatch(/death certificate/i);
  });

  it("FL-01: 'will' as a verb is not a will", () => {
    expect(fallbackClassification("My mother died last year. Will I get her LIC money?").caseType).toBe("family_death");
    expect(fallbackClassification("I want to write a will for my savings").caseType).toBe("estate_planning");
  });

  it("FL-01: the person's own future death is legacy planning, not a death in the family", () => {
    const cls = fallbackClassification("What happens to my bank accounts after my death?");
    expect(cls.caseType).toBe("estate_planning");
    expect(cls.holderLiving).toBe(true);
  });

  it("FL-01: someone else's asset leaves the holder's status open and asks", () => {
    const cls = fallbackClassification("I found an old LIC policy belonging to my mother.");
    expect(cls.caseType).toBe("living_individual");
    expect(cls.holderLiving).toBeNull();
    expect(cls.followUpQuestions).toContain(LIVING_QUESTION);
  });

  it("FL-01: other situations keep their journeys", () => {
    expect(fallbackClassification("My husband passed away, and I am the nominee on some investments.").caseType).toBe("nominee_heir");
    expect(fallbackClassification("My insurance claim was rejected.").caseType).toBe("rejected_claim");
    expect(fallbackClassification("I live abroad, but my parents have assets in India.").caseType).toBe("nri_cross_border");
    expect(fallbackClassification("I am helping my elderly mother organise her finances.").caseType).toBe("caregiver");
  });
});
