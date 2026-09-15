import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { build } from 'vite';
import { chromium } from '@playwright/test';

// Real host form + address control; no application server, database or external requests.
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.resolve(root, '../../.agents/product-studio/runtime/event-steps-qa');
await mkdir(out, { recursive: true });
const mocks = {
  '@/lib/track-click': 'export function trackClick(){}',
  '@/components/EventLocationMapPicker': 'export default function Map(){return null}',
};
const result = await build({configFile:false,root,logLevel:'error',oxc:{jsx:{runtime:'automatic'}},resolve:{alias:{'@':path.join(root,'src')}},plugins:[{name:'host-fixture',enforce:'pre',resolveId(id){const key=Object.keys(mocks).find(k=>id===k || id.replaceAll('\\','/')===path.join(root,'src',k.slice(2)).replaceAll('\\','/'));if(key)return '\0mock:'+key;if(id.endsWith('virtual:host'))return '\0entry';},load(id){if(id.startsWith('\0mock:'))return mocks[id.slice(6)];if(id==='\0entry')return `import React from 'react';import{createRoot}from'react-dom/client';import Form from '@/components/CreateEventForm';createRoot(document.getElementById('root')).render(React.createElement(Form));`;}}],build:{write:false,minify:false,lib:{entry:'virtual:host',name:'HostFixture',formats:['iife']}},define:{'process.env.NODE_ENV':JSON.stringify('production')}});
const output=(Array.isArray(result)?result[0]:result).output;
const bundle=output.find(x=>x.type==='chunk').code;
const css=(await readFile(path.join(root,'src/app/globals.css'),'utf8')).replace('@import "tailwindcss";','')+'\n'+output.filter(x=>x.type==='asset'&&x.fileName.endsWith('.css')).map(x=>x.source).join('\n');
const browser=await chromium.launch({headless:true});
try {
  for(const [width,reducedMotion] of [[390,'no-preference'],[390,'reduce'],[1280,'no-preference'],[1280,'reduce']]) {
    const page=await browser.newPage({viewport:{width,height:844},reducedMotion});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>r.abort());
    await page.setContent('<main style="padding:24px"><div id="root"></div></main>');await page.addStyleTag({content:css});
    await page.evaluate(()=>{
      window.calls=[];
      window.fetch=async(url,init)=>{
        if(url.startsWith('/api/locations/search'))return new Response(JSON.stringify({suggestions:[{id:'synthetic',label:'Synthetic court, Bucharest',address:'Example street 1',postalCode:'010101',city:'Bucharest',district:'North',countryCode:'RO',latitude:44.4,longitude:26.1}]}));
        if(url!=='/api/events'||init?.method!=='POST')throw Error('Unexpected request');
        window.calls.push(JSON.parse(init.body));
        return new Response(JSON.stringify(window.calls.length===1?{errors:['Title is invalid.']}:{error:'Synthetic retry failure'}),{status:400});
      };
    });
    await page.addScriptTag({content:bundle});
    const next=page.getByRole('button',{name:'Continue',exact:true});
    async function step(id){await page.locator(`#section-${id}:visible`).waitFor();assert.equal(await page.locator('.event-form-section:visible').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
    await step('invitation');
    await next.click();await page.waitForFunction(()=>document.activeElement?.id==='sport');
    assert.equal(await page.locator('[aria-invalid="true"]').count(),3);
    assert.equal(await page.evaluate(()=>window.calls.length),0);
    await page.locator('#sport').fill('Tennis');await page.locator('#title').fill('An easy evening rally');await page.locator('#description').fill('A friendly beginner rally with breaks and water.');
    await next.focus();await page.keyboard.press('Enter');await step('rhythm');
    await next.click();await page.waitForFunction(()=>document.activeElement?.id==='startsAt');
    await page.locator('#startsAt').fill('2099-09-20T16:00');
    await page.getByRole('button',{name:'Back',exact:true}).click();await step('invitation');assert.equal(await page.locator('#title').inputValue(),'An easy evening rally');
    await next.click();await step('rhythm');assert.equal(await page.locator('#startsAt').inputValue(),'2099-09-20T16:00');
    await next.click();await step('people');await next.click();await page.waitForFunction(()=>document.activeElement?.id==='language');await page.locator('#language').fill('English');
    await page.getByRole('checkbox',{name:'Beginner',exact:true}).uncheck();await page.getByRole('checkbox',{name:'Intermediate',exact:true}).uncheck();await next.click();await page.waitForFunction(()=>document.activeElement?.id==='experienceLevels');await page.getByRole('checkbox',{name:'Beginner',exact:true}).check();
    await next.click();await step('location');await page.getByRole('button',{name:'Review invitation',exact:true}).click();assert.equal(await page.locator('[role="alert"]').count(),1);
    await page.locator('#venueName').fill('Court 2');await page.locator('#address').fill('Synthetic court');await page.getByRole('option',{name:'Synthetic court, Bucharest',exact:false}).click();await page.locator('#instructions').fill('Meet at the entrance.');
    await page.getByRole('button',{name:'Review invitation',exact:true}).click();await step('review');
    assert.equal(await page.evaluate(()=>window.calls.length),0);
    for(const text of ['An easy evening rally','English','North','Example street 1','010101','Meet at the entrance.'])assert.ok((await page.locator('#section-review').innerText()).includes(text));
    if(reducedMotion==='reduce')assert.equal(await page.locator('#section-review').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.screenshot({path:path.join(out,`host-review-${width}-${reducedMotion}.png`),fullPage:true,animations:'disabled'});
    await page.getByRole('button',{name:'Publish the invitation',exact:true}).click();
    await step('invitation');await page.waitForFunction(()=>document.activeElement?.id==='title');
    const payload=await page.evaluate(()=>window.calls[0]);
    assert.equal(payload.title,'An easy evening rally');assert.equal(payload.durationMinutes,'90');assert.deepEqual(payload.experienceLevels,['beginner']);assert.deepEqual(payload.participantAgeRange,{minimum:'24',maximum:'38'});
    assert.deepEqual(payload.location.public,{city:'Bucharest',countryCode:'RO',areaLabel:'North',approximateLatitude:null,approximateLongitude:null});
    assert.deepEqual(payload.location.private,{venueName:'Court 2',address:'Example street 1',postalCode:'010101',instructions:'Meet at the entrance.',latitude:44.4,longitude:26.1});
    await page.locator('#title').fill('An easy evening tennis rally');
    await next.click();await next.click();await next.click();await page.getByRole('button',{name:'Review invitation',exact:true}).click();await step('review');
    await page.getByRole('button',{name:'Publish the invitation',exact:true}).click();await page.getByText('Synthetic retry failure',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.calls.length),2);assert.equal(await page.locator('#title').inputValue(),'An easy evening tennis rally');assert.equal(await page.locator('#address').inputValue(),'Example street 1');
    assert.deepEqual(errors,[]);await page.close();console.log(`PASS host ${width}px ${reducedMotion}: per-step validation, retained fields, review, publish-only payload, server-field recovery, retry, no overflow or real requests`);
  }
} finally {await browser.close();}


