import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { PackContent } from "@shared/claim-pack";

/**
 * The approved claim pack as a PDF the family prints or attaches themselves
 * (LLD §11.3). It is a checklist and summary prepared by the family with our
 * help — clearly not an official institution form.
 */

// Standard PDF fonts only cover Latin-1 (WinAnsi): spell out the rupee sign, drop anything else unsupported.
function safe(text: string): string {
  return text
    .replace(/₹\s?/g, "Rs. ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E -ÿ–—•]/g, "?");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of safe(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

export async function renderClaimPack(
  c: PackContent,
  meta: { version: number; contentHash: string; approvedAt: string; demo: boolean }
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(safe(`Claim pack — ${c.institution}`));
  pdf.setProducer("Financial Legacy");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.06, 0.14, 0.27);
  const grey = rgb(0.35, 0.38, 0.42);
  const margin = 50;
  const width = 595 - margin * 2;
  let page: PDFPage = pdf.addPage([595, 842]);
  let y = 842 - margin;

  const ensure = (h: number) => {
    if (y - h < margin + 30) {
      page = pdf.addPage([595, 842]);
      y = 842 - margin;
    }
  };
  const text = (t: string, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) => {
    const size = opts.size ?? 10;
    const font = opts.font ?? regular;
    for (const line of wrap(t, font, size, width - (opts.indent ?? 0))) {
      ensure(size + 4);
      page.drawText(line, { x: margin + (opts.indent ?? 0), y, size, font, color: opts.color ?? rgb(0.1, 0.1, 0.12) });
      y -= size + 4;
    }
    y -= opts.gap ?? 0;
  };
  const heading = (t: string) => {
    y -= 6;
    text(t, { size: 12, font: bold, color: navy, gap: 2 });
  };

  text("Claim pack", { size: 20, font: bold, color: navy });
  text(`${c.pathLabel} — ${c.institution}`, { size: 13, font: bold, gap: 4 });
  text(
    `Prepared by the claimant with Financial Legacy. This is a checklist and summary, not an official form of ${c.institution}. ` +
      `The claimant submits it themselves; Financial Legacy does not submit claims.`,
    { color: grey, gap: 6 }
  );
  if (meta.demo) text("DEMO — synthetic data. Not a real claim.", { font: bold, color: rgb(0.55, 0.35, 0.05), gap: 4 });

  heading("Why this path");
  text(c.explanation, { gap: 2 });

  heading("Details (checked values only)");
  for (const f of c.prefill) {
    text(`${f.label}: ${f.value}`, { font: bold, size: 10 });
    text(f.source, { size: 8.5, color: grey, indent: 10, gap: 2 });
  }

  heading("Documents");
  for (const i of c.items) {
    const mark = i.state === "missing" ? "[ ]" : "[x]";
    text(`${mark} ${i.label}${i.required ? "" : " (optional)"}${i.documentName ? ` — ${i.documentName}` : ""}`);
    if (i.note) text(i.note, { size: 8.5, color: grey, indent: 18 });
  }

  heading("Where to submit");
  text(c.whereToSubmit);
  heading("How long it should take");
  text(c.timeline);

  heading("Declarations confirmed by the claimant");
  for (const d of c.declarations) text(`${d.accepted ? "[x]" : "[ ]"} ${d.text}`);

  heading("Please note");
  for (const n of c.notes) text(`• ${n}`);

  heading("Source");
  text(`${c.procedure.title}, version ${c.procedure.version}, checked ${c.procedure.checkedOn}.`);
  text(c.procedure.authority, { color: grey });
  text(c.procedure.sourceUrl, { color: grey, size: 8.5 });

  // Footer on every page: version and fingerprint tie the paper to the approval.
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(safe(`Pack version ${meta.version} · approved ${meta.approvedAt} · fingerprint ${meta.contentHash.slice(0, 16)} · page ${i + 1} of ${pages.length}`), {
      x: margin,
      y: 28,
      size: 7.5,
      font: regular,
      color: grey,
    });
  });
  return pdf.save();
}
