import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import { build } from 'vite';
import { chromium } from '@playwright/test';

// Actual components, local synthetic content, no network or persistence.
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.resolve(root, '../../.agents/product-studio/runtime/scroll-reveal-qa');
await mkdir(out, {recursive:true});
const result = await build({configFile:false,root,logLevel:'error',oxc:{jsx:{runtime:'automatic'}},resolve:{alias:{'@':path.join(root,'src')}},plugins:[{name:'reveal-fixture',enforce:'pre',resolveId(id){if(id==='next/link')return '\0link';if(id.endsWith('virtual:reveal'))return '\0entry';},load(id){if(id==='\0link')return `import React from 'react';export default function Link({prefetch,children,...props}){return React.createElement('a',props,children)}`;if(id==='\0entry')return `import React from 'react';import{createRoot}from'react-dom/client';import Reveal from '@/components/ScrollReveal';import Landing from '@/components/landing/LandingExperience';const root=createRoot(document.getElementById('root'));window.landing=()=>root.render(React.createElement(Landing));root.render(React.createElement(React.Fragment,null,React.createElement(Reveal,{'data-testid':'initial'},'Visible on arrival'),React.createElement('div',{style:{height:'110vh'}}),React.createElement(Reveal,{'data-testid':'later',as:'section'},React.createElement('h2',null,'Your next activity'),React.createElement('a',{href:'#',id:'focus-target'},'Explore the plan')),React.createElement('div',{style:{height:'110vh'}})));`;}}],build:{write:false,minify:false,lib:{entry:'virtual:reveal',name:'RevealFixture',formats:['iife']}},define:{'process.env.NODE_ENV':JSON.stringify('production')}});
const output=(Array.isArray(result)?result[0]:result).output;
const bundle=output.find(x=>x.type==='chunk').code;
const css=(await readFile(path.join(root,'src/app/globals.css'),'utf8')).replace('@import "tailwindcss";','')+'\n'+output.filter(x=>x.type==='asset'&&x.fileName.endsWith('.css')).map(x=>x.source).join('\n');
const browser=await chromium.launch({headless:true});
try {
 for (const reducedMotion of ['no-preference','reduce']) {
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.abort());
  await page.setContent('<div id="root"></div>');await page.addStyleTag({content:css});await page.addScriptTag({content:bundle});
  const later=page.getByTestId('later');await later.waitFor();
  assert.equal(await page.getByTestId('initial').getAttribute('data-scroll-revealed'),null);
  assert.equal(await later.evaluate(el=>getComputedStyle(el).opacity),'1');
  await later.scrollIntoViewIfNeeded();
  if(reducedMotion==='no-preference'){
   await page.waitForFunction(()=>document.querySelector('[data-testid="later"]').dataset.scrollRevealed==='true');
   assert.notEqual(await later.evaluate(el=>getComputedStyle(el).animationName),'none');
   await page.locator('#focus-target').focus();
   assert.equal(await later.getAttribute('data-scroll-revealed'),null);
  }else{
   assert.equal(await later.getAttribute('data-scroll-revealed'),null);
   assert.equal(await later.evaluate(el=>getComputedStyle(el).animationName),'none');
  }
  await page.evaluate(()=>{window.scrollTo(0,0);window.landing()});
  await page.getByRole('heading',{name:'Less small talk. More good company.'}).waitFor();
  await page.getByRole('heading',{name:'A plan makes hello easier.'}).scrollIntoViewIfNeeded();
  await page.waitForTimeout(650);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(out,`landing-${reducedMotion}.png`),fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log(`PASS ${reducedMotion}: first paint, scroll reveal, keyboard cancellation, mobile landing, no overflow or page errors`);
  await page.close();
 }
} finally {await browser.close()}
