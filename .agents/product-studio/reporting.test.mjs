import test from 'node:test';
import assert from 'node:assert/strict';
import { validReport, scopedSignal, shouldWake, mirrorReport, verifyLiveReport } from './reporting.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
const now=new Date().toISOString();
const report=()=>({day:now.slice(0,10),generatedAt:now,headline:'Local progress',summary:['Verified local result; live reporting unavailable.'],agents:[{name:'CEO',status:'keep',metric:'Activation',note:'One verified slice'}],directions:[{id:'SD-20260914-access',priority:'high',title:'Restore reporting',detail:'Credential missing',recommendation:'Store the scoped credential'}]});
test('valid fresh schema permits mirror',()=>assert.equal(validReport(report(),now),true));
test('unknown report, agent and direction fields cannot reach public HQ',()=>{
  const extras=[{...report(),logs:'private output'}, {...report(),agents:[{...report().agents[0],debug:'private output'}]}, {...report(),directions:[{...report().directions[0],token:'secret'}]}];
  for(const invalid of extras) assert.equal(validReport(invalid,now),false);
});
test('live verification requires exact independent readback and fails closed',async()=>{
  assert.deepEqual(await verifyLiveReport(report(),{fetchImpl:async()=>({ok:true,json:async()=>({report:report()})})}),{verified:true});
  assert.deepEqual(await verifyLiveReport(report(),{fetchImpl:async()=>({ok:true,json:async()=>({report:{...report(),headline:'Stale remote'}})})}),{verified:false});
  assert.deepEqual(await verifyLiveReport(report(),{fetchImpl:async()=>({ok:false})}),{verified:false});
  assert.deepEqual(await verifyLiveReport(report(),{fetchImpl:async()=>{throw new Error('network unavailable');}}),{verified:false});
});
test('malformed status and stale/oversized reports refuse mirror',()=>{
  for (const invalid of [null,{}, {...report(),agents:[{...report().agents[0],status:'running'}]}, {...report(),headline:'a'.repeat(64001)}, {...report(),generatedAt:'2020-01-01'}, {...report(),day:'2026-02-31'}]) assert.equal(validReport(invalid,now),false);
});
test('unchanged decisions never wake a costly model cycle',()=>{
  const signal=scopedSignal({publishCredentialAvailable:true},{available:true,decisions:[{directionId:'SD-20260914-access',action:'approve'}]},new Set(['SD-20260914-access']));
  assert.equal(shouldWake(signal,signal),false);
  assert.equal(shouldWake(null,signal),false);
});
test('scoped new response wakes but unrelated decision does not',()=>{
  const ids=new Set(['SD-20260914-access']);
  const before=scopedSignal({}, {available:true,decisions:[]},ids);
  const unrelated=scopedSignal({}, {available:true,decisions:[{directionId:'SD-20260701-old',action:'approve'}]},ids);
  const approved=scopedSignal({}, {available:true,decisions:[{directionId:'SD-20260914-access',action:'approve',comment:'Use existing account'}]},ids);
  assert.equal(shouldWake(before,unrelated),false);
  assert.equal(shouldWake(before,approved),true);
});
test('restored credentials wake once; absent credentials never loop',()=>{
  const ids=new Set();
  const missing=scopedSignal({}, {available:false,decisions:[]},ids);
  const ready=scopedSignal({publishCredentialAvailable:true}, {available:false,decisions:[]},ids);
  assert.equal(shouldWake(missing,missing),false);
  assert.equal(shouldWake(missing,ready),true);
  assert.equal(shouldWake(ready,ready),false);
  assert.equal(shouldWake(ready,missing),false);
});
test('mirror copies only committed valid bytes; malformed and uncommitted reports preserve HQ',()=>{
  const root=mkdtempSync(join(tmpdir(),'studio-report-test-'));
  const worktree=join(root,'worktree'), source=join(root,'source');
  const relative='apps/web/public/standup/latest.json';
  const run=(...args)=>execFileSync('git',['-C',worktree,...args],{windowsHide:true,stdio:'pipe'});
  try {
    mkdirSync(join(worktree,'apps/web/public/standup'),{recursive:true});
    mkdirSync(join(source,'apps/web/public/standup'),{recursive:true});
    const raw=JSON.stringify(report(),null,2)+'\n';
    writeFileSync(join(worktree,relative),raw);
    writeFileSync(join(source,relative),JSON.stringify({...report(),generatedAt:'2020-01-01T00:00:00Z'}));
    writeFileSync(join(source,'unrelated.txt'),'preserve');
    run('init'); run('add','.'); run('-c','user.name=Runtime test','-c','user.email=runtime-test@example.invalid','-c','core.autocrlf=false','commit','-m','fixture');
    assert.equal(mirrorReport(worktree,source,now).mirrored,true);
    assert.equal(readFileSync(join(source,relative),'utf8'),raw);
    assert.equal(readFileSync(join(source,'unrelated.txt'),'utf8'),'preserve');
    // A Windows checkout can hold CRLF even when Git's canonical object is LF.
    writeFileSync(join(worktree,relative),raw.replace(/\n/g,'\r\n'));
    assert.equal(mirrorReport(worktree,source,now).mirrored,true);
    assert.equal(readFileSync(join(source,relative),'utf8'),raw,'Mirrored bytes must be the committed LF artifact');
    const newer={...report(),generatedAt:new Date(Date.parse(now)+1000).toISOString(),headline:'Coordinator current report'};
    const newerRaw=JSON.stringify(newer);
    writeFileSync(join(source,relative),newerRaw);
    assert.deepEqual(mirrorReport(worktree,source,now),{mirrored:false,committedReportVerified:true,skipped:'newer-source-report',generatedAt:now,sourceGeneratedAt:newer.generatedAt});
    assert.equal(readFileSync(join(source,relative),'utf8'),newerRaw,'Newer coordinator report must be preserved byte for byte');
    writeFileSync(join(worktree,relative),JSON.stringify({...report(),headline:'Uncommitted stale handoff'}));
    assert.throws(()=>mirrorReport(worktree,source,now),/committed artifact/,'Newer source cannot bypass artifact verification');
    assert.equal(readFileSync(join(source,relative),'utf8'),newerRaw);
    writeFileSync(join(worktree,relative),raw);
    writeFileSync(join(source,relative),JSON.stringify({...newer,privateField:'not permitted'}));
    assert.throws(()=>mirrorReport(worktree,source,now),/Malformed newer/);
    writeFileSync(join(source,relative),JSON.stringify({...newer,generatedAt:new Date(Date.now()+120000).toISOString()}));
    assert.throws(()=>mirrorReport(worktree,source,now),/Malformed newer/,'A future timestamp cannot create a successful skip');
    writeFileSync(join(source,relative),raw);
    writeFileSync(join(worktree,relative),JSON.stringify({...report(),headline:'Uncommitted edit'}));
    assert.throws(()=>mirrorReport(worktree,source,now),/committed artifact/);
    assert.equal(readFileSync(join(source,relative),'utf8'),raw);
    writeFileSync(join(worktree,relative),JSON.stringify({...report(),agents:[{status:'invalid'}]}));
    run('add','.'); run('-c','user.name=Runtime test','-c','user.email=runtime-test@example.invalid','commit','-m','invalid fixture');
    assert.throws(()=>mirrorReport(worktree,source,now),/Malformed/);
    assert.equal(readFileSync(join(source,relative),'utf8'),raw);
  } finally {
    const target=resolve(root), allowed=resolve(tmpdir())+sep+'studio-report-test-';
    assert.ok(target.startsWith(allowed) && target.length > allowed.length);
    rmSync(target,{recursive:true,force:true});
  }
});
