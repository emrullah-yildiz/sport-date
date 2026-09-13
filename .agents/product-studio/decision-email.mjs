// Owner-authorized decision alerts. Connector delivery is recorded only after a real send receipt.
// Reuses the app's Gmail OAuth configuration when locally available; never claims queued mail was sent.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, rmdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReportingEnvironment, readDecisions, HQ_ORIGIN } from '../../apps/web/scripts/studio-hq.mjs';
import { validReport } from './reporting.mjs';

const fingerprint = d => createHash('sha256').update(JSON.stringify([d.id,d.priority,d.title,d.detail,d.recommendation])).digest('hex');
export function pendingAlerts(report, decisions, receipts = {}) {
  if (!decisions.available) throw new Error('decision-status-unavailable');
  if (!validReport(report, '1970-01-01T00:00:00Z')) throw new Error('invalid-live-report');
  const resolved = new Set(decisions.decisions.filter(d => ['approve','deny'].includes(d.action)).map(d => d.directionId));
  return report.directions.filter(d => !resolved.has(d.id)).map(d => ({...d, fingerprint:fingerprint(d)}))
    .filter(d => !receipts[d.fingerprint]);
}

export function draftAlerts(alerts, recipient) {
  if (!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(recipient ?? '')) throw new Error('recipient-unconfigured');
  return {
    to: recipient,
    subject: `KeepItUp: ${alerts.length} decision${alerts.length === 1 ? '' : 's'} need your input`,
    text: ['Please review your pending decisions at https://keepitup.social/hq.html.',
      ...alerts.map(d => `${d.title}\n${d.detail}\nRecommendation: ${d.recommendation}`),
      'Record your decision in HQ so the autonomous team can act within that scope.'].join('\n\n'),
    fingerprints: alerts.map(d => d.fingerprint),
    directionIds: alerts.map(d => d.id),
  };
}

export function gmailConfigured(env) {
  return Boolean(env.STUDIO_OWNER_EMAIL_FROM && env.GMAIL_SENDER_EMAIL?.toLowerCase() === env.STUDIO_OWNER_EMAIL_FROM.toLowerCase()
    && env.EMAIL_DELIVERY_ENABLED === 'true' && env.EMAIL_DELIVERY_PROVIDER === 'gmail'
    && ['GMAIL_CLIENT_ID','GMAIL_CLIENT_SECRET','GMAIL_REFRESH_TOKEN'].every(k => env[k]?.trim()));
}

export async function deliverGmail(draft, {env,fetchImpl=fetch,beforeSend}) {
  if (!gmailConfigured(env)) throw new Error('selected-sender-unavailable');
  // Validate both addresses, and MIME-encode all decision text to prevent header injection.
  draftAlerts([],env.GMAIL_SENDER_EMAIL);
  draftAlerts([],draft.to);
  const authorization=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GMAIL_CLIENT_ID,
      client_secret:env.GMAIL_CLIENT_SECRET,refresh_token:env.GMAIL_REFRESH_TOKEN,grant_type:'refresh_token'})});
  if(!authorization.ok) throw new Error('gmail-authorization-unavailable');
  const token=await authorization.json();
  if(typeof token.access_token !== 'string' || !token.access_token) throw new Error('gmail-authorization-unavailable');
  const raw=Buffer.from([`From: ${env.GMAIL_SENDER_EMAIL}`,`To: ${draft.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(draft.subject).toString('base64')}?=`, 'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',
    Buffer.from(draft.text).toString('base64').match(/.{1,76}/g)?.join('\r\n') ?? ''].join('\r\n')).toString('base64url');
  await beforeSend(); // Persist uncertainty before external side effect; never blindly retry an ambiguous send.
  const response=await fetchImpl('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({raw})});
  if(!response.ok) throw new Error('gmail-delivery-unconfirmed');
  const result=await response.json();
  if(typeof result.id !== 'string' || !/^[A-Za-z0-9._:-]{1,200}$/.test(result.id)) throw new Error('gmail-delivery-unconfirmed');
  return result.id;
}

function readJson(path, fallback) { return existsSync(path) ? JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,'')) : fallback; }
function save(path, value) {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(value,null,2)+'\n', {mode:0o600});
  renameSync(temporary,path);
}

