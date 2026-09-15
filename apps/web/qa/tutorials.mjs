import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { build } from 'vite';
import { chromium, expect } from '@playwright/test';

// Render the actual landing + actual host/join forms with all networking blocked.
// This fixture also records attempted telemetry, even if the transport is mocked.
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.resolve(root, '../../.agents/product-studio/runtime/tutorials-qa');
await mkdir(out, { recursive: true });
const mocks = {
  '@/lib/track-click': 'export function trackClick(...args){window.telemetry.push(args)}',
  '@/components/EventLocationMapPicker': 'export default function Map(){return null}',
  'next/link': `import React from 'react';export default function Link({children,prefetch,...props}){return React.createElement('a',props,children)}`,
  'next/navigation': 'export function useRouter(){return {refresh(){window.refreshes++}}}',
};
const result = await build({ configFile: false, root, logLevel: 'error', oxc: { jsx: { runtime: 'automatic' } }, resolve: { alias: { '@': path.join(root, 'src') } }, plugins: [{
  name: 'tutorial-fixture', enforce: 'pre',
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
try {
  for (const [width, reducedMotion] of [[320, 'no-preference'], [390, 'reduce'], [1280, 'no-preference'], [1280, 'reduce']]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', r => r.abort());
    await page.setContent('<div id="root"></div>');
    await page.addStyleTag({ content: css });
    await page.evaluate(() => {
      window.calls = []; window.telemetry = []; window.refreshes = 0;
      window.fetch = async (...args) => { window.calls.push(args); throw Error('Tutorial attempted a request'); };
    });
    await page.addScriptTag({ content: bundle });
    const trigger = page.getByRole('button', { name: 'See how it works', exact: true });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#sport')).toHaveCount(0);
    await expect(page.locator('#join-introduction')).toHaveCount(0);
    await trigger.focus(); await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // Lifecycle assertions follow the shared form labels, not tutorial substitutes.
    await page.getByRole('button', { name: /^Host an event/ }).click();
    await expect(page.locator('#section-invitation:visible')).toBeVisible();
    await page.locator('#title').fill('');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.locator('#title')).toBeFocused();
    await expect(page.locator('#title')).toHaveAttribute('aria-invalid', 'true');
    await page.locator('#title').fill('A relaxed weekend rally');
    const next = page.getByRole('button', { name: 'Continue', exact: true });
    await next.click();
    await expect(page.locator('#section-rhythm-heading')).toBeFocused();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.locator('#section-invitation-heading')).toBeFocused();
    await expect(page.locator('#title')).toHaveValue('A relaxed weekend rally');
    await next.click(); await next.click();
    await expect(page.locator('#section-people-heading')).toBeFocused();
    await expect(page.locator('#section-people-heading')).toBeInViewport();
    await expect(page.getByText('Picture your group', { exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Close tutorial', exact: true })).toBeInViewport();
    await page.screenshot({ path: path.join(out, `group-viewport-${width}-${reducedMotion}.png`), animations: 'disabled' });
    await next.click();
    await page.getByRole('combobox').fill('Riverside');
    await page.getByRole('option', { name: 'Riverside courts, Example City' }).click();
    await page.getByRole('button', { name: 'Review invitation', exact: true }).click();
    await expect(page.locator('#section-review:visible')).toBeVisible();
    assert.equal(await page.locator('.event-form-section:visible').count(), 1);
    if (reducedMotion === 'reduce') assert.equal(await page.locator('#section-review').evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(out, `host-${width}-${reducedMotion}.png`), fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Publish the invitation', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your invitation is ready' })).toBeVisible();
    await page.getByRole('button', { name: 'Try joining an event', exact: true }).click();
    const note = page.locator('#join-introduction');
    await note.fill('A gentle pace, please.');
    await page.getByRole('button', { name: 'Review request', exact: true }).click();
    await expect(page.getByText('Ready to join the game?', { exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(note).toHaveValue('A gentle pace, please.');
    await page.getByRole('button', { name: 'Review request', exact: true }).click();
    await expect(page.getByText('Ready to join the game?', { exact: true })).toBeFocused();
    await expect(page.getByText('Ready to join the game?', { exact: true })).toBeInViewport();
    await expect(page.getByText('Check before you send', { exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Close tutorial', exact: true })).toBeInViewport();
    await page.screenshot({ path: path.join(out, `join-review-viewport-${width}-${reducedMotion}.png`), animations: 'disabled' });
    await page.getByRole('button', { name: 'Send request', exact: true }).click();
    await expect(page.getByText('Your request is with the host.', { exact: true })).toBeVisible();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(out, `join-${width}-${reducedMotion}.png`), fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Cancel request', exact: true }).click();
    await expect(page.getByText('Request cancelled.', { exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Back to tutorials', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Host an event/ })).toBeVisible();
    await page.getByRole('button', { name: 'Close tutorial', exact: true }).click();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#join-introduction')).toHaveCount(0);
    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    assert.deepEqual(await page.evaluate(() => ({ requests: window.calls, telemetry: window.telemetry, refreshes: window.refreshes })), { requests: [], telemetry: [], refreshes: 0 });
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS tutorials ${width}px ${reducedMotion}: collapsed entry, shared forms, stages/back/focus, completion, close, no API/telemetry/refresh, no overflow`);
  }
} finally { await browser.close(); }
