// Explicit owner-authorized fixture creation through normal production APIs.
// Scope: one synthetic adult host and the six DEMO payloads, no real member edits.
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createDemoEvents } from './demo-events.mjs';

if (!process.argv.includes('--apply-live-demo')) throw Error('Explicit --apply-live-demo required. Obtain owner authorization first.');
const origin = 'https://keepitup.social';
const directory = new URL('./artifacts/', import.meta.url);
const receipt = new URL('live-demo-events.json', directory);
await mkdir(directory, { recursive: true });
let state;
try { state = JSON.parse(await readFile(receipt, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!state) {
  state = { origin, email: 'keepitup-demo-host@sport-date.invalid', password: `Demo-${randomBytes(24).toString('base64url')}-9aA`, createdAt: new Date().toISOString(), events: [], pending: null };
  await writeFile(receipt, JSON.stringify(state, null, 2));
}
if (state.origin !== origin || state.email !== 'keepitup-demo-host@sport-date.invalid') throw Error('Unexpected fixture identity');
if (state.pending) throw Error('Previous event submission is unresolved; inspect before creating duplicates.');
const headers = { 'content-type': 'application/json', origin };
async function post(path, body, cookie) {
  return fetch(origin + path, { method: 'POST', headers: { ...headers, ...(cookie ? {cookie} : {}) }, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(20000) });
}
let auth = await post('/api/auth/login', { email: state.email, password: state.password });
if (auth.status === 401 && !state.hostCreated) {
  auth = await post('/api/auth/register', {
    email: state.email, password: state.password, firstName: 'DEMO', lastName: 'Test Host', dateOfBirth: '1990-01-01', location: 'Bucharest',
    bio: 'Fictional test account. DEMO events are not real meetups. Do not travel or send personal information.',
    seeking: 'group', sports: [{name:'Running',skillLevel:'beginner',frequency:'casual'}], acceptedTerms: true,
  });
}
if (!auth.ok) throw Error(`Demo host authentication failed: HTTP ${auth.status}`);
const cookie = auth.headers.getSetCookie().find(value => value.startsWith('auth_token='))?.split(';')[0];
if (!cookie) throw Error('Missing authenticated session');
state.hostCreated = true;
await writeFile(receipt, JSON.stringify(state, null, 2));
for (const event of createDemoEvents()) {
  if (state.events.some(existing => existing.fixtureKey === event.fixtureKey)) continue;
  state.pending = { fixtureKey: event.fixtureKey, startedAt: new Date().toISOString() };
  await writeFile(receipt, JSON.stringify(state, null, 2));
  const response = await post('/api/events', event.payload, cookie);
  const result = await response.json();
  if (!response.ok || !result.eventId) throw Error(`Demo event creation failed: HTTP ${response.status}; inspect private receipt before retrying.`);
  state.events.push({ fixtureKey: event.fixtureKey, eventId: result.eventId, title: event.payload.title, startsAt: event.payload.startsAt });
  state.pending = null;
  await writeFile(receipt, JSON.stringify(state, null, 2));
}
for (const event of state.events) {
  const response = await fetch(`${origin}/e/${event.eventId}`, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  const html = await response.text();
  if (!response.ok || !html.includes('Demo area - North')) throw Error('Published invitation readback failed');
  const detail = await fetch(`${origin}/discover/events/${event.eventId}`, {headers:{cookie},redirect:'error',signal:AbortSignal.timeout(20000)});
  if (!detail.ok || !(await detail.text()).includes(event.title)) throw Error('Authenticated event title readback failed');
}
state.verifiedAt = new Date().toISOString();
await writeFile(receipt, JSON.stringify(state, null, 2));
console.log(JSON.stringify({ created: state.events.length, verifiedPublicInvitations: true, events: state.events }));
