import { describe, expect, it } from "vitest";

import { stripImageMetadata } from "./image-metadata";

// Marker bytes that would appear inside an EXIF GPS block; used as a sentinel to
// prove the metadata segment is gone after stripping.
const GPS_SENTINEL = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x47, 0x50, 0x53]; // "Exif\0\0GPS"

function contains(haystack: Uint8Array, needle: number[]): boolean {
  outer: for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

function buildJpegWithExif(): Uint8Array {
  // SOI + APP1(EXIF w/ GPS sentinel) + a DQT-like table segment + SOS + data + EOI.
  const app1Payload = [...GPS_SENTINEL, 0x11, 0x22, 0x33];
  const app1Len = app1Payload.length + 2;
  const dqtPayload = [0x00, 0x01, 0x02, 0x03];
  const dqtLen = dqtPayload.length + 2;
  return Uint8Array.from([
    0xff, 0xd8, // SOI
    0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff, ...app1Payload, // APP1 (EXIF)
    0xff, 0xdb, (dqtLen >> 8) & 0xff, dqtLen & 0xff, ...dqtPayload, // DQT (keep)
    0xff, 0xda, 0x00, 0x02, // SOS (no real payload, just header length 2)
    0x99, 0x88, 0x77, // scan/entropy data
    0xff, 0xd9, // EOI
  ]);
}

function buildPngWithExif(): Uint8Array {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const chunk = (type: string, data: number[]): number[] => {
    const typeBytes = [...type].map((c) => c.charCodeAt(0));
    const len = data.length;
    return [
      (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff,
      ...typeBytes, ...data,
      0x00, 0x00, 0x00, 0x00, // fake CRC (stripper does not verify CRC)
    ];
  };
  return Uint8Array.from([
    ...signature,
    ...chunk("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
    ...chunk("eXIf", GPS_SENTINEL), // EXIF/GPS metadata (must be stripped)
    ...chunk("tEXt", [0x41, 0x42, 0x43]), // text metadata (must be stripped)
    ...chunk("IDAT", [0x10, 0x20, 0x30]), // image data (keep)
    ...chunk("IEND", []),
  ]);
}

describe("stripImageMetadata (no precise-location leak)", () => {
  it("removes the EXIF/GPS segment from a JPEG while keeping image tables and scan data", () => {
    const original = buildJpegWithExif();
    expect(contains(original, GPS_SENTINEL)).toBe(true);

    const scrubbed = stripImageMetadata("image/jpeg", original);
    expect(scrubbed).not.toBeNull();
    // The GPS/EXIF sentinel is gone.
    expect(contains(scrubbed as Uint8Array, GPS_SENTINEL)).toBe(false);
    // The scan/entropy bytes survive (image is still renderable).
    expect(contains(scrubbed as Uint8Array, [0x99, 0x88, 0x77])).toBe(true);
    // The DQT table survives.
    expect(contains(scrubbed as Uint8Array, [0xff, 0xdb])).toBe(true);
  });

  it("removes eXIf and tEXt chunks from a PNG while keeping IHDR/IDAT/IEND", () => {
    const original = buildPngWithExif();
    expect(contains(original, GPS_SENTINEL)).toBe(true);

    const scrubbed = stripImageMetadata("image/png", original);
    expect(scrubbed).not.toBeNull();
    expect(contains(scrubbed as Uint8Array, GPS_SENTINEL)).toBe(false);
    // "ABC" text chunk removed.
    expect(contains(scrubbed as Uint8Array, [0x41, 0x42, 0x43])).toBe(false);
    // IDAT image data kept.
    expect(contains(scrubbed as Uint8Array, [0x49, 0x44, 0x41, 0x54])).toBe(true);
    // IEND kept.
    expect(contains(scrubbed as Uint8Array, [0x49, 0x45, 0x4e, 0x44])).toBe(true);
  });

  it("removes the EXIF chunk from an extended WebP", () => {
    const riff = [0x52, 0x49, 0x46, 0x46];
    const webp = [0x57, 0x45, 0x42, 0x50];
    const webpChunk = (type: string, data: number[]): number[] => {
      const typeBytes = [...type].map((c) => c.charCodeAt(0));
      const size = data.length;
      const padded = size % 2 === 1 ? [...data, 0x00] : data;
      return [...typeBytes, size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff, ...padded];
    };
    const chunks = [
      ...webpChunk("VP8 ", [0x01, 0x02, 0x03, 0x04]),
      ...webpChunk("EXIF", GPS_SENTINEL),
    ];
    const payloadSize = 4 + chunks.length;
    const original = Uint8Array.from([
      ...riff,
      payloadSize & 0xff, (payloadSize >> 8) & 0xff, (payloadSize >> 16) & 0xff, (payloadSize >> 24) & 0xff,
      ...webp,
      ...chunks,
    ]);
    expect(contains(original, GPS_SENTINEL)).toBe(true);

    const scrubbed = stripImageMetadata("image/webp", original);
    expect(scrubbed).not.toBeNull();
    expect(contains(scrubbed as Uint8Array, GPS_SENTINEL)).toBe(false);
    // The VP8 image chunk survives.
    expect(contains(scrubbed as Uint8Array, [0x01, 0x02, 0x03, 0x04])).toBe(true);
  });

  it("fails closed on an unrecognised container", () => {
    expect(stripImageMetadata("image/jpeg", Uint8Array.from([0x00, 0x01, 0x02]))).toBeNull();
    expect(stripImageMetadata("image/gif", Uint8Array.from([0x47, 0x49, 0x46]))).toBeNull();
  });
});
