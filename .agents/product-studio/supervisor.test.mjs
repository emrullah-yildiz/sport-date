import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedChange, parseChanges, mandatoryChecks, finalize, safeManifestChange, checksForPaths } from './supervisor.mjs';
import { mkdtempSync,mkdirSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve,sep } from 'node:path';
import { execFileSync } from 'node:child_process';
test('only product files can enter supervisor commit',()=>{
  for(const path of ['apps/web/src/app/page.tsx','apps/web/public/standup/latest.json','packages/domain/src/event.test.ts','docs/operations/agent-state.md','package.json','package-lock.json','apps/web/package.json']) assert.equal(allowedChange(path),true,path);
  for(const path of ['.agents/product-studio/runner.ps1','.git/config','AGENTS.md','docs/AGENTS.md','docs/operations/autonomous-operating-contract.md','apps/new/package.json','apps/web/public/.env','docs/../secret','apps/web/src/../../secret']) assert.equal(allowedChange(path),false,path);
});
test('staged, conflicted or out-of-scope files stop commit',()=>{
  assert.deepEqual(parseChanges(' M apps/web/src/space name.ts\0?? docs/operations/progress.md\0'),['apps/web/src/space name.ts','docs/operations/progress.md']);
  for(const raw of ['M  apps/web/src/a.ts\0','UU apps/web/src/a.ts\0','?? .env\0',' M apps/unknown/package.json\0']) assert.throws(()=>parseChanges(raw));
});
test('independent verification includes typechecks all hermetic tests lint and web build',()=>{
  assert.deepEqual(mandatoryChecks,[['run','typecheck'],['run','test','--workspaces','--if-present','--','--maxWorkers=2'],['run','lint'],['run','build','--workspace','@sport-date/web']]);
});
test('dependency upgrades reinstall but cannot replace verification scripts or workspace roots',()=>{
  const original={scripts:{test:'vitest run'},workspaces:['apps/*'],dependencies:{example:'1'}};
  assert.equal(safeManifestChange(original,{...original,dependencies:{example:'2'}}),true);
  assert.equal(safeManifestChange(original,{...original,scripts:{test:'echo skip'}}),false);
  assert.equal(safeManifestChange(original,{...original,workspaces:[]}),false);
  assert.deepEqual(checksForPaths(['package-lock.json']),[['ci','--ignore-scripts'],...mandatoryChecks]);
});
test('failed verification preserves unstaged work; only all-passing verification commits isolated branch',async()=>{
  const root=mkdtempSync(join(tmpdir(),'studio-supervisor-test-')), worktree=join(root,'worktree'),logs=join(root,'logs');
  const git=(...args)=>execFileSync('git',['-C',worktree,...args],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
  const now=new Date().toISOString();
  const report={day:now.slice(0,10),generatedAt:now,headline:'Local verified progress',summary:['Local-only'],agents:[],directions:[]};
  try {
    mkdirSync(join(worktree,'apps/web/public/standup'),{recursive:true}); mkdirSync(join(worktree,'docs'),{recursive:true});mkdirSync(join(worktree,'node_modules'));mkdirSync(logs);
    writeFileSync(join(worktree,'.gitignore'),'node_modules/\n');
    writeFileSync(join(worktree,'apps/web/public/standup/latest.json'),JSON.stringify({...report,generatedAt:'2020-01-01T00:00:00Z'}));
    git('init','-b','studio/autonomous');git('config','user.name','Runtime test');git('config','user.email','runtime-test@example.invalid');git('add','.');git('commit','-m','fixture');
    const head=git('rev-parse','HEAD');
    writeFileSync(join(worktree,'apps/web/public/standup/latest.json'),JSON.stringify(report));writeFileSync(join(worktree,'docs/outcome.md'),'Prepared work');
    await assert.rejects(finalize(worktree,now,head,logs,{checkRunner:async()=>{throw new Error('test failure');}}),/test failure/);
    assert.equal(git('rev-parse','HEAD'),head);assert.ok(git('status','--porcelain').length>0);assert.equal(git('diff','--cached','--name-only'),'');
    const seen=[];
    const result=await finalize(worktree,now,head,logs,{checkRunner:async(_npm,args)=>{seen.push(args);}});
    assert.equal(result.committed,true);assert.deepEqual(seen,mandatoryChecks);assert.notEqual(git('rev-parse','HEAD'),head);assert.equal(git('status','--porcelain'),'');
  } finally {
    const target=resolve(root),allowed=resolve(tmpdir())+sep+'studio-supervisor-test-';assert.ok(target.startsWith(allowed)&&target.length>allowed.length);rmSync(target,{recursive:true,force:true});
  }
});
