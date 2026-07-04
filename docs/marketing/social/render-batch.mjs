import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const IDEAS = JSON.parse(readFileSync("docs/marketing/social/ideas-batch-01.json", "utf8"));
const OUTDIR = "apps/web/public/brand/social";

const BG = "#20262B", ACCENT = "#3BEA7E", TEXT = "#F1F5F3", MUTED = "#8A9BA0";
const W = 1080;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

function wrap(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = []; let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

function pickFont(text, cover) {
  const n = text.length;
  if (cover) { if (n <= 46) return { size: 84, max: 15 }; if (n <= 90) return { size: 66, max: 20 }; return { size: 54, max: 25 }; }
  if (n <= 42) return { size: 74, max: 16 };
  if (n <= 90) return { size: 60, max: 22 };
  if (n <= 160) return { size: 50, max: 28 };
  return { size: 42, max: 34 };
}

function slideSVG({ H, eyebrow, text, n, total, accentBody, swipe }) {
  const cover = n === 1;
  const f = pickFont(text, cover);
  const lines = wrap(text, f.max);
  const lh = f.size * 1.18;
  const blockH = lines.length * lh;
  const startY = Math.round(H / 2 - blockH / 2 + f.size * 0.72);
  const body = lines.map((ln, i) =>
    `<text x="540" y="${startY + i * lh}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${f.size}" font-weight="800" fill="${accentBody ? ACCENT : TEXT}">${esc(ln)}</text>`
  ).join("\n");
  const eb = eyebrow
    ? `<text x="540" y="230" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="800" letter-spacing="4" fill="${ACCENT}">${esc(eyebrow)}</text>`
    : "";
  const sw = swipe
    ? `<text x="540" y="${H - 150}" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="800" fill="${ACCENT}">swipe →</text>`
    : "";
  const foot = `<text x="540" y="${H - 70}" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="${MUTED}">keepitup.social${total > 1 ? ` · ${n}/${total}` : ""}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${BG}"/><rect x="60" y="60" width="${W - 120}" height="${H - 120}" rx="28" fill="none" stroke="#2E363C" stroke-width="2"/>${eb}\n${body}\n${sw}\n${foot}</svg>`;
}

function slidesFor(idea) {
  if (idea.format === "carousel" && Array.isArray(idea.slides) && idea.slides.length) return idea.slides;
  return [idea.hook];
}

const manifest = [];
for (let idx = 0; idx < IDEAS.length; idx++) {
  const idea = IDEAS[idx];
  const H = (idea.format === "carousel" || idea.format === "image") ? 1350 : 1920;
  const slides = slidesFor(idea);
  const total = slides.length;
  const base = `b01-${String(idx + 1).padStart(2, "0")}-${slug(idea.title)}`;
  const assets = [];
  mkdirSync(OUTDIR, { recursive: true });
  for (let s = 0; s < slides.length; s++) {
    const n = s + 1;
    const eyebrow = n === 1 ? idea.title.toUpperCase() : (n === total && total > 1 ? "JOIN THE BETA" : "");
    const accentBody = n === total && total > 1;
    const svg = slideSVG({ H, eyebrow, text: slides[s], n, total, accentBody, swipe: total > 1 && n < total });
    const file = total > 1 ? `${base}-${n}.png` : `${base}.png`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(OUTDIR, file));
    assets.push(`/brand/social/${file}`);
  }
  manifest.push({ idx: idx + 1, title: idea.title, platform: idea.platform, format: idea.format, assets });
  console.log(`✓ ${idea.title} (${idea.format}) → ${assets.length} image(s)`);
}
console.log("\nMANIFEST:\n" + JSON.stringify(manifest, null, 2));
