#!/usr/bin/env node
// Fetches REAL PUBLIC reference data (no personal data) from free sources and
// writes a dated snapshot to src/server/data/reference/. Re-run to refresh:
//   node scripts/fetch-reference-data.mjs
// Sources: AMFI NAV file, mfapi.in, Razorpay IFSC dataset, India Post pincode API, RBI homepage.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/server/data/reference");
const UA = { "User-Agent": "Mozilla/5.0 (FinancialLegacy reference-data fetcher)" };
const today = new Date().toISOString().slice(0, 10);

async function get(url, { tries = 3, timeoutMs = 60000, as = "text" } = {}) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return as === "json" ? await res.json() : await res.text();
    } catch (err) {
      if (i === tries) throw new Error(`${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

async function pool(items, size, fn) {
  const out = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

// ---------- Mutual funds: AMFI scheme master + mfapi NAV history ----------

// Popular, long-running schemes across major fund houses. Patterns allow for renames.
const SCHEME_PICKS = [
  { amc: "HDFC Mutual Fund", re: /^HDFC Flexi Cap Fund/i },
  { amc: "HDFC Mutual Fund", re: /^HDFC Balanced Advantage Fund/i },
  { amc: "SBI Mutual Fund", re: /^SBI (Large Cap|Bluechip) Fund/i },
  { amc: "SBI Mutual Fund", re: /^SBI Small Cap Fund/i },
  { amc: "ICICI Prudential Mutual Fund", re: /^ICICI Prudential (Large Cap|Bluechip) Fund/i },
  { amc: "ICICI Prudential Mutual Fund", re: /^ICICI Prudential Balanced Advantage Fund/i },
  { amc: "Axis Mutual Fund", re: /^Axis (ELSS-? ?Tax Saver|Long Term Equity) Fund/i },
  { amc: "Nippon India Mutual Fund", re: /^Nippon India Small Cap Fund/i },
  { amc: "Kotak Mahindra Mutual Fund", re: /^Kotak Flexi ?cap Fund/i },
  { amc: "UTI Mutual Fund", re: /^UTI Nifty 50 Index Fund/i },
  { amc: "Aditya Birla Sun Life Mutual Fund", re: /^Aditya Birla Sun Life (Large Cap|Frontline Equity) Fund/i },
  { amc: "Mirae Asset Mutual Fund", re: /^Mirae Asset Large Cap Fund/i },
  { amc: "Franklin Templeton Mutual Fund", re: /^Franklin India (Flexi Cap|Equity) Fund/i },
  { amc: "DSP Mutual Fund", re: /^DSP (ELSS Tax Saver|Tax Saver) Fund/i },
  { amc: "PPFAS Mutual Fund", re: /^Parag Parikh Flexi Cap Fund/i },
];

function parseAmfi(text) {
  const rows = [];
  let category = "";
  let amc = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (!line.includes(";")) {
      if (/Schemes\s*\(/.test(line)) category = line;
      else amc = line;
      continue;
    }
    const p = line.split(";");
    if (p[0] === "Scheme Code") continue;
    // Current format: code; ISIN payout/growth; ISIN reinvest; name; plan; option; NAV; date
    const [code, isin1, isin2, name, plan, option, nav, date] = p.length >= 8 ? p : [p[0], p[1], p[2], p[3], "", "", p[4], p[5]];
    rows.push({ code: Number(code), isin: isin1 !== "-" ? isin1 : isin2, name, plan, option, nav: Number(nav), date, amc, category });
  }
  return rows;
}

function pickScheme(rows, pick) {
  const candidates = rows.filter((r) => r.amc === pick.amc && pick.re.test(r.name) && Number.isFinite(r.nav));
  const isRegular = (r) => /regular/i.test(`${r.plan} ${r.name}`) && !/direct/i.test(`${r.plan} ${r.name}`);
  const isGrowth = (r) => /growth/i.test(`${r.option} ${r.name}`) && !/idcw|dividend|bonus/i.test(`${r.option} ${r.name}`);
  return candidates.find((r) => isRegular(r) && isGrowth(r)) ?? candidates.find(isGrowth) ?? null;
}

function monthlyNav(history) {
  // mfapi returns newest first, dates as DD-MM-YYYY. Keep the first NAV of each month.
  const byMonth = new Map();
  for (const { date, nav } of [...history].reverse()) {
    const [d, m, y] = date.split("-");
    const key = `${y}-${m}`;
    if (!byMonth.has(key)) byMonth.set(key, [`${y}-${m}-${d}`, Number(nav)]);
  }
  return [...byMonth.values()];
}

async function fetchMutualFunds() {
  const text = await get("https://portal.amfiindia.com/spages/NAVAll.txt");
  const rows = parseAmfi(text);
  const picked = [];
  for (const pick of SCHEME_PICKS) {
    const s = pickScheme(rows, pick);
    if (!s) console.warn(`  ! no scheme matched ${pick.re} (${pick.amc})`);
    else picked.push(s);
  }
  const schemes = await pool(picked, 3, async (s) => {
    const json = await get(`https://api.mfapi.in/mf/${s.code}`, { as: "json", timeoutMs: 90000 });
    const history = monthlyNav(json.data ?? []);
    return {
      schemeCode: s.code,
      isin: s.isin,
      name: s.name,
      plan: s.plan,
      option: s.option,
      fundHouse: s.amc,
      category: json.meta?.scheme_category ?? s.category,
      latest: { date: s.date, nav: s.nav },
      firstNavDate: history[0]?.[0] ?? null,
      monthlyNav: history,
    };
  });
  return { totalSchemesInAmfiFile: rows.length, schemes };
}

