import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { build } from 'vite';
import { chromium } from '@playwright/test';

// Actual component, synthetic requests only. No authenticated app or API access.
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.resolve(root, '../../.agents/product-studio/runtime/join-steps-qa');
await mkdir(out, { recursive: true });
const mocks = {
  '@/lib/track-click': 'export function trackClick(){}',
  'next/link': `import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}`,
  'next/navigation': 'export function useRouter(){return {refresh(){}}}',
};
const result = await build({ configFile: false, root, logLevel: 'error', oxc: { jsx: { runtime: 'automatic' } }, resolve: { alias: { '@': path.join(root, 'src') } }, plugins: [{
  name: 'join-fixture', enforce: 'pre',
  resolveId(id) {
    const key = Object.keys(mocks).find(k => id === k || (k.startsWith('@/') && id.replaceAll('\\', '/') === path.join(root, 'src', k.slice(2)).replaceAll('\\', '/')));
    if (key) return '\0mock:' + key;
    if (id.endsWith('virtual:join')) return '\0entry';
  },
  load(id) {
    if (id.startsWith('\0mock:')) return mocks[id.slice(6)];
    if (id === '\0entry') return `import React from 'react';import{createRoot}from'react-dom/client';import Join from '@/components/JoinRequestControls';createRoot(document.getElementById('root')).render(React.createElement(Join,{eventId:'synthetic-event',request:null}));`;
  },
}], build: { write: false, minify: false, lib: { entry: 'virtual:join', name: 'JoinFixture', formats: ['iife'] } }, define: { 'process.env.NODE_ENV': JSON.stringify('production') } });
const output = (Array.isArray(result) ? result[0] : result).output;
const bundle = output.find(x => x.type === 'chunk').code;
const css = (await readFile(path.join(root, 'src/app/globals.css'), 'utf8')).replace('@import "tailwindcss";', '') + '\n' + output.filter(x => x.type === 'asset' && x.fileName.endsWith('.css')).map(x => x.source).join('\n');
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, reducedMotion] of [[390, 'no-preference'], [390, 'reduce'], [1280, 'no-preference']]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', r => r.abort());
    await page.setContent('<main style="max-width:520px;margin:24px auto"><div id="root"></div></main>');
    await page.addStyleTag({ content: css });
    await page.evaluate(() => {
      window.calls = [];
      window.fetch = async (url, init) => {
        if (init?.method !== 'POST' || !url.endsWith('/requests')) throw Error('Unexpected request');
        window.calls.push(JSON.parse(init.body));
        return window.calls.length === 1
          ? new Response(JSON.stringify({ error: 'Please try again.' }), { status: 503 })
          : new Response(JSON.stringify({ requestId: 'synthetic-request', status: 'pending' }));
      };
    });
    await page.addScriptTag({ content: bundle });
    const note = page.getByRole('textbox');
    await note.click();
    await note.pressSequentially('A gentle pace, please.');
    assert.equal(await note.inputValue(), 'A gentle pace, please.');
    assert.equal(await note.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.getByRole('button', { name: 'Send request', exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => window.calls.length), 0);
    await page.screenshot({ path: path.join(out, `note-${width}-${reducedMotion}.png`), fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Review request' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Send request', exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement?.textContent === 'Ready to join the game?');
    assert.equal(await note.count(), 0);
    assert.equal(await page.evaluate(() => window.calls.length), 0);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await note.waitFor();
    assert.equal(await note.inputValue(), 'A gentle pace, please.');
    await page.waitForFunction(() => document.activeElement?.textContent === 'Request a place');
    await note.focus();
    await note.press('End');
    await note.pressSequentially(' Thank you.');
    await page.getByRole('button', { name: 'Review request' }).click();
    const send = page.getByRole('button', { name: 'Send request', exact: true });
    await send.waitFor();
    await page.screenshot({ path: path.join(out, `review-${width}-${reducedMotion}.png`), fullPage: true, animations: 'disabled' });
    await send.click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('alert').innerText(), 'Please try again.');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await note.waitFor();
    assert.equal(await note.inputValue(), 'A gentle pace, please. Thank you.');
    await page.getByRole('button', { name: 'Review request' }).click();
    await send.click();
    await page.getByRole('button', { name: 'Cancel request', exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement?.textContent === 'Your request is with the host.');
    assert.deepEqual(await page.evaluate(() => window.calls), [{ introduction: 'A gentle pace, please. Thank you.' }, { introduction: 'A gentle pace, please. Thank you.' }]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(out, `pending-${width}-${reducedMotion}.png`), fullPage: true, animations: 'disabled' });
    await page.close();
    console.log(`PASS join ${width}px ${reducedMotion}: typed focus, staged review, preserved drafts, explicit send, failure/retry, confirmation focus, no overflow`);
  }
} finally { await browser.close(); }
