#!/usr/bin/env node
/**
 * bake-social-composites.mjs — bake branded social poster PNGs from a batch spec.
 *
 * Reproduces the established KeepItUp poster system (see b10/b11 composites):
 *   - 1080x1350 portrait canvas
 *   - real licensed photo base (fit: cover) OR anthracite text card
 *   - dark anthracite scrim panels, neon-green (#3BEA7E) eyebrow + rule,
 *     bold off-white serif headline (sentence case), sans subhead/citation
 *   - KeepItUp runner mark + "KEEPITUP" brand row on the image, plus a solid
 *     footer band: mark + KEEPITUP left, "keepitup.social · open worldwide,
 *     early access" right — on every slide.
 *
 * Usage: node scripts/bake-social-composites.mjs        (bakes the inline batch)
 * Reuse: import { bakeBatch } from './bake-social-composites.mjs' and pass
 *        your own spec array (same shape as BATCH12 below).
 */

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHOTO_DIR = path.join(ROOT, 'public', 'brand', 'social', 'photos');
const BRAND_DIR = path.join(ROOT, 'public', 'brand');

// ---------------------------------------------------------------- constants
const W = 1080;
const H = 1350;
const MARGIN = 64;
const FOOTER_H = 96;
const CONTENT_W = W - MARGIN * 2;

const GREEN = '#3BEA7E';
const OFFWHITE = '#F1F5F3';
const SUB_GREY = '#D9DFDB';
const CITE_GREY = '#B9C2BE';
const CARD_BG = '#1B2127';
const PANEL_FILL = 'rgba(13,18,21,0.82)';
const FOOTER_BG = '#0D1317';

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = 'Arial, Helvetica, sans-serif';

const DEFAULT_FOOTER_RIGHT = 'keepitup.social · open worldwide, early access';

// ------------------------------------------------------------ text helpers
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function charFactor(ch, font) {
  const serif = font === 'serif';
  if (ch === ' ') return 0.3;
  if ('.,;:!’‘\'|'.includes(ch)) return 0.28;
  if ('"“”'.includes(ch)) return 0.45;
  if ('—'.includes(ch)) return 0.9;
  if ('-–'.includes(ch)) return 0.45;
  if (ch === '·') return 0.35;
  if (ch === '_') return 0.55;
  if (/[0-9]/.test(ch)) return serif ? 0.62 : 0.58;
  if (/[A-Z]/.test(ch)) return serif ? 0.78 : 0.74;
  if (/[ijltf]/.test(ch)) return 0.3;
  if (/[mw]/.test(ch)) return serif ? 0.85 : 0.84;
  if (/[a-z]/.test(ch)) return serif ? 0.53 : 0.56;
  return 0.6;
}

function textWidth(text, size, font, letterSpacing = 0) {
  let w = 0;
  for (const ch of text) w += charFactor(ch, font);
  // Georgia bold renders wider than the per-char estimate — pad serif by 9%
  const safety = font === 'serif' ? 1.09 : 1.0;
  return w * size * safety + letterSpacing * Math.max(text.length - 1, 0);
}

function wrap(text, size, font, maxWidth, letterSpacing = 0) {
  const lines = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const trial = line ? line + ' ' + word : word;
      if (textWidth(trial, size, font, letterSpacing) <= maxWidth || !line) line = trial;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}

/** Shrink font size until the text wraps into <= maxLines lines. */
function fitText(text, font, startSize, minSize, maxWidth, maxLines) {
  let size = startSize;
  while (size > minSize) {
    const lines = wrap(text, size, font, maxWidth);
    if (lines.length <= maxLines && lines.every((l) => textWidth(l, size, font) <= maxWidth)) {
      return { size, lines };
    }
    size -= 2;
  }
  return { size: minSize, lines: wrap(text, minSize, font, maxWidth) };
}

