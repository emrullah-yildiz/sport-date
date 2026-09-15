import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { build } from 'vite';
import { chromium } from '@playwright/test';

// Actual page and components; synthetic read-only dependencies, no app/API access.
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.resolve(root, '../../.agents/product-studio/runtime/free-date-qa');
await mkdir(out, { recursive: true });
const fixture = {id:'synthetic-run',sport:'Running',title:'An easy run. A good reason to get out.',startsAt:'2026-09-20T16:00:00Z',timeZone:'Europe/Bucharest',placesRemaining:2,language:'English',experienceLevels:['beginner'],minimumAge:18,maximumAge:65,hostFirstName:'Sam',areaLabel:'North',city:'Bucharest',request:null};
const mocks = {
  '@/lib/session': `export async function getCurrentUser(){return {firstName:'Alex',location:'Bucharest'}}`,
  '@/lib/events': `export async function getDiscoverableEvents(){return window.fixtureEvents}export async function getDiscoverableEvent(){return window.fixtureEvents[0]}export async function getAcceptedEventLocation(){return {venueName:'Synthetic venue',address:'Synthetic address'}}`,
  '@/lib/join-requests': `export async function getMemberReliabilityStanding(){return {notice:{tone:'none',headline:'',body:'',liftsAt:null}}}`,
  '@/lib/track-click': 'export function trackClick(){}',
  '@/lib/communication-preferences': `export async function getCommunicationPreferences(){return {productUpdatesOptIn:false,consentHistory:[],productUpdatesUpdatedAt:null}}`,
  '@/lib/stripe': 'export function isBillingConfigured(){return false}',
  '@/lib/email-provider': `export function resolveTransactionalEmailProvider(){return 'disabled'}`,
  '@/lib/entitlements': 'export function isPlus(){return false}',
  '@/components/ClickTracking': 'export default function Tracking(){return null}',
  'next/link': `import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}`,
  'next/navigation': `export function notFound(){throw Error('Unexpected not found')}export function redirect(){throw Error('Unexpected redirect')}export function useRouter(){return {push(){},refresh(){}}}export function usePathname(){return '/discover'}export function useSearchParams(){return new URLSearchParams()}`,
  'server-only': '',
};
const result = await build({configFile:false,root,logLevel:'error',oxc:{jsx:{runtime:'automatic'}},resolve:{alias:{'@':path.join(root,'src')}},plugins:[{name:'discovery-fixture',enforce:'pre',resolveId(id){const key=Object.keys(mocks).find(k=>id===k || (k.startsWith('@/') && id.replaceAll('\\','/')===path.join(root,'src',k.slice(2)).replaceAll('\\','/')));if(key)return '\0mock:'+key;if(id.endsWith('virtual:discovery'))return '\0entry';},load(id){if(id.startsWith('\0mock:'))return mocks[id.slice(6)];if(id==='\0entry')return `import React from 'react';import{createRoot}from'react-dom/client';import Page from '@/app/discover/page';import Detail from '@/app/discover/events/[eventId]/page';import Settings from '@/app/settings/page';import Editor from '@/components/EditProfileForm';const root=createRoot(document.getElementById('root'));window.renderFixture=async()=>root.render(window.fixtureEditor ? React.createElement(Editor,{profile:window.editProfile}) : window.fixtureSettings ? await Settings() : window.fixtureDetail ? await Detail({params:Promise.resolve({eventId:'synthetic-run'})}) : await Page({searchParams:Promise.resolve(window.fixtureParams||{})}));window.renderFixture();`;}}],build:{write:false,minify:false,lib:{entry:'virtual:discovery',name:'DiscoveryFixture',formats:['iife']}},define:{'process.env.NODE_ENV':JSON.stringify('production')}});
const output=(Array.isArray(result)?result[0]:result).output;
const bundle=output.find(x=>x.type==='chunk').code;
const css=(await readFile(path.join(root,'src/app/globals.css'),'utf8')).replace('@import "tailwindcss";','')+'\n'+output.filter(x=>x.type==='asset'&&x.fileName.endsWith('.css')).map(x=>x.source).join('\n');
const browser=await chromium.launch({headless:true});
try {
  for (const [width, reducedMotion] of [[390, 'no-preference'], [390, 'reduce'], [1280, 'no-preference']]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.abort());
    await page.setContent('<div id="root"></div>'); await page.addStyleTag({ content: css });
    await page.evaluate(f => { window.fixtureEvents = [f]; window.fixtureParams = { sport: 'Tennis', near: 'all', lat: '44.456789', lng: '26.123456', radius: '25' }; window.fetch = () => { throw Error('Unexpected request'); }; }, fixture);
    await page.addScriptTag({ content: bundle });
    const date = page.locator('#free-date'); await date.waitFor();
    await date.fill('2026-10-25');
    const form = page.locator('form[action="/discover"]');
    const values = await form.evaluate(element => Object.fromEntries(new FormData(element)));
    assert.equal(values.date, '2026-10-25'); assert.equal(values.sport, 'Tennis');
    assert.equal(values.lat, '44.5'); assert.equal(values.lng, '26.1');
    await form.evaluate(element => element.addEventListener('submit', event => { event.preventDefault(); window.submittedDate = new FormData(element).get('date'); }));
    await page.getByRole('button', { name: 'Find events', exact: true }).focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => window.submittedDate), '2026-10-25');
    await page.evaluate(() => { window.fixtureEvents = []; window.fixtureParams = { date: '2026-10-25', sport: 'Tennis' }; return window.renderFixture(); });
    await page.getByRole('heading', { name: 'Plans for 25 October 2026' }).waitFor();
    assert.equal(await page.locator('#free-date').inputValue(), '2026-10-25');
    assert.equal(await page.getByRole('link', { name: 'Clear date' }).getAttribute('href'), '/discover?sport=Tennis&days=7');
    assert.equal(await page.getByRole('navigation', { name: 'Choose when to play' }).locator('[aria-current]').count(), 0);
    assert.equal(await page.locator('article').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(out, `date-${width}-${reducedMotion}.png`), fullPage: true, animations: 'disabled' });
    assert.deepEqual(errors, []); await page.close();
  }
  console.log('Free date browser QA passed: mobile, reduced motion, desktop; keyboard submission, filters, empty state, clear shortcut and no overflow.');
} finally { await browser.close(); }
