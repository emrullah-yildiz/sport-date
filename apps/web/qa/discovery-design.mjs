import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { build } from 'vite';
import { chromium } from '@playwright/test';

// Actual page and components; synthetic read-only dependencies, no app/API access.
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.resolve(root, '../../.agents/product-studio/runtime/discovery-qa');
await mkdir(out, { recursive: true });
const fixture = {id:'synthetic-run',sport:'Running',title:'An easy run. A good reason to get out.',startsAt:'2026-09-20T16:00:00Z',timeZone:'Europe/Bucharest',placesRemaining:2,language:'English',experienceLevels:['beginner'],minimumAge:18,maximumAge:65,hostFirstName:'Sam',areaLabel:'North',city:'Bucharest',request:null};
const mocks = {
  '@/lib/session': `export async function getCurrentUser(){return {firstName:'Alex',location:'Bucharest'}}`,
  '@/lib/events': `export async function getDiscoverableEvents(){return window.fixtureEvents}export async function getDiscoverableEvent(){return window.fixtureEvents[0]}export async function getAcceptedEventLocation(){return {venueName:'Synthetic venue',address:'Synthetic address'}}`,
  '@/lib/join-requests': `export async function getMemberReliabilityStanding(){return {notice:{tone:'none',headline:'',body:'',liftsAt:null}}}`,
  '@/lib/track-click': 'export function trackClick(){}',
  '@/lib/entitlements': 'export function isPlus(){return false}',
  '@/components/ClickTracking': 'export default function Tracking(){return null}',
  'next/link': `import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}`,
  'next/navigation': `export function notFound(){throw Error('Unexpected not found')}export function redirect(){throw Error('Unexpected redirect')}export function useRouter(){return {push(){},refresh(){}}}export function usePathname(){return '/discover'}export function useSearchParams(){return new URLSearchParams()}`,
  'server-only': '',
};
const result = await build({configFile:false,root,logLevel:'error',oxc:{jsx:{runtime:'automatic'}},resolve:{alias:{'@':path.join(root,'src')}},plugins:[{name:'discovery-fixture',enforce:'pre',resolveId(id){const key=Object.keys(mocks).find(k=>id===k || (k.startsWith('@/') && id.replaceAll('\\','/')===path.join(root,'src',k.slice(2)).replaceAll('\\','/')));if(key)return '\0mock:'+key;if(id.endsWith('virtual:discovery'))return '\0entry';},load(id){if(id.startsWith('\0mock:'))return mocks[id.slice(6)];if(id==='\0entry')return `import React from 'react';import{createRoot}from'react-dom/client';import Page from '@/app/discover/page';import Detail from '@/app/discover/events/[eventId]/page';const root=createRoot(document.getElementById('root'));window.renderFixture=async()=>root.render(window.fixtureDetail ? await Detail({params:Promise.resolve({eventId:'synthetic-run'})}) : await Page({searchParams:Promise.resolve(window.fixtureParams||{})}));window.renderFixture();`;}}],build:{write:false,minify:false,lib:{entry:'virtual:discovery',name:'DiscoveryFixture',formats:['iife']}},define:{'process.env.NODE_ENV':JSON.stringify('production')}});
const output=(Array.isArray(result)?result[0]:result).output;
const bundle=output.find(x=>x.type==='chunk').code;
const css=(await readFile(path.join(root,'src/app/globals.css'),'utf8')).replace('@import "tailwindcss";','')+'\n'+output.filter(x=>x.type==='asset'&&x.fileName.endsWith('.css')).map(x=>x.source).join('\n');
const browser=await chromium.launch({headless:true});
try {
  for(const [width,reducedMotion] of [[390,'no-preference'],[390,'reduce'],[1280,'no-preference']]) {
    const page=await browser.newPage({viewport:{width,height:844},reducedMotion});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>r.abort());
    await page.setContent('<div id="root"></div>');await page.addStyleTag({content:css});
    await page.evaluate(f=>{window.fixtureEvents=[f,{...f,id:'synthetic-tennis',sport:'Tennis',title:'A friendly rally and a very long synthetic invitation title to check wrapping on small screens'}];window.fetch=()=>{throw Error('Unexpected request')};},fixture);
    await page.addScriptTag({content:bundle});
    const next=page.getByRole('button',{name:'Next →',exact:true});
    const prev=page.getByRole('button',{name:'← Previous',exact:true});
    await next.waitFor();assert.equal(await prev.isDisabled(),true);
    await page.screenshot({path:path.join(out,`focus-${width}-${reducedMotion}.png`),fullPage:true,animations:"disabled"});
    await next.focus();await page.keyboard.press('Enter');
    await page.getByText("You're all caught up",{exact:true}).waitFor();assert.equal(await next.isDisabled(),true);
    assert.equal(await page.locator('article').count(),1);
    await prev.click();await page.getByRole('button',{name:'See all',exact:true}).click();
    assert.equal(await page.locator('article').count(),2);
    await page.screenshot({path:path.join(out,`grid-${width}-${reducedMotion}.png`),fullPage:true,animations:"disabled"});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByRole('button',{name:'One at a time',exact:true}).click();
    await page.evaluate(()=>{window.fixtureEvents=[];window.fixtureParams={sport:'Tennis'};return window.renderFixture()});
    await page.getByText('Nothing matches these filters right now.',{exact:false}).waitFor();
    assert.equal(await page.locator('article').count(),0);
    await page.screenshot({path:path.join(out,`empty-${width}-${reducedMotion}.png`),fullPage:true,animations:"disabled"});
    await page.evaluate(f=>{window.fixtureEvents=[f];window.fixtureParams={near:'all'};return window.renderFixture()},fixture);
    await page.getByText('Invitation 1 of 1',{exact:true}).waitFor();assert.equal(await next.count(),0);
    await page.locator('summary').click();assert.equal(await page.locator('input[name="near"]').inputValue(),'all');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.evaluate(f=>{window.fixtureDetail=true;window.fixtureEvents=[{...f,description:'Bring comfortable shoes and water.',durationMinutes:60,eligibility:'eligible',hostUserId:'synthetic-host',viewerIsHost:false}];window.calls=[];window.fetch=async(url,init)=>{if(init?.method!=='POST'||!url.endsWith('/requests'))throw Error('Unexpected request');window.calls.push({url,body:JSON.parse(init.body)});return new Response(JSON.stringify({requestId:'synthetic-request',status:'pending'}));};return window.renderFixture()},fixture);
    await page.getByRole('button',{name:'Request a place',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(out,`detail-${width}-${reducedMotion}.png`),fullPage:true,animations:'disabled'});
    await page.getByText('About this plan',{exact:true}).click();
    await page.getByText('Bring comfortable shoes and water.',{exact:true}).waitFor();
    await page.getByRole('textbox',{name:'A short note to the host optional'}).fill('Looking forward to a gentle pace.');
    const request=page.getByRole('button',{name:'Request a place',exact:true});await request.focus();await page.keyboard.press('Enter');
    await page.getByRole('button',{name:'Cancel request',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.calls.length),1);
    await page.waitForFunction(()=>document.activeElement?.tagName==='STRONG');
    assert.equal(await page.getByText('Synthetic address',{exact:false}).count(),0);
    await page.screenshot({path:path.join(out,`pending-${width}-${reducedMotion}.png`),fullPage:true,animations:'disabled'});
    assert.deepEqual(errors,[]);await page.close();console.log(`PASS discovery ${width}px ${reducedMotion}: finite keyboard browse, grid, empty/single, filters, detail disclosure, mocked request/pending focus, no overflow or real network`);
  }
} finally {await browser.close();}