// ---------------------------------------------------------- block layouting
// Blocks: eyebrow | headline | rule | sub | cite | rows | quotemark | space
// Each yields { height, svg(x, y, align, width) } — y is the block's top.
function layoutBlock(block, width) {
  const align = block.align; // resolved by section
  switch (block.type) {
    case 'eyebrow': {
      const size = block.size || 30;
      const ls = 4;
      return {
        height: size * 1.2,
        svg(x, y, a) {
          const anchor = a === 'center' ? 'middle' : 'start';
          const tx = a === 'center' ? x + width / 2 : x;
          return `<text x="${tx}" y="${y + size}" font-family="${SANS}" font-size="${size}" font-weight="bold" letter-spacing="${ls}" fill="${GREEN}" text-anchor="${anchor}">${esc(block.text)}</text>`;
        },
      };
    }
    case 'headline': {
      const { size, lines } = fitText(
        block.text, 'serif', block.startSize || 62, block.minSize || 40, width, block.maxLines || 5,
      );
      const lh = size * 1.18;
      return {
        height: lines.length * lh,
        svg(x, y, a) {
          const anchor = a === 'center' ? 'middle' : 'start';
          const tx = a === 'center' ? x + width / 2 : x;
          return lines
            .map((l, i) => `<text x="${tx}" y="${y + size * 0.92 + i * lh}" font-family="${SERIF}" font-size="${size}" font-weight="bold" fill="${block.color || OFFWHITE}" text-anchor="${anchor}">${esc(l)}</text>`)
            .join('\n');
        },
      };
    }
    case 'rule':
      return {
        height: 6,
        svg(x, y, a) {
          const rx = a === 'center' ? x + width / 2 - 55 : x;
          return `<rect x="${rx}" y="${y}" width="110" height="6" rx="3" fill="${GREEN}"/>`;
        },
      };
    case 'sub': {
      const size = block.size || 33;
      const lines = wrap(block.text, size, 'sans', width);
      const lh = size * 1.32;
      return {
        height: lines.length * lh,
        svg(x, y, a) {
          const anchor = a === 'center' ? 'middle' : 'start';
          const tx = a === 'center' ? x + width / 2 : x;
          return lines
            .map((l, i) => `<text x="${tx}" y="${y + size * 0.9 + i * lh}" font-family="${SANS}" font-size="${size}" font-weight="bold" fill="${block.color || SUB_GREY}" text-anchor="${anchor}">${esc(l)}</text>`)
            .join('\n');
        },
      };
    }
    case 'cite': {
      const size = block.size || 26;
      const lines = wrap(block.text, size, 'sans', width);
      const lh = size * 1.38;
      return {
        height: lines.length * lh,
        svg(x, y, a) {
          const anchor = a === 'center' ? 'middle' : 'start';
          const tx = a === 'center' ? x + width / 2 : x;
          return lines
            .map((l, i) => `<text x="${tx}" y="${y + size * 0.9 + i * lh}" font-family="${SANS}" font-size="${size}" fill="${CITE_GREY}" text-anchor="${anchor}">${esc(l)}</text>`)
            .join('\n');
        },
      };
    }
    case 'rows': {
      // numbered rows, serif bold, green numbers, hanging indent
      const size = block.size || 38;
      const lh = size * 1.2;
      const gap = 26;
      const indent = 64;
      const rows = block.items.map((t) => wrap(t, size, 'serif', width - indent));
      const height = rows.reduce((h, lines) => h + lines.length * lh, 0) + gap * (rows.length - 1);
      return {
        height,
        svg(x, y) {
          const parts = [];
          let cy = y;
          rows.forEach((lines, i) => {
            parts.push(`<text x="${x}" y="${cy + size * 0.92}" font-family="${SERIF}" font-size="${size}" font-weight="bold" fill="${GREEN}">${i + 1}.</text>`);
            lines.forEach((l, j) => {
              parts.push(`<text x="${x + indent}" y="${cy + size * 0.92 + j * lh}" font-family="${SERIF}" font-size="${size}" font-weight="bold" fill="${OFFWHITE}">${esc(l)}</text>`);
            });
            cy += lines.length * lh + gap;
          });
          return parts.join('\n');
        },
      };
    }
    case 'quotemark':
      return {
        height: 64,
        svg(x, y, a) {
          const tx = a === 'center' ? x + width / 2 : x;
          const anchor = a === 'center' ? 'middle' : 'start';
          return `<text x="${tx}" y="${y + 96}" font-family="${SERIF}" font-size="140" font-weight="bold" fill="${GREEN}" text-anchor="${anchor}">“</text>`;
        },
      };
    case 'space':
      return { height: block.h || 24, svg: () => '' };
    default:
      throw new Error(`unknown block type ${block.type}`);
  }
}

