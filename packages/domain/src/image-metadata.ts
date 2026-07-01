// Byte-level image metadata stripping (CX-20260701-profile-photo-series-up-to-six).
//
// Profile photos are sensitive: a phone photo commonly carries EXIF including
// precise GPS coordinates, device serial, and timestamps. Uploading that as-is
// would leak a member's exact location — a direct violation of the product's
// approximate-location privacy posture. Before any bytes reach the blob store we
// strip metadata.
//
// This is a dependency-free, byte-level strip (not a full re-encode): it walks the
// container structure and drops the segments/chunks that carry metadata, keeping
// only the image data needed to render. That reliably removes EXIF GPS without
// pulling in a native image codec. It is pure and fully unit-tested.
//
//   - JPEG: drop every APPn marker segment (APP0..APP15, 0xFFE0..0xFFEF) — EXIF
//     lives in APP1 ("Exif\0\0"), XMP in APP1 ("http://ns.adobe.com/xap/"), and
//     other metadata in the remaining APPn/COM segments. Keep SOI, quantisation/
//     Huffman tables, frame/scan, and entropy-coded data.
//   - PNG: drop ancillary metadata chunks (tEXt, iTXt, zTXt, eXIf, tIME) — eXIf is
//     where PNG carries EXIF/GPS — keeping the critical chunks (IHDR, PLTE, IDAT,
//     IEND, etc.).
//   - WebP: drop the EXIF and XMP chunks from an extended (RIFF) WebP.
//
// If the container is unrecognised, we fail closed by returning null so the caller
// rejects the upload rather than storing un-scrubbed bytes.

const JPEG_SOI = 0xffd8;
const JPEG_SOS = 0xffda; // start of scan — entropy data follows, stop segment parsing

function isAppOrComMarker(marker: number): boolean {
  // APP0..APP15 (0xFFE0..0xFFEF) and COM (0xFFFE) carry metadata.
  return (marker >= 0xffe0 && marker <= 0xffef) || marker === 0xfffe;
}

function stripJpeg(bytes: Uint8Array): Uint8Array | null {
  if (bytes.length < 2 || (bytes[0] << 8) | bytes[1]) {
    if (((bytes[0] << 8) | bytes[1]) !== JPEG_SOI) return null;
  }
  const out: number[] = [0xff, 0xd8];
  let offset = 2;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) return null; // not aligned on a marker — malformed
    // Skip fill bytes (0xFF 0xFF...).
    let markerByte = bytes[offset + 1];
    let markerStart = offset;
    while (markerByte === 0xff && markerStart + 2 < bytes.length) {
      markerStart += 1;
      markerByte = bytes[markerStart + 1];
    }
    const marker = 0xff00 | markerByte;
    if (marker === JPEG_SOS) {
      // Copy the rest verbatim (scan + entropy data + EOI).
      for (let i = markerStart; i < bytes.length; i += 1) out.push(bytes[i]);
      return Uint8Array.from(out);
    }
    // Standalone markers (RSTn, TEM) have no length payload; none appear before SOS
    // in a well-formed file, so any marker here is a length-prefixed segment.
    const lengthHigh = bytes[markerStart + 2];
    const lengthLow = bytes[markerStart + 3];
    if (lengthHigh === undefined || lengthLow === undefined) return null;
    const segmentLength = (lengthHigh << 8) | lengthLow;
    const segmentEnd = markerStart + 2 + segmentLength;
    if (segmentEnd > bytes.length) return null;
    if (!isAppOrComMarker(marker)) {
      // Keep this segment (tables, frame headers, etc.) verbatim, including marker.
      for (let i = markerStart; i < segmentEnd; i += 1) out.push(bytes[i]);
    }
    offset = segmentEnd;
  }
  return Uint8Array.from(out);
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_METADATA_CHUNKS = new Set(["tEXt", "iTXt", "zTXt", "eXIf", "tIME"]);

function stripPng(bytes: Uint8Array): Uint8Array | null {
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return null;
  }
  const out: number[] = [...PNG_SIGNATURE];
  let offset = PNG_SIGNATURE.length;
  const decoder = new TextDecoder("latin1");
  while (offset + 8 <= bytes.length) {
    const length =
      (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    const type = decoder.decode(bytes.subarray(offset + 4, offset + 8));
    const chunkEnd = offset + 12 + length; // 4 len + 4 type + data + 4 crc
    if (length < 0 || chunkEnd > bytes.length) return null;
    if (!PNG_METADATA_CHUNKS.has(type)) {
      for (let i = offset; i < chunkEnd; i += 1) out.push(bytes[i]);
    }
    offset = chunkEnd;
    if (type === "IEND") break;
  }
  return Uint8Array.from(out);
}

const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];
const WEBP_METADATA_CHUNKS = new Set(["EXIF", "XMP "]);

function stripWebp(bytes: Uint8Array): Uint8Array | null {
  for (let i = 0; i < 4; i += 1) if (bytes[i] !== RIFF[i]) return null;
  for (let i = 0; i < 4; i += 1) if (bytes[i + 8] !== WEBP[i]) return null;
  const decoder = new TextDecoder("latin1");
  const kept: number[] = [];
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = decoder.decode(bytes.subarray(offset, offset + 4));
    const size =
      bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24);
    if (size < 0) return null;
    const padded = size + (size % 2); // chunks are padded to even length
    const chunkEnd = offset + 8 + padded;
    if (chunkEnd > bytes.length) return null;
    if (!WEBP_METADATA_CHUNKS.has(type)) {
      for (let i = offset; i < chunkEnd; i += 1) kept.push(bytes[i]);
    }
    offset = chunkEnd;
  }
  // Rebuild the RIFF header with the corrected payload size.
  const payloadSize = 4 + kept.length; // "WEBP" + chunks
  const out: number[] = [
    ...RIFF,
    payloadSize & 0xff,
    (payloadSize >> 8) & 0xff,
    (payloadSize >> 16) & 0xff,
    (payloadSize >> 24) & 0xff,
    ...WEBP,
    ...kept,
  ];
  return Uint8Array.from(out);
}

/**
 * Strip metadata from an image buffer according to its declared MIME type.
 * Returns the scrubbed bytes, or null when the container is unrecognised or
 * malformed (fail closed — the caller must reject rather than store raw bytes).
 */
export function stripImageMetadata(mimeType: string, bytes: Uint8Array): Uint8Array | null {
  switch (mimeType) {
    case "image/jpeg":
      return stripJpeg(bytes);
    case "image/png":
      return stripPng(bytes);
    case "image/webp":
      return stripWebp(bytes);
    default:
      return null;
  }
}
