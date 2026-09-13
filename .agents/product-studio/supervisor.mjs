import { readFileSync, existsSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { validReport } from './reporting.mjs';
import { isDeepStrictEqual } from 'node:util';
const manifests=new Set(['package.json','package-lock.json','apps/web/package.json','apps/mobile/package.json','packages/domain/package.json']);
export function safeManifestChange(original,changed) {
  return isDeepStrictEqual(original.scripts,changed.scripts) && isDeepStrictEqual(original.workspaces,changed.workspaces);
}
export function checksForPaths(paths) {
  return paths.some(path=>manifests.has(path)) ? [['ci','--ignore-scripts'],...mandatoryChecks] : mandatoryChecks;
}

export function allowedChange(path) {
  if (typeof path !== 'string' || path.includes('\\') || path.split('/').some(part=>part === '..' || part.startsWith('.'))) return false;
  if (manifests.has(path)) return true;
  if (/(^|\/)(AGENTS\.md|SKILL\.md|package(?:-lock)?\.json|.*\.env.*)$/i.test(path)) return false;
  if (path === 'docs/operations/autonomous-operating-contract.md') return false;
  return ['apps/web/src/','apps/web/public/','apps/mobile/app/','apps/mobile/src/','apps/mobile/components/','packages/domain/src/','docs/'].some(prefix=>path.startsWith(prefix));
}

export function parseChanges(raw) {
  const fields=raw.split('\0').filter(Boolean), paths=[];
  for(let i=0;i<fields.length;i++) {
    const status=fields[i].slice(0,2), path=fields[i].slice(3);
    // The model must not stage files or change shared Git metadata.
    if (status !== '??' && status[0] !== ' ') throw new Error('Unexpected staged/conflicted change');
    if (!allowedChange(path)) throw new Error('Change outside allowed product paths');
    paths.push(path);
  }
  return paths;
}

export const mandatoryChecks=[
  ['run','typecheck'],
  ['run','test','--workspaces','--if-present','--','--maxWorkers=2'],
  ['run','lint'],
  ['run','build','--workspace','@sport-date/web'],
];

async function runCheck(npm, args, cwd, deadline, log) {
  if (Date.now() >= deadline) throw new Error('Verification deadline reached');
  await new Promise((resolvePromise,reject)=>{
    const child=spawn(process.execPath,[npm,...args],{cwd,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,RUN_DB_INTEGRATION:'0',OPENAI_API_KEY:'',CODEX_API_KEY:''}});
    child.stdout.on('data',data=>log.push(data)); child.stderr.on('data',data=>log.push(data));
    const timer=setTimeout(()=>{
      if (process.platform === 'win32') { try { execFileSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'}); } catch {} }
      else child.kill('SIGKILL');
      reject(new Error('Verification timed out'));
    },Math.max(1,deadline-Date.now()));
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('exit',code=>{clearTimeout(timer);code===0?resolvePromise():reject(new Error('Mandatory verification failed'));});
  });
}

export async function finalize(worktree, startedAt, expectedHead, runDir, {checkRunner=runCheck}={}) {
  const git=(...args)=>execFileSync('git',['-C',worktree,...args],{windowsHide:true,encoding:'utf8',maxBuffer:1048576});
  if (git('branch','--show-current').trim() !== 'studio/autonomous' || git('rev-parse','HEAD').trim() !== expectedHead) throw new Error('Branch/HEAD changed during model work');
  const changes=()=>parseChanges(git('status','--porcelain=v1','-z','--untracked-files=all'));
  let paths=changes();
  if (!paths.length) throw new Error('No prepared artifact to verify');
  const reportPath=join(worktree,'apps/web/public/standup/latest.json');
  const validate=()=>{
    if (!existsSync(reportPath) || lstatSync(reportPath).size>256000 || lstatSync(reportPath).isSymbolicLink()) throw new Error('Invalid report file');
    if (!validReport(JSON.parse(readFileSync(reportPath,'utf8').replace(/^\uFEFF/,'')),startedAt)) throw new Error('Invalid prepared report');
    for(const path of changes()) if(existsSync(join(worktree,path)) && lstatSync(join(worktree,path)).isSymbolicLink()) throw new Error('Symlink changes require review');
    for(const path of changes().filter(path=>manifests.has(path) && path !== 'package-lock.json')) {
      const original=JSON.parse(git('show','HEAD:'+path));
      const changed=JSON.parse(readFileSync(join(worktree,path),'utf8'));
      if(!safeManifestChange(original,changed)) throw new Error('Build scripts/workspace roots require separate review');
    }
  };
  validate();
  const npm=join(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
  if (!existsSync(npm) || !existsSync(join(worktree,'node_modules'))) throw new Error('Isolated npm dependencies unavailable');
  const deadline=Date.parse(startedAt)+25*60*1000, log=[];
  const checks=checksForPaths(paths);
  try { for(const args of checks) { log.push(Buffer.from('\nCHECK '+args.join(' ')+'\n')); await checkRunner(npm,args,worktree,deadline,log); } }
  finally { writeFileSync(join(runDir,'verification.log'),Buffer.concat(log)); }
  validate(); paths=changes();
  if(Date.now()>=deadline || git('rev-parse','HEAD').trim() !== expectedHead) throw new Error('Verification expired or HEAD changed');
  const hooks=join(runDir,'empty-hooks'); mkdirSync(hooks,{recursive:true});
  git('-c','core.hooksPath='+hooks,'add','--',...paths);
  git('-c','core.hooksPath='+hooks,'-c','commit.gpgsign=false','commit','-m','studio: verified autonomous product cycle');
  if(git('status','--porcelain').trim()) throw new Error('Worktree dirty after supervisor commit');
  return {committed:true,commit:git('rev-parse','HEAD').trim(),checks:checks.map(args=>args.join(' '))};
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [, , worktree,startedAt,expectedHead,runDir]=process.argv;
  try { console.log(JSON.stringify(await finalize(worktree,startedAt,expectedHead,runDir))); }
  catch { console.log(JSON.stringify({committed:false}));process.exitCode=1; }
}