export async function monitorDecisionEmail(sourceRoot, {fetchImpl=fetch, env=process.env}={}) {
  const runtime = join(sourceRoot,'.agents/product-studio/runtime');
  const response = await fetchImpl(`${HQ_ORIGIN}/api/standup/report`, {redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error('live-report-unavailable');
  const {report} = await response.json();
  const decisions = await readDecisions({env,fetchImpl});
  const receipts=readJson(join(runtime,'decision-email-receipts.json'),{});
  const unresolved=pendingAlerts(report,decisions,{});
  const uncertainCount=unresolved.filter(d=>receipts[d.fingerprint]?.state === 'delivery-uncertain').length;
  const alerts = pendingAlerts(report, decisions, receipts);
  const queuedAt = new Date().toISOString();
  // Replace the queue so resolved/removed cards cannot be sent from a stale draft.
  const draft = alerts.length ? draftAlerts(alerts,env.STUDIO_OWNER_EMAIL) : null;
  save(join(runtime,'decision-email-outbox.json'),{state: draft ? 'queued-not-sent' : 'empty',queuedAt,draft});
  if(draft && gmailConfigured(env)) {
    const receiptsPath=join(runtime,'decision-email-receipts.json');
    try {
      const receipt=await deliverGmail(draft,{env,fetchImpl,beforeSend:()=>{
        const receipts=readJson(receiptsPath,{});
        for(const key of draft.fingerprints) receipts[key]={state:'delivery-uncertain',attemptedAt:queuedAt};
        save(receiptsPath,receipts);
      }});
      return recordReceipt(sourceRoot,receipt);
    } catch {
      return {state:'delivery-unconfirmed',pendingCount:alerts.length,checkedAt:queuedAt,
        reason:'Gmail did not confirm delivery. Any attempted send is held for manual receipt reconciliation to avoid duplicates.'};
    }
  }
  return {state:uncertainCount ? 'delivery-unconfirmed' : gmailConfigured(env) ? 'idle' : 'delivery-unavailable',
    providerConfigured:gmailConfigured(env),pendingCount:alerts.length,uncertainCount,checkedAt:queuedAt,
    reason:uncertainCount ? 'Prior send outcome needs manual receipt reconciliation; automatic resend suppressed.'
      : !gmailConfigured(env) ? 'Selected Gmail sender credentials unavailable locally; authorized interactive connector must deliver queued alerts.' : null};
}

export function recordReceipt(sourceRoot, receipt) {
  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(receipt ?? '')) throw new Error('provider-receipt-required');
  const runtime = join(sourceRoot,'.agents/product-studio/runtime');
  const outbox = readJson(join(runtime,'decision-email-outbox.json'),null);
  if (!outbox?.draft?.fingerprints?.length || outbox.state !== 'queued-not-sent') throw new Error('no-current-outbox');
  const receiptsPath = join(runtime,'decision-email-receipts.json');
  const receipts = readJson(receiptsPath,{});
  const sentAt = new Date().toISOString();
  for (const key of outbox.draft.fingerprints) receipts[key] = {receipt,sentAt};
  save(receiptsPath,receipts);
  save(join(runtime,'decision-email-outbox.json'),{...outbox,state:'sent',sentAt,receipt});
  return {state:'sent',count:outbox.draft.fingerprints.length,sentAt};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sourceRoot=resolve(process.argv[3] ?? '.');
  const runtime=join(sourceRoot,'.agents/product-studio/runtime');
  const lock=join(runtime,'decision-email.lock');
  let locked=false;
  try {
    mkdirSync(lock); locked=true;
    loadReportingEnvironment(sourceRoot);
    const result=process.argv[2] === 'monitor' ? await monitorDecisionEmail(sourceRoot)
      : process.argv[2] === 'record-receipt' ? recordReceipt(sourceRoot,process.argv[4]) : {state:'unsupported-command'};
    save(join(runtime,'decision-email-status.json'),result);
    console.log(JSON.stringify(result));
  } catch {
    const result={state:'unavailable',checkedAt:new Date().toISOString(),reason:'Decision email check failed; no send claimed. Inspect private configuration and HQ access.'};
    if(locked) save(join(runtime,'decision-email-status.json'),result);
    console.log(JSON.stringify(result)); process.exitCode=1;
  } finally { if(locked) rmdirSync(lock); }
}
