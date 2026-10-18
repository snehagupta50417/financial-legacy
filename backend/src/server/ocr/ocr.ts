import os from "node:os";
import path from "node:path";
import type { Worker } from "tesseract.js";

/**
 * Local OCR (no AI key needed). Tesseract reads photos and scanned PDF pages
 * on the server, so a family without a Gemini key still gets the text out.
 * Languages come from OCR_LANGS (default English + Hindi; add "tam" for Tamil).
 * Language data is downloaded once and cached in the temp folder.
 */

const LANGS = (process.env.OCR_LANGS || "eng+hin").trim();
const MAX_PDF_PAGES = Number(process.env.OCR_MAX_PDF_PAGES ?? 5);
/** Below this many non-space characters a PDF has no usable text layer. */
export const MIN_TEXT_CHARS = 30;

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker(LANGS, 1, { cachePath: path.join(os.tmpdir(), "finlegacy-ocr") });
    })().catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

export interface OcrResult {
  text: string;
  /** Tesseract's mean word confidence, 0..1. */
  confidence: number;
  pages: number;
}

/** OCR one image (PNG, JPEG or WebP bytes). */
export async function ocrImage(bytes: Uint8Array): Promise<OcrResult> {
  const worker = await getWorker();
  const { data } = await worker.recognize(Buffer.from(bytes));
  return { text: data.text.trim(), confidence: (data.confidence ?? 0) / 100, pages: 1 };
}

export function hasTextLayer(text: string | null | undefined): boolean {
  return !!text && text.replace(/\s/g, "").length >= MIN_TEXT_CHARS;
}

/** Render the first pages of a scanned PDF to images and OCR each one. */
export async function ocrPdf(bytes: Uint8Array): Promise<OcrResult> {
  const { getDocumentProxy, renderPageAsImage } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const pages = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const texts: string[] = [];
  let conf = 0;
  for (let p = 1; p <= pages; p++) {
    const png = await renderPageAsImage(pdf, p, { canvasImport: () => import("@napi-rs/canvas"), scale: 2 });
    const r = await ocrImage(new Uint8Array(png));
    texts.push(r.text);
    conf += r.confidence;
  }
  return { text: texts.join("\n\n").trim(), confidence: pages ? conf / pages : 0, pages };
}

/** Tests and shutdown: release the worker. */
export async function terminateOcr() {
  if (!workerPromise) return;
  const w = await workerPromise.catch(() => null);
  workerPromise = null;
  await w?.terminate();
}
