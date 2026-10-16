/**
 * Upload validation: size cap and content sniffing. The declared MIME type
 * and file name are client-controlled, so the first bytes decide.
 */

export type SniffedKind = "pdf" | "png" | "jpeg" | "webp" | "text" | "unknown";

export function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB ?? 8);
  return (Number.isFinite(mb) && mb > 0 ? mb : 8) * 1024 * 1024;
}

export function sniff(bytes: Uint8Array): SniffedKind {
  const b = bytes;
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "pdf";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  // Text: valid UTF-8 with no NUL bytes in the first 4 KB
  const head = b.subarray(0, 4096);
  if (head.includes(0)) return "unknown";
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(head);
    return "text";
  } catch {
    return "unknown";
  }
}

export const IMAGE_MIME: Partial<Record<SniffedKind, string>> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export type UploadCheck =
  | { ok: true; bytes: Uint8Array; kind: SniffedKind }
  | { ok: false; status: 400 | 413 | 415; error: string };

export async function readUpload(file: File, allowed: SniffedKind[]): Promise<UploadCheck> {
  if (file.size > maxUploadBytes()) {
    return { ok: false, status: 413, error: `File too large (max ${Math.round(maxUploadBytes() / 1024 / 1024)}MB)` };
  }
  if (file.size === 0) return { ok: false, status: 400, error: "The file is empty" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!allowed.includes(kind)) {
    return { ok: false, status: 415, error: `Unsupported file content. Allowed: ${allowed.join(", ")}.` };
  }
  return { ok: true, bytes, kind };
}
