import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingAlerts, draftAlerts, gmailConfigured, deliverGmail, monitorDecisionEmail, recordReceipt } from './decision-email.mjs';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const card={id:'SD-20260914-example',priority:'high',title:'A decision',detail:'Context',recommendation:'Approve a bounded task'};
const report={day:'2026-09-14',generatedAt:new Date().toISOString(),headline:'Decisions',summary:['Summary'],agents:[],directions:[card]};
const decisions={available:true,decisions:[]};
test('stable fingerprints ignore reporting timestamps and deduplicate sent cards',()=>{
  const first=pendingAlerts(report,decisions);
  assert.equal(first.length,1);
  assert.equal(pendingAlerts({...report,headline:'New summary'},decisions)[0].fingerprint,first[0].fingerprint);
  assert.equal(pendingAlerts(report,decisions,{[first[0].fingerprint]:{receipt:'confirmed'}}).length,0);
  assert.equal(pendingAlerts({...report,directions:[{...card,recommendation:'Changed scope'}]},decisions,{[first[0].fingerprint]:{receipt:'confirmed'}}).length,1);
});
test('resolved approvals and denials are never notified',()=>{
  for(const action of ['approve','deny']) assert.deepEqual(pendingAlerts(report,{available:true,decisions:[{directionId:card.id,action}]}),[]);
  assert.throws(()=>pendingAlerts(report,{available:false,decisions:[]}));
});
test('rejects malformed report and header injection recipients',()=>{
  assert.throws(()=>pendingAlerts({...report,directions:[card,card]},decisions));
  assert.throws(()=>draftAlerts([card],'owner@example.com\r\nBcc: other@example.com'));
  assert.equal(draftAlerts([card],'owner@example.com').to,'owner@example.com');
});
const env={STUDIO_OWNER_EMAIL_FROM:'sender@example.com',GMAIL_SENDER_EMAIL:'sender@example.com',EMAIL_DELIVERY_ENABLED:'true',EMAIL_DELIVERY_PROVIDER:'gmail',GMAIL_CLIENT_ID:'id',GMAIL_CLIENT_SECRET:'secret',GMAIL_REFRESH_TOKEN:'refresh'};
test('requires explicitly selected sender and configured provider',()=>{
  assert.equal(gmailConfigured(env),true);
  assert.equal(gmailConfigured({...env,STUDIO_OWNER_EMAIL_FROM:'other@example.com'}),false);
  assert.equal(gmailConfigured({...env,GMAIL_REFRESH_TOKEN:''}),false);
});
test('records uncertainty before send and accepts only provider receipt',async()=>{
  let prepared=false, calls=0;
  const id=await deliverGmail(draftAlerts([card],'owner@example.com'),{env,beforeSend:()=>{prepared=true;},fetchImpl:async(url,init)=>{
    assert.equal(init.redirect,'error');
    if(++calls === 1) return new Response(JSON.stringify({access_token:'token'}));
    assert.equal(prepared,true); assert.match(url,/messages\/send$/);
    return new Response(JSON.stringify({id:'message-1'}));
  }});
  assert.equal(id,'message-1');
});
test('token failure never records a send attempt; ambiguous send never claims success',async()=>{
  let attempted=false;
  await assert.rejects(deliverGmail(draftAlerts([card],'owner@example.com'),{env,beforeSend:()=>{attempted=true;},fetchImpl:async()=>new Response('',{status:401})}));
  assert.equal(attempted,false);
  let calls=0;
  await assert.rejects(deliverGmail(draftAlerts([card],'owner@example.com'),{env,beforeSend:()=>{attempted=true;},fetchImpl:async()=>{
    if(++calls===1) return new Response(JSON.stringify({access_token:'token'}));
    throw new Error('timeout');
  }}));
  assert.equal(attempted,true);
});
test('durable receipt suppresses exact card; unavailable provider remains visible with empty queue',async()=>{
  const root=mkdtempSync(join(tmpdir(),'studio-mail-')); mkdirSync(join(root,'.agents/product-studio/runtime'),{recursive:true});
  const fetchImpl=async url=>new Response(JSON.stringify(url.endsWith('/report')?{report}:decisions));
  const options={fetchImpl,env:{STUDIO_OWNER_EMAIL:'owner@example.com',SOCIAL_AGENT_SECRET:'test'}};
  try {
    assert.equal((await monitorDecisionEmail(root,options)).pendingCount,1);
    assert.equal(recordReceipt(root,'provider-confirmed-1').state,'sent');
    const next=await monitorDecisionEmail(root,options);
    assert.equal(next.pendingCount,0); assert.equal(next.state,'delivery-unavailable');
  } finally { rmSync(root,{recursive:true,force:true}); }
});
test('ambiguous external send is suppressed durably across subsequent ticks',async()=>{
  const root=mkdtempSync(join(tmpdir(),'studio-mail-')); mkdirSync(join(root,'.agents/product-studio/runtime'),{recursive:true});
  let sends=0;
  const options={env:{...env,STUDIO_OWNER_EMAIL:'owner@example.com',SOCIAL_AGENT_SECRET:'test'},fetchImpl:async url=>{
    if(url.endsWith('/report')) return new Response(JSON.stringify({report}));
    if(url.endsWith('/directions')) return new Response(JSON.stringify(decisions));
    if(url.endsWith('/token')) return new Response(JSON.stringify({access_token:'test-token'}));
    sends++; throw new Error('ambiguous timeout');
  }};
  try {
    assert.equal((await monitorDecisionEmail(root,options)).state,'delivery-unconfirmed');
    const next=await monitorDecisionEmail(root,options);
    assert.equal(next.state,'delivery-unconfirmed'); assert.equal(next.uncertainCount,1); assert.equal(sends,1);
  } finally { rmSync(root,{recursive:true,force:true}); }
});