// ---------- Bank branches: Razorpay IFSC dataset ----------

const BANKS = { SBIN: "State Bank of India", HDFC: "HDFC Bank", ICIC: "ICICI Bank", PUNB: "Punjab National Bank", BARB: "Bank of Baroda", UTIB: "Axis Bank", KKBK: "Kotak Mahindra Bank", CNRB: "Canara Bank" };
const CITIES = ["PUNE", "NEW DELHI", "DELHI", "CHENNAI", "ERNAKULAM", "KOCHI", "LUCKNOW", "KOLKATA", "BENGALURU", "BANGALORE", "MUMBAI", "HYDERABAD", "JAIPUR"];
const PER_BANK_CITY = 3;

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function fetchBranches() {
  const rel = await get("https://api.github.com/repos/razorpay/ifsc/releases/latest", { as: "json" });
  const asset = rel.assets.find((a) => a.name === "IFSC.csv");
  const csv = await get(asset.browser_download_url, { timeoutMs: 180000 });
  const lines = csv.split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const col = (n) => header.indexOf(n);
  const groups = new Map();
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const r = parseCsvLine(lines[i]);
    const ifsc = r[col("IFSC")];
    const prefix = ifsc?.slice(0, 4);
    if (!BANKS[prefix]) continue;
    const city = (r[col("CITY")] || r[col("CENTRE")] || "").toUpperCase();
    const district = (r[col("DISTRICT")] || "").toUpperCase();
    const target = CITIES.find((c) => city === c || district === c);
    if (!target) continue;
    const address = r[col("ADDRESS")];
    const pincode = address?.match(/\b[1-9]\d{5}\b/)?.[0] ?? null;
    if (!pincode) continue;
    const key = `${prefix}|${target}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      bank: BANKS[prefix],
      ifsc,
      branch: r[col("BRANCH")],
      address,
      city: r[col("CITY")],
      district: r[col("DISTRICT")],
      state: r[col("STATE")],
      pincode,
      micr: r[col("MICR")] || null,
    });
  }
  const branches = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.ifsc.localeCompare(b.ifsc));
    const step = Math.max(1, Math.floor(list.length / PER_BANK_CITY));
    for (let i = 0; i < list.length && branches.filter((b) => b.bank === list[0].bank && b.city === list[0].city).length < PER_BANK_CITY; i += step) branches.push(list[i]);
  }
  return { datasetVersion: rel.tag_name, totalRowsInDataset: lines.length - 1, branches };
}

// ---------- Pincodes: India Post ----------

async function fetchPincodes(pins) {
  const results = await pool(pins, 4, async (pin) => {
    try {
      const json = await get(`https://api.postalpincode.in/pincode/${pin}`, { as: "json", timeoutMs: 30000 });
      const offices = json?.[0]?.PostOffice ?? [];
      if (!offices.length) return null;
      return {
        pincode: pin,
        district: offices[0].District,
        state: offices[0].State,
        postOffices: offices.slice(0, 6).map((o) => o.Name),
      };
    } catch {
      return null;
    }
  });
  return results.filter(Boolean);
}

// ---------- RBI policy rates ----------

async function fetchRbiRates() {
  const html = (await get("https://www.rbi.org.in/")).replace(/\s+/g, " ");
  const rate = (label) => {
    const m = html.match(new RegExp(`${label}\\s*</th>\\s*<td[^>]*>\\s*:?\\s*([\\d.]+)\\s*%`, "i"));
    return m ? Number(m[1]) : null;
  };
  return {
    policyRepoRate: rate("Policy Repo Rate"),
    bankRate: rate("Bank Rate"),
    msfRate: rate("Marginal Standing Facility Rate"),
    source: "https://www.rbi.org.in/ (Current Rates panel)",
  };
}

// ---------- main ----------

async function main() {
  await mkdir(OUT, { recursive: true });
  const meta = (source) => ({ fetchedOn: today, source });

  console.log("Fetching mutual funds (AMFI + mfapi)…");
  const mf = await fetchMutualFunds();
  await writeFile(path.join(OUT, "mutual-funds.json"), JSON.stringify({ ...meta("https://portal.amfiindia.com/spages/NAVAll.txt + https://api.mfapi.in"), ...mf }, null, 1));
  console.log(`  ${mf.schemes.length} schemes`);

  console.log("Fetching bank branches (Razorpay IFSC)…");
  const br = await fetchBranches();
  await writeFile(path.join(OUT, "bank-branches.json"), JSON.stringify({ ...meta("https://github.com/razorpay/ifsc (MIT licence)"), ...br }, null, 1));
  console.log(`  ${br.branches.length} branches`);

  console.log("Fetching pincodes (India Post)…");
  const pins = [...new Set(br.branches.map((b) => b.pincode))];
  const pc = await fetchPincodes(pins);
  await writeFile(path.join(OUT, "pincodes.json"), JSON.stringify({ ...meta("https://api.postalpincode.in"), pincodes: pc }, null, 1));
  console.log(`  ${pc.length} pincodes`);

  console.log("Fetching RBI rates…");
  const rbi = await fetchRbiRates();
  await writeFile(path.join(OUT, "rbi-rates.json"), JSON.stringify({ fetchedOn: today, ...rbi }, null, 1));
  console.log(`  repo ${rbi.policyRepoRate}%, bank rate ${rbi.bankRate}%`);

  console.log(`Done → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