const BLOCK_GAP_BEFORE = { eyebrow: 0, headline: 30, rule: 34, sub: 30, cite: 28, rows: 40, quotemark: 0, space: 0, brandlock: 0 };

/**
 * Section: { anchor: 'bottom'|'upper'|'center'|number, blocks: [...], align?,
 *            panel?: boolean (default true on photos), padY? }
 * Returns { svg, top, height, extraComposites }
 */
function layoutSection(section, isPhoto, brandlockAssets) {
  const align = section.align || 'left';
  const padY = section.padY ?? 48;
  const laid = [];
  let inner = 0;
  for (const block of section.blocks) {
    if (block.type === 'brandlock') {
      // wordmark image, composited later; reserve height
      const bw = block.width || 440;
      const bh = Math.round(bw * (920 / 3000));
      laid.push({ brandlock: true, height: bh, width: bw });
      inner += bh;
      continue;
    }
    const gap = laid.length ? BLOCK_GAP_BEFORE[block.type] ?? 28 : 0;
    inner += gap;
    const l = layoutBlock(block, CONTENT_W);
    laid.push({ ...l, gap });
    inner += l.height;
  }
  const height = inner + padY * 2;

  let top;
  if (typeof section.anchor === 'number') top = section.anchor;
  else if (section.anchor === 'upper') top = 200;
  else if (section.anchor === 'center') top = 170 + (H - FOOTER_H - 170 - height) / 2;
  else top = H - FOOTER_H - height; // 'bottom'

  const parts = [];
  const panel = section.panel ?? isPhoto;
  if (panel) parts.push(`<rect x="0" y="${top}" width="${W}" height="${height}" fill="${PANEL_FILL}"/>`);

  const extraComposites = [];
  let y = top + padY;
  for (const l of laid) {
    y += l.gap || 0;
    if (l.brandlock) {
      extraComposites.push({
        asset: 'wordmark', width: l.width,
        left: align === 'center' ? Math.round((W - l.width) / 2) : MARGIN,
        top: Math.round(y),
      });
    } else {
      parts.push(l.svg(MARGIN, y, align, CONTENT_W));
    }
    y += l.height;
  }
  return { svg: parts.join('\n'), top, height, extraComposites };
}

// ----------------------------------------------------------------- slides
function brandRowSvg(pos) {
  // runner glyph is composited as PNG; here only the KEEPITUP text
  const size = 30;
  const glyph = 52;
  const yTop = 54;
  const textY = yTop + glyph / 2 + size * 0.36;
  const label = 'KEEPITUP';
  const tw = textWidth(label, size, 'sans', 6);
  let gx;
  let tx;
  let anchor = 'start';
  if (pos === 'tr') { gx = W - MARGIN - glyph - 14 - tw; tx = gx + glyph + 14; }
  else if (pos === 'tc') { gx = (W - (glyph + 14 + tw)) / 2; tx = gx + glyph + 14; }
  else { gx = MARGIN; tx = MARGIN + glyph + 14; } // tl
  const svg = `<text x="${tx}" y="${textY}" font-family="${SANS}" font-size="${size}" font-weight="bold" letter-spacing="6" fill="${OFFWHITE}" text-anchor="${anchor}">${label}</text>`;
  return { svg, glyphLeft: Math.round(gx), glyphTop: yTop, glyphSize: glyph };
}

