import { PERSONAS } from "./personas";

/**
 * The backend's synthetic demo cases (POST /api/demo), each told through one persona (see personas.ts).
 * People and identifiers are made up; the banks, branches, fund schemes and NAVs behind them are real
 * public reference data. Keep in step with backend/src/server/data/synthetic/demo-cases.ts.
 */
export const DEMO_SCENARIOS = PERSONAS.map((p) => ({ key: p.demoKey, persona: p }));
