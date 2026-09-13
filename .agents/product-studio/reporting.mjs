import { readFileSync, writeFileSync, renameSync, existsSync, lstatSync, realpathSync, unlinkSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';

const reportRelative = 'apps/web/public/standup/latest.json';
const statuses = new Set(['keep','probation','fired','rehired-v2','hired','idle-blocked']);
const text = (value, max=4000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const exactKeys=(value, keys)=>value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && Object.keys(value).every(key=>keys.includes(key));
export function validReport(r, startedAt) {
  if (!exactKeys(r,['day','generatedAt','headline','summary','agents','directions']) || !/^\d{4}-\d{2}-\d{2}$/.test(r.day)) return false;
  const day = Date.parse(r.day+'T00:00:00Z');
  const timestamp = Date.parse(r.generatedAt);
  if (!Number.isFinite(day) || new Date(day).toISOString().slice(0,10) !== r.day || !text(r.generatedAt,64) || !Number.isFinite(timestamp)) return false;
  if (!Number.isFinite(Date.parse(startedAt)) || timestamp < Date.parse(startedAt) || timestamp > Date.now()+60000) return false;
  if (!text(r.headline) || !Array.isArray(r.summary) || !r.summary.length || r.summary.length > 10 || !r.summary.every(s=>text(s))) return false;
  if (!Array.isArray(r.agents) || r.agents.length > 25 || !r.agents.every(a=>exactKeys(a,['name','status','metric','note']) && text(a.name,200) && statuses.has(a.status) && text(a.metric) && text(a.note))) return false;
  if (!Array.isArray(r.directions) || r.directions.length > 8 || !r.directions.every(d=>exactKeys(d,['id','priority','title','detail','recommendation']) && /^SD-\d{8}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.id) && ['high','medium','low'].includes(d.priority) && text(d.title,300) && text(d.detail) && text(d.recommendation))) return false;
  return new Set(r.directions.map(d=>d.id)).size === r.directions.length && JSON.stringify(r).length <= 64000;
}

export function scopedSignal(status, decisions, ids) {
  const scoped = (Array.isArray(decisions?.decisions) ? decisions.decisions : [])
    .filter(d=>ids.has(d.directionId)).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const available = status.publishCredentialAvailable === true || decisions.available === true;
  const digest = createHash('sha256').update(JSON.stringify({available, scoped})).digest('hex');
  return { available, digest };
}

export function shouldWake(previous, current) {
  return Boolean(current?.available && previous?.digest && current.digest !== previous.digest);
}

export async function verifyLiveReport(report, {fetchImpl=fetch}={}) {
  try {
    const response=await fetchImpl('https://keepitup.social/api/standup/report',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
    if (!response.ok) return {verified:false};
    const body=await response.json();
    return {verified:isDeepStrictEqual(body.report,report)};
  } catch { return {verified:false}; }
}

export async function verifyCommittedLiveReport(worktree,startedAt) {
  const committed=execFileSync('git',['-C',worktree,'show','HEAD:'+reportRelative],{windowsHide:true,maxBuffer:256000});
  const report=JSON.parse(committed.toString('utf8').replace(/^\uFEFF/,''));
  if (!validReport(report,startedAt)) return {verified:false};
  return verifyLiveReport(report);
}

export function mirrorReport(worktree, sourceRoot, startedAt) {
  const source = join(resolve(worktree), reportRelative);
  const target = join(resolve(sourceRoot), reportRelative);
  if (lstatSync(source).isSymbolicLink() || realpathSync(source) !== resolve(source)) throw new Error('Report source path is redirected');
  if (realpathSync(dirname(target)) !== resolve(dirname(target))) throw new Error('Report destination is redirected');
  if (existsSync(target) && lstatSync(target).isSymbolicLink()) throw new Error('Report destination is a link');
  if (lstatSync(source).size > 256000) throw new Error('Report is too large');
  const raw = readFileSync(source);
  const report = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,''));
  if (!validReport(report, startedAt)) throw new Error('Malformed or stale report');
  const committed = execFileSync('git',['-C',worktree,'show','HEAD:'+reportRelative],{windowsHide:true,maxBuffer:256000});
  // Git may normalize a clean Windows working file from CRLF to LF in its object store.
  // Compare only that byte-level normalization; never accept semantic/whitespace edits.
  const normalizeLines=buffer=>buffer.filter((byte,index)=>byte !== 13 || buffer[index+1] !== 10);
  if (!raw.equals(committed) && !normalizeLines(raw).equals(normalizeLines(committed))) throw new Error('Report does not match the committed artifact');
  const committedReport=JSON.parse(committed.toString('utf8').replace(/^\uFEFF/,''));
  if (!validReport(committedReport,startedAt)) throw new Error('Malformed committed report');
  if (existsSync(target)) {
    const previous=JSON.parse(readFileSync(target,'utf8').replace(/^\uFEFF/,''));
    if (Date.parse(previous.generatedAt) > Date.parse(report.generatedAt)) throw new Error('Refusing to replace a newer HQ report');
  }
  const temp=target+'.studio-'+process.pid+'.tmp';
  try { writeFileSync(temp,committed,{flag:'wx'}); renameSync(temp,target); }
  finally { if (existsSync(temp)) unlinkSync(temp); }
  return { mirrored:true, generatedAt:report.generatedAt };
}

export async function monitor(sourceRoot, worktree) {
  const helper=await import(pathToFileURL(join(sourceRoot,'apps/web/scripts/studio-hq.mjs')));
  helper.loadReportingEnvironment(sourceRoot);
  const decisions=await helper.readDecisions();
  if (!decisions.available && decisions.reason !== 'owner-decisions-credential-missing') throw new Error('Decision monitoring unavailable');
  // Report IDs scope wakeups: unrelated old decisions cannot repeatedly start workers.
  const reports=[sourceRoot,worktree].map(root=>join(root,reportRelative)).filter(existsSync)
    .map(path=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,'')));
  reports.sort((a,b)=>Date.parse(b.generatedAt)-Date.parse(a.generatedAt));
  const ids=new Set((reports[0]?.directions ?? []).map(d=>d.id));
  return scopedSignal({publishCredentialAvailable:Boolean(helper.reportCredential())}, decisions, ids);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === 'monitor') console.log(JSON.stringify(await monitor(process.argv[3],process.argv[4])));
    else if (process.argv[2] === 'mirror') console.log(JSON.stringify(mirrorReport(process.argv[3],process.argv[4],process.argv[5])));
    else if (process.argv[2] === 'verify-live') console.log(JSON.stringify(await verifyCommittedLiveReport(process.argv[3],process.argv[4])));
    else throw new Error('Unsupported reporting command');
  } catch { console.log(JSON.stringify({failed:true})); process.exitCode=1; }
}
