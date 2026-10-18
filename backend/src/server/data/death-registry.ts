/**
 * SYNTHETIC civil-registration records used by the mock DigiLocker death
 * certificate fetch. None of these are real people. When a name is not in
 * this list the mock returns a clearly-labelled simulated record built from
 * the user's own input (so any synthetic test persona can proceed).
 */
export interface DeathRecord {
  registrationNo: string;
  name: string;
  dob: string; // YYYY-MM-DD
  dateOfDeath: string; // YYYY-MM-DD
  placeOfDeath: string;
  issuingAuthority: string;
}

export const SYNTHETIC_DEATH_REGISTRY: DeathRecord[] = [
  {
    registrationNo: "DL-SDMC-2026-D-004417",
    name: "Rajesh Kumar Sharma",
    dob: "1956-08-14",
    dateOfDeath: "2026-02-18",
    placeOfDeath: "New Delhi",
    issuingAuthority: "South Delhi Municipal Corporation (synthetic)",
  },
  {
    registrationNo: "UP-LKO-2026-D-001902",
    name: "Mohan Lal",
    dob: "1949-11-02",
    dateOfDeath: "2026-06-30",
    placeOfDeath: "Lucknow",
    issuingAuthority: "Lucknow Municipal Corporation (synthetic)",
  },
];
