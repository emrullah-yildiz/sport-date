import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { build } from 'vite';
import { chromium, expect } from '@playwright/test';

// Render the actual landing + actual host/join forms with all networking blocked.
// This fixture also records attempted telemetry, even if the transport is mocked.
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.resolve(root, '../../.agents/product-studio/runtime/landing-cinematic-qa');
await mkdir(out, { recursive: true });
const mocks = {
  '@/lib/track-click': 'export function trackClick(...args){window.telemetry.push(args)}',
  '@/components/EventLocationMapPicker': 'export default function Map(){return null}',
  'next/link': `import React from 'react';export default function Link({children,prefetch,...props}){return React.createElement('a',props,children)}`,
  'next/navigation': 'export function useRouter(){return {refresh(){window.refreshes++}}}',
};
const result = await build({ configFile: false, root, logLevel: 'error', oxc: { jsx: { runtime: 'automatic' } }, resolve: { alias: { '@': path.join(root, 'src') } }, plugins: [{
  name: 'cinematic-fixture', enforce: 'pre',
  resolveId(id) {
    const key = Object.keys(mocks).find(k => id === k || (k.startsWith('@/') && id.replaceAll('\\', '/') === path.join(root, 'src', k.slice(2)).replaceAll('\\', '/')));
    if (key) return '\0mock:' + key;
    if (id.endsWith('virtual:tutorial')) return '\0entry';
  },
  load(id) {
    if (id.startsWith('\0mock:')) return mocks[id.slice(6)];
    if (id === '\0entry') return `import React from 'react';import{createRoot}from'react-dom/client';import Landing from '@/components/landing/LandingExperience';createRoot(document.getElementById('root')).render(React.createElement(Landing));`;
  },
}], build: { write: false, minify: false, lib: { entry: 'virtual:tutorial', name: 'TutorialFixture', formats: ['iife'] } }, define: { 'process.env.NODE_ENV': JSON.stringify('production') } });
const output = (Array.isArray(result) ? result[0] : result).output;
const bundle = output.find(x => x.type === 'chunk').code;
const css = (await readFile(path.join(root, 'src/app/globals.css'), 'utf8')).replace('@import "tailwindcss";', '') + '\n' + output.filter(x => x.type === 'asset' && x.fileName.endsWith('.css')).map(x => x.source).join('\n');
const browser = await chromium.launch({ headless: true });

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function scrollTo(page, y) {
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
  await settle(page);
}
async function heroProgress(page) {
  return page.locator('[data-hero-motion]').evaluate(el => Number(el.style.getPropertyValue('--hero-progress')));
}
try {
  for (const [width, height, reducedMotion] of [[320, 740, 'no-preference'], [390, 844, 'no-preference'], [1280, 900, 'no-preference'], [390, 844, 'reduce'], [1280, 900, 'reduce'], [844, 390, 'no-preference']]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.abort());
    await page.setContent('<div id="root"></div>');
    await page.addStyleTag({ content: css });
    await page.evaluate(() => {
      window.calls = []; window.telemetry = []; window.refreshes = 0;
      window.fetch = async (...args) => { window.calls.push(args); throw Error('Unexpected network request'); };
    });
    await page.addScriptTag({ content: bundle });
    const story = page.locator('[data-scroll-story]');
    await expect(story).toBeAttached();
    await settle(page);
    await page.screenshot({ path: path.join(out, `hero-${width}-${reducedMotion}.png`) });
    await scrollTo(page, 400);
    if (reducedMotion === 'no-preference' && height >= 620) {
      assert.ok(await heroProgress(page) > 0, 'Hero responds to forward scroll');
      await scrollTo(page, 0);
      assert.equal(await heroProgress(page), 0, 'Hero reverses back to initial state');
    } else if (reducedMotion === 'reduce') assert.equal(await heroProgress(page), 0);

    const stage = page.locator('[data-story-stage]');
    const bounds = await story.evaluate(el => ({ top: el.getBoundingClientRect().top + scrollY, height: el.getBoundingClientRect().height }));
    if (reducedMotion === 'no-preference' && height >= 620) {
      await expect(story).toHaveAttribute('data-motion', 'true');
      const frames = [];
      for (const [progress, chapter] of [[.1, '1'], [.5, '2'], [.9, '3'], [.1, '1']]) {
        await scrollTo(page, bounds.top + (bounds.height - height) * progress);
        await expect(story).toHaveAttribute('data-chapter', chapter);
        const actual = await story.evaluate(el => Number(el.style.getPropertyValue('--story-progress')));
        assert.ok(Math.abs(actual - progress) < .003, 'Progress directly follows native scroll');
        assert.ok(Math.abs((await stage.boundingBox()).y) < 2, 'Scene remains pinned during scroll');
        const visible = page.locator(`[data-story-chapter="${chapter}"]`);
        assert.equal(await visible.evaluate(el => getComputedStyle(el).opacity), '1');
        const state = await story.evaluate(el => ({ progress: el.style.getPropertyValue('--story-progress'), court: getComputedStyle(el.querySelector('[class*="court"]')).transform }));
        frames.push(state);
        await page.screenshot({ path: path.join(out, `scene-${width}-${chapter}-${frames.length}.png`) });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      }
      assert.notEqual(frames[0].court, frames[1].court, 'Court transforms during scroll');
      assert.deepEqual(frames[0], frames[3], 'Reverse scroll restores the first keyframe');
      for (const progress of [.29, .7]) {
        await scrollTo(page, bounds.top + (bounds.height - height) * progress);
        const readableCount = await page.locator('[data-story-chapter]').evaluateAll(elements => elements.filter(el => Number(getComputedStyle(el).opacity) > .01).length);
        assert.ok(readableCount <= 1, 'Chapter transitions do not overlay competing headings');
        await page.screenshot({ path: path.join(out, `transition-${width}-${progress}.png`) });
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await settle(page);
      await expect(story).not.toHaveAttribute('data-motion', 'true');
      assert.equal(await heroProgress(page), 0, 'Runtime preference resets hero motion');
      assert.notEqual(await stage.evaluate(el => getComputedStyle(el).position), 'sticky');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await settle(page);
      await expect(story).toHaveAttribute('data-motion', 'true');
    } else {
      await expect(story).not.toHaveAttribute('data-motion', 'true');
      assert.notEqual(await stage.evaluate(el => getComputedStyle(el).position), 'sticky');
      assert.equal(await story.evaluate(el => getComputedStyle(el).height === `${Math.round(innerHeight * 2.4)}px`), false, 'Static story removes the fixed scroll runway');
      for (const chapter of ['1', '2', '3']) {
        const part = page.locator(`[data-story-chapter="${chapter}"]`);
        assert.equal(await part.evaluate(el => getComputedStyle(el).opacity), '1');
        assert.notEqual(await part.evaluate(el => getComputedStyle(el).position), 'absolute');
      }
      await story.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, `static-${width}.png`), fullPage: true });
    }

    const trigger = page.getByRole('button', { name: 'See how it works', exact: true });
    await trigger.focus(); await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
    assert.deepEqual(await page.evaluate(() => ({ requests: window.calls, telemetry: window.telemetry, refreshes: window.refreshes })), { requests: [], telemetry: [], refreshes: 0 });
    assert.deepEqual(errors, []);
    console.log(`PASS cinematic ${width}x${height} ${reducedMotion}: reversible scroll, sticky scenes, compact reduced motion, keyboard tutorial, no requests/errors/overflow`);
    await page.close();
  }
  if (process.argv.includes('--video')) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference', recordVideo: { dir: out, size: { width: 1280, height: 900 } } });
    await page.route('**/*', route => route.abort());
    await page.setContent('<div id="root"></div>');
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: bundle });
    await page.locator('[data-scroll-story][data-motion="true"]').waitFor();
    await page.waitForTimeout(500);
    await page.evaluate(async () => {
      const story = document.querySelector('[data-scroll-story]');
      const end = story.getBoundingClientRect().top + scrollY + story.getBoundingClientRect().height - innerHeight;
      const animate = (from, to, duration) => new Promise(resolve => {
        const start = performance.now();
        function frame(now) {
          const progress = Math.min(1, (now - start) / duration);
          window.scrollTo(0, from + (to - from) * progress);
          if (progress < 1) requestAnimationFrame(frame); else resolve();
        }
        requestAnimationFrame(frame);
      });
      await animate(0, end, 8000);
      await animate(end, 0, 5000);
    });
    const video = page.video();
    await page.close();
    await video.saveAs(path.join(out, 'landing-scroll-preview.webm'));
    console.log(`VIDEO ${path.join(out, 'landing-scroll-preview.webm')}`);
  }
} finally { await browser.close(); }