async function bakeSlide(spec, assets) {
  const isPhoto = !!spec.photo;
  const svgParts = [];
  const composites = [];

  // subtle top scrim on photos so the brand row stays legible
  if (isPhoto) {
    svgParts.push(`<defs><linearGradient id="topfade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(10,14,16,0.55)"/><stop offset="1" stop-color="rgba(10,14,16,0)"/>
    </linearGradient></defs>
    <rect x="0" y="0" width="${W}" height="240" fill="url(#topfade)"/>`);
  }

  // brand row (mark + KEEPITUP)
  const markPos = spec.mark ?? 'tl';
  if (markPos === 'br') {
    // glyph only, tucked above the footer on the right
    composites.push({ input: assets.glyph52, left: W - MARGIN - 52, top: H - FOOTER_H - 52 - 24 });
  } else if (markPos !== 'none') {
    const row = brandRowSvg(markPos);
    svgParts.push(row.svg);
    composites.push({ input: assets.glyph52, left: row.glyphLeft, top: row.glyphTop });
  }

  // sections
  for (const section of spec.sections) {
    const laid = layoutSection(section, isPhoto);
    svgParts.push(laid.svg);
    for (const ec of laid.extraComposites) {
      composites.push({
        input: await sharp(path.join(BRAND_DIR, 'keepitup-wordmark-transparent.png'))
          .resize({ width: ec.width })
          .png()
          .toBuffer(),
        left: ec.left,
        top: ec.top,
      });
    }
  }

  // footer band
  const fY = H - FOOTER_H;
  const fSize = 30;
  const fTextY = fY + FOOTER_H / 2 + fSize * 0.36;
  svgParts.push(`<rect x="0" y="${fY}" width="${W}" height="${FOOTER_H}" fill="${FOOTER_BG}"/>`);
  svgParts.push(`<text x="${MARGIN + 44 + 14}" y="${fTextY}" font-family="${SANS}" font-size="${fSize}" font-weight="bold" letter-spacing="6" fill="${OFFWHITE}">KEEPITUP</text>`);
  svgParts.push(`<text x="${W - MARGIN}" y="${fTextY}" font-family="${SANS}" font-size="${fSize - 2}" font-weight="bold" fill="${SUB_GREY}" text-anchor="end">${esc(spec.footerRight || DEFAULT_FOOTER_RIGHT)}</text>`);
  composites.push({ input: assets.glyph44, left: MARGIN, top: fY + (FOOTER_H - 44) / 2 });

  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svgParts.join('\n')}</svg>`,
  );

  let base;
  if (isPhoto) {
    base = sharp(path.join(PHOTO_DIR, spec.photo)).resize(W, H, { fit: 'cover', position: spec.photoPos || 'centre' });
  } else {
    base = sharp({ create: { width: W, height: H, channels: 3, background: CARD_BG } });
  }

  const out = path.join(PHOTO_DIR, spec.out);
  await base
    .composite([{ input: overlay, left: 0, top: 0 }, ...composites])
    .png()
    .toFile(out);
  return out;
}

export async function bakeBatch(slides) {
  const glyphSrc = path.join(BRAND_DIR, 'keepitup-mark-transparent-1024.png');
  const assets = {
    glyph52: await sharp(glyphSrc).resize(52, 52).png().toBuffer(),
    glyph44: await sharp(glyphSrc).resize(44, 44).png().toBuffer(),
  };
  const written = [];
  for (const spec of slides) {
    written.push(await bakeSlide(spec, assets));
    console.log('baked', spec.out);
  }
  return written;
}

// ------------------------------------------------------------- batch 12 spec
const EYEBROW_ID = 'KEEPITUP: FREE LOCAL GAMES TO MEET PEOPLE.';

export const BATCH12 = [
  {
    out: 'b12p1-strangers-same-game.png',
    photo: 'pexels-33920366-flag-football.jpg',
    mark: 'tl',
    sections: [{
      anchor: 'bottom',
      blocks: [
        { type: 'eyebrow', text: EYEBROW_ID },
        { type: 'headline', text: "Strangers. Different colors. Same game. That's how it starts every time." },
        { type: 'rule' },
      ],
    }],
  },
  {
    out: 'b12p2-monday-after-final.png',
    photo: 'pexels-5553089-friends-football.jpg',
    mark: 'tr',
    sections: [{
      anchor: 'bottom',
      blocks: [
        { type: 'eyebrow', text: 'THE FINAL WAS SUNDAY. NOW WHAT?' },
        { type: 'headline', text: "You don't need four years and a global tournament. You need one game, this week." },
        { type: 'rule' },
      ],
    }],
  },
  {
    out: 'b12p3-we-just-opened.png',
    photo: 'pexels-8795115-badminton-sunset.jpg',
    mark: 'tl',
    sections: [{
      anchor: 'bottom',
      blocks: [
        { type: 'eyebrow', text: 'TODAY, WE OPEN.' },
        { type: 'headline', text: 'One app. Organize or join games near you. Meet the people who show up.' },
        { type: 'rule' },
        { type: 'sub', text: 'For dating, friends, or a crew — free, worldwide, starting today.' },
      ],
    }],
  },
  {
    out: 'b12p4-how-it-works-opening.png',
    photo: 'pexels-19146676-group-track-run.jpg',
    mark: 'tc',
    footerRight: 'open worldwide — early access, live today',
    sections: [{
      anchor: 'bottom',
      blocks: [
        { type: 'eyebrow', text: "WE'RE LIVE." },
        { type: 'headline', text: "Here's how KeepItUp works.", maxLines: 2, startSize: 58 },
        { type: 'rows', items: [
          'Find a small local game near you.',
          'Ask to join.',
          'The host says yes — you get the time and place.',
          'Show up and play.',
        ] },
      ],
    }],
  },
  {
    out: 'b12p5-blue-zones-moai.png',
    photo: 'pexels-5807872-cyclists-roadside-chat.jpg',
    mark: 'tl',
    sections: [{
      anchor: 'bottom',
      blocks: [
        { type: 'eyebrow', text: 'THE SCIENCE OF SHOWING UP.' },
        { type: 'headline', startSize: 54, maxLines: 6, text: 'In Okinawa, the people who live longest all have one thing: a small group of friends they meet with, for life.' },
        { type: 'rule' },
        { type: 'cite', text: 'Buettner, Blue Zones research, 2018.' },
      ],
    }],
  },
  {
    out: 'b12p6-mandela-quote.png',
    photo: 'pexels-31293814-park-fitness-group.jpg',
    mark: 'br',
    sections: [{
      anchor: 'upper',
      blocks: [
        { type: 'quotemark' },
        { type: 'headline', startSize: 60, maxLines: 5, text: 'Sport has the power to unite people in a way that little else does.”' },
        { type: 'rule' },
        { type: 'sub', text: '— Nelson Mandela, 2000.' },
      ],
    }],
  },
  {
    out: 'b12p7-the-plan-that-wasnt.png',
    photo: 'pexels-12169344-volleyball-laugh.jpg',
    mark: 'tl',
    sections: [
      {
        anchor: 170,
        padY: 40,
        blocks: [
          { type: 'headline', startSize: 46, maxLines: 3, text: '“We should all get a game together sometime.” — said in January.' },
        ],
      },
      {
        anchor: 480,
        padY: 40,
        blocks: [
          { type: 'headline', startSize: 58, maxLines: 2, text: 'Still “sometime.” It’s July.' },
        ],
      },
      {
        anchor: 'bottom',
        padY: 44,
        blocks: [
          { type: 'rule' },
          { type: 'sub', text: 'Some plans need a host, a time, and a place — not another group chat.' },
        ],
      },
    ],
  },
  {
    out: 'b12p8-slide1.png',
    photo: null,
    mark: 'tl',
    sections: [{
      anchor: 'center',
      align: 'center',
      blocks: [
        { type: 'eyebrow', text: 'PART 2 OF THE MANIFESTO.' },
        { type: 'headline', text: 'More options did not make dating better. It made it worse.' },
        { type: 'rule' },
      ],
    }],
  },
  {
    out: 'b12p8-slide2.png',
    photo: null,
    mark: 'tl',
    sections: [{
      anchor: 'center',
      align: 'center',
      blocks: [
        { type: 'headline', startSize: 52, maxLines: 6, text: 'Psychologist Barry Schwartz called it the paradox of choice: past a certain point, more options make a decision harder, not easier.' },
        { type: 'rule' },
        { type: 'cite', text: 'Schwartz, The Paradox of Choice, 2004. (Some follow-up studies get mixed results — the idea isn’t gospel. It just matches what an endless swipe deck feels like.)' },
      ],
    }],
  },
  {
    out: 'b12p8-slide3.png',
    photo: 'pexels-5319325-jog-bridge.jpg',
    mark: 'tl',
    sections: [{
      anchor: 'bottom',
      blocks: [
        { type: 'headline', startSize: 56, maxLines: 4, text: 'An endless deck of strangers isn’t freedom. It’s paralysis, designed to keep you scrolling.' },
        { type: 'rule' },
      ],
    }],
  },
  {
    out: 'b12p8-slide4.png',
    photo: 'pexels-5384620-basketball-friends.jpg',
    mark: 'tl',
    sections: [{
      anchor: 'bottom',
      blocks: [
        { type: 'headline', startSize: 56, maxLines: 4, text: 'So we built the opposite. Not a deck of faces. One small game, near you, with a real start time.' },
        { type: 'rule' },
      ],
    }],
  },
  {
    out: 'b12p8-slide5.png',
    photo: 'pexels-8381743-friends-beach-run.jpg',
    mark: 'none',
    sections: [{
      anchor: 'center',
      align: 'center',
      blocks: [
        { type: 'brandlock', width: 460 },
        { type: 'headline', startSize: 60, maxLines: 3, text: 'Fewer choices. More showing up.' },
        { type: 'rule' },
        { type: 'sub', text: 'Open worldwide — early access, link in bio.' },
      ],
    }],
  },
  {
    out: 'b12p9-small-talk-small-game.png',
    photo: 'pexels-5384620-basketball-friends.jpg',
    mark: 'tr',
    sections: [{
      anchor: 'bottom',
      blocks: [
        { type: 'eyebrow', text: EYEBROW_ID },
        { type: 'headline', text: 'Skip “so, what do you do for fun?” Just go do the fun thing.' },
        { type: 'rule' },
        { type: 'sub', text: 'Twenty minutes tells you more than any bio does.' },
      ],
    }],
  },
  {
    out: 'b12p10-finish-the-sentence.png',
    photo: 'pexels-5319397-three-adults-jog.jpg',
    mark: 'tl',
    sections: [{
      anchor: 'bottom',
      blocks: [
        { type: 'eyebrow', text: EYEBROW_ID },
        { type: 'headline', startSize: 56, maxLines: 5, text: 'Finish the sentence: “I’d actually show up to a game near me if ___.”' },
        { type: 'rule' },
        { type: 'sub', text: 'Comment your answer below.' },
      ],
    }],
  },
];

// ------------------------------------------------------------------- main
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  bakeBatch(BATCH12)
    .then((files) => console.log(`done: ${files.length} files`))
    .catch((err) => { console.error(err); process.exit(1); });
}
