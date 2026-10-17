/**
 * The one-pager's three journeys as first messages (§3, §12). Shared by the
 * landing page and the intake starters so tests run the exact words users send.
 */
export const STARTER_PROMPTS = {
  claim: "My father passed away. Help me find and claim what he left behind.",
  discover: "I want to know what financial assets I have. I invested in mutual funds years ago but don't remember where.",
  legacy: "I want to make sure my family can find everything when I'm gone.",
} as const;
